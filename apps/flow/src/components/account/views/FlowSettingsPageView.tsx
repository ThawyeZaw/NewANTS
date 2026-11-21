'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  ANTS_AUTH_SESSION_EVENT,
  AccountSettingsView,
  MOCK_SHARED_PROFILES,
  ThemeToggle,
  WorkspaceAuthGateView,
  authenticateDemoPersona,
  createAuthenticatedSessionForProfile,
  createInitialAccountStorageState,
  loadAccountStorageState,
  loadAuthSession,
  renameAccountStorageProfile,
  saveAccountStorageState,
  saveAuthSession,
  type AccountProfileStorageState,
  type SharedUserProfileData,
} from '@ants/ui';
import { FlowShellView } from '../../layout/views/FlowShellView';
import { syncTelegramToTimetableStorage, toUserMenuProfile } from './accountSync';

export interface FlowSettingsPageViewProps {
  /** Optional initial state override (primarily for tests/Storybook) */
  initialState?: AccountProfileStorageState;
  persistToLocalStorage?: boolean;
  storageKey?: string;
}

export function FlowSettingsPageView({
  initialState,
  persistToLocalStorage = true,
  storageKey = ACCOUNT_PROFILE_STORAGE_KEY,
}: FlowSettingsPageViewProps) {
  const router = useRouter();
  const [state, setState] = useState<AccountProfileStorageState>(
    () => initialState ?? createInitialAccountStorageState('zaylynnhtet')
  );
  const [isGuest, setIsGuest] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pendingPersistRef = useRef(false);
  const isSyncingSelfRef = useRef(false);

  useEffect(() => {
    document.title = 'Account & Profile Settings · Flow — The ANTs Productivity Studio';
    const syncAll = () => {
      if (isSyncingSelfRef.current) return;
      if (persistToLocalStorage) {
        const session = loadAuthSession({ accountStorageKey: storageKey });
        setIsGuest(session.status === 'guest');
        const saved = loadAccountStorageState(MOCK_SHARED_PROFILES, storageKey);
        if (saved) {
          setState(saved);
        }
      }
      setHydrated(true);
    };
    syncAll();
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, syncAll);
    window.addEventListener('storage', syncAll);
    return () => {
      window.removeEventListener(ANTS_AUTH_SESSION_EVENT, syncAll);
      window.removeEventListener('storage', syncAll);
    };
  }, [persistToLocalStorage, storageKey]);

  const activeProfile = useMemo(() => {
    return (
      state.profilesByUsername[state.activeUsername] ??
      state.profilesByUsername.zaylynnhtet ??
      Object.values(state.profilesByUsername)[0]!
    );
  }, [state]);

  useEffect(() => {
    if (!hydrated || !persistToLocalStorage || isGuest || !pendingPersistRef.current) return;
    pendingPersistRef.current = false;
    isSyncingSelfRef.current = true;
    try {
      saveAccountStorageState(state, storageKey);
      syncTelegramToTimetableStorage(activeProfile);
      saveAuthSession(
        createAuthenticatedSessionForProfile(activeProfile, {
          rememberMe: true,
        }),
        {
          accountState: state,
          accountStorageKey: storageKey,
        }
      );
    } finally {
      isSyncingSelfRef.current = false;
    }
  }, [state, activeProfile, hydrated, isGuest, persistToLocalStorage, storageKey]);

  const availablePersonas = useMemo(
    () => Object.values(state.profilesByUsername),
    [state.profilesByUsername]
  );

  const handleProfileChange = (nextProfile: SharedUserProfileData) => {
    pendingPersistRef.current = true;
    setState((prev) =>
      renameAccountStorageProfile(prev, prev.activeUsername, nextProfile)
    );
  };

  const handleSwitchPersona = (username: string) => {
    if (!state.profilesByUsername[username]) return;
    pendingPersistRef.current = true;
    setState((prev) => ({
      ...prev,
      activeUsername: username,
    }));
  };

  const handleResetDemo = () => {
    pendingPersistRef.current = true;
    const fresh = createInitialAccountStorageState(state.activeUsername);
    setState(fresh);
  };

  const handleNavigate = (path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.location.href = path;
      return;
    }
    router.push(path);
  };

  const handleResumeDemo = (username: string) => {
    const res = authenticateDemoPersona(username, state);
    if (res.ok && res.session && res.nextAccountState) {
      pendingPersistRef.current = false;
      setState(res.nextAccountState);
      setIsGuest(false);
      if (persistToLocalStorage) {
        isSyncingSelfRef.current = true;
        try {
          saveAuthSession(res.session, {
            accountState: res.nextAccountState,
            accountStorageKey: storageKey,
          });
        } finally {
          isSyncingSelfRef.current = false;
        }
      }
    }
  };

  return (
    <FlowShellView
      activeSection="settings"
      tabs={[]}
      contentWidth="wide"
      user={isGuest ? null : toUserMenuProfile(activeProfile)}
      onUserMenuNavigate={handleNavigate}
      headerActions={<ThemeToggle />}
    >
      {isGuest ? (
        <WorkspaceAuthGateView
          variant="gate"
          app="flow"
          routePath="/settings"
          onSignIn={() => router.push('/login?redirect=%2Fsettings')}
          onSignUp={() => router.push('/signup?redirect=%2Fsettings')}
          onResumeDemoPersona={handleResumeDemo}
          onNavigate={handleNavigate}
        />
      ) : (
        <AccountSettingsView
          profile={activeProfile}
          availablePersonas={availablePersonas}
          takenUsernames={Object.keys(state.profilesByUsername)}
          onChange={handleProfileChange}
          onSwitchPersona={handleSwitchPersona}
          onResetDemo={handleResetDemo}
          onNavigate={handleNavigate}
        />
      )}
    </FlowShellView>
  );
}
