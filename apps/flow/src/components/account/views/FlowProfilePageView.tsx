'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  ANTS_AUTH_SESSION_EVENT,
  MOCK_SHARED_PROFILES,
  ThemeToggle,
  UserProfileView,
  createInitialAccountStorageState,
  loadAccountStorageState,
  loadAuthSession,
  normalizeProfileHandle,
  type AccountProfileStorageState,
  type PublicProfileSwitchItem,
} from '@ants/ui';
import { FlowShellView } from '../../layout/views/FlowShellView';
import { toUserMenuProfile } from './accountSync';

export interface FlowProfilePageViewProps {
  /** Dynamic `[handle]` param from `/@[username]` route */
  handle: string;
  initialState?: AccountProfileStorageState;
  persistToLocalStorage?: boolean;
  storageKey?: string;
}

export function FlowProfilePageView({
  handle,
  initialState,
  persistToLocalStorage = true,
  storageKey = ACCOUNT_PROFILE_STORAGE_KEY,
}: FlowProfilePageViewProps) {
  const router = useRouter();
  const [state, setState] = useState<AccountProfileStorageState>(
    () => initialState ?? createInitialAccountStorageState('zaylynnhtet')
  );
  const [isGuest, setIsGuest] = useState(false);

  const normalizedHandle = useMemo(() => normalizeProfileHandle(handle), [handle]);

  useEffect(() => {
    const syncAll = () => {
      if (persistToLocalStorage) {
        const session = loadAuthSession({ accountStorageKey: storageKey });
        setIsGuest(session.status === 'guest');
        const saved = loadAccountStorageState(MOCK_SHARED_PROFILES, storageKey);
        if (saved) {
          setState(saved);
        }
      }
    };
    syncAll();
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, syncAll);
    window.addEventListener('storage', syncAll);
    return () => {
      window.removeEventListener(ANTS_AUTH_SESSION_EVENT, syncAll);
      window.removeEventListener('storage', syncAll);
    };
  }, [persistToLocalStorage, storageKey]);

  const matchedProfile = state.profilesByUsername[normalizedHandle] ?? null;

  useEffect(() => {
    document.title = matchedProfile
      ? `${matchedProfile.name} (@${matchedProfile.username}) · The ANTs Profile`
      : `@${normalizedHandle || 'profile'} · Member Not Found · The ANTs`;
  }, [matchedProfile, normalizedHandle]);

  const activeSessionProfile =
    state.profilesByUsername[state.activeUsername] ??
    state.profilesByUsername.zaylynnhtet ??
    null;

  const availableProfiles: PublicProfileSwitchItem[] = useMemo(
    () =>
      Object.values(state.profilesByUsername).map((p) => ({
        username: p.username,
        name: p.name,
        roleLabel: p.roles.includes('admin')
          ? 'Admin+Tutor'
          : p.roles.includes('tutor')
            ? 'Tutor'
            : 'Student',
      })),
    [state.profilesByUsername]
  );

  const handleNavigate = (path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.location.href = path;
      return;
    }
    router.push(path);
  };

  return (
    <FlowShellView
      activeSection="profile"
      tabs={[]}
      contentWidth="wide"
      user={
        !isGuest && activeSessionProfile
          ? toUserMenuProfile(activeSessionProfile)
          : null
      }
      onUserMenuNavigate={handleNavigate}
      headerActions={<ThemeToggle />}
    >
      <UserProfileView
        profile={matchedProfile}
        requestedHandle={normalizedHandle}
        isOwnProfile={Boolean(
          !isGuest && matchedProfile && matchedProfile.username === state.activeUsername
        )}
        availableProfiles={availableProfiles}
        onNavigate={handleNavigate}
      />
    </FlowShellView>
  );
}
