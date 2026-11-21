/**
 * Flow Pomodoro — pure, framework-free timer engine & domain types.
 *
 * Everything in this module is deterministic (time is always passed in as `now`),
 * so it can be unit-tested and later reused by Thaw's `<PomodoroContainer />` /
 * D1 sync layer (`pomodoro_user_settings`, `pomodoro_sessions`) without changes.
 */

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type SoundId = 'bell' | 'chime' | 'digital' | 'soft' | 'none';
export type AmbientSoundId = 'off' | 'rain' | 'fireplace' | 'forest' | 'cafe' | 'brown-noise';
export type FocusSceneId = 'none' | 'rainy-study' | 'quiet-library' | 'misty-forest' | 'warm-fireplace';
export type ThemeModePreference = 'light' | 'dark' | 'system';
export type AccentId = 'amber' | 'ocean' | 'forest' | 'rose' | 'violet';
export type FontId = 'jakarta' | 'inter' | 'serif';

export interface PomodoroSoundSettings {
  enabled: boolean;
  /** 0 – 1 */
  volume: number;
  /** Played when a work interval finishes (break begins) */
  workEndSound: SoundId;
  /** Played when a break finishes (work begins) */
  breakEndSound: SoundId;
  /** Play a classic mechanical tick-tock every second during running focus intervals */
  ticking: boolean;
  /** Independent 0 – 1 volume for mechanical clock ticking */
  tickingVolume: number;
}

export interface PomodoroAppearanceSettings {
  mode: ThemeModePreference;
  accent: AccentId;
  font: FontId;
}

export interface PomodoroFocusSettings {
  /** Automatically enter focus mode whenever a work interval starts */
  autoEnterOnWork: boolean;
  /** Request browser fullscreen when focus mode opens */
  fullscreen: boolean;
  /** Ask for confirmation before closing / reloading the tab during a running work interval */
  warnOnLeave: boolean;
  /** Show a small floating timer while viewing Stats with a timer running */
  miniTimer: boolean;
}

export interface PomodoroAmbientSettings {
  scene: FocusSceneId;
  sound: AmbientSoundId;
  /** 0 – 1 */
  volume: number;
  /** Play ambient sound automatically only while a focus interval is running */
  playOnlyDuringWork: boolean;
  /** Show the chosen focus scene softly behind the main Timer page as well as Focus Mode */
  showSceneOnTimer: boolean;
}

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** Number of work intervals before a long break */
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  /** Daily goal in completed pomodoros */
  dailyGoal: number;
  notifications: boolean;
  sound: PomodoroSoundSettings;
  ambient: PomodoroAmbientSettings;
  appearance: PomodoroAppearanceSettings;
  focus: PomodoroFocusSettings;
}

export interface PomodoroTask {
  id: string;
  title: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  done: boolean;
  createdAt: string;
}

export interface PomodoroSessionRecord {
  id: string;
  phase: PomodoroPhase;
  /** ISO timestamp */
  startedAt: string;
  /** ISO timestamp */
  endedAt: string;
  /** Actual elapsed seconds spent in the interval */
  durationSeconds: number;
  /** Planned interval length in seconds */
  plannedSeconds: number;
  /** True when the interval ran to zero; false when reset / skipped early */
  completed: boolean;
  taskId: string | null;
  taskTitle: string | null;
  /** Tab switches / focus-loss events counted during the interval */
  interruptions: number;
}

export interface TimerState {
  phase: PomodoroPhase;
  status: TimerStatus;
  /** Remaining milliseconds while idle / paused (authoritative when not running) */
  remainingMs: number;
  /** Epoch ms when the running interval will end (authoritative while running) */
  endAt: number | null;
  /** Epoch ms when the current interval was first started */
  sessionStartedAt: number | null;
  /** Completed work intervals in the current long-break cycle */
  cycleCount: number;
  interruptions: number;
}

export interface PomodoroPersistedState {
  version: 1;
  settings: PomodoroSettings;
  tasks: PomodoroTask[];
  activeTaskId: string | null;
  history: PomodoroSessionRecord[];
  timer: TimerState;
}

export const PHASE_LABELS: Record<PomodoroPhase, string> = {
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

export const DURATION_LIMITS = {
  workMinutes: { min: 1, max: 120 },
  shortBreakMinutes: { min: 1, max: 60 },
  longBreakMinutes: { min: 1, max: 90 },
  longBreakInterval: { min: 2, max: 12 },
  dailyGoal: { min: 1, max: 24 },
} as const;

/** Keep at most this many records in localStorage (~1 year of heavy use) */
export const MAX_HISTORY_RECORDS = 5000;

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  dailyGoal: 8,
  notifications: false,
  sound: {
    enabled: true,
    volume: 0.6,
    workEndSound: 'bell',
    breakEndSound: 'chime',
    ticking: true,
    tickingVolume: 0.35,
  },
  ambient: {
    scene: 'none',
    sound: 'off',
    volume: 0.45,
    playOnlyDuringWork: true,
    showSceneOnTimer: true,
  },
  appearance: {
    mode: 'light',
    accent: 'amber',
    font: 'jakarta',
  },
  focus: {
    autoEnterOnWork: false,
    fullscreen: true,
    warnOnLeave: true,
    miniTimer: true,
  },
};

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

