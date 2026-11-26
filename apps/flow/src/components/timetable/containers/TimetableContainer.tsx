'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MockUserProfile, UserRole } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import {
  buildTimetableStateFromBootstrap,
  deleteFlowTimetableBlock,
  fetchFlowTasks,
  fetchFlowTimetableBootstrap,
  mapFlowTaskDtoToPlanner,
  mapSyncedExams,
  saveFlowTimetableBlock,
} from '../../../lib/flow-api';
import {
  toIsoDate,
  type ReminderLeadMinutes,
  type SyncedExamCountdown,
  type TimetableBlock,
  type TimetablePersistedState,
} from '../../../lib/timetable/engine';
import { MOCK_SYNCED_EXAMS } from '../../../mocks/timetable.mock';
import { SmartTimetableView } from '../views/SmartTimetableView';

export function TimetableContainer() {
  const { status, user, profile } = useSession();
  const [hydrationKey, setHydrationKey] = useState(0);
  const [d1State, setD1State] = useState<TimetablePersistedState | undefined>(undefined);
  const [d1Exams, setD1Exams] = useState<SyncedExamCountdown[]>(MOCK_SYNCED_EXAMS);
  const latestBlocksRef = useRef<TimetableBlock[]>([]);

  const isAuthenticated = status === 'authenticated' && Boolean(user);

  const activeUser: MockUserProfile | null = useMemo(() => {
    if (!isAuthenticated || !user) return null;
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      roles: user.roles as UserRole[],
      xp: profile?.xp ?? 0,
      streakDays: profile?.streakDays ?? 0,
      telegramConnected:
        profile?.telegramStatus === 'linked' || profile?.telegramStatus === 'connected',
      curriculumLabel: profile?.curriculumLabel,
    };
  }, [isAuthenticated, user, profile]);

  useEffect(() => {
    if (!isAuthenticated) {
      setD1State(undefined);
      setD1Exams(MOCK_SYNCED_EXAMS);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const [bootstrap, tasksRes] = await Promise.all([
          fetchFlowTimetableBootstrap(),
          fetchFlowTasks(),
        ]);
        if (cancelled) return;
        const todayIso = toIsoDate(new Date());
        const nextState = buildTimetableStateFromBootstrap(
          bootstrap,
          todayIso,
          tasksRes.tasks.map(mapFlowTaskDtoToPlanner)
        );
        latestBlocksRef.current = nextState.blocks;
        setD1State(nextState);
        setD1Exams(mapSyncedExams(bootstrap));
        setHydrationKey((k) => k + 1);
      } catch {
        // Keep interactive state if network request fails
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const handleStateChange = (nextState: TimetablePersistedState) => {
    latestBlocksRef.current = nextState.blocks;
  };

  const handleBlockSaved = (block: TimetableBlock, isNew: boolean) => {
    if (!isAuthenticated) return;
    void saveFlowTimetableBlock(block, isNew).catch(() => {});
  };

  const handleBlockDeleted = (blockId: string) => {
    if (!isAuthenticated) return;
    void deleteFlowTimetableBlock(blockId).catch(() => {});
  };

  const handleReminderSaved = (
    blockId: string,
    config: { enabled: boolean; leadMinutes: ReminderLeadMinutes; note?: string }
  ) => {
    if (!isAuthenticated) return;
    const target = latestBlocksRef.current.find((b) => b.id === blockId);
    if (!target) return;
    void saveFlowTimetableBlock(
      {
        ...target,
        telegramReminder: config,
      },
      false
    ).catch(() => {});
  };

  if (isAuthenticated && !d1State) {
    return (
      <SmartTimetableView
        exams={MOCK_SYNCED_EXAMS}
        persistToLocalStorage={false}
        user={activeUser}
      />
    );
  }

  return (
    <SmartTimetableView
      key={isAuthenticated ? `d1-${hydrationKey}` : 'guest'}
      initialState={isAuthenticated ? d1State : undefined}
      exams={isAuthenticated ? d1Exams : MOCK_SYNCED_EXAMS}
      persistToLocalStorage={!isAuthenticated}
      user={activeUser}
      onStateChange={handleStateChange}
      onBlockSaved={handleBlockSaved}
      onBlockDeleted={handleBlockDeleted}
      onReminderSaved={handleReminderSaved}
    />
  );
}
