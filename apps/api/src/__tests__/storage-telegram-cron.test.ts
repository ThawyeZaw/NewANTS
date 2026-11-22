import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database, R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import {
  ApiErrorResponseSchema,
  AuthSessionBundleSchema,
  StorageFileMetadataDtoSchema,
  TELEGRAM_VERIFICATION_CODE_REGEX,
  TelegramStatusDtoSchema,
} from '@ants/shared-types';
import { BETTER_AUTH_SESSION_COOKIE_NAME } from '../auth/cookies';
import { processDueNotificationQueue } from '../cron/notification-runner';
import { createApiApp, runScheduledTick, type ApiBindings } from '../index';
import { sanitizeStorageKey, StorageServiceError } from '../storage/service';
import { sendTelegramTestPingForUser } from '../telegram/service';

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

interface StoredR2Entry {
  key: string;
  bytes: Uint8Array;
  etag: string;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  customMetadata?: Record<string, string>;
}

function createInMemoryR2Bucket(): { bucket: R2Bucket; objects: Map<string, StoredR2Entry> } {
  const objects = new Map<string, StoredR2Entry>();
  let versionSeq = 1;

  const bucket = {
    async put(
      key: string,
      value: ArrayBuffer | ArrayBufferView | string | Blob,
      options?: {
        httpMetadata?: { contentType?: string; cacheControl?: string };
        customMetadata?: Record<string, string>;
      }
    ) {
      let bytes: Uint8Array;
      if (value instanceof Uint8Array) {
        bytes = new Uint8Array(value);
      } else if (ArrayBuffer.isView(value)) {
        bytes = new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
      } else if (value instanceof ArrayBuffer) {
        bytes = new Uint8Array(value);
      } else if (typeof value === 'string') {
        bytes = new TextEncoder().encode(value);
      } else {
        bytes = new Uint8Array(await value.arrayBuffer());
      }

      const etag = `v${versionSeq++}-${bytes.byteLength}`;
      const entry: StoredR2Entry = {
        key,
        bytes,
        etag,
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
      };
      objects.set(key, entry);

      return {
        key,
        version: etag,
        size: bytes.byteLength,
        etag,
        httpEtag: `"${etag}"`,
        uploaded: new Date(),
        httpMetadata: entry.httpMetadata ?? {},
        customMetadata: entry.customMetadata ?? {},
      };
    },

    async get(key: string): Promise<R2ObjectBody | null> {
      const entry = objects.get(key);
      if (!entry) return null;

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(entry.bytes);
          controller.close();
        },
      });

      return {
        key: entry.key,
        version: entry.etag,
        size: entry.bytes.byteLength,
        etag: entry.etag,
        httpEtag: `"${entry.etag}"`,
        uploaded: new Date(),
        httpMetadata: entry.httpMetadata ?? {},
        customMetadata: entry.customMetadata ?? {},
        body: stream,
        bodyUsed: false,
        writeHttpMetadata(headers: Headers) {
          if (entry.httpMetadata?.contentType) {
            headers.set('content-type', entry.httpMetadata.contentType);
          }
          if (entry.httpMetadata?.cacheControl) {
            headers.set('cache-control', entry.httpMetadata.cacheControl);
          }
        },
        async arrayBuffer() {
          return entry.bytes.buffer.slice(
            entry.bytes.byteOffset,
            entry.bytes.byteOffset + entry.bytes.byteLength
          );
        },
        async text() {
          return new TextDecoder().decode(entry.bytes);
        },
        async json<T>() {
          return JSON.parse(new TextDecoder().decode(entry.bytes)) as T;
        },
        async blob() {
          return new Blob([entry.bytes], {
            type: entry.httpMetadata?.contentType ?? 'application/octet-stream',
          });
        },
      } as unknown as R2ObjectBody;
    },

    async delete(keys: string | string[]) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) {
        objects.delete(k);
      }
    },
  } as unknown as R2Bucket;

  return { bucket, objects };
}

