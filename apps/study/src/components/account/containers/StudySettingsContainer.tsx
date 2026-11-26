'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
} from 'lucide-react';
import {
  AccountSettingsView,
  Button,
  Card,
  CardContent,
  WorkspaceAuthGateView,
  profileToMockUser,
  type SharedUserProfileData,
  type TelegramLeadMinutes,
} from '@ants/ui';
import { buildCrossSubdomainAppUrl, useSession } from '@ants/auth-client';
import {
  StudyAccountApiError,
  fetchMyAccountProfile,
  fetchTelegramStatus,
  mapAccountDtoToSharedProfile,
  mapSharedProfileToUpdateInput,
  postTelegramTestPing,
  startTelegramLink,
  unlinkTelegramAccount,
  updateMyAccountProfile,
  updateTelegramPreferences,
} from '../../../lib/account-api';
import {
  loadStudyDashboardState,
  saveStudyDashboardState,
  setSidebarCollapsed,
  type StudyDashboardPersistedState,
} from '../../../lib/study/dashboard';
import { createDefaultStudyDashboardState } from '../../../mocks/study-dashboard.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';

export function StudySettingsContainer() {
  const router = useRouter();
  const { status, user, refresh } = useSession();
  const [hydrationKey, setHydrationKey] = useState(0);
  const [profile, setProfile] = useState<SharedUserProfileData | null>(null);
  const [dashboardState, setDashboardState] = useState<StudyDashboardPersistedState>(
    createDefaultStudyDashboardState
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const prevProfileRef = useRef<SharedUserProfileData | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const lastStartedCodeRef = useRef<string | null>(null);

  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    try {
      const dto = await fetchMyAccountProfile();
      const mapped = mapAccountDtoToSharedProfile(dto);
      prevProfileRef.current = mapped;
      lastStartedCodeRef.current = mapped.telegram.verificationCode || null;
      setProfile(mapped);
      setHydrationKey((k) => k + 1);
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Unable to load account settings from D1.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Account & Scholar Settings · Study — The ANTs Academic Tracker';
    setDashboardState(loadStudyDashboardState(createDefaultStudyDashboardState()));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      prevProfileRef.current = null;
      return;
    }
    void loadAccount();
  }, [isAuthenticated, user?.id, loadAccount]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const applyTelegramDto = (
    current: SharedUserProfileData,
    tg: Awaited<ReturnType<typeof fetchTelegramStatus>>
  ): SharedUserProfileData => ({
    ...current,
    telegram: {
      status: tg.status === 'linked' ? 'connected' : tg.status,
      handle: tg.handle,
      verificationCode: tg.verificationCode ?? '',
      codeExpiresAt: tg.codeExpiresAt ?? undefined,
      linkedAt: tg.linkedAt ?? undefined,
      preferences: {
        ...tg.preferences,
        defaultLeadMinutes: tg.preferences.defaultLeadMinutes as TelegramLeadMinutes,
      },
    },
  });

  const handleProfileChange = (nextProfile: SharedUserProfileData) => {
    const prev = prevProfileRef.current;
    prevProfileRef.current = nextProfile;
    setProfile(nextProfile);
    setBanner(null);

    if (!isAuthenticated) return;

    if (prev) {
      const startedLink =
        nextProfile.telegram.status === 'pending' &&
        (prev.telegram.status !== 'pending' ||
          (nextProfile.telegram.verificationCode !== prev.telegram.verificationCode &&
            nextProfile.telegram.verificationCode !== lastStartedCodeRef.current));

      if (startedLink) {
        void startTelegramLink()
          .then((tg) => {
            lastStartedCodeRef.current = tg.verificationCode ?? null;
            setProfile((curr) => {
              if (!curr) return curr;
              const updated = applyTelegramDto(curr, tg);
              prevProfileRef.current = updated;
              return updated;
            });
            setHydrationKey((k) => k + 1);
            setBanner({
              kind: 'success',
              text: tg.verificationCode
                ? `Generated live D1 Telegram handshake code ${tg.verificationCode}.`
                : 'Generated Telegram link code.',
            });
          })
          .catch((err) => {
            setBanner({
              kind: 'error',
              text: err instanceof Error ? err.message : 'Failed to start Telegram verification.',
            });
          });
      } else if (prev.telegram.status !== 'unlinked' && nextProfile.telegram.status === 'unlinked') {
        void unlinkTelegramAccount()
          .then((tg) => {
            setProfile((curr) => {
              if (!curr) return curr;
              const updated = applyTelegramDto(curr, tg);
              prevProfileRef.current = updated;
              return updated;
            });
            setHydrationKey((k) => k + 1);
            setBanner({ kind: 'success', text: 'Telegram account unlinked from D1.' });
          })
          .catch((err) => {
            setBanner({
              kind: 'error',
              text: err instanceof Error ? err.message : 'Failed to unlink Telegram.',
            });
          });
      } else if (
        JSON.stringify(prev.telegram.preferences) !== JSON.stringify(nextProfile.telegram.preferences)
      ) {
        void updateTelegramPreferences(nextProfile.telegram.preferences)
          .then(() => {
            setBanner({ kind: 'success', text: 'Saved Telegram notification preferences to D1.' });
          })
          .catch(() => {});
      }
    }

    const profileChanged =
      !prev ||
      JSON.stringify({ ...prev, telegram: undefined }) !==
        JSON.stringify({ ...nextProfile, telegram: undefined });

    if (profileChanged) {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        setSaving(true);
        void updateMyAccountProfile(mapSharedProfileToUpdateInput(nextProfile))
          .then((savedDto) => {
            const mapped = mapAccountDtoToSharedProfile(savedDto);
            prevProfileRef.current = mapped;
            setProfile(mapped);
            setBanner({ kind: 'success', text: 'Saved profile & availability changes to D1.' });
            void refresh();
          })
          .catch((err) => {
            const msg =
              err instanceof StudyAccountApiError && err.code === 'USERNAME_TAKEN'
                ? 'That @username is already claimed by another ANTs member.'
                : err instanceof Error
                  ? err.message
                  : 'Failed to save profile to D1.';
            setBanner({ kind: 'error', text: msg });
          })
          .finally(() => {
            setSaving(false);
          });
      }, 450);
    }
  };

  const handleRefreshTelegramStatus = async () => {
    try {
      const tg = await fetchTelegramStatus();
      setProfile((curr) => {
        if (!curr) return curr;
        const updated = applyTelegramDto(curr, tg);
        prevProfileRef.current = updated;
        return updated;
      });
      setHydrationKey((k) => k + 1);
      setBanner({
        kind: 'success',
        text:
          tg.status === 'linked' || tg.status === 'connected'
            ? `Telegram linked as ${tg.handle || 'verified account'}.`
            : `Telegram status synced (${tg.status}).`,
      });
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Unable to refresh Telegram status.',
      });
    }
  };

  const handleSendTestPing = async () => {
    try {
      await postTelegramTestPing();
      setBanner({ kind: 'success', text: 'Sent live Telegram test ping from @ants/api.' });
    } catch (err) {
      setBanner({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Unable to send Telegram test ping.',
      });
    }
  };

  const handleNavigate = (path: string) => {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.location.href = path;
      return;
    }
    if (path.startsWith('/@')) {
      window.location.href = buildCrossSubdomainAppUrl('flow', path);
      return;
    }
    router.push(path);
  };

  return (
    <StudyShellView
      activeRoute="settings"
      user={isAuthenticated && profile ? profileToMockUser(profile) : null}
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
      {status === 'loading' || (isAuthenticated && loading && !profile) ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-foreground-muted">
              Loading your cross-app <span className="font-mono">.the-ants.org</span> profile...
            </p>
          </CardContent>
        </Card>
      ) : !isAuthenticated || !profile ? (
        <WorkspaceAuthGateView
          variant="gate"
          app="study"
          routePath="/settings"
          onSignIn={() => router.push('/login?redirect=%2Fsettings')}
          onSignUp={() => router.push('/signup?redirect=%2Fsettings')}
          onNavigate={handleNavigate}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-card px-4 py-3 text-xs">
            <div className="flex items-center gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-foreground-muted">Saving changes to D1...</span>
                </>
              ) : banner ? (
                <span
                  className={`inline-flex items-center gap-1.5 font-medium ${
                    banner.kind === 'success' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {banner.kind === 'success' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {banner.text}
                </span>
              ) : (
                <span className="text-foreground-muted">
                  Synced with live D1 profile (<span className="font-mono">@{profile.username}</span>)
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleRefreshTelegramStatus()}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Refresh Telegram Status
              </Button>
              {profile.telegram.status === 'connected' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleSendTestPing()}
                  leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Send Live Test Ping
                </Button>
              )}
            </div>
          </div>

          <AccountSettingsView
            key={hydrationKey}
            profile={profile}
            availablePersonas={[profile]}
            takenUsernames={[]}
            onChange={handleProfileChange}
            onNavigate={handleNavigate}
          />
        </div>
      )}
    </StudyShellView>
  );
}
