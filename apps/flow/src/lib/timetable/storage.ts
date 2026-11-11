/**
 * Flow Smart Timetable — guest `localStorage` persistence with defensive sanitisation.
 * Ready for Thaw's `[THAW-3.3]` D1 (`timetable_events` & `notification_queue`) sync layer.
 */
import type {
  BlockCategory,
  RecurrenceRule,
  ReminderLeadMinutes,
  TaskPriority,
  TimetableBlock,
  TimetablePersistedState,
  TimetablePresetId,
  TimetableViewMode,
  TodayFocusTask,
} from './engine';

export const TIMETABLE_STORAGE_KEY = 'ants-flow-timetable-v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const VIEW_MODES: readonly TimetableViewMode[] = ['week', 'day', 'month'];
const PRESETS: readonly TimetablePresetId[] = ['workday-coaching', 'scholar-ial'];
const CATEGORIES: readonly BlockCategory[] = [
  'deep-work',
  'work',
  'study',
  'health',
  'family',
  'commute',
  'meal',
  'buffer',
  'reading',
  'sleep',
];
const PRIORITIES: readonly TaskPriority[] = ['P1', 'P2', 'P3', 'P4'];
const RECURRENCES: readonly RecurrenceRule[] = ['none', 'daily', 'weekdays', 'weekly'];
const LEADS: readonly ReminderLeadMinutes[] = [0, 5, 10, 15, 30];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
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

function sanitizeBlock(raw: unknown): TimetableBlock | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const title = raw.title.trim().slice(0, 140);
  if (!title || !isIsoDate(raw.date)) return null;
  const startMinutes = clamp(raw.startMinutes, 0, 1425, 540);
  const endMinutes = Math.max(startMinutes + 15, clamp(raw.endMinutes, 15, 1440, startMinutes + 30));
  const rem = isRecord(raw.telegramReminder) ? raw.telegramReminder : {};

  return {
    id: raw.id,
    title,
    date: raw.date,
    startMinutes,
    endMinutes,
    category: pick(raw.category, CATEGORIES, 'work'),
    priority: raw.priority ? pick(raw.priority, PRIORITIES, 'P2') : undefined,
    pomodorosPlanned:
      typeof raw.pomodorosPlanned === 'number' ? clamp(raw.pomodorosPlanned, 1, 16, 1) : undefined,
    pomodorosDone:
      typeof raw.pomodorosDone === 'number' ? clamp(raw.pomodorosDone, 0, 16, 0) : undefined,
    recurrence: pick(raw.recurrence, RECURRENCES, 'none'),
    telegramReminder: {
      enabled: typeof rem.enabled === 'boolean' ? rem.enabled : false,
      leadMinutes: pick(rem.leadMinutes, LEADS, 5),
      note: typeof rem.note === 'string' ? rem.note.slice(0, 160) : undefined,
    },
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 400) : undefined,
    completed: typeof raw.completed === 'boolean' ? raw.completed : false,
    locked: typeof raw.locked === 'boolean' ? raw.locked : false,
  };
}

function sanitizeFocusTask(raw: unknown): TodayFocusTask | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  const title = raw.title.trim().slice(0, 140);
  if (!title) return null;
  return {
    id: raw.id,
    title,
    priority: pick(raw.priority, PRIORITIES, 'P2'),
    estimatedMinutes: clamp(raw.estimatedMinutes, 5, 480, 25),
    pomodorosPlanned:
      typeof raw.pomodorosPlanned === 'number' && raw.pomodorosPlanned > 0
        ? clamp(raw.pomodorosPlanned, 1, 16, 1)
        : undefined,
    pomodorosDone:
      typeof raw.pomodorosDone === 'number' ? clamp(raw.pomodorosDone, 0, 16, 0) : undefined,
    done: typeof raw.done === 'boolean' ? raw.done : false,
    linkedBlockId: typeof raw.linkedBlockId === 'string' ? raw.linkedBlockId : undefined,
    tag: typeof raw.tag === 'string' ? raw.tag.slice(0, 24) : undefined,
  };
}

export function sanitizeTimetableState(raw: unknown): TimetablePersistedState | null {
  if (!isRecord(raw)) return null;
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map(sanitizeBlock).filter((b): b is TimetableBlock => b !== null)
    : [];
  const focusTasks = Array.isArray(raw.focusTasks)
    ? raw.focusTasks.map(sanitizeFocusTask).filter((t): t is TodayFocusTask => t !== null)
    : [];
  if (blocks.length === 0) return null;

  const telegramConnected =
    typeof raw.telegramConnected === 'boolean' ? raw.telegramConnected : false;

  return {
    version: 1,
    presetId: pick(raw.presetId, PRESETS, 'workday-coaching'),
    viewMode: pick(raw.viewMode, VIEW_MODES, 'week'),
    selectedDate: isIsoDate(raw.selectedDate) ? raw.selectedDate : '2026-11-11',
    showExams: typeof raw.showExams === 'boolean' ? raw.showExams : true,
    showOvernightHours: typeof raw.showOvernightHours === 'boolean' ? raw.showOvernightHours : false,
    telegramConnected,
    telegramHandle:
      telegramConnected && typeof raw.telegramHandle === 'string'
        ? raw.telegramHandle.slice(0, 48)
        : '',
    blocks,
    focusTasks,
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

export function loadTimetableState(
  key: string = TIMETABLE_STORAGE_KEY,
  storage?: StorageLike
): TimetablePersistedState | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return sanitizeTimetableState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveTimetableState(
  state: TimetablePersistedState,
  key: string = TIMETABLE_STORAGE_KEY,
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

export function clearTimetableState(
  key: string = TIMETABLE_STORAGE_KEY,
  storage?: StorageLike
): void {
  const store = resolveStorage(storage);
  try {
    store?.removeItem(key);
  } catch {
    // ignore
  }
}

