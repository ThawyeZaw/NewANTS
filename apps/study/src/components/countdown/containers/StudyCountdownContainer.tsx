'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import type { StudyCountdownsResponseDto } from '@ants/shared-types';
import {
  deleteStudyCountdownApi,
  fetchStudyCountdownsApi,
  LOADING_STUDY_SHELL_USER,
  mapCountdownsResponseToViewProps,
  saveStudyCountdownApi,
  sessionToMockUser,
  updateStudyCountdownFlagsApi,
} from '../../../lib/study-api';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { StudyCountdownView } from '../views/StudyCountdownView';

export function StudyCountdownContainer() {
  const { status, user, profile } = useSession();
  const [data, setData] = useState<StudyCountdownsResponseDto | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCountdowns = useCallback(async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const dto = await fetchStudyCountdownsApi();
      setData(dto);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load Exam Countdowns from D1.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadCountdowns();
    } else {
      setData(null);
    }
  }, [status, loadCountdowns]);

  if (status === 'loading') {
    return (
      <StudyShellView activeRoute="countdown" user={LOADING_STUDY_SHELL_USER}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <StudyCountdownView
        user={null}
        disableLocalStorage={true}
      />
    );
  }

  const shellUser = sessionToMockUser(user, profile);

  if (loadingData && !data) {
    return (
      <StudyShellView activeRoute="countdown" user={shellUser}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (!data) {
    return (
      <StudyShellView activeRoute="countdown" user={shellUser}>
        <div className="rounded-xl border border-danger-border bg-danger-tint p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">
            Could not load Exam Countdowns
          </h2>
          <p className="text-xs text-foreground-muted">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadCountdowns()}>
            Retry
          </Button>
        </div>
      </StudyShellView>
    );
  }

  const viewProps = mapCountdownsResponseToViewProps(data);

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
      <StudyCountdownView
        user={shellUser}
        baseExams={viewProps.baseExams}
        initialCountdownsState={viewProps.initialCountdownsState}
        initialDashboardState={viewProps.initialDashboardState}
        disableLocalStorage={true}
        onSaveCustomExam={(entry, flags) => {
          const isNewLocal = entry.id.startsWith('custom_exam_');
          void saveStudyCountdownApi({
            ...(isNewLocal ? {} : { id: entry.id }),
            boardId: entry.boardId,
            paperCode: entry.paperCode,
            title: entry.title,
            examDateIso: entry.examDateIso,
            examTime24h: entry.examTime24h,
            targetGrade: entry.targetGrade,
            category: entry.category,
            isCustom: entry.isCustom,
            isMock: entry.isMock,
            colorTag: entry.colorTag,
            ...(entry.venueOrNotes ? { venueOrNotes: entry.venueOrNotes } : {}),
            pinned: flags?.pinned ?? entry.defaultPinned,
            syncedToFlow: flags?.syncedToFlow ?? entry.defaultSyncedToFlow,
          })
            .then((saved) => {
              setData((prev) => {
                if (!prev) return prev;
                const filtered = prev.countdowns.filter(
                  (c) => c.id !== saved.id && c.id !== entry.id
                );
                const nextList = [...filtered, saved];
                return {
                  ...prev,
                  countdowns: nextList,
                  pinnedExamIds: nextList.filter((c) => c.pinned).map((c) => c.id),
                  flowSyncedExamIds: nextList.filter((c) => c.syncedToFlow).map((c) => c.id),
                  enrolledBoards: Array.from(new Set(nextList.map((c) => c.boardId))),
                };
              });
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to save exam countdown.'
              );
            });
        }}
        onDeleteCustomExam={(examId) => {
          void deleteStudyCountdownApi(examId)
            .then(() => {
              setData((prev) => {
                if (!prev) return prev;
                const nextList = prev.countdowns.filter((c) => c.id !== examId);
                return {
                  ...prev,
                  countdowns: nextList,
                  pinnedExamIds: prev.pinnedExamIds.filter((id) => id !== examId),
                  flowSyncedExamIds: prev.flowSyncedExamIds.filter((id) => id !== examId),
                };
              });
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to delete exam countdown.'
              );
            });
        }}
        onTogglePin={(examId) => {
          const currentlyPinned = data.pinnedExamIds.includes(examId);
          void updateStudyCountdownFlagsApi(examId, { pinned: !currentlyPinned })
            .then((updated) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      countdowns: prev.countdowns.map((c) =>
                        c.id === examId ? updated : c
                      ),
                      pinnedExamIds: updated.pinned
                        ? Array.from(new Set([...prev.pinnedExamIds, examId]))
                        : prev.pinnedExamIds.filter((id) => id !== examId),
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to toggle dashboard pin.'
              );
            });
        }}
        onToggleFlowSync={(examId) => {
          const currentlySynced = data.flowSyncedExamIds.includes(examId);
          void updateStudyCountdownFlagsApi(examId, { syncedToFlow: !currentlySynced })
            .then((updated) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      countdowns: prev.countdowns.map((c) =>
                        c.id === examId ? updated : c
                      ),
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
