import { Hono } from 'hono';
import { AccountProfileUpdateInputSchema } from '@ants/shared-types';
import {
  getD1Binding,
  jsonApiError,
  parseJsonBody,
  requireAuthenticatedSession,
  resolveOptionalSession,
  type ApiRouteContext,
} from '../http/context';
import type { ApiBindings } from '../types';
import {
  AccountServiceError,
  loadMyAccountProfile,
  loadPublicAccountProfile,
  updateMyAccountProfile,
} from './service';

function handleAccountError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof AccountServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected account API error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Hono router implementing `/api/account/*` profile, tutor schedule, and public `/@[username]`
 * endpoints (`[THAW-3.4]`).
 */
export function createAccountRouter(): Hono<{ Bindings: ApiBindings }> {
  const account = new Hono<{ Bindings: ApiBindings }>();

  account.get('/me', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const profile = await loadMyAccountProfile(
        auth.db,
        auth.session.user.id,
        c.env
      );
      return c.json({ ok: true as const, data: profile }, 200);
    } catch (err) {
      return handleAccountError(c, err);
    }
  });

  account.put('/me', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AccountProfileUpdateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid profile update payload.',
        parsed.error.flatten()
      );
    }

    try {
      const profile = await updateMyAccountProfile(
        auth.db,
        auth.session.user.id,
        parsed.data,
        c.env
      );
      return c.json({ ok: true as const, data: profile }, 200);
    } catch (err) {
      return handleAccountError(c, err);
    }
  });

  account.get('/profiles/:username', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;
    const username = c.req.param('username') ?? '';
    try {
      const session = await resolveOptionalSession(c, db);
      const data = await loadPublicAccountProfile(
        db,
        username,
        session?.user.id,
        c.env
      );
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleAccountError(c, err);
    }
  });

  return account;
}
