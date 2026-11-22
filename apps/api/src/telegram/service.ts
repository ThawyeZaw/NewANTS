import type { D1Database } from '@cloudflare/workers-types';
import {
  and,
  createDb,
  eq,
  notificationPreferences,
  notificationQueue,
  notifications,
  nowIso,
  profiles,
  type AntsDatabase,
} from '@ants/db';
import {
  TELEGRAM_VERIFICATION_CODE_REGEX,
  TelegramStatusDtoSchema,
  type TelegramLeadMinutes,
  type TelegramLinkStartInput,
  type TelegramPreferencesUpdateInput,
  type TelegramStatusDto,
  type TelegramTestPingInput,
  type TelegramWebhookUpdate,
} from '@ants/shared-types';
import { generateEntityId } from '../auth/crypto';
import {
  processNotificationQueueItem,
  sendTelegramBotMessage,
  type ProcessNotificationItemResult,
} from '../cron/notification-runner';
import type { ApiBindings } from '../types';

const DEFAULT_TELEGRAM_BOT_USERNAME = 'TheANTsFlowBot';
const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export class TelegramServiceError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 500;
  readonly code: string;

  constructor(status: 400 | 401 | 403 | 404 | 500, code: string, message: string) {
    super(message);
    this.name = 'TelegramServiceError';
    this.status = status;
    this.code = code;
  }
}

export function resolveTelegramBotUsername(env?: ApiBindings): string {
  const raw = env?.TELEGRAM_BOT_USERNAME?.trim() ?? '';
  const cleaned = raw.replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '');
  return cleaned || DEFAULT_TELEGRAM_BOT_USERNAME;
}

export function generateTelegramVerificationCode(): string {
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    const byte = randomBytes[i] ?? 0;
    suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length] ?? 'A';
  }
  return `ANT-${suffix}`;
}

export function normalizeTelegramHandle(rawHandle: string, fallback = '@ants_tg_member'): string {
  const cleaned = rawHandle
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 32);
  return cleaned ? `@${cleaned}` : fallback;
}

function coerceLeadMinutes(val: number | null | undefined): TelegramLeadMinutes {
  if (val === 5 || val === 10 || val === 15 || val === 30) {
    return val;
  }
  return 10;
}

function isIsoExpired(isoString: string | null | undefined, nowMs = Date.now()): boolean {
  if (!isoString) return false;
  const parsed = Date.parse(isoString);
  if (Number.isNaN(parsed)) return false;
  return parsed <= nowMs;
}

async function ensureUserProfileAndPrefs(db: AntsDatabase, userId: string) {
  const [profileRows, prefsRows] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1),
  ]);

  const profileRow = profileRows[0];
  if (!profileRow) {
    throw new TelegramServiceError(404, 'PROFILE_NOT_FOUND', 'User profile was not found.');
  }

  let prefsRow = prefsRows[0];
  if (!prefsRow) {
    const timestamp = nowIso();
    const newPrefsId = generateEntityId('npf');
    await db.insert(notificationPreferences).values({
      id: newPrefsId,
      userId,
      blockReminders: true,
      defaultLeadMinutes: 10,
      dailyMorningDigest: false,
      digestTime: '07:00',
      examCountdownAlerts: true,
      tutorInquiryAlerts: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const inserted = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.id, newPrefsId))
      .limit(1);
    prefsRow = inserted[0];
  }

  return { profileRow, prefsRow };
}

