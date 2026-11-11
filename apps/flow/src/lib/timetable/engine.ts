/**
 * Flow Smart Timetable — pure, framework-free scheduling & reminder helpers.
 *
 * Deterministic functions (no DOM/storage dependencies) so Thaw's `[THAW-3.3]`
 * D1 / Telegram `notification_queue` container can reuse the exact data shapes.
 */

export type TimetableViewMode = 'week' | 'day' | 'month';

export type BlockCategory =
  | 'deep-work'
  | 'work'
  | 'study'
  | 'health'
  | 'family'
  | 'commute'
  | 'meal'
  | 'buffer'
  | 'reading'
  | 'sleep';

export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type RecurrenceRule = 'none' | 'daily' | 'weekdays' | 'weekly';

export type ReminderLeadMinutes = 0 | 5 | 10 | 15 | 30;

export type TimetablePresetId = 'workday-coaching' | 'scholar-ial';

export interface TelegramReminderConfig {
  enabled: boolean;
  /** Minutes before block start when the 5-minute Cloudflare Cron queues the Telegram ping */
  leadMinutes: ReminderLeadMinutes;
  /** Custom alert note included in Telegram bot message */
  note?: string;
}

export interface TimetableBlock {
  id: string;
  title: string;
  /** Local ISO calendar day (`YYYY-MM-DD`) */
  date: string;
  /** Minutes from 00:00 (`0`–`1425`) */
  startMinutes: number;
  /** Minutes from 00:00 (`15`–`1440`) */
  endMinutes: number;
  category: BlockCategory;
  priority?: TaskPriority;
  /** Optional Pomodoro linkage for `/pomodoro` deep-link launch */
  pomodorosPlanned?: number;
  pomodorosDone?: number;
  recurrence: RecurrenceRule;
  telegramReminder: TelegramReminderConfig;
  notes?: string;
  completed?: boolean;
  /** Non-negotiable fixed commitment vs flexible block */
  locked?: boolean;
}

export interface TodayFocusTask {
  id: string;
  title: string;
  priority: TaskPriority;
  estimatedMinutes: number;
  pomodorosPlanned?: number;
  pomodorosDone?: number;
  done: boolean;
  linkedBlockId?: string;
  tag?: string;
}

export interface SyncedExamCountdown {
  id: string;
  board: string;
  code: string;
  title: string;
  examDate: string;
  daysLeft: number;
  tone: 'danger' | 'primary' | 'success';
  targetGrade?: string;
}

export interface TimetablePersistedState {
  version: 1;
  presetId: TimetablePresetId;
  viewMode: TimetableViewMode;
  selectedDate: string;
  showExams: boolean;
  showOvernightHours: boolean;
  telegramConnected: boolean;
  telegramHandle: string;
  blocks: TimetableBlock[];
  focusTasks: TodayFocusTask[];
}

export interface CategoryMeta {
  id: BlockCategory;
  label: string;
  supportsPomodoro: boolean;
}

export const BLOCK_CATEGORIES: CategoryMeta[] = [
  { id: 'deep-work', label: 'Deep Work', supportsPomodoro: true },
  { id: 'study', label: 'Study', supportsPomodoro: true },
  { id: 'work', label: 'Work', supportsPomodoro: true },
  { id: 'health', label: 'Gym & Health', supportsPomodoro: false },
  { id: 'family', label: 'Family', supportsPomodoro: false },
  { id: 'reading', label: 'Reading', supportsPomodoro: true },
  { id: 'meal', label: 'Meals', supportsPomodoro: false },
  { id: 'commute', label: 'Commute', supportsPomodoro: false },
  { id: 'buffer', label: 'Transition Buffer', supportsPomodoro: false },
  { id: 'sleep', label: 'Sleep', supportsPomodoro: false },
];

export const REMINDER_LEAD_OPTIONS: { value: ReminderLeadMinutes; label: string }[] = [
  { value: 0, label: 'At start time' },
  { value: 5, label: '5 min before' },
  { value: 10, label: '10 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
];

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

export function createTimetableId(prefix = 'blk'): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return `${prefix}_${random}`;
}

