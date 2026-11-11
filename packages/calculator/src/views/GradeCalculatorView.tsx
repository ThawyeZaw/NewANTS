'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  AppSwitcher,
  BrandHeaderBadge,
  Button,
  Tabs,
  ThemeToggle,
  cn,
  type EcosystemAppId,
} from '@ants/ui';
import {
  MOCK_CALCULATOR_SUBJECTS,
  MOCK_EXAM_BOARDS,
  MOCK_EXAM_SERIES,
  type CalculatorSubjectMock,
  type ExamBoardId,
  type ExamBoardOption,
  type ExamSeriesId,
  type ExamSeriesOption,
  type PaperComponentMock,
} from '../mocks/calculator.mock';

export interface GradeCalculationSnapshot {
  boardId: ExamBoardId;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  seriesId: ExamSeriesId;
  rawMarksByPaper: Record<string, number>;
  totalRaw: number;
  maxTotalRaw: number;
  totalUms?: number;
  maxTotalUms?: number;
  percentage: number;
  finalGrade: string;
}

export interface GradeCalculatorViewProps {
  /** Which app is mounting the calculator ('org' on the-ants.org/calculator or 'study' on study.the-ants.org/calculator) */
  hostApp?: EcosystemAppId;
  /** Exam board options list */
  boards?: ExamBoardOption[];
  /** Subject catalog with paper and boundary definitions */
  subjects?: CalculatorSubjectMock[];
  /** Exam series boundary options */
  seriesOptions?: ExamSeriesOption[];
  /** Initial selected board */
  defaultBoardId?: ExamBoardId;
  /** Initial selected subject id */
  defaultSubjectId?: string;
  /** Initial selected exam series */
  defaultSeriesId?: ExamSeriesId;
  /** Optional callback when user saves a calculation snapshot to Study Tracker */
  onSaveSnapshot?: (snapshot: GradeCalculationSnapshot) => void;
  /** Hide top navigation bar when embedded inside another app shell */
  hideHeader?: boolean;
}

const FOCUS_RING =
  'focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-gray-900';

function computePaperUmsAndGrade(
  raw: number,
  paper: PaperComponentMock,
  seriesId: ExamSeriesId,
  gradingScale: 'A*-U' | '9-1'
): { ums: number; paperGrade: string; pct: number } {
  const clamped = Math.max(0, Math.min(paper.maxRaw, raw));
  const cutoffs = paper.seriesPaperCutoffs[seriesId];
  const maxUms = paper.maxUms ?? 100;

  let ratio = clamped / paper.maxRaw;
  if (clamped >= cutoffs.topGrade) {
    const span = Math.max(1, paper.maxRaw - cutoffs.topGrade);
    ratio = 0.9 + 0.1 * ((clamped - cutoffs.topGrade) / span);
  } else if (clamped >= cutoffs.gradeA) {
    const span = Math.max(1, cutoffs.topGrade - cutoffs.gradeA);
    ratio = 0.8 + 0.1 * ((clamped - cutoffs.gradeA) / span);
  } else if (clamped >= cutoffs.passC) {
    const span = Math.max(1, cutoffs.gradeA - cutoffs.passC);
    ratio = 0.6 + 0.2 * ((clamped - cutoffs.passC) / span);
  } else {
    ratio = 0.6 * (clamped / Math.max(1, cutoffs.passC));
  }

  const ums = Math.round(Math.min(maxUms, Math.max(0, ratio * maxUms)));
  const pct = Math.round((clamped / paper.maxRaw) * 100);

  let paperGrade = 'U';
  if (gradingScale === '9-1') {
    if (clamped >= cutoffs.topGrade) paperGrade = '9';
    else if (clamped >= Math.round((cutoffs.topGrade + cutoffs.gradeA) / 2)) paperGrade = '8';
    else if (clamped >= cutoffs.gradeA) paperGrade = '7';
    else if (clamped >= Math.round((cutoffs.gradeA + cutoffs.passC) / 2)) paperGrade = '6';
    else if (clamped >= cutoffs.passC) paperGrade = '5';
    else if (clamped >= Math.round(cutoffs.passC * 0.75)) paperGrade = '4';
    else paperGrade = 'U';
  } else {
    if (clamped >= cutoffs.topGrade) paperGrade = 'A*';
    else if (clamped >= cutoffs.gradeA) paperGrade = 'A';
    else if (clamped >= Math.round((cutoffs.gradeA + cutoffs.passC) / 2)) paperGrade = 'B';
    else if (clamped >= cutoffs.passC) paperGrade = 'C';
    else if (clamped >= Math.round(cutoffs.passC * 0.8)) paperGrade = 'D';
    else if (clamped >= Math.round(cutoffs.passC * 0.65)) paperGrade = 'E';
    else paperGrade = 'U';
  }

  return { ums, paperGrade, pct };
}

