'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calculator,
  FileSpreadsheet,
  Filter,
  LayoutGrid,
  ListChecks,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Button,
  MOCK_AUTHENTICATED_USER,
  cn,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  loadStudyCurriculumState,
  type CurriculumSubjectItem,
} from '../../../lib/study/curriculum';
import {
  computeAllEnrolledPaperSummary,
  computeSeriesTrendPoints,
  computeSubjectPaperStats,
  deletePaperAttempt,
  filterPastPaperRows,
  loadStudyPapersState,
  logPaperAttempt,
  saveStudyPapersState,
  setCellDisplayMode,
  type LogPaperAttemptInput,
  type PaperAttemptFilter,
  type PaperCellDisplayMode,
  type PaperVariantGroup,
  type PastPaperAttempt,
  type PastPaperLayoutMode,
  type PastPaperRowDefinition,
  type PastPaperSeriesMeta,
  type StudyPapersPersistedState,
} from '../../../lib/study/papers';
import { resolveSubjectIdFromParam } from '../../../lib/study/topics';
import {
  createDefaultStudyCurriculumState,
  MOCK_CURRICULUM_SUBJECTS,
} from '../../../mocks/study-curriculum.mock';
import {
  createDefaultStudyPapersState,
  MOCK_PAST_PAPER_ROWS,
  PAST_PAPER_SERIES,
} from '../../../mocks/study-papers.mock';
import { StudyShellView, type StudyNavItem } from '../../layout/views/StudyShellView';
import { PastPaperMatrixView } from './PastPaperMatrixView';
import { PastPaperCardsView } from './PastPaperCardsView';
import { PaperScoreModalView } from './PaperScoreModalView';

export interface StudyPastPapersViewProps {
  user?: MockUserProfile | null;
  subjects?: CurriculumSubjectItem[];
  rows?: PastPaperRowDefinition[];
  seriesList?: PastPaperSeriesMeta[];
  initialSubjectId?: string;
  initialState?: StudyPapersPersistedState;
  /** Render inline inside `/curriculum/[subjectId]?tab=papers` or `/curriculum?tab=papers` */
  embedded?: boolean;
  flowUrl?: string;
  orgUrl?: string;
  onSubjectChange?: (subjectId: string) => void;
  onAttemptSaved?: (attempt: PastPaperAttempt) => void;
  onAttemptDeleted?: (attemptId: string) => void;
}

const ATTEMPT_FILTERS: Array<{ id: PaperAttemptFilter; label: string }> = [
  { id: 'all', label: 'All Papers' },
  { id: 'logged', label: 'Logged Only' },
  { id: 'unlogged', label: 'Needs Attempt' },
];

