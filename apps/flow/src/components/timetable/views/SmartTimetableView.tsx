'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Maximize2,
  Moon,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  Badge,
  Button,
  ThemeToggle,
  cn,
  emitMiloCheer,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  DEFAULT_ZOOM_HOUR_HEIGHT,
  MAX_ZOOM_HOUR_HEIGHT,
  MIN_ZOOM_HOUR_HEIGHT,
  TIMETABLE_ZOOM_LEVELS,
  addDaysIso,
  clampHourHeight,
  computeFitHourHeight,
  formatFullDateLabel,
  formatMonthHeading,
  getWeekDates,
  moveBlockToSlot,
  parseIsoDate,
  resizeBlockDuration,
  toIsoDate,
  type MonthDensityMode,
  type ReminderLeadMinutes,
  type SyncedExamCountdown,
  type TimetableBlock,
  type TimetableHourHeight,
  type TimetablePersistedState,
  type TimetablePresetId,
  type TimetableViewMode,
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

export {
  DEFAULT_ZOOM_HOUR_HEIGHT,
  MAX_ZOOM_HOUR_HEIGHT,
  MIN_ZOOM_HOUR_HEIGHT,
  TIMETABLE_ZOOM_LEVELS,
  type TimetableHourHeight,
};

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

const MONTH_DENSITY_OPTIONS: { id: MonthDensityMode; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'detailed', label: 'Detailed' },
];

const PRESET_OPTIONS: { id: TimetablePresetId; label: string; hint: string }[] = [
  {
    id: 'workday-coaching',
    label: '24h Workday',
    hint: 'Full 1,440m workday & coaching blocks',
  },
  {
    id: 'scholar-ial',
    label: 'IAL Scholar',
    hint: 'WMA11, 9702 & 0580 revision timetable',
  },
];

