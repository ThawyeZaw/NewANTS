import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { EcosystemAppId } from '@ants/shared-types';
import { user } from './auth';
import { booleanFlag, createdAtColumn, isoTimestamps } from './helpers';

/**
 * In-app notification inbox entries for Study & Flow users.
 */
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  actionUrl: text('action_url'),
  isRead: booleanFlag('is_read', false),
  readAt: text('read_at'),
  createdAt: createdAtColumn(),
});

/**
 * Scheduled delivery queue drained every 5 minutes by `apps/api` Worker Cron.
 */
export const notificationQueue = sqliteTable('notification_queue', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  channel: text('channel')
    .$type<'telegram' | 'in_app'>()
    .notNull()
    .default('telegram'),
  telegramChatId: text('telegram_chat_id'),
  sourceType: text('source_type')
    .$type<
      | 'timetable_block'
      | 'task'
      | 'exam_countdown'
      | 'daily_digest'
      | 'tutor_inquiry'
      | 'test_ping'
    >()
    .notNull(),
  sourceId: text('source_id'),
  payloadJson: text('payload_json', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  scheduledForIso: text('scheduled_for_iso').notNull(),
  status: text('status')
    .$type<'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'>()
    .notNull()
    .default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  sentAtIso: text('sent_at_iso'),
  ...isoTimestamps(),
});

/**
 * Per-user reminder & Telegram notification delivery preferences.
 */
export const notificationPreferences = sqliteTable('notification_preferences', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  blockReminders: booleanFlag('block_reminders', true),
  defaultLeadMinutes: integer('default_lead_minutes').notNull().default(10),
  dailyMorningDigest: booleanFlag('daily_morning_digest', false),
  digestTime: text('digest_time').notNull().default('07:00'),
  examCountdownAlerts: booleanFlag('exam_countdown_alerts', true),
  tutorInquiryAlerts: booleanFlag('tutor_inquiry_alerts', true),
  ...isoTimestamps(),
});

/**
 * Contributor submission queue reviewed by `main_contributor` and `admin`.
 */
export const reviewQueue = sqliteTable('review_queue', {
  id: text('id').primaryKey(),
  submittedByUserId: text('submitted_by_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  entityType: text('entity_type')
    .$type<'grade_boundary' | 'past_paper' | 'syllabus_topic' | 'org_article' | 'quiz'>()
    .notNull(),
  entityId: text('entity_id'),
  action: text('action').$type<'create' | 'update' | 'delete'>().notNull(),
  title: text('title').notNull(),
  payloadJson: text('payload_json', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  status: text('status')
    .$type<'pending' | 'approved' | 'rejected'>()
    .notNull()
    .default('pending'),
  reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  reviewNote: text('review_note'),
  reviewedAt: text('reviewed_at'),
  ...isoTimestamps(),
});

/**
 * Immutable version snapshots for CMS & exam boundary records.
 */
export const versionHistory = sqliteTable('version_history', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  snapshotJson: text('snapshot_json', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  changedByUserId: text('changed_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  changeSummary: text('change_summary').notNull().default(''),
  createdAt: createdAtColumn(),
});

/**
 * Cross-app activity feed powering Study Dashboard & profile history.
 */
export const activityFeed = sqliteTable('activity_feed', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  appId: text('app_id').$type<EcosystemAppId>().notNull(),
  eventType: text('event_type').notNull(),
  summary: text('summary').notNull(),
  metricLabel: text('metric_label'),
  xpDelta: integer('xp_delta').notNull().default(0),
  metadataJson: text('metadata_json', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  createdAt: createdAtColumn(),
});

export const notification_queue = notificationQueue;
export const notification_preferences = notificationPreferences;
export const review_queue = reviewQueue;
export const version_history = versionHistory;
export const activity_feed = activityFeed;
