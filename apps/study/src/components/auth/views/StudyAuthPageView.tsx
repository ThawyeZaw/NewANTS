'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  ANTS_AUTH_SESSION_EVENT,
  AuthStudioView,
  MOCK_SHARED_PROFILES,
  authenticateDemoPersona,
  authenticateOAuthProvider,
  authenticateSignIn,
  authenticateSignUp,
  createGuestSession,
  createInitialAccountStorageState,
  loadAccountStorageState,
  loadAuthSession,
  sanitizeRedirectPath,
  saveAuthSession,
  signOutEverywhere,
  type AccountProfileStorageState,
  type AntsSsoSessionState,
  type AuthFieldErrors,
  type AuthFormMode,
  type AuthFormSubmitPayload,
} from '@ants/ui';

export interface StudyAuthPageViewProps {
  initialMode?: AuthFormMode;
  initialRedirectTo?: string;
  persistToLocalStorage?: boolean;
  accountStorageKey?: string;
}

export function StudyAuthPageView({
  initialMode = 'login',
  initialRedirectTo,
  persistToLocalStorage = true,
  accountStorageKey = ACCOUNT_PROFILE_STORAGE_KEY,
}: StudyAuthPageViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthFormMode>(initialMode);
  const [redirectTo, setRedirectTo] = useState<string>(() =>
    sanitizeRedirectPath(initialRedirectTo, '/')
  );
  const [accountState, setAccountState] = useState<AccountProfileStorageState>(
    () => createInitialAccountStorageState('zaylynnhtet')
  );
  const [session, setSession] = useState<AntsSsoSessionState>(() =>
    createGuestSession('2026-11-12T08:00:00.000Z')
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    document.title =
      mode === 'login'
        ? 'Sign In · Study — The ANTs IGCSE & IAL Academic Tracker'
        : 'Create Account · Study — The ANTs IGCSE & IAL Academic Tracker';
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam) {
      setRedirectTo(sanitizeRedirectPath(redirectParam, '/'));
    }

    if (persistToLocalStorage) {
      const loadedAccounts = loadAccountStorageState(
        MOCK_SHARED_PROFILES,
        accountStorageKey
      );
      if (loadedAccounts) {
        setAccountState(loadedAccounts);
      }
      const loadedSession = loadAuthSession({ accountStorageKey });
      setSession(loadedSession);
    }

    const onSessionEvent = () => {
      setSession(loadAuthSession({ accountStorageKey }));
      const latestAccounts = loadAccountStorageState(
        MOCK_SHARED_PROFILES,
        accountStorageKey
      );
      if (latestAccounts) {
        setAccountState(latestAccounts);
      }
    };
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, onSessionEvent);
    return () => window.removeEventListener(ANTS_AUTH_SESSION_EVENT, onSessionEvent);
  }, [accountStorageKey, persistToLocalStorage]);

  const existingUsernames = useMemo(
    () => Object.keys(accountState.profilesByUsername),
    [accountState.profilesByUsername]
  );

  const handleModeChange = (nextMode: AuthFormMode) => {
    setMode(nextMode);
    setError(null);
    setFieldErrors({});
    const baseRoute = nextMode === 'login' ? '/login' : '/signup';
    const nextUrl =
      redirectTo && redirectTo !== '/'
        ? `${baseRoute}?redirect=${encodeURIComponent(redirectTo)}`
        : baseRoute;
    router.replace(nextUrl);
  };

  const commitAuthSuccess = (
    nextSession: AntsSsoSessionState,
    nextAccounts?: AccountProfileStorageState
  ) => {
    if (nextAccounts) {
      setAccountState(nextAccounts);
    }
    setSession(nextSession);
    if (persistToLocalStorage) {
      saveAuthSession(nextSession, {
        accountState: nextAccounts,
        accountStorageKey,
      });
    }
    router.push(redirectTo);
  };

  const handleSubmit = (payload: AuthFormSubmitPayload) => {
    setError(null);
    setFieldErrors({});

    if (payload.mode === 'login') {
      const res = authenticateSignIn(
        {
          identifier: payload.email,
          password: payload.password,
          rememberMe: payload.rememberMe,
          authMethod: 'email',
        },
        accountState
      );
      if (!res.ok || !res.session) {
        setError(res.error ?? 'Unable to sign in.');
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      commitAuthSuccess(res.session, res.nextAccountState);
      return;
    }

    const res = authenticateSignUp(payload, accountState);
    if (!res.ok || !res.session) {
      setError(res.error ?? 'Unable to create account.');
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    commitAuthSuccess(res.session, res.nextAccountState);
  };

  const handleDemoPersonaSelect = (username: string) => {
    setError(null);
    setFieldErrors({});
    const res = authenticateDemoPersona(username, accountState);
    if (res.ok && res.session) {
      commitAuthSuccess(res.session, res.nextAccountState);
    }
  };

  const handleSocialAuth = (provider: 'google' | 'github') => {
    setError(null);
    setFieldErrors({});
    const res = authenticateOAuthProvider(provider, 'study', accountState);
    if (res.ok && res.session) {
      commitAuthSuccess(res.session, res.nextAccountState);
    }
  };

  const handleSignOut = () => {
    const guest = signOutEverywhere();
    setSession(guest);
  };

  const handleNavigate = (href: string) => {
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.location.href = href;
      return;
    }
    router.push(href);
  };

  return (
    <AuthStudioView
      app="study"
      mode={mode}
      onModeChange={handleModeChange}
      activeUser={session.status === 'authenticated' ? session.user : null}
      redirectTo={redirectTo}
      existingUsernames={existingUsernames}
      onSubmit={handleSubmit}
      onSocialAuth={handleSocialAuth}
      onDemoPersonaSelect={handleDemoPersonaSelect}
      onContinueAuthenticated={() => router.push(redirectTo)}
      onSignOut={handleSignOut}
      onNavigate={handleNavigate}
      error={error}
      fieldErrors={fieldErrors}
    />
  );
}

