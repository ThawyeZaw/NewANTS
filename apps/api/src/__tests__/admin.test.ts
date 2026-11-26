import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import {
  AdminOrgActivityRecordDtoSchema,
  AdminOrgBootstrapDtoSchema,
  AdminOrgSettingsDtoSchema,
  AdminOrgTeamMemberRecordDtoSchema,
  AdminUserSummaryDtoSchema,
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

function createAdminTestD1(): { d1: D1Database; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const files = ['0000_romantic_marvex.sql', '0005_seed_org_showcase.sql'];
  for (const filename of files) {
    const candidates = [
      path.resolve(process.cwd(), `../../packages/db/migrations/${filename}`),
      path.resolve(process.cwd(), `packages/db/migrations/${filename}`),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error(`Could not locate migration ${filename}`);
    }
    const sqlText = fs.readFileSync(found, 'utf8');
    for (const chunk of sqlText.split('--> statement-breakpoint')) {
      const trimmed = chunk.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }

  const createStatement = (sqlText: string, boundParams: SQLInputValue[] = []) => {
    const returnsRows = () =>
      /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sqlText) || /\bRETURNING\b/i.test(sqlText);
    const runSync = () => {
      const prepared = sqlite.prepare(sqlText);
      if (returnsRows()) {
        return prepared.all(...boundParams) as Record<string, unknown>[];
      }
      prepared.run(...boundParams);
      return [];
    };

    const stmt = {
      _internal: { runSync, returnsRows },
      bind(...params: unknown[]) {
        return createStatement(sqlText, params.map(normalizeSqliteParam));
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
        const prepared = sqlite.prepare(sqlText);
        if (returnsRows()) {
          prepared.setReturnArrays(true);
          return prepared.all(...boundParams) as unknown as T[];
        }
        prepared.run(...boundParams);
        return [] as T[];
      },
    };
    return stmt;
  };

  const d1 = {
    prepare(sqlText: string) {
      return createStatement(sqlText);
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

function getSetCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === 'function') return h.getSetCookie();
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

function cookieHeader(res: Response): string {
  return getSetCookies(res.headers)
    .map((line) => line.split(';')[0]?.trim() ?? '')
    .filter(Boolean)
    .join('; ');
}

async function signUpTestUser(
  api: ReturnType<typeof createApiApp>,
  env: ApiBindings,
  sqlite: DatabaseSync,
  opts: { name: string; email: string; role: string; roles: string[] }
) {
  const res = await api.request(
    'http://localhost:8787/api/auth/sign-up/email',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: opts.name,
        email: opts.email,
        password: 'StrongPassword123!',
        academicTrack: 'ial',
        rememberMe: true,
      }),
    },
    env
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: { user: { id: string } } };
  const userId = body.data.user.id;
  sqlite
    .prepare('UPDATE user SET role = ?, roles = ? WHERE id = ?')
    .run(opts.role, JSON.stringify(opts.roles), userId);
  return { userId, cookie: cookieHeader(res) };
}

