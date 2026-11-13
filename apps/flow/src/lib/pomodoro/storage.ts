/**
 * Flow Pomodoro — guest `localStorage` persistence with defensive sanitisation.
 * (Thaw's `[THAW-3.1]` D1 sync can wrap / replace this behind the same shape.)
 */
import {
  DEFAULT_POMODORO_SETTINGS,
  DURATION_LIMITS,
  MAX_HISTORY_RECORDS,
  clampNumber,
  createInitialTimer,
  phaseDurationMs,
  type AccentId,
  type AmbientSoundId,
  type FocusSceneId,
  type FontId,
  type PomodoroPersistedState,
  type PomodoroPhase,
  type PomodoroSessionRecord,
  type PomodoroSettings,
  type PomodoroTask,
  type SoundId,
  type TimerState,
} from './engine';

export const POMODORO_STORAGE_KEY = 'ants-flow-pomodoro-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PHASES: PomodoroPhase[] = ['work', 'shortBreak', 'longBreak'];
const SOUNDS: SoundId[] = ['bell', 'chime', 'digital', 'soft', 'none'];
const AMBIENT_SOUNDS: AmbientSoundId[] = ['off', 'rain', 'fireplace', 'forest', 'cafe', 'brown-noise'];
const FOCUS_SCENES: FocusSceneId[] = ['none', 'rainy-study', 'quiet-library', 'misty-forest', 'warm-fireplace'];
const ACCENTS: AccentId[] = ['amber', 'ocean', 'forest', 'rose', 'violet'];
const FONTS: FontId[] = ['jakarta', 'inter', 'serif'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeSettings(raw: unknown): PomodoroSettings {
  const d = DEFAULT_POMODORO_SETTINGS;
  const s = isRecord(raw) ? raw : {};
  const sound = isRecord(s.sound) ? s.sound : {};
  const ambient = isRecord(s.ambient) ? s.ambient : {};
  const appearance = isRecord(s.appearance) ? s.appearance : {};
  const focus = isRecord(s.focus) ? s.focus : {};
  const L = DURATION_LIMITS;
  const volume = typeof sound.volume === 'number' && Number.isFinite(sound.volume) ? sound.volume : d.sound.volume;
  const tickingVolume =
    typeof sound.tickingVolume === 'number' && Number.isFinite(sound.tickingVolume)
      ? sound.tickingVolume
      : d.sound.tickingVolume;
  const ambientVolume =
    typeof ambient.volume === 'number' && Number.isFinite(ambient.volume) ? ambient.volume : d.ambient.volume;

  return {
    workMinutes: clampNumber(s.workMinutes, L.workMinutes.min, L.workMinutes.max, d.workMinutes),
    shortBreakMinutes: clampNumber(s.shortBreakMinutes, L.shortBreakMinutes.min, L.shortBreakMinutes.max, d.shortBreakMinutes),
    longBreakMinutes: clampNumber(s.longBreakMinutes, L.longBreakMinutes.min, L.longBreakMinutes.max, d.longBreakMinutes),
    longBreakInterval: clampNumber(s.longBreakInterval, L.longBreakInterval.min, L.longBreakInterval.max, d.longBreakInterval),
    autoStartBreaks: bool(s.autoStartBreaks, d.autoStartBreaks),
    autoStartWork: bool(s.autoStartWork, d.autoStartWork),
    dailyGoal: clampNumber(s.dailyGoal, L.dailyGoal.min, L.dailyGoal.max, d.dailyGoal),
    notifications: bool(s.notifications, d.notifications),
    sound: {
      enabled: bool(sound.enabled, d.sound.enabled),
      volume: Math.min(1, Math.max(0, volume)),
      workEndSound: pick(sound.workEndSound, SOUNDS, d.sound.workEndSound),
      breakEndSound: pick(sound.breakEndSound, SOUNDS, d.sound.breakEndSound),
      ticking: bool(sound.ticking, d.sound.ticking),
      tickingVolume: Math.min(1, Math.max(0, tickingVolume)),
    },
    ambient: {
      scene: pick(ambient.scene, FOCUS_SCENES, d.ambient.scene),
      sound: pick(ambient.sound, AMBIENT_SOUNDS, d.ambient.sound),
      volume: Math.min(1, Math.max(0, ambientVolume)),
      playOnlyDuringWork: bool(ambient.playOnlyDuringWork, d.ambient.playOnlyDuringWork),
      showSceneOnTimer: bool(ambient.showSceneOnTimer, d.ambient.showSceneOnTimer),
    },
    appearance: {
      mode: appearance.mode === 'dark' ? 'dark' : 'light',
      accent: pick(appearance.accent, ACCENTS, d.appearance.accent),
      font: pick(appearance.font, FONTS, d.appearance.font),
    },
    focus: {
      autoEnterOnWork: bool(focus.autoEnterOnWork, d.focus.autoEnterOnWork),
      fullscreen: bool(focus.fullscreen, d.focus.fullscreen),
      warnOnLeave: bool(focus.warnOnLeave, d.focus.warnOnLeave),
      miniTimer: bool(focus.miniTimer, d.focus.miniTimer),
    },
  };
}

function sanitizeTask(raw: unknown): PomodoroTask | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const title = raw.title.trim().slice(0, 140);
  if (!title) return null;
  return {
    id: raw.id,
    title,
    estimatedPomodoros: clampNumber(raw.estimatedPomodoros, 1, 20, 1),
    completedPomodoros: clampNumber(raw.completedPomodoros, 0, 999, 0),
    done: bool(raw.done, false),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
  };
}

