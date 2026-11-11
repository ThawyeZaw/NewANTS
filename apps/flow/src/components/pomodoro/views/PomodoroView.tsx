'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Maximize2, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { cn, type MockUserProfile } from '@ants/ui';
import {
  PHASE_LABELS,
  abandonInterval,
  applySettings,
  clampNumber,
  createId,
  estimateFinishTime,
  finishInterval,
  formatClock,
  getProgress,
  getRemainingMs,
  pauseTimer,
  startTimer,
  type PomodoroPersistedState,
  type PomodoroPhase,
  type PomodoroSessionRecord,
  type PomodoroSettings,
  type PomodoroTask,
} from '../../../lib/pomodoro/engine';
import { POMODORO_STORAGE_KEY, loadPomodoroState, savePomodoroState } from '../../../lib/pomodoro/storage';
import { ambientAudio, getAmbientSound, getFocusScene } from '../../../lib/pomodoro/ambient';
import { playClockTick, playClockTickSample, playFocusCue, playSound, unlockAudio } from '../../../lib/pomodoro/sound';
import {
  applyAppearance,
  enterFullscreen,
  exitFullscreen,
  getNotificationPermission,
  registerPomodoroServiceWorker,
  requestNotificationPermission,
  resolveThemeMode,
  showSystemNotification,
  type NotificationPermissionState,
} from '../../../lib/pomodoro/browser';
import { createMockPomodoroState } from '../../../mocks/pomodoro.mock';
import { FlowShellView, type FlowTabId } from '../../layout/views/FlowShellView';
import { FloatingMiniTimerView } from './FloatingMiniTimerView';
import { FocusModeView } from './FocusModeView';
import { PomodoroSettingsView, type SettingsTab } from './PomodoroSettingsView';
import { PomodoroStatsView } from './PomodoroStatsView';
import { ShortcutsModalView } from './ShortcutsModalView';
import { TaskListView } from './TaskListView';
import { TimerRingView } from './TimerRingView';

export interface PomodoroViewProps {
  /** Optional initial state (defaults to realistic mock data) */
  initialState?: PomodoroPersistedState;
  /** Whether to load & persist state in localStorage (default: true) */
  persistToLocalStorage?: boolean;
  /** Custom storage key */
  storageKey?: string;
  /** Optional authenticated user passed from Thaw's container */
  user?: MockUserProfile | null;
  /** Fired whenever a focus/break session is logged */
  onSessionLogged?: (record: PomodoroSessionRecord) => void;
  /** Fired whenever settings change */
  onSettingsChange?: (settings: PomodoroSettings) => void;
  /** Fired whenever tasks change */
  onTasksChange?: (tasks: PomodoroTask[]) => void;
}

const PHASES: PomodoroPhase[] = ['work', 'shortBreak', 'longBreak'];
const NEW_TASK_INPUT_ID = 'flow-pomodoro-new-task-input';

