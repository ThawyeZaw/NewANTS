'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AntMascot, ThemeToggle, cn, emitMiloCheer, useSlidingIndicator, type MockUserProfile } from '@ants/ui';
import {
  addDaysIso,
  blockAppliesToDate,
  findNextOpenSlotMinutes,
  formatDurationCompact,
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
  createTaskId,
  filterTasks,
  isActionableTimetableBlock,
  mergeTimetableIntoTasks,
  parseQuickAddInput,
  sortTasks,
  syncTaskCompletionToTimetable,
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

export interface TaskPlannerViewProps {
  /** Initial persisted state (defaults to realistic 24h Workday preset) */
  initialState?: TasksPersistedState;
  /** Persist changes to `localStorage` & sync bidirectionally with `/timetable` */
  persistToLocalStorage?: boolean;
  storageKey?: string;
  timetableStorageKey?: string;
  user?: MockUserProfile | null;
  onStateChange?: (state: TasksPersistedState) => void;
  onTaskScheduled?: (task: PlannerTask, block: TimetableBlock) => void;
}

const SMART_VIEWS: { id: TaskSmartView; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Done' },
];

const SORT_OPTIONS: { id: TaskSortMode; label: string }[] = [
  { id: 'priority', label: 'Priority' },
  { id: 'due-date', label: 'Due date' },
  { id: 'duration', label: 'Duration' },
  { id: 'recent', label: 'Newest' },
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
    () =>
      initialState ??
      createPresetTasksState('workday-coaching', DEFAULT_TASKS_REFERENCE_DATE)
  );
  const stateRef = useRef(state);
  const hasCustomInitialStateRef = useRef(Boolean(initialState));
  const [timetableState, setTimetableState] = useState<TimetablePersistedState>(() =>
    createPresetTimetableState('workday-coaching', DEFAULT_TIMETABLE_REFERENCE_DATE)
  );
  const timetableRef = useRef(timetableState);
  const [hydrated, setHydrated] = useState(false);
  const [todayIso, setTodayIso] = useState(DEFAULT_TASKS_REFERENCE_DATE);

  // Smart view + tucked utility popovers
  const [smartView, setSmartView] = useState<TaskSmartView>('today');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<TaskSortMode>('priority');
  const [showCompletedInline, setShowCompletedInline] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const presetsRef = useRef<HTMLDivElement | null>(null);

  // 1-line Quick-Add state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('P2');
  const [quickDuePreset, setQuickDuePreset] = useState<'today' | 'tomorrow' | 'backlog'>('today');

  // Schedule modal state
  const [scheduleTargetTask, setScheduleTargetTask] = useState<PlannerTask | null>(null);
  const [editorDraft, setEditorDraft] = useState<BlockEditorDraft | null>(null);

  const smartTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: smartTabsRect,
    ready: smartTabsReady,
    animate: smartTabsAnimate,
  } = useSlidingIndicator(smartTabsRef, smartView, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const smartTabsIndicatorReady = smartTabsReady && smartTabsRect.visible;

  const commit = useCallback(
    (next: TasksPersistedState) => {
      stateRef.current = next;
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange]
  );

  // Hydrate task state + pull actionable blocks/updates from `/timetable`
  useEffect(() => {
    document.title = 'Tasks · Flow — The ANTs Productivity Studio';
    const localToday = toIsoDate(new Date());
    setTodayIso(localToday);

    const savedTimetable = persistToLocalStorage
      ? loadTimetableState(timetableStorageKey)
      : null;
    const baseTimetable =
      savedTimetable ??
      createPresetTimetableState(stateRef.current.presetId, localToday);
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

  // Persist `/tasks` state & mirror Today items back to `ants-flow-timetable-v1`
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

  // Keep synced if `/timetable` changes in another tab
  useEffect(() => {
    if (!persistToLocalStorage) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== timetableStorageKey) return;
      const latestTt = loadTimetableState(timetableStorageKey);
      if (!latestTt) return;
      timetableRef.current = latestTt;
      setTimetableState(latestTt);
      const merged = mergeTimetableIntoTasks(
        stateRef.current.tasks,
        latestTt,
        todayIso
      );
      commit({ ...stateRef.current, tasks: merged });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [persistToLocalStorage, timetableStorageKey, todayIso, commit]);

  // Close popovers on outside click / Escape
  useEffect(() => {
    if (!filtersOpen && !presetsOpen) return;
    const handlePointer = (event: PointerEvent) => {
      if (
        filtersOpen &&
        filtersRef.current &&
        !filtersRef.current.contains(event.target as Node)
      ) {
        setFiltersOpen(false);
      }
      if (
        presetsOpen &&
        presetsRef.current &&
        !presetsRef.current.contains(event.target as Node)
      ) {
        setPresetsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFiltersOpen(false);
        setPresetsOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointer);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [filtersOpen, presetsOpen]);

  const availableTags = useMemo(() => collectAvailableTags(state.tasks), [state.tasks]);

  const smartViewCounts = useMemo(() => {
    const open = state.tasks.filter((t) => !t.done);
    const done = state.tasks.filter((t) => t.done);
    return {
      today: open.filter(
        (t) => t.inTodayFocus || (Boolean(t.dueDate) && t.dueDate! <= todayIso)
      ).length,
      inbox: open.filter(
        (t) => !t.dueDate && !t.linkedBlockId && !t.inTodayFocus
      ).length,
      upcoming: open.filter((t) => Boolean(t.dueDate) && t.dueDate! > todayIso)
        .length,
      completed: done.length,
      all: open.length,
      'high-priority': open.filter(
        (t) => t.priority === 'P1' || t.priority === 'P2'
      ).length,
    } satisfies Record<TaskSmartView, number>;
  }, [state.tasks, todayIso]);

  const todayBlockedMinutes = useMemo(() => {
    const blocks = getBlocksForDate(timetableState.blocks, todayIso);
    return blocks
      .filter(isActionableTimetableBlock)
      .reduce((sum, b) => sum + Math.max(0, b.endMinutes - b.startMinutes), 0);
  }, [timetableState.blocks, todayIso]);

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

  const openVisibleTasks = useMemo(
    () => (smartView === 'completed' ? [] : visibleTasks.filter((t) => !t.done)),
    [visibleTasks, smartView]
  );

  // Completed items relevant to the active view (on Today/Inbox/Upcoming or Done)
  const completedInScope = useMemo(() => {
    if (smartView === 'completed') return visibleTasks;
    const baseDone = state.tasks.filter((t) => t.done);
    const filteredDone = filterTasks(baseDone, {
      smartView: 'completed',
      priorityFilter,
      selectedTags,
      searchQuery,
      todayIso,
    });
    if (smartView === 'today') {
      return filteredDone.filter(
        (t) => t.inTodayFocus || (Boolean(t.dueDate) && t.dueDate! <= todayIso)
      );
    }
    return [];
  }, [smartView, visibleTasks, state.tasks, priorityFilter, selectedTags, searchQuery, todayIso]);

  const hasFiltersActive =
    priorityFilter !== 'ALL' ||
    selectedTags.length > 0 ||
    sortMode !== 'priority' ||
    searchQuery.trim().length > 0;

  const quickAddPreview = useMemo(() => {
    if (!quickTitle.trim()) return null;
    const hasToken = /(^|\s)(!p[1-4]|#[A-Za-z0-9]|@(today|tomorrow|backlog)|~\d{1,3}[pm])(\s|$)/i.test(
      quickTitle
    );
    if (!hasToken) return null;
    const defaultDue =
      quickDuePreset === 'today'
        ? todayIso
        : quickDuePreset === 'tomorrow'
          ? addDaysIso(todayIso, 1)
          : undefined;
    return parseQuickAddInput(quickTitle, {
      priority: quickPriority,
      dueDate: defaultDue,
      inTodayFocus: quickDuePreset === 'today',
      todayIso,
    });
  }, [quickTitle, quickPriority, quickDuePreset, todayIso]);

  const handleSelectSmartView = (view: TaskSmartView) => {
    setSmartView(view);
    if (view === 'today') setQuickDuePreset('today');
    else if (view === 'inbox') setQuickDuePreset('backlog');
    else if (view === 'upcoming') setQuickDuePreset('tomorrow');
  };

  const handleCycleQuickPriority = () => {
    const idx = TASK_PRIORITIES.indexOf(quickPriority);
    setQuickPriority(TASK_PRIORITIES[(idx + 1) % TASK_PRIORITIES.length] ?? 'P2');
  };

  const handleCycleQuickDue = () => {
    setQuickDuePreset((prev) =>
      prev === 'today' ? 'backlog' : prev === 'backlog' ? 'tomorrow' : 'today'
    );
  };

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
      dueDate: defaultDue,
      inTodayFocus: quickDuePreset === 'today',
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
  };

  const handleToggleTask = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      const target = current.tasks.find((t) => t.id === taskId);
      if (!target) return;
      const nextDone = !target.done;

      if (target.linkedBlockId) {
        const nextBlocks = syncTaskCompletionToTimetable(
          timetableRef.current.blocks,
          target.linkedBlockId,
          nextDone
        );
        if (nextBlocks !== timetableRef.current.blocks) {
          const nextTimetable = { ...timetableRef.current, blocks: nextBlocks };
          timetableRef.current = nextTimetable;
          setTimetableState(nextTimetable);
          if (persistToLocalStorage) {
            saveTimetableState(nextTimetable, timetableStorageKey);
          }
        }
      }

      commit({
        ...current,
        tasks: current.tasks.map((t) =>
          t.id === taskId ? { ...t, done: nextDone } : t
        ),
      });
      if (nextDone) {
        emitMiloCheer({
          mood: 'celebrating',
          propVariant: 'pencil',
          badge: 'Task Done',
          message: 'Nice check-off! One less task on your plate.',
        });
      }
    },
    [commit, persistToLocalStorage, timetableStorageKey]
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
                subtasks: [
                  ...t.subtasks,
                  { id: createTaskId('sub'), title, done: false },
                ],
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
            ? {
                ...t,
                subtasks: t.subtasks.filter((sub) => sub.id !== subtaskId),
              }
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

  const handleToggleTagFilter = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === tag.toLowerCase());
      return exists
        ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag];
    });
  }, []);

  const handleOpenScheduleModal = useCallback(
    (task: PlannerTask) => {
      const existingBlock = task.linkedBlockId
        ? timetableRef.current.blocks.find((b) => b.id === task.linkedBlockId)
        : undefined;

      setScheduleTargetTask(task);
      if (existingBlock) {
        setEditorDraft({
          mode: 'edit',
          block: existingBlock,
          defaultDate: existingBlock.date,
          defaultStartMinutes: existingBlock.startMinutes,
          defaultEndMinutes: existingBlock.endMinutes,
        });
        return;
      }

      const targetDate =
        task.dueDate && task.dueDate >= todayIso ? task.dueDate : todayIso;
      const dayBlocks = getBlocksForDate(timetableRef.current.blocks, targetDate);
      const startMin = findNextOpenSlotMinutes(
        dayBlocks,
        task.estimatedMinutes,
        6 * 60 + 15
      );
      const durationMin = Math.max(
        15,
        Math.min(180, Math.round(task.estimatedMinutes / 15) * 15)
      );
      const firstTag = task.tags[0]?.toLowerCase() ?? '';
      const inferredCategory = firstTag.includes('health')
        ? 'health'
        : firstTag.includes('family')
          ? 'family'
          : firstTag.includes('reading')
            ? 'reading'
            : firstTag.includes('wma') ||
                firstTag.includes('9702') ||
                firstTag.includes('0580') ||
                firstTag.includes('paper') ||
                firstTag.includes('study')
              ? 'study'
              : task.pomodorosPlanned
                ? 'deep-work'
                : 'work';

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
    (block: TimetableBlock, isNew: boolean) => {
      const nextBlocks = isNew
        ? [...timetableRef.current.blocks, block]
        : timetableRef.current.blocks.map((b) => (b.id === block.id ? block : b));
      const nextTimetable: TimetablePersistedState = {
        ...timetableRef.current,
        blocks: nextBlocks,
      };
      timetableRef.current = nextTimetable;
      setTimetableState(nextTimetable);
      if (persistToLocalStorage) {
        saveTimetableState(nextTimetable, timetableStorageKey);
      }

      if (scheduleTargetTask) {
        const isToday =
          blockAppliesToDate(block, todayIso) || block.date === todayIso;
        const slotLabel = `${isToday ? 'Today' : block.date.slice(5)} · ${formatMinutes24h(block.startMinutes)}–${formatMinutes24h(block.endMinutes)}`;
        const current = stateRef.current;
        commit({
          ...current,
          tasks: current.tasks.map((t) =>
            t.id === scheduleTargetTask.id
              ? {
                  ...t,
                  title: block.title,
                  priority: block.priority ?? t.priority,
                  dueDate: isToday ? todayIso : block.date,
                  inTodayFocus: isToday || t.inTodayFocus,
                  linkedBlockId: block.id,
                  scheduledSlotLabel: slotLabel,
                }
              : t
          ),
        });
        onTaskScheduled?.(scheduleTargetTask, block);
      }
      setScheduleTargetTask(null);
      setEditorDraft(null);
    },
    [
      commit,
      onTaskScheduled,
      persistToLocalStorage,
      scheduleTargetTask,
      timetableStorageKey,
      todayIso,
    ]
  );

  const switchPreset = (presetId: TaskPresetId) => {
    const presetTasks = createPresetTasksState(presetId, todayIso);
    const presetTimetable = createPresetTimetableState(presetId, todayIso);
    const merged = mergeTimetableIntoTasks(
      presetTasks.tasks,
      presetTimetable,
      todayIso
    );
    timetableRef.current = presetTimetable;
    setTimetableState(presetTimetable);
    if (persistToLocalStorage) {
      saveTimetableState(presetTimetable, timetableStorageKey);
    }
    setPriorityFilter('ALL');
    setSelectedTags([]);
    setSearchQuery('');
    setPresetsOpen(false);
    commit({ ...presetTasks, tasks: merged });
  };

  return (
    <>
      <FlowShellView
        activeSection="tasks"
        tabs={[]}
        contentWidth="narrow"
        user={user}
        headerActions={<ThemeToggle />}
      >
        <div className="ants-workspace-enter mx-auto max-w-3xl space-y-3.5 pb-12">
          {/* Compact Top Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Tasks
              </h1>
              <span className="font-mono text-xs font-medium tabular-nums text-foreground-muted">
                {smartViewCounts.today} left · {formatDurationCompact(todayBlockedMinutes)} blocked
              </span>
            </div>

            {/* Quiet Utility Icon Strip: Search · Filters · Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-expanded={searchOpen}
                aria-label="Search tasks"
                title="Search tasks"
                onClick={() => setSearchOpen((v) => !v)}
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                  searchOpen || searchQuery.trim()
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                    : 'border-transparent text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                )}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>

              {/* Filters & Sort Popover */}
              <div ref={filtersRef} className="relative">
                <button
                  type="button"
                  aria-expanded={filtersOpen}
                  aria-label="Filter and sort tasks"
                  title="Filter & sort"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={cn(
                    'relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                    filtersOpen || hasFiltersActive
                      ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                      : 'border-transparent text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  {hasFiltersActive && (
                    <span
                      aria-hidden="true"
                      className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  )}
                </button>

                {filtersOpen && (
                  <div className="absolute right-0 z-40 mt-1.5 w-64 space-y-3 rounded-xl border border-border bg-popover p-3 shadow-[var(--shadow-tier-3)]">
                    <div>
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                        Priority
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(['ALL', ...TASK_PRIORITIES] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriorityFilter(p)}
                            className={cn(
                              'rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold transition-colors',
                              priorityFilter === p
                                ? 'border-primary bg-primary-tint text-on-primary-tint'
                                : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                            )}
                          >
                            {p === 'ALL' ? 'All' : p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {availableTags.length > 0 && (
                      <div>
                        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                          Tags
                        </div>
                        <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                          {availableTags.map((t) => {
                            const active = selectedTags.some(
                              (tag) => tag.toLowerCase() === t.tag.toLowerCase()
                            );
                            return (
                              <button
                                key={t.tag}
                                type="button"
                                onClick={() => handleToggleTagFilter(t.tag)}
                                className={cn(
                                  'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                                  active
                                    ? 'border-primary bg-primary-tint font-semibold text-on-primary-tint'
                                    : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                                )}
                              >
                                #{t.tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                        Sort by
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSortMode(opt.id)}
                            className={cn(
                              'rounded-md border px-2 py-1 text-left text-[11px] font-medium transition-colors',
                              sortMode === opt.id
                                ? 'border-primary bg-primary-tint font-semibold text-on-primary-tint'
                                : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {hasFiltersActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setPriorityFilter('ALL');
                          setSelectedTags([]);
                          setSearchQuery('');
                          setSortMode('priority');
                        }}
                        className="w-full rounded-lg border border-border py-1 text-xs font-semibold text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Demo Presets Popover */}
              <div ref={presetsRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={presetsOpen}
                  aria-label="Demo presets"
                  title="Demo presets"
                  onClick={() => setPresetsOpen((v) => !v)}
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                    presetsOpen
                      ? 'border-border bg-surface-inset text-foreground'
                      : 'border-transparent text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>

                {presetsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-40 mt-1.5 w-48 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-[var(--shadow-tier-3)]"
                  >
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                      Demo Presets
                    </div>
                    {PRESET_OPTIONS.map((p) => {
                      const active = state.presetId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => switchPreset(p.id)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                            active
                              ? 'bg-primary-tint font-semibold text-on-primary-tint'
                              : 'text-foreground hover:bg-surface-inset'
                          )}
                        >
                          <span>{p.label}</span>
                          {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                        </button>
                      );
                    })}
                    <div className="my-1 border-t border-border-subtle" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => switchPreset(state.presetId)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reset preset
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Smart View Tabs: Today | Inbox | Upcoming | Done */}
          <div
            ref={smartTabsRef}
            role="tablist"
            aria-label="Task lists"
            data-gliding-ready={smartTabsIndicatorReady ? 'true' : 'false'}
            className="ants-glide-host relative inline-flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-surface-inset p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-fit"
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
                  onClick={() => handleSelectSmartView(view.id)}
                  className={cn(
                    'ants-glide-item relative z-10 inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-initial sm:py-1',
                    active
                      ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                      : 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  <span>{view.label}</span>
                  <span className="font-mono text-[10px] tabular-nums text-foreground-subtle">
                    {smartViewCounts[view.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Expandable Search Bar (only shown when active) */}
          {(searchOpen || searchQuery.trim().length > 0) && (
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-foreground-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, tags, or subtasks..."
                aria-label="Search tasks"
                className="h-9 w-full rounded-lg border border-border bg-surface-card pl-8 pr-8 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 inline-flex h-5 w-5 items-center justify-center rounded text-foreground-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* 1-Line Quick Add Bar */}
          {smartView !== 'completed' && (
            <form
              onSubmit={handleQuickAddSubmit}
              className="rounded-xl border border-border bg-surface-card p-1.5 shadow-[var(--shadow-tier-1)]"
            >
              <div className="flex items-center gap-1.5">
                <label htmlFor="flow-quick-add-input" className="sr-only">
                  Add task
                </label>
                <input
                  id="flow-quick-add-input"
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  maxLength={140}
                  placeholder="Add task... (!P1 #tag @today ~2p)"
                  autoComplete="off"
                  className="h-9 min-w-0 flex-1 bg-transparent px-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleCycleQuickPriority}
                  title="Cycle priority (P1–P4)"
                  aria-label={`Priority ${quickPriority}, click to cycle`}
                  className={cn(
                    'h-7 shrink-0 rounded-md border px-2 font-mono text-[11px] font-bold transition-colors',
                    PRIORITY_BADGE_CLASSES[quickPriority]
                  )}
                >
                  {quickPriority}
                </button>

                <button
                  type="button"
                  onClick={handleCycleQuickDue}
                  title="Cycle target list (Today / Inbox / Tomorrow)"
                  className="hidden h-7 shrink-0 rounded-md border border-border bg-surface-inset/60 px-2 text-[11px] font-semibold text-foreground-muted transition-colors hover:text-foreground sm:inline-flex sm:items-center"
                >
                  {quickDuePreset === 'today'
                    ? 'Today'
                    : quickDuePreset === 'tomorrow'
                      ? 'Tomorrow'
                      : 'Inbox'}
                </button>

                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  aria-label="Add task"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {quickAddPreview && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-border-subtle px-2.5 pt-1.5 text-[11px] text-foreground-muted">
                  <span className="font-mono font-bold text-foreground">
                    {quickAddPreview.priority}
                  </span>
                  <span>·</span>
                  <span>
                    {quickAddPreview.dueDate === todayIso
                      ? 'Today'
                      : quickAddPreview.dueDate
                        ? 'Tomorrow'
                        : 'Inbox'}
                  </span>
                  {quickAddPreview.pomodorosPlanned && (
                    <>
                      <span>·</span>
                      <span className="font-mono">
                        {quickAddPreview.pomodorosPlanned}×25m
                      </span>
                    </>
                  )}
                  {quickAddPreview.tags.map((t) => (
                    <span key={t} className="text-primary">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </form>
          )}

          {/* Unified Task List */}
          {smartView === 'completed' ? (
            <div className="space-y-2.5">
              {completedInScope.length === 0 ? (
                <div className="rounded-xl border border-border bg-surface-card px-4 py-12 text-center">
                  <AntMascot
                    mood="curious"
                    app="flow"
                    propVariant="pencil"
                    size={76}
                    interactive
                    ariaLabel=""
                    className="mx-auto mb-2.5"
                  />
                  <p className="text-xs text-foreground-muted">
                    No completed tasks yet.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1 text-xs text-foreground-muted">
                    <span>{completedInScope.length} completed</span>
                    <button
                      type="button"
                      onClick={handleClearCompleted}
                      className="font-semibold text-destructive hover:underline"
                    >
                      Clear completed
                    </button>
                  </div>
                  <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface-card">
                    {completedInScope.map((task) => (
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
                </>
              )}
            </div>
          ) : openVisibleTasks.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface-card px-4 py-12 text-center">
              <AntMascot
                mood={hasFiltersActive ? 'curious' : 'celebrating'}
                app="flow"
                propVariant={hasFiltersActive ? 'magnifier' : 'pencil'}
                size={84}
                interactive
                ariaLabel=""
                className="mx-auto mb-3"
              />
              <p className="text-sm font-medium text-foreground">
                {hasFiltersActive
                  ? 'No tasks match your filters.'
                  : smartView === 'today'
                    ? 'Nothing left for Today.'
                    : smartView === 'inbox'
                      ? 'Inbox is clear.'
                      : 'No upcoming tasks.'}
              </p>
              {hasFiltersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setPriorityFilter('ALL');
                    setSelectedTags([]);
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface-card">
              {openVisibleTasks.map((task) => (
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
          )}

          {/* Quiet Collapsible Completed Section below Today */}
          {smartView !== 'completed' && completedInScope.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                aria-expanded={showCompletedInline}
                onClick={() => setShowCompletedInline((v) => !v)}
                className="inline-flex items-center gap-1.5 px-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    !showCompletedInline && '-rotate-90'
                  )}
                  aria-hidden="true"
                />
                <span>Completed ({completedInScope.length})</span>
              </button>

              {showCompletedInline && (
                <div className="mt-2 divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface-card">
                  {completedInScope.map((task) => (
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
              )}
            </div>
          )}
        </div>
      </FlowShellView>

      <BlockEditorModalView
        open={Boolean(editorDraft)}
        draft={editorDraft}
        onClose={() => {
          setEditorDraft(null);
          setScheduleTargetTask(null);
        }}
        onSave={handleSaveScheduledBlock}
      />
    </>
  );
}
