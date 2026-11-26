'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import type { CurriculumBoardId, StudyDashboardResponseDto } from '@ants/shared-types';
import {
  fetchStudyDashboardApi,
  LOADING_STUDY_SHELL_USER,
  mapDashboardDtoToViewProps,
  sessionToMockUser,
  toggleStudySubjectCheckInApi,
  updateStudyActiveBoardApi,
  updateStudyCountdownFlagsApi,
} from '../../../lib/study-api';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { StudyDashboardView } from '../views/StudyDashboardView';

export function StudyDashboardContainer() {
  const { status, user, profile } = useSession();
  const [data, setData] = useState<StudyDashboardResponseDto | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const dto = await fetchStudyDashboardApi();
      setData(dto);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load Study Dashboard from D1.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadDashboard();
    } else {
      setData(null);
    }
  }, [status, loadDashboard]);

  if (status === 'loading') {
    return (
      <StudyShellView activeRoute="dashboard" user={LOADING_STUDY_SHELL_USER}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-surface-inset" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="h-56 animate-pulse rounded-xl bg-surface-inset xl:col-span-8" />
            <div className="h-56 animate-pulse rounded-xl bg-surface-inset xl:col-span-4" />
          </div>
        </div>
      </StudyShellView>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <StudyDashboardView
        user={null}
        disableLocalStorage={true}
      />
    );
  }

  const shellUser = sessionToMockUser(user, profile, data?.totalXp, data?.streakDays);

  if (loadingData && !data) {
    return (
      <StudyShellView activeRoute="dashboard" user={shellUser}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-surface-inset" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="h-56 animate-pulse rounded-xl bg-surface-inset xl:col-span-8" />
            <div className="h-56 animate-pulse rounded-xl bg-surface-inset xl:col-span-4" />
          </div>
        </div>
      </StudyShellView>
    );
  }

  if (!data) {
    return (
      <StudyShellView activeRoute="dashboard" user={shellUser}>
        <div className="rounded-xl border border-danger-border bg-danger-tint p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">
            Could not load Academic Workspace
          </h2>
          <p className="text-xs text-foreground-muted">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadDashboard()}>
            Retry
          </Button>
        </div>
      </StudyShellView>
    );
  }

  const viewProps = mapDashboardDtoToViewProps(data);
  const referenceDateIso = new Date().toISOString().slice(0, 10);

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
      <StudyDashboardView
        user={shellUser}
        boardTabs={viewProps.boardTabs}
        subjectsByBoard={viewProps.subjectsByBoard}
        countdowns={viewProps.countdowns}
        recentActivity={viewProps.recentActivity}
        referenceDateIso={referenceDateIso}
        initialState={viewProps.initialState}
        activeBoard={data.activeBoard}
        mathsSuiteSummary={data.mathsSuiteSummary}
        disableLocalStorage={true}
        onBoardChange={(boardId: CurriculumBoardId) => {
          setData((prev) => (prev ? { ...prev, activeBoard: boardId } : prev));
          void updateStudyActiveBoardApi(boardId).catch((err) => {
            setErrorMessage(
              err instanceof Error ? err.message : 'Failed to switch board.'
            );
          });
        }}
        onToggleSubjectCheckIn={(boardId: CurriculumBoardId, subjectId: string) => {
          void toggleStudySubjectCheckInApi(subjectId, boardId)
            .then((res) => {
              setData((prev) => {
                if (!prev) return prev;
                const currentList = prev.reviewedSubjectIdsByBoard[boardId] ?? [];
                const nextList = res.reviewedToday
                  ? Array.from(new Set([...currentList, subjectId]))
                  : currentList.filter((id) => id !== subjectId);
                return {
                  ...prev,
                  totalXp: res.totalXp,
                  streakDays: res.streakDays,
                  reviewedSubjectIdsByBoard: {
                    ...prev.reviewedSubjectIdsByBoard,
                    [boardId]: nextList,
                  },
                };
              });
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to toggle daily check-in.'
              );
            });
        }}
        onToggleExamPin={(examId: string) => {
          const currentlyPinned = data.pinnedExamIds.includes(examId);
          void updateStudyCountdownFlagsApi(examId, { pinned: !currentlyPinned })
            .then((updated) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      pinnedExamIds: updated.pinned
                        ? Array.from(new Set([...prev.pinnedExamIds, examId]))
                        : prev.pinnedExamIds.filter((id) => id !== examId),
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to toggle pin.'
              );
            });
        }}
        onToggleExamFlowSync={(examId: string) => {
          const currentlySynced = data.flowSyncedExamIds.includes(examId);
          void updateStudyCountdownFlagsApi(examId, { syncedToFlow: !currentlySynced })
            .then((updated) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      flowSyncedExamIds: updated.syncedToFlow
                        ? Array.from(new Set([...prev.flowSyncedExamIds, examId]))
                        : prev.flowSyncedExamIds.filter((id) => id !== examId),
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to toggle Flow sync.'
              );
            });
        }}
      />
    </div>
  );
}
