import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type {
  TaskPriority,
  TaskSubtask,
  TimetableCategory,
  TimetableRecurrence,
} from '@ants/shared-types';
import { user } from './auth';
import { booleanFlag, createdAtColumn, isoTimestamps } from './helpers';

/**
 * Flow Smart Timetable 24-hour time-blocking events with recurrence & Telegram lead time.
 */
export const timetableEvents = sqliteTable('timetable_events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dateIso: text('date_iso').notNull(),
  startMinutes: integer('start_minutes').notNull(),
  endMinutes: integer('end_minutes').notNull(),
  category: text('category')
    .$type<TimetableCategory>()
    .notNull()
    .default('deep-work'),
  priority: text('priority').$type<TaskPriority>(),
  pomodorosPlanned: integer('pomodoros_planned').notNull().default(0),
  pomodorosDone: integer('pomodoros_done').notNull().default(0),
  recurrence: text('recurrence')
    .$type<TimetableRecurrence>()
    .notNull()
    .default('none'),
  telegramEnabled: booleanFlag('telegram_enabled', false),
  telegramLeadMinutes: integer('telegram_lead_minutes').notNull().default(10),
  telegramNote: text('telegram_note'),
  notes: text('notes').notNull().default(''),
  completed: booleanFlag('completed', false),
  locked: booleanFlag('locked', false),
  ...isoTimestamps(),
});

/**
 * Flow TickTick-style `P1`–`P4` Task Planner items with inline subtasks & focus pinning.
 */
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  notes: text('notes').notNull().default(''),
  priority: text('priority').$type<TaskPriority>().notNull().default('P3'),
  dueDateIso: text('due_date_iso'),
  tagsJson: text('tags_json', { mode: 'json' }).$type<string[]>().notNull().default([]),
  estimatedMinutes: integer('estimated_minutes').notNull().default(25),
  pomodorosPlanned: integer('pomodoros_planned').notNull().default(1),
  pomodorosDone: integer('pomodoros_done').notNull().default(0),
  inTodayFocus: booleanFlag('in_today_focus', false),
  done: booleanFlag('done', false),
  subtasksJson: text('subtasks_json', { mode: 'json' })
    .$type<TaskSubtask[]>()
    .notNull()
    .default([]),
  linkedBlockId: text('linked_block_id').references(() => timetableEvents.id, {
    onDelete: 'set null',
  }),
  ...isoTimestamps(),
});

/**
 * Synced Flow Pomodoro timer durations, sound, ambient & appearance settings.
 */
export const pomodoroUserSettings = sqliteTable('pomodoro_user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  workMinutes: integer('work_minutes').notNull().default(25),
  shortBreakMinutes: integer('short_break_minutes').notNull().default(5),
  longBreakMinutes: integer('long_break_minutes').notNull().default(15),
  longBreakInterval: integer('long_break_interval').notNull().default(4),
  autoStartBreaks: booleanFlag('auto_start_breaks', false),
  autoStartWork: booleanFlag('auto_start_work', false),
  dailyGoal: integer('daily_goal').notNull().default(8),
  notificationsEnabled: booleanFlag('notifications_enabled', true),
  soundEnabled: booleanFlag('sound_enabled', true),
  soundVolume: real('sound_volume').notNull().default(0.7),
  tickingEnabled: booleanFlag('ticking_enabled', true),
  tickingVolume: real('ticking_volume').notNull().default(0.35),
  ambientScene: text('ambient_scene').notNull().default('none'),
  ambientSound: text('ambient_sound').notNull().default('off'),
  appearanceMode: text('appearance_mode').notNull().default('light'),
  appearanceAccent: text('appearance_accent').notNull().default('amber'),
  appearanceFont: text('appearance_font').notNull().default('jakarta'),
  ...isoTimestamps(),
});

/**
 * Completed or logged Flow Pomodoro intervals synced from client timer.
 */
export const pomodoroSessions = sqliteTable('pomodoro_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  phase: text('phase')
    .$type<'work' | 'shortBreak' | 'longBreak'>()
    .notNull()
    .default('work'),
  taskTitle: text('task_title'),
  startedAtIso: text('started_at_iso').notNull(),
  endedAtIso: text('ended_at_iso'),
  durationSeconds: integer('duration_seconds').notNull(),
  completed: booleanFlag('completed', true),
  xpAwarded: integer('xp_awarded').notNull().default(0),
  createdAt: createdAtColumn(),
});

export const timetable_events = timetableEvents;
export const pomodoro_user_settings = pomodoroUserSettings;
export const pomodoro_sessions = pomodoroSessions;
