'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FilterX,
  Flame,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Tag,
} from 'lucide-react';
import { Button, ThemeToggle, cn, useSlidingIndicator, type MockUserProfile } from '@ants/ui';
import {
  addDaysIso,
  computeDayAllocations,
  findNextOpenSlotMinutes,
  formatMinutes24h,
  getBlocksForDate,
  toIsoDate,
  type TaskPriority,
  type TimetableBlock,
  type TimetablePersistedState,
} from '../../../lib/timetable/engine';
import {
  TIMETABLE_STORAGE_KEY,
  loadTimetableState,
  saveTimetableState,
} from '../../../lib/timetable/storage';
import {
  DEFAULT_TIMETABLE_REFERENCE_DATE,
  createPresetTimetableState,
} from '../../../mocks/timetable.mock';
import {
  TASK_PRIORITIES,
  collectAvailableTags,
  computeTodayFocusSummary,
  createTaskId,
  filterTasks,
  getTodayFocusTasks,
  mergeTimetableIntoTasks,
  parseQuickAddInput,
  sortTasks,
  toTimetableFocusTasks,
  type PlannerTask,
  type TaskPresetId,
  type TaskSmartView,
  type TaskSortMode,
  type TasksPersistedState,
} from '../../../lib/tasks/engine';
import {
  TASKS_STORAGE_KEY,
  loadTasksState,
  saveTasksState,
} from '../../../lib/tasks/storage';
import {
  DEFAULT_TASKS_REFERENCE_DATE,
  createPresetTasksState,
} from '../../../mocks/tasks.mock';
import { FlowShellView } from '../../layout/views/FlowShellView';
import {
  BlockEditorModalView,
  type BlockEditorDraft,
} from '../../timetable/views/BlockEditorModalView';
import { PRIORITY_BADGE_CLASSES } from './taskStyles';
import { TaskCardView } from './TaskCardView';
import { TodayFocusPanelView } from './TodayFocusPanelView';

export interface TaskPlannerViewProps {
  /** Initial persisted state (defaults to realistic 24h Workday preset) */
  initialState?: TasksPersistedState;
  /** Persist changes to `localStorage` & sync Today Focus with `/timetable` */
  persistToLocalStorage?: boolean;
  storageKey?: string;
  timetableStorageKey?: string;
  user?: MockUserProfile | null;
  onStateChange?: (state: TasksPersistedState) => void;
  onTaskScheduled?: (task: PlannerTask, block: TimetableBlock) => void;
}

const SMART_VIEWS: { id: TaskSmartView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'high-priority', label: 'P1–P2' },
  { id: 'completed', label: 'Done' },
];

const SORT_OPTIONS: { id: TaskSortMode; label: string }[] = [
  { id: 'priority', label: 'Priority (P1 → P4)' },
  { id: 'due-date', label: 'Due date' },
  { id: 'duration', label: 'Duration' },
  { id: 'recent', label: 'Recently added' },
];

const PRESET_OPTIONS: { id: TaskPresetId; label: string }[] = [
  { id: 'workday-coaching', label: '24h Workday' },
  { id: 'scholar-ial', label: 'IAL Scholar' },
];