function getSetCookies(headers: Headers): string[] {
  const headerWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headerWithGetSetCookie.getSetCookie === 'function') {
    return headerWithGetSetCookie.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function signUpTestUser(
  api: ReturnType<typeof createApiApp>,
  env: ApiBindings,
  input: { name: string; email: string; username: string }
) {
  const res = await api.request(
    'http://localhost:8787/api/auth/sign-up/email',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: 'StrongPassword123!',
        username: input.username,
        academicTrack: 'ial',
      }),
    },
    env
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: unknown };
  const bundle = AuthSessionBundleSchema.parse(body.data);
  const setCookies = getSetCookies(res.headers);
  const authCookie = setCookies
    .find((line) => line.startsWith(`${BETTER_AUTH_SESSION_COOKIE_NAME}=`))
    ?.split(';')[0]
    ?.trim();
  expect(authCookie).toBeDefined();
  return { bundle, cookieHeader: authCookie ?? '' };
}

describe('@ants/api — Private R2 Storage Proxy [THAW-1.6]', () => {
  it('enforces role/ownership on upload/delete, streams public & private files, and supports 304 ETag caching', async () => {
    const { d1, sqlite } = createInMemoryD1Database();
    const { bucket, objects } = createInMemoryR2Bucket();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      ASSETS: bucket,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'storage-test-secret-0123456789ab',
    };

    // Missing R2 ASSETS binding yields 503
    const missingR2Res = await api.request(
      'http://localhost:8787/api/storage/file/org/logo.png',
      {},
      { DB: d1 }
    );
    expect(missingR2Res.status).toBe(503);

    const student = await signUpTestUser(api, env, {
      name: 'Student One',
      email: 'student1@the-ants.org',
      username: 'studentone',
    });
    const contributor = await signUpTestUser(api, env, {
      name: 'Contributor Lead',
      email: 'contrib@the-ants.org',
      username: 'contribead',
    });

    // Elevate second user to contributor in D1
    sqlite
      .prepare(`UPDATE user SET role = 'contributor', roles = '["contributor","student"]' WHERE id = ?`)
      .run(contributor.bundle.user.id);
    sqlite
      .prepare(`UPDATE profiles SET role = 'contributor', roles = '["contributor","student"]' WHERE user_id = ?`)
      .run(contributor.bundle.user.id);

    const sampleDataUrl =
      'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

    // Student cannot upload under org/
    const forbiddenOrgUpload = await api.request(
      'http://localhost:8787/api/storage/upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: student.cookieHeader,
        },
        body: JSON.stringify({
          dataUrl: sampleDataUrl,
          prefix: 'org',
          filename: 'unauthorized.webp',
        }),
      },
      env
    );
    expect(forbiddenOrgUpload.status).toBe(403);
    expect(ApiErrorResponseSchema.parse(await forbiddenOrgUpload.json()).error.code).toBe(
      'FORBIDDEN'
    );

    // Contributor uploads org cover photo via JSON Data URL
    const contribUpload = await api.request(
      'http://localhost:8787/api/storage/upload',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: contributor.cookieHeader,
        },
        body: JSON.stringify({
          dataUrl: sampleDataUrl,
          prefix: 'activities',
          filename: 'hackathon-banner.webp',
        }),
      },
      env
    );
    expect(contribUpload.status).toBe(201);
    const contribBody = (await contribUpload.json()) as { data: unknown };
    const publicAsset = StorageFileMetadataDtoSchema.parse(contribBody.data);
    expect(publicAsset.key.startsWith('activities/')).toBe(true);
    expect(publicAsset.visibility).toBe('public');
    expect(objects.has(publicAsset.key)).toBe(true);

    // Public GET succeeds unauthenticated and supports If-None-Match 304
    const publicGet = await api.request(`http://localhost:8787${publicAsset.url}`, {}, env);
    expect(publicGet.status).toBe(200);
    expect(publicGet.headers.get('content-type')).toBe('image/webp');
    expect(publicGet.headers.get('x-content-type-options')).toBe('nosniff');
    expect(publicGet.headers.get('etag')).toBe(publicAsset.etag);

    const notModified = await api.request(
      `http://localhost:8787${publicAsset.url}`,
      {
        headers: { 'If-None-Match': publicAsset.etag },
      },
      env
    );
    expect(notModified.status).toBe(304);

    // Student uploads private PDF via multipart/form-data
    const form = new FormData();
    form.set('prefix', 'private');
    form.set(
      'file',
      new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'transcript.pdf', {
        type: 'application/pdf',
      })
    );

    const privateUpload = await api.request(
      'http://localhost:8787/api/storage/upload',
      {
        method: 'POST',
        headers: { Cookie: student.cookieHeader },
        body: form,
      },
      env
    );
    expect(privateUpload.status).toBe(201);
    const privateMeta = StorageFileMetadataDtoSchema.parse(
      ((await privateUpload.json()) as { data: unknown }).data
    );
    expect(privateMeta.visibility).toBe('private');
    expect(privateMeta.key.startsWith(`private/${student.bundle.user.id}/`)).toBe(true);

    // Private GET blocked for guest (401) and other non-admin users (403), allowed for owner (200)
    const guestPrivateGet = await api.request(`http://localhost:8787${privateMeta.url}`, {}, env);
    expect(guestPrivateGet.status).toBe(401);

    const otherUserPrivateGet = await api.request(
      `http://localhost:8787${privateMeta.url}`,
      { headers: { Cookie: contributor.cookieHeader } },
      env
    );
    expect(otherUserPrivateGet.status).toBe(403);

    const ownerPrivateGet = await api.request(
      `http://localhost:8787${privateMeta.url}`,
      { headers: { Cookie: student.cookieHeader } },
      env
    );
    expect(ownerPrivateGet.status).toBe(200);
    expect(ownerPrivateGet.headers.get('content-type')).toBe('application/pdf');
    expect(ownerPrivateGet.headers.get('cache-control')).toContain('private');

    // Admin can read student's private file, and student can upload to own avatars/
    const adminUser = await signUpTestUser(api, env, {
      name: 'Admin User',
      email: 'admin@the-ants.org',
      username: 'antsadmin',
    });
    sqlite
      .prepare(`UPDATE user SET role = 'admin', roles = '["admin","student"]' WHERE id = ?`)
      .run(adminUser.bundle.user.id);
    sqlite
      .prepare(`UPDATE profiles SET role = 'admin', roles = '["admin","student"]' WHERE user_id = ?`)
      .run(adminUser.bundle.user.id);

    const adminPrivateGet = await api.request(
      `http://localhost:8787${privateMeta.url}`,
      { headers: { Cookie: adminUser.cookieHeader } },
      env
    );
    expect(adminPrivateGet.status).toBe(200);

    const avatarForm = new FormData();
    avatarForm.set('prefix', 'avatars');
    avatarForm.set(
      'file',
      new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'me.png', { type: 'image/png' })
    );
    const avatarRes = await api.request(
      'http://localhost:8787/api/storage/upload',
      { method: 'POST', headers: { Cookie: student.cookieHeader }, body: avatarForm },
      env
    );
    expect(avatarRes.status).toBe(201);
    const avatarMeta = StorageFileMetadataDtoSchema.parse(
      ((await avatarRes.json()) as { data: unknown }).data
    );
    expect(avatarMeta.key.startsWith(`avatars/${student.bundle.user.id}/`)).toBe(true);
    expect(avatarMeta.visibility).toBe('public');

    // Path traversal rejection (encoded URL segments & direct helper)
    const traversalRes = await api.request(
      'http://localhost:8787/api/storage/file/org/%2e%2e/secret.txt',
      {},
      env
    );
    expect(traversalRes.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(await traversalRes.json()).error.code).toBe(
      'INVALID_STORAGE_KEY'
    );
    expect(() => sanitizeStorageKey('org/../../secret.txt')).toThrowError(StorageServiceError);

    // Delete authorization: student cannot delete contributor's activities file, owner can delete private file
    const forbiddenDelete = await api.request(
      `http://localhost:8787${publicAsset.url}`,
      {
        method: 'DELETE',
        headers: { Cookie: student.cookieHeader },
      },
      env
    );
    expect(forbiddenDelete.status).toBe(403);

    const ownerDelete = await api.request(
      `http://localhost:8787${privateMeta.url}`,
      {
        method: 'DELETE',
        headers: { Cookie: student.cookieHeader },
      },
      env
    );
    expect(ownerDelete.status).toBe(200);
    expect(objects.has(privateMeta.key)).toBe(false);

    const afterDeleteGet = await api.request(
      `http://localhost:8787${privateMeta.url}`,
      { headers: { Cookie: student.cookieHeader } },
      env
    );
    expect(afterDeleteGet.status).toBe(404);
  });
});

