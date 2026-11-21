/**
 * Flow Task Planner (`/tasks`) — pure, framework-free task sorting, filtering,
 * quick-add parsing, subtask rollup, and Timetable/Pomodoro bridge helpers.
 *
 * Designed without DOM/storage dependencies so both Zyy's presentational views
 * and Thaw's `[THAW-3.2]` D1/API container share deterministic business rules.
 */
import {
  PRIORITY_ORDER,
  addDaysIso,
  blockAppliesToDate,
  createTimetableId,
  toIsoDate,
  type TaskPriority,
  type TimetablePersistedState,
  type TimetablePresetId,
  type TodayFocusTask,
} from '../timetable/engine';

export type TaskSmartView = 'all' | 'today' | 'upcoming' | 'high-priority' | 'completed';
export type TaskSortMode = 'priority' | 'due-date' | 'duration' | 'recent';
export type TaskPresetId = TimetablePresetId;

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface PlannerTask {
  id: string;
  title: string;
  notes?: string;
  priority: TaskPriority;
  /** Optional ISO calendar date (`YYYY-MM-DD`) */
  dueDate?: string;
  /** Subject, life-area, or workflow tags (e.g. `WMA11`, `Side Hustle`, `Health`) */
  tags: string[];
  estimatedMinutes: number;
  pomodorosPlanned?: number;
  pomodorosDone?: number;
  /** Explicitly pinned to Today Focus Panel (tasks due today also appear in Today Focus) */
  inTodayFocus: boolean;
  done: boolean;
  subtasks: TaskSubtask[];
  /** Linked block id in `ants-flow-timetable-v1` when scheduled onto `/timetable` */
  linkedBlockId?: string;
  /** Optional readable schedule slot label, e.g. `Today · 06:15` */
  scheduledSlotLabel?: string;
  createdAt: string;
}

export interface TasksPersistedState {
  version: 1;
  presetId: TaskPresetId;
  selectedDate: string;
  tasks: PlannerTask[];
}

export interface TaskFilterCriteria {
  smartView: TaskSmartView;
  priorityFilter: 'ALL' | TaskPriority;
  selectedTags: string[];
  searchQuery: string;
  todayIso: string;
}

export interface TagCountSummary {
  tag: string;
  openCount: number;
  totalCount: number;
}

export interface SubtaskProgress {
  completed: number;
  total: number;
  percent: number;
}

export interface TodayFocusSummary {
  openCount: number;
  doneCount: number;
  totalCount: number;
  percent: number;
  plannedMinutes: number;
  plannedPomodoros: number;
  p1OpenCount: number;
}

export interface QuickAddParseResult {
  title: string;
  priority: TaskPriority;
  tags: string[];
  dueDate?: string;
  inTodayFocus: boolean;
  estimatedMinutes: number;
  pomodorosPlanned?: number;
}

export const TASK_PRIORITIES: readonly TaskPriority[] = ['P1', 'P2', 'P3', 'P4'];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  P1: 'Urgent',
  P2: 'High',
  P3: 'Normal',
  P4: 'Low',
};

export function createTaskId(prefix = 'tsk'): string {
  return createTimetableId(prefix);
}

/** Computes completed / total counts and rounded percentage for a task's subtask checklist. */
export function getSubtaskProgress(task: Pick<PlannerTask, 'subtasks'>): SubtaskProgress {
  const total = task.subtasks.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = task.subtasks.filter((sub) => sub.done).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

/**
 * Collects unique tags across tasks, sorted by open count descending then alphabetically,
 * so the Tag Filter Strip stays ordered by what needs attention right now.
 */
export function collectAvailableTags(tasks: PlannerTask[]): TagCountSummary[] {
  const counts = new Map<string, { openCount: number; totalCount: number }>();

  for (const task of tasks) {
    for (const rawTag of task.tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      const entry = counts.get(tag) ?? { openCount: 0, totalCount: 0 };
      entry.totalCount += 1;
      if (!task.done) entry.openCount += 1;
      counts.set(tag, entry);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, stat]) => ({ tag, ...stat }))
    .sort((a, b) => b.openCount - a.openCount || a.tag.localeCompare(b.tag));
}

/**
 * Multi-stage task filtering pipeline:
 * 1. Smart View filter (`all` | `today` | `upcoming` | `high-priority` | `completed`)
 * 2. Priority filter (`ALL` or exact `P1`..`P4` match)
 * 3. Tag filter (union match: if one or more tag chips are active, keep tasks carrying ANY active tag)
 * 4. Search query filter (case-insensitive substring match over title, notes, tags, and subtask titles)
 */
