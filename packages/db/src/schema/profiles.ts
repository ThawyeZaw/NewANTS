import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type {
  CurriculumBoardId,
  TelegramLinkStatus,
  TutorSlotStatus,
  UserRole,
} from '@ants/shared-types';
import { user } from './auth';
import { booleanFlag, isoTimestamps } from './helpers';

export interface ProfileVisibilityConfig {
  showStatsStreak: boolean;
  showPortfolioProjects: boolean;
  showCertifications: boolean;
  showTutorSchedule: boolean;
  showTelegramInquiry: boolean;
}

export interface PortfolioHighlightRecord {
  id: string;
  title: string;
  category: 'Study Notes' | 'Build & Tooling' | 'Research & Essays' | 'Exam Prep';
  summary: string;
  tags: string[];
  linkLabel?: string;
  href?: string;
  updatedLabel: string;
}

export type TutorWeeklyScheduleRecord = Record<string, Record<number, TutorSlotStatus>>;

/**
 * Shared public & workspace profile record linked 1:1 with Better Auth `user`.
 */
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  headline: text('headline').notNull().default(''),
  bio: text('bio').notNull().default(''),
  avatarUrl: text('avatar_url'),
  institution: text('institution').notNull().default(''),
  curriculumLabel: text('curriculum_label').notNull().default('Edexcel IAL'),
  timezone: text('timezone').notNull().default('Asia/Yangon'),
  preferredApp: text('preferred_app').$type<'flow' | 'study'>().notNull().default('study'),
  role: text('role').$type<UserRole>().notNull().default('student'),
  roles: text('roles').notNull().default('["student"]'),
  xp: integer('xp').notNull().default(0),
  streakDays: integer('streak_days').notNull().default(0),
  focusHoursThisMonth: real('focus_hours_this_month').notNull().default(0),
  completedSessions: integer('completed_sessions').notNull().default(0),
  telegramStatus: text('telegram_status')
    .$type<TelegramLinkStatus>()
    .notNull()
    .default('unlinked'),
  telegramChatId: text('telegram_chat_id'),
  telegramHandle: text('telegram_handle').notNull().default(''),
  telegramVerificationCode: text('telegram_verification_code'),
  telegramCodeExpiresAt: text('telegram_code_expires_at'),
  telegramLinkedAt: text('telegram_linked_at'),
  visibilityJson: text('visibility_json', { mode: 'json' })
    .$type<ProfileVisibilityConfig>()
    .notNull()
    .default({
      showStatsStreak: true,
      showPortfolioProjects: true,
      showCertifications: true,
      showTutorSchedule: true,
      showTelegramInquiry: true,
    }),
  portfolioJson: text('portfolio_json', { mode: 'json' })
    .$type<PortfolioHighlightRecord[]>()
    .notNull()
    .default([]),
  ...isoTimestamps(),
});

/**
 * Student-specific Study Hub preferences & cohort settings.
 */
export const studentProfiles = sqliteTable('student_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeBoardId: text('active_board_id')
    .$type<CurriculumBoardId>()
    .notNull()
    .default('edexcel-ial'),
  cohortYear: text('cohort_year'),
  targetUniversity: text('target_university'),
  privateStudyMode: booleanFlag('private_study_mode', false),
  weeklyGoalMinutes: integer('weekly_goal_minutes').notNull().default(600),
  ...isoTimestamps(),
});

/**
 * Verified Tutor / Teacher showcase configuration & Sun–Sat availability matrix.
 */
export const tutorProfiles = sqliteTable('tutor_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  isActive: booleanFlag('is_active', true),
  specialization: text('specialization').notNull().default(''),
  hourlyRateLabel: text('hourly_rate_label').notNull().default(''),
  tutorTelegramUsername: text('tutor_telegram_username').notNull().default(''),
  curriculumsJson: text('curriculums_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  taughtSubjectsJson: text('taught_subjects_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  weeklyScheduleJson: text('weekly_schedule_json', { mode: 'json' })
    .$type<TutorWeeklyScheduleRecord>()
    .notNull()
    .default({}),
  featuredOnOrg: booleanFlag('featured_on_org', false),
  ...isoTimestamps(),
});

/**
 * Contributor & Main Contributor profile credentials for syllabus/boundary authoring.
 */
export const contributorProfiles = sqliteTable('contributor_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  level: text('level')
    .$type<'contributor' | 'main_contributor'>()
    .notNull()
    .default('contributor'),
  focusBoardsJson: text('focus_boards_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  approvedSubmissionsCount: integer('approved_submissions_count').notNull().default(0),
  bio: text('bio').notNull().default(''),
  ...isoTimestamps(),
});

/**
 * Academic & educator certifications showcased on `/@[username]`.
 */
export const certifications = sqliteTable('certifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  issuer: text('issuer').notNull(),
  year: text('year').notNull(),
  credentialCode: text('credential_code'),
  verified: booleanFlag('verified', false),
  displayOrder: integer('display_order').notNull().default(0),
  ...isoTimestamps(),
});

/**
 * Requests submitted by users to elevate into `tutor`, `teacher`, or `contributor`.
 */
export const roleUpgradeRequests = sqliteTable('role_upgrade_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  requestedRole: text('requested_role').$type<UserRole>().notNull(),
  status: text('status')
    .$type<'pending' | 'approved' | 'rejected'>()
    .notNull()
    .default('pending'),
  motivation: text('motivation').notNull().default(''),
  evidenceJson: text('evidence_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  reviewedByUserId: text('reviewed_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  reviewNote: text('review_note'),
  reviewedAt: text('reviewed_at'),
  ...isoTimestamps(),
});

// Snake_case aliases matching spec.md Table Blueprint
export const student_profiles = studentProfiles;
export const tutor_profiles = tutorProfiles;
export const contributor_profiles = contributorProfiles;
export const role_upgrade_requests = roleUpgradeRequests;
