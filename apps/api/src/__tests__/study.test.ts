import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import {
  FlowTimetableBootstrapDtoSchema,
  StudyCatalogResponseDtoSchema,
  StudyCheckInResponseDtoSchema,
  StudyCountdownsResponseDtoSchema,
  StudyDashboardResponseDtoSchema,
  StudyExamCountdownDtoSchema,
  StudyLeaderboardResponseDtoSchema,
  StudyLogPastPaperResponseDtoSchema,
  StudyMathsSuiteMutationResponseDtoSchema,
  StudyPastPapersResponseDtoSchema,
  StudyTopicProgressMutationResponseDtoSchema,
  StudyTopicsResponseDtoSchema,
  createApiSuccessSchema,
} from '@ants/shared-types';
import { createApiApp, type ApiBindings } from '../index';

function normalizeSqliteParam(value: unknown): SQLInputValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') {
    return value;
  }
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (ArrayBuffer.isView(value)) return value as NodeJS.ArrayBufferView;
  return JSON.stringify(value);
}

function locateMigration(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), `../../packages/db/migrations/${filename}`),
    path.resolve(process.cwd(), `packages/db/migrations/${filename}`),
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) throw new Error(`Could not locate migration ${filename}`);
  return hit;
}

function createStudyTestD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const migrations = [
    '0000_romantic_marvex.sql',
    '0002_seed_full_calculator_catalog.sql',
    '0003_remove_ial_fm_oct_nov.sql',
    '0004_clean_calculator_board_labels.sql',
    '0006_seed_study_curriculum.sql',
  ];

  for (const file of migrations) {
    const sqlText = fs.readFileSync(locateMigration(file), 'utf8');
    for (const chunk of sqlText.split('--> statement-breakpoint')) {
      const trimmed = chunk.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }

  const createStatement = (stmtSql: string, boundParams: SQLInputValue[] = []) => {
    const returnsRows = () =>
      /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(stmtSql) || /\bRETURNING\b/i.test(stmtSql);
    const runSync = () => {
      const prepared = sqlite.prepare(stmtSql);
      if (returnsRows()) return prepared.all(...boundParams) as Record<string, unknown>[];
      prepared.run(...boundParams);
      return [];
    };

    return {
      _internal: { runSync },
      bind(...params: unknown[]) {
        return createStatement(stmtSql, params.map(normalizeSqliteParam));
      },
      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const rows = runSync();
        const row = rows[0];
        if (!row) return null;
        return colName ? ((row[colName] as T | undefined) ?? null) : (row as T);
      },
      async run() {
        runSync();
        return { success: true, results: [], meta: { duration: 0, changes: 1 } };
      },
      async all<T = Record<string, unknown>>() {
        return { success: true, results: runSync() as T[], meta: { duration: 0 } };
      },
      async raw<T = unknown[]>() {
        const prepared = sqlite.prepare(stmtSql);
        if (returnsRows()) {
          prepared.setReturnArrays(true);
          return prepared.all(...boundParams) as unknown as T[];
        }
        prepared.run(...boundParams);
        return [] as T[];
      },
    };
  };

  const d1 = {
    prepare(stmtSql: string) {
      return createStatement(stmtSql);
    },
    async batch(statements: Array<ReturnType<typeof createStatement>>) {
      sqlite.exec('BEGIN;');
      try {
        const out = statements.map((s) => ({
          success: true,
          results: s._internal.runSync(),
          meta: { duration: 0, changes: 1 },
        }));
        sqlite.exec('COMMIT;');
        return out;
      } catch (err) {
        sqlite.exec('ROLLBACK;');
        throw err;
      }
    },
    async exec(query: string) {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
    async dump() {
      return new ArrayBuffer(0);
    },
  } as unknown as D1Database;

  return { d1, sqlite };
}

function getCookieHeader(res: Response): string {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  const lines = typeof h.getSetCookie === 'function' ? h.getSetCookie() : [];
  return lines
    .map((l) => l.split(';')[0]?.trim() ?? '')
    .filter(Boolean)
    .join('; ');
}