export function filterTasks(tasks: PlannerTask[], criteria: TaskFilterCriteria): PlannerTask[] {
  const query = criteria.searchQuery.trim().toLowerCase();
  const activeTags = new Set(criteria.selectedTags.map((tag) => tag.toLowerCase()));

  return tasks.filter((task) => {
    // Stage 1: Smart View bucket check
    switch (criteria.smartView) {
      case 'today':
        // Today view surfaces open tasks pinned to Today Focus OR due on/before today
        if (task.done) return false;
        if (!task.inTodayFocus && (!task.dueDate || task.dueDate > criteria.todayIso)) {
          return false;
        }
        break;
      case 'upcoming':
        // Upcoming shows open tasks scheduled strictly after today
        if (task.done || !task.dueDate || task.dueDate <= criteria.todayIso) {
          return false;
        }
        break;
      case 'high-priority':
        // High-priority focus lane narrows to open P1 and P2 items
        if (task.done || (task.priority !== 'P1' && task.priority !== 'P2')) {
          return false;
        }
        break;
      case 'completed':
        if (!task.done) return false;
        break;
      case 'all':
      default:
        // 'all' retains both open and completed tasks so callers can split them cleanly
        break;
    }

    // Stage 2: Explicit P1-P4 priority pill filter
    if (criteria.priorityFilter !== 'ALL' && task.priority !== criteria.priorityFilter) {
      return false;
    }

    // Stage 3: Tag filter (union match so picking #WMA11 + #9702 displays both subjects' tasks)
    if (activeTags.size > 0) {
      const hasMatchingTag = task.tags.some((tag) => activeTags.has(tag.toLowerCase()));
      if (!hasMatchingTag) return false;
    }

    // Stage 4: Free-text search across title, notes, tags, and subtask checklist items
    if (query.length > 0) {
      const inTitle = task.title.toLowerCase().includes(query);
      const inNotes = task.notes ? task.notes.toLowerCase().includes(query) : false;
      const inTags = task.tags.some((tag) => tag.toLowerCase().includes(query));
      const inSubtasks = task.subtasks.some((sub) => sub.title.toLowerCase().includes(query));
      if (!inTitle && !inNotes && !inTags && !inSubtasks) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Deterministic priority-aware comparator:
 * - Incomplete tasks always sort above completed tasks.
 * - `priority` mode (default): P1 (1) < P2 (2) < P3 (3) < P4 (4), then Today Focus pinned
 *   items first, then earliest due date (scheduled before unscheduled), then newest createdAt.
 * - `due-date` mode: overdue/earliest due dates first, falling back to P1 -> P4 priority.
 * - `duration` mode: longest estimated minutes first for batching deep work blocks.
 * - `recent` mode: newest `createdAt` first while still keeping open items above completed ones.
 */
export function sortTasks(
  tasks: PlannerTask[],
  sortMode: TaskSortMode = 'priority',
  todayIso?: string
): PlannerTask[] {
  const referenceToday = todayIso ?? toIsoDate(new Date());

  return [...tasks].sort((a, b) => {
    // Rule 1: Keep open tasks ahead of completed tasks
    if (a.done !== b.done) return a.done ? 1 : -1;

    if (sortMode === 'due-date') {
      const aDue = a.dueDate ?? '9999-12-31';
      const bDue = b.dueDate ?? '9999-12-31';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      const priDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priDiff !== 0) return priDiff;
    } else if (sortMode === 'duration') {
      if (b.estimatedMinutes !== a.estimatedMinutes) {
        return b.estimatedMinutes - a.estimatedMinutes;
      }
      const priDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priDiff !== 0) return priDiff;
    } else if (sortMode === 'recent') {
      const timeDiff = b.createdAt.localeCompare(a.createdAt);
      if (timeDiff !== 0) return timeDiff;
    } else {
      // Default 'priority' sort: strict TickTick-style P1 -> P2 -> P3 -> P4 ordering
      const priDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priDiff !== 0) return priDiff;

      // Tie-breaker 1: Today Focus tasks (pinned or due today) surface ahead of backlog items
      const aToday = a.inTodayFocus || (Boolean(a.dueDate) && a.dueDate! <= referenceToday);
      const bToday = b.inTodayFocus || (Boolean(b.dueDate) && b.dueDate! <= referenceToday);
      if (aToday !== bToday) return aToday ? -1 : 1;

      // Tie-breaker 2: Earliest due date precedes unscheduled tasks
      const aDue = a.dueDate ?? '9999-12-31';
      const bDue = b.dueDate ?? '9999-12-31';
      if (aDue !== bDue) return aDue.localeCompare(bDue);
    }

    // Final deterministic fallback: newest createdAt first, then alphabetical title
    const createdDiff = b.createdAt.localeCompare(a.createdAt);
    if (createdDiff !== 0) return createdDiff;
    return a.title.localeCompare(b.title);
  });
}

/** Returns the Today Focus queue (pinned OR due on/before `todayIso`), sorted P1 -> P4. */
export function getTodayFocusTasks(tasks: PlannerTask[], todayIso: string): PlannerTask[] {
  const focusEligible = tasks.filter(
    (task) => task.inTodayFocus || (Boolean(task.dueDate) && task.dueDate! <= todayIso)
  );
  return sortTasks(focusEligible, 'priority', todayIso);
}

/** Computes aggregate completion, time budget, and Pomodoro load for Today Focus. */
export function computeTodayFocusSummary(focusTasks: PlannerTask[]): TodayFocusSummary {
  const openTasks = focusTasks.filter((t) => !t.done);
  const doneCount = focusTasks.length - openTasks.length;
  const totalCount = focusTasks.length;
  const plannedMinutes = openTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const plannedPomodoros = openTasks.reduce((sum, t) => sum + (t.pomodorosPlanned ?? 0), 0);
  const p1OpenCount = openTasks.filter((t) => t.priority === 'P1').length;

  return {
    openCount: openTasks.length,
    doneCount,
    totalCount,
    percent: totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100),
    plannedMinutes,
    plannedPomodoros,
    p1OpenCount,
  };
}

