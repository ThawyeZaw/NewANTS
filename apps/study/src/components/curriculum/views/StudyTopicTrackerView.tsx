'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calculator,
  Check,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Grid,
  ListChecks,
  Search,
  Sparkles,
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
  loadStudyCurriculumState,
  type CurriculumSubjectItem,
} from '../../../lib/study/curriculum';
import {
  computeSubjectTopicStats,
  deriveTopicStatus,
  filterSyllabusTopics,
  getTopicCompletedSubtopicCount,
  loadStudyTopicsState,
  resolveSubjectIdFromParam,
  saveStudyTopicsState,
  saveTopicNote,
  setTopicConfidenceStatus,
  toggleSubtopicCompletion,
  TOPIC_MASTERY_XP,
  type StudyTopicsPersistedState,
  type SyllabusTopicItem,
  type TopicConfidenceStatus,
  type TopicDifficultyLevel,
  type TopicTrackerLayoutMode,
} from '../../../lib/study/topics';
import {
  createDefaultStudyCurriculumState,
  MOCK_CURRICULUM_SUBJECTS,
} from '../../../mocks/study-curriculum.mock';
import {
  createDefaultStudyTopicsState,
  MOCK_SYLLABUS_TOPICS,
} from '../../../mocks/study-topics.mock';
import { StudyShellView, type StudyNavItem } from '../../layout/views/StudyShellView';
import { StudyPastPapersView } from '../../papers/views/StudyPastPapersView';
import { TopicNotesDrawerView } from './TopicNotesDrawerView';

export interface StudyTopicTrackerViewProps {
  user?: MockUserProfile | null;
  subjects?: CurriculumSubjectItem[];
  topics?: SyllabusTopicItem[];
  initialSubjectId?: string;
  initialState?: StudyTopicsPersistedState;
  /** Render inline inside `/curriculum?tab=topics` without wrapping in a second StudyShellView */
  embedded?: boolean;
  flowUrl?: string;
  orgUrl?: string;
  onSubjectChange?: (subjectId: string) => void;
  onToggleSubtopic?: (topicId: string, subtopicId: string, completed: boolean) => void;
  onChangeTopicStatus?: (topicId: string, status: TopicConfidenceStatus) => void;
  onSaveTopicNote?: (topicId: string, noteText: string) => void;
}

const STATUS_FILTERS: Array<{ id: 'all' | TopicConfidenceStatus; label: string }> = [
  { id: 'all', label: 'All Statuses' },
  { id: 'mastered', label: 'Mastered' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'not_started', label: 'Not Started' },
];

const DIFFICULTY_FILTERS: Array<{ id: 'all' | TopicDifficultyLevel; label: string }> = [
  { id: 'all', label: 'All Difficulties' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'standard', label: 'Standard' },
  { id: 'stretch', label: 'Stretch' },
];

const CONFIDENCE_PILLS: Array<{
  id: TopicConfidenceStatus;
  label: string;
}> = [
  { id: 'not_started', label: 'Not Started' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'mastered', label: 'Mastered' },
];