const roundButton =
  'inline-flex h-12 w-12 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function PomodoroView({
  initialState,
  persistToLocalStorage = true,
  storageKey = POMODORO_STORAGE_KEY,
  user = null,
  onSessionLogged,
  onSettingsChange,
  onTasksChange,
}: PomodoroViewProps) {
  const [state, setState] = useState<PomodoroPersistedState>(() => initialState ?? createMockPomodoroState());
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [tab, setTab] = useState<FlowTabId>('timer');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('timer');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusSoundMenuOpen, setFocusSoundMenuOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>('default');

  // Single write path: keeps the ref in sync so event handlers never read stale state,
  // and keeps side effects (sound, notifications, callbacks) out of React updaters.
  const commit = useCallback((next: PomodoroPersistedState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Hydrate from localStorage, apply optional `/pomodoro?task=...&pomodoros=...` handoff, + register PWA SW
  useEffect(() => {
    setNow(Date.now());
    let baseState = stateRef.current;
    if (persistToLocalStorage) {
      const saved = loadPomodoroState(storageKey);
      if (saved) baseState = saved;
    }
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const handoffTitle = params.get('task')?.trim().slice(0, 140);
      const handoffPomodoros = clampNumber(params.get('pomodoros'), 1, 20, 2);
      if (handoffTitle) {
        const existing = baseState.tasks.find(
          (t) => !t.done && t.title.toLowerCase() === handoffTitle.toLowerCase()
        );
        if (existing) {
          baseState = { ...baseState, activeTaskId: existing.id };
        } else {
          const newTask: PomodoroTask = {
            id: createId('task'),
            title: handoffTitle,
            estimatedPomodoros: handoffPomodoros,
            completedPomodoros: 0,
            done: false,
            createdAt: new Date().toISOString(),
          };
          baseState = {
            ...baseState,
            tasks: [newTask, ...baseState.tasks],
            activeTaskId: newTask.id,
          };
        }
      }
    }
    commit(baseState);
    setNotificationPermission(getNotificationPermission());
    registerPomodoroServiceWorker();
    setHydrated(true);
  }, [persistToLocalStorage, storageKey, commit]);

  useEffect(() => {
    if (!hydrated || !persistToLocalStorage) return;
    savePomodoroState(state, storageKey);
  }, [state, hydrated, persistToLocalStorage, storageKey]);

  useEffect(() => {
    const { mode, accent, font } = state.settings.appearance;
    applyAppearance(mode, accent, font);
    if (mode !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyAppearance(mode, accent, font);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [state.settings.appearance]);

  const alertTransition = useCallback((endedPhase: PomodoroPhase, nextPhase: PomodoroPhase, settings: PomodoroSettings) => {
    if (settings.sound.enabled) {
      playSound(endedPhase === 'work' ? settings.sound.workEndSound : settings.sound.breakEndSound, settings.sound.volume);
    }
    if (settings.notifications) {
      const title = endedPhase === 'work' ? 'Focus session done' : 'Break over';
      const body =
        endedPhase === 'work'
          ? `Time for a ${PHASE_LABELS[nextPhase].toLowerCase()}.`
          : 'Start your next focus session when you are ready.';
      void showSystemNotification(title, body);
    }
  }, []);

  // Wall-clock tick: remaining time is always derived from `endAt`, so background tabs never drift.
  useEffect(() => {
    const running = state.timer.status === 'running';
    const id = window.setInterval(
      () => {
        const t = Date.now();
        setNow(t);
        const current = stateRef.current;
        if (current.timer.status !== 'running' || current.timer.endAt === null || t < current.timer.endAt) return;
        const result = finishInterval(current, current.timer.endAt, true, t);
        commit(result.state);
        if (result.record) onSessionLogged?.(result.record);
        alertTransition(result.endedPhase, result.state.timer.phase, current.settings);
      },
      running ? 100 : 30_000
    );
    return () => window.clearInterval(id);
  }, [state.timer.status, commit, onSessionLogged, alertTransition]);

  // Count tab switches during focus and guard against accidental tab close.
  useEffect(() => {
    if (state.timer.status !== 'running' || state.timer.phase !== 'work') return;
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      const current = stateRef.current;
      commit({ ...current, timer: { ...current.timer, interruptions: current.timer.interruptions + 1 } });
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!stateRef.current.settings.focus.warnOnLeave) return;
      event.preventDefault();
      event.returnValue = '';
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [state.timer.status, state.timer.phase, commit]);

  const remainingMs = getRemainingMs(state.timer, now);
  const progress = getProgress(state.timer, state.settings, now);
  const timeLabel = formatClock(remainingMs);
  const currentSecond = Math.max(0, Math.ceil(remainingMs / 1000));
  const activeTask = useMemo(
    () => state.tasks.find((t) => t.id === state.activeTaskId && !t.done) ?? null,
    [state.tasks, state.activeTaskId]
  );
  const isWork = state.timer.phase === 'work';
  const isRunning = state.timer.status === 'running';
  const activeScene = getFocusScene(state.settings.ambient.scene);
  const activeAmbientSound = getAmbientSound(state.settings.ambient.sound);
  const lastTickSecondRef = useRef<number | null>(null);

  // Sync mechanical tick-tock playback to each elapsed second during running Focus intervals.
  useEffect(() => {
    if (
      !isRunning ||
      !isWork ||
      !state.settings.sound.ticking ||
      state.settings.sound.tickingVolume <= 0 ||
      currentSecond <= 0
    ) {
      lastTickSecondRef.current = null;
      return;
    }
    if (lastTickSecondRef.current === null) {
      lastTickSecondRef.current = currentSecond;
      return;
    }
    if (lastTickSecondRef.current !== currentSecond) {
      lastTickSecondRef.current = currentSecond;
      playClockTick(currentSecond % 2 === 0 ? 'tock' : 'tick', state.settings.sound.tickingVolume);
    }
  }, [isRunning, isWork, state.settings.sound.ticking, state.settings.sound.tickingVolume, currentSecond]);

  // Sync continuous Web Audio ambient soundscape with timer & focus state
  useEffect(() => {
    const { sound, volume, playOnlyDuringWork } = state.settings.ambient;
    const previewingAtmosphere =
      (settingsOpen && settingsTab === 'atmosphere') || (focusMode && focusSoundMenuOpen);
    const shouldPlay =
      sound !== 'off' &&
      (previewingAtmosphere || (playOnlyDuringWork ? isRunning && isWork : isRunning || focusMode));
    ambientAudio.sync(sound, volume, shouldPlay);
  }, [
    state.settings.ambient,
    isRunning,
    isWork,
    focusMode,
    focusSoundMenuOpen,
    settingsOpen,
    settingsTab,
  ]);

  useEffect(() => () => ambientAudio.stopAll(), []);

  useEffect(() => {
    document.title = state.timer.status === 'idle' ? 'Pomodoro · Flow' : `${timeLabel} ${PHASE_LABELS[state.timer.phase]} · Flow`;
  }, [timeLabel, state.timer.status, state.timer.phase]);

  const openFocusMode = useCallback(() => {
    setFocusMode(true);
    if (stateRef.current.settings.focus.fullscreen) void enterFullscreen();
  }, []);

  const closeFocusMode = useCallback(() => {
    setFocusSoundMenuOpen(false);
    setFocusMode(false);
    void exitFullscreen();
  }, []);

  // Leaving browser fullscreen (Esc is swallowed by the browser) also leaves focus mode.
  useEffect(() => {
    if (!focusMode) return;
    let wasFullscreen = Boolean(document.fullscreenElement);
    const onChange = () => {
      if (wasFullscreen && !document.fullscreenElement) setFocusMode(false);
      wasFullscreen = Boolean(document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [focusMode]);

  const toggleStartPause = useCallback(() => {
    unlockAudio();
    const t = Date.now();
    setNow(t);
    const current = stateRef.current;
    if (current.timer.status === 'running') {
      commit({ ...current, timer: pauseTimer(current.timer, t) });
      if (current.settings.sound.enabled) playFocusCue('pause', current.settings.sound.volume);
      return;
    }
    commit({ ...current, timer: startTimer(current.timer, t) });
    if (current.settings.sound.enabled) playFocusCue('start', current.settings.sound.volume);
    if (current.timer.phase === 'work' && current.settings.focus.autoEnterOnWork) openFocusMode();
  }, [commit, openFocusMode]);

  const reset = useCallback(() => {
    const t = Date.now();
    setNow(t);
    const result = abandonInterval(stateRef.current, t);
    commit(result.state);
    if (result.record) onSessionLogged?.(result.record);
  }, [commit, onSessionLogged]);

  const skip = useCallback(() => {
    const t = Date.now();
    setNow(t);
    const result = finishInterval(stateRef.current, t, false, t);
    commit(result.state);
    if (result.record) onSessionLogged?.(result.record);
  }, [commit, onSessionLogged]);

  const selectPhase = useCallback(
    (phase: PomodoroPhase) => {
      const current = stateRef.current;
      if (current.timer.phase === phase && current.timer.status === 'idle') return;
      const t = Date.now();
      setNow(t);
      const result = abandonInterval(current, t, phase);
      commit(result.state);
      if (result.record) onSessionLogged?.(result.record);
    },
    [commit, onSessionLogged]
  );

  const updateSettings = useCallback(
    (next: PomodoroSettings) => {
      commit(applySettings(stateRef.current, next));
      onSettingsChange?.(next);
    },
    [commit, onSettingsChange]
  );

  const updateTasks = useCallback(
    (tasks: PomodoroTask[], activeTaskId: string | null = stateRef.current.activeTaskId) => {
      commit({ ...stateRef.current, tasks, activeTaskId });
      onTasksChange?.(tasks);
    },
    [commit, onTasksChange]
  );

  const addTask = useCallback(
    (title: string, estimatedPomodoros: number) => {
      const task: PomodoroTask = {
        id: createId('task'),
        title,
        estimatedPomodoros: clampNumber(estimatedPomodoros, 1, 20, 1),
        completedPomodoros: 0,
        done: false,
        createdAt: new Date().toISOString(),
      };
      const current = stateRef.current;
      updateTasks([...current.tasks, task], current.activeTaskId ?? task.id);
    },
    [updateTasks]
  );

  const toggleTask = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      const tasks = current.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
      const nowDone = tasks.find((t) => t.id === taskId)?.done;
      const activeTaskId =
        nowDone && current.activeTaskId === taskId ? tasks.find((t) => !t.done)?.id ?? null : current.activeTaskId;
      updateTasks(tasks, activeTaskId);
    },
    [updateTasks]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      const tasks = current.tasks.filter((t) => t.id !== taskId);
      const activeTaskId =
        current.activeTaskId === taskId ? tasks.find((t) => !t.done)?.id ?? null : current.activeTaskId;
      updateTasks(tasks, activeTaskId);
    },
    [updateTasks]
  );

  const changeEstimate = useCallback(
    (taskId: string, delta: number) => {
      updateTasks(
        stateRef.current.tasks.map((t) =>
          t.id === taskId ? { ...t, estimatedPomodoros: clampNumber(t.estimatedPomodoros + delta, 1, 20, 1) } : t
        )
      );
    },
    [updateTasks]
  );

  const openSettings = useCallback((section: SettingsTab = 'timer') => {
    setSettingsTab(section);
    setSettingsOpen(true);
  }, []);

  // Keyboard shortcuts (ignored while typing or while a dialog is open)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      if (settingsOpen || shortcutsOpen) return;
      // Let Space/Enter activate whichever button has keyboard focus.
      if ((event.key === ' ' || event.key === 'Enter') && (tag === 'BUTTON' || tag === 'A')) return;

      switch (event.key) {
        case ' ':
          event.preventDefault();
          toggleStartPause();
          break;
        case 'r':
        case 'R':
          reset();
          break;
        case 's':
        case 'S':
          skip();
          break;
        case '1':
        case '2':
        case '3':
          selectPhase(PHASES[Number(event.key) - 1] ?? 'work');
          break;
        case 'f':
        case 'F':
          if (focusMode) closeFocusMode();
          else openFocusMode();
          break;
        case 'n':
        case 'N':
          event.preventDefault();
          setTab('timer');
          window.setTimeout(() => document.getElementById(NEW_TASK_INPUT_ID)?.focus(), 0);
          break;
        case 't':
        case 'T': {
          const s = stateRef.current.settings;
          const next = resolveThemeMode(s.appearance.mode) === 'dark' ? 'light' : 'dark';
          updateSettings({ ...s, appearance: { ...s.appearance, mode: next } });
          break;
        }
        case ',':
          event.preventDefault();
          openSettings();
          break;
        case '?':
          event.preventDefault();
          setShortcutsOpen(true);
          break;
        case 'Escape':
          if (focusMode) closeFocusMode();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, settingsOpen, shortcutsOpen, toggleStartPause, reset, skip, selectPhase, openFocusMode, closeFocusMode, updateSettings, openSettings]);

  const finishEstimate = useMemo(() => {
    const est = estimateFinishTime(state.tasks, state.settings, now);
    if (!est) return null;
    const d = new Date(est.finishAt);
    return {
      pomodorosLeft: est.pomodorosLeft,
      finishLabel: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
  }, [state.tasks, state.settings, now]);

  const minutesFor = (phase: PomodoroPhase) =>
    phase === 'work'
      ? state.settings.workMinutes
      : phase === 'shortBreak'
        ? state.settings.shortBreakMinutes
        : state.settings.longBreakMinutes;

  const startLabel = isRunning ? 'Pause' : state.timer.status === 'paused' ? 'Resume' : 'Start';
  const atmosphereLabel = [
    activeScene.id !== 'none' ? activeScene.label : null,
    activeAmbientSound.id !== 'off' ? activeAmbientSound.label : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <FlowShellView
        activeTab={tab}
        onTabChange={setTab}
        timerBadge={state.timer.status !== 'idle' ? timeLabel : null}
        backgroundImageSrc={
          tab === 'timer' && state.settings.ambient.showSceneOnTimer ? activeScene.imageSrc : null
        }
        user={user}
        onOpenSettings={() => openSettings()}
      >
      {tab === 'timer' ? (
        <div className="mx-auto max-w-xl">
          <section aria-label="Timer" className="flex flex-col items-center">
            <div role="tablist" aria-label="Interval" className="inline-flex rounded-lg bg-surface-inset p-1">
              {PHASES.map((phase) => {
                const active = state.timer.phase === phase;
                return (
                  <button
                    key={phase}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectPhase(phase)}
                    className={cn(
                      'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]' : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {PHASE_LABELS[phase]}
                    <span className="sr-only">, {minutesFor(phase)} minutes</span>
                  </button>
                );
              })}
            </div>

            <TimerRingView
              className="mt-10"
              progress={progress}
              timeLabel={timeLabel}
              remainingMs={remainingMs}
              phase={state.timer.phase}
              status={state.timer.status}
              caption={isWork ? activeTask?.title ?? 'No task selected' : 'Take a break'}
              cycleCount={state.timer.cycleCount}
              longBreakInterval={state.settings.longBreakInterval}
            />

            <div className="mt-10 flex items-center gap-6">
              <button type="button" onClick={reset} aria-label="Reset" title="Reset (R)" className={roundButton}>
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={toggleStartPause}
                title={`${startLabel} (Space)`}
                className={cn(
                  'inline-flex h-14 min-w-40 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-on-primary transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.98]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
              >
                {isRunning ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                {startLabel}
              </button>
              <button type="button" onClick={skip} aria-label="Skip to next interval" title="Skip (S)" className={roundButton}>
                <SkipForward className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-5">
              <button
                type="button"
                onClick={openFocusMode}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                Focus mode
              </button>
              <button
                type="button"
                onClick={() => openSettings('atmosphere')}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {atmosphereLabel || 'Scene & sound'}
              </button>
            </div>
          </section>

          <TaskListView
            className="mt-14 border-t border-border pt-8"
            tasks={state.tasks}
            activeTaskId={state.activeTaskId}
            finishEstimate={hydrated ? finishEstimate : null}
            newTaskInputId={NEW_TASK_INPUT_ID}
            onAddTask={addTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onSelectTask={(id) => commit({ ...stateRef.current, activeTaskId: id })}
            onChangeEstimate={changeEstimate}
            onClearCompleted={() => updateTasks(stateRef.current.tasks.filter((t) => !t.done))}
          />
        </div>
      ) : (
        <PomodoroStatsView
          history={state.history}
          dailyGoal={state.settings.dailyGoal}
          workMinutes={state.settings.workMinutes}
          now={now}
          onClearHistory={() => commit({ ...stateRef.current, history: [] })}
        />
      )}
      </FlowShellView>

      <FloatingMiniTimerView
        visible={tab === 'stats' && !focusMode && state.timer.status !== 'idle' && state.settings.focus.miniTimer}
        phase={state.timer.phase}
        status={state.timer.status}
        timeLabel={timeLabel}
        progress={progress}
        taskTitle={activeTask?.title ?? null}
        onToggle={toggleStartPause}
        onSkip={skip}
        onOpen={() => setTab('timer')}
      />

      {focusMode && (
        <FocusModeView
          phase={state.timer.phase}
          status={state.timer.status}
          timeLabel={timeLabel}
          remainingMs={remainingMs}
          progress={progress}
          taskTitle={activeTask?.title ?? null}
          cycleCount={state.timer.cycleCount}
          longBreakInterval={state.settings.longBreakInterval}
          interruptions={state.timer.interruptions}
          scene={state.settings.ambient.scene}
          ambientSound={state.settings.ambient.sound}
          ambientVolume={state.settings.ambient.volume}
          playOnlyDuringWork={state.settings.ambient.playOnlyDuringWork}
          ticking={state.settings.sound.ticking}
          tickingVolume={state.settings.sound.tickingVolume}
          onChangeScene={(scene) =>
            updateSettings({
              ...stateRef.current.settings,
              ambient: { ...stateRef.current.settings.ambient, scene },
            })
          }
          onChangeAmbientSound={(sound) => {
            unlockAudio();
            updateSettings({
              ...stateRef.current.settings,
              ambient: { ...stateRef.current.settings.ambient, sound },
            });
          }}
          onChangeAmbientVolume={(volume) => {
            unlockAudio();
            updateSettings({
              ...stateRef.current.settings,
              ambient: { ...stateRef.current.settings.ambient, volume },
            });
          }}
          onChangePlayOnlyDuringWork={(playOnlyDuringWork) => {
            unlockAudio();
            updateSettings({
              ...stateRef.current.settings,
              ambient: { ...stateRef.current.settings.ambient, playOnlyDuringWork },
            });
          }}
          onChangeTicking={(ticking) => {
            unlockAudio();
            const cur = stateRef.current;
            updateSettings({
              ...cur.settings,
              sound: { ...cur.settings.sound, ticking },
            });
            if (ticking && !(cur.timer.status === 'running' && cur.timer.phase === 'work')) {
              playClockTickSample(cur.settings.sound.tickingVolume);
            }
          }}
          onChangeTickingVolume={(tickingVolume) => {
            unlockAudio();
            const cur = stateRef.current.settings;
            updateSettings({
              ...cur,
              sound: { ...cur.sound, tickingVolume },
            });
          }}
          onPreviewTick={(volume) => {
            unlockAudio();
            const cur = stateRef.current;
            if (!(cur.timer.status === 'running' && cur.timer.phase === 'work')) {
              playClockTickSample(volume);
            }
          }}
          onSoundMenuOpenChange={setFocusSoundMenuOpen}
          onOpenSettings={() => openSettings()}
          onToggle={toggleStartPause}
          onReset={reset}
          onSkip={skip}
          onExit={closeFocusMode}
        />
      )}

      <PomodoroSettingsView
        key={settingsOpen ? `open-${settingsTab}` : 'closed'}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={state.settings}
        onChange={updateSettings}
        notificationPermission={notificationPermission}
        onRequestNotifications={async () => setNotificationPermission(await requestNotificationPermission())}
        onTestSound={(sound, volume) => {
          unlockAudio();
          playSound(sound, volume);
        }}
        onTestTick={(volume) => {
          unlockAudio();
          playClockTickSample(volume);
        }}
        onOpenShortcuts={() => {
          setSettingsOpen(false);
          setShortcutsOpen(true);
        }}
        initialTab={settingsTab}
      />

      <ShortcutsModalView open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}