function buildStatusDto(
  profileRow: typeof profiles.$inferSelect,
  prefsRow: typeof notificationPreferences.$inferSelect | undefined,
  botUsername: string
): TelegramStatusDto {
  const rawStatus = profileRow.telegramStatus;
  const pendingExpired =
    rawStatus === 'pending' && isIsoExpired(profileRow.telegramCodeExpiresAt);
  const status = pendingExpired ? 'unlinked' : rawStatus;

  const verificationCode =
    status === 'pending' && profileRow.telegramVerificationCode
      ? profileRow.telegramVerificationCode
      : null;
  const codeExpiresAt =
    status === 'pending' && profileRow.telegramCodeExpiresAt
      ? profileRow.telegramCodeExpiresAt
      : null;
  const startCommand = verificationCode ? `/start ${verificationCode}` : null;
  const deepLinkUrl = verificationCode
    ? `https://t.me/${botUsername}?start=${encodeURIComponent(verificationCode)}`
    : null;

  return TelegramStatusDtoSchema.parse({
    status,
    handle: profileRow.telegramHandle ?? '',
    chatId: profileRow.telegramChatId ?? null,
    botUsername,
    verificationCode,
    codeExpiresAt,
    linkedAt: profileRow.telegramLinkedAt ?? null,
    startCommand,
    deepLinkUrl,
    preferences: {
      blockReminders: prefsRow ? Boolean(prefsRow.blockReminders) : true,
      defaultLeadMinutes: coerceLeadMinutes(prefsRow?.defaultLeadMinutes),
      dailyMorningDigest: prefsRow ? Boolean(prefsRow.dailyMorningDigest) : false,
      digestTime: prefsRow?.digestTime ?? '07:00',
      examCountdownAlerts: prefsRow ? Boolean(prefsRow.examCountdownAlerts) : true,
      tutorInquiryAlerts: prefsRow ? Boolean(prefsRow.tutorInquiryAlerts) : true,
    },
  });
}

export async function getTelegramStatusForUser(
  d1: D1Database,
  userId: string,
  env?: ApiBindings
): Promise<TelegramStatusDto> {
  const db = createDb(d1);
  const { profileRow, prefsRow } = await ensureUserProfileAndPrefs(db, userId);
  return buildStatusDto(profileRow, prefsRow, resolveTelegramBotUsername(env));
}

async function allocateUniqueVerificationCode(db: AntsDatabase): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateTelegramVerificationCode();
    const existing = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.telegramVerificationCode, candidate))
      .limit(1);
    if (existing.length === 0) {
      return candidate;
    }
  }
  return generateTelegramVerificationCode();
}

export async function startTelegramLinkForUser(
  d1: D1Database,
  userId: string,
  input: TelegramLinkStartInput,
  env?: ApiBindings
): Promise<TelegramStatusDto> {
  const db = createDb(d1);
  const { profileRow, prefsRow } = await ensureUserProfileAndPrefs(db, userId);
  const code = await allocateUniqueVerificationCode(db);
  const nowMs = Date.now();
  const timestamp = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + CODE_TTL_MS).toISOString();
  const nextHandle = input.draftHandle?.trim()
    ? normalizeTelegramHandle(input.draftHandle, profileRow.telegramHandle)
    : profileRow.telegramHandle;

  await db
    .update(profiles)
    .set({
      telegramStatus: 'pending',
      telegramHandle: nextHandle,
      telegramVerificationCode: code,
      telegramCodeExpiresAt: expiresAt,
      updatedAt: timestamp,
    })
    .where(eq(profiles.userId, userId));

  const updatedProfile = {
    ...profileRow,
    telegramStatus: 'pending' as const,
    telegramHandle: nextHandle,
    telegramVerificationCode: code,
    telegramCodeExpiresAt: expiresAt,
    updatedAt: timestamp,
  };

  return buildStatusDto(updatedProfile, prefsRow, resolveTelegramBotUsername(env));
}

export async function updateTelegramPreferencesForUser(
  d1: D1Database,
  userId: string,
  input: TelegramPreferencesUpdateInput,
  env?: ApiBindings
): Promise<TelegramStatusDto> {
  const db = createDb(d1);
  const { profileRow, prefsRow } = await ensureUserProfileAndPrefs(db, userId);
  const timestamp = nowIso();

  const nextPrefs = {
    blockReminders: input.blockReminders ?? Boolean(prefsRow?.blockReminders ?? true),
    defaultLeadMinutes:
      input.defaultLeadMinutes ?? coerceLeadMinutes(prefsRow?.defaultLeadMinutes),
    dailyMorningDigest:
      input.dailyMorningDigest ?? Boolean(prefsRow?.dailyMorningDigest ?? false),
    digestTime: input.digestTime ?? prefsRow?.digestTime ?? '07:00',
    examCountdownAlerts:
      input.examCountdownAlerts ?? Boolean(prefsRow?.examCountdownAlerts ?? true),
    tutorInquiryAlerts:
      input.tutorInquiryAlerts ?? Boolean(prefsRow?.tutorInquiryAlerts ?? true),
    updatedAt: timestamp,
  };

  await db
    .update(notificationPreferences)
    .set(nextPrefs)
    .where(eq(notificationPreferences.userId, userId));

  const refreshedPrefsRows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return buildStatusDto(profileRow, refreshedPrefsRows[0] ?? prefsRow, resolveTelegramBotUsername(env));
}

