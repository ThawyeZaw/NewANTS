import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type {
  GradingScale,
  SubjectType,
  TopicConfidenceStatus,
  TopicDifficulty,
} from '@ants/shared-types';
import { user } from './auth';
import { booleanFlag, isoTimestamps } from './helpers';

export interface SyllabusSubtopicDef {
  id: string;
  code: string;
  title: string;
}

/**
 * Supported exam boards (`edexcel-ial`, `cambridge-igcse`, `cambridge-alevel`, `edexcel-igcse`).
 */
export const curriculums = sqliteTable('curriculums', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  shortLabel: text('short_label').notNull(),
  qualificationLevel: text('qualification_level').notNull(),
  gradingScale: text('grading_scale').$type<GradingScale>().notNull(),
  summary: text('summary').notNull().default(''),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: booleanFlag('is_active', true),
  ...isoTimestamps(),
});

/**
 * Academic subjects supporting `fixed_linear`, `modular_sciences`, and `modular_maths_suite`.
 */
export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  curriculumId: text('curriculum_id')
    .notNull()
    .references(() => curriculums.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  title: text('title').notNull(),
  faculty: text('faculty').notNull().default('Sciences'),
  subjectType: text('subject_type')
    .$type<SubjectType>()
    .notNull()
    .default('fixed_linear'),
  gradingScale: text('grading_scale').$type<GradingScale>().notNull().default('A*-U'),
  totalUms: integer('total_ums'),
  totalRawMarks: integer('total_raw_marks').notNull(),
  examSessionWindow: text('exam_session_window').notNull().default('May/June & Oct/Nov'),
  summary: text('summary').notNull().default(''),
  qualificationDataJson: text('qualification_data_json', { mode: 'json' })
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  isActive: booleanFlag('is_active', true),
  ...isoTimestamps(),
});

/**
 * Syllabus topic entries & nested subtopics for the Topic Tracker.
 */
export const topics = sqliteTable('topics', {
  id: text('id').primaryKey(),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  unitCode: text('unit_code').notNull(),
  unitLabel: text('unit_label').notNull(),
  code: text('code').notNull(),
  title: text('title').notNull(),
  difficulty: text('difficulty')
    .$type<TopicDifficulty>()
    .notNull()
    .default('standard'),
  estimatedMinutes: integer('estimated_minutes').notNull().default(45),
  keyFormulasJson: text('key_formulas_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  subtopicsJson: text('subtopics_json', { mode: 'json' })
    .$type<SyllabusSubtopicDef[]>()
    .notNull()
    .default([]),
  displayOrder: integer('display_order').notNull().default(0),
  ...isoTimestamps(),
});

/**
 * Curriculum boards selected by a student inside Study.
 */
export const userCurriculums = sqliteTable('user_curriculums', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  curriculumId: text('curriculum_id')
    .notNull()
    .references(() => curriculums.id, { onDelete: 'cascade' }),
  isPrimary: booleanFlag('is_primary', false),
  targetSeriesId: text('target_series_id'),
  ...isoTimestamps(),
});

/**
 * Per-user topic confidence status, subtopic completion, and personal study notes.
 */
export const topicProgress = sqliteTable('topic_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id')
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  topicId: text('topic_id')
    .notNull()
    .references(() => topics.id, { onDelete: 'cascade' }),
  status: text('status')
    .$type<TopicConfidenceStatus>()
    .notNull()
    .default('not_started'),
  completedSubtopicIdsJson: text('completed_subtopic_ids_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  personalNote: text('personal_note').notNull().default(''),
  xpAwarded: booleanFlag('xp_awarded', false),
  lastStudiedAtIso: text('last_studied_at_iso'),
  ...isoTimestamps(),
});

export const user_curriculums = userCurriculums;
export const topic_progress = topicProgress;
