import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type {
  CurriculumBoardId,
  EdexcelMathsCashInCode,
  EdexcelMathsRuleType,
  EdexcelMathsUnitCode,
  ExamColorTag,
  ExamCountdownCategory,
} from '@ants/shared-types';
import { user } from './auth';
import { subjects } from './curriculums';
import { booleanFlag, createdAtColumn, isoTimestamps } from './helpers';

/**
 * Official exam paper/unit definitions belonging to a subject.
 */
export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  paperCode: text('paper_code').notNull(),
  unitCode: text('unit_code').notNull(),
  title: text('title').notNull(),
  level: text('level').notNull().default('AS'),
  maxRaw: integer('max_raw').notNull(),
  maxUms: integer('max_ums'),
  durationMinutes: integer('duration_minutes').notNull().default(90),
  isCompulsory: booleanFlag('is_compulsory', false),
  ...isoTimestamps(),
});

/**
 * Official timetable dates for specific exam series (`May/June 2026`, `Oct/Nov 2026`, etc.).
 */
export const examSchedules = sqliteTable('exam_schedules', {
  id: text('id').primaryKey(),
  examId: text('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  seriesId: text('series_id').notNull(),
  seriesLabel: text('series_label').notNull(),
  examDateIso: text('exam_date_iso').notNull(),
  examTime24h: text('exam_time_24h').notNull().default('09:00'),
  sessionWindow: text('session_window').notNull().default('AM'),
  zoneCode: text('zone_code').notNull().default('GLOBAL'),
  ...isoTimestamps(),
});

/**
 * User exam countdown cards (official synced or custom/mock), also surfaced on Flow.
 */
export const examCountdowns = sqliteTable('exam_countdowns', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  examScheduleId: text('exam_schedule_id').references(() => examSchedules.id, {
    onDelete: 'set null',
  }),
  boardId: text('board_id').$type<CurriculumBoardId>().notNull(),
  paperCode: text('paper_code').notNull(),
  title: text('title').notNull(),
  examDateIso: text('exam_date_iso').notNull(),
  examTime24h: text('exam_time_24h').notNull().default('09:00'),
  targetGrade: text('target_grade').notNull().default('A*'),
  category: text('category')
    .$type<ExamCountdownCategory>()
    .notNull()
    .default('official'),
  isCustom: booleanFlag('is_custom', false),
  isMock: booleanFlag('is_mock', false),
  colorTag: text('color_tag').$type<ExamColorTag>().notNull().default('amber'),
  isPinned: booleanFlag('is_pinned', false),
  syncedToFlow: booleanFlag('synced_to_flow', false),
  venueOrNotes: text('venue_or_notes'),
  ...isoTimestamps(),
});

/**
 * Subject enrollments per user with target grade and optional review check-in timestamp.
 */
export const userEnrollments = sqliteTable('user_enrollments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  targetGrade: text('target_grade').notNull().default('A*'),
  examSeriesId: text('exam_series_id'),
  isActive: booleanFlag('is_active', true),
  lastReviewedDateIso: text('last_reviewed_date_iso'),
  ...isoTimestamps(),
});

/**
 * Per-user overrides for official exam schedule dates/venues/target grades.
 */
export const userExamOverrides = sqliteTable('user_exam_overrides', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  examScheduleId: text('exam_schedule_id')
    .notNull()
    .references(() => examSchedules.id, { onDelete: 'cascade' }),
  customDateIso: text('custom_date_iso'),
  customTime24h: text('custom_time_24h'),
  targetGrade: text('target_grade'),
  isHidden: booleanFlag('is_hidden', false),
  notes: text('notes'),
  ...isoTimestamps(),
});

/**
 * Archived or sat official exam results recorded by a student.
 */