export async function unlinkTelegramForUser(
  d1: D1Database,
  userId: string,
  env?: ApiBindings
): Promise<TelegramStatusDto> {
  const db = createDb(d1);
  const { profileRow, prefsRow } = await ensureUserProfileAndPrefs(db, userId);
  const timestamp = nowIso();

  await db.batch([
    db
      .update(profiles)
      .set({
        telegramStatus: 'unlinked',
        telegramChatId: null,
        telegramHandle: '',
        telegramVerificationCode: null,
        telegramCodeExpiresAt: null,
        telegramLinkedAt: null,
        updatedAt: timestamp,
      })
      .where(eq(profiles.userId, userId)),
    db
      .update(notificationQueue)
      .set({
        status: 'cancelled',
        lastError: 'Cancelled when Telegram account was unlinked.',
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(notificationQueue.userId, userId),
          eq(notificationQueue.channel, 'telegram'),
          eq(notificationQueue.status, 'pending')
        )
      ),
  ]);

  const unlinkedProfile = {
    ...profileRow,
    telegramStatus: 'unlinked' as const,
    telegramChatId: null,
    telegramHandle: '',
    telegramVerificationCode: null,
    telegramCodeExpiresAt: null,
    telegramLinkedAt: null,
    updatedAt: timestamp,
  };

  return buildStatusDto(unlinkedProfile, prefsRow, resolveTelegramBotUsername(env));
}

