'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import type { StudyLeaderboardResponseDto } from '@ants/shared-types';
import {
  fetchStudyLeaderboardApi,
  LOADING_STUDY_SHELL_USER,
  mapLeaderboardDtoToViewProps,
  sessionToMockUser,
  updateStudyLeaderboardVisibilityApi,
} from '../../../lib/study-api';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { StudyLeaderboardView } from '../views/StudyLeaderboardView';

export function StudyLeaderboardContainer() {
  const { status, user, profile } = useSession();
  const [data, setData] = useState<StudyLeaderboardResponseDto | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const dto = await fetchStudyLeaderboardApi();
      setData(dto);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load Scholar Leaderboard from D1.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadLeaderboard();
    } else {
      setData(null);
    }
  }, [status, loadLeaderboard]);

  if (status === 'loading') {
    return (
      <StudyShellView activeRoute="leaderboard" user={LOADING_STUDY_SHELL_USER}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <StudyLeaderboardView
        user={null}
        disableLocalStorage={true}
      />
    );
  }

  const shellUser = sessionToMockUser(
    user,
    profile,
    data?.currentUserXp,
    data?.currentUserStreak
  );

  if (loadingData && !data) {
    return (
      <StudyShellView activeRoute="leaderboard" user={shellUser}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (!data) {
    return (
      <StudyShellView activeRoute="leaderboard" user={shellUser}>
        <div className="rounded-xl border border-danger-border bg-danger-tint p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">
            Could not load Scholar Leaderboard
          </h2>
          <p className="text-xs text-foreground-muted">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadLeaderboard()}>
            Retry
          </Button>
        </div>
      </StudyShellView>
    );
  }

  const viewProps = mapLeaderboardDtoToViewProps(data);

  return (
    <div className="space-y-2">
      {errorMessage && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-danger-border bg-danger-tint px-4 py-2 text-xs font-semibold text-on-danger-tint shadow-md"
        >
          {errorMessage}
        </div>
      )}
      <StudyLeaderboardView
        user={shellUser}
        scholars={viewProps.scholars}
        badges={viewProps.badges}
        initialPrefs={{
          version: 1,
          timeframe: 'weekly',
          boardFilter: 'all',
          visibleOnLeaderboard: viewProps.visibleOnLeaderboard,
        }}
        disableLocalStorage={true}
        onToggleVisibility={(visible) => {
          setData((prev) =>
            prev ? { ...prev, visibleOnLeaderboard: visible } : prev
          );
          void updateStudyLeaderboardVisibilityApi(visible).catch((err) => {
            setErrorMessage(
              err instanceof Error ? err.message : 'Failed to update privacy setting.'
            );
          });
        }}
      />
    </div>
  );
}
