import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import { ApiErrorResponseSchema, ApiHealthResponseSchema } from '@ants/shared-types';
import { createApiApp, runScheduledTick, type ApiBindings } from '../index';

describe('@ants/api — Hono Worker Health & CORS', () => {
  it('returns valid health payload on GET / and GET /api/health without bindings', async () => {
    const api = createApiApp();

    const rootRes = await api.request('http://localhost:8787/');
    expect(rootRes.status).toBe(200);
    const rootJson = ApiHealthResponseSchema.parse(await rootRes.json());
    expect(rootJson.service).toBe('@ants/api');
    expect(rootJson.bindings).toEqual({ d1: false, r2: false });

    const healthRes = await api.request('http://localhost:8787/api/health');
    expect(healthRes.status).toBe(200);
    const healthJson = ApiHealthResponseSchema.parse(await healthRes.json());
    expect(healthJson.cronSchedule).toBe('*/5 * * * *');
    expect(healthJson.apps).toHaveLength(3);
  });

  it('reports active D1 & R2 bindings when provided via Cloudflare Worker env', async () => {
    const api = createApiApp();
    const env: ApiBindings = {
      ENVIRONMENT: 'staging',
      DB: {} as D1Database,
      ASSETS: {} as R2Bucket,
    };

    const res = await api.request('http://localhost:8787/api/health', {}, env);
    expect(res.status).toBe(200);
    const json = ApiHealthResponseSchema.parse(await res.json());
    expect(json.environment).toBe('staging');
    expect(json.bindings).toEqual({ d1: true, r2: true });
  });

  it('returns ecosystem metadata on GET /api/ecosystem', async () => {
    const api = createApiApp();
    const res = await api.request('http://localhost:8787/api/ecosystem');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      data: { edexcelMathsSuite: { unitCount: number; cashInAwards: unknown[] } };
    };
    expect(body.ok).toBe(true);
    expect(body.data.edexcelMathsSuite.unitCount).toBe(14);
    expect(body.data.edexcelMathsSuite.cashInAwards).toHaveLength(4);
  });

  it('enforces CORS allowlist for local dev and *.the-ants.org subdomains', async () => {
    const api = createApiApp();

    const allowedLocal = await api.request('http://localhost:8787/api/health', {
      headers: { Origin: 'http://localhost:3001' },
    });
    expect(allowedLocal.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:3001'
    );
    expect(allowedLocal.headers.get('access-control-allow-credentials')).toBe('true');

    const allowedProd = await api.request('http://localhost:8787/api/health', {
      headers: { Origin: 'https://flow.the-ants.org' },
    });
    expect(allowedProd.headers.get('access-control-allow-origin')).toBe(
      'https://flow.the-ants.org'
    );

    const rejectedOrigin = await api.request('http://localhost:8787/api/health', {
      headers: { Origin: 'https://evil.example.com' },
    });
    expect(rejectedOrigin.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns structured ApiErrorResponse on unknown routes', async () => {
    const api = createApiApp();
    const res = await api.request('http://localhost:8787/api/does-not-exist');
    expect(res.status).toBe(404);
    const json = ApiErrorResponseSchema.parse(await res.json());
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('executes scheduled cron tick cleanly', async () => {
    const tick = await runScheduledTick(
      { cron: '*/5 * * * *', scheduledTime: Date.UTC(2026, 10, 21, 15, 0, 0) },
      { DB: {} as D1Database }
    );
    expect(tick.ok).toBe(true);
    expect(tick.cron).toBe('*/5 * * * *');
    expect(tick.d1Ready).toBe(true);
    expect(tick.processedCount).toBe(0);
  });
});