/**
 * Parses quick-add inline tokens from rapid task entry:
 * - `!p1`..`!p4` (case-insensitive) sets priority
 * - `#tag` (supports letters, numbers, `-`, `_`) appends tags
 * - `@today` / `@tomorrow` / `@backlog` sets due date + Today Focus pin
 * - `~2p` sets Pomodoro count (× 25m) or `~45m` sets estimated minutes
 */
export function parseQuickAddInput(
  rawInput: string,
  defaults: {
    priority: TaskPriority;
    tag?: string;
    dueDate?: string;
    inTodayFocus?: boolean;
    pomodorosPlanned?: number;
    todayIso: string;
  }
): QuickAddParseResult {
  let priority: TaskPriority = defaults.priority;
  let dueDate: string | undefined = defaults.dueDate;
  let inTodayFocus: boolean = Boolean(defaults.inTodayFocus || dueDate === defaults.todayIso);
  let pomodorosPlanned: number | undefined =
    defaults.pomodorosPlanned && defaults.pomodorosPlanned > 0 ? defaults.pomodorosPlanned : undefined;
  let pomodoroExplicitlySet = false;
  let estimatedMinutes = pomodorosPlanned ? pomodorosPlanned * 25 : 30;

  const tagSet = new Set<string>();
  if (defaults.tag && defaults.tag.trim()) {
    tagSet.add(defaults.tag.trim());
  }

  const keptTokens: string[] = [];
  const words = rawInput.trim().split(/\s+/).filter(Boolean);

  for (const token of words) {
    const priMatch = /^!(p[1-4])$/i.exec(token);
    if (priMatch?.[1]) {
      priority = priMatch[1].toUpperCase() as TaskPriority;
      continue;
    }

    const tagMatch = /^#([A-Za-z0-9][A-Za-z0-9_-]{0,23})$/.exec(token);
    if (tagMatch?.[1]) {
      // Preserve hyphens inside syllabus/workflow tags (e.g. WMA11, exam-prep); normalize underscores to spaces
      tagSet.add(tagMatch[1].replace(/_/g, ' '));
      continue;
    }

    if (/^@today$/i.test(token)) {
      dueDate = defaults.todayIso;
      inTodayFocus = true;
      continue;
    }

    if (/^@tomorrow$/i.test(token)) {
      dueDate = addDaysIso(defaults.todayIso, 1);
      inTodayFocus = false;
      continue;
    }

    if (/^@backlog$/i.test(token)) {
      dueDate = undefined;
      inTodayFocus = false;
      continue;
    }

    const pomoMatch = /^~(\d{1,2})p$/i.exec(token);
    if (pomoMatch?.[1]) {
      const count = Math.max(1, Math.min(16, Number(pomoMatch[1])));
      pomodorosPlanned = count;
      pomodoroExplicitlySet = true;
      estimatedMinutes = count * 25;
      continue;
    }

    const minMatch = /^~(\d{1,3})m$/i.exec(token);
    if (minMatch?.[1]) {
      estimatedMinutes = Math.max(5, Math.min(480, Number(minMatch[1])));
      if (!pomodoroExplicitlySet) {
        pomodorosPlanned = undefined;
      }
      continue;
    }

    keptTokens.push(token);
  }

  const cleanedTitle = keptTokens.join(' ').trim().slice(0, 140);

  return {
    title: cleanedTitle || rawInput.trim().slice(0, 140),
    priority,
    tags: Array.from(tagSet).slice(0, 4),
    dueDate,
    inTodayFocus,
    estimatedMinutes,
    pomodorosPlanned,
  };
}

