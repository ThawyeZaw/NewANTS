'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  AuthStudioView,
  MOCK_SHARED_PROFILES,
  authenticateDemoPersona,
  createInitialAccountStorageState,
  saveAuthSession,
  type AuthFieldErrors,
  type AuthFormMode,
  type AuthFormSubmitPayload,
  type MockUserProfile,
  type UserRole,
} from '@ants/ui';
import {
  buildCrossSubdomainAppUrl,
  resolvePostAuthRedirect,
  useSession,
} from '@ants/auth-client';

export interface FlowAuthContainerProps {
  initialMode?: AuthFormMode;
  initialRedirectTo?: string;
}

export function FlowAuthContainer({
  initialMode = 'login',
  initialRedirectTo,
}: FlowAuthContainerProps) {
  const router = useRouter();
  const { status, user, profile, signInWithEmail, signUpWithEmail, signOut } = useSession();

  const [mode, setMode] = useState<AuthFormMode>(initialMode);
  const [rawRedirect, setRawRedirect] = useState<string | null>(initialRedirectTo ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    document.title =
      mode === 'login'
        ? 'Sign In · Flow — The ANTs Productivity Studio'
        : 'Create Account · Flow — The ANTs Productivity Studio';
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramRedirect = params.get('redirect');
    if (paramRedirect) {
      setRawRedirect(paramRedirect);
    }
  }, []);

  const redirectTo = resolvePostAuthRedirect({
    rawRedirect,
    currentApp: 'flow',
  });

  const navigateTarget = (target: string) => {
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.location.href = target;
      return;
    }
    router.push(target);
  };

  const handleModeChange = (nextMode: AuthFormMode) => {
    setMode(nextMode);
    setError(null);
    setFieldErrors({});
    const baseRoute = nextMode === 'login' ? '/login' : '/signup';
    const nextUrl =
      rawRedirect && rawRedirect.trim().length > 0
        ? `${baseRoute}?redirect=${encodeURIComponent(rawRedirect)}`
        : baseRoute;
    router.replace(nextUrl);
  };

  const handleSubmit = async (payload: AuthFormSubmitPayload) => {
    setError(null);
    setFieldErrors({});
    setIsLoading(true);
    try {
      if (payload.mode === 'login') {
        const res = await signInWithEmail({
          email: payload.email,
          password: payload.password,
          rememberMe: payload.rememberMe,
        });
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        navigateTarget(redirectTo);
        return;
      }

      const res = await signUpWithEmail({
        name: payload.name?.trim() || 'ANTs Scholar',
        email: payload.email,
        password: payload.password,
        username: payload.username?.trim().toLowerCase() || undefined,
        academicTrack: payload.academicTrack ?? 'ial',
        rememberMe: payload.rememberMe,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      navigateTarget(
        resolvePostAuthRedirect({
          rawRedirect,
          currentApp: 'flow',
          preferredApp: payload.academicTrack === 'ial' || payload.academicTrack === 'igcse' ? 'study' : 'flow',
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoPersonaSelect = (username: string) => {
    setError(null);
    setFieldErrors({});
    const accounts = createInitialAccountStorageState(username);
    const res = authenticateDemoPersona(username, accounts);
    if (res.ok && res.session) {
      saveAuthSession(res.session, {
        accountState: res.nextAccountState,
        accountStorageKey: ACCOUNT_PROFILE_STORAGE_KEY,
      });
      navigateTarget(redirectTo);
    }
  };

  const activeMockUser: MockUserProfile | null =
    status === 'authenticated' && user
      ? {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role as UserRole,
          roles: user.roles as UserRole[],
          xp: profile?.xp ?? 0,
          streakDays: profile?.streakDays ?? 0,
          telegramConnected:
            profile?.telegramStatus === 'linked' || profile?.telegramStatus === 'connected',
          curriculumLabel: profile?.curriculumLabel,
        }
      : null;

  return (
    <AuthStudioView
      app="flow"
      mode={mode}
      onModeChange={handleModeChange}
      activeUser={activeMockUser}
      redirectTo={redirectTo}
      existingUsernames={Object.keys(MOCK_SHARED_PROFILES)}
      onSubmit={(payload) => void handleSubmit(payload)}
      onSocialAuth={(provider) =>
        setError(
          `${provider === 'google' ? 'Google' : 'GitHub'} OAuth requires production provider keys; use email & password for live D1 SSO.`
        )
      }
      onDemoPersonaSelect={handleDemoPersonaSelect}
      onContinueAuthenticated={() => navigateTarget(redirectTo)}
      onSignOut={() => void signOut()}
      onNavigate={navigateTarget}
      isLoading={isLoading}
      error={error}
      fieldErrors={fieldErrors}
      orgUrl={buildCrossSubdomainAppUrl('org', '/')}
      flowUrl={buildCrossSubdomainAppUrl('flow', '/')}
      studyUrl={buildCrossSubdomainAppUrl('study', '/')}
    />
  );
}