const TIMETABLE_ZOOM_STORAGE_KEY = 'ants-flow-timetable-zoom-v1';
const TIMETABLE_MONTH_DENSITY_STORAGE_KEY = 'ants-flow-timetable-month-density-v1';

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
    () =>
      initialState ??
      createPresetTimetableState('workday-coaching', DEFAULT_TIMETABLE_REFERENCE_DATE)
  );
  const stateRef = useRef(state);
  const [hydrated, setHydrated] = useState(false);
  const [todayIso, setTodayIso] = useState(DEFAULT_TIMETABLE_REFERENCE_DATE);
  const [nowMinutes, setNowMinutes] = useState(14 * 60 + 23);

  const [hourHeight, setHourHeight] = useState<TimetableHourHeight>(
    DEFAULT_ZOOM_HOUR_HEIGHT
  );
  const [isFitZoom, setIsFitZoom] = useState(false);
  const [monthDensity, setMonthDensity] = useState<MonthDensityMode>('comfortable');

  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const presetMenuRef = useRef<HTMLDivElement | null>(null);

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

  const commit = useCallback(
    (next: TimetablePersistedState) => {
      stateRef.current = next;
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange]
  );

  // Hydrate saved state, zoom, density, and real local time on mount
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
          if (Number.isFinite(parsed)) {
            setHourHeight(clampHourHeight(parsed));
          }
        }
        const savedDensity = localStorage.getItem(TIMETABLE_MONTH_DENSITY_STORAGE_KEY);
        if (
          savedDensity === 'compact' ||
          savedDensity === 'comfortable' ||
          savedDensity === 'detailed'
        ) {
          setMonthDensity(savedDensity);
        }
      } catch {
        // ignore storage errors
      }
    }
    setHydrated(true);
  }, [persistToLocalStorage, storageKey]);

  useEffect(() => {
    if (!hydrated || !persistToLocalStorage) return;
    saveTimetableState(state, storageKey);
  }, [state, hydrated, persistToLocalStorage, storageKey]);

  // Keep `/timetable` synced with updates made on `/focus` or `/tasks`
  useEffect(() => {
    if (!persistToLocalStorage) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== storageKey) return;
      const latest = loadTimetableState(storageKey);
      if (latest) {
        stateRef.current = latest;
        setState(latest);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [persistToLocalStorage, storageKey]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = new Date();
      setTodayIso(toIsoDate(now));
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Close Presets popover on outside click or Escape
  useEffect(() => {
    if (!presetMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        presetMenuRef.current &&
        !presetMenuRef.current.contains(event.target as Node)
      ) {
        setPresetMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresetMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [presetMenuOpen]);

  const applyHourHeight = useCallback(
    (nextRaw: number, fit = false) => {
      const clamped = clampHourHeight(nextRaw);
      setHourHeight(clamped);
      setIsFitZoom(fit);
      if (persistToLocalStorage) {
        try {
          localStorage.setItem(TIMETABLE_ZOOM_STORAGE_KEY, String(clamped));
        } catch {
          // ignore storage errors
        }
      }
    },
    [persistToLocalStorage]
  );

  const handleZoomStep = useCallback(
    (delta: -1 | 1) => {
      const stepPx = 12;
      applyHourHeight(hourHeight + delta * stepPx, false);
    },
    [hourHeight, applyHourHeight]
  );

  const handleWheelZoom = useCallback(
    (deltaPx: number) => {
      setHourHeight((prev) => {
        const next = clampHourHeight(prev + deltaPx);
        if (persistToLocalStorage) {
          try {
            localStorage.setItem(TIMETABLE_ZOOM_STORAGE_KEY, String(next));
          } catch {
            // ignore storage errors
          }
        }
        return next;
      });
      setIsFitZoom(false);
    },
    [persistToLocalStorage]
  );

  const handleFitZoom = useCallback(() => {
    const visibleHours = stateRef.current.showOvernightHours ? 24 : 18;
    const vpHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const fitPx = computeFitHourHeight(vpHeight, visibleHours);
    applyHourHeight(fitPx, true);
  }, [applyHourHeight]);

  const handleSelectMonthDensity = useCallback(
    (next: MonthDensityMode) => {
      setMonthDensity(next);
      if (persistToLocalStorage) {
        try {
          localStorage.setItem(TIMETABLE_MONTH_DENSITY_STORAGE_KEY, next);
        } catch {
          // ignore storage errors
        }
      }
    },
    [persistToLocalStorage]
  );

  // Keyboard shortcuts (+ / - / 0) for zoom & density
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editorOpen || Boolean(reminderBlockId)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        if (
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          (target.tagName === 'INPUT' &&
            (target as HTMLInputElement).type !== 'range')
        ) {
          return;
        }
      }

      if (stateRef.current.viewMode === 'month') {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          const idx = MONTH_DENSITY_OPTIONS.findIndex((o) => o.id === monthDensity);
          const next = MONTH_DENSITY_OPTIONS[Math.min(2, Math.max(0, idx + 1))]?.id;
          if (next) handleSelectMonthDensity(next);
        } else if (event.key === '-') {
          event.preventDefault();
          const idx = MONTH_DENSITY_OPTIONS.findIndex((o) => o.id === monthDensity);
          const next = MONTH_DENSITY_OPTIONS[Math.min(2, Math.max(0, idx - 1))]?.id;
          if (next) handleSelectMonthDensity(next);
        } else if (event.key === '0') {
          event.preventDefault();
          handleSelectMonthDensity('compact');
        }
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        applyHourHeight(hourHeight + 12, false);
      } else if (event.key === '-') {
        event.preventDefault();
        applyHourHeight(hourHeight - 12, false);
      } else if (event.key === '0') {
        event.preventDefault();
        handleFitZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editorOpen,
    reminderBlockId,
    hourHeight,
    monthDensity,
    applyHourHeight,
    handleFitZoom,
    handleSelectMonthDensity,
  ]);

  const weekDates = useMemo(
    () => getWeekDates(state.selectedDate, 1),
    [state.selectedDate]
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
      commit({
        ...current,
        selectedDate: addDaysIso(current.selectedDate, direction * 7),
      });
      return;
    }
    const d = parseIsoDate(current.selectedDate);
    d.setMonth(d.getMonth() + direction);
    commit({ ...current, selectedDate: toIsoDate(d) });
  };

  const openQuickAdd = useCallback(
    (date: string, startMinutes: number, endMinutes?: number) => {
      const resolvedEnd =
        endMinutes !== undefined
          ? Math.min(1440, Math.max(startMinutes + 15, endMinutes))
          : Math.min(1440, startMinutes + 45);
      setEditorDraft({
        mode: 'create',
        defaultDate: date,
        defaultStartMinutes: startMinutes,
        defaultEndMinutes: resolvedEnd,
      });
      setEditorOpen(true);
    },
    []
  );

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
      const target = current.blocks.find((b) => b.id === blockId);
      commit({
        ...current,
        blocks: current.blocks.map((b) =>
          b.id === blockId ? { ...b, completed: !b.completed } : b
        ),
      });
      if (target && !target.completed) {
        emitMiloCheer({
          mood: 'celebrating',
          propVariant: 'pencil',
          badge: 'Block Done',
          message: 'Time block completed! Keep that Flow momentum rolling.',
        });
      }
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

  const switchPreset = (presetId: TimetablePresetId) => {
    const preset = createPresetTimetableState(presetId, todayIso);
    commit({
      ...preset,
      viewMode: stateRef.current.viewMode,
      showExams: stateRef.current.showExams,
      showOvernightHours: stateRef.current.showOvernightHours,
    });
    setPresetMenuOpen(false);
  };

  const activePresetLabel =
    PRESET_OPTIONS.find((p) => p.id === state.presetId)?.label ?? 'Preset';

  return (
    <FlowShellView
      activeSection="timetable"
      tabs={[]}
      contentWidth="wide"
      user={user}
      headerActions={<ThemeToggle />}
    >
      {/* Compact Two-Row Timetable Toolbar */}
      <div className="ants-workspace-enter flex flex-col gap-2.5 border-b border-border pb-3">
        {/* Row 1: Date Stepper + View Switcher + Primary CTA */}
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
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

        {/* Row 2: Unified Zoom / Density Strip + Overnight + Exams + Compact Presets Menu */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground-muted">
          <div className="flex flex-wrap items-center gap-2">
            {state.viewMode === 'month' ? (
              <div
                role="group"
                aria-label="Month view density"
                className="inline-flex items-center rounded-lg border border-border/70 bg-surface-card p-0.5"
              >
                {MONTH_DENSITY_OPTIONS.map((opt) => {
                  const active = monthDensity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSelectMonthDensity(opt.id)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                        active
                          ? 'bg-primary-tint text-on-primary-tint'
                          : 'text-foreground-muted hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className="flex items-center gap-1 rounded-lg border border-border/70 bg-surface-card px-1.5 py-0.5"
                title="Vertical Zoom (Ctrl+Scroll or +/- keys, 0 to Fit)"
              >
                <button
                  type="button"
                  onClick={handleFitZoom}
                  aria-pressed={isFitZoom}
                  title="Fit full day to screen (0)"
                  className={cn(
                    'inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors',
                    isFitZoom
                      ? 'bg-primary-tint text-on-primary-tint'
                      : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                  )}
                >
                  <Maximize2 className="h-3 w-3" aria-hidden="true" />
                  Fit
                </button>
                <span className="h-3.5 w-px bg-border" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => handleZoomStep(-1)}
                  disabled={hourHeight <= MIN_ZOOM_HOUR_HEIGHT}
                  aria-label="Zoom out timetable vertically"
                  title="Zoom out (-)"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground disabled:opacity-30"
                >
                  <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM_HOUR_HEIGHT}
                  max={MAX_ZOOM_HOUR_HEIGHT}
                  step={4}
                  value={hourHeight}
                  aria-label="Timetable zoom (pixels per hour)"
                  onChange={(e) => applyHourHeight(Number(e.target.value), false)}
                  className="h-1.5 w-20 cursor-pointer accent-primary sm:w-28"
                />
                <button
                  type="button"
                  onClick={() => handleZoomStep(1)}
                  disabled={hourHeight >= MAX_ZOOM_HOUR_HEIGHT}
                  aria-label="Zoom in timetable vertically"
                  title="Zoom in (+)"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground disabled:opacity-30"
                >
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="min-w-10 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  {hourHeight}px
                </span>
              </div>
            )}

            {state.viewMode !== 'month' && (
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
                    ? 'border-primary-tint-border bg-primary-tint font-semibold text-on-primary-tint'
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
                  ? 'border-primary-tint-border bg-primary-tint font-semibold text-on-primary-tint'
                  : 'border-border/70 bg-surface-card text-foreground-muted hover:text-foreground'
              )}
            >
              <GraduationCap className="h-3 w-3" aria-hidden="true" />
              Exams
            </button>
          </div>

          {/* Tucked Demo Presets Popover */}
          <div ref={presetMenuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={presetMenuOpen}
              onClick={() => setPresetMenuOpen((v) => !v)}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border/70 bg-surface-card px-2.5 text-xs font-medium text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground"
            >
              <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
              <span>{activePresetLabel}</span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform',
                  presetMenuOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>

            {presetMenuOpen && (
              <div
                role="menu"
                aria-label="Timetable presets"
                className="absolute right-0 z-40 mt-1.5 w-60 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-[var(--shadow-tier-3)]"
              >
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Demo Schedules
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
                        'flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'bg-primary-tint text-on-primary-tint'
                          : 'text-foreground hover:bg-surface-inset'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{p.label}</div>
                        <div className="text-[10px] opacity-75">{p.hint}</div>
                      </div>
                      {active && (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
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
                  Reset active preset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Synced Exam Countdown Banner Chips from Study */}
      {state.showExams && exams.length > 0 && (
        <section
          aria-label="Synced exam countdowns from Study"
          className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-card px-3.5 py-2"
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

      {/* 100% Full-Width Timetable Workspace */}
      <section
        key={state.viewMode}
        aria-label="Timetable schedule"
        className="ants-fade-enter mt-3.5 min-w-0"
      >
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
            onWheelZoom={handleWheelZoom}
          />
        )}

        {state.viewMode === 'day' && (
          <TimetableDayView
            date={state.selectedDate}
            todayIso={todayIso}
            blocks={state.blocks}
            showOvernightHours={state.showOvernightHours}
            nowMinutes={nowMinutes}
            hourHeight={hourHeight}
            onQuickAddSlot={openQuickAdd}
            onEditBlock={openEditBlock}
            onToggleBlockComplete={handleToggleBlockComplete}
            onOpenReminder={(block) => setReminderBlockId(block.id)}
            onToggleOvernight={() =>
              commit({
                ...stateRef.current,
                showOvernightHours: !stateRef.current.showOvernightHours,
              })
            }
            onMoveBlock={handleMoveBlock}
            onResizeBlock={handleResizeBlock}
            onWheelZoom={handleWheelZoom}
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
            density={monthDensity}
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
