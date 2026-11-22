// @ants/auth-client — Shared Cross-Subdomain SSO Client, useSession, useRole & Route Guards

export {
  DEFAULT_LOCAL_API_URL,
  DEFAULT_PROD_API_URL,
  buildCrossSubdomainAppUrl,
  buildCrossSubdomainLoginUrl,
  isLocalHostname,
  isProductionEcosystemHost,
  isTrustedEcosystemOrigin,
  resolveApiBaseUrl,
  resolveAppOrigin,
  resolvePostAuthRedirect,
  sanitizeRedirectTarget,
  type BuildCrossSubdomainLoginUrlOptions,
  type ResolveAppOriginOptions,
  type ResolvePostAuthRedirectOptions,
  type SanitizeRedirectOptions,
} from './redirects';

export {
  ANTS_AUTH_CLIENT_EVENT,
  authClient,
  createAuthClient,
  type AntsAuthClient,
  type AuthApiError,
  type AuthApiResult,
  type AuthClientConfig,
  type GetSessionRequestOptions,
} from './client';

export {
  computeRoleCapabilities,
  evaluateRouteAccess,
  getEcosystemRouteRequirement,
  type EcosystemRouteRequirement,
  type EvaluateRouteAccessOptions,
  type RoleCapabilities,
  type RouteAccessStatus,
  type RouteAccessVerdict,
  type SessionStatus,
} from './guards';

export {
  BETTER_AUTH_COOKIE_NAME,
  evaluateServerRouteAccess,
  extractCookieHeader,
  getServerSession,
  type CookieHeaderSource,
  type CookieStoreLike,
  type EvaluateServerRouteAccessOptions,
  type GetServerSessionOptions,
} from './server';

export {
  AuthGuard,
  AuthProvider,
  useRole,
  useSession,
  type AuthContextValue,
  type AuthGuardProps,
  type AuthProviderProps,
  type UseSessionOptions,
} from './provider';