export function StudyPastPapersView({
  user = MOCK_AUTHENTICATED_USER,
  subjects = MOCK_CURRICULUM_SUBJECTS,
  rows = MOCK_PAST_PAPER_ROWS,
  seriesList = PAST_PAPER_SERIES,
  initialSubjectId = 'ial-maths-suite',
  initialState,
  embedded = false,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onSubjectChange,
  onAttemptSaved,
  onAttemptDeleted,
}: StudyPastPapersViewProps) {
  const defaultState = useMemo(
    () => initialState ?? createDefaultStudyPapersState(),
    [initialState]
  );

  const [state, setState] = useState<StudyPapersPersistedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() =>
    resolveSubjectIdFromParam(initialSubjectId, subjects)
  );
  const [enrolledSubjectIds, setEnrolledSubjectIds] = useState<string[]>(() =>
    subjects.filter((s) => s.defaultEnrolled).map((s) => s.id)
  );
  const [activeCashInCode, setActiveCashInCode] = useState<string>('YMA01');
  const [activeCashInUnits, setActiveCashInUnits] = useState<string[]>([
    'WMA11',
    'WMA12',
    'WMA13',
    'WMA14',
    'WME01',
    'WST01',
  ]);
  const [onlyMyCashInUnits, setOnlyMyCashInUnits] = useState<boolean>(false);

  const [layoutMode, setLayoutMode] = useState<PastPaperLayoutMode>('matrix');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [variantFilter, setVariantFilter] = useState<PaperVariantGroup>('all');
  const [attemptFilter, setAttemptFilter] = useState<PaperAttemptFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalTarget, setModalTarget] = useState<{
    row: PastPaperRowDefinition;
    series: PastPaperSeriesMeta;
  } | null>(null);
  const [lastXpToast, setLastXpToast] = useState<string | null>(null);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);

  const displayModeTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: displayModeRect,
    ready: displayModeReady,
    animate: displayModeAnimate,
  } = useSlidingIndicator(displayModeTabsRef, state.cellDisplayMode, {
    activeSelector: '[aria-pressed="true"]',
  });
  const displayModeIndicatorReady = displayModeReady && displayModeRect.visible;

  const layoutModeTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: layoutModeRect,
    ready: layoutModeReady,
    animate: layoutModeAnimate,
  } = useSlidingIndicator(layoutModeTabsRef, layoutMode, {
    activeSelector: '[aria-pressed="true"]',
  });
  const layoutModeIndicatorReady = layoutModeReady && layoutModeRect.visible;

  const unitTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: unitRect,
    ready: unitReady,
    animate: unitAnimate,
  } = useSlidingIndicator(unitTabsRef, `${selectedSubjectId}-${unitFilter}-${onlyMyCashInUnits}`, {
    activeSelector: '[aria-pressed="true"]',
  });
  const unitIndicatorReady = unitReady && unitRect.visible;

  const attemptTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: attemptRect,
    ready: attemptReady,
    animate: attemptAnimate,
  } = useSlidingIndicator(attemptTabsRef, attemptFilter, {
    activeSelector: '[aria-pressed="true"]',
  });
  const attemptIndicatorReady = attemptReady && attemptRect.visible;

  const variantTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: variantRect,
    ready: variantReady,
    animate: variantAnimate,
  } = useSlidingIndicator(variantTabsRef, `${selectedSubjectId}-${variantFilter}`, {
    activeSelector: '[aria-pressed="true"]',
  });
  const variantIndicatorReady = variantReady && variantRect.visible;

  useEffect(() => {
    const loadedPapers = loadStudyPapersState(defaultState);
    setState(loadedPapers);

    const loadedCurriculum = loadStudyCurriculumState(
      createDefaultStudyCurriculumState()
    );
    setEnrolledSubjectIds(loadedCurriculum.enrolledSubjectIds);
    const cashIn = loadedCurriculum.activeMathsCashIn;
    setActiveCashInCode(cashIn);
    setActiveCashInUnits(
      loadedCurriculum.mathsUnitsByCashIn[cashIn] ??
      loadedCurriculum.mathsUnitsByCashIn.YMA01
    );

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const subjectParam = params.get('subject');
      if (subjectParam) {
        setSelectedSubjectId(resolveSubjectIdFromParam(subjectParam, subjects));
      } else {
        setSelectedSubjectId(resolveSubjectIdFromParam(initialSubjectId, subjects));
      }
    }

    setHydrated(true);
  }, [defaultState, initialSubjectId, subjects]);

  useEffect(() => {
    if (!embedded) return;
    setSelectedSubjectId(resolveSubjectIdFromParam(initialSubjectId, subjects));
  }, [embedded, initialSubjectId, subjects]);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyPapersState(state);
  }, [hydrated, state]);

  const currentSubject = useMemo(
    () =>
      subjects.find((s) => s.id === selectedSubjectId) ??
      subjects[0] ??
      MOCK_CURRICULUM_SUBJECTS[0]!,
    [selectedSubjectId, subjects]
  );

  const isMathsSuite = currentSubject.subjectType === 'modular_maths_suite';
  const allowedUnitCodes = useMemo(
    () => (isMathsSuite && onlyMyCashInUnits ? activeCashInUnits : undefined),
    [activeCashInUnits, isMathsSuite, onlyMyCashInUnits]
  );

  const isCambridgeBoard =
    currentSubject.boardId === 'cambridge-igcse' ||
    currentSubject.boardId === 'cambridge-alevel';
  const isEdexcelIgcse = currentSubject.boardId === 'edexcel-igcse';

  const variantOptions: Array<{ id: PaperVariantGroup; label: string }> = useMemo(() => {
    if (isCambridgeBoard) {
      return [
        { id: 'all', label: 'All Variants' },
        { id: 'v1', label: 'Variant 1' },
        { id: 'v2', label: 'Variant 2' },
        { id: 'v3', label: 'Variant 3' },
      ];
    }
    if (isEdexcelIgcse) {
      return [
        { id: 'all', label: 'All Papers' },
        { id: 'main', label: 'Standard' },
        { id: 'regional', label: 'Regional (R)' },
      ];
    }
    return [];
  }, [isCambridgeBoard, isEdexcelIgcse]);

  const subjectUnitsWithRows = useMemo(() => {
    const unitCodesInRows = new Set(
      rows
        .filter((r) => r.subjectId === currentSubject.id)
        .map((r) => r.unitCode)
    );
    return currentSubject.units.filter(
      (u) =>
        unitCodesInRows.has(u.code) &&
        (!allowedUnitCodes || allowedUnitCodes.includes(u.code))
    );
  }, [allowedUnitCodes, currentSubject.id, currentSubject.units, rows]);

  const filteredRows = useMemo(
    () =>
      filterPastPaperRows(rows, state.attempts, seriesList, {
        subjectId: currentSubject.id,
        allowedUnitCodes,
        unitFilter,
        variantFilter,
        attemptFilter,
        searchQuery,
      }),
    [
      allowedUnitCodes,
      attemptFilter,
      currentSubject.id,
      rows,
      searchQuery,
      seriesList,
      state.attempts,
      unitFilter,
      variantFilter,
    ]
  );

  const subjectStats = useMemo(
    () =>
      computeSubjectPaperStats(
        rows,
        seriesList,
        state.attempts,
        currentSubject.id,
        state.cellDisplayMode,
        allowedUnitCodes
      ),
    [
      allowedUnitCodes,
      currentSubject.id,
      rows,
      seriesList,
      state.attempts,
      state.cellDisplayMode,
    ]
  );

  const globalSummary = useMemo(
    () =>
      computeAllEnrolledPaperSummary(
        subjects,
        enrolledSubjectIds,
        state.attempts
      ),
    [enrolledSubjectIds, state.attempts, subjects]
  );

  const trendPoints = useMemo(
    () =>
      computeSeriesTrendPoints(
        seriesList,
        rows,
        state.attempts,
        currentSubject.id,
        currentSubject.boardId,
        state.cellDisplayMode
      ),
    [
      currentSubject.boardId,
      currentSubject.id,
      rows,
      seriesList,
      state.attempts,
      state.cellDisplayMode,
    ]
  );

  const enrolledSubjects = useMemo(
    () => subjects.filter((s) => enrolledSubjectIds.includes(s.id)),
    [enrolledSubjectIds, subjects]
  );

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setUnitFilter('all');
    setVariantFilter('all');
    onSubjectChange?.(subjectId);
  };

  const handleChangeDisplayMode = (mode: PaperCellDisplayMode) => {
    setState((prev) => setCellDisplayMode(prev, mode));
  };

  const handleSaveAttempt = (
    row: PastPaperRowDefinition,
    series: PastPaperSeriesMeta,
    input: LogPaperAttemptInput
  ) => {
    const outcome = logPaperAttempt(state, row, series.id, input);
    setState(outcome.nextState);
    if (outcome.xpEarned > 0) {
      setLastXpToast(
        outcome.xpReason === 'first_clear'
          ? `+${outcome.xpEarned} XP awarded for logging ${row.paperCode}!`
          : `+${outcome.xpEarned} XP Personal Best on ${row.paperCode}!`
      );
    } else {
      setLastXpToast(
        `Saved ${row.paperCode} attempt (${outcome.createdAttempt.rawScore}/${row.maxRaw} · ${outcome.createdAttempt.derivedGrade}).`
      );
    }
    onAttemptSaved?.(outcome.createdAttempt);
  };

  const handleDeleteAttempt = (attemptId: string) => {
    setState((prev) => deletePaperAttempt(prev, attemptId));
    onAttemptDeleted?.(attemptId);
  };

  const handleQuickLogFirstAvailable = () => {
    const firstRow = filteredRows[0] ?? rows.find((r) => r.subjectId === currentSubject.id);
    if (!firstRow) return;
    const firstSeries =
      seriesList.find((s) =>
        !firstRow.availableSeriesIds || firstRow.availableSeriesIds.includes(s.id)
      ) ?? seriesList[0]!;
    setModalTarget({ row: firstRow, series: firstSeries });
  };

  const handleQueuedNav = (item: StudyNavItem) => {
    setQueuedNotice(
      `${item.label} (${item.href}) is queued for Stage ${item.stageTag ?? 'Z4'}. Dashboard (/), Curriculum & Topic Tracker (/curriculum), Past Papers (/past-papers), and Grade Calculator (/calculator) are live now.`
    );
  };

  // Compute SVG polyline coordinates for Score Trend Sparkline
  const sparklineCoords = useMemo(() => {
    const width = 220;
    const height = 44;
    const padX = 10;
    const padY = 6;
    const count = trendPoints.length;
    const stepX = count > 1 ? (width - padX * 2) / (count - 1) : 0;

    const coords = trendPoints.map((pt, idx) => {
      const x = padX + idx * stepX;
      const y =
        pt.averagePercent !== null
          ? padY +
          ((100 - Math.max(40, Math.min(100, pt.averagePercent))) / 60) *
          (height - padY * 2)
          : null;
      return { ...pt, x, y };
    });

    const activeCoords = coords.filter(
      (c): c is typeof c & { y: number } => c.y !== null
    );
    const polyline = activeCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    return { width, height, coords, activeCoords, polyline };
  }, [trendPoints]);

  const workspaceBody = (
    <div className="space-y-6">
      {/* 1. Enrolled Cross-Subject Overview Telemetry Bar (Standalone mode) */}
      {!embedded && (
        <section
          aria-labelledby="past-papers-hub-heading"
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1
                id="past-papers-hub-heading"
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              >
                Past Paper Matrix &amp; Score Tracker
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
                Log timed past papers by variant and exam series for instant Grade &amp; UMS/PUM boundary derivation.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/curriculum/${encodeURIComponent(currentSubject.id)}?tab=topics`}
                className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
              >
                <ListChecks className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Topic Tracker</span>
              </Link>
              <Link
                href="/calculator"
                className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
              >
                <Calculator className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Grade Calculator</span>
              </Link>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={handleQuickLogFirstAvailable}
                className="whitespace-nowrap shrink-0"
              >
                Log Score
              </Button>
            </div>
          </div>

          {/* All Enrolled Subjects Quick Switcher + Global Telemetry */}
          <div className="rounded-lg border border-border bg-surface-card p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Enrolled Papers Sat
                  </span>
                  <span
                    data-testid="global-papers-sat"
                    className="font-mono text-sm font-bold tabular-nums text-foreground"
                  >
                    {globalSummary.totalLoggedCells} unique sittings{' '}
                    <span className="font-normal text-foreground-muted">
                      ({globalSummary.totalAttempts} attempts)
                    </span>
                  </span>
                </div>

                <div className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Cross-Subject Avg
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {globalSummary.averagePercent}%{' '}
                    <span className="font-normal text-foreground-muted">
                      ({globalSummary.timedPercent}% timed)
                    </span>
                  </span>
                </div>

                <div className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Paper XP Earned
                  </span>
                  <span
                    data-testid="paper-earned-xp"
                    className="font-mono text-sm font-bold tabular-nums text-on-success-tint"
                  >
                    +{state.earnedPaperXp} XP
                  </span>
                </div>
              </div>

              <span className="font-mono text-[11px] text-foreground-muted">
                {enrolledSubjects.length} enrolled · {subjects.length} catalog specs
              </span>
            </div>

            {/* Instant Enrolled Subject Pills */}
            {enrolledSubjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-3">
                <span className="mr-1 text-[11px] font-semibold text-foreground-muted">
                  My Subjects:
                </span>
                {enrolledSubjects.map((subj) => {
                  const active = subj.id === currentSubject.id;
                  const loggedCount = new Set(
                    state.attempts
                      .filter((a) => a.subjectId === subj.id)
                      .map((a) => `${a.rowId}::${a.seriesId}`)
                  ).size;
                  return (
                    <button
                      key={subj.id}
                      type="button"
                      data-enrolled-paper-pill={subj.id}
                      aria-pressed={active}
                      onClick={() => handleSelectSubject(subj.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors',
                        active
                          ? 'border-primary bg-primary-solid text-on-primary'
                          : 'border-border bg-background text-foreground-muted hover:border-border-hover hover:text-foreground'
                      )}
                    >
                      <span className="font-mono text-[11px] font-bold">
                        {subj.code}
                      </span>
                      <span
                        className={cn(
                          'font-mono text-[10px] tabular-nums',
                          active ? 'opacity-90' : 'text-foreground-subtle'
                        )}
                      >
                        ({loggedCount})
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Optional Save Feedback Toast */}
      {lastXpToast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="paper-xp-toast"
          className="ants-panel-enter flex items-center justify-between gap-3 rounded-lg border border-success-border bg-success-tint px-4 py-2.5 text-xs font-semibold text-on-success-tint"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{lastXpToast}</span>
          </span>
          <button
            type="button"
            onClick={() => setLastXpToast(null)}
            className="font-mono text-[11px] underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Selected Subject Controls, Telemetry & Score Trajectory */}
      <section aria-labelledby="subject-papers-heading" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {embedded && (
                <Link
                  href="/past-papers"
                  className="inline-flex items-center gap-1 font-semibold text-on-primary-tint hover:underline"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open Full Past Papers Hub</span>
                </Link>
              )}
              {!embedded && (
                <>
                  <Link
                    href="/curriculum"
                    className="inline-flex items-center gap-1 font-semibold text-foreground-muted hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Curriculum</span>
                  </Link>
                  <span className="text-foreground-subtle" aria-hidden="true">
                    /
                  </span>
                </>
              )}
              <span className="rounded border border-primary-tint-border bg-primary-tint px-2 py-0.5 font-mono text-[11px] font-bold text-on-primary-tint">
                {currentSubject.code}
              </span>
              <span className="text-foreground-muted">
                {currentSubject.boardLabel}
              </span>
            </div>

            <h2
              id="subject-papers-heading"
              className="mt-1.5 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
            >
              {currentSubject.title}
            </h2>
          </div>

          {/* Right Controls: Subject Dropdown, Matrix/Cards Toggle, Best/Latest Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {!embedded && (
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="paper-subject-select"
                  className="text-xs font-semibold text-foreground-muted"
                >
                  Spec:
                </label>
                <select
                  id="paper-subject-select"
                  data-testid="paper-subject-select"
                  value={currentSubject.id}
                  onChange={(e) => handleSelectSubject(e.target.value)}
                  className="h-9 max-w-[260px] truncate rounded-md border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.boardLabel} — {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cell Display Mode: Best vs Latest */}
            <div
              ref={displayModeTabsRef}
              role="group"
              aria-label="Cell score aggregation mode"
              data-gliding-ready={displayModeIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex rounded-md border border-border bg-surface-card p-1"
            >
              <span
                aria-hidden="true"
                data-animate={displayModeAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded bg-primary-tint"
                style={{
                  transform: `translate3d(${displayModeRect.x}px, ${displayModeRect.y}px, 0)`,
                  width: `${displayModeRect.width}px`,
                  height: `${displayModeRect.height}px`,
                  opacity: displayModeIndicatorReady ? 1 : 0,
                }}
              />
              <button
                type="button"
                data-display-mode="best"
                aria-pressed={state.cellDisplayMode === 'best'}
                data-active={state.cellDisplayMode === 'best' ? 'true' : 'false'}
                onClick={() => handleChangeDisplayMode('best')}
                className={cn(
                  'ants-glide-item relative z-10 rounded px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  state.cellDisplayMode === 'best'
                    ? 'bg-primary-tint text-on-primary-tint'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                Best Score
              </button>
              <button
                type="button"
                data-display-mode="latest"
                aria-pressed={state.cellDisplayMode === 'latest'}
                data-active={state.cellDisplayMode === 'latest' ? 'true' : 'false'}
                onClick={() => handleChangeDisplayMode('latest')}
                className={cn(
                  'ants-glide-item relative z-10 rounded px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  state.cellDisplayMode === 'latest'
                    ? 'bg-primary-tint text-on-primary-tint'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                Latest Sit
              </button>
            </div>

            {/* View Toggle: Matrix vs Cards */}
            <div
              ref={layoutModeTabsRef}
              role="group"
              aria-label="Past paper layout mode"
              data-gliding-ready={layoutModeIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex rounded-md border border-border bg-surface-card p-1"
            >
              <span
                aria-hidden="true"
                data-animate={layoutModeAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded bg-primary-solid shadow-2xs"
                style={{
                  transform: `translate3d(${layoutModeRect.x}px, ${layoutModeRect.y}px, 0)`,
                  width: `${layoutModeRect.width}px`,
                  height: `${layoutModeRect.height}px`,
                  opacity: layoutModeIndicatorReady ? 1 : 0,
                }}
              />
              <button
                type="button"
                data-layout-toggle="matrix"
                aria-pressed={layoutMode === 'matrix'}
                data-active={layoutMode === 'matrix' ? 'true' : 'false'}
                onClick={() => setLayoutMode('matrix')}
                className={cn(
                  'ants-glide-item relative z-10 inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  layoutMode === 'matrix'
                    ? 'bg-primary-solid text-on-primary'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Matrix</span>
              </button>
              <button
                type="button"
                data-layout-toggle="cards"
                aria-pressed={layoutMode === 'cards'}
                data-active={layoutMode === 'cards' ? 'true' : 'false'}
                onClick={() => setLayoutMode('cards')}
                className={cn(
                  'ants-glide-item relative z-10 inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  layoutMode === 'cards'
                    ? 'bg-primary-solid text-on-primary'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hairline Subject Metrics + SVG Chronological Trajectory */}
        <div className="flex flex-col gap-4 border-y border-border py-3.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Matrix Coverage
              </span>
              <span
                data-testid="subject-paper-coverage"
                className="font-mono text-sm font-bold tabular-nums text-foreground"
              >
                {subjectStats.completedCells}/{subjectStats.totalAvailableCells}{' '}
                <span className="font-normal text-foreground-muted">
                  ({subjectStats.coveragePercent}%)
                </span>
              </span>
            </div>

            <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Average Score
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {subjectStats.averagePercent}%{' '}
                <span className="font-normal text-foreground-muted">
                  ({subjectStats.averageUmsOrPum} {subjectStats.umsOrPumLabel})
                </span>
              </span>
            </div>

            <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Peak Grade
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-on-success-tint">
                {subjectStats.bestGrade ?? '—'}{' '}
                <span className="font-normal text-foreground-muted">
                  ({subjectStats.topGradeCellsCount} top sits)
                </span>
              </span>
            </div>

            <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Timed Sits
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {subjectStats.timedAttemptsCount}/{subjectStats.totalAttempts}
              </span>
            </div>
          </div>

          {/* Crisp SVG Chronological Series Trajectory */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-card px-3.5 py-2">
            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
                <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Series Trend</span>
              </span>
              <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-foreground-muted">
                {trendPoints.map((pt) => (
                  <span key={pt.seriesId}>
                    {pt.shortLabel.replace(' ', '')}:{' '}
                    <strong className="text-foreground">
                      {pt.averagePercent !== null ? `${pt.averagePercent}%` : '—'}
                    </strong>
                  </span>
                ))}
              </div>
            </div>

            <svg
              width={sparklineCoords.width}
              height={sparklineCoords.height}
              viewBox={`0 0 ${sparklineCoords.width} ${sparklineCoords.height}`}
              aria-hidden="true"
              className="hidden shrink-0 sm:block"
            >
              <line
                x1={6}
                y1={sparklineCoords.height / 2}
                x2={sparklineCoords.width - 6}
                y2={sparklineCoords.height / 2}
                stroke="var(--border)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {sparklineCoords.activeCoords.length > 1 && (
                <polyline
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={sparklineCoords.polyline}
                />
              )}
              {sparklineCoords.coords.map((c) =>
                c.y !== null ? (
                  <circle
                    key={c.seriesId}
                    cx={c.x}
                    cy={c.y}
                    r="3.2"
                    fill="var(--success)"
                    stroke="var(--surface-card)"
                    strokeWidth="1.5"
                  />
                ) : (
                  <circle
                    key={c.seriesId}
                    cx={c.x}
                    cy={sparklineCoords.height - 6}
                    r="2"
                    fill="var(--border-hover)"
                  />
                )
              )}
            </svg>
          </div>
        </div>
      </section>

      {/* 3. Unit / Variant / Attempt Status Filter Bar */}
      <section aria-label="Past paper filters" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Unit / Component Filter Pills */}
          <div
            ref={unitTabsRef}
            data-gliding-ready={unitIndicatorReady ? 'true' : 'false'}
            className="ants-glide-host relative flex flex-wrap items-center gap-1.5"
          >
            <span
              aria-hidden="true"
              data-animate={unitAnimate ? 'true' : 'false'}
              className="ants-glide-indicator z-0 rounded-md border border-primary bg-primary-solid shadow-xs"
              style={{
                transform: `translate3d(${unitRect.x}px, ${unitRect.y}px, 0)`,
                width: `${unitRect.width}px`,
                height: `${unitRect.height}px`,
                opacity: unitIndicatorReady ? 1 : 0,
              }}
            />
            <button
              type="button"
              data-paper-unit-filter="all"
              aria-pressed={unitFilter === 'all'}
              data-active={unitFilter === 'all' ? 'true' : 'false'}
              onClick={() => setUnitFilter('all')}
              className={cn(
                'ants-glide-item relative z-10 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors active:scale-[0.98]',
                unitFilter === 'all'
                  ? 'border-primary bg-primary-solid text-on-primary'
                  : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
              )}
            >
              All Units
            </button>

            {subjectUnitsWithRows.map((u) => {
              const active = unitFilter === u.code;
              return (
                <button
                  key={u.code}
                  type="button"
                  data-paper-unit-filter={u.code}
                  aria-pressed={active}
                  data-active={active ? 'true' : 'false'}
                  onClick={() => setUnitFilter(u.code)}
                  className={cn(
                    'ants-glide-item relative z-10 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors active:scale-[0.98]',
                    active
                      ? 'border-primary bg-primary-solid text-on-primary'
                      : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                  )}
                >
                  {u.shortCode} ({u.code})
                </button>
              );
            })}
          </div>

          {isMathsSuite && (
            <button
              type="button"
              data-testid="papers-filter-my-cashin"
              aria-pressed={onlyMyCashInUnits}
              onClick={() => {
                setOnlyMyCashInUnits((prev) => !prev);
                setUnitFilter('all');
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors',
                onlyMyCashInUnits
                  ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                  : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
              )}
            >
              <Filter className="h-3 w-3" aria-hidden="true" />
              <span>
                My {activeCashInCode} Units Only ({activeCashInUnits.length})
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Variant Filter Pills (Cambridge V1/V2/V3 or Edexcel IGCSE Standard/Regional) */}
            {variantOptions.length > 0 && (
              <div
                ref={variantTabsRef}
                data-gliding-ready={variantIndicatorReady ? 'true' : 'false'}
                className="ants-glide-host relative flex flex-wrap items-center gap-1"
              >
                <span
                  aria-hidden="true"
                  data-animate={variantAnimate ? 'true' : 'false'}
                  className="ants-glide-indicator z-0 rounded-md border border-primary-tint-border bg-primary-tint"
                  style={{
                    transform: `translate3d(${variantRect.x}px, ${variantRect.y}px, 0)`,
                    width: `${variantRect.width}px`,
                    height: `${variantRect.height}px`,
                    opacity: variantIndicatorReady ? 1 : 0,
                  }}
                />
                {variantOptions.map((opt) => {
                  const active = variantFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-variant-filter={opt.id}
                      aria-pressed={active}
                      data-active={active ? 'true' : 'false'}
                      onClick={() => setVariantFilter(opt.id)}
                      className={cn(
                        'ants-glide-item relative z-10 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                        active
                          ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                          : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Attempt Filter Pills */}
            <div
              ref={attemptTabsRef}
              data-gliding-ready={attemptIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative flex flex-wrap items-center gap-1"
            >
              <span
                aria-hidden="true"
                data-animate={attemptAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded-md border border-primary-tint-border bg-primary-tint"
                style={{
                  transform: `translate3d(${attemptRect.x}px, ${attemptRect.y}px, 0)`,
                  width: `${attemptRect.width}px`,
                  height: `${attemptRect.height}px`,
                  opacity: attemptIndicatorReady ? 1 : 0,
                }}
              />
              {ATTEMPT_FILTERS.map((af) => {
                const active = attemptFilter === af.id;
                return (
                  <button
                    key={af.id}
                    type="button"
                    data-attempt-filter={af.id}
                    aria-pressed={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => setAttemptFilter(af.id)}
                    className={cn(
                      'ants-glide-item relative z-10 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                      active
                        ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {af.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative min-w-[220px] flex-1 sm:w-72 sm:flex-initial">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search paper, topic, or note..."
              aria-label="Search past papers"
              className="h-8 w-full rounded-md border border-border bg-surface-card pl-8 pr-3 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* 4. Matrix or Card View Output */}
      {filteredRows.length === 0 ? (
        <div className="ants-panel-enter rounded-lg border border-border bg-surface-card p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">
            No past papers match your active filters.
          </p>
          <p className="text-xs text-foreground-muted">
            Reset unit, variant, or attempt filters to see the full matrix.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setUnitFilter('all');
              setVariantFilter('all');
              setAttemptFilter('all');
              setSearchQuery('');
              setOnlyMyCashInUnits(false);
            }}
          >
            Reset Matrix Filters
          </Button>
        </div>
      ) : layoutMode === 'matrix' ? (
        <div key="matrix" className="ants-fade-enter">
          <PastPaperMatrixView
            rows={filteredRows}
            seriesList={seriesList}
            attempts={state.attempts}
            boardId={currentSubject.boardId}
            displayMode={state.cellDisplayMode}
            onSelectCell={(row, series) => setModalTarget({ row, series })}
          />
        </div>
      ) : (
        <div key="cards" className="ants-fade-enter">
          <PastPaperCardsView
            rows={filteredRows}
            seriesList={seriesList}
            attempts={state.attempts}
            boardId={currentSubject.boardId}
            displayMode={state.cellDisplayMode}
            onSelectCell={(row, series) => setModalTarget({ row, series })}
          />
        </div>
      )}

      {/* 5. Score Input & Boundary Derivation Modal */}
      <PaperScoreModalView
        open={Boolean(modalTarget)}
        row={modalTarget?.row ?? null}
        series={modalTarget?.series ?? null}
        boardId={currentSubject.boardId}
        subjectTitle={`${currentSubject.code} ${currentSubject.title}`}
        attempts={state.attempts}
        onClose={() => setModalTarget(null)}
        onSaveAttempt={handleSaveAttempt}
        onDeleteAttempt={handleDeleteAttempt}
      />
    </div>
  );

  if (embedded) {
    return workspaceBody;
  }

  return (
    <StudyShellView
      activeRoute="past-papers"
      user={
        user
          ? {
            ...user,
            xp: (user.xp ?? 2840) + state.earnedPaperXp,
          }
          : null
      }
      flowUrl={flowUrl}
      orgUrl={orgUrl}
      queuedNotice={queuedNotice}
      onDismissQueuedNotice={() => setQueuedNotice(null)}
      onQueuedRouteSelect={handleQueuedNav}
    >
      {workspaceBody}
    </StudyShellView>
  );
}
