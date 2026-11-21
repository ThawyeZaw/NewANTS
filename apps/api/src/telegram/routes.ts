import { Hono } from 'hono';
import {
  TelegramLinkStartInputSchema,
  TelegramPreferencesUpdateInputSchema,
  TelegramTestPingInputSchema,
  TelegramWebhookUpdateSchema,
} from '@ants/shared-types';
import {
  getD1Binding,
  jsonApiError,
  parseJsonBody,
  requireAuthenticatedSession,
  type ApiRouteContext,
} from '../http/context';
import type { ApiBindings } from '../types';
import {
  TelegramServiceError,
  getTelegramStatusForUser,
  handleTelegramWebhookUpdate,
  sendTelegramTestPingForUser,
  startTelegramLinkForUser,
  unlinkTelegramForUser,
  updateTelegramPreferencesForUser,
} from './service';

function handleTelegramError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof TelegramServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected Telegram integration error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

async function parseOptionalJsonObject(c: ApiRouteContext): Promise<unknown | Response> {
  const rawText = await c.req.text();
  if (!rawText.trim()) {
    return {};
  }
  try {
    return JSON.parse(rawText);
  } catch {
    return jsonApiError(c, 400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hono router implementing `/api/telegram/*` webhook, linking, preferences & test-ping endpoints.
 */
export function createTelegramRouter(): Hono<{ Bindings: ApiBindings }> {
  const telegram = new Hono<{ Bindings: ApiBindings }>();

  telegram.post('/webhook', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    const configuredSecret = c.env?.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (configuredSecret) {
      const incomingSecret = c.req.header('x-telegram-bot-api-secret-token')?.trim() ?? '';
      if (!timingSafeStringEqual(incomingSecret, configuredSecret)) {
        return jsonApiError(
          c,
          401,
          'INVALID_WEBHOOK_SECRET',
          'Missing or invalid X-Telegram-Bot-Api-Secret-Token header.'
        );
      }
    }

    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = TelegramWebhookUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? 'Invalid Telegram webhook update.';
      return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
    }

    try {
      const result = await handleTelegramWebhookUpdate(db, c.env ?? {}, parsed.data);
      return c.json(
        {
          ok: true as const,
          data: result,
        },
        200
      );
    } catch (err) {
      return handleTelegramError(c, err);
    }
  });

  telegram.get('/status', async (c) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    try {
      const status = await getTelegramStatusForUser(
        authResult.db,
        authResult.session.user.id,
        c.env
      );
      return c.json(
        {
          ok: true as const,
          data: status,
        },
        200
      );
    } catch (err) {
      return handleTelegramError(c, err);
    }
  });

  telegram.post('/link/start', async (c) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    const rawBody = await parseOptionalJsonObject(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = TelegramLinkStartInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? 'Invalid link start payload.';
      return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
    }

    try {
      const status = await startTelegramLinkForUser(
        authResult.db,
        authResult.session.user.id,
        parsed.data,
        c.env
      );
      return c.json(
        {
          ok: true as const,
          data: status,
        },
        200
      );
    } catch (err) {
      return handleTelegramError(c, err);
    }
  });

  const handleUpdatePreferences = async (c: ApiRouteContext) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = TelegramPreferencesUpdateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? 'Invalid notification preferences.';
      return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
    }

    try {
      const status = await updateTelegramPreferencesForUser(
        authResult.db,
        authResult.session.user.id,
        parsed.data,
        c.env
      );
      return c.json(
        {
          ok: true as const,
          data: status,
        },
        200
      );
    } catch (err) {
      return handleTelegramError(c, err);
    }
  };

  telegram.put('/preferences', handleUpdatePreferences);
  telegram.patch('/preferences', handleUpdatePreferences);

  telegram.post('/test-ping', async (c) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    const rawBody = await parseOptionalJsonObject(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = TelegramTestPingInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? 'Invalid test ping payload.';
      return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
    }

    try {
      const result = await sendTelegramTestPingForUser(
        authResult.db,
        c.env ?? {},
        authResult.session.user.id,
        parsed.data
      );
      return c.json(
        {
          ok: true as const,
          data: result,
        },
        200
      );
    } catch (err) {
      return handleTelegramError(c, err);
    }
  });

  telegram.post('/unlink', async (c) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    try {
      const status = await unlinkTelegramForUser(
        authResult.db,
        authResult.session.user.id,
        c.env
      );
      return c.json(
        {
          ok: true as const,
          data: status,
        },
        200
      );
    } catch (err) {
      return handleTelegramError(c, err);
    }
  });

  return telegram;
}
