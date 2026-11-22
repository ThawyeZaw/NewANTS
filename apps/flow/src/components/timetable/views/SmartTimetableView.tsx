'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Moon,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Badge, Button, ThemeToggle, cn, useSlidingIndicator, type MockUserProfile } from '@ants/ui';
import {
  addDaysIso,
  computeDayAllocations,
  createTimetableId,
  findNextOpenSlotMinutes,
  formatFullDateLabel,
  formatMonthHeading,
  getBlocksForDate,
  getWeekDates,
  moveBlockToSlot,
  parseIsoDate,
  resizeBlockDuration,
  toIsoDate,
  type ReminderLeadMinutes,
  type SyncedExamCountdown,
  type TaskPriority,
  type TimetableBlock,
  type TimetablePersistedState,
  type TimetablePresetId,
  type TimetableViewMode,
  type TodayFocusTask,
} from '../../../lib/timetable/engine';
import {
  TIMETABLE_STORAGE_KEY,
  loadTimetableState,
  saveTimetableState,
} from '../../../lib/timetable/storage';
import {
  DEFAULT_TIMETABLE_REFERENCE_DATE,
  MOCK_SYNCED_EXAMS,
  createPresetTimetableState,
} from '../../../mocks/timetable.mock';
import { FlowShellView } from '../../layout/views/FlowShellView';
import { BlockEditorModalView, type BlockEditorDraft } from './BlockEditorModalView';
import { TelegramReminderModalView } from './TelegramReminderModalView';
import { TimetableDayView } from './TimetableDayView';
import { TimetableMonthView } from './TimetableMonthView';
import { TimetableWeekGridView } from './TimetableWeekGridView';
import { TodayFocusRailView } from './TodayFocusRailView';

export interface SmartTimetableViewProps {
  /** Initial state (defaults to realistic 24h coaching schedule preset) */
  initialState?: TimetablePersistedState;
  /** Synced exam countdowns pulled from `study.the-ants.org` */
  exams?: SyncedExamCountdown[];
  /** Persist changes to localStorage when standalone */
  persistToLocalStorage?: boolean;
  storageKey?: string;
  user?: MockUserProfile | null;
  onStateChange?: (state: TimetablePersistedState) => void;
  onBlockSaved?: (block: TimetableBlock, isNew: boolean) => void;
  onBlockDeleted?: (blockId: string) => void;
  onReminderSaved?: (
    blockId: string,
    config: { enabled: boolean; leadMinutes: ReminderLeadMinutes; note?: string }
  ) => void;
}

const VIEW_TABS: { id: TimetableViewMode; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'month', label: 'Month' },
];

const PRESET_OPTIONS: { id: TimetablePresetId; label: string }[] = [
  { id: 'workday-coaching', label: '24h Workday' },
  { id: 'scholar-ial', label: 'IAL Scholar' },
];

export const TIMETABLE_ZOOM_LEVELS = [54, 72, 96, 120] as const;
export type TimetableHourHeight = (typeof TIMETABLE_ZOOM_LEVELS)[number];
export const MIN_ZOOM_HOUR_HEIGHT: TimetableHourHeight = 54;
export const MAX_ZOOM_HOUR_HEIGHT: TimetableHourHeight = 120;
const TIMETABLE_ZOOM_STORAGE_KEY = 'ants-flow-timetable-zoom-v1';

