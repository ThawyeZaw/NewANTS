import type { D1Database } from '@cloudflare/workers-types';
import {
  and,
  asc,
  createDb,
  eq,
  lte,
  notificationPreferences,
  notificationQueue,
  notifications,
  nowIso,
  profiles,
  type AntsDatabase,
} from '@ants/db';
import { generateEntityId } from '../auth/crypto';
import type { ApiBindings } from '../types';

export const MAX_NOTIFICATION_ATTEMPTS = 3;
const DEFAULT_CRON_BATCH_LIMIT = 50;

export type NotificationQueueRow = typeof notificationQueue.$inferSelect;
export type NotificationPreferencesRow = typeof notificationPreferences.$inferSelect;

export interface NotificationQueueBatchSummary {
  processedCount: number;
  sentCount: number;
  failedCount: number;
  retryingCount: number;
  cancelledCount: number;
  simulatedCount: number;
}

export interface ProcessNotificationItemResult {
  outcome: 'sent' | 'retrying' | 'failed' | 'cancelled';
  simulated: boolean;
  lastError: string | null;
}

export interface NotificationRunnerOptions {
  nowIso?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
}

function readStringField(record: Record<string, unknown>, key: string): string | null {
  const val = record[key];
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : null;
}

function readNumberField(record: Record<string, unknown>, key: string): number | null {
  const val = record[key];
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

export function isNotificationSourceEnabled(
  sourceType: NotificationQueueRow['sourceType'],
  prefs: NotificationPreferencesRow | undefined
): boolean {
  switch (sourceType) {
    case 'timetable_block':
    case 'task':
      return prefs ? Boolean(prefs.blockReminders) : true;
    case 'daily_digest':
      return prefs ? Boolean(prefs.dailyMorningDigest) : false;
    case 'exam_countdown':
      return prefs ? Boolean(prefs.examCountdownAlerts) : true;
    case 'tutor_inquiry':
      return prefs ? Boolean(prefs.tutorInquiryAlerts) : true;
    case 'test_ping':
    default:
      return true;
  }
}

export function formatQueuedNotification(item: NotificationQueueRow): {
  title: string;
  body: string;
  telegramText: string;
  actionUrl: string | null;
} {
  const payload = item.payloadJson ?? {};
  const explicitTitle = readStringField(payload, 'title');
  const explicitMessage = readStringField(payload, 'message') ?? readStringField(payload, 'body');
  const explicitActionUrl = readStringField(payload, 'actionUrl');
  const startLabel = readStringField(payload, 'startLabel');
  const leadMinutes = readNumberField(payload, 'leadMinutes');

  switch (item.sourceType) {
    case 'timetable_block': {
      const title = explicitTitle ?? 'Upcoming Flow Timetable Block';
      const leadSuffix = leadMinutes !== null ? `Starts in ${leadMinutes}m` : 'Starting soon';
      const body =
        explicitMessage ??
        `${title} — ${leadSuffix}${startLabel ? ` (${startLabel})` : ''}. Stay locked in.`;
      return {
        title,
        body,
        telegramText: `⏰ *Flow Block Reminder*\n${title}\n${body}`,
        actionUrl: explicitActionUrl ?? '/timetable',
      };
    }
    case 'task': {
      const title = explicitTitle ?? 'Flow Task Due Soon';
      const body = explicitMessage ?? `Task reminder: ${title}.`;
      return {
        title,
        body,
        telegramText: `✅ *Flow Task Reminder*\n${title}\n${body}`,
        actionUrl: explicitActionUrl ?? '/tasks',
      };
    }
    case 'exam_countdown': {
      const title = explicitTitle ?? 'Study Exam Countdown Alert';
      const body = explicitMessage ?? 'Check your upcoming IGCSE / IAL exam paper schedule.';
      return {
        title,
        body,
        telegramText: `📘 *Study Exam Countdown*\n${title}\n${body}`,
        actionUrl: explicitActionUrl ?? '/countdown',
      };
    }
    case 'daily_digest': {
      const title = explicitTitle ?? 'Morning Daily Brief';
      const body =
        explicitMessage ?? 'Review your Today Focus priorities and scheduled study blocks.';
      return {
        title,
        body,
        telegramText: `☀️ *Good Morning from The ANTs*\n${body}`,
        actionUrl: explicitActionUrl ?? '/tasks',
      };
    }
    case 'tutor_inquiry': {
      const title = explicitTitle ?? 'New Tutoring Inquiry';
      const body = explicitMessage ?? 'A student viewed your availability schedule on the-ants.org.';
      return {
        title,
        body,
        telegramText: `🎓 *ANTs Tutor Inquiry*\n${body}`,
        actionUrl: explicitActionUrl ?? '/settings',
      };
    }
    case 'test_ping':
    default: {
      const title = explicitTitle ?? '@TheANTsFlowBot Test Ping';
      const body =
        explicitMessage ??
        'Your Telegram alert bridge and 5-minute Cloudflare Worker Cron notifications are active.';
      return {
        title,
        body,
        telegramText: `🐜 *The ANTs Flow Bot*\n${body}`,
        actionUrl: explicitActionUrl ?? '/settings#telegram',
      };
    }
  }
}

export async function sendTelegramBotMessage(
  botToken: string,
  chatId: string,
  text: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errBody = (await response.json()) as { description?: string };
      if (errBody?.description) {
        errorDetail = errBody.description;
      }
    } catch {
      // Fall back to HTTP status string
    }
    throw new Error(`Telegram Bot API sendMessage failed: ${errorDetail}`);
  }
}

