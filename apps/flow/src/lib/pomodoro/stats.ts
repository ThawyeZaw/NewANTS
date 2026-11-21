/**
 * Flow Pomodoro — pure statistics aggregation for daily / weekly productivity charts.
 * All functions use the user's local calendar (weeks start on Monday).
 */
import type { PomodoroSessionRecord } from './engine';

export interface DayBucket {
  /** `YYYY-MM-DD` (local) */
  dateKey: string;
  /** Short label, e.g. `Mon` */
  label: string;
  /** Long label, e.g. `Mon, Nov 10` */
  fullLabel: string;
  focusMinutes: number;
  pomodoros: number;
  isToday: boolean;
}

export interface WeekBucket {
  /** `YYYY-MM-DD` of the Monday that starts the week */
  weekStartKey: string;
  /** e.g. `Nov 3` */
  label: string;
  focusMinutes: number;
  pomodoros: number;
  isCurrent: boolean;
}

export interface TaskBreakdownItem {
  taskId: string | null;
  title: string;
  focusMinutes: number;
  pomodoros: number;
}

export interface PomodoroSummary {
  todayPomodoros: number;
  todayFocusMinutes: number;
  weekPomodoros: number;
  weekFocusMinutes: number;
  totalPomodoros: number;
  totalFocusMinutes: number;
  /** Consecutive days (ending today, or yesterday if today is still empty) with ≥ 1 pomodoro */
  currentStreak: number;
  bestStreak: number;
  /** Share of work intervals that were finished rather than abandoned, 0 – 1 */
  completionRate: number;
  /** Average daily focus minutes over the last 7 days */
  dailyAverageMinutes: number;
  goalProgress: number;
}

const DAY_MS = 86_400_000;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Monday 00:00 of the week containing `date`. */
export function startOfLocalWeek(date: Date): Date {
  const day = startOfLocalDay(date);
  const offset = (day.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - offset);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function workSessions(history: PomodoroSessionRecord[]): PomodoroSessionRecord[] {
  return history.filter((r) => r.phase === 'work');
}

function sessionDate(record: PomodoroSessionRecord): Date {
  return new Date(record.startedAt);
}

/** Map of `YYYY-MM-DD` → { minutes, pomodoros } for work intervals. */
export function groupByDay(
  history: PomodoroSessionRecord[]
): Map<string, { focusMinutes: number; pomodoros: number }> {
  const map = new Map<string, { focusMinutes: number; pomodoros: number }>();
  for (const record of workSessions(history)) {
    const key = toLocalDateKey(sessionDate(record));
    const entry = map.get(key) ?? { focusMinutes: 0, pomodoros: 0 };
    entry.focusMinutes += record.durationSeconds / 60;
    if (record.completed) entry.pomodoros += 1;
    map.set(key, entry);
  }
  return map;
}

/** The last `days` calendar days ending today (oldest first). */
export function getDailyBuckets(
  history: PomodoroSessionRecord[],
  days: number,
  now: Date
): DayBucket[] {
  const byDay = groupByDay(history);
  const today = startOfLocalDay(now);
  const todayKey = toLocalDateKey(today);
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const key = toLocalDateKey(date);
    const entry = byDay.get(key);
    buckets.push({
      dateKey: key,
      label: WEEKDAY_SHORT[date.getDay()] ?? '',
      fullLabel: `${WEEKDAY_SHORT[date.getDay()] ?? ''}, ${MONTH_SHORT[date.getMonth()] ?? ''} ${date.getDate()}`,
      focusMinutes: Math.round(entry?.focusMinutes ?? 0),
      pomodoros: entry?.pomodoros ?? 0,
      isToday: key === todayKey,
    });
  }
  return buckets;
}

/** The last `weeks` Monday-based weeks ending with the current week (oldest first). */
export function getWeeklyBuckets(
  history: PomodoroSessionRecord[],
  weeks: number,
  now: Date
): WeekBucket[] {
  const currentWeekStart = startOfLocalWeek(now);
  const buckets: WeekBucket[] = [];
  const indexByKey = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = addDays(currentWeekStart, -7 * i);
    const key = toLocalDateKey(start);
    indexByKey.set(key, buckets.length);
    buckets.push({
      weekStartKey: key,
      label: `${MONTH_SHORT[start.getMonth()] ?? ''} ${start.getDate()}`,
      focusMinutes: 0,
      pomodoros: 0,
      isCurrent: i === 0,
    });
  }
  for (const record of workSessions(history)) {
    const key = toLocalDateKey(startOfLocalWeek(sessionDate(record)));
    const index = indexByKey.get(key);
    if (index === undefined) continue;
    const bucket = buckets[index];
    if (!bucket) continue;
    bucket.focusMinutes += record.durationSeconds / 60;
    if (record.completed) bucket.pomodoros += 1;
  }
  return buckets.map((b) => ({ ...b, focusMinutes: Math.round(b.focusMinutes) }));
}

