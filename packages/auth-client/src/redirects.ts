import {
  ECOSYSTEM_APPS,
  isAllowedCorsOrigin,
  type EcosystemAppId,
} from '@ants/shared-types';

export const DEFAULT_LOCAL_API_URL = 'http://localhost:8787';
export const DEFAULT_PROD_API_URL = 'https://api.the-ants.org';
export const BETA_WORKERS_DEV_HOST_SUFFIX = '.thawyezaw.workers.dev';
export const DEFAULT_BETA_API_URL = 'https://ants-api.thawyezaw.workers.dev';
export const BETA_APP_URLS: Record<EcosystemAppId, string> = {
  org: 'https://ants-org.thawyezaw.workers.dev',
  study: 'https://ants-study.thawyezaw.workers.dev',
  flow: 'https://ants-flow.thawyezaw.workers.dev',
};

const AUTH_LOOP_PATHS = new Set(['/login', '/signup']);

const APP_ENV_KEYS: Record<EcosystemAppId, string> = {
  org: 'NEXT_PUBLIC_ORG_URL',
  study: 'NEXT_PUBLIC_STUDY_URL',
  flow: 'NEXT_PUBLIC_FLOW_URL',
};

export interface ResolveAppOriginOptions {
  currentHostname?: string;
  envOverrides?: Partial<Record<EcosystemAppId, string>>;
}

export interface SanitizeRedirectOptions {
  fallback?: string;
  allowTrustedOrigins?: boolean;
}

export interface BuildCrossSubdomainLoginUrlOptions extends ResolveAppOriginOptions {
  fromApp: EcosystemAppId;
  targetPath?: string;
  authApp?: 'flow' | 'study';
  mode?: 'login' | 'signup';
  relativeIfSameApp?: boolean;
}

