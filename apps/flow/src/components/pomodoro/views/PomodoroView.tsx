'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  AntMascot,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  ThemeToggle,
  cn,
  persistThemeMode,
  readStoredThemeMode,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  PHASE_LABELS,
  abandonInterval,
  applySettings,
  clampNumber,
  createId,
  estimateFinishTime,
  extendTimer,
  finishInterval,
  formatClock,
  getProgress,
  getRemainingMs,
  pauseTimer,
  resetTimer,
  startTimer,
  type PomodoroPersistedState,
  type PomodoroPhase,
  type PomodoroSessionRecord,
  type PomodoroSettings,
  type PomodoroTask,
} from '../../../lib/pomodoro/engine';
import { POMODORO_STORAGE_KEY, loadPomodoroState, savePomodoroState } from '../../../lib/pomodoro/storage';
import {
  AMBIENT_SOUNDS,
  ambientAudio,
  getAmbientSound,
  getFocusScene,
} from '../../../lib/pomodoro/ambient';
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

const DURATION_PRESETS: Record<PomodoroPhase, readonly number[]> = {
  work: [15, 25, 50, 90],
  shortBreak: [3, 5, 10],
  longBreak: [15, 20, 30],
};

const roundButton =
  'inline-flex h-12 w-12 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function PomodoroView({
  initialState,
  persistToLocalStorage = true,
  storageKey = POMODORO_STORAGE_KEY,
  user,
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
    const currentTheme = readStoredThemeMode('light');
    if (baseState.settings.appearance.mode !== currentTheme) {
      baseState = {
        ...baseState,
        settings: {
          ...baseState.settings,
          appearance: {
            ...baseState.settings.appearance,
            mode: currentTheme,
          },
        },
      };
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
    if (!hydrated) return;
    const { mode, accent, font } = state.settings.appearance;
    applyAppearance(mode, accent, font);
  }, [hydrated, state.settings.appearance]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncExternalTheme = () => {
      const nextMode = readStoredThemeMode('light');
      const current = stateRef.current;
      if (resolveThemeMode(current.settings.appearance.mode) === nextMode) return;
      commit(
        applySettings(current, {
          ...current.settings,
          appearance: {
            ...current.settings.appearance,
            mode: nextMode,
          },
        })
      );
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        syncExternalTheme();
      }
    };
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncExternalTheme();
      }
    };
    window.addEventListener(THEME_CHANGE_EVENT, syncExternalTheme);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', syncExternalTheme);
    window.addEventListener('pageshow', syncExternalTheme);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncExternalTheme);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', syncExternalTheme);
      window.removeEventListener('pageshow', syncExternalTheme);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [commit]);

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
      const nextResolvedMode = resolveThemeMode(next.appearance.mode);
      if (resolveThemeMode(stateRef.current.settings.appearance.mode) !== nextResolvedMode) {
        persistThemeMode(nextResolvedMode);
      }
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

  const extendTimerByMinutes = useCallback(
    (deltaMinutes: number) => {
      unlockAudio();
      const t = Date.now();
      setNow(t);
      const current = stateRef.current;
      commit({
        ...current,
        timer: extendTimer(current.timer, deltaMinutes, t),
      });
    },
    [commit]
  );

  const setPhaseDurationPreset = useCallback(
    (minutes: number) => {
      const current = stateRef.current;
      const phase = current.timer.phase;
      const updatedSettings: PomodoroSettings = {
        ...current.settings,
        ...(phase === 'work' ? { workMinutes: minutes } : {}),
        ...(phase === 'shortBreak' ? { shortBreakMinutes: minutes } : {}),
        ...(phase === 'longBreak' ? { longBreakMinutes: minutes } : {}),
      };
      commit({
        ...current,
        settings: updatedSettings,
        timer: resetTimer(current.timer, updatedSettings),
      });
      onSettingsChange?.(updatedSettings);
    },
    [commit, onSettingsChange]
  );

  const toggleClockTick = useCallback(() => {
    unlockAudio();
    const current = stateRef.current;
    const nextTicking = !current.settings.sound.ticking;
    const updated: PomodoroSettings = {
      ...current.settings,
      sound: { ...current.settings.sound, ticking: nextTicking },
    };
    commit(applySettings(current, updated));
    if (nextTicking && !(current.timer.status === 'running' && current.timer.phase === 'work')) {
      playClockTickSample(current.settings.sound.tickingVolume);
    }
    onSettingsChange?.(updated);
  }, [commit, onSettingsChange]);

  const cycleAmbientSound = useCallback(() => {
    unlockAudio();
    const current = stateRef.current;
    const currentIndex = AMBIENT_SOUNDS.findIndex((s) => s.id === current.settings.ambient.sound);
    const nextSound = AMBIENT_SOUNDS[(currentIndex + 1) % AMBIENT_SOUNDS.length]!.id;
    const updated: PomodoroSettings = {
      ...current.settings,
      ambient: { ...current.settings.ambient, sound: nextSound },
    };
    commit(applySettings(current, updated));
    onSettingsChange?.(updated);
  }, [commit, onSettingsChange]);

  const startTaskAndTimer = useCallback(
    (taskId: string) => {
      unlockAudio();
      const t = Date.now();
      setNow(t);
      const current = stateRef.current;
      const isCurrentActive = current.activeTaskId === taskId;
      const isCurrentlyRunning = current.timer.status === 'running';

      if (isCurrentActive && isCurrentlyRunning) {
        commit({ ...current, timer: pauseTimer(current.timer, t) });
        if (current.settings.sound.enabled) playFocusCue('pause', current.settings.sound.volume);
        return;
      }

      const nextTimer = startTimer(current.timer, t);
      commit({
        ...current,
        activeTaskId: taskId,
        timer: nextTimer,
      });
      if (current.settings.sound.enabled) playFocusCue('start', current.settings.sound.volume);
      if (current.timer.phase === 'work' && current.settings.focus.autoEnterOnWork) openFocusMode();
    },
    [commit, openFocusMode]
  );

  const addAndStartTask = useCallback(
    (title: string, estimatedPomodoros: number) => {
      unlockAudio();
      const t = Date.now();
      setNow(t);
      const task: PomodoroTask = {
        id: createId('task'),
        title,
        estimatedPomodoros: clampNumber(estimatedPomodoros, 1, 20, 1),
        completedPomodoros: 0,
        done: false,
        createdAt: new Date().toISOString(),
      };
      const current = stateRef.current;
      const nextTimer = startTimer(current.timer, t);
      commit({
        ...current,
        tasks: [task, ...current.tasks],
        activeTaskId: task.id,
        timer: nextTimer,
      });
      if (current.settings.sound.enabled) playFocusCue('start', current.settings.sound.volume);
      onTasksChange?.([task, ...current.tasks]);
      if (current.timer.phase === 'work' && current.settings.focus.autoEnterOnWork) openFocusMode();
    },
    [commit, onTasksChange, openFocusMode]
  );

  const sectionTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: sectionRect,
    ready: sectionReady,
    animate: sectionAnimate,
  } = useSlidingIndicator(sectionTabsRef, tab, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const sectionIndicatorReady = sectionReady && sectionRect.visible;

  const intervalTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: intervalRect,
    ready: intervalReady,
    animate: intervalAnimate,
  } = useSlidingIndicator(intervalTabsRef, state.timer.phase, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const intervalIndicatorReady = intervalReady && intervalRect.visible;

  const startLabel = isRunning ? 'Pause' : state.timer.status === 'paused' ? 'Resume' : 'Start';

  return (
    <>
      <FlowShellView
        activeSection="pomodoro"
        tabs={[]}
        contentWidth="wide"
        timerBadge={state.timer.status !== 'idle' ? timeLabel : null}
        backgroundImageSrc={
          tab === 'timer' && state.settings.ambient.showSceneOnTimer ? activeScene.imageSrc : null
        }
        user={user}
        onOpenSettings={() => openSettings()}
        headerActions={
          <ThemeToggle
            theme={hydrated ? resolveThemeMode(state.settings.appearance.mode) : undefined}
            onThemeChange={(nextTheme) =>
              updateSettings({
                ...stateRef.current.settings,
                appearance: {
                  ...stateRef.current.settings.appearance,
                  mode: nextTheme,
                },
              })
            }
          />
        }
      >
      <div
        ref={sectionTabsRef}
        role="tablist"
        aria-label="Pomodoro sections"
        data-gliding-ready={sectionIndicatorReady ? 'true' : 'false'}
        className="ants-glide-host relative mx-auto mb-6 flex max-w-xl items-center justify-center gap-6 border-b border-border sm:mb-8"
      >
        <span
          aria-hidden="true"
          data-animate={sectionAnimate ? 'true' : 'false'}
          className="ants-glide-indicator z-0 rounded-full bg-primary"
          style={{
            transform: `translate3d(${sectionRect.x}px, ${Math.max(0, sectionRect.y + sectionRect.height - 2)}px, 0)`,
            width: `${sectionRect.width}px`,
            height: '2px',
            opacity: sectionIndicatorReady ? 1 : 0,
          }}
        />
        {(
          [
            { id: 'timer', label: 'Timer' },
            { id: 'stats', label: 'Stats' },
          ] as const
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-active={active ? 'true' : 'false'}
              onClick={() => setTab(item.id)}
              className={cn(
                'ants-glide-item relative z-10 -mb-px inline-flex min-h-[40px] items-center gap-2 border-b-2 px-2 pb-2.5 text-sm font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              )}
            >
              <span>{item.label}</span>
              {item.id === 'timer' && !active && state.timer.status !== 'idle' && (
                <span className="rounded-full bg-primary-tint px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-on-primary-tint">
                  {timeLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'timer' ? (
        <div key="timer" className="ants-panel-enter mx-auto max-w-5xl lg:max-w-6xl">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-8 lg:items-stretch lg:h-[calc(100dvh-11.5rem)] lg:min-h-[560px] lg:max-h-[760px] landscape:grid landscape:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] landscape:gap-6">
            {/* Left Column: Timer & Controls (1-screen viewport) */}
            <section
              aria-label="Timer"
              className="flex flex-col items-center justify-between rounded-2xl border border-border/60 bg-surface-card/85 p-5 sm:p-7 backdrop-blur-sm shadow-[var(--shadow-tier-1)] lg:h-full"
            >
              <div
                ref={intervalTabsRef}
                role="tablist"
                aria-label="Interval"
                data-gliding-ready={intervalIndicatorReady ? 'true' : 'false'}
                className="ants-glide-host relative inline-flex rounded-lg bg-surface-inset p-1"
              >
                <span
                  aria-hidden="true"
                  data-animate={intervalAnimate ? 'true' : 'false'}
                  className="ants-glide-indicator z-0 rounded-md bg-surface-card shadow-[var(--shadow-tier-1)]"
                  style={{
                    transform: `translate3d(${intervalRect.x}px, ${intervalRect.y}px, 0)`,
                    width: `${intervalRect.width}px`,
                    height: `${intervalRect.height}px`,
                    opacity: intervalIndicatorReady ? 1 : 0,
                  }}
                />
                {PHASES.map((phase) => {
                  const active = state.timer.phase === phase;
                  return (
                    <button
                      key={phase}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      data-active={active ? 'true' : 'false'}
                      onClick={() => selectPhase(phase)}
                      className={cn(
                        'ants-glide-item relative z-10 min-h-[38px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                        active ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]' : 'text-foreground-muted hover:text-foreground'
                      )}
                    >
                      {PHASE_LABELS[phase]}
                      <span className="sr-only">, {minutesFor(phase)} minutes</span>
                    </button>
                  );
                })}
              </div>

              {/* Instant Duration Quick-Pills (Zero Modal Steps) */}
              {state.timer.status === 'idle' ? (
                <div className="mt-2.5 flex items-center justify-center gap-1.5">
                  <span className="text-[11px] font-medium text-foreground-muted">Length:</span>
                  {(DURATION_PRESETS[state.timer.phase] ?? [25]).map((mins) => {
                    const isCurrent = minutesFor(state.timer.phase) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setPhaseDurationPreset(mins)}
                        className={cn(
                          'rounded-md px-2 py-0.5 font-mono text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                          isCurrent
                            ? 'bg-primary-solid text-on-primary shadow-xs'
                            : 'bg-surface-inset text-foreground-muted hover:bg-surface-elevated hover:text-foreground'
                        )}
                        title={`Set ${PHASE_LABELS[state.timer.phase]} duration to ${mins} minutes`}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => extendTimerByMinutes(5)}
                    title="Extend running session by 5 minutes without restarting (+5m)"
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-inset px-2.5 py-0.5 text-xs font-mono font-medium text-foreground transition-all hover:border-primary hover:bg-surface-elevated hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    +5m
                  </button>
                  <button
                    type="button"
                    onClick={() => extendTimerByMinutes(10)}
                    title="Extend running session by 10 minutes without restarting (+10m)"
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-inset px-2.5 py-0.5 text-xs font-mono font-medium text-foreground transition-all hover:border-primary hover:bg-surface-elevated hover:text-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    +10m
                  </button>
                  {remainingMs > 5 * 60_000 && (
                    <button
                      type="button"
                      onClick={() => extendTimerByMinutes(-5)}
                      title="Reduce session by 5 minutes (-5m)"
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface-inset px-2 py-0.5 text-xs font-mono font-medium text-foreground-muted transition-all hover:border-destructive hover:text-destructive active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      -5m
                    </button>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-center gap-2.5 text-xs text-foreground-muted">
                <AntMascot
                  mood={
                    state.timer.status === 'running'
                      ? isWork
                        ? 'focus'
                        : 'sleeping'
                      : 'happy'
                  }
                  app="flow"
                  propVariant={isWork ? 'headphones' : 'timer'}
                  size="xs"
                  interactive
                  ariaLabel=""
                />
                <span>
                  {state.timer.status === 'running'
                    ? isWork
                      ? 'Heads down — I’ll guard the clock.'
                      : 'Nice session! Stretch and recharge.'
                    : 'Ready when you are.'}
                </span>
              </div>

              <TimerRingView
                className="my-3 sm:my-5"
                progress={progress}
                timeLabel={timeLabel}
                remainingMs={remainingMs}
                phase={state.timer.phase}
                status={state.timer.status}
                caption={isWork ? activeTask?.title ?? 'No task selected' : 'Take a break'}
                cycleCount={state.timer.cycleCount}
                longBreakInterval={state.settings.longBreakInterval}
                onToggle={toggleStartPause}
              />

              <div className="flex flex-col items-center gap-3.5 sm:gap-4">
                <div className="flex items-center gap-5 sm:gap-6">
                  <button type="button" onClick={reset} aria-label="Reset" title="Reset (R)" className={roundButton}>
                    <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={toggleStartPause}
                    title={`${startLabel} (Space or click dial)`}
                    className={cn(
                      'inline-flex h-13 min-w-36 items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-on-primary transition-[background-color,transform] hover:bg-primary-hover active:scale-[0.98] sm:h-14 sm:min-w-40 sm:px-8',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    )}
                  >
                    {isRunning ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
                    <span>{startLabel}</span>
                    <kbd className="hidden font-mono text-[11px] opacity-75 sm:inline">[Space]</kbd>
                  </button>
                  <button type="button" onClick={skip} aria-label="Skip to next interval" title="Skip (S)" className={roundButton}>
                    <SkipForward className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex w-full flex-wrap items-center justify-center gap-2 border-t border-border/40 pt-2.5 sm:gap-2.5">
                  {/* 1-Click Clock Ticking Toggle */}
                  <button
                    type="button"
                    onClick={toggleClockTick}
                    title={`Toggle mechanical clock ticking (${state.settings.sound.ticking ? 'Currently On' : 'Currently Off'})`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      state.settings.sound.ticking
                        ? 'bg-primary-tint/70 text-primary-solid font-semibold'
                        : 'bg-surface-inset text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tick {state.settings.sound.ticking ? 'On' : 'Off'}</span>
                  </button>

                  {/* 1-Click Ambient Sound Cycle */}
                  <button
                    type="button"
                    onClick={cycleAmbientSound}
                    title={`Cycle ambient soundscape (Current: ${activeAmbientSound.label}). Click to cycle.`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                      state.settings.ambient.sound !== 'off'
                        ? 'bg-primary-tint/70 text-primary-solid font-semibold'
                        : 'bg-surface-inset text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {state.settings.ambient.sound !== 'off' ? (
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span className="max-w-[100px] truncate">{activeAmbientSound.label}</span>
                  </button>

                  {/* Focus Mode Launcher */}
                  <button
                    type="button"
                    onClick={openFocusMode}
                    title="Open distraction-free Focus Mode (F)"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-inset px-2.5 py-1 text-xs font-medium text-foreground-muted transition-all hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Focus</span>
                    <kbd className="hidden font-mono text-[10px] text-foreground-muted/70 sm:inline">[F]</kbd>
                  </button>

                  {/* Settings Drawer Button */}
                  <button
                    type="button"
                    onClick={() => openSettings('timer')}
                    title="Full Pomodoro & Atmosphere Settings (,)"
                    className="inline-flex items-center gap-1 rounded-lg bg-surface-inset p-1.5 text-xs text-foreground-muted transition-all hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Pomodoro settings"
                  >
                    <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>

            {/* Right Column: Tasks Panel (1-screen viewport) */}
            <div className="flex flex-col rounded-2xl border border-border/60 bg-surface-card/85 p-5 sm:p-6 backdrop-blur-sm shadow-[var(--shadow-tier-1)] lg:h-full lg:min-h-0 landscape:h-full landscape:min-h-0">
              <TaskListView
                className="flex flex-col h-full min-h-0"
                tasks={state.tasks}
                activeTaskId={state.activeTaskId}
                finishEstimate={hydrated ? finishEstimate : null}
                newTaskInputId={NEW_TASK_INPUT_ID}
                onAddTask={addTask}
                onAddAndStartTask={addAndStartTask}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onSelectTask={(id) => commit({ ...stateRef.current, activeTaskId: id })}
                onStartTask={startTaskAndTimer}
                onChangeEstimate={changeEstimate}
                onClearCompleted={() => updateTasks(stateRef.current.tasks.filter((t) => !t.done))}
                timerRunning={isRunning}
              />
            </div>
          </div>
        </div>
      ) : (
        <div key="stats" className="ants-panel-enter">
          <PomodoroStatsView
            history={state.history}
            dailyGoal={state.settings.dailyGoal}
            workMinutes={state.settings.workMinutes}
            now={now}
            onClearHistory={() => commit({ ...stateRef.current, history: [] })}
          />
        </div>
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
