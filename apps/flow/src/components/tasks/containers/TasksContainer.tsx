'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MockUserProfile, UserRole } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import {
  buildTasksStateFromDtos,
  fetchFlowTasks,
  saveFlowTimetableBlock,
  syncFlowTasks,
} from '../../../lib/flow-api';
import type { PlannerTask, TasksPersistedState } from '../../../lib/tasks/engine';
import { toIsoDate, type TimetableBlock } from '../../../lib/timetable/engine';
import { TaskPlannerView } from '../views/TaskPlannerView';

export function TasksContainer() {
  const { status, user, profile } = useSession();
  const [hydrationKey, setHydrationKey] = useState(0);
  const [d1State, setD1State] = useState<TasksPersistedState | undefined>(undefined);
  const syncTimerRef = useRef<number | null>(null);

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
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchFlowTasks();
        if (cancelled) return;
        const todayIso = toIsoDate(new Date());
        setD1State(buildTasksStateFromDtos(res.tasks, todayIso));
        setHydrationKey((k) => k + 1);
      } catch {
        // Keep interactive state on transient network failure
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  const handleStateChange = (nextState: TasksPersistedState) => {
    if (!isAuthenticated) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      void syncFlowTasks(nextState.tasks).catch(() => {});
    }, 350);
  };

  const handleTaskScheduled = (_task: PlannerTask, block: TimetableBlock) => {
    if (!isAuthenticated) return;
    void saveFlowTimetableBlock(block, true).catch(() => {});
  };

  if (isAuthenticated && !d1State) {
    return <TaskPlannerView persistToLocalStorage={false} user={activeUser} />;
  }

  return (
    <TaskPlannerView
      key={isAuthenticated ? `d1-${hydrationKey}` : 'guest'}
      initialState={isAuthenticated ? d1State : undefined}
      persistToLocalStorage={!isAuthenticated}
      user={activeUser}
      onStateChange={handleStateChange}
      onTaskScheduled={handleTaskScheduled}
    />
  );
}
