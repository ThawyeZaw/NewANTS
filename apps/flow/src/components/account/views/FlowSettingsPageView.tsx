'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  AccountSettingsView,
  MOCK_SHARED_PROFILES,
  ThemeToggle,
  createInitialAccountStorageState,
  loadAccountStorageState,
  renameAccountStorageProfile,
  saveAccountStorageState,
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
    () => initialState ?? createInitialAccountStorageState('zyylinnhtet')
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    document.title = 'Account & Profile Settings · Flow — The ANTs Productivity Studio';
    if (persistToLocalStorage) {
      const saved = loadAccountStorageState(MOCK_SHARED_PROFILES, storageKey);
      if (saved) {
        setState(saved);
      }
    }
    setHydrated(true);
  }, [persistToLocalStorage, storageKey]);

  const activeProfile = useMemo(() => {
    return (
      state.profilesByUsername[state.activeUsername] ??
      state.profilesByUsername.zyylinnhtet ??
      Object.values(state.profilesByUsername)[0]!
    );
  }, [state]);

  useEffect(() => {
    if (!hydrated || !persistToLocalStorage) return;
    saveAccountStorageState(state, storageKey);
    syncTelegramToTimetableStorage(activeProfile);
  }, [state, activeProfile, hydrated, persistToLocalStorage, storageKey]);

  const availablePersonas = useMemo(
    () => Object.values(state.profilesByUsername),
    [state.profilesByUsername]
  );

  const handleProfileChange = (nextProfile: SharedUserProfileData) => {
    setState((prev) =>
      renameAccountStorageProfile(prev, prev.activeUsername, nextProfile)
    );
  };

  const handleSwitchPersona = (username: string) => {
    if (!state.profilesByUsername[username]) return;
    setState((prev) => ({
      ...prev,
      activeUsername: username,
    }));
  };

  const handleResetDemo = () => {
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

  return (
    <FlowShellView
      activeSection="settings"
      tabs={[]}
      contentWidth="wide"
      user={toUserMenuProfile(activeProfile)}
      onUserMenuNavigate={handleNavigate}
      headerActions={<ThemeToggle />}
    >
      <AccountSettingsView
        profile={activeProfile}
        availablePersonas={availablePersonas}
        onChange={handleProfileChange}
        onSwitchPersona={handleSwitchPersona}
        onResetDemo={handleResetDemo}
        onNavigate={handleNavigate}
      />
    </FlowShellView>
  );
}