export function GradeCalculatorView({
  hostApp = 'org',
  boards = MOCK_EXAM_BOARDS,
  subjects = MOCK_CALCULATOR_SUBJECTS,
  seriesOptions = MOCK_EXAM_SERIES,
  defaultBoardId = 'edexcel-ial',
  defaultSubjectId = 'edexcel-ial-maths',
  defaultSeriesId = 'mj-2025',
  onSaveSnapshot,
  hideHeader = false,
}: GradeCalculatorViewProps) {
  const [selectedBoardId, setSelectedBoardId] = useState<ExamBoardId>(defaultBoardId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(defaultSubjectId);
  const [selectedSeriesId, setSelectedSeriesId] = useState<ExamSeriesId>(defaultSeriesId);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false);

  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const seriesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!subjectDropdownOpen && !seriesDropdownOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        subjectDropdownOpen &&
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(target)
      ) {
        setSubjectDropdownOpen(false);
      }
      if (
        seriesDropdownOpen &&
        seriesDropdownRef.current &&
        !seriesDropdownRef.current.contains(target)
      ) {
        setSeriesDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSubjectDropdownOpen(false);
        setSeriesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [subjectDropdownOpen, seriesDropdownOpen]);

  const boardSubjects = useMemo(
    () => subjects.filter((s) => s.boardId === selectedBoardId),
    [subjects, selectedBoardId]
  );

  const activeSubject = useMemo(
    () =>
      boardSubjects.find((s) => s.id === selectedSubjectId) ??
      boardSubjects[0] ??
      subjects[0]!,
    [boardSubjects, selectedSubjectId, subjects]
  );

  const activeSeries = useMemo(
    () =>
      seriesOptions.find((s) => s.id === selectedSeriesId) ?? seriesOptions[0]!,
    [seriesOptions, selectedSeriesId]
  );

  const [marksByPaper, setMarksByPaper] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const subj of subjects) {
      for (const p of subj.papers) {
        initial[p.id] = p.defaultRaw;
      }
    }
    return initial;
  });

  const handleBoardChange = (nextBoardId: string) => {
    const board = nextBoardId as ExamBoardId;
    setSelectedBoardId(board);
    const firstSubj = subjects.find((s) => s.boardId === board);
    if (firstSubj) {
      setSelectedSubjectId(firstSubj.id);
    }
    setSubjectDropdownOpen(false);
    setSeriesDropdownOpen(false);
    setSavedBanner(null);
  };

  const handlePaperMarkChange = (paperId: string, maxRaw: number, rawValue: number) => {
    const clamped = Math.max(
      0,
      Math.min(maxRaw, Math.round(Number.isNaN(rawValue) ? 0 : rawValue))
    );
    setMarksByPaper((prev) => ({ ...prev, [paperId]: clamped }));
    setSavedBanner(null);
  };

  const applySubjectPreset = (preset: 'zero' | 'top') => {
    const next = { ...marksByPaper };
    for (const paper of activeSubject.papers) {
      const cutoffs = paper.seriesPaperCutoffs[selectedSeriesId];
      next[paper.id] = preset === 'zero' ? 0 : cutoffs.topGrade;
    }
    setMarksByPaper(next);
    setSavedBanner(null);
  };

  const calculation = useMemo(() => {
    let totalRaw = 0;
    let totalUms = 0;

    const paperResults = activeSubject.papers.map((paper) => {
      const raw = marksByPaper[paper.id] ?? paper.defaultRaw;
      const { ums, paperGrade, pct } = computePaperUmsAndGrade(
        raw,
        paper,
        selectedSeriesId,
        activeSubject.gradingScale
      );
      totalRaw += raw;
      totalUms += ums;
      return { paper, raw, ums, paperGrade, pct };
    });

    const metricScore = activeSubject.isModularUms ? totalUms : totalRaw;
    const metricMax = activeSubject.isModularUms
      ? (activeSubject.maxTotalUms ?? 600)
      : activeSubject.maxTotalRaw;
    const metricUnit = activeSubject.isModularUms ? 'UMS' : 'marks';

    const boundaries = activeSubject.seriesBoundaries[selectedSeriesId];
    let finalGrade = 'U';
    let nextBoundary: { grade: string; needed: number; minScore: number } | null = null;

    for (let i = 0; i < boundaries.length; i++) {
      const b = boundaries[i]!;
      if (metricScore >= b.minScore) {
        finalGrade = b.grade;
        if (i > 0) {
          const higher = boundaries[i - 1]!;
          nextBoundary = {
            grade: higher.grade,
            needed: Math.max(0, higher.minScore - metricScore),
            minScore: higher.minScore,
          };
        }
        break;
      }
    }

    if (finalGrade === 'U' && boundaries.length > 0) {
      const lowestPass = boundaries[boundaries.length - 1]!;
      nextBoundary = {
        grade: lowestPass.grade,
        needed: Math.max(0, lowestPass.minScore - metricScore),
        minScore: lowestPass.minScore,
      };
    }

    const topBoundary = boundaries[0];
    const bufferAboveTop =
      topBoundary && metricScore >= topBoundary.minScore
        ? metricScore - topBoundary.minScore
        : 0;

    const percentage = Math.round((metricScore / Math.max(1, metricMax)) * 100);

    return {
      paperResults,
      totalRaw,
      totalUms,
      metricScore,
      metricMax,
      metricUnit,
      boundaries,
      finalGrade,
      nextBoundary,
      bufferAboveTop,
      percentage,
    };
  }, [activeSubject, marksByPaper, selectedSeriesId]);

  const handleSaveSnapshot = () => {
    const rawMarksByPaper: Record<string, number> = {};
    for (const item of calculation.paperResults) {
      rawMarksByPaper[item.paper.code] = item.raw;
    }
    const snapshot: GradeCalculationSnapshot = {
      boardId: selectedBoardId,
      subjectId: activeSubject.id,
      subjectCode: activeSubject.code,
      subjectTitle: activeSubject.title,
      seriesId: selectedSeriesId,
      rawMarksByPaper,
      totalRaw: calculation.totalRaw,
      maxTotalRaw: activeSubject.maxTotalRaw,
      totalUms: activeSubject.isModularUms ? calculation.totalUms : undefined,
      maxTotalUms: activeSubject.maxTotalUms,
      percentage: calculation.percentage,
      finalGrade: calculation.finalGrade,
    };

    onSaveSnapshot?.(snapshot);
    setSavedBanner(
      `Saved ${activeSubject.title} (${activeSeries.label}) — Grade ${calculation.finalGrade}`
    );
  };

  const isTopGrade =
    calculation.finalGrade === 'A*' ||
    calculation.finalGrade === '9' ||
    calculation.finalGrade === 'A' ||
    calculation.finalGrade === '8';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {!hideHeader && (
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
            <BrandHeaderBadge
              app={hostApp}
              productHref="/"
              showEndorsement={hostApp !== 'org'}
            />
            <div className="flex items-center gap-2.5">
              <a
                href="/"
                className={cn(
                  'rounded-lg text-xs font-medium text-foreground-muted hover:text-foreground px-2 py-1',
                  FOCUS_RING
                )}
              >
                Home
              </a>
              <ThemeToggle className={FOCUS_RING} />
              <AppSwitcher currentApp={hostApp} useLocalUrls />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-5xl px-4 py-10 pb-28 lg:pb-12 sm:px-6 space-y-10">
        {/* Heading & Exam Board Switcher */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between border-b border-border pb-8">
          <div className="space-y-1.5">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Grade Calculator
            </h1>
            <p className="text-sm sm:text-base text-foreground-muted">
              Slide your paper marks to see how they convert across recent exam sessions.
            </p>
          </div>

          <Tabs
            variant="segmented"
            value={selectedBoardId}
            onValueChange={handleBoardChange}
            items={boards.map((b) => ({
              value: b.id,
              label: b.shortName,
            }))}
          />
        </div>

        {/* Paired Subject Dropdown + Exam Session Dropdown Row with gap-8 on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-8">
          {/* 1. Custom Subject Dropdown Box (8 cols) */}
          <div ref={subjectDropdownRef} className="relative sm:col-span-8">
            <label
              id="subject-dropdown-label"
              className="block text-xs font-semibold text-foreground-muted mb-1.5"
            >
              Subject ({boardSubjects.length} available)
            </label>
            <button
              type="button"
              aria-labelledby="subject-dropdown-label"
              aria-haspopup="listbox"
              aria-expanded={subjectDropdownOpen}
              onClick={() => {
                setSubjectDropdownOpen((prev) => !prev);
                setSeriesDropdownOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-xl border bg-surface-card px-4 py-3 text-left transition-all duration-150',
                FOCUS_RING,
                subjectDropdownOpen
                  ? 'border-yellow-500 ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900'
                  : 'border-border hover:border-border-hover'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded-lg bg-primary-tint px-2.5 py-1 font-mono text-xs font-bold text-primary shrink-0">
                  {activeSubject.code}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {activeSubject.title}
                  </p>
                  <p className="truncate text-xs text-foreground-muted">
                    {activeSubject.levelLabel}
                  </p>
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-150',
                  subjectDropdownOpen && 'rotate-180 text-primary'
                )}
                aria-hidden="true"
              />
            </button>

            {subjectDropdownOpen && (
              <div
                role="listbox"
                aria-labelledby="subject-dropdown-label"
                className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border-hover bg-surface-elevated p-2 shadow-[var(--shadow-tier-3)]"
              >
                {boardSubjects.map((subj) => {
                  const isSelected = subj.id === activeSubject.id;
                  return (
                    <button
                      key={subj.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedSubjectId(subj.id);
                        setSubjectDropdownOpen(false);
                        setSavedBanner(null);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors',
                        FOCUS_RING,
                        isSelected
                          ? 'bg-primary-tint/60 text-foreground'
                          : 'text-foreground hover:bg-surface-inset'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 font-mono text-xs font-bold shrink-0',
                            isSelected
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-inset text-primary'
                          )}
                        >
                          {subj.code}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {subj.title}
                          </p>
                          <p className="truncate text-xs text-foreground-muted">
                            {subj.levelLabel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs text-foreground-muted">
                          {subj.papers.length} papers
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Matching Exam Session Dropdown Box (4 cols) */}
          <div ref={seriesDropdownRef} className="relative sm:col-span-4">
            <label
              id="series-dropdown-label"
              className="block text-xs font-semibold text-foreground-muted mb-1.5"
            >
              Exam Session
            </label>
            <button
              type="button"
              aria-labelledby="series-dropdown-label"
              aria-haspopup="listbox"
              aria-expanded={seriesDropdownOpen}
              onClick={() => {
                setSeriesDropdownOpen((prev) => !prev);
                setSubjectDropdownOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-xl border bg-surface-card px-4 py-3 text-left transition-all duration-150',
                FOCUS_RING,
                seriesDropdownOpen
                  ? 'border-yellow-500 ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900'
                  : 'border-border hover:border-border-hover'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Calendar className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {activeSeries.label}
                  </p>
                  <p className="truncate text-xs text-foreground-muted">
                    {activeSeries.tag} series boundaries
                  </p>
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-150',
                  seriesDropdownOpen && 'rotate-180 text-primary'
                )}
                aria-hidden="true"
              />
            </button>

            {seriesDropdownOpen && (
              <div
                role="listbox"
                aria-labelledby="series-dropdown-label"
                className="absolute left-0 right-0 z-40 mt-2 rounded-2xl border border-border-hover bg-surface-elevated p-2 shadow-[var(--shadow-tier-3)]"
              >
                {seriesOptions.map((series) => {
                  const active = series.id === selectedSeriesId;
                  return (
                    <button
                      key={series.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setSelectedSeriesId(series.id);
                        setSeriesDropdownOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors',
                        FOCUS_RING,
                        active
                          ? 'bg-primary-tint/60 text-foreground font-semibold'
                          : 'text-foreground hover:bg-surface-inset'
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold">{series.label}</p>
                        <p className="text-xs text-foreground-muted">
                          {series.tag} session
                        </p>
                      </div>
                      {active && (
                        <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Workspace: Single Column on Mobile, 12-Col Split on Desktop */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
          {/* Left: Clean Paper Mark List */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-semibold text-foreground">
                Paper Marks ({activeSubject.papers.length})
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => applySubjectPreset('top')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:underline',
                    FOCUS_RING
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    Fill {activeSubject.gradingScale === '9-1' ? 'Grade 9' : 'A*'} marks
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => applySubjectPreset('zero')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground-muted hover:text-foreground',
                    FOCUS_RING
                  )}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-border rounded-2xl border border-border bg-surface-card">
              {calculation.paperResults.map(({ paper, raw, ums, paperGrade }) => (
                <div key={paper.id} className="p-5 space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor={`mark-input-${paper.id}`}
                      className="flex items-baseline gap-2.5 min-w-0 cursor-pointer"
                    >
                      <span className="font-mono text-xs font-semibold text-primary shrink-0">
                        {paper.code}
                      </span>
                      <span className="truncate text-sm font-semibold text-foreground">
                        {paper.title}
                      </span>
                    </label>

                    <span className="font-mono tabular-nums text-xs text-foreground-muted shrink-0">
                      {activeSubject.isModularUms
                        ? `${ums} UMS · ${paperGrade}`
                        : `Grade ${paperGrade}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={paper.maxRaw}
                      value={raw}
                      aria-label={`${paper.code} ${paper.title} slider`}
                      onChange={(e) =>
                        handlePaperMarkChange(
                          paper.id,
                          paper.maxRaw,
                          Number(e.target.value)
                        )
                      }
                      className={cn(
                        'h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-surface-inset accent-[var(--primary)]',
                        FOCUS_RING
                      )}
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        id={`mark-input-${paper.id}`}
                        type="number"
                        min={0}
                        max={paper.maxRaw}
                        value={raw}
                        onChange={(e) =>
                          handlePaperMarkChange(
                            paper.id,
                            paper.maxRaw,
                            Number(e.target.value)
                          )
                        }
                        className={cn(
                          'w-14 rounded-lg border border-border bg-background px-2 py-1 text-center font-mono tabular-nums text-sm font-semibold text-foreground focus:border-yellow-500',
                          FOCUS_RING
                        )}
                      />
                      <span className="font-mono tabular-nums text-xs text-foreground-muted w-9">
                        / {paper.maxRaw}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right (Desktop): Sticky Result Summary Card */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24 rounded-2xl border border-border bg-surface-card p-6 sm:p-7 space-y-6 shadow-[var(--shadow-tier-1)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {activeSubject.title}
                </h2>
                <p className="text-xs text-foreground-muted">
                  {activeSeries.label} boundaries
                </p>
                <div className="pt-2 flex items-baseline gap-2">
                  <span className="font-mono tabular-nums text-3xl sm:text-4xl font-extrabold text-foreground">
                    {calculation.metricScore}
                  </span>
                  <span className="font-mono tabular-nums text-sm text-foreground-muted">
                    / {calculation.metricMax} {calculation.metricUnit}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-mono text-2xl font-extrabold',
                  isTopGrade
                    ? 'bg-primary text-on-primary'
                    : 'border border-border bg-surface-inset text-foreground'
                )}
                aria-label={`Overall grade ${calculation.finalGrade}`}
              >
                {calculation.finalGrade}
              </div>
            </div>

            {/* Progress Bar & Humanized Next-Step Guidance */}
            <div className="space-y-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-inset">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, calculation.percentage)}%` }}
                />
              </div>

              <p className="text-sm text-foreground-muted leading-relaxed">
                {calculation.nextBoundary ? (
                  <>
                    You need{' '}
                    <strong className="font-mono font-semibold text-foreground">
                      {calculation.nextBoundary.needed} more {calculation.metricUnit}
                    </strong>{' '}
                    to reach{' '}
                    <strong className="text-foreground">
                      Grade {calculation.nextBoundary.grade}
                    </strong>{' '}
                    ({calculation.nextBoundary.minScore} {calculation.metricUnit}).
                  </>
                ) : (
                  <>
                    Solid{' '}
                    <strong className="text-foreground">
                      Grade {calculation.finalGrade}
                    </strong>{' '}
                    — you are{' '}
                    <strong className="font-mono font-semibold text-foreground">
                      {calculation.bufferAboveTop} {calculation.metricUnit}
                    </strong>{' '}
                    above the top boundary.
                  </>
                )}
              </p>
            </div>

            {/* Clean Session Boundary Strip */}
            <div className="grid grid-cols-6 gap-1.5 pt-4 border-t border-border">
              {calculation.boundaries.map((b) => {
                const isCurrent = b.grade === calculation.finalGrade;
                return (
                  <div
                    key={b.grade}
                    className={cn(
                      'flex flex-col items-center rounded-xl py-2 text-center transition-colors',
                      isCurrent
                        ? 'bg-primary-tint text-on-primary-tint font-bold'
                        : 'text-foreground-muted'
                    )}
                  >
                    <span className="font-mono text-xs font-bold">{b.grade}</span>
                    <span className="font-mono tabular-nums text-[11px] opacity-80 mt-0.5">
                      {b.minScore}
                    </span>
                  </div>
                );
              })}
            </div>

            {savedBanner && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl bg-success-tint px-3.5 py-2.5 text-xs font-medium text-on-success-tint"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{savedBanner}</span>
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              className={FOCUS_RING}
              leftIcon={<BookmarkCheck className="h-4 w-4" />}
              onClick={handleSaveSnapshot}
            >
              Save to Study Tracker
            </Button>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Total Score & Grade Summary Bar (sticky bottom-0 z-50) */}
      <div className="sticky bottom-0 z-50 border-t border-border-hover bg-surface-elevated/95 px-4 py-3 backdrop-blur-md shadow-[var(--shadow-tier-3)] lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-extrabold',
                isTopGrade
                  ? 'bg-primary text-on-primary'
                  : 'border border-border bg-surface-inset text-foreground'
              )}
              aria-label={`Overall grade ${calculation.finalGrade}`}
            >
              {calculation.finalGrade}
            </div>

            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono tabular-nums text-lg font-extrabold text-foreground">
                  {calculation.metricScore}
                </span>
                <span className="font-mono tabular-nums text-xs text-foreground-muted">
                  / {calculation.metricMax} {calculation.metricUnit}
                </span>
              </div>
              <p className="truncate text-xs text-foreground-muted">
                {calculation.nextBoundary
                  ? `+${calculation.nextBoundary.needed} ${calculation.metricUnit} to Grade ${calculation.nextBoundary.grade}`
                  : `Top Grade ${calculation.finalGrade} (+${calculation.bufferAboveTop} ${calculation.metricUnit})`}
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className={cn('shrink-0', FOCUS_RING)}
            leftIcon={<BookmarkCheck className="h-4 w-4" />}
            onClick={handleSaveSnapshot}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
