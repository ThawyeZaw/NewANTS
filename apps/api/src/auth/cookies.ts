import type {
  AuthProfileSummaryDto,
  AuthSessionBundle,
  AuthSessionDto,
  AuthUserDto,
} from '@ants/shared-types';
import { signSessionToken, verifySignedSessionToken } from './crypto';

export const BETTER_AUTH_SESSION_COOKIE_NAME = 'better-auth.session_token';
export const ANTS_SSO_COOKIE_NAME = 'ants_sso_session';
export const SESSION_TTL_REMEMBER_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_TTL_SHORT_SECONDS = 60 * 60 * 12;

export interface CookiePolicy {
  domain: '.the-ants.org' | null;
  secure: boolean;
  sameSite: 'Lax' | 'None';
  path: '/';
}

function extractHostname(rawUrl?: string): string {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Resolves cross-subdomain cookie attributes:
 * - Cloudflare `*.workers.dev` beta origins: host-only `Secure; SameSite=None` (`.workers.dev` is a Public Suffix)
 * - Production (`COOKIE_DOMAIN=.the-ants.org` or `*.the-ants.org` request): `Domain=.the-ants.org; Secure; SameSite=Lax`
 * - Local development (`localhost` / `127.0.0.1`): host-only `SameSite=Lax` (no `Domain`, no `Secure`)
 */
export function resolveCookiePolicy(cookieDomainEnv?: string, requestUrl?: string): CookiePolicy {
  const normalizedEnv = cookieDomainEnv?.trim().toLowerCase() ?? '';
  const hostname = extractHostname(requestUrl);

  const isLocalHost =
    normalizedEnv === 'localhost' ||
    normalizedEnv === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (isLocalHost) {
    return {
      domain: null,
      secure: false,
      sameSite: 'Lax',
      path: '/',
    };
  }

  if (hostname.endsWith('.workers.dev')) {
    return {
      domain: null,
      secure: true,
      sameSite: 'None',
      path: '/',
    };
  }

  const isProdDomain =
    normalizedEnv === '.the-ants.org' ||
    normalizedEnv === 'the-ants.org' ||
    (!normalizedEnv &&
      (hostname === 'the-ants.org' || hostname.endsWith('.the-ants.org')));

  return {
    domain: isProdDomain ? '.the-ants.org' : null,
    secure: isProdDomain,
    sameSite: 'Lax',
    path: '/',
  };
}

function formatSetCookieAttributeSuffix(policy: CookiePolicy, maxAgeSeconds: number, httpOnly: boolean): string {
  const parts = [`Path=${policy.path}`, `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`];
  if (policy.domain) {
    parts.push(`Domain=${policy.domain}`);
  }
  if (httpOnly) {
    parts.push('HttpOnly');
  }
  if (policy.secure) {
    parts.push('Secure');
  }
  parts.push(`SameSite=${policy.sameSite}`);
  return parts.join('; ');
}

function buildSsoBridgePayload(bundle: AuthSessionBundle, rememberMe: boolean): string {
  const { user, session, profile } = bundle;
  const payload = {
    version: 1 as const,
    status: 'authenticated' as const,
    username: profile.username,
    authMethod: 'email' as const,
    rememberMe,
    signedInAtIso: session.createdAt,
    user: {
      id: user.id,
      name: user.name,
      username: profile.username,
      email: user.email,
      role: user.role,
      roles: user.roles,
      xp: profile.xp,
      streakDays: profile.streakDays,
      telegramConnected: profile.telegramStatus === 'connected' || profile.telegramStatus === 'linked',
      curriculumLabel: profile.curriculumLabel,
    },
    customProfile: {
      id: profile.id,
      name: profile.displayName,
      username: profile.username,
      email: user.email,
      headline: profile.headline,
      curriculumLabel: profile.curriculumLabel,
      preferredApp: profile.preferredApp,
      role: profile.role,
      roles: profile.roles,
    },
  };
  return encodeURIComponent(JSON.stringify(payload));
}

export interface BuildAuthCookiesOptions {
  rawToken: string;
  secret: string;
  maxAgeSeconds: number;
  rememberMe: boolean;
  user: AuthUserDto;
  session: AuthSessionDto;
  profile: AuthProfileSummaryDto;
  policy: CookiePolicy;
}

/**
 * Builds both cross-subdomain `Set-Cookie` headers:
 * 1. `better-auth.session_token` (`HttpOnly`, HMAC-SHA256 signed token)
 * 2. `ants_sso_session` (readable JSON bridge cookie compatible with `@ants/ui`)
 */
export async function buildAuthSetCookieHeaders(
  options: BuildAuthCookiesOptions
): Promise<[string, string]> {
  const signedToken = await signSessionToken(options.rawToken, options.secret);
  const authCookieValue = encodeURIComponent(signedToken);
  const authAttrs = formatSetCookieAttributeSuffix(options.policy, options.maxAgeSeconds, true);
  const betterAuthCookie = `${BETTER_AUTH_SESSION_COOKIE_NAME}=${authCookieValue}; ${authAttrs}`;

  const bridgeValue = buildSsoBridgePayload(
    {
      user: options.user,
      session: options.session,
      profile: options.profile,
    },
    options.rememberMe
  );
  const bridgeAttrs = formatSetCookieAttributeSuffix(options.policy, options.maxAgeSeconds, false);
  const ssoBridgeCookie = `${ANTS_SSO_COOKIE_NAME}=${bridgeValue}; ${bridgeAttrs}`;

  return [betterAuthCookie, ssoBridgeCookie];
}

/**
 * Builds clearing `Set-Cookie` headers (`Max-Age=0`) for both SSO cookies on sign-out.
 */
export function buildClearAuthSetCookieHeaders(policy: CookiePolicy): [string, string] {
  const authAttrs = formatSetCookieAttributeSuffix(policy, 0, true);
  const bridgeAttrs = formatSetCookieAttributeSuffix(policy, 0, false);
  return [
    `${BETTER_AUTH_SESSION_COOKIE_NAME}=; ${authAttrs}`,
    `${ANTS_SSO_COOKIE_NAME}=; ${bridgeAttrs}`,
  ];
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;

  const segments = cookieHeader.split(';');
  for (const segment of segments) {
    const eqIndex = segment.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = segment.slice(0, eqIndex).trim();
    const rawValue = segment.slice(eqIndex + 1).trim();
    if (!name) continue;
    try {
      map.set(name, decodeURIComponent(rawValue));
    } catch {
      map.set(name, rawValue);
    }
  }
  return map;
}

/**
 * Extracts and verifies the raw session token from either the signed
 * `better-auth.session_token` cookie or an `Authorization: Bearer <token>` header.
 */
export async function extractSessionTokenFromRequest(
  request: Request,
  secret: string
): Promise<string | null> {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const signedCookieValue = cookies.get(BETTER_AUTH_SESSION_COOKIE_NAME);
  if (signedCookieValue) {
    const verified = await verifySignedSessionToken(signedCookieValue, secret);
    if (verified) {
      return verified;
    }
  }

  const authorization = request.headers.get('authorization');
  if (authorization) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
    const bearerToken = match?.[1];
    if (bearerToken) {
      if (bearerToken.includes('.')) {
        return verifySignedSessionToken(bearerToken, secret);
      }
      return bearerToken;
    }
  }

  return null;
}
