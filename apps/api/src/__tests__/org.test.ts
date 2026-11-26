import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import {
  ApiErrorResponseSchema,
  OrgActivityDetailResponseDtoSchema,
  OrgActivityListResponseDtoSchema,
  OrgArticleDetailResponseDtoSchema,
  OrgArticleListResponseDtoSchema,
  OrgHomePayloadDtoSchema,
  OrgTeamListResponseDtoSchema,
  OrgTeamMemberDetailResponseDtoSchema,
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

interface BoundStatement {
  runSync: () => Record<string, unknown>[];
  allSync: () => Record<string, unknown>[];
  returnsRows: () => boolean;
}

function resolveMigrationPath(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), `../../packages/db/migrations/${filename}`),
    path.resolve(process.cwd(), `packages/db/migrations/${filename}`),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`Could not locate packages/db migration '${filename}'.`);
  }
  return found;
}

function createInMemoryOrgD1(options?: { seedOrg?: boolean }): {
  d1: D1Database;
  sqlite: DatabaseSync;
} {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const files = ['0000_romantic_marvex.sql'];
  if (options?.seedOrg) {
    files.push('0005_seed_org_showcase.sql');
  }

  for (const filename of files) {
    const sqlText = fs.readFileSync(resolveMigrationPath(filename), 'utf8');
    for (const chunk of sqlText.split('--> statement-breakpoint')) {
      const stmtSql = chunk.trim();
      if (stmtSql) {
        sqlite.exec(stmtSql);
      }
    }
  }

  const createStatement = (sqlText: string, boundParams: SQLInputValue[] = []) => {
    const returnsRows = () =>
      /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sqlText) || /\bRETURNING\b/i.test(sqlText);

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

    return {
      _internal: { runSync, allSync, returnsRows } satisfies BoundStatement,
      bind(...params: unknown[]) {
        return createStatement(sqlText, params.map(normalizeSqliteParam));
      },
      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const firstRow = allSync()[0];
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
  };

  const d1 = {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch(statements: Array<{ _internal?: BoundStatement }>) {
      sqlite.exec('BEGIN IMMEDIATE;');
      try {
        const out = statements.map((stmt) => {
          const results = stmt._internal ? stmt._internal.allSync() : [];
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

function createBindings(d1: D1Database): ApiBindings {
  return {
    ENVIRONMENT: 'test',
    BETTER_AUTH_SECRET: 'test-secret-for-org-showcase-tests',
    DB: d1,
  };
}

describe('@ants/api — Public Organization Showcase (/api/org/*)', () => {
  it('returns seeded home payload on GET /api/org/home and 404 when unseeded', async () => {
    const app = createApiApp();

    const emptyD1 = createInMemoryOrgD1({ seedOrg: false });
    const emptyRes = await app.request('/api/org/home', {}, createBindings(emptyD1.d1));
    expect(emptyRes.status).toBe(404);
    const emptyErr = ApiErrorResponseSchema.parse(await emptyRes.json());
    expect(emptyErr.error.code).toBe('ORG_SETTINGS_NOT_FOUND');

    const seeded = createInMemoryOrgD1({ seedOrg: true });
    const res = await app.request('/api/org/home', {}, createBindings(seeded.d1));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=60');

    const envelope = createApiSuccessSchema(OrgHomePayloadDtoSchema).parse(
      await res.json()
    );
    expect(envelope.data.heroTitle).toContain('ACE With Us');
    expect(envelope.data.missionPillars).toHaveLength(3);
    expect(envelope.data.featuredMembers).toHaveLength(3);
    expect(envelope.data.recentActivities).toHaveLength(4);
    expect(envelope.data.counts.teamCount).toBe(7);
    expect(envelope.data.counts.tutorCount).toBe(4);
    expect(envelope.data.counts.activityCount).toBe(7);
    expect(envelope.data.counts.articleCount).toBe(5);
  });

  it('merges linked tutor_profiles, appends featured standalone tutors with certifications, and respects visibility_json', async () => {
    const app = createApiApp();
    const { d1, sqlite } = createInMemoryOrgD1({ seedOrg: true });
    const env = createBindings(d1);
    const now = '2026-11-25T10:00:00.000Z';

    // 1. Linked tutor override for mem_thaw (usr_thaw)
    sqlite
      .prepare(
        `INSERT INTO user (id, name, email, email_verified, username, role, roles, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, 'admin', '["admin","tutor"]', ?, ?)`
      )
      .run('usr_thaw', 'Thaw Ye Zaw (Thorin)', 'thaw@the-ants.org', 'thawyezaw', now, now);

    sqlite
      .prepare(
        `INSERT INTO profiles (id, user_id, username, display_name, role, roles, telegram_handle, visibility_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'admin', '["admin","tutor"]', ?, ?, ?, ?)`
      )
      .run(
        'prof_thaw',
        'usr_thaw',
        'thawyezaw',
        'Thaw Ye Zaw (Thorin)',
        '@thorin_live',
        '{"showStatsStreak":true,"showPortfolioProjects":true,"showCertifications":true,"showTutorSchedule":true,"showTelegramInquiry":true}',
        now,
        now
      );

    sqlite
      .prepare(
        `INSERT INTO tutor_profiles (id, user_id, is_active, specialization, hourly_rate_label, tutor_telegram_username, curriculums_json, taught_subjects_json, weekly_schedule_json, featured_on_org, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        'tp_thaw',
        'usr_thaw',
        'Edexcel IAL Further Maths · Live D1 Sync',
        '40,000 MMK / hr',
        '@thorin_live_tutor',
        '["Edexcel IAL"]',
        '["WFM01 Further Pure 1","WFM02 Further Pure 2"]',
        '{"Fri":{"19":"available","20":"flexible"}}',
        now,
        now
      );

    sqlite
      .prepare('UPDATE org_team_members SET user_id = ? WHERE id = ?')
      .run('usr_thaw', 'mem_thaw');

    // 2. Standalone active + featured tutor (usr_linn) with certifications
    sqlite
      .prepare(
        `INSERT INTO user (id, name, email, email_verified, username, role, roles, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, 'tutor', '["student","tutor"]', ?, ?)`
      )
      .run('usr_linn', 'Linn Htet Aung', 'linn@the-ants.org', 'linnhtet', now, now);

    sqlite
      .prepare(
        `INSERT INTO profiles (id, user_id, username, display_name, headline, bio, institution, curriculum_label, timezone, role, roles, telegram_handle, visibility_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'tutor', '["student","tutor"]', ?, ?, ?, ?)`
      )
      .run(
        'prof_linn',
        'usr_linn',
        'linnhtet',
        'Linn Htet Aung',
        'Cambridge 9701 Chemistry & IGCSE Maths Tutor',
        'Teaches structured organic mechanisms and moles drills.',
        'Mandalay Science Study Circle',
        'Cambridge AS & A-Level',
        'Asia/Yangon (UTC+06:30)',
        '@linn_chem',
        '{"showStatsStreak":true,"showPortfolioProjects":true,"showCertifications":true,"showTutorSchedule":true,"showTelegramInquiry":true}',
        now,
        now
      );

    sqlite
      .prepare(
        `INSERT INTO tutor_profiles (id, user_id, is_active, specialization, hourly_rate_label, tutor_telegram_username, curriculums_json, taught_subjects_json, weekly_schedule_json, featured_on_org, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        'tp_linn',
        'usr_linn',
        '9701 Organic Chemistry & 0580 Maths',
        '20,000 MMK / hr',
        '@linn_chem_tutor',
        '["Cambridge AS & A-Level","Cambridge IGCSE"]',
        '["9701 AS Chemistry","0580 Extended Maths"]',
        '{"Sat":{"10":"available","11":"available"}}',
        now,
        now
      );

    sqlite
      .prepare(
        `INSERT INTO certifications (id, user_id, title, issuer, year, verified, display_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`
      )
      .run(
        'cert_linn_1',
        'usr_linn',
        'Cambridge A-Level Chemistry: A*',
        'CAIE',
        '2025',
        now,
        now
      );

    // 3. Unfeatured tutor (should NOT appear) and inactive tutor (should NOT appear)
    sqlite
      .prepare(
        `INSERT INTO user (id, name, email, email_verified, username, role, roles, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, 'tutor', '["tutor"]', ?, ?), (?, ?, ?, 1, ?, 'tutor', '["tutor"]', ?, ?)`
      )
      .run(
        'usr_hidden',
        'Hidden Tutor',
        'hidden@the-ants.org',
        'hiddentutor',
        now,
        now,
        'usr_inactive',
        'Inactive Tutor',
        'inactive@the-ants.org',
        'inactivetutor',
        now,
        now
      );

    sqlite
      .prepare(
        `INSERT INTO profiles (id, user_id, username, display_name, role, roles, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'tutor', '["tutor"]', ?, ?), (?, ?, ?, ?, 'tutor', '["tutor"]', ?, ?)`
      )
      .run(
        'prof_hidden',
        'usr_hidden',
        'hiddentutor',
        'Hidden Tutor',
        now,
        now,
        'prof_inactive',
        'usr_inactive',
        'inactivetutor',
        'Inactive Tutor',
        now,
        now
      );

    sqlite
      .prepare(
        `INSERT INTO tutor_profiles (id, user_id, is_active, specialization, featured_on_org, created_at, updated_at)
         VALUES (?, ?, 1, 'Hidden Spec', 0, ?, ?), (?, ?, 0, 'Inactive Spec', 1, ?, ?)`
      )
      .run('tp_hidden', 'usr_hidden', now, now, 'tp_inactive', 'usr_inactive', now, now);

    // 4. Unpublished org_team_member (should NOT appear)
    sqlite
      .prepare(
        `INSERT INTO org_team_members (id, username, name, initials, role_badge, categories_json, is_published, created_at, updated_at)
         VALUES ('mem_draft', 'draftmember', 'Draft Member', 'DM', 'Draft', '["contributor"]', 0, ?, ?)`
      )
      .run(now, now);

    const teamRes = await app.request('/api/org/team', {}, env);
    expect(teamRes.status).toBe(200);
    const teamPayload = createApiSuccessSchema(OrgTeamListResponseDtoSchema).parse(
      await teamRes.json()
    );

    expect(teamPayload.data.total).toBe(8);
    expect(teamPayload.data.tutorCount).toBe(5);

    const mergedThaw = teamPayload.data.members.find((m) => m.username === 'thawyezaw');
    expect(mergedThaw?.source).toBe('merged');
    expect(mergedThaw?.hourlyRateLabel).toBe('40,000 MMK / hr');
    expect(mergedThaw?.tutorTelegramUsername).toBe('@thorin_live_tutor');
    expect(mergedThaw?.weeklySchedule.Fri?.['19']).toBe('available');
    expect(mergedThaw?.weeklySchedule.Tue?.['19']).toBe('unavailable');

    const appendedLinn = teamPayload.data.members.find((m) => m.username === 'linnhtet');
    expect(appendedLinn?.source).toBe('tutor_profile');
    expect(appendedLinn?.achievements).toContain('Cambridge A-Level Chemistry: A* (CAIE, 2025)');
    expect(appendedLinn?.weeklySchedule.Sat?.['10']).toBe('available');

    expect(teamPayload.data.members.some((m) => m.username === 'hiddentutor')).toBe(false);
    expect(teamPayload.data.members.some((m) => m.username === 'inactivetutor')).toBe(false);
    expect(teamPayload.data.members.some((m) => m.username === 'draftmember')).toBe(false);

    // Respect visibility_json privacy toggles
    sqlite
      .prepare('UPDATE profiles SET visibility_json = ? WHERE user_id = ?')
      .run(
        '{"showStatsStreak":true,"showPortfolioProjects":true,"showCertifications":false,"showTutorSchedule":false,"showTelegramInquiry":false}',
        'usr_linn'
      );

    const linnRes = await app.request('/api/org/team/%40linnhtet', {}, env);
    expect(linnRes.status).toBe(200);
    const linnDetail = createApiSuccessSchema(OrgTeamMemberDetailResponseDtoSchema).parse(
      await linnRes.json()
    );
    expect(linnDetail.data.member.tutorTelegramUsername).toBeUndefined();
    expect(linnDetail.data.member.weeklySchedule.Sat?.['10']).toBe('unavailable');
    expect(linnDetail.data.member.achievements).toEqual([]);

    const missingRes = await app.request('/api/org/team/nonexistent', {}, env);
    expect(missingRes.status).toBe(404);
  });

  it('serves published activities, category filtering, related items, and 404 for unknown/unpublished slugs', async () => {
    const app = createApiApp();
    const { d1, sqlite } = createInMemoryOrgD1({ seedOrg: true });
    const env = createBindings(d1);
    const now = '2026-11-25T10:00:00.000Z';

    sqlite
      .prepare(
        `INSERT INTO org_activities (id, slug, category, title, date_label, location, summary, cover_image_src, is_published, created_at, updated_at)
         VALUES ('act_hidden', 'unpublished-meetup', 'students_meet', 'Hidden Meet', 'Dec 2026', 'Online', 'Draft', '/images/org/students-meet.jpg', 0, ?, ?)`
      )
      .run(now, now);

    const listRes = await app.request('/api/org/activities', {}, env);
    expect(listRes.status).toBe(200);
    const listPayload = createApiSuccessSchema(OrgActivityListResponseDtoSchema).parse(
      await listRes.json()
    );
    expect(listPayload.data.total).toBe(7);
    expect(
      listPayload.data.activities.some((a) => a.slug === 'unpublished-meetup')
    ).toBe(false);

    const filteredRes = await app.request(
      '/api/org/activities?category=Hackathon',
      {},
      env
    );
    expect(filteredRes.status).toBe(200);
    const filteredPayload = createApiSuccessSchema(
      OrgActivityListResponseDtoSchema
    ).parse(await filteredRes.json());
    expect(filteredPayload.data.total).toBe(1);
    expect(filteredPayload.data.activities[0]?.slug).toBe(
      'edtech-students-hackathon-2026'
    );

    const detailRes = await app.request(
      '/api/org/activities/edtech-students-hackathon-2026',
      {},
      env
    );
    expect(detailRes.status).toBe(200);
    const detailPayload = createApiSuccessSchema(
      OrgActivityDetailResponseDtoSchema
    ).parse(await detailRes.json());
    expect(detailPayload.data.activity.category).toBe('Hackathon');
    expect(detailPayload.data.relatedActivities).toHaveLength(2);

    const hiddenRes = await app.request(
      '/api/org/activities/unpublished-meetup',
      {},
      env
    );
    expect(hiddenRes.status).toBe(404);
  });

  it('serves published articles, normalizes string/object callouts & codeBlock/codeSnippet, and excludes unpublished rows', async () => {
    const app = createApiApp();
    const { d1, sqlite } = createInMemoryOrgD1({ seedOrg: true });
    const env = createBindings(d1);
    const now = '2026-11-25T10:00:00.000Z';

    sqlite
      .prepare(
        `INSERT INTO org_articles (id, slug, title, subtitle, excerpt, category, author_name, author_username, author_role, published_at_iso, reading_time_minutes, tags_json, sections_json, is_published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(
        'art_legacy_shape',
        'legacy-callout-article',
        'Legacy Section Shape Article',
        'Tests string callout and codeBlock normalization',
        'Verifies string callouts and codeBlock fields map cleanly.',
        'Study Guide',
        'Thaw Ye Zaw (Thorin)',
        'thawyezaw',
        'Founder',
        '2026-11-20T00:00:00.000Z',
        3,
        '["Study Guide"]',
        '[{"id":"sec-1","heading":"Legacy Heading","paragraphs":["Body paragraph"],"callout":"Plain string callout","codeBlock":"const x = 1;"}]',
        now,
        now,
        'art_draft',
        'draft-secret-article',
        'Draft Secret Article',
        '',
        'Hidden',
        'Announcement',
        'Thaw',
        'thawyezaw',
        'Admin',
        '2026-11-21T00:00:00.000Z',
        2,
        '[]',
        '[]',
        now,
        now
      );

    const listRes = await app.request('/api/org/articles', {}, env);
    expect(listRes.status).toBe(200);
    const listPayload = createApiSuccessSchema(OrgArticleListResponseDtoSchema).parse(
      await listRes.json()
    );
    expect(listPayload.data.total).toBe(6);
    expect(listPayload.data.authors.length).toBeGreaterThanOrEqual(7);
    expect(
      listPayload.data.articles.some((a) => a.slug === 'draft-secret-article')
    ).toBe(false);

    const detailRes = await app.request(
      '/api/org/articles/legacy-callout-article',
      {},
      env
    );
    expect(detailRes.status).toBe(200);
    const detailPayload = createApiSuccessSchema(
      OrgArticleDetailResponseDtoSchema
    ).parse(await detailRes.json());
    expect(detailPayload.data.article.sections[0]?.callout).toEqual({
      title: 'Note',
      body: 'Plain string callout',
    });
    expect(detailPayload.data.article.sections[0]?.codeSnippet).toBe('const x = 1;');
    expect(detailPayload.data.relatedArticles).toHaveLength(2);

    const draftRes = await app.request(
      '/api/org/articles/draft-secret-article',
      {},
      env
    );
    expect(draftRes.status).toBe(404);
  });
});
