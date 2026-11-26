import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import {
  AccountProfileDtoSchema,
  PublicProfileResponseDtoSchema,
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

function createAccountTestD1(): { d1: D1Database; sqlite: DatabaseSync } {
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

describe('@ants/api — Shared Account & Public Profile (`/api/account/*`, [THAW-3.4])', () => {
  it('updates /api/account/me, rejects duplicate usernames (409), and filters public profile privacy', async () => {
    const { d1 } = createAccountTestD1();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-account-profile-001',
    };

    const userARes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Zay Mentor',
          email: 'zaymentor@the-ants.org',
          password: 'StrongPassword123!',
          username: 'zaymentor',
          academicTrack: 'tutor',
          rememberMe: true,
        }),
      },
      env
    );
    expect(userARes.status).toBe(201);
    const cookieA = getCookieHeader(userARes);

    const userBRes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Second User',
          email: 'second@the-ants.org',
          password: 'StrongPassword123!',
          username: 'secondscholar',
          academicTrack: 'ial',
          rememberMe: true,
        }),
      },
      env
    );
    expect(userBRes.status).toBe(201);
    const cookieB = getCookieHeader(userBRes);

    // Duplicate username conflict
    const dupRes = await api.request(
      'http://localhost:8787/api/account/me',
      {
        method: 'PUT',
        headers: { Cookie: cookieB, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'zaymentor' }),
      },
      env
    );
    expect(dupRes.status).toBe(409);

    // Update User A with certifications, portfolio & hidden stats/certs visibility
    const putRes = await api.request(
      'http://localhost:8787/api/account/me',
      {
        method: 'PUT',
        headers: { Cookie: cookieA, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: 'IAL Physics & Further Maths Mentor',
          hourlyRateLabel: '30,000 MMK / hr',
          tutorSchedule: { Sat: { '10': 'available', '11': 'flexible' } },
          portfolioItems: [
            {
              id: 'pf_1',
              title: '9702 Mechanics Formula Sheet',
              category: 'Study Notes',
              summary: 'Complete derivations',
              tags: ['9702', 'Physics'],
              updatedLabel: 'Nov 2026',
            },
          ],
          certifications: [
            {
              id: 'cert_1',
              title: 'Pearson Edexcel IAL Mathematics A*',
              issuer: 'Pearson Edexcel',
              year: '2024',
              verified: true,
            },
          ],
          visibility: {
            showStatsStreak: false,
            showPortfolioProjects: true,
            showCertifications: false,
            showTutorSchedule: true,
            showTelegramInquiry: true,
          },
        }),
      },
      env
    );
    expect(putRes.status).toBe(200);
    const savedProfile = createApiSuccessSchema(AccountProfileDtoSchema).parse(
      await putRes.json()
    ).data;
    expect(savedProfile.email).toBe('zaymentor@the-ants.org');
    expect(savedProfile.certifications).toHaveLength(1);

    // Public viewer fetches @zaymentor -> private email & hidden certifications/stats are masked!
    const publicRes = await api.request(
      'http://localhost:8787/api/account/profiles/zaymentor',
      {},
      env
    );
    expect(publicRes.status).toBe(200);
    const publicPayload = createApiSuccessSchema(PublicProfileResponseDtoSchema).parse(
      await publicRes.json()
    ).data;
    expect(publicPayload.isOwnProfile).toBe(false);
    expect(publicPayload.profile.email).toBe('');
    expect(publicPayload.profile.certifications).toEqual([]);
    expect(publicPayload.profile.portfolioItems).toHaveLength(1);

    // Unknown profile -> 404
    const notFoundRes = await api.request(
      'http://localhost:8787/api/account/profiles/nobody_here_123',
      {},
      env
    );
    expect(notFoundRes.status).toBe(404);
  });
});
