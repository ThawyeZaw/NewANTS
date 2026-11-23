/**
 * Flow Smart Timetable — pure, framework-free scheduling & reminder helpers.
 *
 * Deterministic functions (no DOM/storage dependencies) so Thaw's `[THAW-3.3]`
 * D1 / Telegram `notification_queue` container can reuse the exact data shapes.
 */

export type TimetableViewMode = 'week' | 'day' | 'month';
export type MonthDensityMode = 'compact' | 'comfortable' | 'detailed';

export const MIN_ZOOM_HOUR_HEIGHT = 28;
export const MAX_ZOOM_HOUR_HEIGHT = 140;
export const DEFAULT_ZOOM_HOUR_HEIGHT = 64;
export const TIMETABLE_ZOOM_LEVELS = [28, 40, 56, 72, 96, 120, 140] as const;
export type TimetableHourHeight = number;

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

/** Clamps and rounds any vertical hour-height zoom value (px/hr) within supported bounds. */
export function clampHourHeight(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ZOOM_HOUR_HEIGHT;
  return Math.max(MIN_ZOOM_HOUR_HEIGHT, Math.min(MAX_ZOOM_HOUR_HEIGHT, Math.round(value)));
}

/** Computes an hour-height (px/hr) that fits all `visibleHours` cleanly inside `viewportHeight`. */
export function computeFitHourHeight(viewportHeight: number, visibleHours: number): number {
  const safeHours = Math.max(1, visibleHours);
  const raw = Math.floor((viewportHeight - 230) / safeHours);
  return Math.max(MIN_ZOOM_HOUR_HEIGHT, Math.min(84, raw));
}

export interface PositionedTimetableBlock {
  block: TimetableBlock;
  displayStart: number;
  displayEnd: number;
  colIndex: number;
  colCount: number;
}

/**
 * Lays out concurrent/overlapping blocks side-by-side in equal-width sub-columns
 * within connected overlap clusters so blocks never stack over and hide each other.
 */
export function layoutOverlappingBlocks(
  blocks: TimetableBlock[],
  visibleStartMinutes: number,
  visibleEndMinutes = 1440
): PositionedTimetableBlock[] {
  const items = blocks
    .map((block) => ({
      block,
      displayStart: Math.max(visibleStartMinutes, block.startMinutes),
      displayEnd: Math.min(visibleEndMinutes, block.endMinutes),
    }))
    .filter((item) => item.displayEnd > item.displayStart)
    .sort(
      (a, b) =>
        a.displayStart - b.displayStart ||
        b.displayEnd - b.displayStart - (a.displayEnd - a.displayStart) ||
        a.block.id.localeCompare(b.block.id)
    );

  if (items.length === 0) return [];

  const clusters: Array<typeof items> = [];
  let currentCluster: typeof items = [];
  let clusterMaxEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0 || item.displayStart < clusterMaxEnd) {
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.displayEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = item.displayEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const positioned: PositionedTimetableBlock[] = [];
  for (const cluster of clusters) {
    const colEnds: number[] = [];
    const placed: Array<{ item: (typeof cluster)[number]; colIndex: number }> = [];

    for (const item of cluster) {
      let colIndex = colEnds.findIndex((end) => end <= item.displayStart);
      if (colIndex === -1) {
        colIndex = colEnds.length;
        colEnds.push(item.displayEnd);
      } else {
        colEnds[colIndex] = item.displayEnd;
      }
      placed.push({ item, colIndex });
    }

    const colCount = Math.max(1, colEnds.length);
    for (const { item, colIndex } of placed) {
      positioned.push({
        block: item.block,
        displayStart: item.displayStart,
        displayEnd: item.displayEnd,
        colIndex,
        colCount,
      });
    }
  }

  return positioned;
}

/**
 * Overnight morning sleep blocks (e.g. 00:00–06:00 or 00:00–06:30) fold into the
 * grouped `00–06` sleep banner when overnight hours are collapsed so they never peek into 06:00+.
 */
export function isGroupedOvernightSleepBlock(block: TimetableBlock): boolean {
  return block.category === 'sleep' && block.startMinutes === 0 && block.endMinutes <= 450;
}

export function filterVisibleTimelineBlocks(
  blocks: TimetableBlock[],
  showOvernightHours: boolean
): TimetableBlock[] {
  if (showOvernightHours) return blocks;
  return blocks.filter((b) => !isGroupedOvernightSleepBlock(b));
}

export function summarizeOvernightSleep(blocks: TimetableBlock[]): string {
  const morningSleep = blocks.find((b) => isGroupedOvernightSleepBlock(b));
  const eveningSleep = blocks.find(
    (b) => b.category === 'sleep' && b.endMinutes === 1440 && b.startMinutes >= 1140
  );

  if (morningSleep && eveningSleep) {
    const totalRest = 1440 - eveningSleep.startMinutes + morningSleep.endMinutes;
    return `${formatMinutes12h(eveningSleep.startMinutes)} – ${formatMinutes12h(morningSleep.endMinutes)} (${formatDurationCompact(totalRest)} rest)`;
  }
  if (morningSleep) {
    return `12:00 AM – ${formatMinutes12h(morningSleep.endMinutes)} (${formatDurationCompact(morningSleep.endMinutes)} rest)`;
  }
  return '00:00 – 06:00 collapsed';
}
