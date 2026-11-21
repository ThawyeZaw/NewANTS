import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import {
  ApiErrorResponseSchema,
  ApiHealthResponseSchema,
  ECOSYSTEM_APP_LIST,
  EDEXCEL_MATHS_CASH_IN_DEFINITIONS,
  EDEXCEL_MATHS_UNITS,
  USER_ROLES,
  isAllowedCorsOrigin,
} from '@ants/shared-types';
import { createAuthRouter } from './auth/routes';
import { processDueNotificationQueue } from './cron/notification-runner';
import { createStorageRouter } from './storage/routes';
import { createTelegramRouter } from './telegram/routes';
import type { ApiBindings, ScheduledTickResult } from './types';

export type { ApiBindings, ScheduledTickResult } from './types';
export type { CookiePolicy, BuildAuthCookiesOptions } from './auth/cookies';
export type { AuthMutationResult, RequestClientMeta } from './auth/service';
export type {
  NotificationQueueBatchSummary,
  ProcessNotificationItemResult,
} from './cron/notification-runner';
export type { ParsedStorageKey } from './storage/service';
export type { TelegramWebhookProcessResult } from './telegram/service';

const API_VERSION = '0.1.0';
const CRON_SCHEDULE = '*/5 * * * *' as const;

export function createApiApp() {
  const app = new Hono<{ Bindings: ApiBindings }>();

  app.use(
    '*',
    cors({
      origin: (origin) => (isAllowedCorsOrigin(origin) ? origin : ''),
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
      credentials: true,
    })
  );

  const buildHealthPayload = (env?: ApiBindings) =>
    ApiHealthResponseSchema.parse({
      status: 'ok',
      service: '@ants/api',
      version: API_VERSION,
      environment: env?.ENVIRONMENT ?? 'development',
      timestamp: new Date().toISOString(),
      cronSchedule: CRON_SCHEDULE,
      bindings: {
        d1: Boolean(env?.DB),
        r2: Boolean(env?.ASSETS),
      },
      apps: [...ECOSYSTEM_APP_LIST],
    });

  app.get('/', (c) => c.json(buildHealthPayload(c.env), 200));

  app.get('/api/health', (c) => c.json(buildHealthPayload(c.env), 200));

  app.get('/api/ecosystem', (c) =>
    c.json(
      {
        ok: true as const,
        data: {
          service: '@ants/api',
          version: API_VERSION,
          apps: ECOSYSTEM_APP_LIST,
          roles: USER_ROLES,
          edexcelMathsSuite: {
            unitCount: EDEXCEL_MATHS_UNITS.length,
            cashInAwards: Object.values(EDEXCEL_MATHS_CASH_IN_DEFINITIONS),
          },
        },
      },
      200
    )
  );

  app.route('/api/auth', createAuthRouter());
  app.route('/api/storage', createStorageRouter());
  app.route('/api/telegram', createTelegramRouter());

  app.notFound((c) => {
    const payload = ApiErrorResponseSchema.parse({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} was not found on @ants/api.`,
      },
    });
    return c.json(payload, 404);
  });

  app.onError((err, c) => {
    const status = err instanceof HTTPException ? err.status : 500;
    const payload = ApiErrorResponseSchema.parse({
      ok: false,
      error: {
        code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message: err.message || 'Unexpected error occurred in @ants/api.',
      },
    });
    return c.json(payload, status);
  });

  return app;
}

export const app = createApiApp();

/**
 * Cloudflare Worker Cron handler (every 5 minutes).
 * Drains due rows from D1 `notification_queue` when `env.DB` is bound.
 */
export async function runScheduledTick(
  controller: Pick<ScheduledController, 'cron' | 'scheduledTime'>,
  env: ApiBindings,
  _ctx?: ExecutionContext,
  options?: { fetchImpl?: typeof fetch; nowIso?: string }
): Promise<ScheduledTickResult> {
  const scheduledTimeIso =
    options?.nowIso ?? new Date(controller.scheduledTime || Date.now()).toISOString();
  const d1Ready = Boolean(env?.DB);

  if (env?.DB && typeof env.DB.prepare === 'function') {
    const summary = await processDueNotificationQueue(env.DB, env, {
      nowIso: scheduledTimeIso,
      fetchImpl: options?.fetchImpl,
    });
    return {
      ok: true,
      cron: controller.cron || CRON_SCHEDULE,
      scheduledTimeIso,
      d1Ready,
      ...summary,
    };
  }

  return {
    ok: true,
    cron: controller.cron || CRON_SCHEDULE,
    scheduledTimeIso,
    d1Ready,
    processedCount: 0,
    sentCount: 0,
    failedCount: 0,
    retryingCount: 0,
    cancelledCount: 0,
    simulatedCount: 0,
  };
}

export async function scheduled(
  controller: ScheduledController,
  env: ApiBindings,
  ctx: ExecutionContext
): Promise<void> {
  const result = await runScheduledTick(controller, env, ctx);
  console.info('[ants-api:cron]', JSON.stringify(result));
}

export default {
  fetch: app.fetch,
  scheduled,
};