export function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const year = parts[0] ?? 2026;
  const month = (parts[1] ?? 11) - 1;
  const day = parts[2] ?? 11;
  return new Date(year, month, day);
}

export function addDaysIso(iso: string, deltaDays: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + deltaDays);
  return toIsoDate(d);
}

/** Returns Monday–Sunday ISO dates for the week containing `isoDate` (or Sunday–Saturday if `weekStartsOn` = 0). */
export function getWeekDates(isoDate: string, weekStartsOn: 0 | 1 = 1): string[] {
  const d = parseIsoDate(isoDate);
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return Array.from({ length: 7 }, (_, i) => {
    const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return toIsoDate(next);
  });
}

/** Returns 42 calendar cells (6 weeks) covering the month of `isoDate`. */
export function getMonthGridDates(isoDate: string, weekStartsOn: 0 | 1 = 1): { iso: string; inMonth: boolean }[] {
  const d = parseIsoDate(isoDate);
  const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  const day = firstOfMonth.getDay();
  const offset = (day - weekStartsOn + 7) % 7;
  const gridStart = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const cell = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return {
      iso: toIsoDate(cell),
      inMonth: cell.getMonth() === d.getMonth(),
    };
  });
}

export function formatShortWeekday(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatDayNumber(iso: string): string {
  return String(parseIsoDate(iso).getDate());
}

export function formatMonthHeading(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatFullDateLabel(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** `06:00` – `24:00` 24-hour tabular format */
export function formatMinutes24h(minutes: number): string {
  const clamped = Math.max(0, Math.min(1440, Math.round(minutes)));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

/** Human 12-hour timestamp e.g. `6:00 AM`, `10:30 PM` */
export function formatMinutes12h(minutes: number): string {
  const clamped = Math.max(0, Math.min(1440, Math.round(minutes)));
  if (clamped === 0 || clamped === 1440) return '12:00 AM';
  const hh24 = Math.floor(clamped / 60);
  const mm = clamped % 60;
  const suffix = hh24 >= 12 ? 'PM' : 'AM';
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  return `${hh12}:${pad2(mm)} ${suffix}`;
}

export function formatDurationCompact(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function snapMinutes(minutes: number, step = 15): number {
  const snapped = Math.round(minutes / step) * step;
  return Math.max(0, Math.min(1440, snapped));
}

export function moveBlockToSlot(
  block: TimetableBlock,
  nextDate: string,
  rawStartMinutes: number
): TimetableBlock {
  const duration = Math.max(15, block.endMinutes - block.startMinutes);
  const snappedStart = snapMinutes(rawStartMinutes, 15);
  const clampedStart = Math.max(0, Math.min(1440 - duration, snappedStart));
  return {
    ...block,
    date: nextDate,
    startMinutes: clampedStart,
    endMinutes: clampedStart + duration,
  };
}

export function resizeBlockDuration(
  block: TimetableBlock,
  rawEndMinutes: number,
  minDuration = 15
): TimetableBlock {
  const snappedEnd = snapMinutes(rawEndMinutes, 15);
  const clampedEnd = Math.max(block.startMinutes + minDuration, Math.min(1440, snappedEnd));
  return {
    ...block,
    endMinutes: clampedEnd,
  };
}

export function blockAppliesToDate(block: TimetableBlock, targetDate: string): boolean {
  if (block.date === targetDate) return true;
  if (block.recurrence === 'none') return false;
  if (targetDate < block.date) return false;
  const targetDay = parseIsoDate(targetDate).getDay();
  if (block.recurrence === 'daily') return true;
  if (block.recurrence === 'weekdays') return targetDay >= 1 && targetDay <= 5;
  if (block.recurrence === 'weekly') return targetDay === parseIsoDate(block.date).getDay();
  return false;
}

export function getBlocksForDate(blocks: TimetableBlock[], targetDate: string): TimetableBlock[] {
  const exactIds = new Set<string>();
  const exact: TimetableBlock[] = [];
  for (const b of blocks) {
    if (b.date === targetDate) {
      exactIds.add(b.id);
      exact.push(b);
    }
  }
  const expanded: TimetableBlock[] = [...exact];
  for (const b of blocks) {
    if (!exactIds.has(b.id) && blockAppliesToDate(b, targetDate)) {
      expanded.push({ ...b, date: targetDate });
    }
  }
  return expanded.sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
}

/** Computes which 5-minute Cloudflare Cron window triggers the Telegram ping. */
export function getTelegramTriggerMinutes(block: TimetableBlock): number {
  const raw = Math.max(0, block.startMinutes - block.telegramReminder.leadMinutes);
  // Align down to nearest 5-minute cron tick
  return Math.floor(raw / 5) * 5;
}

export interface DayAllocationSummary {
  focusMinutes: number;
  commitmentMinutes: number;
  healthAndMealsMinutes: number;
  bufferMinutes: number;
  sleepMinutes: number;
  totalMinutes: number;
  reminderCount: number;
  plannedPomodoros: number;
}

export function computeDayAllocations(blocks: TimetableBlock[]): DayAllocationSummary {
  let focusMinutes = 0;
  let commitmentMinutes = 0;
  let healthAndMealsMinutes = 0;
  let bufferMinutes = 0;
  let sleepMinutes = 0;
  let reminderCount = 0;
  let plannedPomodoros = 0;

  for (const b of blocks) {
    const dur = Math.max(0, b.endMinutes - b.startMinutes);
    if (b.telegramReminder.enabled) reminderCount += 1;
    if (b.pomodorosPlanned) plannedPomodoros += b.pomodorosPlanned;

    switch (b.category) {
      case 'deep-work':
      case 'study':
      case 'reading':
        focusMinutes += dur;
        break;
      case 'work':
      case 'commute':
      case 'family':
        commitmentMinutes += dur;
        break;
      case 'health':
      case 'meal':
        healthAndMealsMinutes += dur;
        break;
      case 'buffer':
        bufferMinutes += dur;
        break;
      case 'sleep':
        sleepMinutes += dur;
        break;
    }
  }

  return {
    focusMinutes,
    commitmentMinutes,
    healthAndMealsMinutes,
    bufferMinutes,
    sleepMinutes,
    totalMinutes:
      focusMinutes + commitmentMinutes + healthAndMealsMinutes + bufferMinutes + sleepMinutes,
    reminderCount,
    plannedPomodoros,
  };
}

export function buildPomodoroHandoffUrl(opts: {
  title: string;
  pomodoros?: number;
}): string {
  const params = new URLSearchParams();
  params.set('task', opts.title);
  if (opts.pomodoros && opts.pomodoros > 0) {
    params.set('pomodoros', String(Math.min(20, Math.max(1, Math.round(opts.pomodoros)))));
  }
  return `/pomodoro?${params.toString()}`;
}

export function getCategoryLabel(category: BlockCategory): string {
  return BLOCK_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

export function categorySupportsPomodoro(category: BlockCategory): boolean {
  return BLOCK_CATEGORIES.find((c) => c.id === category)?.supportsPomodoro ?? false;
}

/** Finds the first conflict-free 15-minute aligned slot of `durationMinutes` at or after `preferredStart`. */
export function findNextOpenSlotMinutes(
  dayBlocks: TimetableBlock[],
  durationMinutes = 45,
  preferredStart = 6 * 60 + 15
): number {
  const needed = Math.max(15, snapMinutes(durationMinutes, 15));
  const sorted = [...dayBlocks].sort((a, b) => a.startMinutes - b.startMinutes);
  let cursor = snapMinutes(preferredStart, 15);
  for (const b of sorted) {
    if (b.endMinutes <= cursor) continue;
    if (b.startMinutes >= cursor + needed) return cursor;
    cursor = Math.max(cursor, snapMinutes(b.endMinutes, 15));
  }
  return Math.min(1440 - needed, cursor);
}