describe('@ants/api — Admin CMS & RBAC (`/api/admin/*`, [THAW-2.3])', () => {
  it('enforces 401/403 RBAC hierarchy and restricts settings + user roles to admins', async () => {
    const { d1, sqlite } = createAdminTestD1();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-admin-cms-001',
    };

    const guestRes = await api.request('http://localhost:8787/api/admin/bootstrap', {}, env);
    expect(guestRes.status).toBe(401);

    const student = await signUpTestUser(api, env, sqlite, {
      name: 'Min Student',
      email: 'student@the-ants.org',
      role: 'student',
      roles: ['student'],
    });

    const studentRes = await api.request(
      'http://localhost:8787/api/admin/bootstrap',
      { headers: { Cookie: student.cookie } },
      env
    );
    expect(studentRes.status).toBe(403);

    const lead = await signUpTestUser(api, env, sqlite, {
      name: 'Su Lead',
      email: 'lead@the-ants.org',
      role: 'main_contributor',
      roles: ['student', 'main_contributor'],
    });

    const leadBootRes = await api.request(
      'http://localhost:8787/api/admin/bootstrap',
      { headers: { Cookie: lead.cookie } },
      env
    );
    expect(leadBootRes.status).toBe(200);
    const leadBoot = createApiSuccessSchema(AdminOrgBootstrapDtoSchema).parse(
      await leadBootRes.json()
    ).data;
    expect(leadBoot.capabilities.canManageContent).toBe(true);
    expect(leadBoot.capabilities.canManageSettings).toBe(false);
    expect(leadBoot.capabilities.canManageRoles).toBe(false);
    expect(leadBoot.users).toEqual([]);

    // Main contributor cannot modify Org Settings or User Roles
    const leadSettingsRes = await api.request(
      'http://localhost:8787/api/admin/settings',
      {
        method: 'PUT',
        headers: { Cookie: lead.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroHeadline: 'Unauthorized Attempt',
          heroSubheadline: 'Sub',
          missionStatement: 'Mission',
          missionPillars: [],
          hackathonBanner: null,
          socialLinks: {},
        }),
      },
      env
    );
    expect(leadSettingsRes.status).toBe(403);

    // Main contributor CAN create a team member & activity
    const createTeamRes = await api.request(
      'http://localhost:8787/api/admin/team',
      {
        method: 'POST',
        headers: { Cookie: lead.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newtutor99',
          name: 'Ko Hein Tutor',
          roleBadge: 'IGCSE Chemistry Tutor',
          roleCategories: ['tutor'],
          isTutor: true,
          curriculums: ['Cambridge IGCSE'],
          taughtSubjects: ['0620 Chemistry'],
          weeklySchedule: { Sat: { '10': 'available', '11': 'flexible' } },
          displayOrder: 10,
        }),
      },
      env
    );
    expect(createTeamRes.status).toBe(201);
    const createdTeam = createApiSuccessSchema(AdminOrgTeamMemberRecordDtoSchema).parse(
      await createTeamRes.json()
    ).data;
    expect(createdTeam.username).toBe('newtutor99');
  });

  it('allows admin full settings/content CRUD, role promotion with tutor profile, and blocks self-demotion', async () => {
    const { d1, sqlite } = createAdminTestD1();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'test-secret-for-admin-cms-002',
    };

    const admin = await signUpTestUser(api, env, sqlite, {
      name: 'Thaw Admin',
      email: 'admin@the-ants.org',
      role: 'admin',
      roles: ['student', 'admin'],
    });

    const student = await signUpTestUser(api, env, sqlite, {
      name: 'Htet Scholar',
      email: 'htet@the-ants.org',
      role: 'student',
      roles: ['student'],
    });

    // Update Org Settings + Hackathon Banner
    const settingsRes = await api.request(
      'http://localhost:8787/api/admin/settings',
      {
        method: 'PUT',
        headers: { Cookie: admin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroHeadline: 'ACE With Us — Built for IAL & IGCSE',
          heroSubheadline: 'Updated live subheadline from Admin CMS.',
          missionStatement: 'Updated mission statement.',
          missionPillars: [
            { id: 'p1', code: 'Open', title: 'Free Boundaries', description: 'Zero login wall' },
          ],
          hackathonBanner: {
            title: 'ANTs Hackathon 2026',
            dateLabel: 'Nov 2026',
            location: 'Yangon',
            summary: 'Student builds',
            externalUrl: 'https://devpost.com/ants',
            ctaLabel: 'Open Devpost',
          },
          socialLinks: { github: 'https://github.com/the-ants' },
        }),
      },
      env
    );
    expect(settingsRes.status).toBe(200);
    const settingsDto = createApiSuccessSchema(AdminOrgSettingsDtoSchema).parse(
      await settingsRes.json()
    ).data;
    expect(settingsDto.hackathonBanner?.externalUrl).toBe('https://devpost.com/ants');

    // Create Activity with gallery
    const actRes = await api.request(
      'http://localhost:8787/api/admin/activities',
      {
        method: 'POST',
        headers: { Cookie: admin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: 'yangon-venue-walk-2026',
          category: 'Exam Venue Visit',
          title: 'Yangon Exam Venue Walk',
          dateLabel: 'Nov 2026',
          location: 'British Council Yangon',
          summary: 'Pre-exam briefing walk.',
          coverImageSrc: '/api/storage/file/activities/cover.png',
          gallery: [],
          displayOrder: 5,
        }),
      },
      env
    );
    expect(actRes.status).toBe(201);
    const createdAct = createApiSuccessSchema(AdminOrgActivityRecordDtoSchema).parse(
      await actRes.json()
    ).data;
    expect(createdAct.slug).toBe('yangon-venue-walk-2026');

    // Promote student to tutor -> auto-creates tutor_profiles row
    const promoteRes = await api.request(
      `http://localhost:8787/api/admin/users/${student.userId}/roles`,
      {
        method: 'PATCH',
        headers: { Cookie: admin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'tutor',
          roles: ['student', 'tutor'],
        }),
      },
      env
    );
    expect(promoteRes.status).toBe(200);
    const updatedUser = createApiSuccessSchema(AdminUserSummaryDtoSchema).parse(
      await promoteRes.json()
    ).data;
    expect(updatedUser.roles).toContain('tutor');

    const tutorRow = sqlite
      .prepare('SELECT user_id FROM tutor_profiles WHERE user_id = ?')
      .get(student.userId);
    expect(tutorRow).toBeTruthy();

    // Admin self-demotion guard
    const demoteSelfRes = await api.request(
      `http://localhost:8787/api/admin/users/${admin.userId}/roles`,
      {
        method: 'PATCH',
        headers: { Cookie: admin.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'student',
          roles: ['student'],
        }),
      },
      env
    );
    expect(demoteSelfRes.status).toBe(400);
  });
});
