import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { CurriculumBoardId } from '@ants/shared-types';
import { user } from './auth';
import { subjects } from './curriculums';
import { booleanFlag, createdAtColumn, isoTimestamps } from './helpers';

/**
 * Native Markdown study notes authored by students & contributors.
 */
export const studyNotes = sqliteTable('study_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  boardId: text('board_id').$type<CurriculumBoardId>().notNull().default('edexcel-ial'),
  subjectCode: text('subject_code').notNull(),
  topicCode: text('topic_code'),
  title: text('title').notNull(),
  markdownContent: text('markdown_content').notNull().default(''),
  tagsJson: text('tags_json', { mode: 'json' }).$type<string[]>().notNull().default([]),
  isPublic: booleanFlag('is_public', false),
  isPinned: booleanFlag('is_pinned', false),
  ...isoTimestamps(),
});

/**
 * Flashcard decks for spaced repetition (SM-2) study.
 */
export const flashcardDecks = sqliteTable('flashcard_decks', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  boardId: text('board_id').$type<CurriculumBoardId>().notNull().default('edexcel-ial'),
  subjectCode: text('subject_code').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  isPublic: booleanFlag('is_public', false),
  ...isoTimestamps(),
});

/**
 * Individual flashcards with SM-2 interval, ease factor & due timestamp.
 */
export const flashcards = sqliteTable('flashcards', {
  id: text('id').primaryKey(),
  deckId: text('deck_id')
    .notNull()
    .references(() => flashcardDecks.id, { onDelete: 'cascade' }),
  frontPrompt: text('front_prompt').notNull(),
  backAnswer: text('back_answer').notNull(),
  hint: text('hint'),
  formulaBlock: text('formula_block'),
  easeFactor: real('ease_factor').notNull().default(2.5),
  intervalDays: integer('interval_days').notNull().default(0),
  repetitions: integer('repetitions').notNull().default(0),
  dueAtIso: text('due_at_iso').notNull(),
  ...isoTimestamps(),
});

/**
 * Historical SM-2 flashcard review logs (`again` | `hard` | `good` | `easy`).
 */
export const flashcardReviews = sqliteTable('flashcard_reviews', {
  id: text('id').primaryKey(),
  flashcardId: text('flashcard_id')
    .notNull()
    .references(() => flashcards.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  rating: text('rating').$type<'again' | 'hard' | 'good' | 'easy'>().notNull(),
  previousIntervalDays: integer('previous_interval_days').notNull(),
  nextIntervalDays: integer('next_interval_days').notNull(),
  reviewedAtIso: text('reviewed_at_iso').notNull(),
});

/**
 * Topical & timed practice quizzes supporting MCQ & numeric/formula short answers.
 */
export const quizzes = sqliteTable('quizzes', {
  id: text('id').primaryKey(),
  authorUserId: text('author_user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  boardId: text('board_id').$type<CurriculumBoardId>().notNull().default('edexcel-ial'),
  subjectCode: text('subject_code').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  timeLimitSeconds: integer('time_limit_seconds'),
  isPublished: booleanFlag('is_published', true),
  ...isoTimestamps(),
});

/**
 * Individual quiz questions with mark-scheme step-by-step explanations.
 */
export const quizQuestions = sqliteTable('quiz_questions', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  questionType: text('question_type').$type<'mcq' | 'short_answer'>().notNull(),
  prompt: text('prompt').notNull(),
  optionsJson: text('options_json', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  correctAnswer: text('correct_answer').notNull(),
  numericTolerance: real('numeric_tolerance'),
  explanation: text('explanation').notNull().default(''),
  marks: integer('marks').notNull().default(1),
  displayOrder: integer('display_order').notNull().default(0),
});

/**
 * Completed student quiz attempt scores & XP outcomes.
 */
export const quizAttempts = sqliteTable('quiz_attempts', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  mode: text('mode').$type<'practice' | 'timed'>().notNull().default('practice'),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  elapsedSeconds: integer('elapsed_seconds').notNull().default(0),
  answersJson: text('answers_json', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  completedAtIso: text('completed_at_iso').notNull(),
});

/**
 * Active in-progress quiz sessions (supporting resume & mistake-retry).
 */
export const quizLiveSessions = sqliteTable('quiz_live_sessions', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  mode: text('mode').$type<'practice' | 'timed'>().notNull().default('practice'),
  currentIndex: integer('current_index').notNull().default(0),
  draftAnswersJson: text('draft_answers_json', { mode: 'json' })
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  startedAtIso: text('started_at_iso').notNull(),
  createdAt: createdAtColumn(),
});

export const study_notes = studyNotes;
export const flashcard_decks = flashcardDecks;
export const flashcard_reviews = flashcardReviews;
export const quiz_questions = quizQuestions;
export const quiz_attempts = quizAttempts;
export const quiz_live_sessions = quizLiveSessions;