async function markQueueAttemptFailed(
  db: AntsDatabase,
  item: NotificationQueueRow,
  nextAttempts: number,
  errorMessage: string,
  timestampIso: string
): Promise<'retrying' | 'failed'> {
  const exhausted = nextAttempts >= MAX_NOTIFICATION_ATTEMPTS;
  await db
    .update(notificationQueue)
    .set({
      status: exhausted ? 'failed' : 'pending',
      attempts: nextAttempts,
      lastError: errorMessage.slice(0, 500),
      updatedAt: timestampIso,
    })
    .where(eq(notificationQueue.id, item.id));

  return exhausted ? 'failed' : 'retrying';
}

/**
 * Processes a single queued notification row, honoring per-channel preferences,
 * local-dev simulation when `TELEGRAM_BOT_TOKEN` is unset, live Bot API sends,
 * in-app notification mirroring, and 3-attempt retries.
 */
export async function processNotificationQueueItem(
  db: AntsDatabase,
  env: ApiBindings,
  item: NotificationQueueRow,
  options: { nowIso?: string; fetchImpl?: typeof fetch } = {}
): Promise<ProcessNotificationItemResult> {
  const timestamp = options.nowIso ?? nowIso();
  const [prefsRows, profileRows] = await Promise.all([
    db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, item.userId))
      .limit(1),
    db
      .select({ telegramChatId: profiles.telegramChatId })
      .from(profiles)
      .where(eq(profiles.userId, item.userId))
      .limit(1),
  ]);

  const prefs = prefsRows[0];
  const profileRow = profileRows[0];

  if (!isNotificationSourceEnabled(item.sourceType, prefs)) {
    await db
      .update(notificationQueue)
      .set({
        status: 'cancelled',
        lastError: `Disabled by user preference (${item.sourceType}).`,
        updatedAt: timestamp,
      })
      .where(eq(notificationQueue.id, item.id));

    return {
      outcome: 'cancelled',
      simulated: false,
      lastError: `Disabled by user preference (${item.sourceType}).`,
    };
  }

  const formatted = formatQueuedNotification(item);
  const nextAttempts = item.attempts + 1;
  let simulated = false;

  if (item.channel === 'telegram') {
    const targetChatId = item.telegramChatId?.trim() || profileRow?.telegramChatId?.trim() || null;
    if (!targetChatId) {
      const msg = 'No linked Telegram chat_id available for user.';
      const retryOutcome = await markQueueAttemptFailed(db, item, nextAttempts, msg, timestamp);
      return { outcome: retryOutcome, simulated: false, lastError: msg };
    }

    const botToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
    if (botToken.length > 0) {
      try {
        await sendTelegramBotMessage(
          botToken,
          targetChatId,
          formatted.telegramText,
          options.fetchImpl
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Telegram Bot API error.';
        const retryOutcome = await markQueueAttemptFailed(db, item, nextAttempts, msg, timestamp);
        return { outcome: retryOutcome, simulated: false, lastError: msg };
      }
    } else {
      simulated = true;
    }
  }

  await db.batch([
    db.insert(notifications).values({
      id: generateEntityId('notif'),
      userId: item.userId,
      type: item.sourceType,
      title: formatted.title,
      body: formatted.body,
      actionUrl: formatted.actionUrl,
      isRead: false,
      readAt: null,
      createdAt: timestamp,
    }),
    db
      .update(notificationQueue)
      .set({
        status: 'sent',
        attempts: nextAttempts,
        lastError: null,
        sentAtIso: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(notificationQueue.id, item.id)),
  ]);

  return {
    outcome: 'sent',
    simulated,
    lastError: null,
  };
}

/**
 * Drains due `pending` rows from `notification_queue` on every 5-minute Cron tick.
 */
export async function processDueNotificationQueue(
  d1: D1Database,
  env: ApiBindings,
  options: NotificationRunnerOptions = {}
): Promise<NotificationQueueBatchSummary> {
  const db = createDb(d1);
  const currentIso = options.nowIso ?? nowIso();
  const limit = options.limit ?? DEFAULT_CRON_BATCH_LIMIT;

  const dueRows = await db
    .select()
    .from(notificationQueue)
    .where(
      and(
        eq(notificationQueue.status, 'pending'),
        lte(notificationQueue.scheduledForIso, currentIso)
      )
    )
    .orderBy(asc(notificationQueue.scheduledForIso))
    .limit(limit);

  const summary: NotificationQueueBatchSummary = {
    processedCount: dueRows.length,
    sentCount: 0,
    failedCount: 0,
    retryingCount: 0,
    cancelledCount: 0,
    simulatedCount: 0,
  };

  for (const row of dueRows) {
    const result = await processNotificationQueueItem(db, env, row, {
      nowIso: currentIso,
      fetchImpl: options.fetchImpl,
    });

    if (result.outcome === 'sent') {
      summary.sentCount += 1;
      if (result.simulated) {
        summary.simulatedCount += 1;
      }
    } else if (result.outcome === 'retrying') {
      summary.retryingCount += 1;
    } else if (result.outcome === 'failed') {
      summary.failedCount += 1;
    } else if (result.outcome === 'cancelled') {
      summary.cancelledCount += 1;
    }
  }

  return summary;
}
