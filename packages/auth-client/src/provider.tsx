'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AuthProfileSummaryDto,
  AuthSessionBundle,
  AuthSignInEmailInput,
  AuthSignUpInput,
  AuthUserDto,
  EcosystemAppId,
  UserRole,
} from '@ants/shared-types';
import {
  ANTS_AUTH_CLIENT_EVENT,
  createAuthClient,
  type AntsAuthClient,
  type AuthApiError,
  type AuthApiResult,
} from './client';
import {
  computeRoleCapabilities,
  evaluateRouteAccess,
  type RoleCapabilities,
  type RouteAccessVerdict,
  type SessionStatus,
} from './guards';

export interface AuthContextValue {
  session: AuthSessionBundle | null;
  user: AuthUserDto | null;
  profile: AuthProfileSummaryDto | null;
  status: SessionStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthApiError | null;
  refresh: () => Promise<AuthSessionBundle | null>;
  signInWithEmail: (input: AuthSignInEmailInput) => Promise<AuthApiResult<AuthSessionBundle>>;
  signUpWithEmail: (input: AuthSignUpInput) => Promise<AuthApiResult<AuthSessionBundle>>;
  signOut: () => Promise<AuthApiResult<{ signedOut: true }>>;
  setSession: (next: AuthSessionBundle | null) => void;
}

export interface AuthProviderProps {
  children?: React.ReactNode;
  initialSession?: AuthSessionBundle | null;
  apiBaseUrl?: string;
  client?: AntsAuthClient;
  syncTabs?: boolean;
  skipInitialFetch?: boolean;
}

export interface UseSessionOptions {
  initialSession?: AuthSessionBundle | null;
  apiBaseUrl?: string;
  client?: AntsAuthClient;
  syncTabs?: boolean;
  skipInitialFetch?: boolean;
}