export function TaskPlannerView({
  initialState,
  persistToLocalStorage = true,
  storageKey = TASKS_STORAGE_KEY,
  timetableStorageKey = TIMETABLE_STORAGE_KEY,
  user,
  onStateChange,
  onTaskScheduled,
}: TaskPlannerViewProps) {
  const [state, setState] = useState<TasksPersistedState>(
    () => initialState ?? createPresetTasksState('workday-coaching', DEFAULT_TASKS_REFERENCE_DATE)
  );
  const stateRef = useRef(state);
  const hasCustomInitialStateRef = useRef(Boolean(initialState));
  const [timetableState, setTimetableState] = useState<TimetablePersistedState>(() =>
    createPresetTimetableState('workday-coaching', DEFAULT_TIMETABLE_REFERENCE_DATE)
  );
  const timetableRef = useRef(timetableState);
  const [hydrated, setHydrated] = useState(false);
  const [todayIso, setTodayIso] = useState(DEFAULT_TASKS_REFERENCE_DATE);

  // Filter & Sort state
  const [smartView, setSmartView] = useState<TaskSmartView>('all');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<TaskSortMode>('priority');
  const [showCompletedDrawer, setShowCompletedDrawer] = useState(false);

  // Quick-Add Bar state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('P2');
  const [quickTag, setQuickTag] = useState('');
  const [quickDuePreset, setQuickDuePreset] = useState<'today' | 'tomorrow' | 'backlog'>('today');
  const [quickPomodoros, setQuickPomodoros] = useState<number>(1);

  // Timetable scheduling modal state
  const [scheduleTargetTask, setScheduleTargetTask] = useState<PlannerTask | null>(null);
  const [editorDraft, setEditorDraft] = useState<BlockEditorDraft | null>(null);

  // Mobile responsive drawers / collapsible helpers
  const [mobileFocusOpen, setMobileFocusOpen] = useState(false);
  const [quickMetaOpen, setQuickMetaOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const smartTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: smartTabsRect,
    ready: smartTabsReady,
    animate: smartTabsAnimate,
  } = useSlidingIndicator(smartTabsRef, smartView, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const smartTabsIndicatorReady = smartTabsReady && smartTabsRect.visible;

  const presetTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: presetTabsRect,
    ready: presetTabsReady,
    animate: presetTabsAnimate,
  } = useSlidingIndicator(presetTabsRef, state.presetId, {
    activeSelector: '[aria-pressed="true"]',
  });
  const presetTabsIndicatorReady = presetTabsReady && presetTabsRect.visible;

  const quickDueTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: quickDueRect,
    ready: quickDueReady,
    animate: quickDueAnimate,
  } = useSlidingIndicator(quickDueTabsRef, `${quickDuePreset}-${quickMetaOpen}`, {
    activeSelector: '[aria-pressed="true"]',
  });
  const quickDueIndicatorReady = quickDueReady && quickDueRect.visible;

  const priorityFilterTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: priorityFilterRect,
    ready: priorityFilterReady,
    animate: priorityFilterAnimate,
  } = useSlidingIndicator(
    priorityFilterTabsRef,
    `${priorityFilter}-${filtersOpen}-${selectedTags.length}`,
    {
      activeSelector: '[aria-pressed="true"]',
    }
  );
  const priorityFilterIndicatorReady = priorityFilterReady && priorityFilterRect.visible;

  useEffect(() => {
    if (!mobileFocusOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileFocusOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileFocusOpen]);

  const commit = useCallback(
    (next: TasksPersistedState) => {
      stateRef.current = next;
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange]
  );

  // Hydrate saved task state + reconcile any changes made on `/timetable`
  useEffect(() => {
    document.title = 'Task Planner · Flow — The ANTs Productivity Studio';
    const localToday = toIsoDate(new Date());
    setTodayIso(localToday);

    const savedTimetable = persistToLocalStorage ? loadTimetableState(timetableStorageKey) : null;
    const baseTimetable =
      savedTimetable ?? createPresetTimetableState(stateRef.current.presetId, localToday);
    timetableRef.current = baseTimetable;
    setTimetableState(baseTimetable);

    if (persistToLocalStorage) {
      const savedTasks = loadTasksState(storageKey);
      const baseTasks = savedTasks
        ? savedTasks.tasks
        : hasCustomInitialStateRef.current
          ? stateRef.current.tasks
          : createPresetTasksState(stateRef.current.presetId, localToday).tasks;
      const reconciled = mergeTimetableIntoTasks(baseTasks, baseTimetable, localToday);
      const next: TasksPersistedState = {
        ...(savedTasks ?? stateRef.current),
        selectedDate: localToday,
        tasks: reconciled,
      };
      stateRef.current = next;
      setState(next);
    }

    setHydrated(true);
  }, [persistToLocalStorage, storageKey, timetableStorageKey]);

  // Persist `/tasks` state AND mirror Today Focus tasks into `/timetable` localStorage
  useEffect(() => {
    if (!hydrated || !persistToLocalStorage) return;
    saveTasksState(state, storageKey);

    const nextTimetable: TimetablePersistedState = {
      ...timetableRef.current,
      focusTasks: toTimetableFocusTasks(state.tasks, todayIso),
    };
    timetableRef.current = nextTimetable;
    setTimetableState(nextTimetable);
    saveTimetableState(nextTimetable, timetableStorageKey);
  }, [state, hydrated, persistToLocalStorage, storageKey, timetableStorageKey, todayIso]);

  // Collect all unique tags across tasks for the Tag Filter Strip
  const availableTags = useMemo(() => collectAvailableTags(state.tasks), [state.tasks]);

  // Smart view counts for quick scanning
  const smartViewCounts = useMemo(() => {
    const open = state.tasks.filter((t) => !t.done);
    const done = state.tasks.filter((t) => t.done);
    return {
      all: open.length,
      today: open.filter((t) => t.inTodayFocus || (Boolean(t.dueDate) && t.dueDate! <= todayIso)).length,
      upcoming: open.filter((t) => Boolean(t.dueDate) && t.dueDate! > todayIso).length,
      'high-priority': open.filter((t) => t.priority === 'P1' || t.priority === 'P2').length,
      completed: done.length,
    } satisfies Record<TaskSmartView, number>;
  }, [state.tasks, todayIso]);

  // Live preview of parsed shorthand tokens (`!P1`, `#tag`, `@today`, `~2p`) in Quick-Add Bar
  const quickAddPreview = useMemo(() => {
    if (!quickTitle.trim()) return null;
    const defaultDue =
      quickDuePreset === 'today'
        ? todayIso
        : quickDuePreset === 'tomorrow'
          ? addDaysIso(todayIso, 1)
          : undefined;
    return parseQuickAddInput(quickTitle, {
      priority: quickPriority,
      tag: quickTag || undefined,
      dueDate: defaultDue,
      inTodayFocus: quickDuePreset === 'today',
      pomodorosPlanned: quickPomodoros,
      todayIso,
    });
  }, [quickTitle, quickPriority, quickTag, quickDuePreset, quickPomodoros, todayIso]);

  // Apply multi-stage filtering (`smartView` -> `priorityFilter` -> `selectedTags` -> `searchQuery`)
  // followed by deterministic priority sorting (`P1 -> P2 -> P3 -> P4`, open tasks before completed).
  const visibleTasks = useMemo(() => {
    const filtered = filterTasks(state.tasks, {
      smartView,
      priorityFilter,
      selectedTags,
      searchQuery,
      todayIso,
    });
    return sortTasks(filtered, sortMode, todayIso);
  }, [state.tasks, smartView, priorityFilter, selectedTags, searchQuery, sortMode, todayIso]);

  // Split active vs completed items cleanly when browsing 'all'
  const openVisibleTasks = useMemo(
    () => (smartView === 'completed' ? [] : visibleTasks.filter((t) => !t.done)),
    [visibleTasks, smartView]
  );
  const completedVisibleTasks = useMemo(
    () => visibleTasks.filter((t) => t.done),
    [visibleTasks]
  );

  // Synced Timetable allocations & Today Focus summary
  const todayAllocations = useMemo(() => {
    const blocks = getBlocksForDate(timetableState.blocks, todayIso);
    return computeDayAllocations(blocks);
  }, [timetableState.blocks, todayIso]);

  const todayFocusSummary = useMemo(
    () => computeTodayFocusSummary(getTodayFocusTasks(state.tasks, todayIso)),
    [state.tasks, todayIso]
  );

  const hasActiveFilters =
    priorityFilter !== 'ALL' || selectedTags.length > 0 || searchQuery.trim().length > 0;
  const activeFilterCount =
    (priorityFilter !== 'ALL' ? 1 : 0) + selectedTags.length;

  const clearFilters = () => {
    setPriorityFilter('ALL');
    setSelectedTags([]);
    setSearchQuery('');
  };

  const handleToggleTagFilter = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      if (exists) {
        return prev.filter((t) => t.toLowerCase() !== tag.toLowerCase());
      }
      return [...prev, tag];
    });
  }, []);

  const handleQuickAddSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickTitle.trim()) return;

    const defaultDue =
      quickDuePreset === 'today'
        ? todayIso
        : quickDuePreset === 'tomorrow'
          ? addDaysIso(todayIso, 1)
          : undefined;

    const parsed = parseQuickAddInput(quickTitle, {
      priority: quickPriority,
      tag: quickTag || undefined,
      dueDate: defaultDue,
      inTodayFocus: quickDuePreset === 'today',
      pomodorosPlanned: quickPomodoros,
      todayIso,
    });

    const newTask: PlannerTask = {
      id: createTaskId('tsk'),
      title: parsed.title,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      tags: parsed.tags,
      estimatedMinutes: parsed.estimatedMinutes,
      pomodorosPlanned: parsed.pomodorosPlanned,
      pomodorosDone: 0,
      inTodayFocus: parsed.inTodayFocus,
      done: false,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };

    const current = stateRef.current;
    commit({ ...current, tasks: [newTask, ...current.tasks] });
    setQuickTitle('');
    setQuickTag('');
  };

  const handleQuickAddFocusTask = useCallback(
    (title: string, priority: TaskPriority) => {
      const newTask: PlannerTask = {
        id: createTaskId('tsk'),
        title,
        priority,
        dueDate: todayIso,
        tags: [],
        estimatedMinutes: 50,
        pomodorosPlanned: 2,
        pomodorosDone: 0,
        inTodayFocus: true,
        done: false,
        subtasks: [],
        createdAt: new Date().toISOString(),
      };
      const current = stateRef.current;
      commit({ ...current, tasks: [newTask, ...current.tasks] });
    },
    [commit, todayIso]
  );

  const handleToggleTask = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        tasks: current.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      });
    },
    [commit]
  );

  const handleChangePriority = useCallback(
    (taskId: string, priority: TaskPriority) => {
      const current = stateRef.current;
      commit({
        ...current,
        tasks: current.tasks.map((t) => (t.id === taskId ? { ...t, priority } : t)),
      });
    },
    [commit]
  );

  const handleToggleTodayFocus = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        tasks: current.tasks.map((t) =>
          t.id === taskId ? { ...t, inTodayFocus: !t.inTodayFocus } : t
        ),
      });
    },
    [commit]
  );

  const handleToggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        tasks: current.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((sub) =>
                  sub.id === subtaskId ? { ...sub, done: !sub.done } : sub
                ),
              }
            : t
        ),
      });
    },
    [commit]
  );

  const handleAddSubtask = useCallback(
    (taskId: string, title: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        tasks: current.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: [...t.subtasks, { id: createTaskId('sub'), title, done: false }],
              }
            : t
        ),
      });
    },
    [commit]
  );

  const handleDeleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        tasks: current.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: t.subtasks.filter((sub) => sub.id !== subtaskId) }
            : t
        ),
      });
    },
    [commit]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        tasks: current.tasks.filter((t) => t.id !== taskId),
      });
    },
    [commit]
  );

  const handleClearCompleted = useCallback(() => {
    const current = stateRef.current;
    commit({
      ...current,
      tasks: current.tasks.filter((t) => !t.done),
    });
  }, [commit]);

  const handleOpenScheduleModal = useCallback(
    (task: PlannerTask) => {
      const targetDate = task.dueDate && task.dueDate >= todayIso ? task.dueDate : todayIso;
      const dayBlocks = getBlocksForDate(timetableRef.current.blocks, targetDate);
      const startMin = findNextOpenSlotMinutes(dayBlocks, task.estimatedMinutes, 6 * 60 + 15);
      const durationMin = Math.max(15, Math.min(180, Math.round(task.estimatedMinutes / 15) * 15));
      const firstTag = task.tags[0]?.toLowerCase() ?? '';
      const inferredCategory = firstTag.includes('health')
        ? 'health'
        : firstTag.includes('family')
          ? 'family'
          : firstTag.includes('reading')
            ? 'reading'
            : firstTag.includes('wma') || firstTag.includes('9702') || firstTag.includes('0580') || firstTag.includes('paper') || firstTag.includes('study')
              ? 'study'
              : task.pomodorosPlanned
                ? 'deep-work'
                : 'work';

      setScheduleTargetTask(task);
      setEditorDraft({
        mode: 'create',
        defaultDate: targetDate,
        defaultStartMinutes: startMin,
        defaultEndMinutes: Math.min(1440, startMin + durationMin),
        defaultTitle: task.title,
        defaultCategory: inferredCategory,
        defaultPriority: task.priority,
        defaultPomodoros: task.pomodorosPlanned ?? 1,
      });
    },
    [todayIso]
  );

  const handleSaveScheduledBlock = useCallback(
    (block: TimetableBlock) => {
      const nextTimetable: TimetablePersistedState = {
        ...timetableRef.current,
        blocks: [...timetableRef.current.blocks, block],
      };
      timetableRef.current = nextTimetable;
      setTimetableState(nextTimetable);
      if (persistToLocalStorage) {
        saveTimetableState(nextTimetable, timetableStorageKey);
      }

      if (scheduleTargetTask) {
        const slotLabel = `${block.date === todayIso ? 'Today' : block.date.slice(5)} · ${formatMinutes24h(block.startMinutes)}`;
        const current = stateRef.current;
        commit({
          ...current,
          tasks: current.tasks.map((t) =>
            t.id === scheduleTargetTask.id
              ? { ...t, linkedBlockId: block.id, scheduledSlotLabel: slotLabel }
              : t
          ),
        });
        onTaskScheduled?.(scheduleTargetTask, block);
      }
      setScheduleTargetTask(null);
      setEditorDraft(null);
    },
    [commit, onTaskScheduled, persistToLocalStorage, scheduleTargetTask, timetableStorageKey, todayIso]
  );

  const switchPreset = (presetId: TaskPresetId) => {
    const presetTasks = createPresetTasksState(presetId, todayIso);
    const presetTimetable = createPresetTimetableState(presetId, todayIso);
    timetableRef.current = presetTimetable;
    setTimetableState(presetTimetable);
    if (persistToLocalStorage) {
      saveTimetableState(presetTimetable, timetableStorageKey);
    }
    clearFilters();
    commit(presetTasks);
  };

  const focusRingRadius = 8;
  const focusRingCircumference = 2 * Math.PI * focusRingRadius;
  const focusRingOffset =
    focusRingCircumference - (todayFocusSummary.percent / 100) * focusRingCircumference;

  return (
    <>
      <FlowShellView
        activeSection="tasks"
        tabs={[]}
        contentWidth="wide"
        user={user}
        headerActions={<ThemeToggle />}
      >
        {/* Top Task Planner Header & Smart View Switcher */}
        <div className="ants-workspace-enter flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Task Planner
              </h1>
              <span className="font-mono text-xs font-semibold tabular-nums text-foreground-muted">
                {smartViewCounts.all} open · {smartViewCounts.completed} done
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileFocusOpen(true)}
              aria-label="Open Today Focus sprint panel"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary-tint-border bg-primary-tint px-3 text-xs font-semibold text-on-primary-tint transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            >
              <Flame className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Today</span>
              <span className="font-mono text-[11px] font-bold tabular-nums">
                {todayFocusSummary.doneCount}/{todayFocusSummary.totalCount}
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {/* Smart Lists (smooth horizontal scroll on narrow phones) */}
            <div
              ref={smartTabsRef}
              role="tablist"
              aria-label="Task smart lists"
              data-gliding-ready={smartTabsIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative flex items-center gap-1 overflow-x-auto rounded-lg bg-surface-inset p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex"
            >
              <span
                aria-hidden="true"
                data-animate={smartTabsAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded-md bg-surface-card shadow-[var(--shadow-tier-1)]"
                style={{
                  transform: `translate3d(${smartTabsRect.x}px, ${smartTabsRect.y}px, 0)`,
                  width: `${smartTabsRect.width}px`,
                  height: `${smartTabsRect.height}px`,
                  opacity: smartTabsIndicatorReady ? 1 : 0,
                }}
              />
              {SMART_VIEWS.map((view) => {
                const active = smartView === view.id;
                return (
                  <button
                    key={view.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => setSmartView(view.id)}
                    className={cn(
                      'ants-glide-item relative z-10 inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[30px]',
                      active
                        ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <span>{view.label}</span>
                    <span className="font-mono text-[10px] tabular-nums text-foreground-muted">
                      {smartViewCounts[view.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Demo Preset Switcher */}
            <div className="inline-flex w-fit items-center rounded-lg border border-border bg-surface-card p-0.5">
              <div
                ref={presetTabsRef}
                data-gliding-ready={presetTabsIndicatorReady ? 'true' : 'false'}
                className="ants-glide-host relative inline-flex items-center"
              >
                <span
                  aria-hidden="true"
                  data-animate={presetTabsAnimate ? 'true' : 'false'}
                  className="ants-glide-indicator z-0 rounded-md bg-surface-inset"
                  style={{
                    transform: `translate3d(${presetTabsRect.x}px, ${presetTabsRect.y}px, 0)`,
                    width: `${presetTabsRect.width}px`,
                    height: `${presetTabsRect.height}px`,
                    opacity: presetTabsIndicatorReady ? 1 : 0,
                  }}
                />
                {PRESET_OPTIONS.map((p) => {
                  const active = state.presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={active}
                      data-active={active ? 'true' : 'false'}
                      onClick={() => switchPreset(p.id)}
                      className={cn(
                        'ants-glide-item relative z-10 min-h-[32px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0',
                        active
                          ? 'bg-surface-inset text-foreground'
                          : 'text-foreground-muted hover:text-foreground'
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                title="Reset active preset"
                aria-label="Reset active preset"
                onClick={() => switchPreset(state.presetId)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-7 sm:w-7"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Responsive Split Workspace: Task Planner + Sticky Today Focus HUD (`lg:`+) */}
        <div className="mt-4 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_328px] xl:grid-cols-[minmax(0,1fr)_348px]">
          <section aria-label="Task list and filters" className="min-w-0 space-y-4 pb-16 lg:pb-0">
            {/* Rapid Quick-Add Bar */}
            <form
              onSubmit={handleQuickAddSubmit}
              className="rounded-xl border border-border bg-surface-card p-3 sm:p-3.5"
            >
              <div className="flex items-center gap-2">
                <label htmlFor="flow-quick-add-input" className="sr-only">
                  Quick add task
                </label>
                <input
                  id="flow-quick-add-input"
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  maxLength={140}
                  placeholder="Add task (!P1 #focus @today ~2p)"
                  autoComplete="off"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-inset/40 px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-ring sm:h-10"
                />

                <Button
                  type="submit"
                  size="md"
                  disabled={!quickTitle.trim()}
                  className="h-11 shrink-0 px-3.5 sm:h-10 sm:px-4"
                  leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                >
                  <span className="hidden sm:inline">Add task</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              {/* Mobile Compact Toggle for Quick-Add Options */}
              <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
                <button
                  type="button"
                  aria-expanded={quickMetaOpen}
                  onClick={() => setQuickMetaOpen((prev) => !prev)}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-border bg-surface-inset/50 px-2.5 py-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      'rounded border px-1 py-0.5 font-mono text-[10px] font-bold leading-none',
                      PRIORITY_BADGE_CLASSES[quickPriority]
                    )}
                  >
                    {quickPriority}
                  </span>
                  <span>
                    {quickDuePreset === 'today'
                      ? 'Today'
                      : quickDuePreset === 'tomorrow'
                        ? 'Tomorrow'
                        : 'Backlog'}
                  </span>
                  <span>·</span>
                  <span className="font-mono text-[11px]">
                    {quickPomodoros > 0 ? `${quickPomodoros}×25m` : '30m'}
                  </span>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', quickMetaOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>
                <span className="text-[11px] text-foreground-subtle">Shortcuts: !P1 #tag @today</span>
              </div>

              {/* Quick-Add Metadata Controls (collapsible on phones, always shown on sm+) */}
              <div
                className={cn(
                  'mt-2.5 flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5',
                  quickMetaOpen ? 'flex' : 'hidden sm:flex'
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* Priority Selector */}
                  <div
                    className="inline-flex items-center gap-1"
                    role="group"
                    aria-label="New task priority"
                  >
                    {TASK_PRIORITIES.map((p) => {
                      const active = quickPriority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setQuickPriority(p)}
                          className={cn(
                            'min-h-[34px] rounded-md border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:px-2',
                            active
                              ? PRIORITY_BADGE_CLASSES[p]
                              : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Due Date Quick Presets */}
                  <div
                    ref={quickDueTabsRef}
                    data-gliding-ready={quickDueIndicatorReady ? 'true' : 'false'}
                    className="ants-glide-host relative inline-flex items-center rounded-lg border border-border bg-surface-inset/50 p-0.5 text-[11px]"
                  >
                    <span
                      aria-hidden="true"
                      data-animate={quickDueAnimate ? 'true' : 'false'}
                      className="ants-glide-indicator z-0 rounded-md bg-surface-card shadow-[var(--shadow-tier-1)]"
                      style={{
                        transform: `translate3d(${quickDueRect.x}px, ${quickDueRect.y}px, 0)`,
                        width: `${quickDueRect.width}px`,
                        height: `${quickDueRect.height}px`,
                        opacity: quickDueIndicatorReady ? 1 : 0,
                      }}
                    />
                    {(
                      [
                        { id: 'today', label: 'Today' },
                        { id: 'tomorrow', label: 'Tomorrow' },
                        { id: 'backlog', label: 'Backlog' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={quickDuePreset === opt.id}
                        data-active={quickDuePreset === opt.id ? 'true' : 'false'}
                        onClick={() => setQuickDuePreset(opt.id)}
                        className={cn(
                          'ants-glide-item relative z-10 inline-flex min-h-[30px] items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0',
                          quickDuePreset === opt.id
                            ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                            : 'text-foreground-muted hover:text-foreground'
                        )}
                      >
                        {opt.id === 'today' && <Calendar className="h-3 w-3 text-primary" aria-hidden="true" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick Tag Input */}
                  <div className="relative flex items-center">
                    <Tag className="pointer-events-none absolute left-2 h-3 w-3 text-foreground-muted" aria-hidden="true" />
                    <input
                      type="text"
                      value={quickTag}
                      onChange={(e) => setQuickTag(e.target.value)}
                      maxLength={24}
                      placeholder="Tag (e.g. Focus)"
                      aria-label="New task tag"
                      list="flow-task-tag-suggestions"
                      className="h-8 w-36 rounded-md border border-border bg-surface-inset/50 pl-6 pr-2 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-ring sm:h-7"
                    />
                    <datalist id="flow-task-tag-suggestions">
                      {availableTags.map((t) => (
                        <option key={t.tag} value={t.tag} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Pomodoro Estimate Picker */}
                <label className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                  <span>Focus:</span>
                  <select
                    aria-label="Estimated Pomodoro sessions"
                    value={quickPomodoros}
                    onChange={(e) => setQuickPomodoros(Number(e.target.value))}
                    className="h-8 rounded-md border border-border bg-surface-inset/60 px-2 font-mono text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring sm:h-7"
                  >
                    <option value={0}>No Pomodoro (30m)</option>
                    <option value={1}>1×25m</option>
                    <option value={2}>2×25m</option>
                    <option value={3}>3×25m</option>
                    <option value={4}>4×25m</option>
                  </select>
                </label>
              </div>

              {/* Live Quick-Add Shorthand Parse Preview */}
              {quickAddPreview &&
                (quickTitle.includes('!') ||
                  quickTitle.includes('#') ||
                  quickTitle.includes('@') ||
                  quickTitle.includes('~')) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-foreground-muted">
                    <span>Parsed:</span>
                    <span className={cn('rounded border px-1.5 py-0.5 font-mono font-bold', PRIORITY_BADGE_CLASSES[quickAddPreview.priority])}>
                      {quickAddPreview.priority}
                    </span>
                    {quickAddPreview.tags.map((t) => (
                      <span key={t} className="rounded-full border border-border bg-surface-inset px-2 py-0.5 font-semibold">
                        #{t}
                      </span>
                    ))}
                    {quickAddPreview.dueDate && (
                      <span className="rounded border border-primary-tint-border bg-primary-tint px-1.5 py-0.5 font-mono font-semibold text-on-primary-tint">
                        {quickAddPreview.dueDate === todayIso ? 'Today Focus' : quickAddPreview.dueDate}
                      </span>
                    )}
                    <span className="font-mono tabular-nums">
                      {quickAddPreview.estimatedMinutes}m
                      {quickAddPreview.pomodorosPlanned ? ` (${quickAddPreview.pomodorosPlanned}×25m)` : ''}
                    </span>
                  </div>
                )}
            </form>

            {/* Search, Priority Filter, Sort & Tag Filter Strip */}
            <div className="space-y-2.5 rounded-xl border border-border bg-surface-card p-3 sm:p-3.5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 md:min-w-0 md:flex-1">
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks, tags, or subtasks..."
                      aria-label="Search tasks"
                      className="h-10 w-full rounded-lg border border-border bg-surface-inset/40 pl-8 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-ring sm:h-9"
                    />
                  </div>

                  <button
                    type="button"
                    aria-expanded={filtersOpen || activeFilterCount > 0}
                    onClick={() => setFiltersOpen((prev) => !prev)}
                    className={cn(
                      'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden',
                      filtersOpen || activeFilterCount > 0
                        ? 'border-primary bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="font-mono text-[11px] font-bold">{activeFilterCount}</span>
                    )}
                  </button>
                </div>

                <div
                  className={cn(
                    'flex-wrap items-center gap-2',
                    filtersOpen || activeFilterCount > 0 ? 'flex' : 'hidden sm:flex'
                  )}
                >
                  {/* Priority Filter Pills */}
                  <div
                    ref={priorityFilterTabsRef}
                    data-gliding-ready={priorityFilterIndicatorReady ? 'true' : 'false'}
                    className="ants-glide-host relative flex items-center gap-1"
                    role="group"
                    aria-label="Filter list by priority"
                  >
                    <span
                      aria-hidden="true"
                      data-animate={priorityFilterAnimate ? 'true' : 'false'}
                      className="ants-glide-indicator z-0 rounded-md border border-primary bg-primary-tint"
                      style={{
                        transform: `translate3d(${priorityFilterRect.x}px, ${priorityFilterRect.y}px, 0)`,
                        width: `${priorityFilterRect.width}px`,
                        height: `${priorityFilterRect.height}px`,
                        opacity: priorityFilterIndicatorReady ? 1 : 0,
                      }}
                    />
                    {(['ALL', ...TASK_PRIORITIES] as const).map((p) => {
                      const active = priorityFilter === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={active}
                          data-active={active ? 'true' : 'false'}
                          onClick={() => setPriorityFilter(p)}
                          className={cn(
                            'ants-glide-item relative z-10 h-9 rounded-md border px-2.5 font-mono text-[11px] font-bold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:px-2',
                            active
                              ? 'border-primary bg-primary-tint text-on-primary-tint'
                              : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
                          )}
                        >
                          {p === 'ALL' ? 'All' : p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sort Mode Selector */}
                  <label className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-xs text-foreground-muted">
                    <span className="sr-only">Sort tasks by</span>
                    <select
                      aria-label="Sort tasks by"
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as TaskSortMode)}
                      className="h-9 max-w-full rounded-lg border border-border bg-surface-inset/60 px-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring sm:h-8"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          Sort: {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Interactive Tag Filter Chips (horizontal glide on mobile, wrap on desktop) */}
              {availableTags.length > 0 && (
                <div
                  className={cn(
                    'items-center gap-1.5 overflow-x-auto border-t border-border-subtle pt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap',
                    filtersOpen || activeFilterCount > 0 ? 'flex' : 'hidden sm:flex'
                  )}
                  role="group"
                  aria-label="Filter by tag"
                >
                  <span className="mr-1 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-foreground-muted">
                    <Tag className="h-3 w-3" aria-hidden="true" />
                    Tags:
                  </span>
                  <button
                    type="button"
                    aria-pressed={selectedTags.length === 0}
                    onClick={() => setSelectedTags([])}
                    className={cn(
                      'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:py-0.5',
                      selectedTags.length === 0
                        ? 'border-primary bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
                    )}
                  >
                    All tags
                  </button>
                  {availableTags.map(({ tag, openCount }) => {
                    const active = selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleToggleTagFilter(tag)}
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:py-0.5',
                          active
                            ? 'border-primary bg-primary-tint text-on-primary-tint'
                            : 'border-border bg-surface-inset/50 text-foreground-muted hover:border-border-hover hover:text-foreground'
                        )}
                      >
                        <span>#{tag}</span>
                        <span
                          className={cn(
                            'font-mono text-[10px] tabular-nums',
                            active ? 'text-on-primary-tint' : 'text-foreground-muted'
                          )}
                        >
                          {openCount}
                        </span>
                      </button>
                    );
                  })}

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-on-primary-tint hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <FilterX className="h-3 w-3" aria-hidden="true" />
                      Reset filters
                    </button>
                  )}
                </div>
              )}
            </div>

          {/* Filtered & Priority-Sorted Task Cards */}
          {openVisibleTasks.length === 0 && (smartView !== 'completed' || completedVisibleTasks.length === 0) ? (
            <div className="rounded-xl border border-dashed border-border-hover bg-surface-card px-6 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">
                {hasActiveFilters
                  ? 'No tasks match your active tag or priority filters.'
                  : smartView === 'completed'
                    ? 'No completed tasks yet.'
                    : 'Your task queue is clear.'}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs text-foreground-muted">
                {hasActiveFilters
                  ? 'Clear active tag chips or widen your priority filter to inspect all tasks.'
                  : 'Use the Quick-Add bar above with !P1–P4, #tags, or @today to plan your next sprint.'}
              </p>
              {hasActiveFilters && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>
                  Reset filters
                </Button>
              )}
            </div>
          ) : (
            <div key={smartView} className="space-y-2.5">
              {openVisibleTasks.map((task, idx) => (
                <TaskCardView
                  key={task.id}
                  task={task}
                  todayIso={todayIso}
                  activeTags={selectedTags}
                  onToggleTask={handleToggleTask}
                  onChangePriority={handleChangePriority}
                  onToggleTodayFocus={handleToggleTodayFocus}
                  onToggleSubtask={handleToggleSubtask}
                  onAddSubtask={handleAddSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                  onToggleTagFilter={handleToggleTagFilter}
                  onScheduleTask={handleOpenScheduleModal}
                  onDeleteTask={handleDeleteTask}
                  className="ants-stagger-item ants-card-interactive"
                  style={{ '--stagger-index': Math.min(idx, 7) } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          {/* Completed Section (always visible in 'completed' view, collapsible drawer in 'all') */}
          {completedVisibleTasks.length > 0 &&
            (smartView === 'completed' || smartView === 'all') && (
              <div className="pt-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={smartView === 'completed' || showCompletedDrawer}
                    onClick={() => setShowCompletedDrawer((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        (smartView === 'completed' || showCompletedDrawer) && 'rotate-90'
                      )}
                      aria-hidden="true"
                    />
                    <span>Completed</span>
                    <span className="font-mono text-[11px] tabular-nums">
                      ({completedVisibleTasks.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearCompleted}
                    className="rounded px-1.5 py-0.5 text-xs font-semibold text-foreground-muted transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Clear completed
                  </button>
                </div>

                <div
                  className="ants-accordion"
                  data-open={smartView === 'completed' || showCompletedDrawer ? 'true' : 'false'}
                  aria-hidden={!(smartView === 'completed' || showCompletedDrawer)}
                >
                  <div className="ants-accordion-inner">
                    <div className="space-y-2">
                      {completedVisibleTasks.map((task) => (
                        <TaskCardView
                          key={task.id}
                          task={task}
                          todayIso={todayIso}
                          activeTags={selectedTags}
                          onToggleTask={handleToggleTask}
                          onChangePriority={handleChangePriority}
                          onToggleTodayFocus={handleToggleTodayFocus}
                          onToggleSubtask={handleToggleSubtask}
                          onAddSubtask={handleAddSubtask}
                          onDeleteSubtask={handleDeleteSubtask}
                          onToggleTagFilter={handleToggleTagFilter}
                          onScheduleTask={handleOpenScheduleModal}
                          onDeleteTask={handleDeleteTask}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Desktop / Laptop (`lg:`+) Sticky Today Focus HUD */}
          <div className="hidden lg:block">
            <TodayFocusPanelView
              selectedDate={todayIso}
              tasks={state.tasks}
              timetableFocusMinutes={todayAllocations.focusMinutes}
              timetableReminderCount={todayAllocations.reminderCount}
              telegramConnected={timetableState.telegramConnected}
              telegramHandle={timetableState.telegramHandle}
              onQuickAddFocusTask={handleQuickAddFocusTask}
              onToggleTask={handleToggleTask}
              onToggleTodayFocus={handleToggleTodayFocus}
              onScheduleTask={handleOpenScheduleModal}
            />
          </div>
        </div>
      </FlowShellView>

      {/* Mobile / Tablet Floating Today Focus Pill (above mobile bottom dock) */}
      {!mobileFocusOpen && (
        <button
          type="button"
          onClick={() => setMobileFocusOpen(true)}
          aria-label={`Open Today Focus panel (${todayFocusSummary.doneCount} of ${todayFocusSummary.totalCount} completed)`}
          className="fixed bottom-20 right-4 z-20 inline-flex min-h-[44px] items-center gap-2.5 rounded-full border border-border-hover bg-surface-elevated px-3.5 py-2 text-xs font-semibold text-foreground shadow-[var(--shadow-tier-3)] transition-transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 lg:hidden"
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <svg viewBox="0 0 20 20" className="h-6 w-6 -rotate-90" aria-hidden="true">
              <circle cx="10" cy="10" r={focusRingRadius} fill="none" strokeWidth="2.5" className="stroke-border" />
              <circle
                cx="10"
                cy="10"
                r={focusRingRadius}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={focusRingCircumference}
                strokeDashoffset={focusRingOffset}
                className={cn(
                  todayFocusSummary.totalCount > 0 && todayFocusSummary.openCount === 0
                    ? 'stroke-success'
                    : 'stroke-primary'
                )}
              />
            </svg>
            <Flame className="absolute h-2.5 w-2.5 text-primary" aria-hidden="true" />
          </span>
          <span>Today Focus</span>
          <span className="rounded-full bg-surface-inset px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-foreground">
            {todayFocusSummary.doneCount}/{todayFocusSummary.totalCount}
          </span>
        </button>
      )}

      {/* Mobile / Tablet Slide-Over Today Focus Sheet */}
      {mobileFocusOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Today Focus"
          className="ants-modal-backdrop-in fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-[2px] md:items-center md:p-4 lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMobileFocusOpen(false);
          }}
        >
          <div className="ants-bottom-sheet-in w-full max-w-lg">
            <TodayFocusPanelView
              selectedDate={todayIso}
              tasks={state.tasks}
              timetableFocusMinutes={todayAllocations.focusMinutes}
              timetableReminderCount={todayAllocations.reminderCount}
              telegramConnected={timetableState.telegramConnected}
              telegramHandle={timetableState.telegramHandle}
              onQuickAddFocusTask={handleQuickAddFocusTask}
              onToggleTask={handleToggleTask}
              onToggleTodayFocus={handleToggleTodayFocus}
              onScheduleTask={(task) => {
                setMobileFocusOpen(false);
                handleOpenScheduleModal(task);
              }}
              onClose={() => setMobileFocusOpen(false)}
              className="max-h-[85vh] rounded-t-2xl rounded-b-none border-b-0 md:rounded-2xl md:border-b"
            />
          </div>
        </div>
      )}

      {/* Shared Flow Timetable Block Editor for 1-click Task Scheduling */}
      <BlockEditorModalView
        open={Boolean(editorDraft)}
        draft={editorDraft}
        onClose={() => {
          setEditorDraft(null);
          setScheduleTargetTask(null);
        }}
        onSave={(block) => handleSaveScheduledBlock(block)}
      />
    </>
  );
}
