'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronDown,
  Search,
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
  filterCurriculumSubjects,
  formatMathsSuiteSummary,
  loadStudyCurriculumState,
  saveStudyCurriculumState,
  validateMathsSuiteSelection,
  type CurriculumBoardId,
  type CurriculumBoardMeta,
  type CurriculumSubjectItem,
  type EdexcelMathsCashInCode,
  type EdexcelMathsPathwayPreset,
  type EdexcelMathsUnitCode,
  type StudyCurriculumPersistedState,
  type SubjectFaculty,
} from '../../../lib/study/curriculum';
import {
  CURRICULUM_BOARDS,
  createDefaultStudyCurriculumState,
  MOCK_CURRICULUM_SUBJECTS,
} from '../../../mocks/study-curriculum.mock';
import { StudyShellView, type StudyNavItem } from '../../layout/views/StudyShellView';
import { StudyPastPapersView } from '../../papers/views/StudyPastPapersView';
import { resolveSubjectIdFromParam } from '../../../lib/study/topics';
import { EdexcelMathsSuiteSelectorView } from './EdexcelMathsSuiteSelectorView';
import { StudyTopicTrackerView } from './StudyTopicTrackerView';

export interface StudyCurriculumCatalogViewProps {
  user?: MockUserProfile | null;
  boards?: CurriculumBoardMeta[];
  subjects?: CurriculumSubjectItem[];
  initialState?: StudyCurriculumPersistedState;
  /** Optional initial subject ID to preview topics for (e.g. from `?subject=ial-physics`) */
  initialTopicPreviewSubjectId?: string | null;
  flowUrl?: string;
  orgUrl?: string;
  /** Controlled callbacks for `[THAW-4.1]` / `[THAW-4.2]` wiring */
  onBoardChange?: (boardId: CurriculumBoardId) => void;
  onToggleEnrollSubject?: (subjectId: string, enrolled: boolean) => void;
  onChangeTargetGrade?: (subjectId: string, grade: string) => void;
  onChangeMathsSuite?: (
    cashInCode: EdexcelMathsCashInCode,
    units: EdexcelMathsUnitCode[],
    enrolledCashIns: EdexcelMathsCashInCode[]
  ) => void;
}

const FACULTY_FILTERS: Array<{ id: 'all' | SubjectFaculty; label: string }> = [
  { id: 'all', label: 'All Faculties' },
  { id: 'Mathematics', label: 'Mathematics' },
  { id: 'Sciences', label: 'Sciences' },
  { id: 'Computing & Economics', label: 'Computing & Economics' },
];

const GRADE_OPTIONS_BY_SCALE: Record<'A*-U' | '9-1', string[]> = {
  'A*-U': ['A*', 'A', 'B', 'C'],
  '9-1': ['9', '8', '7', '6'],
};