export async function sendTelegramTestPingForUser(
  d1: D1Database,
  env: ApiBindings,
  userId: string,
  input: TelegramTestPingInput,
  fetchImpl?: typeof fetch
): Promise<{
  queuedId: string;
  dispatched: boolean;
  delivery: ProcessNotificationItemResult | null;
  status: TelegramStatusDto;
}> {
  const db = createDb(d1);
  const { profileRow, prefsRow } = await ensureUserProfileAndPrefs(db, userId);

  const isLinked =
    profileRow.telegramStatus === 'connected' || profileRow.telegramStatus === 'linked';
  const chatId = profileRow.telegramChatId?.trim() ?? '';

  if (!isLinked || !chatId) {
    throw new TelegramServiceError(
      400,
      'TELEGRAM_NOT_LINKED',
      'Connect your Telegram account via @TheANTsFlowBot /start before sending a test ping.'
    );
  }

  const timestamp = nowIso();
  const queueId = generateEntityId('nq');
  const leadMinutes = coerceLeadMinutes(prefsRow?.defaultLeadMinutes);
  const messageText =
    input.message ??
    `Verification ping to ${profileRow.telegramHandle || 'your Telegram'}: your ${leadMinutes}-minute Flow reminders and Study exam alerts are armed.`;

  await db.insert(notificationQueue).values({
    id: queueId,
    userId,
    channel: 'telegram',
    telegramChatId: chatId,
    sourceType: 'test_ping',
    sourceId: queueId,
    payloadJson: {
      title: '@TheANTsFlowBot Test Ping',
      message: messageText,
      leadMinutes,
    },
    scheduledForIso: timestamp,
    status: 'pending',
    attempts: 0,
    lastError: null,
    sentAtIso: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  let delivery: ProcessNotificationItemResult | null = null;
  if (input.dispatchImmediately) {
    const insertedRows = await db
      .select()
      .from(notificationQueue)
      .where(eq(notificationQueue.id, queueId))
      .limit(1);
    const insertedRow = insertedRows[0];
    if (insertedRow) {
      delivery = await processNotificationQueueItem(db, env, insertedRow, {
        nowIso: timestamp,
        fetchImpl,
      });
    }
  }

  return {
    queuedId: queueId,
    dispatched: input.dispatchImmediately,
    delivery,
    status: buildStatusDto(profileRow, prefsRow, resolveTelegramBotUsername(env)),
  };
}

export interface TelegramWebhookProcessResult {
  handled: boolean;
  linked: boolean;
  reason?: string;
  userId?: string;
  username?: string;
  telegramHandle?: string;
  telegramChatId?: string;
  replySent: boolean;
}

function parseStartCommandCode(text: string): { isStart: boolean; code: string | null } {
  const trimmed = text.trim();
  const match = /^\/start(?:@[a-zA-Z0-9_]+)?(?:\s+([a-zA-Z0-9_-]+))?/i.exec(trimmed);
  if (!match) {
    return { isStart: false, code: null };
  }
  const arg = (match[1] ?? '').trim().toUpperCase();
  if (!arg) {
    return { isStart: true, code: null };
  }
  return { isStart: true, code: arg };
}

/**
 * Processes an incoming Telegram Bot webhook update, binding `/start ANT-XXXX`
 * to the matching ANTs user profile while preserving distinct Telegram handles.
 */
export async function handleTelegramWebhookUpdate(
  d1: D1Database,
  env: ApiBindings,
  update: TelegramWebhookUpdate,
  fetchImpl?: typeof fetch
): Promise<TelegramWebhookProcessResult> {
  const message = update.message ?? update.edited_message;
  if (!message || typeof message.text !== 'string') {
    return { handled: false, linked: false, reason: 'no_message_text', replySent: false };
  }

  const chatId = String(message.chat.id);
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  const parsed = parseStartCommandCode(message.text);

  if (!parsed.isStart) {
    return { handled: false, linked: false, reason: 'unrecognized_command', replySent: false };
  }

  const replySafely = async (replyText: string): Promise<boolean> => {
    if (!botToken) return false;
    try {
      await sendTelegramBotMessage(botToken, chatId, replyText, fetchImpl);
      return true;
    } catch {
      return false;
    }
  };

  if (!parsed.code || !TELEGRAM_VERIFICATION_CODE_REGEX.test(parsed.code)) {
    const replySent = await replySafely(
      '👋 Welcome to *@TheANTsFlowBot*! Open *Settings → Telegram Bot* in Flow or Study and tap *Generate /start Code* to get your `ANT-XXXX` link.'
    );
    return { handled: false, linked: false, reason: 'missing_or_invalid_code', replySent };
  }

  const db = createDb(d1);
  const matchingProfiles = await db
    .select()
    .from(profiles)
    .where(eq(profiles.telegramVerificationCode, parsed.code))
    .limit(1);

  const profileRow = matchingProfiles[0];
  if (!profileRow) {
    const replySent = await replySafely(
      `❌ Code \`${parsed.code}\` was not recognized. Generate a fresh code in *Settings → Telegram Bot*.`
    );
    return { handled: false, linked: false, reason: 'code_not_found', replySent };
  }

  const timestamp = nowIso();
  if (isIsoExpired(profileRow.telegramCodeExpiresAt)) {
    await db
      .update(profiles)
      .set({
        telegramStatus: 'unlinked',
        telegramVerificationCode: null,
        telegramCodeExpiresAt: null,
        updatedAt: timestamp,
      })
      .where(eq(profiles.id, profileRow.id));

    const replySent = await replySafely(
      `⏳ Code \`${parsed.code}\` expired (15m limit). Tap *New code* in Flow/Study Settings to link again.`
    );
    return { handled: true, linked: false, reason: 'code_expired', replySent };
  }

  const rawTgUsername = message.from?.username ?? message.chat.username ?? '';
  const capturedHandle = rawTgUsername
    ? normalizeTelegramHandle(rawTgUsername)
    : profileRow.telegramHandle || `@tg_${chatId}`;

  await db.batch([
    db
      .update(profiles)
      .set({
        telegramStatus: 'connected',
        telegramChatId: chatId,
        telegramHandle: capturedHandle,
        telegramVerificationCode: null,
        telegramCodeExpiresAt: null,
        telegramLinkedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(profiles.id, profileRow.id)),
    db.insert(notifications).values({
      id: generateEntityId('notif'),
      userId: profileRow.userId,
      type: 'telegram_linked',
      title: 'Telegram Bot Connected',
      body: `Linked ${capturedHandle} via @${resolveTelegramBotUsername(env)}. Your 5-minute Flow & Study alerts are active.`,
      actionUrl: '/settings#telegram',
      isRead: false,
      readAt: null,
      createdAt: timestamp,
    }),
  ]);

  const replySent = await replySafely(
    `✅ Linked *${capturedHandle}* to ANTs account \`@${profileRow.username}\`!\nYour 5-minute Flow timetable reminders and Study exam alerts are now active.`
  );

  return {
    handled: true,
    linked: true,
    userId: profileRow.userId,
    username: profileRow.username,
    telegramHandle: capturedHandle,
    telegramChatId: chatId,
    replySent,
  };
}