describe('/api/study/* Stage T4 End-to-End Integration', () => {
  it('enforces strict authentication (401) across all /api/study/* endpoints', async () => {
    const { d1 } = createStudyTestD1();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'study-test-secret-001',
    };

    for (const pathUrl of [
      '/api/study/catalog',
      '/api/study/topics',
      '/api/study/past-papers',
      '/api/study/countdowns',
      '/api/study/dashboard',
      '/api/study/leaderboard',
    ]) {
      const res = await api.request(`http://localhost:8787${pathUrl}`, {}, env);
      expect(res.status).toBe(401);
    }
  });

  it('persists Catalog enrollments, WMA11-SET rules, Topic XP, Past Paper boundaries, Countdowns/Flow sync & Leaderboard', async () => {
    const { d1 } = createStudyTestD1();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'study-test-secret-002',
    };

    const signupRes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Study Scholar',
          email: 'scholar@the-ants.org',
          password: 'StrongPassword123!',
          academicTrack: 'ial',
          rememberMe: true,
        }),
      },
      env
    );
    expect(signupRes.status).toBe(201);
    const cookie = getCookieHeader(signupRes);

    // 1. Catalog returns all 4 boards & 49 real seeded subjects
    const catRes = await api.request(
      'http://localhost:8787/api/study/catalog',
      { headers: { Cookie: cookie } },
      env
    );
    expect(catRes.status).toBe(200);
    const catalog = createApiSuccessSchema(StudyCatalogResponseDtoSchema).parse(
      await catRes.json()
    ).data;
    expect(catalog.boards).toHaveLength(4);
    expect(catalog.subjects).toHaveLength(49);
    expect(catalog.subjects.every((s) => s.topicCount >= 1)).toBe(true);

    // 2. Enroll in edexcel-ial-maths & caie-igcse-maths-0580 (auto-syncs official countdowns)
    const enrollRes = await api.request(
      'http://localhost:8787/api/study/enrollments',
      {
        method: 'PUT',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'ial-maths-suite',
          enrolled: true,
          targetGrade: 'A*',
        }),
      },
      env
    );
    expect(enrollRes.status).toBe(200);
    const enrollJson = (await enrollRes.json()) as {
      ok: boolean;
      data: { enrolledSubjectIds: string[] };
    };
    expect(enrollJson.data.enrolledSubjectIds).toContain('edexcel-ial-maths');

    // 3. WMA11-SET validation & persistence
    const mathsBadRes = await api.request(
      'http://localhost:8787/api/study/maths-suite',
      {
        method: 'PUT',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeCashIn: 'YMA01',
          enrolledCashIns: ['YMA01'],
          unitsByCashIn: {
            XMA01: ['WMA11', 'WMA12', 'WME01'],
            YMA01: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME02', 'WST02'],
            XFM01: ['WFM01', 'WFM02', 'WME02'],
            YFM01: ['WFM01', 'WFM02', 'WFM03', 'WME02', 'WME03', 'WST02'],
          },
        }),
      },
      env
    );
    expect(mathsBadRes.status).toBe(200);
    const mathsBad = createApiSuccessSchema(StudyMathsSuiteMutationResponseDtoSchema).parse(
      await mathsBadRes.json()
    ).data;
    expect(mathsBad.validation.isValid).toBe(false);

    const mathsGoodRes = await api.request(
      'http://localhost:8787/api/study/maths-suite',
      {
        method: 'PUT',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeCashIn: 'YMA01',
          enrolledCashIns: ['YMA01', 'YFM01'],
          unitsByCashIn: {
            XMA01: ['WMA11', 'WMA12', 'WME01'],
            YMA01: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
            XFM01: ['WFM01', 'WFM02', 'WME02'],
            YFM01: ['WFM01', 'WFM02', 'WFM03', 'WME02', 'WME03', 'WST02'],
          },
        }),
      },
      env
    );
    expect(mathsGoodRes.status).toBe(200);
    const mathsGood = createApiSuccessSchema(StudyMathsSuiteMutationResponseDtoSchema).parse(
      await mathsGoodRes.json()
    ).data;
    expect(mathsGood.validation.isValid).toBe(true);
    expect(mathsGood.mathsSuite.validationByCashIn?.YFM01.isValid).toBe(true);

    // 4. Topic Tracker: load topics & award idempotent +10 XP on mastery
    const topicsRes = await api.request(
      'http://localhost:8787/api/study/topics?subjectId=edexcel-ial-maths',
      { headers: { Cookie: cookie } },
      env
    );
    expect(topicsRes.status).toBe(200);
    const topicsData = createApiSuccessSchema(StudyTopicsResponseDtoSchema).parse(
      await topicsRes.json()
    ).data;
    expect(topicsData.topics.length).toBeGreaterThan(10);
    const firstTopic = topicsData.topics[0]!;

    const progRes1 = await api.request(
      `http://localhost:8787/api/study/topics/${encodeURIComponent(firstTopic.id)}/progress`,
      {
        method: 'PUT',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: firstTopic.subjectId,
          completedSubtopicIds: firstTopic.subtopics.map((s) => s.id),
          status: 'mastered',
          personalNote: 'Remember discriminant b^2 - 4ac > 0.',
        }),
      },
      env
    );
    expect(progRes1.status).toBe(200);
    const prog1 = createApiSuccessSchema(StudyTopicProgressMutationResponseDtoSchema).parse(
      await progRes1.json()
    ).data;
    expect(prog1.xpAwardedNow).toBe(10);
    expect(prog1.totalXp).toBe(10);

    // Repeat mastery -> 0 extra XP
    const progRes2 = await api.request(
      `http://localhost:8787/api/study/topics/${encodeURIComponent(firstTopic.id)}/progress`,
      {
        method: 'PUT',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: firstTopic.subjectId,
          status: 'mastered',
        }),
      },
      env
    );
    const prog2 = createApiSuccessSchema(StudyTopicProgressMutationResponseDtoSchema).parse(
      await progRes2.json()
    ).data;
    expect(prog2.xpAwardedNow).toBe(0);
    expect(prog2.totalXp).toBe(10);

    // 5. Past Papers: derive grade & UMS, +25 XP first attempt, +15 XP PB, then DELETE
    const papersRes = await api.request(
      'http://localhost:8787/api/study/past-papers?subjectId=edexcel-ial-maths',
      { headers: { Cookie: cookie } },
      env
    );
    expect(papersRes.status).toBe(200);
    const papersData = createApiSuccessSchema(StudyPastPapersResponseDtoSchema).parse(
      await papersRes.json()
    ).data;
    expect(papersData.rows.length).toBeGreaterThanOrEqual(14);
    const wma11Row = papersData.rows.find((r) => r.unitCode === 'WMA11')!;

    const logRes1 = await api.request(
      'http://localhost:8787/api/study/past-papers/attempts',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-maths',
          pastPaperId: wma11Row.id,
          paperCode: wma11Row.paperCode,
          seriesId: 'mj-2025',
          rawScore: 60,
          timed: true,
          weakTopics: ['Vectors'],
          reflectionNotes: 'Solid P1 run.',
        }),
      },
      env
    );
    expect(logRes1.status).toBe(201);
    const logged1 = createApiSuccessSchema(StudyLogPastPaperResponseDtoSchema).parse(
      await logRes1.json()
    ).data;
    expect(logged1.xpAwardedNow).toBe(25);
    expect(logged1.xpReason).toBe('first_attempt');
    expect(logged1.attempt.umsOrPumLabel).toBe('UMS');
    expect(logged1.totalXp).toBe(35);

    const logRes2 = await api.request(
      'http://localhost:8787/api/study/past-papers/attempts',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-maths',
          pastPaperId: wma11Row.id,
          paperCode: wma11Row.paperCode,
          seriesId: 'mj-2025',
          rawScore: 70,
          timed: true,
          weakTopics: [],
          reflectionNotes: 'Personal best!',
        }),
      },
      env
    );
    expect(logRes2.status).toBe(201);
    const logged2 = createApiSuccessSchema(StudyLogPastPaperResponseDtoSchema).parse(
      await logRes2.json()
    ).data;
    expect(logged2.xpAwardedNow).toBe(15);
    expect(logged2.xpReason).toBe('personal_best');
    expect(logged2.totalXp).toBe(50);

    const delAttemptRes = await api.request(
      `http://localhost:8787/api/study/past-papers/attempts/${encodeURIComponent(logged2.attempt.id)}`,
      { method: 'DELETE', headers: { Cookie: cookie } },
      env
    );
    expect(delAttemptRes.status).toBe(200);

    // 6. Exam Countdowns CRUD + Flow Timetable Sync verification
    const countdownsRes = await api.request(
      'http://localhost:8787/api/study/countdowns',
      { headers: { Cookie: cookie } },
      env
    );
    expect(countdownsRes.status).toBe(200);
    const countdowns = createApiSuccessSchema(StudyCountdownsResponseDtoSchema).parse(
      await countdownsRes.json()
    ).data;
    expect(countdowns.countdowns.length).toBeGreaterThan(0);

    const createCountdownRes = await api.request(
      'http://localhost:8787/api/study/countdowns',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: 'edexcel-ial',
          paperCode: 'WMA11-MOCK',
          title: 'Full Timed Pure 1 Mock',
          examDateIso: '2026-12-18',
          examTime24h: '14:00',
          targetGrade: 'A*',
          category: 'mock',
          isCustom: true,
          isMock: true,
          colorTag: 'indigo',
          pinned: true,
          syncedToFlow: true,
        }),
      },
      env
    );
    expect(createCountdownRes.status).toBe(201);
    const createdExam = createApiSuccessSchema(StudyExamCountdownDtoSchema).parse(
      await createCountdownRes.json()
    ).data;
    expect(createdExam.syncedToFlow).toBe(true);

    // Cross-app Flow Timetable verification
    const flowBootRes = await api.request(
      'http://localhost:8787/api/flow/timetable',
      { headers: { Cookie: cookie } },
      env
    );
    expect(flowBootRes.status).toBe(200);
    const flowBoot = createApiSuccessSchema(FlowTimetableBootstrapDtoSchema).parse(
      await flowBootRes.json()
    ).data;
    expect(flowBoot.exams.some((e) => e.code === 'WMA11-MOCK')).toBe(true);

    // 7. Dashboard aggregation + Daily check-in (+15 XP)
    const dashRes = await api.request(
      'http://localhost:8787/api/study/dashboard',
      { headers: { Cookie: cookie } },
      env
    );
    expect(dashRes.status).toBe(200);
    const dash = createApiSuccessSchema(StudyDashboardResponseDtoSchema).parse(
      await dashRes.json()
    ).data;
    expect(dash.subjectsByBoard['edexcel-ial']).toHaveLength(1);
    expect(dash.totalXp).toBe(50);

    const checkInRes = await api.request(
      'http://localhost:8787/api/study/dashboard/check-in',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-maths',
          boardId: 'edexcel-ial',
        }),
      },
      env
    );
    expect(checkInRes.status).toBe(200);
    const checkIn = createApiSuccessSchema(StudyCheckInResponseDtoSchema).parse(
      await checkInRes.json()
    ).data;
    expect(checkIn.reviewedToday).toBe(true);
    expect(checkIn.xpAwardedNow).toBe(15);
    expect(checkIn.totalXp).toBe(65);

    // 8. Leaderboard & privacy mode toggle
    const lbRes = await api.request(
      'http://localhost:8787/api/study/leaderboard',
      { headers: { Cookie: cookie } },
      env
    );
    expect(lbRes.status).toBe(200);
    const lb = createApiSuccessSchema(StudyLeaderboardResponseDtoSchema).parse(
      await lbRes.json()
    ).data;
    expect(lb.currentUserXp).toBe(65);
    expect(lb.visibleOnLeaderboard).toBe(true);
    expect(lb.badges.some((b) => b.id === 'badge_flow_sync_1' && b.earned)).toBe(true);

    const visRes = await api.request(
      'http://localhost:8787/api/study/leaderboard/visibility',
      {
        method: 'PUT',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleOnLeaderboard: false }),
      },
      env
    );
    expect(visRes.status).toBe(200);
  });
});