export const userExamHistory = sqliteTable('user_exam_history', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  seriesId: text('series_id').notNull(),
  awardCode: text('award_code').notNull(),
  achievedGrade: text('achieved_grade').notNull(),
  totalUms: integer('total_ums'),
  maxUms: integer('max_ums'),
  notes: text('notes'),
  satAtIso: text('sat_at_iso').notNull(),
  createdAt: createdAtColumn(),
});

/**
 * Component & cash-in routing rules (including Edexcel `WMA11-SET` rules).
 */
export const subjectComponentRoutes = sqliteTable('subject_component_routes', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  cashInCode: text('cash_in_code').notNull(),
  title: text('title').notNull(),
  ruleType: text('rule_type').$type<EdexcelMathsRuleType>().notNull(),
  requiredUnits: integer('required_units').notNull(),
  targetUms: integer('target_ums'),
  ruleConfigJson: text('rule_config_json', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  ...isoTimestamps(),
});

/**
 * Enrolled cash-in qualifications per user (`XMA01`, `YMA01`, `XFM01`, `YFM01`).
 */
export const userCashInEnrollments = sqliteTable('user_cash_in_enrollments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  routeId: text('route_id').references(() => subjectComponentRoutes.id, {
    onDelete: 'set null',
  }),
  cashInCode: text('cash_in_code').$type<EdexcelMathsCashInCode>().notNull(),
  targetGrade: text('target_grade').notNull().default('A*'),
  isValidCombination: booleanFlag('is_valid_combination', false),
  ...isoTimestamps(),
});

/**
 * Individual unit selections (`WMA11`..`WDM11`) linked to a user cash-in enrollment.
 */
export const userComponentSelections = sqliteTable('user_component_selections', {
  id: text('id').primaryKey(),
  cashInEnrollmentId: text('cash_in_enrollment_id')
    .notNull()
    .references(() => userCashInEnrollments.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  unitCode: text('unit_code').$type<EdexcelMathsUnitCode | string>().notNull(),
  isCompulsory: booleanFlag('is_compulsory', false),
  targetUms: integer('target_ums'),
  ...isoTimestamps(),
});

/**
 * Historical past paper catalog rows across variants (`V1`–`V3`, `Standard`/`Regional`).
 */
export const pastPapers = sqliteTable('past_papers', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  unitCode: text('unit_code').notNull(),
  paperCode: text('paper_code').notNull(),
  title: text('title').notNull(),
  variantGroup: text('variant_group').notNull().default('main'),
  variantBadge: text('variant_badge').notNull().default('Main'),
  maxRaw: integer('max_raw').notNull(),
  maxUms: integer('max_ums'),
  durationMinutes: integer('duration_minutes').notNull().default(90),
  availableSeriesJson: text('available_series_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  ...isoTimestamps(),
});

/**
 * Overall subject-level grade boundaries per series (`A*`–`U` or `9`–`1`).
 */
export const subjectGradeBoundaries = sqliteTable('subject_grade_boundaries', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  seriesId: text('series_id').notNull(),
  seriesLabel: text('series_label').notNull(),
  cashInCode: text('cash_in_code'),
  isModularUms: booleanFlag('is_modular_ums', false),
  maxTotalScore: integer('max_total_score').notNull(),
  thresholdsJson: text('thresholds_json', { mode: 'json' })
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  ...isoTimestamps(),
});

/**
 * Per-paper raw mark boundary cutoffs used by Calculator & Past Paper Tracker.
 */
export const paperGradeBoundaries = sqliteTable('paper_grade_boundaries', {
  id: text('id').primaryKey(),
  pastPaperId: text('past_paper_id')
    .notNull()
    .references(() => pastPapers.id, { onDelete: 'cascade' }),
  seriesId: text('series_id').notNull(),
  maxRaw: integer('max_raw').notNull(),
  maxUms: integer('max_ums'),
  thresholdsJson: text('thresholds_json', { mode: 'json' })
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  ...isoTimestamps(),
});

/**
 * Logged past paper sits by a student with derived grade, UMS/PUM & reflections.
 */
