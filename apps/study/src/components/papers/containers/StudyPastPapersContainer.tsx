'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import type { StudyPastPapersResponseDto } from '@ants/shared-types';
import {
  deleteStudyPastPaperAttemptApi,
  fetchStudyPastPapersApi,
  LOADING_STUDY_SHELL_USER,
  logStudyPastPaperAttemptApi,
  mapPastPapersDtoToViewProps,
  sessionToMockUser,
} from '../../../lib/study-api';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { StudyPastPapersView } from '../views/StudyPastPapersView';

export interface StudyPastPapersContainerProps {
  initialSubjectId?: string;
  embedded?: boolean;
}

export function StudyPastPapersContainer({
  initialSubjectId = 'edexcel-ial-maths',
  embedded = false,
}: StudyPastPapersContainerProps) {
  const { status, user, profile } = useSession();
  const [activeSubjectId, setActiveSubjectId] = useState(initialSubjectId);
  const [data, setData] = useState<StudyPastPapersResponseDto | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPapers = useCallback(async (subjectId: string) => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const dto = await fetchStudyPastPapersApi(subjectId);
      setData(dto);
      setActiveSubjectId(dto.selectedSubjectId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load Past Paper matrix from D1.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    setActiveSubjectId(initialSubjectId);
  }, [initialSubjectId]);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadPapers(activeSubjectId);
    } else {
      setData(null);
    }
  }, [status, activeSubjectId, loadPapers]);

  if (status === 'loading') {
    if (embedded) {
      return <div className="h-64 w-full animate-pulse rounded-xl bg-surface-inset" />;
    }
    return (
      <StudyShellView activeRoute="past-papers" user={LOADING_STUDY_SHELL_USER}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <StudyPastPapersView
        user={null}
        embedded={embedded}
        initialSubjectId={activeSubjectId}
        disableLocalStorage={true}
      />
    );
  }

  const shellUser = sessionToMockUser(user, profile, data?.totalXp, data?.streakDays);

  if (loadingData && !data) {
    if (embedded) {
      return <div className="h-64 w-full animate-pulse rounded-xl bg-surface-inset" />;
    }
    return (
      <StudyShellView activeRoute="past-papers" user={shellUser}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-64 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (!data) {
    if (embedded) {
      return (
        <div className="rounded-xl border border-danger-border bg-danger-tint p-5 space-y-2">
          <p className="text-xs font-semibold text-foreground">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadPapers(activeSubjectId)}>
            Retry
          </Button>
        </div>
      );
    }
    return (
      <StudyShellView activeRoute="past-papers" user={shellUser}>
        <div className="rounded-xl border border-danger-border bg-danger-tint p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">
            Could not load Past Paper Tracker
          </h2>
          <p className="text-xs text-foreground-muted">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadPapers(activeSubjectId)}>
            Retry
          </Button>
        </div>
      </StudyShellView>
    );
  }

  const viewProps = mapPastPapersDtoToViewProps(data);

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
      <StudyPastPapersView
        user={shellUser}
        subjects={viewProps.subjects}
        seriesList={viewProps.seriesList}
        rows={viewProps.rows}
        initialSubjectId={data.selectedSubjectId}
        initialState={viewProps.initialState}
        embedded={embedded}
        disableLocalStorage={true}
        enrolledSubjectIds={data.enrolledSubjectIds}
        activeMathsCashInCode={data.activeMathsCashIn}
        activeMathsCashInUnits={data.activeMathsUnits}
        onSubjectChange={(nextSubjectId) => {
          setActiveSubjectId(nextSubjectId);
        }}
        onAttemptSaved={(attempt) => {
          void logStudyPastPaperAttemptApi({
            subjectId: attempt.subjectId,
            pastPaperId: attempt.rowId,
            paperCode: attempt.paperCode,
            seriesId: attempt.seriesId,
            rawScore: Math.round(attempt.rawScore),
            maxRaw: Math.round(attempt.maxRaw),
            timed: attempt.timed,
            weakTopics: attempt.weakTopics,
            reflectionNotes: attempt.notes,
            attemptedAtIso: attempt.loggedAtIso,
          })
            .then((res) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      attempts: [
                        res.attempt,
                        ...prev.attempts.filter((a) => a.id !== attempt.id),
                      ],
                      earnedPaperXp: prev.earnedPaperXp + res.xpAwardedNow,
                      totalXp: res.totalXp,
                      streakDays: res.streakDays,
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to save past paper attempt.'
              );
            });
        }}
        onAttemptDeleted={(attemptId) => {
          void deleteStudyPastPaperAttemptApi(attemptId)
            .then(() => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      attempts: prev.attempts.filter((a) => a.id !== attemptId),
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to delete past paper attempt.'
              );
            });
        }}
      />
    </div>
  );
}