export function StudyTopicTrackerView({
  user = MOCK_AUTHENTICATED_USER,
  subjects = MOCK_CURRICULUM_SUBJECTS,
  topics = MOCK_SYLLABUS_TOPICS,
  initialSubjectId = 'ial-maths-suite',
  initialState,
  embedded = false,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onSubjectChange,
  onToggleSubtopic,
  onChangeTopicStatus,
  onSaveTopicNote,
}: StudyTopicTrackerViewProps) {
  const defaultState = useMemo(
    () => initialState ?? createDefaultStudyTopicsState(),
    [initialState]
  );

  const [state, setState] = useState<StudyTopicsPersistedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() =>
    resolveSubjectIdFromParam(initialSubjectId, subjects)
  );
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [onlyMyCashInUnits, setOnlyMyCashInUnits] = useState<boolean>(false);
  const [activeCashInUnits, setActiveCashInUnits] = useState<string[]>([
    'WMA11',
    'WMA12',
    'WMA13',
    'WMA14',
    'WME01',
    'WST01',
  ]);
  const [activeCashInCode, setActiveCashInCode] = useState<string>('YMA01');
  const [statusFilter, setStatusFilter] = useState<'all' | TopicConfidenceStatus>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | TopicDifficultyLevel>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<TopicTrackerLayoutMode>('both');
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>([]);
  const [activeDrawerTopicId, setActiveDrawerTopicId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'topics' | 'papers'>('topics');
  const [queuedNotice, setQueuedNotice] = useState<string | null>(null);

  const subTabRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: subTabRect,
    ready: subTabReady,
    animate: subTabAnimate,
  } = useSlidingIndicator(subTabRef, activeSubTab, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const subTabIndicatorReady = subTabReady && subTabRect.visible;

  const layoutTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: layoutRect,
    ready: layoutReady,
    animate: layoutAnimate,
  } = useSlidingIndicator(layoutTabsRef, layoutMode, {
    activeSelector: '[aria-pressed="true"]',
  });
  const layoutIndicatorReady = layoutReady && layoutRect.visible;

  const unitTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: unitRect,
    ready: unitReady,
    animate: unitAnimate,
  } = useSlidingIndicator(unitTabsRef, `${selectedSubjectId}-${unitFilter}-${onlyMyCashInUnits}`, {
    activeSelector: '[aria-pressed="true"]',
  });
  const unitIndicatorReady = unitReady && unitRect.visible;

  const statusTabsRef = useRef<HTMLDivElement | null>(null);
  const {
    rect: statusRect,
    ready: statusReady,
    animate: statusAnimate,
  } = useSlidingIndicator(statusTabsRef, statusFilter, {
    activeSelector: '[aria-pressed="true"]',
  });
  const statusIndicatorReady = statusReady && statusRect.visible;

  useEffect(() => {
    const loadedTopics = loadStudyTopicsState(defaultState);
    setState(loadedTopics);

    const loadedCurriculum = loadStudyCurriculumState(
      createDefaultStudyCurriculumState()
    );
    const cashIn = loadedCurriculum.activeMathsCashIn;
    const units =
      loadedCurriculum.mathsUnitsByCashIn[cashIn] ??
      loadedCurriculum.mathsUnitsByCashIn.YMA01;
    setActiveCashInCode(cashIn);
    setActiveCashInUnits(units);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const subjectParam = params.get('subject');
      const unitParam = params.get('unit');
      const tabParam = params.get('tab');

      if (subjectParam) {
        setSelectedSubjectId(resolveSubjectIdFromParam(subjectParam, subjects));
      } else {
        setSelectedSubjectId(resolveSubjectIdFromParam(initialSubjectId, subjects));
      }

      if (unitParam) {
        setUnitFilter(unitParam);
      }

      if (tabParam === 'papers') {
        setActiveSubTab('papers');
      }
    }

    setHydrated(true);
  }, [defaultState, initialSubjectId, subjects]);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyTopicsState(state);
  }, [hydrated, state]);

  const currentSubject = useMemo(
    () =>
      subjects.find((s) => s.id === selectedSubjectId) ??
      subjects[0] ??
      MOCK_CURRICULUM_SUBJECTS[0]!,
    [selectedSubjectId, subjects]
  );

  // Auto-expand the first 2 topics when switching subjects
  useEffect(() => {
    const firstTwo = topics
      .filter((t) => t.subjectId === currentSubject.id)
      .slice(0, 2)
      .map((t) => t.id);
    setExpandedTopicIds(firstTwo);
  }, [currentSubject.id, topics]);

  const isMathsSuite = currentSubject.subjectType === 'modular_maths_suite';
  const allowedUnitCodes = useMemo(
    () => (isMathsSuite && onlyMyCashInUnits ? activeCashInUnits : undefined),
    [activeCashInUnits, isMathsSuite, onlyMyCashInUnits]
  );

  const subjectUnitsWithTopics = useMemo(() => {
    const topicUnitSet = new Set(
      topics.filter((t) => t.subjectId === currentSubject.id).map((t) => t.unitCode)
    );
    return currentSubject.units.filter(
      (u) =>
        topicUnitSet.has(u.code) &&
        (!allowedUnitCodes || allowedUnitCodes.includes(u.code))
    );
  }, [allowedUnitCodes, currentSubject.id, currentSubject.units, topics]);

  const filteredTopics = useMemo(
    () =>
      filterSyllabusTopics(topics, state, {
        subjectId: currentSubject.id,
        unitCode: unitFilter,
        allowedUnitCodes,
        status: statusFilter,
        difficulty: difficultyFilter,
        searchQuery,
      }),
    [
      allowedUnitCodes,
      currentSubject.id,
      difficultyFilter,
      searchQuery,
      state,
      statusFilter,
      topics,
      unitFilter,
    ]
  );

  const subjectStats = useMemo(
    () =>
      computeSubjectTopicStats(
        topics,
        state,
        currentSubject.id,
        allowedUnitCodes
      ),
    [allowedUnitCodes, currentSubject.id, state, topics]
  );

  const activeDrawerTopic = useMemo(
    () => topics.find((t) => t.id === activeDrawerTopicId) ?? null,
    [activeDrawerTopicId, topics]
  );

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setUnitFilter('all');
    onSubjectChange?.(subjectId);
  };

  const handleToggleExpand = (topicId: string) => {
    setExpandedTopicIds((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleExpandAll = () => {
    if (expandedTopicIds.length === filteredTopics.length) {
      setExpandedTopicIds([]);
    } else {
      setExpandedTopicIds(filteredTopics.map((t) => t.id));
    }
  };

  const handleToggleSubtopic = (topic: SyllabusTopicItem, subtopicId: string) => {
    const willComplete = !state.completedSubtopicIds.includes(subtopicId);
    setState((prev) => toggleSubtopicCompletion(prev, topic, subtopicId));
    onToggleSubtopic?.(topic.id, subtopicId, willComplete);
  };

  const handleChangeStatus = (
    topic: SyllabusTopicItem,
    nextStatus: TopicConfidenceStatus
  ) => {
    setState((prev) => setTopicConfidenceStatus(prev, topic, nextStatus));
    onChangeTopicStatus?.(topic.id, nextStatus);
  };

  const handleChangeNote = (topicId: string, noteText: string) => {
    setState((prev) => saveTopicNote(prev, topicId, noteText));
    onSaveTopicNote?.(topicId, noteText);
  };

  const handleKanjiTileClick = (topicId: string) => {
    if (layoutMode === 'grid') {
      setActiveDrawerTopicId(topicId);
      return;
    }
    setExpandedTopicIds((prev) =>
      prev.includes(topicId) ? prev : [...prev, topicId]
    );
    if (typeof document !== 'undefined') {
      const el = document.querySelector(`[data-topic-row="${topicId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleQueuedNav = (item: StudyNavItem) => {
    setQueuedNotice(
      `${item.label} (${item.href}) is queued for Stage ${item.stageTag ?? 'Z4'}. Dashboard (/), Curriculum & Topic Tracker (/curriculum), Past Papers (/past-papers), and Grade Calculator (/calculator) are live now.`
    );
  };

  const trackerBody = (
    <div className="space-y-6">
      {/* 1. Breadcrumb, Subject Switcher & ?tab=topics / ?tab=papers Bar */}
      <section aria-labelledby="topic-tracker-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/curriculum"
              className="inline-flex items-center gap-1 font-semibold text-foreground-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>All Specifications</span>
            </Link>
            <span className="text-foreground-subtle" aria-hidden="true">
              /
            </span>
            <span className="rounded bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint border border-primary-tint-border">
              {currentSubject.code}
            </span>
            <span className="font-medium text-foreground-muted">
              {currentSubject.boardLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sub-tab switcher: ?tab=topics vs ?tab=papers */}
            <div
              ref={subTabRef}
              role="tablist"
              aria-label="Subject workspace tabs"
              data-gliding-ready={subTabIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex rounded-md border border-border bg-surface-card p-1"
            >
              <span
                aria-hidden="true"
                data-animate={subTabAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded bg-primary-solid shadow-2xs"
                style={{
                  transform: `translate3d(${subTabRect.x}px, ${subTabRect.y}px, 0)`,
                  width: `${subTabRect.width}px`,
                  height: `${subTabRect.height}px`,
                  opacity: subTabIndicatorReady ? 1 : 0,
                }}
              />
              <button
                type="button"
                role="tab"
                aria-selected={activeSubTab === 'topics'}
                data-active={activeSubTab === 'topics' ? 'true' : 'false'}
                onClick={() => setActiveSubTab('topics')}
                className={cn(
                  'ants-glide-item relative z-10 inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  activeSubTab === 'topics'
                    ? 'bg-primary-solid text-on-primary'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Syllabus Topics</span>
              </button>
              <button
                type="button"
                role="tab"
                data-testid="subject-subtab-papers"
                aria-selected={activeSubTab === 'papers'}
                data-active={activeSubTab === 'papers' ? 'true' : 'false'}
                onClick={() => setActiveSubTab('papers')}
                className={cn(
                  'ants-glide-item relative z-10 inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  activeSubTab === 'papers'
                    ? 'bg-primary-solid text-on-primary'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Past Paper Matrix</span>
              </button>
            </div>

            <Link
              href="/calculator"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground hover:border-border-hover hover:bg-surface-inset"
            >
              <Calculator className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Calculator</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1
              id="topic-tracker-heading"
              className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              {currentSubject.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
              Track specification subtopics, confidence ratings, examiner formulas, and personal revision notes.
            </p>
          </div>

          {/* Subject Switcher Select */}
          <div className="flex shrink-0 items-center gap-2">
            <label
              htmlFor="topic-tracker-subject-select"
              className="text-xs font-semibold text-foreground-muted whitespace-nowrap"
            >
              Subject:
            </label>
            <select
              id="topic-tracker-subject-select"
              data-testid="topic-subject-select"
              value={currentSubject.id}
              onChange={(e) => handleSelectSubject(e.target.value)}
              className="h-9 max-w-[280px] truncate rounded-md border border-border bg-surface-card px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
            >
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.id}>
                  {subj.code} · {subj.boardLabel} — {subj.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hairline Mastery & Telemetry Strip + 6px Progress Track */}
        <div className="space-y-3 border-y border-border py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Topic Mastery
                </span>
                <span
                  data-testid="topic-mastery-percent"
                  className="font-mono text-sm font-bold tabular-nums text-foreground"
                >
                  {subjectStats.masteryPercent}%{' '}
                  <span className="font-normal text-foreground-muted">
                    ({subjectStats.masteredCount}/{subjectStats.totalTopics} mastered)
                  </span>
                </span>
              </div>

              <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  In Progress
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {subjectStats.inProgressCount} topics{' '}
                  <span className="font-normal text-foreground-muted">
                    · {subjectStats.notStartedCount} queued
                  </span>
                </span>
              </div>

              <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Subtopic Checklists
                </span>
                <span
                  data-testid="subtopic-completed-ratio"
                  className="font-mono text-sm font-bold tabular-nums text-foreground"
                >
                  {subjectStats.completedSubtopics}/{subjectStats.totalSubtopics} checked
                </span>
              </div>

              <div className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Mastery XP Earned
                </span>
                <span
                  data-testid="topic-earned-xp"
                  className="font-mono text-sm font-bold tabular-nums text-on-success-tint"
                >
                  +{subjectStats.earnedTopicXp} XP
                </span>
              </div>
            </div>

            {/* Layout Mode Switcher */}
            <div
              ref={layoutTabsRef}
              data-gliding-ready={layoutIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative flex items-center gap-1"
            >
              <span
                aria-hidden="true"
                data-animate={layoutAnimate ? 'true' : 'false'}
                className="ants-glide-indicator z-0 rounded border border-primary-tint-border bg-primary-tint"
                style={{
                  transform: `translate3d(${layoutRect.x}px, ${layoutRect.y}px, 0)`,
                  width: `${layoutRect.width}px`,
                  height: `${layoutRect.height}px`,
                  opacity: layoutIndicatorReady ? 1 : 0,
                }}
              />
              <button
                type="button"
                aria-pressed={layoutMode === 'both'}
                data-active={layoutMode === 'both' ? 'true' : 'false'}
                onClick={() => setLayoutMode('both')}
                className={cn(
                  'ants-glide-item relative z-10 rounded border px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  layoutMode === 'both'
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                )}
              >
                Split View
              </button>
              <button
                type="button"
                aria-pressed={layoutMode === 'accordion'}
                data-active={layoutMode === 'accordion' ? 'true' : 'false'}
                onClick={() => setLayoutMode('accordion')}
                className={cn(
                  'ants-glide-item relative z-10 inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  layoutMode === 'accordion'
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                )}
              >
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Accordion</span>
              </button>
              <button
                type="button"
                aria-pressed={layoutMode === 'grid'}
                data-active={layoutMode === 'grid' ? 'true' : 'false'}
                onClick={() => setLayoutMode('grid')}
                className={cn(
                  'ants-glide-item relative z-10 inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                  layoutMode === 'grid'
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                )}
              >
                <Grid className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kanji Grid</span>
              </button>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuenow={subjectStats.masteryPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${currentSubject.title} topic mastery percentage`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${subjectStats.masteryPercent}%` }}
            />
          </div>
        </div>
      </section>

      {activeSubTab === 'papers' ? (
        <div key="papers" className="ants-fade-enter">
          <StudyPastPapersView
            embedded={true}
            initialSubjectId={currentSubject.id}
            onSubjectChange={handleSelectSubject}
          />
        </div>
      ) : (
        <div key="topics" className="ants-fade-enter space-y-6">
          {/* 2. Modular Unit Filter Bar + Search & Confidence Filters */}
          <section aria-label="Syllabus topic filters" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                  data-unit-filter="all"
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
                  All Units ({subjectStats.totalTopics})
                </button>

                {subjectUnitsWithTopics.map((unit) => {
                  const active = unitFilter === unit.code;
                  return (
                    <button
                      key={unit.code}
                      type="button"
                      data-unit-filter={unit.code}
                      aria-pressed={active}
                      data-active={active ? 'true' : 'false'}
                      onClick={() => setUnitFilter(unit.code)}
                      className={cn(
                        'ants-glide-item relative z-10 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold transition-colors active:scale-[0.98]',
                        active
                          ? 'border-primary bg-primary-solid text-on-primary'
                          : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                      )}
                    >
                      {unit.shortCode} ({unit.code})
                    </button>
                  );
                })}
              </div>

              {isMathsSuite && (
                <button
                  type="button"
                  data-testid="filter-my-cashin-units"
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
                {/* Status Filter Pills */}
                <div
                  ref={statusTabsRef}
                  data-gliding-ready={statusIndicatorReady ? 'true' : 'false'}
                  className="ants-glide-host relative flex flex-wrap items-center gap-1"
                >
                  <span
                    aria-hidden="true"
                    data-animate={statusAnimate ? 'true' : 'false'}
                    className="ants-glide-indicator z-0 rounded-md border border-primary-tint-border bg-primary-tint"
                    style={{
                      transform: `translate3d(${statusRect.x}px, ${statusRect.y}px, 0)`,
                      width: `${statusRect.width}px`,
                      height: `${statusRect.height}px`,
                      opacity: statusIndicatorReady ? 1 : 0,
                    }}
                  />
                  {STATUS_FILTERS.map((st) => {
                    const active = statusFilter === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        data-status-filter={st.id}
                        aria-pressed={active}
                        data-active={active ? 'true' : 'false'}
                        onClick={() => setStatusFilter(st.id)}
                        className={cn(
                          'ants-glide-item relative z-10 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors active:scale-[0.98]',
                          active
                            ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                            : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                        )}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>

                {/* Difficulty Select */}
                <select
                  aria-label="Filter by topic difficulty"
                  value={difficultyFilter}
                  onChange={(e) =>
                    setDifficultyFilter(
                      e.target.value as 'all' | TopicDifficultyLevel
                    )
                  }
                  className="h-8 rounded-md border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                >
                  {DIFFICULTY_FILTERS.map((df) => (
                    <option key={df.id} value={df.id}>
                      {df.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="relative min-w-[220px] flex-1 sm:w-64">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search code, subtopic, formula..."
                    aria-label="Search syllabus topics"
                    className="h-8 w-full rounded-md border border-border bg-surface-card pl-8 pr-3 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
                  />
                </div>

                {layoutMode !== 'grid' && (
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    className="h-8 shrink-0 rounded-md border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground-muted hover:text-foreground"
                  >
                    {expandedTopicIds.length === filteredTopics.length
                      ? 'Collapse All'
                      : 'Expand All'}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 3. Kanji-Style Topic Mastery Grid */}
          {(layoutMode === 'both' || layoutMode === 'grid') &&
            filteredTopics.length > 0 && (
              <section
                aria-labelledby="kanji-grid-heading"
                data-testid="kanji-topic-grid"
                className="space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    id="kanji-grid-heading"
                    className="text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Kanji-Style Topic Mastery Matrix ({filteredTopics.length})
                  </h2>
                  <div className="flex items-center gap-3 font-mono text-[11px] text-foreground-muted">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                      <span>Mastered</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                      <span>In Progress</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-border-hover" aria-hidden="true" />
                      <span>Not Started</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {filteredTopics.map((topic) => {
                    const st = deriveTopicStatus(
                      topic,
                      state.completedSubtopicIds,
                      state.statusOverrideByTopicId
                    );
                    const doneSub = getTopicCompletedSubtopicCount(
                      topic,
                      state.completedSubtopicIds
                    );
                    const hasNote = Boolean(
                      state.notesByTopicId[topic.id]?.trim()
                    );

                    return (
                      <button
                        key={topic.id}
                        type="button"
                        data-kanji-tile={topic.id}
                        onClick={() => handleKanjiTileClick(topic.id)}
                        title={`${topic.code}: ${topic.title} (${doneSub}/${topic.subtopics.length} subtopics)`}
                        className={cn(
                          'flex flex-col justify-between rounded-md border p-2.5 text-left transition-[transform,colors] duration-150 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          st === 'mastered'
                            ? 'border-success-border bg-success-tint text-on-success-tint'
                            : st === 'in_progress'
                              ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                              : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold tracking-tight">
                            {topic.code}
                          </span>
                          {hasNote && (
                            <FileText
                              className="h-3 w-3 shrink-0 opacity-80"
                              aria-label="Has revision note"
                            />
                          )}
                        </div>
                        <p className="mt-1 truncate text-[11px] font-medium">
                          {topic.title}
                        </p>
                        <div className="mt-2 flex items-center justify-between font-mono text-[10px] tabular-nums opacity-85">
                          <span>{topic.unitCode}</span>
                          <span>
                            {doneSub}/{topic.subtopics.length}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

          {/* 4. Syllabus Topic Accordion List */}
          {(layoutMode === 'both' || layoutMode === 'accordion') && (
            <section aria-labelledby="syllabus-accordion-heading" className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2
                  id="syllabus-accordion-heading"
                  className="text-xs font-bold uppercase tracking-wider text-foreground"
                >
                  Syllabus Topic Accordion &amp; Subtopic Checklists
                </h2>
                <span className="font-mono text-xs text-foreground-muted">
                  +{TOPIC_MASTERY_XP} XP per mastered topic
                </span>
              </div>

              {filteredTopics.length === 0 ? (
                <div className="rounded-lg border border-border bg-surface-card p-8 text-center space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    No syllabus topics match your current filter.
                  </p>
                  <p className="text-xs text-foreground-muted">
                    Try resetting unit, status, or search filters above.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setUnitFilter('all');
                      setStatusFilter('all');
                      setDifficultyFilter('all');
                      setSearchQuery('');
                    }}
                  >
                    Reset Topic Filters
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border border-y border-border bg-surface-card">
                  {filteredTopics.map((topic) => {
                    const expanded = expandedTopicIds.includes(topic.id);
                    const status = deriveTopicStatus(
                      topic,
                      state.completedSubtopicIds,
                      state.statusOverrideByTopicId
                    );
                    const doneSub = getTopicCompletedSubtopicCount(
                      topic,
                      state.completedSubtopicIds
                    );
                    const noteText = state.notesByTopicId[topic.id] ?? '';
                    const hasNote = noteText.trim().length > 0;
                    const completedSet = new Set(state.completedSubtopicIds);

                    return (
                      <div
                        key={topic.id}
                        data-topic-row={topic.id}
                        className="transition-colors"
                      >
                        {/* Accordion Header Row */}
                        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-start gap-3 min-w-0">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-label={`Toggle subtopics for ${topic.code}`}
                              onClick={() => handleToggleExpand(topic.id)}
                              className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-background text-foreground-muted transition-colors hover:text-foreground"
                            >
                              <ChevronRight
                                className={cn(
                                  'h-3.5 w-3.5 transition-transform duration-200',
                                  expanded && 'rotate-90'
                                )}
                                aria-hidden="true"
                              />
                            </button>

                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint border border-primary-tint-border">
                                  {topic.code}
                                </span>
                                <span className="font-mono text-xs text-foreground-muted">
                                  {topic.unitLabel}
                                </span>
                                <Badge
                                  variant={
                                    topic.difficulty === 'stretch'
                                      ? 'deadline'
                                      : topic.difficulty === 'standard'
                                        ? 'active-filter'
                                        : 'editorial'
                                  }
                                >
                                  {topic.difficulty}
                                </Badge>
                                <span className="font-mono text-xs tabular-nums text-foreground-muted">
                                  {doneSub}/{topic.subtopics.length} subtopics
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleExpand(topic.id)}
                                className="text-left text-sm font-bold text-foreground hover:text-primary"
                              >
                                {topic.title}
                              </button>
                            </div>
                          </div>

                          {/* Right Controls: 3-State Confidence Pills + Notes Trigger */}
                          <div className="flex flex-wrap items-center gap-2 pl-9 lg:pl-0 shrink-0">
                            <div
                              role="group"
                              aria-label={`Confidence status for ${topic.code}`}
                              className="inline-flex rounded-md border border-border bg-background p-0.5"
                            >
                              {CONFIDENCE_PILLS.map((pill) => {
                                const active = status === pill.id;
                                return (
                                  <button
                                    key={pill.id}
                                    type="button"
                                    data-topic-status-pill={`${topic.id}-${pill.id}`}
                                    aria-pressed={active}
                                    onClick={() =>
                                      handleChangeStatus(topic, pill.id)
                                    }
                                    className={cn(
                                      'rounded px-2 py-1 text-[11px] font-semibold transition-colors',
                                      active && pill.id === 'mastered'
                                        ? 'bg-success-tint text-on-success-tint font-bold'
                                        : active && pill.id === 'in_progress'
                                          ? 'bg-primary-tint text-on-primary-tint font-bold'
                                          : active
                                            ? 'bg-surface-inset text-foreground font-bold'
                                            : 'text-foreground-muted hover:text-foreground'
                                    )}
                                  >
                                    {pill.label}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              type="button"
                              data-open-notes-btn={topic.id}
                              onClick={() => setActiveDrawerTopicId(topic.id)}
                              className={cn(
                                'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors',
                                hasNote
                                  ? 'border-primary-tint-border bg-primary-tint/50 text-on-primary-tint'
                                  : 'border-border bg-background text-foreground-muted hover:text-foreground'
                              )}
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{hasNote ? 'Notes (Saved)' : 'Notes'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Subtopics & Key Formulas Body */}
                        <div
                          className="ants-accordion"
                          data-open={expanded ? 'true' : 'false'}
                          aria-hidden={!expanded}
                        >
                          <div className="ants-accordion-inner">
                            <div className="border-t border-border-subtle bg-surface-inset/40 px-4 py-3.5 pl-12 space-y-3.5">
                              {/* Subtopics Checklist */}
                              <div className="divide-y divide-border-subtle">
                                {topic.subtopics.map((sub) => {
                                  const checked = completedSet.has(sub.id);
                                  return (
                                    <label
                                      key={sub.id}
                                      className="flex cursor-pointer items-center justify-between gap-3 py-2 text-xs transition-colors hover:text-foreground"
                                    >
                                      <span className="flex items-center gap-2.5">
                                        <input
                                          type="checkbox"
                                          data-subtopic-checkbox={sub.id}
                                          checked={checked}
                                          tabIndex={expanded ? undefined : -1}
                                          onChange={() =>
                                            handleToggleSubtopic(topic, sub.id)
                                          }
                                          className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                                        />
                                        <span className="font-mono font-bold text-foreground-muted">
                                          {sub.code}
                                        </span>
                                        <span
                                          className={cn(
                                            checked
                                              ? 'line-through text-foreground-muted'
                                              : 'font-medium text-foreground'
                                          )}
                                        >
                                          {sub.title}
                                        </span>
                                      </span>

                                      {checked && (
                                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-on-success-tint">
                                          <Check className="h-3 w-3" aria-hidden="true" />
                                          <span>Checked</span>
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>

                              {/* Examiner Formulas & Personal Note Preview */}
                              <div className="flex flex-col gap-2 border-t border-border-subtle pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-1.5 text-foreground-muted max-w-2xl">
                                  <Sparkles
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                                    aria-hidden="true"
                                  />
                                  <span>{topic.keyFormulasAndPitfalls[0]}</span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 font-semibold">
                                  <button
                                    type="button"
                                    tabIndex={expanded ? undefined : -1}
                                    onClick={() => setActiveDrawerTopicId(topic.id)}
                                    className="text-on-primary-tint hover:underline"
                                  >
                                    {hasNote
                                      ? 'Edit Personal Note'
                                      : 'Add Topic Note'}
                                  </button>
                                  <a
                                    href={`http://localhost:3002/pomodoro?task=${encodeURIComponent(
                                      `${topic.code}: ${topic.title}`
                                    )}&pomodoros=2`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    tabIndex={expanded ? undefined : -1}
                                    className="inline-flex items-center gap-1 text-foreground-muted hover:text-foreground"
                                  >
                                    <span>Flow Pomodoro</span>
                                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* 5. Slide-Over Topic Notes & Revision Drawer */}
      <TopicNotesDrawerView
        topic={activeDrawerTopic}
        open={Boolean(activeDrawerTopic)}
        status={
          activeDrawerTopic
            ? deriveTopicStatus(
                activeDrawerTopic,
                state.completedSubtopicIds,
                state.statusOverrideByTopicId
              )
            : 'not_started'
        }
        completedSubtopicIds={state.completedSubtopicIds}
        noteText={
          activeDrawerTopic ? state.notesByTopicId[activeDrawerTopic.id] ?? '' : ''
        }
        onClose={() => setActiveDrawerTopicId(null)}
        onToggleSubtopic={handleToggleSubtopic}
        onChangeStatus={handleChangeStatus}
        onChangeNote={handleChangeNote}
      />
    </div>
  );

  if (embedded) {
    return trackerBody;
  }

  return (
    <StudyShellView
      activeRoute="curriculum"
      user={
        user
          ? {
              ...user,
              xp: (user.xp ?? 2840) + subjectStats.earnedTopicXp,
            }
          : null
      }
      flowUrl={flowUrl}
      orgUrl={orgUrl}
      queuedNotice={queuedNotice}
      onDismissQueuedNotice={() => setQueuedNotice(null)}
      onQueuedRouteSelect={handleQueuedNav}
    >
      {trackerBody}
    </StudyShellView>
  );
}
