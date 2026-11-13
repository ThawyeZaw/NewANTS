'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Pencil,
  Pin,
  Plus,
  RefreshCw,
  Search,
  Timer,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  MOCK_AUTHENTICATED_USER,
  cn,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  computeLiveCountdownParts,
  deleteCustomCountdownState,
  filterAndSortCountdowns,
  formatCountdownClock,
  loadStudyCountdownsState,
  mergeCountdownEntries,
  saveStudyCountdownsState,
  syncCustomExamDashboardFlags,
  updateExamDashboardFlagsInStorage,
  upsertCustomCountdownState,
  type CountdownKindFilter,
  type ExamColorTag,
  type ExamCountdownEntry,
  type StudyCountdownsPersistedState,
} from '../../../lib/study/countdown-leaderboard';
import {
  loadStudyDashboardState,
  saveStudyDashboardState,
  type StudyBoardPresetId,
  type StudyDashboardPersistedState,
} from '../../../lib/study/dashboard';
import {
  createDefaultStudyCountdownsState,
  DEFAULT_COUNTDOWN_NOW_MS,
  MOCK_STUDY_COUNTDOWN_ENTRIES,
} from '../../../mocks/study-countdown-leaderboard.mock';
import { createDefaultStudyDashboardState } from '../../../mocks/study-dashboard.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';
import { CustomExamModalView } from './CustomExamModalView';

export interface StudyCountdownViewProps {
  user?: MockUserProfile | null;
  baseExams?: ExamCountdownEntry[];
  initialCountdownsState?: StudyCountdownsPersistedState;
  initialDashboardState?: StudyDashboardPersistedState;
  referenceNowMs?: number;
  flowUrl?: string;
  orgUrl?: string;
  /** Controlled callbacks for `[THAW-4.4]` full-stack integration */
  onSaveCustomExam?: (entry: ExamCountdownEntry) => void;
  onDeleteCustomExam?: (examId: string) => void;
  onTogglePin?: (examId: string) => void;
  onToggleFlowSync?: (examId: string) => void;
}

const COLOR_DOT_CLASS: Record<ExamColorTag, string> = {
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-400',
};

const BOARD_FILTERS: { id: 'all' | StudyBoardPresetId; label: string }[] = [
  { id: 'all', label: 'All Enrolled Boards' },
  { id: 'edexcel-ial', label: 'Edexcel IAL' },
  { id: 'cambridge-igcse', label: 'Cambridge IGCSE' },
];

const KIND_FILTERS: { id: CountdownKindFilter; label: string }[] = [
  { id: 'all', label: 'All Sittings' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'official', label: 'Official Papers' },
  { id: 'mock_custom', label: 'Mocks & Custom' },
  { id: 'flow_synced', label: 'Synced to Flow' },
];

