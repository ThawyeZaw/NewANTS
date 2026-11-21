'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpenCheck,
  Calculator,
  CalendarClock,
  Check,
  ExternalLink,
  Flame,
  Pin,
  RefreshCw,
} from 'lucide-react';
import {
  Badge,
  MOCK_AUTHENTICATED_USER,
  cn,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  computeBoardSummary,
  computeCurrentXp,
  computeDaysRemaining,
  computeMasteryPercent,
  getCountdownUrgency,
  loadStudyDashboardState,
  REVISION_CHECKIN_XP,
  saveStudyDashboardState,
  setSidebarCollapsed,
  setStudyBoard,
  toggleExamFlowSync,
  toggleExamPinned,
  toggleSubjectReviewedToday,
  type EnrolledSubjectSummary,
  type RecentStudyActivityItem,
  type StudyBoardPresetId,
  type StudyBoardTab,
  type StudyDashboardPersistedState,
  type StudyExamCountdownItem,
} from '../../../lib/study/dashboard';
import {
  createDefaultStudyDashboardState,
  DEFAULT_STUDY_REFERENCE_DATE,
  MOCK_RECENT_STUDY_ACTIVITY,
  MOCK_STUDY_COUNTDOWNS,
  MOCK_STUDY_SUBJECTS_BY_BOARD,
  STUDY_BOARD_TABS,
} from '../../../mocks/study-dashboard.mock';
import {
  formatMathsSuiteSummary,
  loadStudyCurriculumState,
} from '../../../lib/study/curriculum';
import { createDefaultStudyCurriculumState } from '../../../mocks/study-curriculum.mock';
import { loadStudyPapersState } from '../../../lib/study/papers';
import { createDefaultStudyPapersState } from '../../../mocks/study-papers.mock';
import { loadStudyLearningState } from '../../../lib/study/learning';
import { createDefaultStudyLearningState } from '../../../mocks/study-learning.mock';
import { loadStudyCountdownsState } from '../../../lib/study/countdown-leaderboard';
import { createDefaultStudyCountdownsState } from '../../../mocks/study-countdown-leaderboard.mock';
import { StudyShellView, type StudyNavItem } from '../../layout/views/StudyShellView';

export interface StudyDashboardViewProps {
  user?: MockUserProfile | null;
  boardTabs?: StudyBoardTab[];
  subjectsByBoard?: Record<StudyBoardPresetId, EnrolledSubjectSummary[]>;
  countdowns?: StudyExamCountdownItem[];
  recentActivity?: RecentStudyActivityItem[];
  referenceDateIso?: string;
  initialState?: StudyDashboardPersistedState;
  flowUrl?: string;
  orgUrl?: string;
  /** Controlled overrides for full-stack `[THAW-4.5]` integration */
  activeBoard?: StudyBoardPresetId;
  onBoardChange?: (boardId: StudyBoardPresetId) => void;
  onToggleSubjectCheckIn?: (boardId: StudyBoardPresetId, subjectId: string) => void;
  onToggleExamPin?: (examId: string) => void;
  onToggleExamFlowSync?: (examId: string) => void;
  onOpenTopicTracker?: (subject: EnrolledSubjectSummary) => void;
}

