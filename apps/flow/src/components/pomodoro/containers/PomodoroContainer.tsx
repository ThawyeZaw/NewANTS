'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { emitMiloCheer, type MockUserProfile, type UserRole } from '@ants/ui';
import { useSession } from '@ants/auth-client';
import {
  fetchFlowPomodoroState,
  fetchFlowTasks,
  logFlowPomodoroSession,
  mapPomodoroDtoToPersisted,
  saveFlowPomodoroSettings,
  syncFlowTasks,
} from '../../../lib/flow-api';
import type {
  PomodoroPersistedState,
  PomodoroSessionRecord,
  PomodoroSettings,
  PomodoroTask,
} from '../../../lib/pomodoro/engine';
import type { PlannerTask } from '../../../lib/tasks/engine';
import { PomodoroView } from '../views/PomodoroView';

export function PomodoroContainer() {
  const { status, user, profile } = useSession();
  const [hydrationKey, setHydrationKey] = useState(0);
  const [d1State, setD1State] = useState<PomodoroPersistedState | undefined>(undefined);
  const [d1TasksMap, setD1TasksMap] = useState<Map<string, PlannerTask>>(new Map());
  const settingsTimerRef = useRef<number | null>(null);
  const tasksTimerRef = useRef<number | null>(null);

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
      telegramConnected: profile?.telegramStatus === 'linked' || profile?.telegramStatus === 'connected',
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
        const [pomodoroDto, tasksDto] = await Promise.all([
          fetchFlowPomodoroState(),
          fetchFlowTasks(),
        ]);
        if (cancelled) return;
        const map = new Map<string, PlannerTask>();
        for (const t of tasksDto.tasks) {
          map.set(t.id, {
            id: t.id,
            title: t.title,
            notes: t.notes || undefined,
            priority: t.priority,
            dueDate: t.dueDateIso ?? undefined,
            tags: t.tags,
            estimatedMinutes: t.estimatedMinutes,
            pomodorosPlanned: t.pomodorosPlanned,
            pomodorosDone: t.pomodorosDone,
            inTodayFocus: t.inTodayFocus,
            done: t.done,
            subtasks: t.subtasks,
            linkedBlockId: t.linkedBlockId ?? undefined,
            createdAt: t.createdAt,
          });
        }
        setD1TasksMap(map);
        setD1State(mapPomodoroDtoToPersisted(pomodoroDto, tasksDto.tasks));
        setHydrationKey((k) => k + 1);
      } catch {
        // Keep view responsive even if backend sync is temporarily offline
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    return () => {
      if (settingsTimerRef.current) window.clearTimeout(settingsTimerRef.current);
      if (tasksTimerRef.current) window.clearTimeout(tasksTimerRef.current);
    };
  }, []);

  const handleSessionLogged = (record: PomodoroSessionRecord) => {
    if (!isAuthenticated) return;
    void logFlowPomodoroSession(record)
      .then((logged) => {
        if (logged.xpAwarded > 0) {
          emitMiloCheer({
            message: `Celebrate focus! Logged ${Math.max(1, Math.round(logged.durationSeconds / 60))}m Pomodoro to your D1 ledger.`,
            mood: 'celebrating',
            badge: '+15 XP synced',
          });
        }
      })
      .catch(() => {
        // Silent retry fallback on next session
      });
  };

  const handleSettingsChange = (settings: PomodoroSettings) => {
    if (!isAuthenticated) return;
    if (settingsTimerRef.current) window.clearTimeout(settingsTimerRef.current);
    settingsTimerRef.current = window.setTimeout(() => {
      void saveFlowPomodoroSettings(settings).catch(() => {});
    }, 350);
  };

  const handleTasksChange = (pomodoroTasks: PomodoroTask[]) => {
    if (!isAuthenticated) return;
    if (tasksTimerRef.current) window.clearTimeout(tasksTimerRef.current);
    tasksTimerRef.current = window.setTimeout(() => {
      const merged: PlannerTask[] = pomodoroTasks.map((pt) => {
        const existing = d1TasksMap.get(pt.id);
        return {
          id: pt.id,
          title: pt.title,
          notes: existing?.notes,
          priority: existing?.priority ?? 'P2',
          dueDate: existing?.dueDate,
          tags: existing?.tags ?? [],
          estimatedMinutes: existing?.estimatedMinutes ?? pt.estimatedPomodoros * 25,
          pomodorosPlanned: pt.estimatedPomodoros,
          pomodorosDone: pt.completedPomodoros,
          inTodayFocus: existing?.inTodayFocus ?? true,
          done: pt.done,
          subtasks: existing?.subtasks ?? [],
          linkedBlockId: existing?.linkedBlockId,
          createdAt: existing?.createdAt ?? pt.createdAt,
        };
      });
      void syncFlowTasks(merged).catch(() => {});
    }, 400);
  };

  if (isAuthenticated && !d1State) {
    return <PomodoroView persistToLocalStorage={false} user={activeUser} />;
  }

  return (
    <PomodoroView
      key={isAuthenticated ? `d1-${hydrationKey}` : 'guest'}
      initialState={isAuthenticated ? d1State : undefined}
      persistToLocalStorage={!isAuthenticated}
      user={activeUser}
      onSessionLogged={handleSessionLogged}
      onSettingsChange={handleSettingsChange}
      onTasksChange={handleTasksChange}
    />
  );
}
