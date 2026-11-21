import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema, AuthSessionBundleSchema } from '@ants/shared-types';
import {
  ANTS_SSO_COOKIE_NAME,
  BETTER_AUTH_SESSION_COOKIE_NAME,
} from '../auth/cookies';
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

interface BoundStatement {
  runSync: () => Record<string, unknown>[];
  allSync: () => Record<string, unknown>[];
  returnsRows: () => boolean;
}

/**
 * In-memory SQLite shim implementing the Cloudflare `D1Database` contract
 * against the real `@ants/db` Drizzle SQL migration for deterministic API tests.
 */
function createInMemoryD1Database(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const candidatePaths = [
    path.resolve(process.cwd(), '../../packages/db/migrations/0000_romantic_marvex.sql'),
    path.resolve(process.cwd(), 'packages/db/migrations/0000_romantic_marvex.sql'),
  ];
  const migrationPath = candidatePaths.find((p) => fs.existsSync(p));
  if (!migrationPath) {
    throw new Error('Could not locate packages/db initial SQL migration.');
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  for (const chunk of migrationSql.split('--> statement-breakpoint')) {
    const stmtSql = chunk.trim();
    if (stmtSql) {
      sqlite.exec(stmtSql);
    }
  }

  const createStatement = (sqlText: string, boundParams: SQLInputValue[] = []) => {
    const returnsRows = () => /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sqlText) || /\bRETURNING\b/i.test(sqlText);

    const runSync = (): Record<string, unknown>[] => {
      const prepared = sqlite.prepare(sqlText);
      if (returnsRows()) {
        return prepared.all(...boundParams) as Record<string, unknown>[];
      }
      prepared.run(...boundParams);
      return [];
    };

    const allSync = (): Record<string, unknown>[] => {
      const prepared = sqlite.prepare(sqlText);
      if (returnsRows()) {
        return prepared.all(...boundParams) as Record<string, unknown>[];
      }
      prepared.run(...boundParams);
      return [];
    };

    const rawSync = (): unknown[][] => {
      const prepared = sqlite.prepare(sqlText);
      if (returnsRows()) {
        prepared.setReturnArrays(true);
        return prepared.all(...boundParams) as unknown as unknown[][];
      }
      prepared.run(...boundParams);
      return [];
    };

    const statement = {
      _internal: { runSync, allSync, returnsRows } satisfies BoundStatement,
      bind(...params: unknown[]) {
        return createStatement(sqlText, params.map(normalizeSqliteParam));
      },
      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const rows = allSync();
        const firstRow = rows[0];
        if (!firstRow) return null;
        if (colName) {
          return (firstRow[colName] as T | undefined) ?? null;
        }
        return firstRow as T;
      },
      async run() {
        const results = runSync();
        return {
          success: true as const,
          results,
          meta: {
            duration: 0,
            size_after: 0,
            rows_read: results.length,
            rows_written: returnsRows() ? 0 : 1,
            last_row_id: 0,
            changed_db: !returnsRows(),
            changes: returnsRows() ? 0 : 1,
          },
        };
      },
      async all<T = Record<string, unknown>>() {
        const results = allSync() as T[];
        return {
          success: true as const,
          results,
          meta: {
            duration: 0,
            size_after: 0,
            rows_read: results.length,
            rows_written: 0,
            last_row_id: 0,
            changed_db: false,
            changes: 0,
          },
        };
      },
      async raw() {
        return rawSync();
      },
    };

    return statement;
  };

  const d1 = {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch(statements: Array<{ _internal?: BoundStatement }>) {
      sqlite.exec('BEGIN IMMEDIATE;');
      try {
        const out = statements.map((stmt) => {
          const internal = stmt._internal;
          const results = internal ? internal.allSync() : [];
          return {
            success: true as const,
            results,
            meta: {
              duration: 0,
              size_after: 0,
              rows_read: results.length,
              rows_written: 1,
              last_row_id: 0,
              changed_db: true,
              changes: 1,
            },
          };
        });
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

function getSetCookies(headers: Headers): string[] {
  const headerWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headerWithGetSetCookie.getSetCookie === 'function') {
    return headerWithGetSetCookie.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function buildCookieHeaderFromSetCookies(setCookies: string[]): string {
  return setCookies
    .map((line) => line.split(';')[0]?.trim() ?? '')
    .filter(Boolean)
    .join('; ');
}

function extractCookieValue(setCookies: string[], cookieName: string): string | null {
  const prefix = `${cookieName}=`;
  for (const header of setCookies) {
    const firstPart = header.split(';')[0]?.trim() ?? '';
    if (firstPart.startsWith(prefix)) {
      return firstPart.slice(prefix.length);
    }
  }
  return null;
}

describe('@ants/api — Better Auth Drizzle D1 & Cross-Subdomain SSO [THAW-1.5]', () => {
  it('signs up an IAL student, creates core auth rows, and auto-provisions all 4 baseline D1 rows', async () => {
    const { d1, sqlite } = createInMemoryD1Database();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-ants-ecosystem-001',
    };

    const res = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Vitest/1.0',
        },
        body: JSON.stringify({
          name: 'Aye Chan',
          email: 'ayechan@the-ants.org',
          password: 'StrongPassword123!',
          academicTrack: 'ial',
          rememberMe: true,
        }),
      },
      env
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      ok: boolean;
      data: unknown;
    };
    expect(json.ok).toBe(true);
    const bundle = AuthSessionBundleSchema.parse(json.data);
    expect(bundle.user.email).toBe('ayechan@the-ants.org');
    expect(bundle.user.role).toBe('student');
    expect(bundle.user.roles).toEqual(['student']);
    expect(bundle.profile.preferredApp).toBe('study');
    expect(bundle.profile.isTutor).toBe(false);

    // Verify all D1 records were provisioned cleanly
    const userCount = sqlite
      .prepare('SELECT count(*) as c FROM user WHERE email = ?')
      .get('ayechan@the-ants.org') as { c: number };
    const profileRow = sqlite
      .prepare('SELECT username, preferred_app FROM profiles WHERE user_id = ?')
      .get(bundle.user.id) as { username: string; preferred_app: string };
    const studentProfile = sqlite
      .prepare('SELECT active_board_id, weekly_goal_minutes FROM student_profiles WHERE user_id = ?')
      .get(bundle.user.id) as { active_board_id: string; weekly_goal_minutes: number };
    const notifPrefs = sqlite
      .prepare('SELECT block_reminders, default_lead_minutes FROM notification_preferences WHERE user_id = ?')
      .get(bundle.user.id) as { block_reminders: number; default_lead_minutes: number };
    const streakRow = sqlite
      .prepare('SELECT current_streak_days, longest_streak_days FROM user_streaks WHERE user_id = ?')
      .get(bundle.user.id) as { current_streak_days: number; longest_streak_days: number };
    const tutorRows = sqlite
      .prepare('SELECT id FROM tutor_profiles WHERE user_id = ?')
      .all(bundle.user.id);

    expect(userCount.c).toBe(1);
    expect(profileRow.username).toBe('ayechan');
    expect(profileRow.preferred_app).toBe('study');
    expect(studentProfile.active_board_id).toBe('edexcel-ial');
    expect(studentProfile.weekly_goal_minutes).toBe(600);
    expect(notifPrefs.block_reminders).toBe(1);
    expect(notifPrefs.default_lead_minutes).toBe(10);
    expect(streakRow.current_streak_days).toBe(0);
    expect(streakRow.longest_streak_days).toBe(0);
    expect(tutorRows).toHaveLength(0);

    // Verify dual cookies in localhost mode (host-only, no Domain=.the-ants.org, no Secure)
    const setCookies = getSetCookies(res.headers);
    expect(setCookies).toHaveLength(2);
    const betterAuthCookie = setCookies.find((c) => c.startsWith(`${BETTER_AUTH_SESSION_COOKIE_NAME}=`));
    const bridgeCookie = setCookies.find((c) => c.startsWith(`${ANTS_SSO_COOKIE_NAME}=`));
    expect(betterAuthCookie).toContain('HttpOnly');
    expect(betterAuthCookie).toContain('SameSite=Lax');
    expect(betterAuthCookie).not.toContain('Domain=.the-ants.org');
    expect(betterAuthCookie).not.toContain('Secure');
    expect(bridgeCookie).toContain('SameSite=Lax');
    expect(bridgeCookie).not.toContain('HttpOnly');
  });

  it('auto-provisions tutor_profiles and assigns ["tutor", "student"] roles when academicTrack is tutor', async () => {
    const { d1, sqlite } = createInMemoryD1Database();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-ants-ecosystem-002',
    };

    const res = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ko Min Tutor',
          email: 'tutor@the-ants.org',
          password: 'TutorPassword99!',
          username: 'komintutor',
          academicTrack: 'tutor',
        }),
      },
      env
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: unknown };
    const bundle = AuthSessionBundleSchema.parse(body.data);
    expect(bundle.user.role).toBe('tutor');
    expect(bundle.user.roles).toEqual(['tutor', 'student']);
    expect(bundle.profile.isTutor).toBe(true);
    expect(bundle.profile.preferredApp).toBe('flow');

    const tutorProfile = sqlite
      .prepare('SELECT is_active, hourly_rate_label FROM tutor_profiles WHERE user_id = ?')
      .get(bundle.user.id) as { is_active: number; hourly_rate_label: string } | undefined;
    expect(tutorProfile).toBeDefined();
    expect(tutorProfile?.is_active).toBe(1);
    expect(tutorProfile?.hourly_rate_label).toBe('25,000 MMK / hr');
  });

  it('rejects duplicate email and duplicate username on sign-up', async () => {
    const { d1 } = createInMemoryD1Database();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      BETTER_AUTH_SECRET: 'test-secret-for-ants-ecosystem-003',
    };

    const firstRes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Thaw Ye Zaw',
          email: 'thaw@the-ants.org',
          password: 'Password123!',
          username: 'thawyezaw',
        }),
      },
      env
    );
    expect(firstRes.status).toBe(201);

    const dupEmailRes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Other User',
          email: 'thaw@the-ants.org',
          password: 'Password123!',
          username: 'other_user',
        }),
      },
      env
    );
    expect(dupEmailRes.status).toBe(409);
    const dupEmailErr = ApiErrorResponseSchema.parse(await dupEmailRes.json());
    expect(dupEmailErr.error.code).toBe('EMAIL_ALREADY_EXISTS');

    const dupUserRes = await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Other User',
          email: 'other@the-ants.org',
          password: 'Password123!',
          username: 'thawyezaw',
        }),
      },
      env
    );
    expect(dupUserRes.status).toBe(409);
    const dupUserErr = ApiErrorResponseSchema.parse(await dupUserRes.json());
    expect(dupUserErr.error.code).toBe('USERNAME_TAKEN');
  });

  it('enforces strict email-only sign-in, rejects bad passwords & @username, and excludes /api/auth/demo', async () => {
    const { d1 } = createInMemoryD1Database();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-ants-ecosystem-004',
    };

    await api.request(
      'http://localhost:8787/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Zay Lynn',
          email: 'zay@the-ants.org',
          password: 'CorrectPassword1!',
          username: 'zaylynnhtet',
        }),
      },
      env
    );

    // Reject @username on strict email-only sign-in
    const handleRes = await api.request(
      'http://localhost:8787/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '@zaylynnhtet',
          password: 'CorrectPassword1!',
        }),
      },
      env
    );
    expect(handleRes.status).toBe(400);
    const handleErr = ApiErrorResponseSchema.parse(await handleRes.json());
    expect(handleErr.error.code).toBe('VALIDATION_ERROR');

    // Reject wrong password
    const wrongPassRes = await api.request(
      'http://localhost:8787/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'zay@the-ants.org',
          password: 'WrongPassword!',
        }),
      },
      env
    );
    expect(wrongPassRes.status).toBe(401);
    const wrongPassErr = ApiErrorResponseSchema.parse(await wrongPassRes.json());
    expect(wrongPassErr.error.code).toBe('INVALID_CREDENTIALS');

    // Verify no /api/auth/demo route exists
    const demoRes = await api.request(
      'http://localhost:8787/api/auth/demo',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      env
    );
    expect(demoRes.status).toBe(404);

    // Succeed with valid email + password
    const signInRes = await api.request(
      'http://localhost:8787/api/auth/sign-in/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ZAY@the-ants.org',
          password: 'CorrectPassword1!',
          rememberMe: false,
        }),
      },
      env
    );
    expect(signInRes.status).toBe(200);
    const signInJson = (await signInRes.json()) as { data: unknown };
    const bundle = AuthSessionBundleSchema.parse(signInJson.data);
    expect(bundle.user.email).toBe('zay@the-ants.org');

    const cookies = getSetCookies(signInRes.headers);
    const betterAuthCookie = cookies.find((c) => c.startsWith(`${BETTER_AUTH_SESSION_COOKIE_NAME}=`));
    expect(betterAuthCookie).toContain('Max-Age=43200');
  });

  it('emits Domain=.the-ants.org Secure SSO cookies in production and resolves/clears sessions across subdomains', async () => {
    const { d1 } = createInMemoryD1Database();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      ENVIRONMENT: 'production',
      COOKIE_DOMAIN: '.the-ants.org',
      BETTER_AUTH_URL: 'https://api.the-ants.org',
      BETTER_AUTH_SECRET: 'prod-secret-key-min-32-characters-long',
    };

    const signUpRes = await api.request(
      'https://api.the-ants.org/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://study.the-ants.org',
        },
        body: JSON.stringify({
          name: 'Su Myat',
          email: 'sumyat@the-ants.org',
          password: 'ProductionPassword99!',
          academicTrack: 'igcse',
        }),
      },
      env
    );

    expect(signUpRes.status).toBe(201);
    expect(signUpRes.headers.get('access-control-allow-origin')).toBe('https://study.the-ants.org');
    expect(signUpRes.headers.get('access-control-allow-credentials')).toBe('true');

    const setCookies = getSetCookies(signUpRes.headers);
    expect(setCookies).toHaveLength(2);
    for (const header of setCookies) {
      expect(header).toContain('Domain=.the-ants.org');
      expect(header).toContain('Secure');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Max-Age=2592000');
    }

    // Verify ants_sso_session bridge cookie matches @ants/ui AntsSsoSessionState shape
    const rawBridge = extractCookieValue(setCookies, ANTS_SSO_COOKIE_NAME);
    expect(rawBridge).not.toBeNull();
    const parsedBridge = JSON.parse(decodeURIComponent(rawBridge ?? '')) as {
      version: number;
      status: string;
      username: string;
      user: { roles: string[]; curriculumLabel: string };
      customProfile: { preferredApp: string };
    };
    expect(parsedBridge.version).toBe(1);
    expect(parsedBridge.status).toBe('authenticated');
    expect(parsedBridge.username).toBe('sumyat');
    expect(parsedBridge.user.curriculumLabel).toBe('Cambridge IGCSE');
    expect(parsedBridge.customProfile.preferredApp).toBe('study');

    // Simulate flow.the-ants.org reading the active session via the .the-ants.org cookie
    const cookieHeader = buildCookieHeaderFromSetCookies(setCookies);
    const getSessionRes = await api.request(
      'https://api.the-ants.org/api/auth/get-session',
      {
        method: 'GET',
        headers: {
          Origin: 'https://flow.the-ants.org',
          Cookie: cookieHeader,
        },
      },
      env
    );
    expect(getSessionRes.status).toBe(200);
    expect(getSessionRes.headers.get('access-control-allow-origin')).toBe('https://flow.the-ants.org');
    const sessionBody = (await getSessionRes.json()) as { data: unknown };
    const verifiedBundle = AuthSessionBundleSchema.parse(sessionBody.data);
    expect(verifiedBundle.user.email).toBe('sumyat@the-ants.org');
    expect(verifiedBundle.profile.username).toBe('sumyat');

    // Sign out from org admin / any subdomain
    const signOutRes = await api.request(
      'https://api.the-ants.org/api/auth/sign-out',
      {
        method: 'POST',
        headers: {
          Origin: 'https://the-ants.org',
          Cookie: cookieHeader,
        },
      },
      env
    );
    expect(signOutRes.status).toBe(200);
    expect(signOutRes.headers.get('access-control-allow-origin')).toBe('https://the-ants.org');

    const clearedCookies = getSetCookies(signOutRes.headers);
    expect(clearedCookies).toHaveLength(2);
    for (const clearHeader of clearedCookies) {
      expect(clearHeader).toContain('Max-Age=0');
      expect(clearHeader).toContain('Domain=.the-ants.org');
    }

    // Confirm deleted session token no longer authenticates
    const afterSignOutRes = await api.request(
      'https://api.the-ants.org/api/auth/get-session',
      {
        method: 'GET',
        headers: {
          Cookie: cookieHeader,
        },
      },
      env
    );
    expect(afterSignOutRes.status).toBe(200);
    const afterBody = (await afterSignOutRes.json()) as {
      ok: boolean;
      data: unknown;
      user: unknown;
      session: unknown;
    };
    expect(afterBody.ok).toBe(true);
    expect(afterBody.data).toBeNull();
    expect(afterBody.user).toBeNull();
    expect(afterBody.session).toBeNull();
  });

  it('returns 503 SERVICE_UNAVAILABLE cleanly if D1 DB binding is missing', async () => {
    const api = createApiApp();
    const res = await api.request('http://localhost:8787/api/auth/get-session', {}, {});
    expect(res.status).toBe(503);
    const err = ApiErrorResponseSchema.parse(await res.json());
    expect(err.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
