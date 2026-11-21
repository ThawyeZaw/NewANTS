import fs from 'node:fs';
import path from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import { eq, getTableName, isTable } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
  createDb,
  curriculums,
  flashcardDecks,
  notificationQueue,
  nowIso,
  orgActivities,
  profiles,
  schema,
  studyNotes,
  subjects,
  tasks,
  timetableEvents,
  tutorProfiles,
  user,
  userCashInEnrollments,
  userPastPaperRecords,
} from '../index';

const EXPECTED_TABLE_NAMES = [
  // auth (4)
  'user',
  'session',
  'account',
  'verification',
  // profiles (6)
  'profiles',
  'student_profiles',
  'tutor_profiles',
  'contributor_profiles',
  'certifications',
  'role_upgrade_requests',
  // organization (4)
  'org_settings',
  'org_team_members',
  'org_activities',
  'org_articles',
  // curriculums (5)
  'curriculums',
  'subjects',
  'topics',
  'user_curriculums',
  'topic_progress',
  // study_tools (18)
  'exams',
  'exam_schedules',
  'exam_countdowns',
  'user_enrollments',
  'user_exam_overrides',
  'user_exam_history',
  'subject_component_routes',
  'user_cash_in_enrollments',
  'user_component_selections',
  'past_papers',
  'subject_grade_boundaries',
  'paper_grade_boundaries',
  'user_past_paper_records',
  'grade_entries',
  'exam_data_audit_log',
  'user_xp_ledger',
  'user_badges',
  'user_streaks',
  // learning (8)
  'study_notes',
  'flashcard_decks',
  'flashcards',
  'flashcard_reviews',
  'quizzes',
  'quiz_questions',
  'quiz_attempts',
  'quiz_live_sessions',
  // planner (4)
  'timetable_events',
  'tasks',
  'pomodoro_user_settings',
  'pomodoro_sessions',
  // system (6)
  'notifications',
  'notification_queue',
  'notification_preferences',
  'review_queue',
  'version_history',
  'activity_feed',
] as const;

describe('@ants/db — Drizzle D1 schema & query builder', () => {
  it('registers all 55 expected SQLite tables inside the canonical schema registry', () => {
    const tableNames = Object.values(schema)
      .filter((entry) => isTable(entry))
      .map((table) => getTableName(table));

    expect(tableNames).toHaveLength(55);
    expect(new Set(tableNames)).toEqual(new Set(EXPECTED_TABLE_NAMES));
  });

  it('produces valid ISO-8601 timestamps via nowIso()', () => {
    const stamp = nowIso();
    expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('compiles typed SQLite SELECT, INSERT, and UPDATE statements via createDb()', () => {
    const db = createDb({} as D1Database);

    const userSelect = db.select().from(user).where(eq(user.username, 'thawyezaw')).toSQL();
    expect(userSelect.sql).toContain('from "user"');
    expect(userSelect.params).toEqual(['thawyezaw']);

    const profileInsert = db
      .insert(profiles)
      .values({
        id: 'prof_1',
        userId: 'usr_1',
        username: 'thawyezaw',
        displayName: 'Thaw Ye Zaw',
        role: 'admin',
        roles: '["admin","tutor","student"]',
      })
      .toSQL();
    expect(profileInsert.sql).toContain('insert into "profiles"');

    const tutorUpdate = db
      .update(tutorProfiles)
      .set({ featuredOnOrg: true })
      .where(eq(tutorProfiles.userId, 'usr_1'))
      .toSQL();
    expect(tutorUpdate.sql).toContain('update "tutor_profiles"');

    expect(db.select().from(orgActivities).toSQL().sql).toContain('"org_activities"');
    expect(db.select().from(curriculums).toSQL().sql).toContain('"curriculums"');
    expect(db.select().from(subjects).toSQL().sql).toContain('"subjects"');
    expect(db.select().from(userCashInEnrollments).toSQL().sql).toContain(
      '"user_cash_in_enrollments"'
    );
    expect(db.select().from(userPastPaperRecords).toSQL().sql).toContain(
      '"user_past_paper_records"'
    );
    expect(db.select().from(studyNotes).toSQL().sql).toContain('"study_notes"');
    expect(db.select().from(flashcardDecks).toSQL().sql).toContain('"flashcard_decks"');
    expect(db.select().from(timetableEvents).toSQL().sql).toContain('"timetable_events"');
    expect(db.select().from(tasks).toSQL().sql).toContain('"tasks"');
    expect(db.select().from(notificationQueue).toSQL().sql).toContain(
      '"notification_queue"'
    );
  });

  it('includes a generated initial SQL migration creating all 55 tables', () => {
    const migrationsDir = path.resolve(process.cwd(), 'migrations');
    expect(fs.existsSync(migrationsDir)).toBe(true);

    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((name) => name.endsWith('.sql'))
      .sort();
    expect(sqlFiles.length).toBeGreaterThanOrEqual(1);

    const initialSql = fs.readFileSync(
      path.join(migrationsDir, sqlFiles[0] as string),
      'utf8'
    );

    for (const tableName of EXPECTED_TABLE_NAMES) {
      expect(initialSql).toContain(`CREATE TABLE \`${tableName}\``);
    }
  });
});