export function StudyCountdownView({
  user = MOCK_AUTHENTICATED_USER,
  baseExams = MOCK_STUDY_COUNTDOWN_ENTRIES,
  initialCountdownsState,
  initialDashboardState,
  referenceNowMs = DEFAULT_COUNTDOWN_NOW_MS,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onSaveCustomExam,
  onDeleteCustomExam,
  onTogglePin,
  onToggleFlowSync,
}: StudyCountdownViewProps) {
  const defaultCountdowns = useMemo(
    () => initialCountdownsState ?? createDefaultStudyCountdownsState(),
    [initialCountdownsState]
  );
  const defaultDashboard = useMemo(
    () => initialDashboardState ?? createDefaultStudyDashboardState(),
    [initialDashboardState]
  );

  const [countdownsState, setCountdownsState] =
    useState<StudyCountdownsPersistedState>(defaultCountdowns);
  const [dashboardState, setDashboardState] =
    useState<StudyDashboardPersistedState>(defaultDashboard);
  const [liveNowMs, setLiveNowMs] = useState<number>(referenceNowMs);
  const [boardFilter, setBoardFilter] = useState<'all' | StudyBoardPresetId>('all');
  const [kindFilter, setKindFilter] = useState<CountdownKindFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExamCountdownEntry | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const boardTabsRef = useRef<HTMLDivElement>(null);
  const kindPillsRef = useRef<HTMLDivElement>(null);

  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, boardFilter, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const boardIndicatorReady = boardReady && boardRect.visible;

  const {
    rect: kindRect,
    ready: kindReady,
    animate: kindAnimate,
  } = useSlidingIndicator(kindPillsRef, kindFilter, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const kindIndicatorReady = kindReady && kindRect.visible;

  useEffect(() => {
    setCountdownsState(loadStudyCountdownsState(defaultCountdowns));
    setDashboardState(loadStudyDashboardState(defaultDashboard));
    // Advance clock cleanly after SSR hydration so `DDd HHh MMm SSs` ticks live every second
    setLiveNowMs(Math.max(referenceNowMs, Date.now()));
    const interval = window.setInterval(() => {
      setLiveNowMs(Math.max(referenceNowMs, Date.now()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [defaultCountdowns, defaultDashboard, referenceNowMs]);

  useEffect(() => {
    if (!statusNotice) return;
    const timer = window.setTimeout(() => setStatusNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [statusNotice]);

  const allMergedExams = useMemo(
    () => mergeCountdownEntries(baseExams, countdownsState),
    [baseExams, countdownsState]
  );

  const visibleExams = useMemo(
    () =>
      filterAndSortCountdowns(allMergedExams, {
        boardFilter,
        kindFilter,
        search: searchQuery,
        pinnedIds: dashboardState.pinnedExamIds,
        flowSyncedIds: dashboardState.flowSyncedExamIds,
        referenceNowMs: liveNowMs,
      }),
    [
      allMergedExams,
      boardFilter,
      kindFilter,
      searchQuery,
      dashboardState.pinnedExamIds,
      dashboardState.flowSyncedExamIds,
      liveNowMs,
    ]
  );

  const nearestExam = useMemo(() => {
    const sorted = filterAndSortCountdowns(allMergedExams, {
      boardFilter: 'all',
      kindFilter: 'all',
      search: '',
      pinnedIds: dashboardState.pinnedExamIds,
      flowSyncedIds: dashboardState.flowSyncedExamIds,
      referenceNowMs: liveNowMs,
    });
    return (
      sorted.find(
        (e) =>
          !computeLiveCountdownParts(e.examDateIso, liveNowMs, e.examTime24h).isPast &&
          dashboardState.pinnedExamIds.includes(e.id)
      ) ?? sorted[0] ?? null
    );
  }, [allMergedExams, dashboardState.pinnedExamIds, dashboardState.flowSyncedExamIds, liveNowMs]);

  const nearestParts = nearestExam
    ? computeLiveCountdownParts(nearestExam.examDateIso, liveNowMs, nearestExam.examTime24h)
    : null;

  const urgentCount = useMemo(
    () =>
      allMergedExams.filter((item) => {
        const parts = computeLiveCountdownParts(item.examDateIso, liveNowMs, item.examTime24h);
        return !parts.isPast && parts.days <= 14;
      }).length,
    [allMergedExams, liveNowMs]
  );

  const flowSyncedCount = useMemo(
    () =>
      allMergedExams.filter((item) => dashboardState.flowSyncedExamIds.includes(item.id)).length,
    [allMergedExams, dashboardState.flowSyncedExamIds]
  );

  const handleTogglePin = (exam: ExamCountdownEntry) => {
    const nextDash = updateExamDashboardFlagsInStorage(defaultDashboard, exam.id, 'pin');
    setDashboardState(nextDash);
    onTogglePin?.(exam.id);
    const nowPinned = nextDash.pinnedExamIds.includes(exam.id);
    setStatusNotice(
      nowPinned
        ? `Pinned ${exam.paperCode} to your Study Dashboard.`
        : `Unpinned ${exam.paperCode} from Dashboard.`
    );
  };

  const handleToggleFlowSync = (exam: ExamCountdownEntry) => {
    const nextDash = updateExamDashboardFlagsInStorage(defaultDashboard, exam.id, 'flow_sync');
    setDashboardState(nextDash);
    onToggleFlowSync?.(exam.id);
    const nowSynced = nextDash.flowSyncedExamIds.includes(exam.id);
    setStatusNotice(
      nowSynced
        ? `Synced ${exam.paperCode} exam chip onto your Flow Timetable.`
        : `Paused Flow Timetable sync for ${exam.paperCode}.`
    );
  };

  const handleSaveCustom = (
    entry: ExamCountdownEntry,
    flags: { pinned: boolean; syncedToFlow: boolean }
  ) => {
    const nextCountdowns = upsertCustomCountdownState(countdownsState, entry);
    setCountdownsState(nextCountdowns);
    saveStudyCountdownsState(nextCountdowns);

    const nextDash = syncCustomExamDashboardFlags(
      dashboardState,
      entry.id,
      flags.pinned,
      flags.syncedToFlow
    );
    setDashboardState(nextDash);
    saveStudyDashboardState(nextDash);

    onSaveCustomExam?.(entry);
    setStatusNotice(`Saved ${entry.paperCode} (${entry.examDateLabel}) countdown.`);
  };

  const handleDeleteCustom = (examId: string) => {
    const target = allMergedExams.find((e) => e.id === examId);
    const nextCountdowns = deleteCustomCountdownState(countdownsState, examId);
    setCountdownsState(nextCountdowns);
    saveStudyCountdownsState(nextCountdowns);
    onDeleteCustomExam?.(examId);
    setStatusNotice(
      target ? `Removed custom exam ${target.paperCode}.` : 'Removed custom exam countdown.'
    );
  };

  const flowOrigin = flowUrl.replace(/\/timetable.*$/, '');

  return (
    <StudyShellView
      activeRoute="countdown"
      user={user}
      flowUrl={flowUrl}
      orgUrl={orgUrl}
      headerActions={
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => {
            setEditingEntry(null);
            setModalOpen(true);
          }}
        >
          <span className="hidden sm:inline">Add Custom / Mock</span>
          <span className="sm:hidden">Add Exam</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Page Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
              Exam Countdown
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Auto-populated from your Pearson Edexcel IAL &amp; Cambridge IGCSE sittings, paired
              with timed mock simulations and Flow Timetable sync.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={flowUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>View on Flow Timetable</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-foreground-muted" aria-hidden="true" />
            </a>
          </div>
        </header>

        {/* Next Nearest Exam Spotlight & Hairline Telemetry Strip */}
        <section
          aria-label="Nearest exam countdown telemetry"
          className="rounded-xl border border-border bg-surface-card p-5 shadow-[var(--shadow-tier-1)]"
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
            <div className="space-y-2 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={nearestParts?.urgency === 'urgent' ? 'deadline' : 'active-filter'}
                  dot={nearestParts?.urgency === 'urgent'}
                >
                  Next Exam Sitting
                </Badge>
                {nearestExam && (
                  <span className="font-mono text-xs font-semibold text-foreground-muted">
                    {nearestExam.boardLabel} · {nearestExam.paperCode}
                  </span>
                )}
              </div>

              {nearestExam && nearestParts ? (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                      {nearestExam.title}
                    </h2>
                    <div
                      aria-live="off"
                      className="font-mono text-2xl font-bold tracking-tight text-primary tabular-nums sm:text-3xl"
                    >
                      {formatCountdownClock(nearestParts)}
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    {nearestExam.examDateLabel} at{' '}
                    <span className="font-mono tabular-nums">{nearestExam.examTime24h}</span>
                    {nearestExam.venueOrNotes ? ` · ${nearestExam.venueOrNotes}` : ''} · Target{' '}
                    <strong className="font-mono text-foreground">{nearestExam.targetGrade}</strong>
                  </p>
                </>
              ) : (
                <p className="text-sm text-foreground-muted">
                  No upcoming exam countdowns added yet. Add a custom or mock sitting to start.
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 divide-x divide-border border-t border-border pt-4 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div className="pr-3">
                <div className="text-[11px] font-medium text-foreground-muted">Total Exams</div>
                <div className="mt-1 font-mono text-xl font-bold text-foreground tabular-nums">
                  {allMergedExams.length}
                </div>
              </div>
              <div className="px-3">
                <div className="text-[11px] font-medium text-foreground-muted">Within 14 Days</div>
                <div className="mt-1 font-mono text-xl font-bold text-rose-500 tabular-nums">
                  {urgentCount}
                </div>
              </div>
              <div className="pl-3">
                <div className="text-[11px] font-medium text-foreground-muted">Flow Synced</div>
                <div className="mt-1 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {flowSyncedCount}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Action Feedback Toast */}
        {statusNotice && (
          <div
            role="status"
            className="ants-fade-enter flex items-center justify-between gap-3 rounded-lg border border-primary-tint-border bg-primary-tint px-3.5 py-2 text-xs font-medium text-on-primary-tint"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{statusNotice}</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 hover:bg-surface-card/40"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Controls: Board Tabs, Kind Filter Pills & Search */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              ref={boardTabsRef}
              role="tablist"
              aria-label="Filter countdowns by exam board"
              data-gliding-ready={boardIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-surface-inset p-1"
            >
              <span
                aria-hidden="true"
                data-animate={boardAnimate ? 'true' : 'false'}
                className="ants-glide-indicator rounded-md bg-surface-card shadow-xs"
                style={{
                  transform: `translate3d(${boardRect.x}px, ${boardRect.y}px, 0)`,
                  width: `${boardRect.width}px`,
                  height: `${boardRect.height}px`,
                  opacity: boardIndicatorReady ? 1 : 0,
                }}
              />
              {BOARD_FILTERS.map((tab) => {
                const active = boardFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => setBoardFilter(tab.id)}
                    className={cn(
                      'ants-glide-item relative z-10 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-surface-card text-foreground'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code (WMA11, 0580)..."
                aria-label="Search exam countdowns"
                className="h-9 w-full rounded-lg border border-border bg-surface-inset pl-8 pr-3 text-xs text-foreground placeholder:text-foreground-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div
            ref={kindPillsRef}
            role="tablist"
            aria-label="Filter countdowns by category"
            data-gliding-ready={kindIndicatorReady ? 'true' : 'false'}
            className="ants-glide-host relative flex items-center gap-1.5 overflow-x-auto border-t border-border pt-2.5"
          >
            <span
              aria-hidden="true"
              data-animate={kindAnimate ? 'true' : 'false'}
              className="ants-glide-indicator rounded-full border border-primary-tint-border bg-primary-tint"
              style={{
                transform: `translate3d(${kindRect.x}px, ${kindRect.y}px, 0)`,
                width: `${kindRect.width}px`,
                height: `${kindRect.height}px`,
                opacity: kindIndicatorReady ? 1 : 0,
              }}
            />
            {KIND_FILTERS.map((filter) => {
              const active = kindFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-active={active ? 'true' : 'false'}
                  onClick={() => setKindFilter(filter.id)}
                  className={cn(
                    'ants-glide-item relative z-10 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-primary-tint text-on-primary-tint'
                      : 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Countdown Cards Grid */}
        {visibleExams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleExams.map((exam, index) => {
              const parts = computeLiveCountdownParts(
                exam.examDateIso,
                liveNowMs,
                exam.examTime24h
              );
              const isPinned = dashboardState.pinnedExamIds.includes(exam.id);
              const isFlowSynced = dashboardState.flowSyncedExamIds.includes(exam.id);
              const urgencyBadgeVariant =
                parts.urgency === 'urgent'
                  ? ('deadline' as const)
                  : parts.urgency === 'upcoming'
                    ? ('active-filter' as const)
                    : ('editorial' as const);

              const pomodoroHref = `${flowOrigin}/pomodoro?task=${encodeURIComponent(
                `${exam.paperCode} · ${exam.title} Revision`
              )}&pomodoros=2`;

              return (
                <article
                  key={exam.id}
                  style={{ '--stagger-index': Math.min(index, 7) } as React.CSSProperties}
                  className="ants-stagger-item ants-card-interactive flex flex-col justify-between rounded-xl border border-border bg-surface-card p-4 shadow-[var(--shadow-tier-1)]"
                >
                  <div>
                    {/* Top Row: Code + Badges + Edit */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn('h-2 w-2 rounded-full', COLOR_DOT_CLASS[exam.colorTag])}
                          aria-hidden="true"
                        />
                        <span className="font-mono text-xs font-bold text-foreground">
                          {exam.paperCode}
                        </span>
                        <Badge variant="editorial">
                          {exam.boardLabel}
                        </Badge>
                        {exam.isMock && (
                          <Badge variant="subject">
                            Mock
                          </Badge>
                        )}
                        {exam.isCustom && !exam.isMock && (
                          <Badge variant="editorial">
                            Custom
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {exam.isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntry(exam);
                              setModalOpen(true);
                            }}
                            aria-label={`Edit ${exam.paperCode}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleTogglePin(exam)}
                          aria-pressed={isPinned}
                          aria-label={isPinned ? `Unpin ${exam.paperCode}` : `Pin ${exam.paperCode}`}
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                            isPinned
                              ? 'bg-primary-tint text-on-primary-tint'
                              : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                          )}
                        >
                          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Live JetBrains Mono Clock */}
                    <h3 className="mt-2.5 text-base font-bold leading-snug text-foreground">
                      {exam.title}
                    </h3>

                    <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-border pt-3">
                      <div className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
                        {parts.isPast ? 'Completed' : `${parts.days}d`}
                        {!parts.isPast && (
                          <span className="ml-2 text-sm font-medium text-foreground-muted">
                            {String(parts.hours).padStart(2, '0')}h{' '}
                            {String(parts.minutes).padStart(2, '0')}m{' '}
                            {String(parts.seconds).padStart(2, '0')}s
                          </span>
                        )}
                      </div>

                      <Badge variant={urgencyBadgeVariant} mono dot={parts.urgency === 'urgent'}>
                        {parts.isPast
                          ? 'Sat'
                          : parts.urgency === 'urgent'
                            ? 'Urgent'
                            : parts.urgency === 'upcoming'
                              ? 'Upcoming'
                              : 'Steady'}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-foreground-muted">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {exam.examDateLabel} ·{' '}
                            <span className="font-mono tabular-nums">{exam.examTime24h}</span>
                          </span>
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          Target {exam.targetGrade}
                        </span>
                      </div>
                      {exam.venueOrNotes && (
                        <p className="line-clamp-1 text-[11px] text-foreground-subtle">
                          {exam.venueOrNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Flow Sync + Focus Handoff */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => handleToggleFlowSync(exam)}
                      aria-pressed={isFlowSynced}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors',
                        isFlowSynced
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-border bg-surface-inset text-foreground-muted hover:text-foreground'
                      )}
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      <span>{isFlowSynced ? 'Synced to Flow' : 'Sync to Flow'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href="/past-papers"
                        className="inline-flex h-8 items-center rounded-md px-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground"
                      >
                        Papers
                      </Link>
                      <a
                        href={pomodoroHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
                      >
                        <Timer className="h-3 w-3 text-primary" aria-hidden="true" />
                        <span>Focus</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface-card p-8 text-center">
            <Clock className="mx-auto h-6 w-6 text-foreground-muted" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-bold text-foreground">No matching exam countdowns</h3>
            <p className="mt-1 text-xs text-foreground-muted">
              Clear your search filter or add a custom/mock sitting for this syllabus track.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBoardFilter('all');
                  setKindFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => {
                  setEditingEntry(null);
                  setModalOpen(true);
                }}
              >
                Add Custom / Mock
              </Button>
            </div>
          </div>
        )}
      </div>

      <CustomExamModalView
        open={modalOpen}
        editingEntry={editingEntry}
        initialPinned={
          editingEntry ? dashboardState.pinnedExamIds.includes(editingEntry.id) : true
        }
        initialSyncedToFlow={
          editingEntry ? dashboardState.flowSyncedExamIds.includes(editingEntry.id) : true
        }
        defaultBoardId={boardFilter === 'cambridge-igcse' ? 'cambridge-igcse' : 'edexcel-ial'}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveCustom}
        onDelete={handleDeleteCustom}
      />
    </StudyShellView>
  );
}