export function phaseDurationMs(settings: PomodoroSettings, phase: PomodoroPhase): number {
  const minutes =
    phase === 'work'
      ? settings.workMinutes
      : phase === 'shortBreak'
        ? settings.shortBreakMinutes
        : settings.longBreakMinutes;
  return minutes * 60_000;
}

export function createInitialTimer(settings: PomodoroSettings): TimerState {
  return {
    phase: 'work',
    status: 'idle',
    remainingMs: phaseDurationMs(settings, 'work'),
    endAt: null,
    sessionStartedAt: null,
    cycleCount: 0,
    interruptions: 0,
  };
}

export function getRemainingMs(timer: TimerState, now: number): number {
  if (timer.status === 'running' && timer.endAt !== null) {
    return Math.max(0, timer.endAt - now);
  }
  return Math.max(0, timer.remainingMs);
}

/** Progress of the current interval from 0 (just started) to 1 (finished). */
export function getProgress(timer: TimerState, settings: PomodoroSettings, now: number): number {
  const total = phaseDurationMs(settings, timer.phase);
  if (total <= 0) return 0;
  const remaining = getRemainingMs(timer, now);
  return Math.min(1, Math.max(0, 1 - remaining / total));
}

export function getElapsedMs(timer: TimerState, settings: PomodoroSettings, now: number): number {
  return Math.max(0, phaseDurationMs(settings, timer.phase) - getRemainingMs(timer, now));
}

export function startTimer(timer: TimerState, now: number): TimerState {
  if (timer.status === 'running') return timer;
  const remaining = Math.max(0, timer.remainingMs);
  return {
    ...timer,
    status: 'running',
    endAt: now + remaining,
    sessionStartedAt: timer.sessionStartedAt ?? now,
  };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'running') return timer;
  return {
    ...timer,
    status: 'paused',
    remainingMs: getRemainingMs(timer, now),
    endAt: null,
  };
}

export function resetTimer(timer: TimerState, settings: PomodoroSettings): TimerState {
  return {
    ...timer,
    status: 'idle',
    remainingMs: phaseDurationMs(settings, timer.phase),
    endAt: null,
    sessionStartedAt: null,
    interruptions: 0,
  };
}

export function switchPhase(
  timer: TimerState,
  phase: PomodoroPhase,
  settings: PomodoroSettings
): TimerState {
  return {
    ...timer,
    phase,
    status: 'idle',
    remainingMs: phaseDurationMs(settings, phase),
    endAt: null,
    sessionStartedAt: null,
    interruptions: 0,
  };
}

/**
 * Decide which phase follows the current one.
 * A long break follows every `longBreakInterval`-th completed work interval.
 */
export function getNextPhase(
  phase: PomodoroPhase,
  cycleCount: number,
  longBreakInterval: number,
  workCompleted: boolean
): { phase: PomodoroPhase; cycleCount: number } {
  if (phase === 'work') {
    const nextCount = workCompleted ? cycleCount + 1 : cycleCount;
    if (workCompleted && nextCount >= longBreakInterval) {
      return { phase: 'longBreak', cycleCount: nextCount };
    }
    return { phase: 'shortBreak', cycleCount: nextCount };
  }
  if (phase === 'longBreak') {
    return { phase: 'work', cycleCount: 0 };
  }
  return { phase: 'work', cycleCount };
}

export interface AdvanceResult {
  timer: TimerState;
  /** Whether the next interval auto-started */
  autoStarted: boolean;
}

/**
 * Move to the next phase after the current one completes (or is skipped).
 * `now` is used as the start time when the next interval auto-starts.
 */
export function advancePhase(
  timer: TimerState,
  settings: PomodoroSettings,
  now: number,
  completed: boolean
): AdvanceResult {
  const next = getNextPhase(timer.phase, timer.cycleCount, settings.longBreakInterval, completed);
  const idle: TimerState = {
    phase: next.phase,
    status: 'idle',
    remainingMs: phaseDurationMs(settings, next.phase),
    endAt: null,
    sessionStartedAt: null,
    cycleCount: next.cycleCount,
    interruptions: 0,
  };
  const shouldAutoStart =
    completed && (next.phase === 'work' ? settings.autoStartWork : settings.autoStartBreaks);
  return shouldAutoStart
    ? { timer: startTimer(idle, now), autoStarted: true }
    : { timer: idle, autoStarted: false };
}

export function createId(prefix = 'id'): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

