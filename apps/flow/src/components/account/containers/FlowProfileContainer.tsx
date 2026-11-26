'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  MOCK_SHARED_PROFILES,
  ThemeToggle,
  UserProfileView,
  normalizeProfileHandle,
  type MockUserProfile,
  type PublicProfileSwitchItem,
  type SharedUserProfileData,
  type UserRole,
} from '@ants/ui';
import { useSession } from '@ants/auth-client';
import {
  FlowApiError,
  fetchPublicAccountProfile,
  mapAccountDtoToSharedProfile,
} from '../../../lib/flow-api';
import { FlowShellView } from '../../layout/views/FlowShellView';

export interface FlowProfileContainerProps {
  handle: string;
}

function resolveClientHandle(fallbackHandle: string): string {
  if (typeof window === 'undefined') return fallbackHandle;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const rawSegment = segments[0];
  if (rawSegment && rawSegment.startsWith('@')) {
    try {
      return decodeURIComponent(rawSegment);
    } catch {
      return rawSegment;
    }
  }
  return fallbackHandle;
}

export function FlowProfileContainer({ handle }: FlowProfileContainerProps) {
  const router = useRouter();
  const { status, user, profile: sessionProfile } = useSession();
  const [effectiveHandle, setEffectiveHandle] = useState(handle);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SharedUserProfileData | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState<PublicProfileSwitchItem[]>([]);

  useEffect(() => {
    setEffectiveHandle(resolveClientHandle(handle));
  }, [handle]);

  const normalizedHandle = useMemo(
    () => normalizeProfileHandle(effectiveHandle),
    [effectiveHandle]
  );

  useEffect(() => {
    if (!normalizedHandle) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetchPublicAccountProfile(normalizedHandle);
        if (cancelled) return;
        const mapped = mapAccountDtoToSharedProfile(res.profile);
        setProfile(mapped);
        setIsOwnProfile(res.isOwnProfile);
        setAvailableProfiles(res.availableProfiles);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof FlowApiError && err.status === 404) {
          setProfile(null);
        } else {
          const mockMatch = MOCK_SHARED_PROFILES[normalizedHandle] ?? null;
          setProfile(mockMatch);
          setIsOwnProfile(Boolean(user && mockMatch && user.username === mockMatch.username));
          setAvailableProfiles(
            Object.values(MOCK_SHARED_PROFILES).map((p) => ({
              username: p.username,
              name: p.name,
              roleLabel: p.roles.includes('admin')
                ? 'Admin+Tutor'
                : p.roles.includes('tutor')
                  ? 'Tutor'
                  : 'Student',
            }))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedHandle, user?.id, user]);

  useEffect(() => {
    document.title = profile
      ? `${profile.name} (@${profile.username}) · The ANTs Profile`
      : `@${normalizedHandle || 'profile'} · Member Not Found · The ANTs`;
  }, [profile, normalizedHandle]);

  const activeMenuUser: MockUserProfile | null = useMemo(() => {
    if (status !== 'authenticated' || !user) return null;
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      roles: user.roles as UserRole[],
      xp: sessionProfile?.xp ?? 0,
      streakDays: sessionProfile?.streakDays ?? 0,
      telegramConnected:
        sessionProfile?.telegramStatus === 'linked' ||
        sessionProfile?.telegramStatus === 'connected',
      curriculumLabel: sessionProfile?.curriculumLabel,
    };
  }, [status, user, sessionProfile]);

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
      user={activeMenuUser}
      onUserMenuNavigate={handleNavigate}
      headerActions={<ThemeToggle />}
    >
      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-foreground-muted">
              Loading public ANTs profile <span className="font-mono">@{normalizedHandle}</span>...
            </p>
          </CardContent>
        </Card>
      ) : (
        <UserProfileView
          profile={profile}
          requestedHandle={normalizedHandle}
          isOwnProfile={isOwnProfile}
          availableProfiles={availableProfiles}
          onNavigate={handleNavigate}
        />
      )}
    </FlowShellView>
  );
}
