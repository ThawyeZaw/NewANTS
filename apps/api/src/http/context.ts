import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { Context } from 'hono';
import {
  ApiErrorResponseSchema,
  type AuthSessionBundle,
} from '@ants/shared-types';
import { extractSessionTokenFromRequest } from '../auth/cookies';
import { resolveAuthSecret } from '../auth/crypto';
import { getSessionByToken } from '../auth/service';
import type { ApiBindings } from '../types';

export type ApiRouteContext = Context<{ Bindings: ApiBindings }>;

export function jsonApiError(
  c: ApiRouteContext,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 500 | 503,
  code: string,
  message: string,
  details?: unknown
) {
  const payload = ApiErrorResponseSchema.parse({
    ok: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
  return c.json(payload, status);
}

export function getD1Binding(c: ApiRouteContext): D1Database | Response {
  const db = c.env?.DB;
  if (!db) {
    return jsonApiError(
      c,
      503,
      'SERVICE_UNAVAILABLE',
      'Database binding DB is not configured for @ants/api.'
    );
  }
  return db;
}

export function getR2Binding(c: ApiRouteContext): R2Bucket | Response {
  const bucket = c.env?.ASSETS;
  if (!bucket) {
    return jsonApiError(
      c,
      503,
      'SERVICE_UNAVAILABLE',
      'R2 bucket binding ASSETS is not configured for @ants/api.'
    );
  }
  return bucket;
}

export async function parseJsonBody(c: ApiRouteContext): Promise<unknown | Response> {
  try {
    return await c.req.json();
  } catch {
    return jsonApiError(c, 400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

export async function resolveOptionalSession(
  c: ApiRouteContext,
  db: D1Database | undefined
): Promise<AuthSessionBundle | null> {
  if (!db) return null;
  const secret = resolveAuthSecret(c.env?.BETTER_AUTH_SECRET);
  const rawToken = await extractSessionTokenFromRequest(c.req.raw, secret);
  if (!rawToken) return null;
  return getSessionByToken(db, rawToken);
}

export async function requireAuthenticatedSession(
  c: ApiRouteContext
): Promise<{ db: D1Database; session: AuthSessionBundle } | Response> {
  const db = getD1Binding(c);
  if (db instanceof Response) return db;

  const session = await resolveOptionalSession(c, db);
  if (!session) {
    return jsonApiError(
      c,
      401,
      'UNAUTHORIZED',
      'Active session required. Sign in across study.the-ants.org or flow.the-ants.org first.'
    );
  }

  return { db, session };
}
