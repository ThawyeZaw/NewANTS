'use client';

import React, { useEffect, useRef } from 'react';
import {
  ANTS_AUTH_SESSION_EVENT,
  loadAuthSession,
  saveAuthSession,
  signOutEverywhere,
  type AntsSsoSessionState,
  type MockUserProfile,
  type UserRole,
} from '@ants/ui';
import { AuthProvider, authClient, useSession } from '@ants/auth-client';

function toMockUserFromAuth(
  user: {
    id: string;
    name: string;
    email: string;
    username?: string | null;
    role?: string | null;
    roles?: string[] | null;
  },
  profile?: {
    xp?: number;
    streakDays?: number;
    telegramStatus?: string;
    curriculumLabel?: string;
  } | null
): MockUserProfile {
  const roles = (
    Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : [user.role ?? 'student']
  ) as UserRole[];
  const primaryRole = (user.role ?? roles[0] ?? 'student') as UserRole;
  const derivedUsername =
    user.username && user.username.trim().length > 0
      ? user.username.trim().toLowerCase()
      : user.email.split('@')[0]?.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'scholar';

  return {
    id: user.id,
    name: user.name,
    username: derivedUsername,
    email: user.email,
    role: primaryRole,
    roles,
    xp: profile?.xp ?? 0,
    streakDays: profile?.streakDays ?? 0,
    telegramConnected:
      profile?.telegramStatus === 'linked' || profile?.telegramStatus === 'connected',
    curriculumLabel: profile?.curriculumLabel,
  };
}

function OrgAuthSessionBridge() {
  const { status, user, profile } = useSession();
  const prevStatusRef = useRef<string>('loading');
  const syncingBridgeRef = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;

    syncingBridgeRef.current = true;
    try {
      if (status === 'authenticated' && user) {
        const mockUser = toMockUserFromAuth(user, profile);
        const ssoState: AntsSsoSessionState = {
          version: 1,
          status: 'authenticated',
          username: mockUser.username,
          authMethod: 'email',
          rememberMe: true,
          signedInAtIso: new Date().toISOString(),
          user: mockUser,
        };
        saveAuthSession(ssoState);
      } else if (
        status === 'unauthenticated' &&
        prevStatusRef.current === 'authenticated'
      ) {
        signOutEverywhere();
      }
      prevStatusRef.current = status;
    } finally {
      syncingBridgeRef.current = false;
    }
  }, [status, user, profile]);

  useEffect(() => {
    const handleUiAuthChange = () => {
      if (syncingBridgeRef.current) return;
      const current = loadAuthSession();
      if (current.status === 'guest' && status === 'authenticated') {
        void authClient.signOut();
      }
    };
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, handleUiAuthChange);
    return () => {
      window.removeEventListener(ANTS_AUTH_SESSION_EVENT, handleUiAuthChange);
    };
  }, [status]);

  return null;
}

export function OrgAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OrgAuthSessionBridge />
      {children}
    </AuthProvider>
  );
}