/** Focus minutes per hour of day (0 – 23) over the last `days` days. */
export function getHourlyDistribution(
  history: PomodoroSessionRecord[],
  days: number,
  now: Date
): number[] {
  const hours = Array.from({ length: 24 }, () => 0);
  const since = startOfLocalDay(now).getTime() - (days - 1) * DAY_MS;
  for (const record of workSessions(history)) {
    const date = sessionDate(record);
    if (date.getTime() < since) continue;
    const hour = date.getHours();
    hours[hour] = (hours[hour] ?? 0) + record.durationSeconds / 60;
  }
  return hours.map((m) => Math.round(m));
}

/** Focus minutes per task over the last `days` days, largest first. */
export function getTaskBreakdown(
  history: PomodoroSessionRecord[],
  days: number,
  now: Date,
  limit = 5
): TaskBreakdownItem[] {
  const since = startOfLocalDay(now).getTime() - (days - 1) * DAY_MS;
  const map = new Map<string, TaskBreakdownItem>();
  for (const record of workSessions(history)) {
    if (sessionDate(record).getTime() < since) continue;
    const key = record.taskId ?? '__none__';
    const item = map.get(key) ?? {
      taskId: record.taskId,
      title: record.taskTitle ?? 'No task',
      focusMinutes: 0,
      pomodoros: 0,
    };
    item.focusMinutes += record.durationSeconds / 60;
    if (record.completed) item.pomodoros += 1;
    map.set(key, item);
  }
  return [...map.values()]
    .map((i) => ({ ...i, focusMinutes: Math.round(i.focusMinutes) }))
    .sort((a, b) => b.focusMinutes - a.focusMinutes)
    .slice(0, limit);
}

function computeStreaks(byDay: Map<string, { pomodoros: number }>, now: Date) {
  const activeDays = new Set(
    [...byDay.entries()].filter(([, v]) => v.pomodoros > 0).map(([k]) => k)
  );

  // Current streak — today counts if active; otherwise start from yesterday.
  let current = 0;
  let cursor = startOfLocalDay(now);
  if (!activeDays.has(toLocalDateKey(cursor))) cursor = addDays(cursor, -1);
  while (activeDays.has(toLocalDateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // Best streak across all history.
  const sorted = [...activeDays].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
    if (prev && toLocalDateKey(addDays(prev, 1)) === key) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = date;
  }
  return { current, best: Math.max(best, current) };
}

export function getSummary(
  history: PomodoroSessionRecord[],
  now: Date,
  dailyGoal: number
): PomodoroSummary {
  const byDay = groupByDay(history);
  const todayKey = toLocalDateKey(now);
  const today = byDay.get(todayKey);
  const weekStart = startOfLocalWeek(now).getTime();

  let weekPomodoros = 0;
  let weekFocusMinutes = 0;
  let totalPomodoros = 0;
  let totalFocusMinutes = 0;
  let workIntervals = 0;
  let completedIntervals = 0;

  for (const record of workSessions(history)) {
    const minutes = record.durationSeconds / 60;
    totalFocusMinutes += minutes;
    workIntervals += 1;
    if (record.completed) {
      totalPomodoros += 1;
      completedIntervals += 1;
    }
    if (sessionDate(record).getTime() >= weekStart) {
      weekFocusMinutes += minutes;
      if (record.completed) weekPomodoros += 1;
    }
  }

  const last7 = getDailyBuckets(history, 7, now);
  const dailyAverageMinutes = last7.reduce((s, b) => s + b.focusMinutes, 0) / 7;
  const streaks = computeStreaks(byDay, now);
  const todayPomodoros = today?.pomodoros ?? 0;

  return {
    todayPomodoros,
    todayFocusMinutes: Math.round(today?.focusMinutes ?? 0),
    weekPomodoros,
    weekFocusMinutes: Math.round(weekFocusMinutes),
    totalPomodoros,
    totalFocusMinutes: Math.round(totalFocusMinutes),
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    completionRate: workIntervals === 0 ? 0 : completedIntervals / workIntervals,
    dailyAverageMinutes: Math.round(dailyAverageMinutes),
    goalProgress: dailyGoal > 0 ? Math.min(1, todayPomodoros / dailyGoal) : 0,
  };
}