export function formatDueDateChip(
  dueDate: string | undefined,
  todayIso: string
): { label: string; tone: 'danger' | 'primary' | 'muted' } | null {
  if (!dueDate) return null;
  if (dueDate < todayIso) {
    return { label: 'Overdue', tone: 'danger' };
  }
  if (dueDate === todayIso) {
    return { label: 'Today', tone: 'primary' };
  }
  if (dueDate === addDaysIso(todayIso, 1)) {
    return { label: 'Tomorrow', tone: 'muted' };
  }
  const parts = dueDate.split('-').map(Number);
  const d = new Date(parts[0] ?? 2026, (parts[1] ?? 11) - 1, parts[2] ?? 11);
  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tone: 'muted',
  };
}

/** Maps Flow's Today Focus PlannerTasks into Timetable's `TodayFocusTask[]` rail format. */
export function toTimetableFocusTasks(tasks: PlannerTask[], todayIso: string): TodayFocusTask[] {
  return getTodayFocusTasks(tasks, todayIso).map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    estimatedMinutes: task.estimatedMinutes,
    pomodorosPlanned: task.pomodorosPlanned,
    pomodorosDone: task.pomodorosDone,
    done: task.done,
    linkedBlockId: task.linkedBlockId,
    tag: task.tags[0],
  }));
}

/**
 * Reconciles changes made inside `/timetable`'s Today Focus Rail back into `/tasks`
 * (e.g., if a user checked off or quick-added a task on `/timetable` before switching to `/tasks`).
 */
export function mergeTimetableIntoTasks(
  tasks: PlannerTask[],
  timetable: TimetablePersistedState,
  todayIso: string
): PlannerTask[] {
  const blockById = new Map(timetable.blocks.map((b) => [b.id, b]));
  const focusById = new Map(timetable.focusTasks.map((ft) => [ft.id, ft]));
  const knownIds = new Set(tasks.map((t) => t.id));

  const updated = tasks.map((task) => {
    const linkedBlock = task.linkedBlockId ? blockById.get(task.linkedBlockId) : undefined;
    const matchedFocus = focusById.get(task.id);
    if (!linkedBlock && !matchedFocus) return task;

    return {
      ...task,
      done: matchedFocus ? matchedFocus.done : task.done,
      priority: matchedFocus ? matchedFocus.priority : task.priority,
      scheduledSlotLabel: linkedBlock
        ? `${blockAppliesToDate(linkedBlock, todayIso) || linkedBlock.date === todayIso ? 'Today' : linkedBlock.date.slice(5)} · ${String(Math.floor(linkedBlock.startMinutes / 60)).padStart(2, '0')}:${String(linkedBlock.startMinutes % 60).padStart(2, '0')}`
        : task.scheduledSlotLabel,
    };
  });

  // Pull any brand-new tasks added directly on the Timetable rail (ids not yet in `/tasks`)
  const additions: PlannerTask[] = [];
  for (const ft of timetable.focusTasks) {
    if (knownIds.has(ft.id)) continue;
    additions.push({
      id: ft.id,
      title: ft.title,
      priority: ft.priority,
      dueDate: todayIso,
      tags: ft.tag ? [ft.tag] : [],
      estimatedMinutes: ft.estimatedMinutes,
      pomodorosPlanned: ft.pomodorosPlanned,
      pomodorosDone: ft.pomodorosDone,
      inTodayFocus: true,
      done: ft.done,
      subtasks: [],
      linkedBlockId: ft.linkedBlockId,
      createdAt: `${todayIso}T09:00:00.000Z`,
    });
  }

  return additions.length > 0 ? [...additions, ...updated] : updated;
}