export function StudyDashboardView({
  user = MOCK_AUTHENTICATED_USER,
  boardTabs = STUDY_BOARD_TABS,
  subjectsByBoard = MOCK_STUDY_SUBJECTS_BY_BOARD,
  countdowns = MOCK_STUDY_COUNTDOWNS,
  recentActivity = MOCK_RECENT_STUDY_ACTIVITY,
  referenceDateIso = DEFAULT_STUDY_REFERENCE_DATE,
  initialState,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  activeBoard: controlledBoard,
  onBoardChange,
  onToggleSubjectCheckIn,
  onToggleExamPin,
  onToggleExamFlowSync,
  onOpenTopicTracker,
}: StudyDashboardViewProps) {
  const defaultState = useMemo(
    () => initialState ?? createDefaultStudyDashboardState(),
    [initialState]
  );

  const [state, setState] = useState<StudyDashboardPersistedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [showAllCountdowns, setShowAllCountdowns] = useState(false);
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);
  const [customMathsSummary, setCustomMathsSummary] = useState<string | null>(null);
  const [customTargetGrades, setCustomTargetGrades] = useState<Record<string, string>>({});
  const [extraPaperXp, setExtraPaperXp] = useState<number>(0);
  const [extraLearningXp, setExtraLearningXp] = useState<number>(0);
  const [customCountdowns, setCustomCountdowns] = useState<StudyExamCountdownItem[]>([]);

  useEffect(() => {
    const loaded = loadStudyDashboardState(defaultState);
    setState(loaded);
    const curriculumState = loadStudyCurriculumState(createDefaultStudyCurriculumState());
    const activeUnits =
      curriculumState.mathsUnitsByCashIn[curriculumState.activeMathsCashIn] ??
      curriculumState.mathsUnitsByCashIn.YMA01;
    setCustomMathsSummary(
      formatMathsSuiteSummary(
        curriculumState.activeMathsCashIn,
        activeUnits,
        curriculumState.enrolledMathsCashIns
      )
    );
    setCustomTargetGrades(curriculumState.targetGradeBySubjectId);
    const defaultPapers = createDefaultStudyPapersState();
    const loadedPapers = loadStudyPapersState(defaultPapers);
    setExtraPaperXp(Math.max(0, loadedPapers.earnedPaperXp - defaultPapers.earnedPaperXp));
    const defaultLearning = createDefaultStudyLearningState();
    const loadedLearning = loadStudyLearningState(defaultLearning);
    setExtraLearningXp(
      Math.max(0, loadedLearning.earnedLearningXp - defaultLearning.earnedLearningXp)
    );
    const loadedCountdowns = loadStudyCountdownsState(createDefaultStudyCountdownsState());
    setCustomCountdowns(loadedCountdowns.customCountdowns);
    setHydrated(true);
  }, [defaultState]);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyDashboardState(state);
  }, [hydrated, state]);

  const activeBoard = controlledBoard ?? state.activeBoard;
  const activeBoardMeta =
    boardTabs.find((tab) => tab.id === activeBoard) ?? boardTabs[0];

  const boardTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, activeBoard, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const boardIndicatorReady = boardReady && boardRect.visible;

  const subjects = subjectsByBoard[activeBoard] ?? [];
  const reviewedIds = state.reviewedSubjectIdsByBoard[activeBoard] ?? [];
  const boardSummary = useMemo(
    () => computeBoardSummary(subjects, reviewedIds),
    [subjects, reviewedIds]
  );

  const baseXp = user?.xp ?? 2840;
  const streakDays = user?.streakDays ?? 14;
  const currentXp = computeCurrentXp(baseXp, state.xpBonus + extraPaperXp + extraLearningXp);

  const boardCountdowns = useMemo(() => {
    const mergedById = new Map<string, StudyExamCountdownItem>();
    for (const item of countdowns) mergedById.set(item.id, item);
    for (const item of customCountdowns) mergedById.set(item.id, item);

    return Array.from(mergedById.values())
      .filter((item) => item.boardId === activeBoard)
      .map((item) => ({
        ...item,
        daysLeft: computeDaysRemaining(item.examDateIso, referenceDateIso),
        pinned: state.pinnedExamIds.includes(item.id),
        syncedToFlow: state.flowSyncedExamIds.includes(item.id),
      }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [
    activeBoard,
    countdowns,
    customCountdowns,
    referenceDateIso,
    state.flowSyncedExamIds,
    state.pinnedExamIds,
  ]);

  const visibleCountdowns = showAllCountdowns
    ? boardCountdowns
    : boardCountdowns.filter((item) => item.pinned);

  const pinnedCount = boardCountdowns.filter((item) => item.pinned).length;
  const syncedToFlowCount = boardCountdowns.filter((item) => item.syncedToFlow).length;

  const boardActivity = useMemo(
    () => recentActivity.filter((item) => item.boardId === activeBoard),
    [activeBoard, recentActivity]
  );

  const handleSelectBoard = (boardId: StudyBoardPresetId) => {
    setState((prev) => setStudyBoard(prev, boardId));
    onBoardChange?.(boardId);
  };

  const handleCheckInToggle = (subjectId: string) => {
    setState((prev) => toggleSubjectReviewedToday(prev, activeBoard, subjectId));
    onToggleSubjectCheckIn?.(activeBoard, subjectId);
  };

  const handlePinToggle = (examId: string) => {
    setState((prev) => toggleExamPinned(prev, examId));
    onToggleExamPin?.(examId);
  };

  const handleFlowSyncToggle = (examId: string) => {
    setState((prev) => toggleExamFlowSync(prev, examId));
    onToggleExamFlowSync?.(examId);
  };

  const handleToggleCollapse = () => {
    setState((prev) => setSidebarCollapsed(prev, !prev.sidebarCollapsed));
  };

  const handleQueuedNav = (item: StudyNavItem) => {
    setQueuedNotice(
      `${item.label} (${item.href}) is queued next in Stage ${item.stageTag ?? 'Z4'}. Dashboard (/), Curriculum (/curriculum), Past Papers (/past-papers), and Grade Calculator (/calculator) are live now.`
    );
  };

  return (
    <StudyShellView
      activeRoute="dashboard"
      sidebarCollapsed={state.sidebarCollapsed}
      onToggleSidebarCollapse={handleToggleCollapse}
      user={user ? { ...user, xp: currentXp, streakDays } : null}
      flowUrl={flowUrl}
      orgUrl={orgUrl}
      queuedNotice={queuedNotice}
      onDismissQueuedNotice={() => setQueuedNotice(null)}
      onQueuedRouteSelect={handleQueuedNav}
    >
      {/* Workspace Header & Board Switcher */}
      <section aria-labelledby="study-dashboard-title" className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1
              id="study-dashboard-title"
              className="ants-workspace-enter text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Academic Workspace
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-foreground-muted">
              Track syllabus mastery, logged past papers, and exam deadlines for{' '}
              <span className="font-semibold text-foreground">{activeBoardMeta?.label}</span>.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:flex-nowrap">
            <div
              ref={boardTabsRef}
              role="tablist"
              aria-label="Exam board preset"
              data-gliding-ready={boardIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex rounded-md border border-border bg-surface-card p-1"
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
              {boardTabs.map((tab) => {
                const selected = tab.id === activeBoard;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    data-active={selected ? 'true' : 'false'}
                    onClick={() => handleSelectBoard(tab.id)}
                    className={cn(
                      'ants-glide-item relative z-10 whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                      selected
                        ? 'bg-primary-solid text-on-primary shadow-2xs'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {tab.shortLabel}
                  </button>
                );
              })}
            </div>

            <Link
              href="/calculator"
              className="inline-flex h-9 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Calculator className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Grade Calculator</span>
            </Link>
          </div>
        </div>

        {/* Restrained Single-Row Academic Telemetry Strip */}
        <div className="flex flex-col gap-3 border-y border-border py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Streak
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {streakDays} days
                </span>
              </div>
            </div>

            <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Scholar XP
              </span>
              <span
                data-testid="study-xp-value"
                className="font-mono text-sm font-bold tabular-nums text-foreground"
              >
                {currentXp.toLocaleString()} XP
              </span>
            </div>

            <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Syllabus Mastery
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {boardSummary.overallPercent}%{' '}
                <span className="font-normal text-foreground-muted">
                  ({boardSummary.masteredTopics}/{boardSummary.totalTopics})
                </span>
              </span>
            </div>

            <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                Papers Logged
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                {boardSummary.totalPapers}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground-muted">
              Today check-in:{' '}
              <span className="text-foreground">
                {boardSummary.reviewedTodayCount}/{boardSummary.subjectCount}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Main 2-Column Workbench */}
      <div className="mt-7 grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Left Primary Column: Enrolled Subjects */}
        <section aria-labelledby="enrolled-subjects-heading" className="xl:col-span-8 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2
                id="enrolled-subjects-heading"
                className="text-lg font-bold tracking-tight text-foreground"
              >
                Enrolled Subjects
              </h2>
              <p className="text-xs text-foreground-muted">
                {activeBoardMeta?.summary}
              </p>
            </div>
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground-muted">
              {subjects.length} active
            </span>
          </div>

          <div key={activeBoard} className="space-y-3.5">
            {subjects.map((subject, idx) => {
              const masteryPct = computeMasteryPercent(
                subject.topicsMastered,
                subject.topicsTotal
              );
              const isReviewedToday = reviewedIds.includes(subject.id);

              return (
                <article
                  key={subject.id}
                  data-subject-card={subject.id}
                  style={{ '--stagger-index': Math.min(idx, 6) } as React.CSSProperties}
                  className="ants-stagger-item ants-card-interactive rounded-lg border border-border bg-surface-card p-5 shadow-[var(--shadow-tier-1)] hover:border-border-hover"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold tracking-tight text-on-primary-tint rounded bg-primary-tint px-2 py-0.5 border border-primary-tint-border">
                        {subject.code}
                      </span>
                      <span className="text-xs font-medium text-foreground-muted">
                        {subject.boardLabel}
                      </span>
                      {subject.subjectType === 'modular_maths_suite' && (
                        <Badge variant="editorial">Modular Maths Suite</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 font-mono text-xs tabular-nums">
                      <span className="text-foreground-muted">
                        Last {subject.lastStudiedLabel}
                      </span>
                      <span className="rounded border border-border bg-surface-inset px-2 py-0.5 font-semibold text-foreground">
                        Target {customTargetGrades[subject.id] ?? subject.targetGrade}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-base font-bold text-foreground">{subject.title}</h3>
                    <p className="mt-0.5 font-mono text-xs text-foreground-muted">
                      {subject.subjectType === 'modular_maths_suite' && customMathsSummary
                        ? customMathsSummary
                        : subject.unitSummary}
                    </p>
                  </div>

                  <p className="mt-2.5 text-sm text-foreground-muted">
                    <span className="font-semibold text-foreground">Up next:</span>{' '}
                    {subject.nextMilestoneLabel}
                  </p>

                  {/* 6px Academic Mastery Progress Track */}
                  <div className="mt-3.5 space-y-1.5">
                    <div
                      role="progressbar"
                      aria-valuenow={masteryPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${subject.title} syllabus mastery`}
                      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${masteryPct}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs tabular-nums text-foreground-muted">
                      <span>
                        <strong className="font-semibold text-foreground">{masteryPct}%</strong>{' '}
                        ({subject.topicsMastered}/{subject.topicsTotal} topics ·{' '}
                        {subject.topicsInProgress} in progress)
                      </span>
                      <span>
                        {subject.papersLogged} papers · {subject.latestPaperLabel}
                      </span>
                    </div>
                  </div>

                  {/* Single Quiet Footer Action Row */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
                    <button
                      type="button"
                      onClick={() => handleCheckInToggle(subject.id)}
                      aria-pressed={isReviewedToday}
                      className={cn(
                        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isReviewedToday
                          ? 'border-success-border bg-success-tint text-on-success-tint'
                          : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:bg-surface-inset hover:text-foreground'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {isReviewedToday
                          ? 'Reviewed today'
                          : `Mark reviewed (+${REVISION_CHECKIN_XP} XP)`}
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                      <Link
                        href="/calculator"
                        className="text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        Grade Calculator
                      </Link>
                      <Link
                        href={`/curriculum/${encodeURIComponent(subject.code)}?tab=papers`}
                        className="text-foreground-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        Past Papers
                      </Link>
                      <Link
                        href={`/curriculum/${encodeURIComponent(subject.code)}?tab=topics`}
                        onClick={() => onOpenTopicTracker?.(subject)}
                        className="inline-flex items-center gap-1 text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        <span>Topic Tracker</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Right Rail: Pinned Exam Countdowns & Recent Activity */}
        <aside className="xl:col-span-4 space-y-6">
          {/* Exam Countdowns */}
          <section aria-labelledby="countdowns-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                <h2
                  id="countdowns-heading"
                  className="text-base font-bold tracking-tight text-foreground"
                >
                  Exam Countdowns
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllCountdowns((prev) => !prev)}
                  className="font-mono text-xs font-semibold text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1.5 py-0.5"
                >
                  {showAllCountdowns
                    ? `Pinned (${pinnedCount})`
                    : `Show all (${boardCountdowns.length})`}
                </button>
                <Link
                  href="/countdown"
                  className="text-xs font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
                >
                  Manage →
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface-card divide-y divide-border shadow-[var(--shadow-tier-1)]">
              {visibleCountdowns.length === 0 ? (
                <div className="p-4 text-xs text-foreground-muted">
                  No pinned exams on this board.{' '}
                  <button
                    type="button"
                    onClick={() => setShowAllCountdowns(true)}
                    className="font-semibold text-on-primary-tint underline"
                  >
                    Show all exams
                  </button>{' '}
                  to pin upcoming papers.
                </div>
              ) : (
                visibleCountdowns.map((exam) => {
                  const urgency = getCountdownUrgency(exam.daysLeft);
                  const badgeVariant =
                    urgency === 'urgent'
                      ? 'deadline'
                      : urgency === 'upcoming'
                        ? 'active-filter'
                        : 'verified';

                  return (
                    <div key={exam.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-foreground-muted">
                            <span className="font-bold text-foreground">{exam.paperCode}</span>
                            <span aria-hidden="true">·</span>
                            <span>{exam.examDateLabel}</span>
                          </div>
                          <p className="mt-0.5 text-sm font-semibold text-foreground leading-snug">
                            {exam.title}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-foreground-muted">
                            Target grade: {exam.targetGrade}
                          </p>
                        </div>

                        <Badge
                          variant={badgeVariant}
                          mono
                          dot={urgency === 'urgent'}
                          className="shrink-0 whitespace-nowrap"
                        >
                          {exam.daysLeft}d left
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePinToggle(exam.id)}
                            aria-pressed={exam.pinned}
                            className={cn(
                              'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              exam.pinned
                                ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                                : 'border-border bg-surface-inset text-foreground-muted hover:text-foreground'
                            )}
                          >
                            <Pin className="h-3 w-3" aria-hidden="true" />
                            <span>{exam.pinned ? 'Pinned' : 'Pin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFlowSyncToggle(exam.id)}
                            aria-pressed={exam.syncedToFlow}
                            className={cn(
                              'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              exam.syncedToFlow
                                ? 'border-success-border bg-success-tint text-on-success-tint'
                                : 'border-border bg-surface-inset text-foreground-muted hover:text-foreground'
                            )}
                          >
                            <RefreshCw className="h-3 w-3" aria-hidden="true" />
                            <span>{exam.syncedToFlow ? 'Flow Synced' : 'Sync Flow'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Flow Cross-App Bridge Footer */}
              <div className="flex items-center justify-between gap-2 bg-surface-inset/60 px-4 py-2.5 text-xs">
                <span className="font-mono tabular-nums text-foreground-muted">
                  {syncedToFlowCount} synced with Flow
                </span>
                <a
                  href={flowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <span>Open Flow</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          {/* Recent Study Ledger */}
          <section aria-labelledby="recent-ledger-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                id="recent-ledger-heading"
                className="text-base font-bold tracking-tight text-foreground"
              >
                Recent Activity
              </h2>
              <Link
                href="/leaderboard"
                className="font-mono text-xs font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1 py-0.5"
              >
                Leaderboard →
              </Link>
            </div>

            <div className="rounded-lg border border-border bg-surface-card divide-y divide-border shadow-[var(--shadow-tier-1)]">
              {boardActivity.map((entry) => (
                <div key={entry.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-foreground-muted">
                    <span>
                      {entry.dateLabel} · <strong className="text-foreground">{entry.subjectCode}</strong>
                    </span>
                    <span className="font-semibold text-on-success-tint">
                      +{entry.xpDelta} XP
                    </span>
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {entry.summary}
                  </p>
                  <p className="font-mono text-[11px] tabular-nums text-foreground-muted">
                    {entry.metricLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </StudyShellView>
  );
}

