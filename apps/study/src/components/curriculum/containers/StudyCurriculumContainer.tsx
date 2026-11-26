'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import type {
  CurriculumBoardId,
  EdexcelMathsCashInCode,
  EdexcelMathsUnitCode,
  StudyCatalogResponseDto,
} from '@ants/shared-types';
import {
  fetchStudyCatalog,
  LOADING_STUDY_SHELL_USER,
  mapCatalogDtoToCurriculumState,
  mapCatalogSubjectDto,
  sessionToMockUser,
  toggleStudyEnrollmentApi,
  updateStudyActiveBoardApi,
  updateStudyMathsSuiteApi,
  updateStudyTargetGradeApi,
} from '../../../lib/study-api';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { StudyCurriculumCatalogView } from '../views/StudyCurriculumCatalogView';
import { StudyTopicTrackerContainer } from './StudyTopicTrackerContainer';
import { StudyPastPapersContainer } from '../../papers/containers/StudyPastPapersContainer';

export function StudyCurriculumContainer() {
  const { status, user, profile } = useSession();
  const [catalog, setCatalog] = useState<StudyCatalogResponseDto | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const dto = await fetchStudyCatalog();
      setCatalog(dto);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load curriculum catalog from D1.'
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void loadCatalog();
    } else {
      setCatalog(null);
    }
  }, [status, loadCatalog]);

  if (status === 'loading') {
    return (
      <StudyShellView activeRoute="curriculum" user={LOADING_STUDY_SHELL_USER}>
        <div className="space-y-4">
          <div className="h-10 w-72 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-surface-inset" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-44 animate-pulse rounded-xl bg-surface-inset" />
            <div className="h-44 animate-pulse rounded-xl bg-surface-inset" />
          </div>
        </div>
      </StudyShellView>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <StudyCurriculumCatalogView
        user={null}
        disableLocalStorage={true}
      />
    );
  }

  const shellUser = sessionToMockUser(user, profile);

  if (loadingData && !catalog) {
    return (
      <StudyShellView activeRoute="curriculum" user={shellUser}>
        <div className="space-y-4">
          <div className="h-10 w-72 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-surface-inset" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-44 animate-pulse rounded-xl bg-surface-inset" />
            <div className="h-44 animate-pulse rounded-xl bg-surface-inset" />
          </div>
        </div>
      </StudyShellView>
    );
  }

  if (!catalog) {
    return (
      <StudyShellView activeRoute="curriculum" user={shellUser}>
        <div className="rounded-xl border border-danger-border bg-danger-tint p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">
            Could not load Study Curriculum Catalog
          </h2>
          <p className="text-xs text-foreground-muted">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadCatalog()}>
            Retry
          </Button>
        </div>
      </StudyShellView>
    );
  }

  const curriculumState = mapCatalogDtoToCurriculumState(catalog);

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
      <StudyCurriculumCatalogView
        user={shellUser}
        boards={catalog.boards}
        subjects={catalog.subjects.map(mapCatalogSubjectDto)}
        initialState={curriculumState}
        disableLocalStorage={true}
        renderTopicTracker={(subjectId) => (
          <StudyTopicTrackerContainer embedded={true} initialSubjectId={subjectId} />
        )}
        renderPastPapers={(subjectId) => (
          <StudyPastPapersContainer embedded={true} initialSubjectId={subjectId} />
        )}
        onBoardChange={(boardId: CurriculumBoardId) => {
          setCatalog((prev) => (prev ? { ...prev, activeBoard: boardId } : prev));
          void updateStudyActiveBoardApi(boardId).catch((err) => {
            setErrorMessage(
              err instanceof Error ? err.message : 'Failed to save active board.'
            );
          });
        }}
        onToggleEnrollSubject={(subjectId: string, enrolled: boolean) => {
          void toggleStudyEnrollmentApi({ subjectId, enrolled })
            .then((res) => {
              setCatalog((prev) =>
                prev ? { ...prev, enrolledSubjectIds: res.enrolledSubjectIds } : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to update subject enrollment.'
              );
            });
        }}
        onChangeTargetGrade={(subjectId: string, grade: string) => {
          setCatalog((prev) =>
            prev
              ? {
                  ...prev,
                  targetGradeBySubjectId: {
                    ...prev.targetGradeBySubjectId,
                    [subjectId]: grade,
                  },
                }
              : prev
          );
          void updateStudyTargetGradeApi({ subjectId, targetGrade: grade }).catch((err) => {
            setErrorMessage(
              err instanceof Error ? err.message : 'Failed to save target grade.'
            );
          });
        }}
        onChangeMathsSuite={(
          cashInCode: EdexcelMathsCashInCode,
          units: EdexcelMathsUnitCode[],
          enrolledCashIns: EdexcelMathsCashInCode[]
        ) => {
          const nextUnitsByCashIn = {
            ...catalog.mathsSuite.unitsByCashIn,
            [cashInCode]: units,
          };
          setCatalog((prev) =>
            prev
              ? {
                  ...prev,
                  mathsSuite: {
                    ...prev.mathsSuite,
                    activeCashIn: cashInCode,
                    enrolledCashIns,
                    unitsByCashIn: nextUnitsByCashIn,
                  },
                }
              : prev
          );
          void updateStudyMathsSuiteApi({
            activeCashIn: cashInCode,
            enrolledCashIns,
            unitsByCashIn: nextUnitsByCashIn,
          })
            .then((res) => {
              setCatalog((prev) =>
                prev
                  ? {
                      ...prev,
                      enrolledSubjectIds: res.enrolledSubjectIds,
                      mathsSuite: res.mathsSuite,
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error
                  ? err.message
                  : 'Failed to persist WMA11-SET cash-in configuration.'
              );
            });
        }}
      />
    </div>
  );
}