function sanitizeRecord(raw: unknown): PomodoroSessionRecord | null {
  if (!isRecord(raw) || typeof raw.id !== 'string') return null;
  if (typeof raw.startedAt !== 'string' || Number.isNaN(Date.parse(raw.startedAt))) return null;
  const endedAt =
    typeof raw.endedAt === 'string' && !Number.isNaN(Date.parse(raw.endedAt)) ? raw.endedAt : raw.startedAt;
  return {
    id: raw.id,
    phase: pick(raw.phase, PHASES, 'work'),
    startedAt: raw.startedAt,
    endedAt,
    durationSeconds: clampNumber(raw.durationSeconds, 0, 86_400, 0),
    plannedSeconds: clampNumber(raw.plannedSeconds, 0, 86_400, 0),
    completed: bool(raw.completed, false),
    taskId: typeof raw.taskId === 'string' ? raw.taskId : null,
    taskTitle: typeof raw.taskTitle === 'string' ? raw.taskTitle : null,
    interruptions: clampNumber(raw.interruptions, 0, 999, 0),
  };
}

function sanitizeTimer(raw: unknown, settings: PomodoroSettings): TimerState {
  const fallback = createInitialTimer(settings);
  if (!isRecord(raw)) return fallback;
  const phase = pick(raw.phase, PHASES, 'work');
  const status = pick(raw.status, ['idle', 'running', 'paused'] as const, 'idle');
  const duration = phaseDurationMs(settings, phase);
  const endAt = typeof raw.endAt === 'number' && Number.isFinite(raw.endAt) ? raw.endAt : null;
  const sessionStartedAt =
    typeof raw.sessionStartedAt === 'number' && Number.isFinite(raw.sessionStartedAt) ? raw.sessionStartedAt : null;
  const remaining =
    typeof raw.remainingMs === 'number' && Number.isFinite(raw.remainingMs)
      ? Math.min(duration, Math.max(0, raw.remainingMs))
      : duration;

  if (status === 'running' && endAt === null) {
    return { ...fallback, phase, remainingMs: remaining, status: 'paused', cycleCount: clampNumber(raw.cycleCount, 0, 99, 0) };
  }
  return {
    phase,
    status,
    remainingMs: status === 'idle' ? duration : remaining,
    endAt: status === 'running' ? endAt : null,
    sessionStartedAt: status === 'idle' ? null : sessionStartedAt,
    cycleCount: clampNumber(raw.cycleCount, 0, 99, 0),
    interruptions: clampNumber(raw.interruptions, 0, 999, 0),
  };
}

export function sanitizeState(raw: unknown): PomodoroPersistedState | null {
  if (!isRecord(raw)) return null;
  const settings = sanitizeSettings(raw.settings);
  const tasks = Array.isArray(raw.tasks)
    ? raw.tasks.map(sanitizeTask).filter((t): t is PomodoroTask => t !== null)
    : [];
  const history = Array.isArray(raw.history)
    ? raw.history
        .map(sanitizeRecord)
        .filter((r): r is PomodoroSessionRecord => r !== null)
        .slice(-MAX_HISTORY_RECORDS)
    : [];
  const activeTaskId =
    typeof raw.activeTaskId === 'string' && tasks.some((t) => t.id === raw.activeTaskId)
      ? raw.activeTaskId
      : null;
  return {
    version: 1,
    settings,
    tasks,
    activeTaskId,
    history,
    timer: sanitizeTimer(raw.timer, settings),
  };
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadPomodoroState(
  key: string = POMODORO_STORAGE_KEY,
  storage?: StorageLike
): PomodoroPersistedState | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePomodoroState(
  state: PomodoroPersistedState,
  key: string = POMODORO_STORAGE_KEY,
  storage?: StorageLike
): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    const trimmed: PomodoroPersistedState = {
      ...state,
      history: state.history.slice(-MAX_HISTORY_RECORDS),
    };
    store.setItem(key, JSON.stringify(trimmed));
    return true;
  } catch {
    return false;
  }
}

export function clearPomodoroState(key: string = POMODORO_STORAGE_KEY, storage?: StorageLike): void {
  const store = resolveStorage(storage);
  try {
    store?.removeItem(key);
  } catch {
    // ignore
  }
}

