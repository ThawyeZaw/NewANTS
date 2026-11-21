import type { AuthSessionBundle, EcosystemAppId, UserRole } from '@ants/shared-types';
import { createAuthClient } from './client';
import { evaluateRouteAccess, type RouteAccessVerdict } from './guards';
import type { ResolveAppOriginOptions } from './redirects';

export const BETTER_AUTH_COOKIE_NAME = 'better-auth.session_token';

export interface CookieStoreLike {
  get: (name: string) => { value: string } | undefined;
  getAll?: () => Array<{ name: string; value: string }>;
  toString?: () => string;
}

export type CookieHeaderSource =
  | string
  | Headers
  | Request
  | CookieStoreLike
  | null
  | undefined;

export interface GetServerSessionOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  authorization?: string | null;
  currentHostname?: string;
}

export interface EvaluateServerRouteAccessOptions extends ResolveAppOriginOptions {
  app: EcosystemAppId;
  pathname: string;
  requireAuth?: boolean;
  allowedRoles?: readonly UserRole[];
  minRole?: UserRole;
  authApp?: 'flow' | 'study';
}

function isRequestLike(value: unknown): value is Request {
  return (
    typeof value === 'object' &&
    value !== null &&
    'headers' in value &&
    typeof (value as Request).headers?.get === 'function'
  );
}

/**
 * Extracts a normalized HTTP `Cookie` header string from a raw cookie string,
 * Fetch `Headers`, `Request`, or Next.js `cookies()` store.
 */
export function extractCookieHeader(source: CookieHeaderSource): string | null {
  if (!source) return null;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (isRequestLike(source)) {
    const header = source.headers.get('cookie')?.trim() ?? '';
    return header.length > 0 ? header : null;
  }

  if (typeof (source as CookieStoreLike).getAll === 'function') {
    const entries = (source as CookieStoreLike).getAll?.() ?? [];
    if (entries.length === 0) return null;
    return entries.map((entry) => `${entry.name}=${entry.value}`).join('; ');
  }

  if (typeof (source as Headers).get === 'function') {
    const raw = (source as Headers).get('cookie');
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    const tokenObj = (source as CookieStoreLike).get(BETTER_AUTH_COOKIE_NAME);
    if (tokenObj && typeof tokenObj.value === 'string' && tokenObj.value.length > 0) {
      return `${BETTER_AUTH_COOKIE_NAME}=${tokenObj.value}`;
    }
  }

  return null;
}

function extractAuthorizationHeader(
  source: CookieHeaderSource,
  explicitAuthorization?: string | null
): string | null {
  if (explicitAuthorization && explicitAuthorization.trim().length > 0) {
    return explicitAuthorization.trim();
  }
  if (isRequestLike(source)) {
    const auth = source.headers.get('authorization')?.trim() ?? '';
    return auth.length > 0 ? auth : null;
  }
  if (
    typeof source === 'object' &&
    source !== null &&
    typeof (source as Headers).get === 'function' &&
    typeof (source as CookieStoreLike).getAll !== 'function'
  ) {
    const auth = (source as Headers).get('authorization');
    if (typeof auth === 'string' && auth.trim().length > 0) {
      return auth.trim();
    }
  }
  return null;
}

function hasSessionTokenCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return new RegExp(`(?:^|;\\s*)${BETTER_AUTH_COOKIE_NAME.replace(/\./g, '\\.')}=[^;]+`).test(
    cookieHeader
  );
}

/**
 * Resolves the active session bundle on the server (Next.js Server Components,
 * Server Actions, or Middleware) by forwarding cookies to `@ants/api`.
 */
export async function getServerSession(
  cookieSource: CookieHeaderSource,
  options: GetServerSessionOptions = {}
): Promise<AuthSessionBundle | null> {
  const cookieHeader = extractCookieHeader(cookieSource);
  const authHeader = extractAuthorizationHeader(cookieSource, options.authorization);

  if (!hasSessionTokenCookie(cookieHeader) && !authHeader) {
    return null;
  }

  const forwardedHeaders = new Headers();
  if (cookieHeader) {
    forwardedHeaders.set('Cookie', cookieHeader);
  }
  if (authHeader) {
    forwardedHeaders.set('Authorization', authHeader);
  }

  const client = createAuthClient({
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl,
  });

  const result = await client.getSession({ headers: forwardedHeaders });
  if (!result.ok) {
    return null;
  }
  return result.data;
}

/**
 * Evaluates Access Matrix and role guards inside Next.js Server Components or Middleware.
 */
export function evaluateServerRouteAccess(
  session: AuthSessionBundle | null,
  options: EvaluateServerRouteAccessOptions
): RouteAccessVerdict {
  return evaluateRouteAccess({
    status: session ? 'authenticated' : 'unauthenticated',
    user: session?.user ?? null,
    app: options.app,
    pathname: options.pathname,
    requireAuth: options.requireAuth,
    allowedRoles: options.allowedRoles,
    minRole: options.minRole,
    authApp: options.authApp,
    currentHostname: options.currentHostname,
    envOverrides: options.envOverrides,
  });
}
