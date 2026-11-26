import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import {
  FlowPomodoroSessionDtoSchema,
  FlowPomodoroStateDtoSchema,
  FlowTasksListDtoSchema,
  FlowTimetableBlockDtoSchema,
  FlowTimetableBootstrapDtoSchema,
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

function createFlowTestD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const candidates = [
    path.resolve(process.cwd(), '../../packages/db/migrations/0000_romantic_marvex.sql'),
    path.resolve(process.cwd(), 'packages/db/migrations/0000_romantic_marvex.sql'),
  ];
  const migrationPath = candidates.find((p) => fs.existsSync(p));
  if (!migrationPath) {
    throw new Error('Could not locate 0000_romantic_marvex.sql');
  }
  const sqlText = fs.readFileSync(migrationPath, 'utf8');
  for (const chunk of sqlText.split('--> statement-breakpoint')) {
    const trimmed = chunk.trim();
    if (trimmed) sqlite.exec(trimmed);
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

describe('@ants/api — Flow Productivity API (`/api/flow/*`, [THAW-3.1]–[THAW-3.3])', () => {
  it('blocks unauthenticated access and handles Pomodoro XP + idempotency cleanly', async () => {
    const { d1, sqlite } = createFlowTestD1();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-flow-pomodoro-001',
    };

    const guestRes = await api.request('http://localhost:8787/api/flow/pomodoro', {}, env);
    expect(guestRes.status).toBe(401);

    const signupRes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Flow Scholar',
          email: 'flowuser@the-ants.org',
          password: 'StrongPassword123!',
          academicTrack: 'ial',
          rememberMe: true,
        }),
      },
      env
    );
    expect(signupRes.status).toBe(201);
    const cookie = getCookieHeader(signupRes);
    const { data: bundle } = (await signupRes.json()) as { data: { user: { id: string } } };

    // Log a completed work session with explicit idempotency id
    const sessionRes = await api.request(
      'http://localhost:8787/api/flow/pomodoro/sessions',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'pomo_idempotent_1',
          phase: 'work',
          startedAtIso: '2026-11-25T10:00:00.000Z',
          endedAtIso: '2026-11-25T10:25:00.000Z',
          durationSeconds: 1500,
          completed: true,
          taskTitle: 'WMA12 Integration',
        }),
      },
      env
    );
    expect(sessionRes.status).toBe(201);
    const createdSession = createApiSuccessSchema(FlowPomodoroSessionDtoSchema).parse(
      await sessionRes.json()
    ).data;
    expect(createdSession.xpAwarded).toBe(15);

    // Retry same ID -> idempotent (does not double-award XP)
    await api.request(
      'http://localhost:8787/api/flow/pomodoro/sessions',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'pomo_idempotent_1',
          phase: 'work',
          startedAtIso: '2026-11-25T10:00:00.000Z',
          endedAtIso: '2026-11-25T10:25:00.000Z',
          durationSeconds: 1500,
          completed: true,
        }),
      },
      env
    );

    const stateRes = await api.request(
      'http://localhost:8787/api/flow/pomodoro',
      { headers: { Cookie: cookie } },
      env
    );
    expect(stateRes.status).toBe(200);
    const state = createApiSuccessSchema(FlowPomodoroStateDtoSchema).parse(
      await stateRes.json()
    ).data;
    expect(state.userXp).toBe(15);
    expect(state.streakDays).toBeGreaterThanOrEqual(1);
    const xpRows = sqlite
      .prepare('SELECT id FROM user_xp_ledger WHERE user_id = ?')
      .all(bundle.user.id);
    expect(xpRows).toHaveLength(1);
  });

  it('persists Timetable blocks, Telegram queue scheduling, Exam Countdowns & Task two-way sync', async () => {
    const { d1, sqlite } = createFlowTestD1();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-flow-timetable-002',
    };

    const signupRes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Planner User',
          email: 'planner@the-ants.org',
          password: 'StrongPassword123!',
          academicTrack: 'ial',
          rememberMe: true,
        }),
      },
      env
    );
    const cookie = getCookieHeader(signupRes);
    const { data: bundle } = (await signupRes.json()) as { data: { user: { id: string } } };

    // Seed an exam countdown row to verify automatic sync into timetable bootstrap
    sqlite
      .prepare(
        `INSERT INTO exam_countdowns (id, user_id, board_id, paper_code, title, exam_date_iso, target_grade, category, created_at, updated_at)
         VALUES ('ex_wma11', ?, 'edexcel-ial', 'WMA11', 'Pure Maths 1', '2026-12-05', 'A*', 'official', '2026-11-25T00:00:00Z', '2026-11-25T00:00:00Z')`
      )
      .run(bundle.user.id);

    // Create Timetable block with Telegram reminder enabled -> inserts pending notification_queue
    const blockRes = await api.request(
      'http://localhost:8787/api/flow/timetable/blocks',
      {
        method: 'POST',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'blk_calc_1',
          title: 'WMA11 Past Paper Block',
          dateIso: '2026-11-26',
          startMinutes: 540,
          endMinutes: 600,
          category: 'study',
          priority: 'P1',
          pomodorosPlanned: 2,
          telegramEnabled: true,
          telegramLeadMinutes: 10,
          telegramNote: 'Bring formula booklet',
        }),
      },
      env
    );
    expect(blockRes.status).toBe(201);
    const createdBlock = createApiSuccessSchema(FlowTimetableBlockDtoSchema).parse(
      await blockRes.json()
    ).data;
    expect(createdBlock.telegramEnabled).toBe(true);

    const queuedBefore = sqlite
      .prepare("SELECT status, source_type FROM notification_queue WHERE user_id = ? AND source_id = 'blk_calc_1'")
      .all(bundle.user.id) as Array<{ status: string; source_type: string }>;
    expect(queuedBefore).toHaveLength(1);
    expect(queuedBefore[0]?.status).toBe('pending');
    expect(queuedBefore[0]?.source_type).toBe('timetable_block');

    // Sync Tasks with linkedBlockId + done=true -> updates timetable_events.completed = true
    const syncTasksRes = await api.request(
      'http://localhost:8787/api/flow/tasks/sync',
      {
        method: 'PUT',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: [
            {
              id: 'task_linked_1',
              title: 'Complete WMA11 Past Paper',
              priority: 'P1',
              dueDateIso: '2026-11-26',
              tags: ['WMA11'],
              estimatedMinutes: 60,
              pomodorosPlanned: 2,
              pomodorosDone: 2,
              inTodayFocus: true,
              done: true,
              subtasks: [{ id: 's1', title: 'Check mark scheme', done: true }],
              linkedBlockId: 'blk_calc_1',
            },
          ],
        }),
      },
      env
    );
    expect(syncTasksRes.status).toBe(200);
    const syncedTasks = createApiSuccessSchema(FlowTasksListDtoSchema).parse(
      await syncTasksRes.json()
    ).data;
    expect(syncedTasks.tasks[0]?.done).toBe(true);

    const bootRes = await api.request(
      'http://localhost:8787/api/flow/timetable',
      { headers: { Cookie: cookie } },
      env
    );
    expect(bootRes.status).toBe(200);
    const boot = createApiSuccessSchema(FlowTimetableBootstrapDtoSchema).parse(
      await bootRes.json()
    ).data;
    expect(boot.exams).toHaveLength(1);
    expect(boot.exams[0]?.code).toBe('WMA11');
    expect(boot.blocks.find((b) => b.id === 'blk_calc_1')?.completed).toBe(true);

    // Deleting block cancels pending notification_queue entry
    const delRes = await api.request(
      'http://localhost:8787/api/flow/timetable/blocks/blk_calc_1',
      { method: 'DELETE', headers: { Cookie: cookie } },
      env
    );
    expect(delRes.status).toBe(200);
    const queuedAfter = sqlite
      .prepare("SELECT status FROM notification_queue WHERE user_id = ? AND source_id = 'blk_calc_1'")
      .all(bundle.user.id) as Array<{ status: string }>;
    expect(queuedAfter[0]?.status).toBe('cancelled');
  });
});