describe('@ants/api — Telegram Bot Webhook, Linking & 5-Min Cron [THAW-1.6]', () => {
  it('completes full Telegram /start ANT-XXXX linking lifecycle, preferences, test ping & unlink', async () => {
    const { d1, sqlite } = createInMemoryD1Database();
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'telegram-test-secret-0123456789a',
      TELEGRAM_WEBHOOK_SECRET: 'tg-hook-secret-xyz',
      TELEGRAM_BOT_USERNAME: '@TheANTsFlowBot',
    };

    const user = await signUpTestUser(api, env, {
      name: 'Hnin Wai',
      email: 'hnin@the-ants.org',
      username: 'hninwai',
    });

    // Unauthenticated status rejected
    const unauthStatus = await api.request('http://localhost:8787/api/telegram/status', {}, env);
    expect(unauthStatus.status).toBe(401);

    // Initial status is unlinked
    const initialStatusRes = await api.request(
      'http://localhost:8787/api/telegram/status',
      { headers: { Cookie: user.cookieHeader } },
      env
    );
    expect(initialStatusRes.status).toBe(200);
    const initialStatus = TelegramStatusDtoSchema.parse(
      ((await initialStatusRes.json()) as { data: unknown }).data
    );
    expect(initialStatus.status).toBe('unlinked');
    expect(initialStatus.botUsername).toBe('TheANTsFlowBot');

    // Start linking -> generates ANT-XXXX code
    const startRes = await api.request(
      'http://localhost:8787/api/telegram/link/start',
      {
        method: 'POST',
        headers: { Cookie: user.cookieHeader },
      },
      env
    );
    expect(startRes.status).toBe(200);
    const pendingStatus = TelegramStatusDtoSchema.parse(
      ((await startRes.json()) as { data: unknown }).data
    );
    expect(pendingStatus.status).toBe('pending');
    expect(pendingStatus.verificationCode).toMatch(TELEGRAM_VERIFICATION_CODE_REGEX);
    expect(pendingStatus.startCommand).toBe(`/start ${pendingStatus.verificationCode}`);
    expect(pendingStatus.deepLinkUrl).toContain('https://t.me/TheANTsFlowBot?start=ANT-');

    // Webhook rejects bad secret token
    const badSecretWebhook = await api.request(
      'http://localhost:8787/api/telegram/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret',
        },
        body: JSON.stringify({
          update_id: 1,
          message: {
            text: pendingStatus.startCommand,
            chat: { id: 555000111, type: 'private', username: 'hnin_tg_handle' },
          },
        }),
      },
      env
    );
    expect(badSecretWebhook.status).toBe(401);

    // Unknown or bare /start command returns handled cleanly without linking
    const bareStartWebhook = await api.request(
      'http://localhost:8787/api/telegram/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': 'tg-hook-secret-xyz',
        },
        body: JSON.stringify({
          update_id: 99,
          message: {
            text: '/start',
            chat: { id: 555000111, type: 'private', username: 'hnin_tg_handle' },
          },
        }),
      },
      env
    );
    expect(bareStartWebhook.status).toBe(200);
    expect(
      ((await bareStartWebhook.json()) as { data: { linked: boolean; reason: string } }).data
    ).toMatchObject({ linked: false, reason: 'missing_or_invalid_code' });

    // Valid webhook completes linking and captures distinct Telegram @username
    const validWebhook = await api.request(
      'http://localhost:8787/api/telegram/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': 'tg-hook-secret-xyz',
        },
        body: JSON.stringify({
          update_id: 2,
          message: {
            message_id: 10,
            text: pendingStatus.startCommand,
            chat: { id: 555000111, type: 'private', username: 'hnin_tg_handle' },
            from: { id: 555000111, username: 'hnin_tg_handle', first_name: 'Hnin' },
          },
        }),
      },
      env
    );
    expect(validWebhook.status).toBe(200);
    const webhookJson = (await validWebhook.json()) as {
      ok: boolean;
      data: {
        handled: boolean;
        linked: boolean;
        username: string;
        telegramHandle: string;
        telegramChatId: string;
      };
    };
    expect(webhookJson.data.linked).toBe(true);
    expect(webhookJson.data.username).toBe('hninwai');
    expect(webhookJson.data.telegramHandle).toBe('@hnin_tg_handle');
    expect(webhookJson.data.telegramChatId).toBe('555000111');

    // Update preferences via PUT /api/telegram/preferences
    const prefsRes = await api.request(
      'http://localhost:8787/api/telegram/preferences',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: user.cookieHeader,
        },
        body: JSON.stringify({
          defaultLeadMinutes: 15,
          dailyMorningDigest: true,
          digestTime: '06:45',
        }),
      },
      env
    );
    expect(prefsRes.status).toBe(200);
    const updatedStatus = TelegramStatusDtoSchema.parse(
      ((await prefsRes.json()) as { data: unknown }).data
    );
    expect(updatedStatus.status).toBe('connected');
    expect(updatedStatus.handle).toBe('@hnin_tg_handle');
    expect(updatedStatus.preferences.defaultLeadMinutes).toBe(15);
    expect(updatedStatus.preferences.dailyMorningDigest).toBe(true);
    expect(updatedStatus.preferences.digestTime).toBe('06:45');

    // Send test ping (simulated locally when TELEGRAM_BOT_TOKEN is unset)
    const pingRes = await api.request(
      'http://localhost:8787/api/telegram/test-ping',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: user.cookieHeader,
        },
        body: JSON.stringify({ message: 'Live test ping check' }),
      },
      env
    );
    expect(pingRes.status).toBe(200);
    const pingJson = (await pingRes.json()) as {
      data: { delivery: { outcome: string; simulated: boolean } };
    };
    expect(pingJson.data.delivery.outcome).toBe('sent');
    expect(pingJson.data.delivery.simulated).toBe(true);

    // Check notifications table received both telegram_linked and test_ping
    const notifRows = sqlite
      .prepare('SELECT type FROM notifications WHERE user_id = ? ORDER BY created_at ASC')
      .all(user.bundle.user.id) as Array<{ type: string }>;
    expect(notifRows.map((r) => r.type)).toEqual(['telegram_linked', 'test_ping']);

    // Verify expired /start codes reset status safely
    const secondStartRes = await api.request(
      'http://localhost:8787/api/telegram/link/start',
      { method: 'POST', headers: { Cookie: user.cookieHeader } },
      env
    );
    const secondPending = TelegramStatusDtoSchema.parse(
      ((await secondStartRes.json()) as { data: unknown }).data
    );
    sqlite
      .prepare('UPDATE profiles SET telegram_code_expires_at = ? WHERE user_id = ?')
      .run('2020-01-01T00:00:00.000Z', user.bundle.user.id);

    const expiredWebhook = await api.request(
      'http://localhost:8787/api/telegram/webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': 'tg-hook-secret-xyz',
        },
        body: JSON.stringify({
          update_id: 3,
          message: {
            text: secondPending.startCommand,
            chat: { id: 555000111, type: 'private', username: 'hnin_tg_handle' },
          },
        }),
      },
      env
    );
    const expiredBody = (await expiredWebhook.json()) as {
      data: { linked: boolean; reason: string };
    };
    expect(expiredBody.data.linked).toBe(false);
    expect(expiredBody.data.reason).toBe('code_expired');

    // Unlink resets Telegram connection fields
    const unlinkRes = await api.request(
      'http://localhost:8787/api/telegram/unlink',
      {
        method: 'POST',
        headers: { Cookie: user.cookieHeader },
      },
      env
    );
    expect(unlinkRes.status).toBe(200);
    const unlinkedStatus = TelegramStatusDtoSchema.parse(
      ((await unlinkRes.json()) as { data: unknown }).data
    );
    expect(unlinkedStatus.status).toBe('unlinked');
    expect(unlinkedStatus.chatId).toBeNull();
    expect(unlinkedStatus.handle).toBe('');
  });

  it('drains due notification_queue items in 5-min Cron (simulated & live HTTP), cancels disabled prefs, and retries failures up to 3 attempts', async () => {
    const { d1, sqlite } = createInMemoryD1Database();
    const api = createApiApp();
    const baseEnv: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'cron-test-secret-0123456789abcde',
    };

    const scholar = await signUpTestUser(api, baseEnv, {
      name: 'Kyaw Zin',
      email: 'kyawzin@the-ants.org',
      username: 'kyawzin',
    });

    // Connect scholar's Telegram in D1 directly
    sqlite
      .prepare(
        `UPDATE profiles SET telegram_status = 'connected', telegram_chat_id = '777888999', telegram_handle = '@kyawzin_tg' WHERE user_id = ?`
      )
      .run(scholar.bundle.user.id);

    const tickTimeIso = '2026-11-21T16:40:00.000Z';
    const insertQueue = sqlite.prepare(
      `INSERT INTO notification_queue (id, user_id, channel, telegram_chat_id, source_type, source_id, payload_json, scheduled_for_iso, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`
    );

    // 1. Due telegram timetable_block (enabled by default) -> should simulate send
    insertQueue.run(
      'nq_due_block',
      scholar.bundle.user.id,
      'telegram',
      '777888999',
      'timetable_block',
      'blk_1',
      JSON.stringify({ title: 'WMA13 Differentiation Drill', leadMinutes: 10 }),
      '2026-11-21T16:35:00.000Z',
      tickTimeIso,
      tickTimeIso
    );

    // 2. Future timetable_block -> should stay pending
    insertQueue.run(
      'nq_future_block',
      scholar.bundle.user.id,
      'telegram',
      '777888999',
      'timetable_block',
      'blk_2',
      JSON.stringify({ title: 'Evening Past Paper' }),
      '2026-11-21T17:00:00.000Z',
      tickTimeIso,
      tickTimeIso
    );

    // 3. Due daily_digest (disabled by default in notification_preferences) -> should be cancelled
    insertQueue.run(
      'nq_disabled_digest',
      scholar.bundle.user.id,
      'telegram',
      '777888999',
      'daily_digest',
      null,
      JSON.stringify({ message: 'Morning summary' }),
      '2026-11-21T16:30:00.000Z',
      tickTimeIso,
      tickTimeIso
    );

    // 4. Due in_app exam_countdown -> should deliver into notifications table
    insertQueue.run(
      'nq_due_inapp',
      scholar.bundle.user.id,
      'in_app',
      null,
      'exam_countdown',
      'ex_wma13',
      JSON.stringify({ title: 'WMA13 Exam in 7 Days' }),
      '2026-11-21T16:39:00.000Z',
      tickTimeIso,
      tickTimeIso
    );

    // Run 5-minute Cron without TELEGRAM_BOT_TOKEN (local dev simulation)
    const simResult = await runScheduledTick(
      { cron: '*/5 * * * *', scheduledTime: Date.parse(tickTimeIso) },
      baseEnv,
      undefined,
      { nowIso: tickTimeIso }
    );

    expect(simResult.ok).toBe(true);
    expect(simResult.processedCount).toBe(3);
    expect(simResult.sentCount).toBe(2);
    expect(simResult.simulatedCount).toBe(1);
    expect(simResult.cancelledCount).toBe(1);
    expect(simResult.failedCount).toBe(0);

    const statusMap = new Map(
      (
        sqlite
          .prepare('SELECT id, status, attempts FROM notification_queue WHERE user_id = ?')
          .all(scholar.bundle.user.id) as Array<{ id: string; status: string; attempts: number }>
      ).map((row) => [row.id, row])
    );

    expect(statusMap.get('nq_due_block')?.status).toBe('sent');
    expect(statusMap.get('nq_due_block')?.attempts).toBe(1);
    expect(statusMap.get('nq_future_block')?.status).toBe('pending');
    expect(statusMap.get('nq_disabled_digest')?.status).toBe('cancelled');
    expect(statusMap.get('nq_due_inapp')?.status).toBe('sent');

    // Now test live Telegram Bot HTTP delivery + retry exhaustion when TELEGRAM_BOT_TOKEN is set
    const liveRequests: Array<{ url: string; body: { chat_id: string; text: string } }> = [];
    const okFetch: typeof fetch = async (input, init) => {
      liveRequests.push({
        url: typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
        body: JSON.parse(String(init?.body ?? '{}')) as { chat_id: string; text: string },
      });
      return new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const liveEnv: ApiBindings = {
      ...baseEnv,
      TELEGRAM_BOT_TOKEN: '123456:TEST_BOT_TOKEN',
    };

    const pingResult = await sendTelegramTestPingForUser(
      d1,
      liveEnv,
      scholar.bundle.user.id,
      { message: 'Live bot ping', dispatchImmediately: true },
      okFetch
    );
    expect(pingResult.delivery?.outcome).toBe('sent');
    expect(pingResult.delivery?.simulated).toBe(false);
    expect(liveRequests).toHaveLength(1);
    expect(liveRequests[0]?.url).toBe('https://api.telegram.org/bot123456:TEST_BOT_TOKEN/sendMessage');
    expect(liveRequests[0]?.body.chat_id).toBe('777888999');
    expect(liveRequests[0]?.body.text).toContain('Live bot ping');

    // Test retry exhaustion: enqueue row + failing fetch (3 attempts -> failed)
    insertQueue.run(
      'nq_retry_fail',
      scholar.bundle.user.id,
      'telegram',
      '777888999',
      'task',
      'tsk_1',
      JSON.stringify({ title: 'Failing delivery task' }),
      '2026-11-21T16:30:00.000Z',
      tickTimeIso,
      tickTimeIso
    );

    const failingFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ ok: false, description: 'Bad Gateway from Telegram' }), {
        status: 502,
      });

    const try1 = await processDueNotificationQueue(d1, liveEnv, {
      nowIso: tickTimeIso,
      fetchImpl: failingFetch,
    });
    expect(try1.retryingCount).toBe(1);
    expect(try1.failedCount).toBe(0);

    const try2 = await processDueNotificationQueue(d1, liveEnv, {
      nowIso: tickTimeIso,
      fetchImpl: failingFetch,
    });
    expect(try2.retryingCount).toBe(1);
    expect(try2.failedCount).toBe(0);

    const try3 = await processDueNotificationQueue(d1, liveEnv, {
      nowIso: tickTimeIso,
      fetchImpl: failingFetch,
    });
    expect(try3.retryingCount).toBe(0);
    expect(try3.failedCount).toBe(1);

    const failedRow = sqlite
      .prepare('SELECT status, attempts, last_error FROM notification_queue WHERE id = ?')
      .get('nq_retry_fail') as { status: string; attempts: number; last_error: string };
    expect(failedRow.status).toBe('failed');
    expect(failedRow.attempts).toBe(3);
    expect(failedRow.last_error).toContain('Bad Gateway from Telegram');
  });
});