export interface ResolvePostAuthRedirectOptions extends ResolveAppOriginOptions {
  rawRedirect?: string | null;
  currentApp: EcosystemAppId;
  preferredApp?: 'flow' | 'study';
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function readPublicEnv(key: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function resolveRuntimeHostname(explicitHostname?: string): string {
  if (explicitHostname && explicitHostname.trim().length > 0) {
    return explicitHostname.trim().toLowerCase();
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname.toLowerCase();
  }
  return '';
}

function isAuthLoopPathname(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  return AUTH_LOOP_PATHS.has(normalized);
}

export function isLocalHostname(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '[::1]' ||
    clean === '::1' ||
    clean.endsWith('.localhost')
  );
}

export function isProductionEcosystemHost(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  return clean === 'the-ants.org' || clean.endsWith('.the-ants.org');
}

export function isBetaWorkersDevHost(hostname: string): boolean {
  const clean = hostname.trim().toLowerCase();
  return clean.endsWith(BETA_WORKERS_DEV_HOST_SUFFIX);
}

/**
 * Resolves the canonical `@ants/api` base URL for browser and SSR requests.
 */
export function resolveApiBaseUrl(explicitBaseUrl?: string, runtimeHostname?: string): string {
  if (explicitBaseUrl && explicitBaseUrl.trim().length > 0) {
    return stripTrailingSlash(explicitBaseUrl.trim());
  }

  const envApiUrl = readPublicEnv('NEXT_PUBLIC_API_URL');
  if (envApiUrl) {
    return stripTrailingSlash(envApiUrl);
  }

  const host = resolveRuntimeHostname(runtimeHostname);
  if (isProductionEcosystemHost(host)) {
    return DEFAULT_PROD_API_URL;
  }
  if (isBetaWorkersDevHost(host)) {
    return DEFAULT_BETA_API_URL;
  }
  return DEFAULT_LOCAL_API_URL;
}

/**
 * Resolves the origin (`https://...` or `http://localhost:...`) for any ecosystem app.
 */
export function resolveAppOrigin(app: EcosystemAppId, options?: ResolveAppOriginOptions): string {
  const override = options?.envOverrides?.[app];
  if (override && override.trim().length > 0) {
    return stripTrailingSlash(override.trim());
  }

  const envUrl = readPublicEnv(APP_ENV_KEYS[app]);
  if (envUrl) {
    return stripTrailingSlash(envUrl);
  }

  const host = resolveRuntimeHostname(options?.currentHostname);
  if (isProductionEcosystemHost(host)) {
    return stripTrailingSlash(ECOSYSTEM_APPS[app].prodUrl);
  }
  if (isBetaWorkersDevHost(host)) {
    return BETA_APP_URLS[app];
  }
  return stripTrailingSlash(ECOSYSTEM_APPS[app].localUrl);
}

export function isTrustedEcosystemOrigin(origin: string): boolean {
  return isAllowedCorsOrigin(origin);
}

/**
 * Validates and normalizes `?redirect=` targets, accepting safe relative paths
 * and trusted ANTs ecosystem origins (`*.the-ants.org`, localhost ports) while
 * rejecting external open redirects, dangerous schemes, and `/login` / `/signup` loops.
 */
export function sanitizeRedirectTarget(
  rawRedirect: string | null | undefined,
  options: SanitizeRedirectOptions = {}
): string {
  const fallback = options.fallback ?? '/';
  const allowTrustedOrigins = options.allowTrustedOrigins ?? true;

  if (!rawRedirect) {
    return fallback;
  }

  const trimmed = rawRedirect.trim();
  // eslint-disable-next-line no-control-regex
  if (!trimmed || /[\x00-\x1f]/.test(trimmed)) {
    return fallback;
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
      return fallback;
    }
    try {
      const parsed = new URL(trimmed, 'https://ants-redirect.local');
      if (isAuthLoopPathname(parsed.pathname)) {
        return fallback;
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return fallback;
    }
  }

  if (!allowTrustedOrigins) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallback;
    }
    if (!isTrustedEcosystemOrigin(parsed.origin)) {
      return fallback;
    }
    if (isAuthLoopPathname(parsed.pathname)) {
      return fallback;
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function buildCrossSubdomainAppUrl(
  targetApp: EcosystemAppId,
  pathname = '/',
  options?: ResolveAppOriginOptions
): string {
  const origin = resolveAppOrigin(targetApp, options);
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${origin}${normalizedPath}`;
}

/**
 * Constructs a cross-subdomain SSO `/login` or `/signup` URL pointing back to
 * `fromApp` + `targetPath` (for example `the-ants.org/admin` -> `flow.the-ants.org/login?redirect=...`).
 */
export function buildCrossSubdomainLoginUrl(options: BuildCrossSubdomainLoginUrlOptions): string {
  const mode = options.mode ?? 'login';
  const authApp = options.authApp ?? (options.fromApp === 'study' ? 'study' : 'flow');
  const routePath = `/${mode}`;

  const rawTarget = options.targetPath ?? '/';
  const sanitizedTarget = sanitizeRedirectTarget(rawTarget, {
    fallback: '/',
    allowTrustedOrigins: true,
  });

  if (options.fromApp === authApp) {
    const search =
      sanitizedTarget && sanitizedTarget !== '/'
        ? `?redirect=${encodeURIComponent(sanitizedTarget)}`
        : '';
    if (options.relativeIfSameApp) {
      return `${routePath}${search}`;
    }
    return `${resolveAppOrigin(authApp, options)}${routePath}${search}`;
  }

  const returnUrl = sanitizedTarget.startsWith('/')
    ? buildCrossSubdomainAppUrl(options.fromApp, sanitizedTarget, options)
    : sanitizedTarget;

  return `${resolveAppOrigin(authApp, options)}${routePath}?redirect=${encodeURIComponent(returnUrl)}`;
}

/**
 * Resolves the safe post-authentication destination honoring `?redirect=` first,
 * otherwise routing users to their active or preferred workspace (`Flow` vs `Study`).
 */
export function resolvePostAuthRedirect(options: ResolvePostAuthRedirectOptions): string {
  const defaultTarget =
    options.preferredApp && options.preferredApp !== options.currentApp
      ? buildCrossSubdomainAppUrl(options.preferredApp, '/', options)
      : '/';

  const candidate = options.rawRedirect?.trim();
  if (!candidate) {
    return defaultTarget;
  }

  return sanitizeRedirectTarget(candidate, {
    fallback: defaultTarget,
    allowTrustedOrigins: true,
  });
}
