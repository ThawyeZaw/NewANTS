'use client';

import React, { useMemo, useState } from 'react';
import {
  Award,
  BookmarkCheck,
  Calculator,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  AppSwitcher,
  Badge,
  BrandHeaderBadge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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

/**
 * Piecewise linear UMS interpolation for modular Pearson Edexcel units
 * using the paper's series-specific [passC (60%), gradeA (80%), topGrade (90%)] raw cutoffs.
 */
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
    if (clamped >= cutoffs.topGrade) paperGrade = 'a*';
    else if (clamped >= cutoffs.gradeA) paperGrade = 'a';
    else if (clamped >= Math.round((cutoffs.gradeA + cutoffs.passC) / 2)) paperGrade = 'b';
    else if (clamped >= cutoffs.passC) paperGrade = 'c';
    else if (clamped >= Math.round(cutoffs.passC * 0.8)) paperGrade = 'd';
    else if (clamped >= Math.round(cutoffs.passC * 0.65)) paperGrade = 'e';
    else paperGrade = 'u';
  }

  return { ums, paperGrade: paperGrade.toUpperCase(), pct };
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

  // Filter subjects for current board
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

  // Raw marks dictionary keyed by paper.id
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
    setSavedBanner(null);
  };

  const handlePaperMarkChange = (paperId: string, maxRaw: number, rawValue: number) => {
    const clamped = Math.max(0, Math.min(maxRaw, Math.round(Number.isNaN(rawValue) ? 0 : rawValue)));
    setMarksByPaper((prev) => ({ ...prev, [paperId]: clamped }));
    setSavedBanner(null);
  };

  const applySubjectPreset = (preset: 'zero' | 'passC' | 'gradeA' | 'top' | 'max') => {
    const next = { ...marksByPaper };
    for (const paper of activeSubject.papers) {
      const cutoffs = paper.seriesPaperCutoffs[selectedSeriesId];
      if (preset === 'zero') next[paper.id] = 0;
      else if (preset === 'passC') next[paper.id] = cutoffs.passC;
      else if (preset === 'gradeA') next[paper.id] = cutoffs.gradeA;
      else if (preset === 'top') next[paper.id] = cutoffs.topGrade;
      else next[paper.id] = paper.maxRaw;
    }
    setMarksByPaper(next);
    setSavedBanner(null);
  };

  // Live calculation for activeSubject
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
      return {
        paper,
        raw,
        ums,
        paperGrade,
        pct,
      };
    });

    const metricScore = activeSubject.isModularUms ? totalUms : totalRaw;
    const metricMax = activeSubject.isModularUms
      ? (activeSubject.maxTotalUms ?? 600)
      : activeSubject.maxTotalRaw;
    const metricUnit = activeSubject.isModularUms ? 'UMS' : 'Raw Marks';

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

    if (onSaveSnapshot) {
      onSaveSnapshot(snapshot);
    }
    setSavedBanner(
      `Saved ${activeSubject.code} Grade ${calculation.finalGrade} (${calculation.metricScore}/${calculation.metricMax} ${calculation.metricUnit}) snapshot!`
    );
  };

  const isTopGrade =
    calculation.finalGrade === 'A*' ||
    calculation.finalGrade === '9' ||
    calculation.finalGrade === 'A' ||
    calculation.finalGrade === '8';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Shared Ecosystem Top Header */}
      {!hideHeader && (
        <header className="sticky top-0 z-30 border-b border-border bg-surface-card/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <BrandHeaderBadge
                app={hostApp}
                productHref="/"
                showEndorsement={hostApp !== 'org'}
              />
              <span className="hidden sm:inline-block h-4 w-px bg-border" />
              <Badge variant="subject" code="/calculator" mono>
                IGCSE & IAL Grade Calculator
              </Badge>
            </div>
            <div className="flex items-center gap-2.5">
              <a
                href="/"
                className="text-xs font-semibold text-foreground-muted hover:text-foreground px-2 py-1"
              >
                ← Design Studio
              </a>
              <ThemeToggle showLabel />
              <AppSwitcher currentApp={hostApp} useLocalUrls />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Title & Quick Preset Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="active-filter" code="GUEST ACCESSIBLE">
                No Login Required
              </Badge>
              <Badge variant="verified" dot>
                Official Session Boundaries
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              IGCSE & IAL Grade Calculator
            </h1>
            <p className="text-sm text-foreground-muted max-w-2xl">
              Slide or type your paper marks below to instantly calculate your composite
              grade, UMS score, and exact marks needed for the next boundary.
            </p>
          </div>

          {/* Global Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="label-caps text-foreground-subtle mr-1">
              QUICK FILL:
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => applySubjectPreset('passC')}
            >
              Pass (C / 5)
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => applySubjectPreset('gradeA')}
            >
              Grade A / 7
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={() => applySubjectPreset('top')}
            >
              Target {activeSubject.gradingScale === '9-1' ? '9' : 'A*'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => applySubjectPreset('zero')}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Step 1: Exam Board Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label-caps text-foreground-muted">
              1. SELECT EXAM BOARD & QUALIFICATION
            </span>
            <span className="font-mono text-xs text-foreground-subtle">
              {boards.find((b) => b.id === selectedBoardId)?.fullName}
            </span>
          </div>
          <Tabs
            variant="segmented"
            value={selectedBoardId}
            onValueChange={handleBoardChange}
            items={boards.map((b) => ({
              value: b.id,
              label: b.shortName,
              badge: b.scaleBadge,
            }))}
          />
        </div>

        {/* Main Two-Column Studio Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column (7 cols): Subject Selector, Series Switcher & Paper Sliders */}
          <div className="lg:col-span-7 space-y-6">
            {/* Subject & Exam Series Card */}
            <Card>
              <CardHeader
                action={
                  <Badge variant="subject" code={activeSubject.code}>
                    {activeSubject.gradingScale}
                  </Badge>
                }
              >
                <CardTitle>2. Choose Subject & Exam Series</CardTitle>
                <CardDescription>
                  Compare how your raw score converts across different exam sessions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject Pills */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {boardSubjects.map((subj) => {
                    const isSelected = subj.id === activeSubject.id;
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(subj.id);
                          setSavedBanner(null);
                        }}
                        className={cn(
                          'flex flex-col items-start rounded-xl border p-3.5 text-left transition-all duration-150',
                          isSelected
                            ? 'border-primary bg-primary-tint/50 shadow-2xs'
                            : 'border-border bg-surface-card hover:border-border-hover hover:bg-surface-inset'
                        )}
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-primary">
                            {subj.code}
                          </span>
                          <Badge
                            variant={isSelected ? 'primary' : 'editorial'}
                            mono
                          >
                            {subj.papers.length} Papers
                          </Badge>
                        </div>
                        <span className="mt-1 text-sm font-bold text-foreground">
                          {subj.title}
                        </span>
                        <span className="mt-0.5 text-[11px] text-foreground-muted">
                          {subj.levelLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Exam Series Boundary Switcher */}
                <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Exam Session Boundary Table:
                  </span>
                  <div className="inline-flex flex-wrap items-center gap-1.5">
                    {seriesOptions.map((series) => {
                      const active = series.id === selectedSeriesId;
                      return (
                        <button
                          key={series.id}
                          type="button"
                          onClick={() => setSelectedSeriesId(series.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all',
                            active
                              ? 'border-primary bg-primary text-on-primary shadow-2xs'
                              : 'border-border bg-surface-inset text-foreground-muted hover:text-foreground'
                          )}
                        >
                          <span>{series.label}</span>
                          <span className="font-mono text-[10px] opacity-80">
                            {series.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Paper Mark Sliders + Synced Numeric Inputs */}
            <Card>
              <CardHeader
                action={
                  <Badge variant="editorial" mono>
                    TOTAL MAX: {activeSubject.maxTotalRaw} RAW
                  </Badge>
                }
              >
                <CardTitle>3. Enter Paper / Unit Raw Marks</CardTitle>
                <CardDescription>
                  Drag the slider, type your exact mark, or tap a boundary preset chip below each paper.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculation.paperResults.map(({ paper, raw, ums, paperGrade, pct }) => {
                  const cutoffs = paper.seriesPaperCutoffs[selectedSeriesId];
                  const isHighPaper =
                    paperGrade === 'A*' ||
                    paperGrade === 'A' ||
                    paperGrade === '9' ||
                    paperGrade === '8' ||
                    paperGrade === '7';

                  return (
                    <div
                      key={paper.id}
                      className="rounded-xl border border-border bg-surface-inset/35 p-4 transition-colors hover:border-border-hover"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-primary">
                            {paper.code}
                          </span>
                          <h4 className="text-sm font-bold text-foreground">
                            {paper.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeSubject.isModularUms && (
                            <Badge variant="active-filter" mono>
                              {ums} / {paper.maxUms ?? 100} UMS
                            </Badge>
                          )}
                          <Badge
                            variant={isHighPaper ? 'verified' : 'editorial'}
                            mono
                          >
                            Grade {paperGrade} ({pct}%)
                          </Badge>
                        </div>
                      </div>

                      {/* Dual Slider + JetBrains Mono Numeric Box */}
                      <div className="mt-3 flex items-center gap-4">
                        <div className="relative flex-1">
                          <input
                            type="range"
                            min={0}
                            max={paper.maxRaw}
                            value={raw}
                            aria-label={`${paper.code} ${paper.title} raw mark slider`}
                            onChange={(e) =>
                              handlePaperMarkChange(
                                paper.id,
                                paper.maxRaw,
                                Number(e.target.value)
                              )
                            }
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-border accent-[var(--primary)]"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={paper.maxRaw}
                            value={raw}
                            aria-label={`${paper.code} raw mark input`}
                            onChange={(e) =>
                              handlePaperMarkChange(
                                paper.id,
                                paper.maxRaw,
                                Number(e.target.value)
                              )
                            }
                            className="w-16 rounded-lg border border-border bg-surface-card px-2.5 py-1.5 text-center font-mono tabular-nums text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <span className="font-mono tabular-nums text-xs font-semibold text-foreground-muted">
                            / {paper.maxRaw}
                          </span>
                        </div>
                      </div>

                      {/* Per-Paper Quick Boundary Preset Chips */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle">
                        <span className="font-mono text-[11px] text-foreground-subtle">
                          {paper.weightLabel} · Cutoffs: C={cutoffs.passC} · A={cutoffs.gradeA} ·{' '}
                          {activeSubject.gradingScale === '9-1' ? '9' : 'A*'}={cutoffs.topGrade}
                        </span>
                        <div className="flex items-center gap-1">
                          {[
                            { label: '0', val: 0 },
                            { label: `Pass (${cutoffs.passC})`, val: cutoffs.passC },
                            { label: `A (${cutoffs.gradeA})`, val: cutoffs.gradeA },
                            {
                              label: `${activeSubject.gradingScale === '9-1' ? '9' : 'A*'} (${cutoffs.topGrade})`,
                              val: cutoffs.topGrade,
                            },
                            { label: `Max (${paper.maxRaw})`, val: paper.maxRaw },
                          ].map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() =>
                                handlePaperMarkChange(paper.id, paper.maxRaw, chip.val)
                              }
                              className={cn(
                                'rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors',
                                raw === chip.val
                                  ? 'bg-primary text-on-primary'
                                  : 'bg-surface-card text-foreground-muted border border-border hover:border-border-hover hover:text-foreground'
                              )}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (5 cols): Sticky Live Grade Result Studio Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-5">
            <Card variant="elevated">
              <CardHeader
                action={
                  <Badge variant="subject" mono>
                    {seriesOptions.find((s) => s.id === selectedSeriesId)?.label}
                  </Badge>
                }
              >
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span>Live Qualification Result</span>
                </CardTitle>
                <CardDescription>
                  {activeSubject.code} · {activeSubject.title}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Central Grade & Total Score Display */}
                <div className="flex items-center justify-between rounded-2xl border border-primary-tint-border bg-primary-tint/40 p-5">
                  <div className="space-y-1">
                    <span className="label-caps text-on-primary-tint">
                      PROJECTED OVERALL GRADE
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono tabular-nums text-3xl font-extrabold text-foreground">
                        {calculation.metricScore}
                      </span>
                      <span className="font-mono tabular-nums text-sm font-semibold text-foreground-muted">
                        / {calculation.metricMax} {calculation.metricUnit}
                      </span>
                    </div>
                    <p className="font-mono tabular-nums text-xs text-foreground-muted">
                      Raw Total: {calculation.totalRaw} / {activeSubject.maxTotalRaw} (
                      {calculation.percentage}%)
                    </p>
                  </div>

                  {/* Oversized Grade Emblem */}
                  <div
                    className={cn(
                      'flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border-2 font-mono shadow-sm',
                      isTopGrade
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-border-hover bg-surface-card text-foreground'
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      GRADE
                    </span>
                    <span className="text-3xl font-extrabold leading-none mt-0.5">
                      {calculation.finalGrade}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & "Marks to Next Grade" Helper */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground inline-flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span>Boundary Progress</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-primary">
                      {calculation.percentage}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-inset border border-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200 ease-out"
                      style={{ width: `${Math.min(100, calculation.percentage)}%` }}
                    />
                  </div>

                  {calculation.nextBoundary ? (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-inset/60 px-3.5 py-2.5 text-xs">
                      <span className="text-foreground-muted">
                        Next Grade Target:{' '}
                        <strong className="font-mono text-foreground">
                          Grade {calculation.nextBoundary.grade}
                        </strong>{' '}
                        ({calculation.nextBoundary.minScore} {calculation.metricUnit})
                      </span>
                      <Badge variant="active-filter" mono>
                        +{calculation.nextBoundary.needed} {calculation.metricUnit} needed
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-success-border bg-success-tint px-3.5 py-2.5 text-xs text-on-success-tint">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <Award className="h-4 w-4" />
                        <span>
                          Top Grade ({calculation.finalGrade}) Achieved!
                        </span>
                      </span>
                      <span className="font-mono font-bold">
                        +{calculation.bufferAboveTop} {calculation.metricUnit} above cutoff
                      </span>
                    </div>
                  )}
                </div>

                {/* Official Session Boundary Threshold Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="label-caps text-foreground-subtle">
                      SESSION GRADE BOUNDARIES ({calculation.metricUnit.toUpperCase()})
                    </span>
                    <span className="font-mono text-[11px] text-foreground-subtle">
                      Max {calculation.metricMax}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {calculation.boundaries.map((b) => {
                      const isCurrentGrade = b.grade === calculation.finalGrade;
                      const isPassed = calculation.metricScore >= b.minScore;
                      return (
                        <div
                          key={b.grade}
                          className={cn(
                            'flex flex-col items-center justify-center rounded-xl border py-2 px-1 text-center transition-all',
                            isCurrentGrade
                              ? 'border-primary bg-primary text-on-primary shadow-xs scale-[1.03]'
                              : isPassed
                                ? 'border-success-border bg-success-tint/50 text-on-success-tint'
                                : 'border-border bg-surface-inset/40 text-foreground-muted'
                          )}
                        >
                          <span className="font-mono text-xs font-extrabold">
                            {b.grade}
                          </span>
                          <span className="font-mono tabular-nums text-[11px] opacity-90">
                            {b.minScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {savedBanner && (
                  <div className="flex items-center gap-2 rounded-xl border border-success-border bg-success-tint px-3.5 py-2.5 text-xs font-semibold text-on-success-tint">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{savedBanner}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                  onClick={() => applySubjectPreset('zero')}
                >
                  Clear All
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<BookmarkCheck className="h-4 w-4" />}
                  onClick={handleSaveSnapshot}
                >
                  Save to Study Tracker
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