export const userPastPaperRecords = sqliteTable('user_past_paper_records', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  pastPaperId: text('past_paper_id').references(() => pastPapers.id, {
    onDelete: 'set null',
  }),
  paperCode: text('paper_code').notNull(),
  seriesId: text('series_id').notNull(),
  rawScore: integer('raw_score').notNull(),
  maxRaw: integer('max_raw').notNull(),
  percentage: real('percentage').notNull(),
  derivedGrade: text('derived_grade').notNull(),
  derivedUmsOrPum: integer('derived_ums_or_pum').notNull(),
  umsOrPumLabel: text('ums_or_pum_label')
    .$type<'UMS' | 'PUM'>()
    .notNull()
    .default('UMS'),
  timed: booleanFlag('timed', true),
  weakTopicsJson: text('weak_topics_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  reflectionNotes: text('reflection_notes').notNull().default(''),
  attemptedAtIso: text('attempted_at_iso').notNull(),
  ...isoTimestamps(),
});

/**
 * Optional saved snapshots from `@ants/calculator` inside `Study`.
 */
export const gradeEntries = sqliteTable('grade_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  boardId: text('board_id').notNull(),
  subjectCode: text('subject_code').notNull(),
  subjectTitle: text('subject_title').notNull(),
  seriesId: text('series_id').notNull(),
  rawMarksJson: text('raw_marks_json', { mode: 'json' })
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  totalRaw: integer('total_raw').notNull(),
  maxTotalRaw: integer('max_total_raw').notNull(),
  totalUms: integer('total_ums'),
  maxTotalUms: integer('max_total_ums'),
  percentage: real('percentage').notNull(),
  finalGrade: text('final_grade').notNull(),
  createdAt: createdAtColumn(),
});

/**
 * Audit trail for contributor/admin edits to boundaries, schedules & syllabuses.
 */
export const examDataAuditLog = sqliteTable('exam_data_audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  entityTable: text('entity_table').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').$type<'create' | 'update' | 'delete'>().notNull(),
  beforeJson: text('before_json', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  afterJson: text('after_json', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  reason: text('reason').notNull().default(''),
  createdAt: createdAtColumn(),
});

/**
 * Idempotent XP event ledger preventing duplicate XP awards across retries.
 */
export const userXpLedger = sqliteTable('user_xp_ledger', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  xpAmount: integer('xp_amount').notNull(),
  summary: text('summary').notNull(),
  createdAt: createdAtColumn(),
});

/**
 * Unlocked achievement milestone badges per scholar.
 */
export const userBadges = sqliteTable('user_badges', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  badgeCode: text('badge_code').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  awardedAtIso: text('awarded_at_iso').notNull(),
});

/**
 * Daily streak tracker powering Study Dashboard and Scholar Leaderboard.
 */
export const userStreaks = sqliteTable('user_streaks', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  currentStreakDays: integer('current_streak_days').notNull().default(0),
  longestStreakDays: integer('longest_streak_days').notNull().default(0),
  lastActiveDateIso: text('last_active_date_iso'),
  ...isoTimestamps(),
});

export const exam_schedules = examSchedules;
export const exam_countdowns = examCountdowns;
export const user_enrollments = userEnrollments;
export const user_exam_overrides = userExamOverrides;
export const user_exam_history = userExamHistory;
export const subject_component_routes = subjectComponentRoutes;
export const user_cash_in_enrollments = userCashInEnrollments;
export const user_component_selections = userComponentSelections;
export const past_papers = pastPapers;
export const subject_grade_boundaries = subjectGradeBoundaries;
export const paper_grade_boundaries = paperGradeBoundaries;
export const user_past_paper_records = userPastPaperRecords;
export const grade_entries = gradeEntries;
export const exam_data_audit_log = examDataAuditLog;
export const user_xp_ledger = userXpLedger;
export const user_badges = userBadges;
export const user_streaks = userStreaks;
