/**
 * Flow Pomodoro — realistic mock fixtures so `<PomodoroView />` renders a populated,
 * fully interactive prototype before Thaw wires D1 data (`[THAW-3.1]`).
 */
import {
  DEFAULT_POMODORO_SETTINGS,
  createInitialTimer,
  type PomodoroPersistedState,
  type PomodoroSessionRecord,
  type PomodoroTask,
} from '../lib/pomodoro/engine';

export const MOCK_POMODORO_TASKS: PomodoroTask[] = [
  {
    id: 'task_mock_pure_maths',
    title: 'WMA11 — Differentiation past paper (Jan 2024)',
    estimatedPomodoros: 4,
    completedPomodoros: 1,
    done: false,
    createdAt: '2026-11-08T08:00:00.000Z',
  },
  {
    id: 'task_mock_chemistry',
    title: 'IGCSE Chemistry: Organic chemistry flashcards',
    estimatedPomodoros: 2,
    completedPomodoros: 0,
    done: false,
    createdAt: '2026-11-08T08:05:00.000Z',
  },
  {
    id: 'task_mock_essay',
    title: 'English Language essay draft',
    estimatedPomodoros: 3,
    completedPomodoros: 3,
    done: true,
    createdAt: '2026-11-07T10:00:00.000Z',
  },
];

/** Deterministic pseudo-random generator so mock charts look the same on every reload. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** About three weeks of believable work history ending yesterday, relative to `now`. */
export function createMockPomodoroHistory(now: Date = new Date()): PomodoroSessionRecord[] {
  const rand = seeded(42);
  const records: PomodoroSessionRecord[] = [];
  const tasks = MOCK_POMODORO_TASKS;
  for (let daysAgo = 20; daysAgo >= 1; daysAgo -= 1) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    if (rand() < (isWeekend ? 0.35 : 0.12)) continue; // rest days
    const sessions = Math.floor(rand() * (isWeekend ? 4 : 7)) + 2;
    let cursor = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 8 + Math.floor(rand() * 3), Math.floor(rand() * 4) * 15);
    for (let i = 0; i < sessions; i += 1) {
      const completed = rand() > 0.12;
      const planned = 25 * 60;
      const duration = completed ? planned : Math.floor(planned * (0.3 + rand() * 0.5));
      const task = tasks[Math.floor(rand() * tasks.length)] ?? null;
      const startedAt = cursor;
      const endedAt = new Date(startedAt.getTime() + duration * 1000);
      records.push({
        id: `pom_mock_${daysAgo}_${i}`,
        phase: 'work',
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationSeconds: duration,
        plannedSeconds: planned,
        completed,
        taskId: task?.id ?? null,
        taskTitle: task?.title ?? null,
        interruptions: rand() > 0.7 ? 1 : 0,
      });
      const breakMinutes = (i + 1) % 4 === 0 ? 15 : 5;
      // Occasionally a longer gap (lunch, class) between pomodoros.
      const gap = rand() > 0.75 ? 60 + Math.floor(rand() * 120) : breakMinutes;
      cursor = new Date(endedAt.getTime() + gap * 60_000);
    }
  }
  return records;
}

export function createMockPomodoroState(now: Date = new Date()): PomodoroPersistedState {
  return {
    version: 1,
    settings: DEFAULT_POMODORO_SETTINGS,
    tasks: MOCK_POMODORO_TASKS,
    activeTaskId: MOCK_POMODORO_TASKS[0]?.id ?? null,
    history: createMockPomodoroHistory(now),
    timer: createInitialTimer(DEFAULT_POMODORO_SETTINGS),
  };
}

export const POMODORO_KEYBOARD_SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Space'], label: 'Start / pause timer' },
  { keys: ['R'], label: 'Reset current interval' },
  { keys: ['S'], label: 'Skip to next interval' },
  { keys: ['1'], label: 'Switch to Focus' },
  { keys: ['2'], label: 'Switch to Short Break' },
  { keys: ['3'], label: 'Switch to Long Break' },
  { keys: ['F'], label: 'Toggle focus mode' },
  { keys: ['N'], label: 'Add a new task' },
  { keys: ['T'], label: 'Toggle light / dark theme' },
  { keys: [','], label: 'Open settings' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['Esc'], label: 'Exit focus mode / close dialog' },
];