export function buildSessionRecord(
  timer: TimerState,
  settings: PomodoroSettings,
  endedAt: number,
  completed: boolean,
  task: Pick<PomodoroTask, 'id' | 'title'> | null
): PomodoroSessionRecord {
  const plannedMs = phaseDurationMs(settings, timer.phase);
  const elapsedMs = completed ? plannedMs : getElapsedMs(timer, settings, endedAt);
  const startedAt = timer.sessionStartedAt ?? endedAt - elapsedMs;
  return {
    id: createId('pom'),
    phase: timer.phase,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationSeconds: Math.round(elapsedMs / 1000),
    plannedSeconds: Math.round(plannedMs / 1000),
    completed,
    taskId: timer.phase === 'work' && task ? task.id : null,
    taskTitle: timer.phase === 'work' && task ? task.title : null,
    interruptions: timer.interruptions,
  };
}

/** Minimum elapsed time before an abandoned interval is worth logging. */
export const MIN_LOGGABLE_MS = 60_000;

export interface IntervalEndResult {
  state: PomodoroPersistedState;
  /** The logged record, or null when the interval was too short to be worth logging */
  record: PomodoroSessionRecord | null;
  /** Phase that just ended */
  endedPhase: PomodoroPhase;
  autoStarted: boolean;
}

function findActiveTask(state: PomodoroPersistedState): PomodoroTask | null {
  return state.tasks.find((t) => t.id === state.activeTaskId && !t.done) ?? null;
}

function appendRecord(history: PomodoroSessionRecord[], record: PomodoroSessionRecord | null) {
  if (!record) return history;
  const next = [...history, record];
  return next.length > MAX_HISTORY_RECORDS ? next.slice(-MAX_HISTORY_RECORDS) : next;
}

/**
 * End the current interval — either because it ran to zero (`completed`) or because the user skipped it —
 * then log it, credit the active task, and advance to the next phase.
 */
export function finishInterval(
  state: PomodoroPersistedState,
  endedAt: number,
  completed: boolean,
  now: number
): IntervalEndResult {
  const { timer, settings } = state;
  const task = findActiveTask(state);
  const elapsed = completed ? phaseDurationMs(settings, timer.phase) : getElapsedMs(timer, settings, endedAt);
  const started = timer.sessionStartedAt !== null;
  const record =
    started && (completed || elapsed >= MIN_LOGGABLE_MS)
      ? buildSessionRecord(timer, settings, endedAt, completed, task)
      : null;
  const tasks =
    completed && timer.phase === 'work' && task
      ? state.tasks.map((t) => (t.id === task.id ? { ...t, completedPomodoros: t.completedPomodoros + 1 } : t))
      : state.tasks;
  const advanced = advancePhase(timer, settings, now, completed);
  return {
    state: { ...state, tasks, history: appendRecord(state.history, record), timer: advanced.timer },
    record,
    endedPhase: timer.phase,
    autoStarted: advanced.autoStarted,
  };
}

/** Stop the current interval early (reset or manual phase switch), logging it if it ran long enough. */
export function abandonInterval(
  state: PomodoroPersistedState,
  now: number,
  nextPhase: PomodoroPhase = state.timer.phase
): { state: PomodoroPersistedState; record: PomodoroSessionRecord | null } {
  const { timer, settings } = state;
  const elapsed = getElapsedMs(timer, settings, now);
  const record =
    timer.status !== 'idle' && timer.sessionStartedAt !== null && elapsed >= MIN_LOGGABLE_MS
      ? buildSessionRecord(timer, settings, now, false, findActiveTask(state))
      : null;
  const nextTimer =
    nextPhase === timer.phase ? resetTimer(timer, settings) : switchPhase(timer, nextPhase, settings);
  return {
    state: { ...state, history: appendRecord(state.history, record), timer: nextTimer },
    record,
  };
}

/** Apply new settings; an idle timer immediately adopts the new duration. */
export function applySettings(
  state: PomodoroPersistedState,
  settings: PomodoroSettings
): PomodoroPersistedState {
  const timer =
    state.timer.status === 'idle'
      ? { ...state.timer, remainingMs: phaseDurationMs(settings, state.timer.phase) }
      : state.timer;
  return { ...state, settings, timer };
}

/** `MM:SS` (or `H:MM:SS` for ≥ 1 h). Seconds round up so 00:00 only shows at the very end. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Human duration such as `1h 25m` or `40m`. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Estimated wall-clock time when all remaining task pomodoros (including breaks) will be done.
 * Returns null when nothing is left.
 */
export function estimateFinishTime(
  tasks: PomodoroTask[],
  settings: PomodoroSettings,
  now: number
): { pomodorosLeft: number; finishAt: number } | null {
  const pomodorosLeft = tasks
    .filter((t) => !t.done)
    .reduce((sum, t) => sum + Math.max(0, t.estimatedPomodoros - t.completedPomodoros), 0);
  if (pomodorosLeft === 0) return null;
  const workMs = pomodorosLeft * settings.workMinutes * 60_000;
  const breaks = Math.max(0, pomodorosLeft - 1);
  const longBreaks = Math.floor(breaks / settings.longBreakInterval);
  const shortBreaks = breaks - longBreaks;
  const breakMs =
    shortBreaks * settings.shortBreakMinutes * 60_000 +
    longBreaks * settings.longBreakMinutes * 60_000;
  return { pomodorosLeft, finishAt: now + workMs + breakMs };
}
