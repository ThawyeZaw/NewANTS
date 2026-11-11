/**
 * Flow Task Planner (`/tasks`) — defensive `localStorage` persistence + seamless
 * synchronization with `/timetable` (`ants-flow-timetable-v1`).
 */
import type { TaskPriority } from '../timetable/engine';
import type { PlannerTask, TaskPresetId, TaskSubtask, TasksPersistedState } from './engine';

export const TASKS_STORAGE_KEY = 'ants-flow-tasks-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PRIORITIES: readonly TaskPriority[] = ['P1', 'P2', 'P3', 'P4'];
const PRESETS: readonly TaskPresetId[] = ['workday-coaching', 'scholar-ial'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeSubtask(raw: unknown): TaskSubtask | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const title = raw.title.trim().slice(0, 120);
  if (!title) return null;
  return {
    id: raw.id,
    title,
    done: typeof raw.done === 'boolean' ? raw.done : false,
  };
}

function sanitizeTask(raw: unknown): PlannerTask | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const title = raw.title.trim().slice(0, 140);
  if (!title) return null;

  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().slice(0, 24))
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const subtasks = Array.isArray(raw.subtasks)
    ? raw.subtasks.map(sanitizeSubtask).filter((s): s is TaskSubtask => s !== null)
    : [];

  return {
    id: raw.id,
    title,
    notes: typeof raw.notes === 'string' ? raw.notes.trim().slice(0, 400) || undefined : undefined,
    priority: pick(raw.priority, PRIORITIES, 'P2'),
    dueDate: isIsoDate(raw.dueDate) ? raw.dueDate : undefined,
    tags,
    estimatedMinutes: clamp(raw.estimatedMinutes, 5, 480, 30),
    pomodorosPlanned:
      typeof raw.pomodorosPlanned === 'number' && raw.pomodorosPlanned > 0
        ? clamp(raw.pomodorosPlanned, 1, 16, 1)
        : undefined,
    pomodorosDone:
      typeof raw.pomodorosDone === 'number' ? clamp(raw.pomodorosDone, 0, 16, 0) : undefined,
    inTodayFocus: typeof raw.inTodayFocus === 'boolean' ? raw.inTodayFocus : false,
    done: typeof raw.done === 'boolean' ? raw.done : false,
    subtasks,
    linkedBlockId: typeof raw.linkedBlockId === 'string' ? raw.linkedBlockId : undefined,
    scheduledSlotLabel:
      typeof raw.scheduledSlotLabel === 'string' ? raw.scheduledSlotLabel.slice(0, 48) : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '2026-11-11T08:00:00.000Z',
  };
}

export function sanitizeTasksState(raw: unknown): TasksPersistedState | null {
  if (!isRecord(raw) || !Array.isArray(raw.tasks)) return null;
  const tasks = raw.tasks.map(sanitizeTask).filter((t): t is PlannerTask => t !== null);
  return {
    version: 1,
    presetId: pick(raw.presetId, PRESETS, 'workday-coaching'),
    selectedDate: isIsoDate(raw.selectedDate) ? raw.selectedDate : '2026-11-11',
    tasks,
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

export function loadTasksState(
  key: string = TASKS_STORAGE_KEY,
  storage?: StorageLike
): TasksPersistedState | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return sanitizeTasksState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveTasksState(
  state: TasksPersistedState,
  key: string = TASKS_STORAGE_KEY,
  storage?: StorageLike
): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