export function StudyCurriculumCatalogView({
  user = MOCK_AUTHENTICATED_USER,
  boards = CURRICULUM_BOARDS,
  subjects = MOCK_CURRICULUM_SUBJECTS,
  initialState,
  initialTopicPreviewSubjectId = null,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onBoardChange,
  onToggleEnrollSubject,
  onChangeTargetGrade,
  onChangeMathsSuite,
}: StudyCurriculumCatalogViewProps) {
  const defaultState = useMemo(
    () => initialState ?? createDefaultStudyCurriculumState(),
    [initialState]
  );

  const [state, setState] = useState<StudyCurriculumPersistedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [facultyFilter, setFacultyFilter] = useState<'all' | SubjectFaculty>('all');
  const [enrolledOnly, setEnrolledOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inlineMathsWorkbenchOpen, setInlineMathsWorkbenchOpen] = useState(false);
  const [mathsDrawerOpen, setMathsDrawerOpen] = useState(false);
  const [previewSubjectId, setPreviewSubjectId] = useState<string | null>(
    initialTopicPreviewSubjectId
  );
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'catalog' | 'topics' | 'papers'>(
    'catalog'
  );
  const [activeTopicSubjectId, setActiveTopicSubjectId] =
    useState<string>('ial-maths-suite');
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);

  const boardTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, state.activeBoard, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const boardIndicatorReady = boardReady && boardRect.visible;

  const facultyTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: facultyRect,
    ready: facultyReady,
    animate: facultyAnimate,
  } = useSlidingIndicator(facultyTabsRef, facultyFilter, {
    activeSelector: '[aria-pressed="true"]',
  });
  const facultyIndicatorReady = facultyReady && facultyRect.visible;

  useEffect(() => {
    const loaded = loadStudyCurriculumState(defaultState);

    // Check URL query parameters (?board=...&subject=...&tab=topics|papers) on client mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const boardParam = params.get('board') as CurriculumBoardId | null;
      const subjectParam = params.get('subject');
      const tabParam = params.get('tab');

      if (tabParam === 'topics' || tabParam === 'papers') {
        setActiveWorkspaceTab(tabParam);
        if (subjectParam) {
          setActiveTopicSubjectId(resolveSubjectIdFromParam(subjectParam, subjects));
        }
      } else if (subjectParam) {
        const resolvedId = resolveSubjectIdFromParam(subjectParam, subjects);
        const matchedSubject = subjects.find((s) => s.id === resolvedId);
        if (matchedSubject) {
          loaded.activeBoard = matchedSubject.boardId;
          setPreviewSubjectId(matchedSubject.id);
          setActiveTopicSubjectId(matchedSubject.id);
        }
      } else if (boardParam && boards.some((b) => b.id === boardParam)) {
        loaded.activeBoard = boardParam;
      }
    }

    setState(loaded);
    setHydrated(true);
  }, [boards, defaultState, subjects]);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyCurriculumState(state);
  }, [hydrated, state]);

  const activeBoardMeta =
    boards.find((b) => b.id === state.activeBoard) ??
    boards[0] ??
    CURRICULUM_BOARDS[0]!;

  const filteredSubjects = useMemo(
    () =>
      filterCurriculumSubjects(subjects, {
        boardId: state.activeBoard,
        faculty: facultyFilter,
        enrolledOnly,
        enrolledIds: state.enrolledSubjectIds,
        searchQuery,
      }),
    [
      enrolledOnly,
      facultyFilter,
      searchQuery,
      state.activeBoard,
      state.enrolledSubjectIds,
      subjects,
    ]
  );

  const activeMathsUnits =
    state.mathsUnitsByCashIn[state.activeMathsCashIn] ??
    state.mathsUnitsByCashIn.YMA01;

  const mathsValidation = useMemo(
    () =>
      validateMathsSuiteSelection(
        state.activeMathsCashIn,
        activeMathsUnits,
        state.activeMathsCashIn === 'XFM01' || state.activeMathsCashIn === 'YFM01'
          ? state.mathsUnitsByCashIn.YMA01
          : []
      ),
    [activeMathsUnits, state.activeMathsCashIn, state.mathsUnitsByCashIn.YMA01]
  );

  const mathsSuiteSummary = useMemo(
    () =>
      formatMathsSuiteSummary(
        state.activeMathsCashIn,
        activeMathsUnits,
        state.enrolledMathsCashIns
      ),
    [activeMathsUnits, state.activeMathsCashIn, state.enrolledMathsCashIns]
  );

  const boardSubjectsCount = useMemo(
    () => subjects.filter((s) => s.boardId === state.activeBoard).length,
    [state.activeBoard, subjects]
  );

  const enrolledInBoardCount = useMemo(
    () =>
      subjects.filter(
        (s) =>
          s.boardId === state.activeBoard && state.enrolledSubjectIds.includes(s.id)
      ).length,
    [state.activeBoard, state.enrolledSubjectIds, subjects]
  );

  const previewSubject = useMemo(
    () => subjects.find((s) => s.id === previewSubjectId) ?? null,
    [previewSubjectId, subjects]
  );

  const handleSelectBoard = (boardId: CurriculumBoardId) => {
    setState((prev) => ({ ...prev, activeBoard: boardId }));
    onBoardChange?.(boardId);
  };

  const handleToggleEnroll = (subjectId: string) => {
    setState((prev) => {
      const exists = prev.enrolledSubjectIds.includes(subjectId);
      const nextIds = exists
        ? prev.enrolledSubjectIds.filter((id) => id !== subjectId)
        : [...prev.enrolledSubjectIds, subjectId];
      onToggleEnrollSubject?.(subjectId, !exists);
      return {
        ...prev,
        enrolledSubjectIds: nextIds,
      };
    });
  };

  const handleSelectTargetGrade = (subjectId: string, grade: string) => {
    setState((prev) => ({
      ...prev,
      targetGradeBySubjectId: {
        ...prev.targetGradeBySubjectId,
        [subjectId]: grade,
      },
    }));
    onChangeTargetGrade?.(subjectId, grade);
  };

  const handleChangeActiveCashIn = (cashInCode: EdexcelMathsCashInCode) => {
    setState((prev) => ({
      ...prev,
      activeMathsCashIn: cashInCode,
    }));
  };

  const handleToggleEnrolledCashIn = (cashInCode: EdexcelMathsCashInCode) => {
    setState((prev) => {
      const exists = prev.enrolledMathsCashIns.includes(cashInCode);
      const nextCashIns: EdexcelMathsCashInCode[] = exists
        ? prev.enrolledMathsCashIns.length > 1
          ? prev.enrolledMathsCashIns.filter((c) => c !== cashInCode)
          : prev.enrolledMathsCashIns
        : [...prev.enrolledMathsCashIns, cashInCode];
      onChangeMathsSuite?.(
        prev.activeMathsCashIn,
        prev.mathsUnitsByCashIn[prev.activeMathsCashIn],
        nextCashIns
      );
      return {
        ...prev,
        enrolledMathsCashIns: nextCashIns,
      };
    });
  };

  const handleChangeUnitsForCashIn = (
    cashInCode: EdexcelMathsCashInCode,
    units: EdexcelMathsUnitCode[]
  ) => {
    setState((prev) => {
      const nextMap = {
        ...prev.mathsUnitsByCashIn,
        [cashInCode]: units,
      };
      onChangeMathsSuite?.(cashInCode, units, prev.enrolledMathsCashIns);
      return {
        ...prev,
        mathsUnitsByCashIn: nextMap,
      };
    });
  };

  const handleApplyPreset = (preset: EdexcelMathsPathwayPreset) => {
    setState((prev) => {
      const nextEnrolled = prev.enrolledMathsCashIns.includes(preset.cashInCode)
        ? prev.enrolledMathsCashIns
        : [...prev.enrolledMathsCashIns, preset.cashInCode];
      const nextMap = {
        ...prev.mathsUnitsByCashIn,
        [preset.cashInCode]: preset.units,
      };
      onChangeMathsSuite?.(preset.cashInCode, preset.units, nextEnrolled);
      return {
        ...prev,
        activeMathsCashIn: preset.cashInCode,
        enrolledMathsCashIns: nextEnrolled,
        mathsUnitsByCashIn: nextMap,
      };
    });
  };

  const handleQueuedNav = (item: StudyNavItem) => {
    setQueuedNotice(
      `${item.label} (${item.href}) is queued for Stage ${item.stageTag ?? 'Z4'}. Dashboard (/), Curriculum (/curriculum), Past Papers (/past-papers), and Grade Calculator (/calculator) are live now.`
    );
  };

  return (
    <StudyShellView
      activeRoute="curriculum"
      user={user}
      flowUrl={flowUrl}
      orgUrl={orgUrl}
      queuedNotice={queuedNotice}
      onDismissQueuedNotice={() => setQueuedNotice(null)}
      onQueuedRouteSelect={handleQueuedNav}
    >
      {activeWorkspaceTab === 'topics' || activeWorkspaceTab === 'papers' ? (
        <div key={activeWorkspaceTab} className="ants-fade-enter space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <span className="font-mono text-xs text-foreground-muted">
              {activeWorkspaceTab === 'papers'
                ? 'Inline Past Paper Matrix Mode (?tab=papers)'
                : 'Inline Topic Tracker Mode (?tab=topics)'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveWorkspaceTab(
                    activeWorkspaceTab === 'papers' ? 'topics' : 'papers'
                  )
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-tint-border bg-primary-tint px-3 text-xs font-semibold text-on-primary-tint hover:opacity-90"
              >
                <span>
                  {activeWorkspaceTab === 'papers'
                    ? 'Switch to Topic Tracker'
                    : 'Switch to Past Paper Matrix'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveWorkspaceTab('catalog')}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-card px-3 text-xs font-semibold text-foreground hover:border-border-hover"
              >
                <span>Switch to Catalog &amp; WMA11-SET Builder</span>
              </button>
            </div>
          </div>
          {activeWorkspaceTab === 'papers' ? (
            <StudyPastPapersView
              embedded={true}
              initialSubjectId={activeTopicSubjectId}
            />
          ) : (
            <StudyTopicTrackerView
              embedded={true}
              initialSubjectId={activeTopicSubjectId}
            />
          )}
        </div>
      ) : (
        <>
          {/* 1. Page Header & 4-Board Switcher */}
          <section aria-labelledby="curriculum-catalog-heading" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1
                  id="curriculum-catalog-heading"
                  className="ants-workspace-enter text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                >
                  Curriculum &amp; Modular Specifications
                </h1>
              </div>

              <div
                ref={boardTabsRef}
                role="tablist"
                aria-label="Curriculum Examination Boards"
                data-gliding-ready={boardIndicatorReady ? 'true' : 'false'}
                className="ants-glide-host relative inline-flex flex-wrap rounded-md border border-border bg-surface-card p-1"
              >
                <span
                  aria-hidden="true"
                  data-animate={boardAnimate ? 'true' : 'false'}
                  className="ants-glide-indicator z-0 rounded bg-primary-solid shadow-2xs"
                  style={{
                    transform: `translate3d(${boardRect.x}px, ${boardRect.y}px, 0)`,
                    width: `${boardRect.width}px`,
                    height: `${boardRect.height}px`,
                    opacity: boardIndicatorReady ? 1 : 0,
                  }}
                />
                {boards.map((board) => {
                  const selected = board.id === state.activeBoard;
                  return (
                    <button
                      key={board.id}
                      type="button"
                      role="tab"
                      data-board-tab={board.id}
                      data-active={selected ? 'true' : 'false'}
                      aria-selected={selected}
                      onClick={() => handleSelectBoard(board.id)}
                      className={cn(
                        'ants-glide-item relative z-10 whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                        selected
                          ? 'bg-primary-solid text-on-primary shadow-2xs'
                          : 'text-foreground-muted hover:text-foreground'
                      )}
                    >
                      {board.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Single-Row Academic Telemetry Strip */}
            <div className="flex flex-col gap-3 border-y border-border py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Active Board
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {activeBoardMeta.shortLabel}{' '}
                    <span className="font-normal text-foreground-muted">
                      ({enrolledInBoardCount}/{boardSubjectsCount} enrolled)
                    </span>
                  </span>
                </div>

                <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Total Enrolled
                  </span>
                  <span
                    data-testid="curriculum-enrolled-count"
                    className="font-mono text-sm font-bold tabular-nums text-foreground"
                  >
                    {state.enrolledSubjectIds.length} subjects
                  </span>
                </div>

                <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                    WMA11-SET Cash-In
                  </span>
                  <span
                    data-testid="curriculum-maths-summary"
                    className="font-mono text-xs font-semibold tabular-nums text-foreground"
                  >
                    {mathsSuiteSummary}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={mathsValidation.isValid ? 'verified' : 'active-filter'} mono>
                  {mathsValidation.isValid
                    ? `${state.activeMathsCashIn} Valid (${mathsValidation.totalUms} UMS)`
                    : `${state.activeMathsCashIn} Incomplete`}
                </Badge>
                <button
                  type="button"
                  onClick={() => setMathsDrawerOpen(true)}
                  className="inline-flex h-8 items-center rounded-md border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground hover:border-border-hover hover:bg-surface-inset"
                >
                  <span>14-Unit Drawer</span>
                </button>
              </div>
            </div>
          </section>

          {/* 2. Edexcel IAL Modular Mathematics Suite (`WMA11-SET`) Spotlight Workbench */}
          {state.activeBoard === 'edexcel-ial' && (
            <section
              aria-labelledby="wma11-suite-heading"
              className="mt-6 border-b border-border pb-6 space-y-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint border border-primary-tint-border">
                    WMA11-SET
                  </span>
                  <h2
                    id="wma11-suite-heading"
                    className="text-base font-bold tracking-tight text-foreground sm:text-lg"
                  >
                    Edexcel IAL Modular Mathematics Suite (14 Units · 4 Cash-In Awards)
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInlineMathsWorkbenchOpen((prev) => !prev)}
                    aria-expanded={inlineMathsWorkbenchOpen}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
                  >
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        inlineMathsWorkbenchOpen && 'rotate-180'
                      )}
                      aria-hidden="true"
                    />
                    <span>
                      {inlineMathsWorkbenchOpen
                        ? 'Collapse Workbench'
                        : 'Expand 14-Unit Workbench'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMathsDrawerOpen(true)}
                    className="inline-flex h-8 items-center rounded-md bg-primary-solid px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover"
                  >
                    <span>Open Slide-Over Selector</span>
                  </button>
                </div>
              </div>

          <div
            className="ants-accordion"
            data-open={inlineMathsWorkbenchOpen ? 'true' : 'false'}
            aria-hidden={!inlineMathsWorkbenchOpen}
          >
            <div className="ants-accordion-inner">
              <EdexcelMathsSuiteSelectorView
                activeCashIn={state.activeMathsCashIn}
                enrolledCashIns={state.enrolledMathsCashIns}
                unitsByCashIn={state.mathsUnitsByCashIn}
                embedded={true}
                onChangeActiveCashIn={handleChangeActiveCashIn}
                onToggleEnrolledCashIn={handleToggleEnrolledCashIn}
                onChangeUnitsForCashIn={handleChangeUnitsForCashIn}
                onApplyPreset={handleApplyPreset}
              />
            </div>
          </div>
        </section>
      )}

      {/* 3. Catalog Filter Bar & 2-Column Subject Grid */}
      <section aria-labelledby="subject-catalog-heading" className="mt-7 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2
              id="subject-catalog-heading"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              {activeBoardMeta.label} Specifications
            </h2>
            <p className="text-xs text-foreground-muted">
              {activeBoardMeta.qualificationLevel} · Grading scale:{' '}
              <span className="font-mono font-semibold text-foreground">
                {activeBoardMeta.gradingScaleLabel}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Faculty Filter Pills */}
            <div
              ref={facultyTabsRef}
              data-gliding-ready={facultyIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative flex flex-wrap items-center gap-1"
            >
              <span
                aria-hidden="true"
                data-animate={facultyAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded-md border border-primary-tint-border bg-primary-tint"
                style={{
                  transform: `translate3d(${facultyRect.x}px, ${facultyRect.y}px, 0)`,
                  width: `${facultyRect.width}px`,
                  height: `${facultyRect.height}px`,
                  opacity: facultyIndicatorReady ? 1 : 0,
                }}
              />
              {FACULTY_FILTERS.map((fac) => {
                const active = facultyFilter === fac.id;
                return (
                  <button
                    key={fac.id}
                    type="button"
                    aria-pressed={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => setFacultyFilter(fac.id)}
                    className={cn(
                      'ants-glide-item relative z-10 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98]',
                      active
                        ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {fac.label}
                  </button>
                );
              })}
            </div>

            {/* Enrolled Only Toggle */}
            <button
              type="button"
              aria-pressed={enrolledOnly}
              onClick={() => setEnrolledOnly((prev) => !prev)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                enrolledOnly
                  ? 'border-primary bg-primary-solid text-on-primary'
                  : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
              )}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Enrolled Only</span>
            </button>

            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, WMA11, 9709..."
                aria-label="Search curriculum specifications"
                className="h-8 w-full rounded-md border border-border bg-surface-card pl-8 pr-3 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Subject Cards Grid */}
        {filteredSubjects.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-card p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">
              No specifications match your current filter.
            </p>
            <p className="text-xs text-foreground-muted">
              Try clearing the search query or switching examination boards above.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFacultyFilter('all');
                setEnrolledOnly(false);
                setSearchQuery('');
              }}
            >
              Reset Catalog Filters
            </Button>
          </div>
        ) : (
          <div key={state.activeBoard} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredSubjects.map((subject, idx) => {
              const isEnrolled = state.enrolledSubjectIds.includes(subject.id);
              const targetGrade =
                state.targetGradeBySubjectId[subject.id] ?? subject.defaultTargetGrade;
              const gradeOptions = GRADE_OPTIONS_BY_SCALE[subject.gradingScale];
              const isMathsSuite = subject.subjectType === 'modular_maths_suite';

              return (
                <article
                  key={subject.id}
                  data-catalog-subject={subject.id}
                  style={{ '--stagger-index': Math.min(idx, 8) } as React.CSSProperties}
                  className="ants-stagger-item ants-card-interactive flex flex-col justify-between rounded-lg border border-border bg-surface-card p-5 divide-y divide-border-subtle hover:border-border-hover"
                >
                  {/* Top Metadata + Target Grade Selector */}
                  <div className="pb-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint border border-primary-tint-border">
                          {subject.code}
                        </span>
                        <span className="text-xs font-medium text-foreground-muted">
                          {subject.faculty}
                        </span>
                        {isMathsSuite && (
                          <Badge variant="editorial">14-Unit Modular Suite</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="text-foreground-muted">Target:</span>
                        <div
                          role="group"
                          aria-label={`Target grade for ${subject.title}`}
                          className="inline-flex rounded border border-border bg-background p-0.5"
                        >
                          {gradeOptions.map((grade) => {
                            const activeGrade = targetGrade === grade;
                            return (
                              <button
                                key={grade}
                                type="button"
                                onClick={() => handleSelectTargetGrade(subject.id, grade)}
                                aria-pressed={activeGrade}
                                className={cn(
                                  'rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors',
                                  activeGrade
                                    ? 'bg-primary-solid text-on-primary'
                                    : 'text-foreground-muted hover:text-foreground'
                                )}
                              >
                                {grade}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {subject.title}
                      </h3>
                    </div>
                  </div>

                  {/* Middle: Paper / Modular Unit Breakdown */}
                  <div className="py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums text-foreground-muted">
                      <span>
                        {isMathsSuite
                          ? mathsSuiteSummary
                          : `${subject.paperCount} papers · ${subject.topicCount} syllabus topics`}
                      </span>
                      <span>
                        {subject.totalUms
                          ? `${subject.totalUms} UMS max`
                          : `${subject.totalRawMarks} raw marks`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {subject.units.slice(0, 8).map((unit) => {
                        const isSelectedInSuite =
                          isMathsSuite &&
                          activeMathsUnits.includes(unit.code as EdexcelMathsUnitCode);
                        return (
                          <span
                            key={unit.code}
                            title={`${unit.code}: ${unit.title} (${unit.durationMinutes} min)`}
                            className={cn(
                              'inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded border',
                              isMathsSuite && isSelectedInSuite
                                ? 'border-primary-tint-border bg-primary-tint font-bold text-on-primary-tint'
                                : 'border-border bg-surface-inset text-foreground-muted'
                            )}
                          >
                            <strong className="text-foreground">{unit.shortCode}</strong>
                            <span>({unit.code})</span>
                          </span>
                        );
                      })}
                      {subject.units.length > 8 && (
                        <button
                          type="button"
                          onClick={() => setMathsDrawerOpen(true)}
                          className="font-mono text-[11px] font-semibold text-on-primary-tint hover:underline px-1.5 py-0.5"
                        >
                          +{subject.units.length - 8} more units
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="pt-3.5 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      data-enroll-btn={subject.id}
                      aria-pressed={isEnrolled}
                      onClick={() => handleToggleEnroll(subject.id)}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isEnrolled
                          ? 'border-success-border bg-success-tint text-on-success-tint'
                          : 'border-border bg-background text-foreground-muted hover:border-border-hover hover:text-foreground'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{isEnrolled ? 'Enrolled in Workspace' : 'Enroll Subject'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {isMathsSuite && (
                        <button
                          type="button"
                          onClick={() => setMathsDrawerOpen(true)}
                          className="inline-flex h-8 items-center rounded-md border border-primary-tint-border bg-primary-tint px-2.5 text-xs font-semibold text-on-primary-tint hover:opacity-90"
                        >
                          <span>14-Unit Selector</span>
                        </button>
                      )}

                      <button
                        type="button"
                        data-preview-topics-btn={subject.id}
                        onClick={() => setPreviewSubjectId(subject.id)}
                        className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-border-hover hover:bg-surface-inset"
                      >
                        <span>Preview</span>
                      </button>

                      <Link
                        href={`/curriculum/${subject.id}?tab=papers`}
                        data-open-past-papers-link={subject.id}
                        className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-border-hover hover:bg-surface-inset"
                      >
                        <span>Papers</span>
                      </Link>

                      <Link
                        href={`/curriculum/${subject.id}?tab=topics`}
                        data-open-topic-tracker-link={subject.id}
                        className="inline-flex h-8 items-center rounded-md bg-primary-solid px-2.5 text-xs font-semibold text-on-primary hover:bg-primary-hover"
                      >
                        <span>Topic Tracker ({subject.topicCount})</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Slide-Over Drawer for `WMA11-SET` 14-Unit Selector */}
      <EdexcelMathsSuiteSelectorView
        activeCashIn={state.activeMathsCashIn}
        enrolledCashIns={state.enrolledMathsCashIns}
        unitsByCashIn={state.mathsUnitsByCashIn}
        embedded={false}
        open={mathsDrawerOpen}
        onClose={() => setMathsDrawerOpen(false)}
        onChangeActiveCashIn={handleChangeActiveCashIn}
        onToggleEnrolledCashIn={handleToggleEnrolledCashIn}
        onChangeUnitsForCashIn={handleChangeUnitsForCashIn}
        onApplyPreset={handleApplyPreset}
      />

      {/* 5. Slide-Over Drawer for Syllabus Topic Preview (`[ZYY-4.3]` bridge) */}
      {previewSubject && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`${previewSubject.title} syllabus topics preview`}
        >
          <div
            className="ants-modal-backdrop-in fixed inset-0 bg-black/55 backdrop-blur-xs"
            onClick={() => setPreviewSubjectId(null)}
            aria-hidden="true"
          />
          <aside className="ants-drawer-right-in relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-border-hover bg-surface-elevated text-foreground shadow-[var(--shadow-tier-3)]">
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint border border-primary-tint-border">
                    {previewSubject.code}
                  </span>
                  <span className="text-xs font-medium text-foreground-muted">
                    {previewSubject.boardLabel}
                  </span>
                </div>
                <h2 className="mt-1 text-base font-bold text-foreground">
                  {previewSubject.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPreviewSubjectId(null)}
                aria-label="Close topic preview drawer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Examination Units &amp; Components ({previewSubject.units.length})
                </h3>
                <div className="divide-y divide-border border-y border-border">
                  {previewSubject.units.map((u) => (
                    <div
                      key={u.code}
                      className="flex items-center justify-between gap-3 py-2.5 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-foreground">
                          {u.code} ({u.shortCode})
                        </span>{' '}
                        <span className="text-foreground-muted">— {u.title}</span>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-foreground-muted shrink-0">
                        {u.maxUms ? `${u.maxUms} UMS` : `${u.maxRaw}m`} · {u.durationMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Syllabus Topic Preview ({previewSubject.topicCount} total)
                  </h3>
                  <span className="font-mono text-[11px] text-foreground-muted">
                    Interactive Topic Matrix Available
                  </span>
                </div>

                <div className="divide-y divide-border border-y border-border">
                  {previewSubject.sampleTopics.map((topic) => (
                    <div
                      key={topic.code}
                      className="flex items-center justify-between gap-3 py-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-foreground-muted">
                          <strong className="text-foreground">{topic.code}</strong>
                          <span>·</span>
                          <span>{topic.unitCode}</span>
                          <span>·</span>
                          <span>{topic.subtopicCount} subtopics</span>
                        </div>
                        <p className="font-semibold text-foreground">{topic.title}</p>
                      </div>

                      <Badge
                        variant={
                          topic.status === 'mastered'
                            ? 'verified'
                            : topic.status === 'in_progress'
                              ? 'active-filter'
                              : 'editorial'
                        }
                        mono
                      >
                        {topic.status === 'mastered'
                          ? 'Mastered'
                          : topic.status === 'in_progress'
                            ? 'In Progress'
                            : 'Queued'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-inset px-6 py-3.5">
              <span className="font-mono text-xs text-foreground-muted">
                Window: {previewSubject.examSessionWindow}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewSubjectId(null)}
                >
                  Close
                </Button>
                <Link
                  href={`/curriculum/${previewSubject.id}?tab=topics`}
                  className="inline-flex h-8 items-center rounded-md bg-primary-solid px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover"
                >
                  <span>Open Full Topic Tracker</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      )}
        </>
      )}
    </StudyShellView>
  );
}
