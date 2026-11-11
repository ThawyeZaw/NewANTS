'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  MOCK_SHARED_PROFILES,
  ThemeToggle,
  UserProfileView,
  createInitialAccountStorageState,
  loadAccountStorageState,
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
    () => initialState ?? createInitialAccountStorageState('zyylinnhtet')
  );

  const normalizedHandle = useMemo(() => normalizeProfileHandle(handle), [handle]);

  useEffect(() => {
    if (persistToLocalStorage) {
      const saved = loadAccountStorageState(MOCK_SHARED_PROFILES, storageKey);
      if (saved) {
        setState(saved);
      }
    }
  }, [persistToLocalStorage, storageKey]);

  const matchedProfile = state.profilesByUsername[normalizedHandle] ?? null;

  useEffect(() => {
    document.title = matchedProfile
      ? `${matchedProfile.name} (@${matchedProfile.username}) · The ANTs Profile`
      : `@${normalizedHandle || 'profile'} · Member Not Found · The ANTs`;
  }, [matchedProfile, normalizedHandle]);

  const activeSessionProfile =
    state.profilesByUsername[state.activeUsername] ??
    state.profilesByUsername.zyylinnhtet ??
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
      user={activeSessionProfile ? toUserMenuProfile(activeSessionProfile) : null}
      onUserMenuNavigate={handleNavigate}
      headerActions={<ThemeToggle />}
    >
      <UserProfileView
        profile={matchedProfile}
        requestedHandle={normalizedHandle}
        isOwnProfile={Boolean(matchedProfile && matchedProfile.username === state.activeUsername)}
        availableProfiles={availableProfiles}
        onNavigate={handleNavigate}
      />
    </FlowShellView>
  );
}