export function SmartTimetableView({
  initialState,
  exams = MOCK_SYNCED_EXAMS,
  persistToLocalStorage = true,
  storageKey = TIMETABLE_STORAGE_KEY,
  user,
  onStateChange,
  onBlockSaved,
  onBlockDeleted,
  onReminderSaved,
}: SmartTimetableViewProps) {
  const [state, setState] = useState<TimetablePersistedState>(
    () => initialState ?? createPresetTimetableState('workday-coaching', DEFAULT_TIMETABLE_REFERENCE_DATE)
  );
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [todayIso, setTodayIso] = useState(DEFAULT_TIMETABLE_REFERENCE_DATE);
  const [nowMinutes, setNowMinutes] = useState(14 * 60 + 23);
  const [hourHeight, setHourHeight] = useState<TimetableHourHeight>(72);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<BlockEditorDraft | null>(null);
  const [reminderBlockId, setReminderBlockId] = useState<string | null>(null);

  const viewTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: viewTabsRect,
    ready: viewTabsReady,
    animate: viewTabsAnimate,
  } = useSlidingIndicator(viewTabsRef, state.viewMode, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const viewTabsIndicatorReady = viewTabsReady && viewTabsRect.visible;

  const presetTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: presetTabsRect,
    ready: presetTabsReady,
    animate: presetTabsAnimate,
  } = useSlidingIndicator(presetTabsRef, state.presetId, {
    activeSelector: '[aria-pressed="true"]',
  });
  const presetTabsIndicatorReady = presetTabsReady && presetTabsRect.visible;

  const commit = useCallback(
    (next: TimetablePersistedState) => {
      stateRef.current = next;
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange]
  );

  // Hydrate saved state + real local time on mount
  useEffect(() => {
    document.title = 'Smart Timetable · Flow — The ANTs Productivity Studio';
    const now = new Date();
    setTodayIso(toIsoDate(now));
    setNowMinutes(now.getHours() * 60 + now.getMinutes());
    if (persistToLocalStorage) {
      const saved = loadTimetableState(storageKey);
      if (saved) {
        stateRef.current = saved;
        setState(saved);
      }
      try {
        const savedZoom = localStorage.getItem(TIMETABLE_ZOOM_STORAGE_KEY);
        if (savedZoom) {
          const parsed = Number(savedZoom);
          if (TIMETABLE_ZOOM_LEVELS.includes(parsed as TimetableHourHeight)) {
            setHourHeight(parsed as TimetableHourHeight);
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    setHydrated(true);
  }, [persistToLocalStorage, storageKey]);

  const handleZoomStep = (delta: -1 | 1) => {
    const currentIndex = TIMETABLE_ZOOM_LEVELS.indexOf(hourHeight);
    const safeCurrent = currentIndex === -1 ? 1 : currentIndex;
    const nextIndex = Math.max(0, Math.min(TIMETABLE_ZOOM_LEVELS.length - 1, safeCurrent + delta));
    const nextZoom = TIMETABLE_ZOOM_LEVELS[nextIndex] ?? 72;
    setHourHeight(nextZoom);
    if (persistToLocalStorage) {
      try {
        localStorage.setItem(TIMETABLE_ZOOM_STORAGE_KEY, String(nextZoom));
      } catch {
        // ignore storage errors
      }
    }
  };

  useEffect(() => {
    if (!hydrated || !persistToLocalStorage) return;
    saveTimetableState(state, storageKey);
  }, [state, hydrated, persistToLocalStorage, storageKey]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      setTodayIso(toIsoDate(now));
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const weekDates = useMemo(() => getWeekDates(state.selectedDate, 1), [state.selectedDate]);
  const selectedDayBlocks = useMemo(
    () => getBlocksForDate(state.blocks, state.selectedDate),
    [state.blocks, state.selectedDate]
  );
  const dayAllocations = useMemo(
    () => computeDayAllocations(selectedDayBlocks),
    [selectedDayBlocks]
  );

  const reminderBlock = useMemo(
    () => state.blocks.find((b) => b.id === reminderBlockId) ?? null,
    [state.blocks, reminderBlockId]
  );

  const periodLabel = useMemo(() => {
    if (state.viewMode === 'day') return formatFullDateLabel(state.selectedDate);
    if (state.viewMode === 'month') return formatMonthHeading(state.selectedDate);
    const start = weekDates[0] ?? state.selectedDate;
    const end = weekDates[6] ?? state.selectedDate;
    return `${formatFullDateLabel(start)} – ${formatFullDateLabel(end)}`;
  }, [state.viewMode, state.selectedDate, weekDates]);

  const stepPeriod = (direction: -1 | 1) => {
    const current = stateRef.current;
    if (current.viewMode === 'day') {
      commit({ ...current, selectedDate: addDaysIso(current.selectedDate, direction) });
      return;
    }
    if (current.viewMode === 'week') {
      commit({ ...current, selectedDate: addDaysIso(current.selectedDate, direction * 7) });
      return;
    }
    const d = parseIsoDate(current.selectedDate);
    d.setMonth(d.getMonth() + direction);
    commit({ ...current, selectedDate: toIsoDate(d) });
  };

  const openQuickAdd = useCallback((date: string, startMinutes: number) => {
    setEditorDraft({
      mode: 'create',
      defaultDate: date,
      defaultStartMinutes: startMinutes,
      defaultEndMinutes: Math.min(1440, startMinutes + 45),
    });
    setEditorOpen(true);
  }, []);

  const openEditBlock = useCallback((block: TimetableBlock) => {
    setEditorDraft({
      mode: 'edit',
      block,
      defaultDate: block.date,
      defaultStartMinutes: block.startMinutes,
      defaultEndMinutes: block.endMinutes,
    });
    setEditorOpen(true);
  }, []);

  const handleSaveBlock = useCallback(
    (block: TimetableBlock, isNew: boolean) => {
      const current = stateRef.current;
      const nextBlocks = isNew
        ? [...current.blocks, block]
        : current.blocks.map((b) => (b.id === block.id ? block : b));
      commit({ ...current, blocks: nextBlocks });
      onBlockSaved?.(block, isNew);
    },
    [commit, onBlockSaved]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        blocks: current.blocks.filter((b) => b.id !== blockId),
      });
      onBlockDeleted?.(blockId);
    },
    [commit, onBlockDeleted]
  );

  const handleMoveBlock = useCallback(
    (blockId: string, nextDate: string, nextStartMinutes: number) => {
      const current = stateRef.current;
      commit({
        ...current,
        blocks: current.blocks.map((b) =>
          b.id === blockId ? moveBlockToSlot(b, nextDate, nextStartMinutes) : b
        ),
      });
    },
    [commit]
  );

  const handleResizeBlock = useCallback(
    (blockId: string, nextEndMinutes: number) => {
      const current = stateRef.current;
      commit({
        ...current,
        blocks: current.blocks.map((b) =>
          b.id === blockId ? resizeBlockDuration(b, nextEndMinutes) : b
        ),
      });
    },
    [commit]
  );

  const handleToggleBlockComplete = useCallback(
    (blockId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        blocks: current.blocks.map((b) =>
          b.id === blockId ? { ...b, completed: !b.completed } : b
        ),
      });
    },
    [commit]
  );

  const handleSaveReminder = useCallback(
    (
      blockId: string,
      config: { enabled: boolean; leadMinutes: ReminderLeadMinutes; note?: string }
    ) => {
      const current = stateRef.current;
      commit({
        ...current,
        blocks: current.blocks.map((b) =>
          b.id === blockId ? { ...b, telegramReminder: config } : b
        ),
      });
      onReminderSaved?.(blockId, config);
    },
    [commit, onReminderSaved]
  );

  const handleAddFocusTask = useCallback(
    (title: string, priority: TaskPriority) => {
      const current = stateRef.current;
      const newTask: TodayFocusTask = {
        id: createTimetableId('ft'),
        title,
        priority,
        estimatedMinutes: 50,
        pomodorosPlanned: 2,
        pomodorosDone: 0,
        done: false,
      };
      commit({ ...current, focusTasks: [newTask, ...current.focusTasks] });
    },
    [commit]
  );

  const handleToggleFocusTask = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        focusTasks: current.focusTasks.map((t) =>
          t.id === taskId ? { ...t, done: !t.done } : t
        ),
      });
    },
    [commit]
  );

  const handleDeleteFocusTask = useCallback(
    (taskId: string) => {
      const current = stateRef.current;
      commit({
        ...current,
        focusTasks: current.focusTasks.filter((t) => t.id !== taskId),
      });
    },
    [commit]
  );

  const handleScheduleTask = useCallback((task: TodayFocusTask) => {
    const current = stateRef.current;
    const dayBlocks = getBlocksForDate(current.blocks, current.selectedDate);
    const startMin = findNextOpenSlotMinutes(dayBlocks, task.estimatedMinutes, 6 * 60 + 15);
    const durationMin = Math.max(15, Math.min(180, Math.round(task.estimatedMinutes / 15) * 15));
    const inferredCategory = task.tag === 'Health'
      ? 'health'
      : task.tag === 'Family'
        ? 'family'
        : task.tag === 'Reading'
          ? 'reading'
          : task.pomodorosPlanned
            ? 'deep-work'
            : 'work';

    setEditorDraft({
      mode: 'create',
      defaultDate: current.selectedDate,
      defaultStartMinutes: startMin,
      defaultEndMinutes: Math.min(1440, startMin + durationMin),
      defaultTitle: task.title,
      defaultCategory: inferredCategory,
      defaultPriority: task.priority,
      defaultPomodoros: task.pomodorosPlanned,
    });
    setEditorOpen(true);
  }, []);

  const switchPreset = (presetId: TimetablePresetId) => {
    const preset = createPresetTimetableState(presetId, todayIso);
    commit({
      ...preset,
      viewMode: stateRef.current.viewMode,
      showExams: stateRef.current.showExams,
      showOvernightHours: stateRef.current.showOvernightHours,
    });
  };

  return (
    <FlowShellView
      activeSection="timetable"
      tabs={[]}
      contentWidth="wide"
      user={user}
      headerActions={<ThemeToggle />}
    >
      {/* Top Timetable Toolbar — Two-Tier Visual Hierarchy */}
      <div className="ants-workspace-enter flex flex-col gap-3.5 border-b border-border pb-4">
        {/* Tier 1: Main Navigation & Core View Controls */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Smart Timetable
            </h1>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-card p-0.5">
                <button
                  type="button"
                  onClick={() => stepPeriod(-1)}
                  aria-label="Previous period"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => commit({ ...stateRef.current, selectedDate: todayIso })}
                  className="rounded-md px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-inset"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => stepPeriod(1)}
                  aria-label="Next period"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <span className="font-mono text-xs font-semibold tabular-nums text-foreground-muted">
                {periodLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Week / Day / Month Mode Switcher */}
            <div
              ref={viewTabsRef}
              role="tablist"
              aria-label="Timetable view mode"
              data-gliding-ready={viewTabsIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex rounded-lg bg-surface-inset p-1"
            >
              <span
                aria-hidden="true"
                data-animate={viewTabsAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded-md bg-surface-card shadow-[var(--shadow-tier-1)]"
                style={{
                  transform: `translate3d(${viewTabsRect.x}px, ${viewTabsRect.y}px, 0)`,
                  width: `${viewTabsRect.width}px`,
                  height: `${viewTabsRect.height}px`,
                  opacity: viewTabsIndicatorReady ? 1 : 0,
                }}
              />
              {VIEW_TABS.map((t) => {
                const active = state.viewMode === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => commit({ ...stateRef.current, viewMode: t.id })}
                    className={cn(
                      'ants-glide-item relative z-10 rounded-md px-3 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                      active
                        ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <Button
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => openQuickAdd(state.selectedDate, 6 * 60 + 15)}
            >
              Block time
            </Button>
          </div>
        </div>

        {/* Tier 2: Quiet Secondary Utility Shelf */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-foreground-muted">
          <div className="flex flex-wrap items-center gap-2">
            {state.viewMode === 'week' && (
              <div
                className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-surface-card p-0.5"
                title="Vertical Zoom (Hour Height)"
              >
                <button
                  type="button"
                  onClick={() => handleZoomStep(-1)}
                  disabled={hourHeight <= MIN_ZOOM_HOUR_HEIGHT}
                  aria-label="Zoom out timetable vertically"
                  title="Zoom out (shorter hours)"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground disabled:opacity-30"
                >
                  <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="min-w-11 px-1 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  {hourHeight}px
                </span>
                <button
                  type="button"
                  onClick={() => handleZoomStep(1)}
                  disabled={hourHeight >= MAX_ZOOM_HOUR_HEIGHT}
                  aria-label="Zoom in timetable vertically"
                  title="Zoom in (taller hours)"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground disabled:opacity-30"
                >
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}

            {state.viewMode === 'week' && (
              <button
                type="button"
                aria-pressed={state.showOvernightHours}
                onClick={() =>
                  commit({
                    ...stateRef.current,
                    showOvernightHours: !stateRef.current.showOvernightHours,
                  })
                }
                title={
                  state.showOvernightHours
                    ? 'Collapse 00:00–06:00 overnight sleep into summary strip'
                    : 'Expand full 00:00–24:00 grid'
                }
                className={cn(
                  'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                  state.showOvernightHours
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint font-semibold'
                    : 'border-border/70 bg-surface-card text-foreground hover:border-border-hover'
                )}
              >
                <Moon className="h-3 w-3" aria-hidden="true" />
                {state.showOvernightHours ? '00–24h Expanded' : '00–06 Grouped'}
              </button>
            )}

            <button
              type="button"
              aria-pressed={state.showExams}
              onClick={() =>
                commit({ ...stateRef.current, showExams: !stateRef.current.showExams })
              }
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
                state.showExams
                  ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint font-semibold'
                  : 'border-border/70 bg-surface-card text-foreground-muted hover:text-foreground'
              )}
            >
              <GraduationCap className="h-3 w-3" aria-hidden="true" />
              Show Exams
            </button>
          </div>

          {/* Subordinated Demo Preset Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-foreground-subtle">Preset:</span>
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-surface-card p-0.5">
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
                        'ants-glide-item relative z-10 rounded-md px-2 py-0.5 text-xs font-medium transition-colors active:scale-[0.98]',
                        active
                          ? 'bg-surface-inset text-foreground font-semibold'
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
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted hover:bg-surface-inset hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Synced Exam Countdown Banner Chips from Study */}
      {state.showExams && exams.length > 0 && (
        <section
          aria-label="Synced exam countdowns from Study"
          className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-card px-3.5 py-2.5"
        >
          <span className="text-xs font-semibold text-foreground-muted">
            Study Exam Sync:
          </span>
          {exams.map((exam) => (
            <button
              key={exam.id}
              type="button"
              onClick={() =>
                commit({
                  ...stateRef.current,
                  selectedDate: exam.examDate,
                  viewMode: 'day',
                })
              }
              title={`${exam.board} · ${exam.examDate} (click to view day)`}
              className="inline-flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Badge
                variant={
                  exam.tone === 'danger'
                    ? 'deadline'
                    : exam.tone === 'primary'
                      ? 'active-filter'
                      : 'verified'
                }
                dot={exam.tone === 'danger'}
                code={exam.code}
                mono
              >
                {exam.title} · {exam.daysLeft}d
              </Badge>
            </button>
          ))}
        </section>
      )}

      {/* Main Split Workspace: 24h Calendar Grid + Today Focus Rail */}
      <div className="mt-4 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section key={state.viewMode} aria-label="Timetable schedule" className="ants-fade-enter min-w-0">
          {state.viewMode === 'week' && (
            <TimetableWeekGridView
              weekDates={weekDates}
              todayIso={todayIso}
              selectedDate={state.selectedDate}
              blocks={state.blocks}
              showOvernightHours={state.showOvernightHours}
              nowMinutes={nowMinutes}
              hourHeight={hourHeight}
              onSelectDate={(iso) =>
                commit({ ...stateRef.current, selectedDate: iso })
              }
              onQuickAddSlot={openQuickAdd}
              onEditBlock={openEditBlock}
              onOpenReminder={(block) => setReminderBlockId(block.id)}
              onMoveBlock={handleMoveBlock}
              onResizeBlock={handleResizeBlock}
              onToggleOvernight={() =>
                commit({
                  ...stateRef.current,
                  showOvernightHours: !stateRef.current.showOvernightHours,
                })
              }
              onSwitchToDay={() => commit({ ...stateRef.current, viewMode: 'day' })}
            />
          )}

          {state.viewMode === 'day' && (
            <TimetableDayView
              date={state.selectedDate}
              todayIso={todayIso}
              blocks={state.blocks}
              onQuickAddSlot={openQuickAdd}
              onEditBlock={openEditBlock}
              onToggleBlockComplete={handleToggleBlockComplete}
              onOpenReminder={(block) => setReminderBlockId(block.id)}
            />
          )}

          {state.viewMode === 'month' && (
            <TimetableMonthView
              anchorDate={state.selectedDate}
              todayIso={todayIso}
              selectedDate={state.selectedDate}
              blocks={state.blocks}
              exams={exams}
              showExams={state.showExams}
              onSelectDay={(iso) =>
                commit({
                  ...stateRef.current,
                  selectedDate: iso,
                  viewMode: 'day',
                })
              }
            />
          )}
        </section>

        <TodayFocusRailView
          selectedDate={state.selectedDate}
          allocations={dayAllocations}
          tasks={state.focusTasks}
          telegramConnected={state.telegramConnected}
          telegramHandle={state.telegramHandle}
          onAddTask={handleAddFocusTask}
          onToggleTask={handleToggleFocusTask}
          onDeleteTask={handleDeleteFocusTask}
          onScheduleTask={handleScheduleTask}
        />
      </div>

      <BlockEditorModalView
        open={editorOpen}
        draft={editorDraft}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
      />

      <TelegramReminderModalView
        open={Boolean(reminderBlock)}
        block={reminderBlock}
        telegramConnected={state.telegramConnected}
        telegramHandle={state.telegramHandle}
        onClose={() => setReminderBlockId(null)}
        onSave={handleSaveReminder}
      />
    </FlowShellView>
  );
}
