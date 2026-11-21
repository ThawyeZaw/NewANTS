import { describe, expect, it } from 'vitest';
import { TaskCardView } from '../components/tasks/views/TaskCardView';
import { TaskPlannerView } from '../components/tasks/views/TaskPlannerView';
import { TodayFocusPanelView } from '../components/tasks/views/TodayFocusPanelView';
import {
  collectAvailableTags,
  computeTodayFocusSummary,
  filterTasks,
  formatDueDateChip,
  getSubtaskProgress,
  getTodayFocusTasks,
  mergeTimetableIntoTasks,
  parseQuickAddInput,
  sortTasks,
  toTimetableFocusTasks,
} from '../lib/tasks/engine';
import {
  loadTasksState,
  sanitizeTasksState,
  saveTasksState,
} from '../lib/tasks/storage';
import {
  DEFAULT_TASKS_REFERENCE_DATE,
  createCoachingPlannerTasks,
  createPresetTasksState,
} from '../mocks/tasks.mock';
import { createPresetTimetableState } from '../mocks/timetable.mock';

describe('@ants/flow [ZYY-3.2] Task Planner Views & Helpers', () => {
  it('exports all presentational Task Planner views and dual presets', () => {
    expect(TaskPlannerView).toBeDefined();
    expect(TaskCardView).toBeDefined();
    expect(TodayFocusPanelView).toBeDefined();

    const coaching = createPresetTasksState('workday-coaching', DEFAULT_TASKS_REFERENCE_DATE);
    const scholar = createPresetTasksState('scholar-ial', DEFAULT_TASKS_REFERENCE_DATE);
    expect(coaching.tasks.length).toBeGreaterThanOrEqual(7);
    expect(scholar.tasks.some((t) => t.tags.includes('WMA11'))).toBe(true);
  });

  it('sorts open tasks P1 -> P2 -> P3 -> P4 and places completed tasks last', () => {
    const tasks = createCoachingPlannerTasks(DEFAULT_TASKS_REFERENCE_DATE);
    const sorted = sortTasks(tasks, 'priority', DEFAULT_TASKS_REFERENCE_DATE);

    const openTasks = sorted.filter((t) => !t.done);
    const doneTasks = sorted.filter((t) => t.done);
    expect(doneTasks.length).toBeGreaterThanOrEqual(1);
    expect(sorted[sorted.length - 1]?.done).toBe(true);

    // Every open task priority weight must be non-decreasing
    const rank = { P1: 1, P2: 2, P3: 3, P4: 4 } as const;
    for (let i = 1; i < openTasks.length; i += 1) {
      expect(rank[openTasks[i]!.priority]).toBeGreaterThanOrEqual(rank[openTasks[i - 1]!.priority]);
    }
    // Today-pinned P2 (ft_gym) sorts before tomorrow's P2 (ft_q4_roadmap)
    const gymIdx = openTasks.findIndex((t) => t.id === 'ft_gym');
    const q4Idx = openTasks.findIndex((t) => t.id === 'ft_q4_roadmap');
    expect(gymIdx).toBeGreaterThan(-1);
    expect(q4Idx).toBeGreaterThan(gymIdx);
  });

  it('filters accurately across smart views, priority pills, tag chips, and subtask search', () => {
    const tasks = createCoachingPlannerTasks(DEFAULT_TASKS_REFERENCE_DATE);

    const p1Only = filterTasks(tasks, {
      smartView: 'all',
      priorityFilter: 'P1',
      selectedTags: [],
      searchQuery: '',
      todayIso: DEFAULT_TASKS_REFERENCE_DATE,
    });
    expect(p1Only.every((t) => t.priority === 'P1')).toBe(true);
    expect(p1Only).toHaveLength(2);

    const tagFiltered = filterTasks(tasks, {
      smartView: 'all',
      priorityFilter: 'ALL',
      selectedTags: ['Side Hustle'],
      searchQuery: '',
      todayIso: DEFAULT_TASKS_REFERENCE_DATE,
    });
    expect(tagFiltered.length).toBeGreaterThanOrEqual(2);
    expect(tagFiltered.every((t) => t.tags.includes('Side Hustle'))).toBe(true);

    // Search matches nested subtask text ("incline press" inside ft_gym)
    const subtaskMatch = filterTasks(tasks, {
      smartView: 'all',
      priorityFilter: 'ALL',
      selectedTags: [],
      searchQuery: 'incline press',
      todayIso: DEFAULT_TASKS_REFERENCE_DATE,
    });
    expect(subtaskMatch.map((t) => t.id)).toEqual(['ft_gym']);

    const upcomingOnly = filterTasks(tasks, {
      smartView: 'upcoming',
      priorityFilter: 'ALL',
      selectedTags: [],
      searchQuery: '',
      todayIso: DEFAULT_TASKS_REFERENCE_DATE,
    });
    expect(upcomingOnly.every((t) => Boolean(t.dueDate) && t.dueDate! > DEFAULT_TASKS_REFERENCE_DATE)).toBe(true);
  });

  it('parses TickTick-style quick-add shorthand tokens cleanly', () => {
    const parsed = parseQuickAddInput('Solve differentiation set !p1 #WMA11 #PastPaper @today ~3p', {
      priority: 'P3',
      todayIso: DEFAULT_TASKS_REFERENCE_DATE,
    });

    expect(parsed.title).toBe('Solve differentiation set');
    expect(parsed.priority).toBe('P1');
    expect(parsed.tags).toEqual(['WMA11', 'PastPaper']);
    expect(parsed.dueDate).toBe(DEFAULT_TASKS_REFERENCE_DATE);
    expect(parsed.inTodayFocus).toBe(true);
    expect(parsed.pomodorosPlanned).toBe(3);
    expect(parsed.estimatedMinutes).toBe(75);

    const minuteParsed = parseQuickAddInput('Call bank ~15m', {
      priority: 'P3',
      pomodorosPlanned: 1,
      todayIso: DEFAULT_TASKS_REFERENCE_DATE,
    });
    expect(minuteParsed.title).toBe('Call bank');
    expect(minuteParsed.estimatedMinutes).toBe(15);
    expect(minuteParsed.pomodorosPlanned).toBeUndefined();
  });

  it('computes subtask progress, tag counts, due chips, and Today Focus summary', () => {
    const tasks = createCoachingPlannerTasks(DEFAULT_TASKS_REFERENCE_DATE);
    const hustle = tasks.find((t) => t.id === 'ft_side_hustle')!;
    expect(getSubtaskProgress(hustle)).toEqual({ completed: 1, total: 3, percent: 33 });

    const tags = collectAvailableTags(tasks);
    expect(tags.some((t) => t.tag === 'Side Hustle' && t.openCount === 2)).toBe(true);

    const focus = getTodayFocusTasks(tasks, DEFAULT_TASKS_REFERENCE_DATE);
    const summary = computeTodayFocusSummary(focus);
    expect(summary.p1OpenCount).toBe(2);
    expect(summary.doneCount).toBe(1);
    expect(summary.openCount).toBeGreaterThanOrEqual(4);

    expect(formatDueDateChip('2026-11-10', '2026-11-11')?.label).toBe('Overdue');
    expect(formatDueDateChip('2026-11-11', '2026-11-11')?.label).toBe('Today');
    expect(formatDueDateChip('2026-11-12', '2026-11-11')?.label).toBe('Tomorrow');
  });

  it('sanitizes localStorage task state and syncs cleanly with Timetable focus tasks', () => {
    const memory = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
    };

    const preset = createPresetTasksState('scholar-ial', DEFAULT_TASKS_REFERENCE_DATE);
    expect(saveTasksState(preset, 'tasks-test', fakeStorage)).toBe(true);
    const loaded = loadTasksState('tasks-test', fakeStorage);
    expect(loaded?.presetId).toBe('scholar-ial');
    expect(loaded?.tasks).toHaveLength(preset.tasks.length);
    expect(sanitizeTasksState({ tasks: 'bad' })).toBeNull();

    const timetable = createPresetTimetableState('workday-coaching', DEFAULT_TASKS_REFERENCE_DATE);
    const coachingTasks = createCoachingPlannerTasks(DEFAULT_TASKS_REFERENCE_DATE);
    const bridged = toTimetableFocusTasks(coachingTasks, DEFAULT_TASKS_REFERENCE_DATE);
    expect(bridged.some((t) => t.id === 'ft_side_hustle')).toBe(true);

    const toggledTimetable = {
      ...timetable,
      focusTasks: [
        ...timetable.focusTasks.map((ft) =>
          ft.id === 'ft_reading' ? { ...ft, done: true } : ft
        ),
        {
          id: 'ft_rail_added',
          title: 'Added from timetable rail',
          priority: 'P1' as const,
          estimatedMinutes: 25,
          done: false,
          tag: 'Quick',
        },
      ],
    };
    const merged = mergeTimetableIntoTasks(coachingTasks, toggledTimetable, DEFAULT_TASKS_REFERENCE_DATE);
    expect(merged.find((t) => t.id === 'ft_reading')?.done).toBe(true);
    expect(merged.some((t) => t.id === 'ft_rail_added')).toBe(true);
  });
});

