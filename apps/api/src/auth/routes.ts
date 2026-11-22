import type { D1Database } from '@cloudflare/workers-types';
import { Hono, type Context } from 'hono';
import {
  ApiErrorResponseSchema,
  AuthSignInEmailInputSchema,
  AuthSignUpInputSchema,
} from '@ants/shared-types';
import type { ApiBindings } from '../types';
import {
  buildAuthSetCookieHeaders,
  buildClearAuthSetCookieHeaders,
  extractSessionTokenFromRequest,
  resolveCookiePolicy,
} from './cookies';
import { resolveAuthSecret } from './crypto';
import {
  AuthServiceError,
  getSessionByToken,
  signInWithEmail,
  signOutByToken,
  signUpWithEmail,
  type RequestClientMeta,
} from './service';

type AuthContext = Context<{ Bindings: ApiBindings }>;

function jsonError(
  c: AuthContext,
  status: 400 | 401 | 403 | 409 | 500 | 503,
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

function getD1OrRespond(c: AuthContext): D1Database | Response {
  const db = c.env?.DB;
  if (!db) {
    return jsonError(
      c,
      503,
      'SERVICE_UNAVAILABLE',
      'Database binding DB is not configured for @ants/api.'
    );
  }
  return db;
}

async function parseJsonPayload(c: AuthContext): Promise<unknown | Response> {
  try {
    return await c.req.json();
  } catch {
    return jsonError(c, 400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

function readClientMeta(c: AuthContext): RequestClientMeta {
  const ipAddress =
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;
  const userAgent = c.req.header('user-agent') ?? null;
  return { ipAddress, userAgent };
}

function handleAuthError(c: AuthContext, err: unknown): Response {
  if (err instanceof AuthServiceError) {
    return jsonError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected authentication failure.';
  return jsonError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Hono router implementing `/api/auth/*` endpoints with Better Auth compatible
 * `.the-ants.org` / `localhost` dual-cookie SSO and D1 profile provisioning.
 */
export function createAuthRouter(): Hono<{ Bindings: ApiBindings }> {
  const auth = new Hono<{ Bindings: ApiBindings }>();

  auth.post('/sign-up/email', async (c) => {
    const db = getD1OrRespond(c);
    if (db instanceof Response) return db;

    const rawBody = await parseJsonPayload(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AuthSignUpInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMessage = parsed.error.issues[0]?.message ?? 'Invalid sign-up fields.';
      return jsonError(c, 400, 'VALIDATION_ERROR', firstMessage, parsed.error.flatten());
    }

    try {
      const result = await signUpWithEmail(db, parsed.data, readClientMeta(c));
      const secret = resolveAuthSecret(c.env?.BETTER_AUTH_SECRET);
      const policy = resolveCookiePolicy(c.env?.COOKIE_DOMAIN, c.req.url);
      const cookies = await buildAuthSetCookieHeaders({
        rawToken: result.rawToken,
        secret,
        maxAgeSeconds: result.maxAgeSeconds,
        rememberMe: result.rememberMe,
        user: result.user,
        session: result.session,
        profile: result.profile,
        policy,
      });

      for (const cookieHeader of cookies) {
        c.header('Set-Cookie', cookieHeader, { append: true });
      }

      return c.json(
        {
          ok: true as const,
          data: {
            user: result.user,
            session: result.session,
            profile: result.profile,
          },
          user: result.user,
          session: result.session,
        },
        201
      );
    } catch (err) {
      return handleAuthError(c, err);
    }
  });

  auth.post('/sign-in/email', async (c) => {
    const db = getD1OrRespond(c);
    if (db instanceof Response) return db;

    const rawBody = await parseJsonPayload(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AuthSignInEmailInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMessage = parsed.error.issues[0]?.message ?? 'Enter a valid email and password.';
      return jsonError(c, 400, 'VALIDATION_ERROR', firstMessage, parsed.error.flatten());
    }

    try {
      const result = await signInWithEmail(db, parsed.data, readClientMeta(c));
      const secret = resolveAuthSecret(c.env?.BETTER_AUTH_SECRET);
      const policy = resolveCookiePolicy(c.env?.COOKIE_DOMAIN, c.req.url);
      const cookies = await buildAuthSetCookieHeaders({
        rawToken: result.rawToken,
        secret,
        maxAgeSeconds: result.maxAgeSeconds,
        rememberMe: result.rememberMe,
        user: result.user,
        session: result.session,
        profile: result.profile,
        policy,
      });

      for (const cookieHeader of cookies) {
        c.header('Set-Cookie', cookieHeader, { append: true });
      }

      return c.json(
        {
          ok: true as const,
          data: {
            user: result.user,
            session: result.session,
            profile: result.profile,
          },
          user: result.user,
          session: result.session,
        },
        200
      );
    } catch (err) {
      return handleAuthError(c, err);
    }
  });

  const handleGetSession = async (c: AuthContext) => {
    const db = getD1OrRespond(c);
    if (db instanceof Response) return db;

    try {
      const secret = resolveAuthSecret(c.env?.BETTER_AUTH_SECRET);
      const rawToken = await extractSessionTokenFromRequest(c.req.raw, secret);
      const bundle = rawToken ? await getSessionByToken(db, rawToken) : null;

      return c.json(
        {
          ok: true as const,
          data: bundle,
          user: bundle?.user ?? null,
          session: bundle?.session ?? null,
        },
        200
      );
    } catch (err) {
      return handleAuthError(c, err);
    }
  };

  auth.get('/get-session', handleGetSession);
  auth.get('/session', handleGetSession);

  auth.post('/sign-out', async (c) => {
    const db = getD1OrRespond(c);
    if (db instanceof Response) return db;

    try {
      const secret = resolveAuthSecret(c.env?.BETTER_AUTH_SECRET);
      const rawToken = await extractSessionTokenFromRequest(c.req.raw, secret);
      await signOutByToken(db, rawToken);

      const policy = resolveCookiePolicy(c.env?.COOKIE_DOMAIN, c.req.url);
      const clearCookies = buildClearAuthSetCookieHeaders(policy);
      for (const cookieHeader of clearCookies) {
        c.header('Set-Cookie', cookieHeader, { append: true });
      }

      return c.json(
        {
          ok: true as const,
          data: { signedOut: true as const },
        },
        200
      );
    } catch (err) {
      return handleAuthError(c, err);
    }
  });

  return auth;
}
