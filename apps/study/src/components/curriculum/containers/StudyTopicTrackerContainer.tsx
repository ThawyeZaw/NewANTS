'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import type {
  StudyTopicsResponseDto,
  TopicConfidenceStatus,
} from '@ants/shared-types';
import {
  fetchStudyTopicsApi,
  LOADING_STUDY_SHELL_USER,
  mapTopicsDtoToViewProps,
  sessionToMockUser,
  upsertStudyTopicProgressApi,
} from '../../../lib/study-api';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { StudyTopicTrackerView } from '../views/StudyTopicTrackerView';
import { StudyPastPapersContainer } from '../../papers/containers/StudyPastPapersContainer';

export interface StudyTopicTrackerContainerProps {
  initialSubjectId?: string;
  embedded?: boolean;
}

export function StudyTopicTrackerContainer({
  initialSubjectId = 'edexcel-ial-maths',
  embedded = false,
}: StudyTopicTrackerContainerProps) {
  const { status, user, profile } = useSession();
  const [activeSubjectId, setActiveSubjectId] = useState(initialSubjectId);
  const [data, setData] = useState<StudyTopicsResponseDto | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTopics = useCallback(async (subjectId: string) => {
    setLoadingData(true);
    setErrorMessage(null);
    try {
      const dto = await fetchStudyTopicsApi(subjectId);
      setData(dto);
      setActiveSubjectId(dto.selectedSubjectId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load syllabus topics from D1.'
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
      void loadTopics(activeSubjectId);
    } else {
      setData(null);
    }
  }, [status, activeSubjectId, loadTopics]);

  if (status === 'loading') {
    if (embedded) {
      return <div className="h-64 w-full animate-pulse rounded-xl bg-surface-inset" />;
    }
    return (
      <StudyShellView activeRoute="curriculum" user={LOADING_STUDY_SHELL_USER}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-48 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return (
      <StudyTopicTrackerView
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
      <StudyShellView activeRoute="curriculum" user={shellUser}>
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-surface-inset" />
          <div className="h-48 w-full animate-pulse rounded-xl bg-surface-inset" />
        </div>
      </StudyShellView>
    );
  }

  if (!data) {
    if (embedded) {
      return (
        <div className="rounded-xl border border-danger-border bg-danger-tint p-5 space-y-2">
          <p className="text-xs font-semibold text-foreground">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadTopics(activeSubjectId)}>
            Retry
          </Button>
        </div>
      );
    }
    return (
      <StudyShellView activeRoute="curriculum" user={shellUser}>
        <div className="rounded-xl border border-danger-border bg-danger-tint p-6 space-y-3">
          <h2 className="text-base font-bold text-foreground">
            Could not load Syllabus Topics
          </h2>
          <p className="text-xs text-foreground-muted">{errorMessage}</p>
          <Button size="sm" variant="primary" onClick={() => void loadTopics(activeSubjectId)}>
            Retry
          </Button>
        </div>
      </StudyShellView>
    );
  }

  const viewProps = mapTopicsDtoToViewProps(data);

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
      <StudyTopicTrackerView
        user={shellUser}
        subjects={viewProps.subjects}
        topics={viewProps.topics}
        initialSubjectId={data.selectedSubjectId}
        initialState={viewProps.initialState}
        embedded={embedded}
        disableLocalStorage={true}
        activeMathsCashInCode={data.activeMathsCashIn}
        activeMathsCashInUnits={data.activeMathsUnits}
        renderPastPapers={(subjId) => (
          <StudyPastPapersContainer embedded={true} initialSubjectId={subjId} />
        )}
        onSubjectChange={(nextSubjectId) => {
          setActiveSubjectId(nextSubjectId);
        }}
        onToggleSubtopic={(topicId, subtopicId, completed) => {
          const topicDto = data.topics.find((t) => t.id === topicId);
          if (!topicDto) return;
          const topicSubIds = new Set(topicDto.subtopics.map((s) => s.id));
          const otherCompleted = data.completedSubtopicIds.filter((id) => !topicSubIds.has(id));
          const currentForTopic = data.completedSubtopicIds.filter((id) => topicSubIds.has(id));
          const nextForTopic = completed
            ? Array.from(new Set([...currentForTopic, subtopicId]))
            : currentForTopic.filter((id) => id !== subtopicId);

          void upsertStudyTopicProgressApi(topicId, {
            subjectId: topicDto.subjectId,
            completedSubtopicIds: nextForTopic,
          })
            .then((res) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      completedSubtopicIds: [...otherCompleted, ...res.completedSubtopicIds],
                      statusOverrideByTopicId: {
                        ...prev.statusOverrideByTopicId,
                        [topicId]: res.status,
                      },
                      totalXp: res.totalXp,
                      streakDays: res.streakDays,
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to save subtopic completion.'
              );
            });
        }}
        onChangeTopicStatus={(topicId, nextStatus: TopicConfidenceStatus) => {
          const topicDto = data.topics.find((t) => t.id === topicId);
          if (!topicDto) return;
          const nextSubIds =
            nextStatus === 'mastered'
              ? topicDto.subtopics.map((s) => s.id)
              : nextStatus === 'not_started'
                ? []
                : undefined;

          void upsertStudyTopicProgressApi(topicId, {
            subjectId: topicDto.subjectId,
            status: nextStatus,
            ...(nextSubIds !== undefined ? { completedSubtopicIds: nextSubIds } : {}),
          })
            .then((res) => {
              const topicSubSet = new Set(topicDto.subtopics.map((s) => s.id));
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      completedSubtopicIds: [
                        ...prev.completedSubtopicIds.filter((id) => !topicSubSet.has(id)),
                        ...res.completedSubtopicIds,
                      ],
                      statusOverrideByTopicId: {
                        ...prev.statusOverrideByTopicId,
                        [topicId]: res.status,
                      },
                      totalXp: res.totalXp,
                      streakDays: res.streakDays,
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to update topic status.'
              );
            });
        }}
        onSaveTopicNote={(topicId, noteText) => {
          const topicDto = data.topics.find((t) => t.id === topicId);
          if (!topicDto) return;
          void upsertStudyTopicProgressApi(topicId, {
            subjectId: topicDto.subjectId,
            personalNote: noteText,
          })
            .then((res) => {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      notesByTopicId: {
                        ...prev.notesByTopicId,
                        [topicId]: res.personalNote,
                      },
                    }
                  : prev
              );
            })
            .catch((err) => {
              setErrorMessage(
                err instanceof Error ? err.message : 'Failed to save topic note.'
              );
            });
        }}
      />
    </div>
  );
}