export interface AuthGuardProps {
  children?: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: readonly UserRole[];
  minRole?: UserRole;
  app?: EcosystemAppId;
  pathname?: string;
  authApp?: 'flow' | 'study';
  relativeLoginIfSameApp?: boolean;
  autoRedirect?: boolean;
  loadingFallback?: React.ReactNode;
  unauthenticatedFallback?: React.ReactNode;
  forbiddenFallback?: React.ReactNode;
  onAccessDenied?: (verdict: RouteAccessVerdict) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ControllerOptions {
  enabled: boolean;
  initialSession?: AuthSessionBundle | null;
  apiBaseUrl?: string;
  client?: AntsAuthClient;
  syncTabs: boolean;
  skipInitialFetch: boolean;
}

function useAuthController({
  enabled,
  initialSession,
  apiBaseUrl,
  client: providedClient,
  syncTabs,
  skipInitialFetch,
}: ControllerOptions): AuthContextValue {
  const client = useMemo(
    () => providedClient ?? createAuthClient({ baseUrl: apiBaseUrl }),
    [providedClient, apiBaseUrl]
  );

  const hasInitialProp = initialSession !== undefined;
  const [sessionState, setSessionState] = useState<AuthSessionBundle | null>(
    hasInitialProp ? (initialSession ?? null) : null
  );
  const [status, setStatus] = useState<SessionStatus>(() => {
    if (hasInitialProp) {
      return initialSession ? 'authenticated' : 'unauthenticated';
    }
    return skipInitialFetch ? 'unauthenticated' : 'loading';
  });
  const [error, setError] = useState<AuthApiError | null>(null);
  const mountedRef = useRef(true);
  const suppressingLocalEventRef = useRef(false);
  const sessionStateRef = useRef<AuthSessionBundle | null>(sessionState);
  sessionStateRef.current = sessionState;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySession = useCallback((next: AuthSessionBundle | null) => {
    if (!mountedRef.current) return;
    sessionStateRef.current = next;
    setSessionState(next);
    setStatus(next ? 'authenticated' : 'unauthenticated');
    setError(null);
  }, []);

  const refresh = useCallback(async (): Promise<AuthSessionBundle | null> => {
    const result = await client.getSession();
    if (!mountedRef.current) return null;

    if (!result.ok) {
      setError(result.error);
      setStatus((prev) => (prev === 'loading' ? 'unauthenticated' : prev));
      return sessionStateRef.current;
    }

    sessionStateRef.current = result.data;
    setSessionState(result.data);
    setStatus(result.data ? 'authenticated' : 'unauthenticated');
    setError(null);
    return result.data;
  }, [client]);

  useEffect(() => {
    if (!enabled || hasInitialProp || skipInitialFetch) {
      return;
    }
    void refresh();
  }, [enabled, hasInitialProp, skipInitialFetch, refresh]);

  useEffect(() => {
    if (!enabled || !syncTabs || typeof window === 'undefined') {
      return;
    }

    const handleFocus = () => {
      void refresh();
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const handleAuthEvent = () => {
      if (suppressingLocalEventRef.current) {
        return;
      }
      void refresh();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(ANTS_AUTH_CLIENT_EVENT, handleAuthEvent);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(ANTS_AUTH_CLIENT_EVENT, handleAuthEvent);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [enabled, syncTabs, refresh]);

  const signInWithEmail = useCallback(
    async (input: AuthSignInEmailInput): Promise<AuthApiResult<AuthSessionBundle>> => {
      suppressingLocalEventRef.current = true;
      try {
        const result = await client.signInWithEmail(input);
        if (!mountedRef.current) return result;

        if (result.ok) {
          applySession(result.data);
        } else {
          setError(result.error);
        }
        return result;
      } finally {
        suppressingLocalEventRef.current = false;
      }
    },
    [client, applySession]
  );

  const signUpWithEmail = useCallback(
    async (input: AuthSignUpInput): Promise<AuthApiResult<AuthSessionBundle>> => {
      suppressingLocalEventRef.current = true;
      try {
        const result = await client.signUpWithEmail(input);
        if (!mountedRef.current) return result;

        if (result.ok) {
          applySession(result.data);
        } else {
          setError(result.error);
        }
        return result;
      } finally {
        suppressingLocalEventRef.current = false;
      }
    },
    [client, applySession]
  );

  const signOut = useCallback(async (): Promise<AuthApiResult<{ signedOut: true }>> => {
    suppressingLocalEventRef.current = true;
    try {
      const result = await client.signOut();
      if (!mountedRef.current) return result;

      if (result.ok) {
        applySession(null);
      } else {
        setError(result.error);
      }
      return result;
    } finally {
      suppressingLocalEventRef.current = false;
    }
  }, [client, applySession]);

  return useMemo(
    () => ({
      session: sessionState,
      user: sessionState?.user ?? null,
      profile: sessionState?.profile ?? null,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'authenticated' && sessionState !== null,
      error,
      refresh,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      setSession: applySession,
    }),
    [sessionState, status, error, refresh, signInWithEmail, signUpWithEmail, signOut, applySession]
  );
}

/**
 * Provides cross-subdomain ANTs session state, tab focus synchronization,
 * and authentication mutations to descendants.
 */
export function AuthProvider({
  children,
  initialSession,
  apiBaseUrl,
  client,
  syncTabs = true,
  skipInitialFetch = false,
}: AuthProviderProps) {
  const value = useAuthController({
    enabled: true,
    initialSession,
    apiBaseUrl,
    client,
    syncTabs,
    skipInitialFetch,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Returns the active ANTs session and mutation helpers. Reads from `<AuthProvider>`
 * when present, or falls back safely to a standalone client controller.
 */
export function useSession(options?: UseSessionOptions): AuthContextValue {
  const context = useContext(AuthContext);
  const standalone = useAuthController({
    enabled: context === null,
    initialSession: options?.initialSession,
    apiBaseUrl: options?.apiBaseUrl,
    client: options?.client,
    syncTabs: options?.syncTabs ?? true,
    skipInitialFetch: options?.skipInitialFetch ?? false,
  });

  return context ?? standalone;
}

/**
 * Returns normalized union permissions and capability flags (`isTutor`,
 * `isContributor`, `isAdmin`, `hasRole`, etc.) for the signed-in user.
 */
export function useRole(): RoleCapabilities & {
  isLoading: boolean;
  status: SessionStatus;
} {
  const { user, isLoading, status } = useSession();

  return useMemo(
    () => ({
      ...computeRoleCapabilities(status === 'authenticated' ? user : null),
      isLoading,
      status,
    }),
    [user, isLoading, status]
  );
}

/**
 * Declarative UI route guard enforcing login and multi-role permissions across
 * `org`, `flow`, and `study` with optional cross-subdomain SSO redirects.
 */
export function AuthGuard({
  children,
  requireAuth,
  allowedRoles,
  minRole,
  app,
  pathname,
  authApp,
  relativeLoginIfSameApp,
  autoRedirect = false,
  loadingFallback = null,
  unauthenticatedFallback = null,
  forbiddenFallback = null,
  onAccessDenied,
}: AuthGuardProps) {
  const { status, user } = useSession();

  const verdict = useMemo(
    () =>
      evaluateRouteAccess({
        status,
        user,
        app,
        pathname,
        requireAuth,
        allowedRoles,
        minRole,
        authApp,
        relativeLoginIfSameApp,
      }),
    [
      status,
      user,
      app,
      pathname,
      requireAuth,
      allowedRoles,
      minRole,
      authApp,
      relativeLoginIfSameApp,
    ]
  );

  useEffect(() => {
    if (verdict.allowed || verdict.status === 'loading') {
      return;
    }
    onAccessDenied?.(verdict);
    if (
      autoRedirect &&
      verdict.status === 'unauthenticated' &&
      verdict.loginUrl &&
      typeof window !== 'undefined'
    ) {
      window.location.assign(verdict.loginUrl);
    }
  }, [verdict, autoRedirect, onAccessDenied]);

  if (verdict.status === 'loading') {
    return <>{loadingFallback}</>;
  }

  if (verdict.status === 'unauthenticated') {
    return <>{unauthenticatedFallback}</>;
  }

  if (verdict.status === 'forbidden') {
    return <>{forbiddenFallback}</>;
  }

  return <>{children}</>;
}
