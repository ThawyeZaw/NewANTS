'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  ANTS_AUTH_SESSION_EVENT,
  AccountSettingsView,
  MOCK_SHARED_PROFILES,
  createAuthenticatedSessionForProfile,
  createInitialAccountStorageState,
  loadAccountStorageState,
  loadAuthSession,
  profileToMockUser,
  renameAccountStorageProfile,
  saveAccountStorageState,
  saveAuthSession,
  type AccountProfileStorageState,
  type SharedUserProfileData,
} from '@ants/ui';
import {
  loadStudyDashboardState,
  saveStudyDashboardState,
  setSidebarCollapsed,
  type StudyDashboardPersistedState,
} from '../../../lib/study/dashboard';
import { createDefaultStudyDashboardState } from '../../../mocks/study-dashboard.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';

export interface StudySettingsPageViewProps {
  initialState?: AccountProfileStorageState;
  persistToLocalStorage?: boolean;
  storageKey?: string;
}

export function StudySettingsPageView({
  initialState,
  persistToLocalStorage = true,
  storageKey = ACCOUNT_PROFILE_STORAGE_KEY,
}: StudySettingsPageViewProps) {
  const router = useRouter();
  const [state, setState] = useState<AccountProfileStorageState>(
    () => initialState ?? createInitialAccountStorageState('zaylynnhtet')
  );
  const [dashboardState, setDashboardState] = useState<StudyDashboardPersistedState>(
    createDefaultStudyDashboardState
  );
  const [isGuest, setIsGuest] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const pendingPersistRef = useRef(false);
  const isSyncingSelfRef = useRef(false);

  useEffect(() => {
    document.title = 'Account & Scholar Settings · Study — The ANTs Academic Tracker';
    const syncAll = () => {
      if (isSyncingSelfRef.current) return;
      if (persistToLocalStorage) {
        const session = loadAuthSession({ accountStorageKey: storageKey });
        setIsGuest(session.status === 'guest');
        const saved = loadAccountStorageState(MOCK_SHARED_PROFILES, storageKey);
        if (saved) {
          setState(saved);
        }
        setDashboardState(loadStudyDashboardState(createDefaultStudyDashboardState()));
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
    if (path.startsWith('/@')) {
      window.location.href = `http://localhost:3002${path}`;
      return;
    }
    router.push(path);
  };

  return (
    <StudyShellView
      activeRoute="settings"
      user={isGuest ? null : profileToMockUser(activeProfile)}
      sidebarCollapsed={dashboardState.sidebarCollapsed}
      onToggleSidebarCollapse={() => {
        const next = setSidebarCollapsed(
          dashboardState,
          !dashboardState.sidebarCollapsed
        );
        setDashboardState(next);
        saveStudyDashboardState(next);
      }}
    >
      <AccountSettingsView
        profile={activeProfile}
        availablePersonas={availablePersonas}
        takenUsernames={Object.keys(state.profilesByUsername)}
        onChange={handleProfileChange}
        onSwitchPersona={handleSwitchPersona}
        onResetDemo={handleResetDemo}
        onNavigate={handleNavigate}
      />
    </StudyShellView>
  );
}
