'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import type {
  EdexcelMathsSuiteAwardMode,
  EdexcelMathsUnitCode,
} from '@ants/shared-types';
import {
  AntMascot,
  AppSwitcher,
  BrandHeaderBadge,
  Button,
  ThemeToggle,
  cn,
  emitMiloCheer,
  type EcosystemAppId,
} from '@ants/ui';
import {
  calculateRouteGrade,
  calculateSubjectGrade,
  isDirectUmsOnlySubject,
  supportsDirectUms,
  type EngineRouteInput,
  type EngineSubjectInput,
} from '../engine/calculator-engine';
import {
  EDEXCEL_IAL_NO_OCT_NOV_UNITS,
  isOctNovSeriesId,
} from '../engine/edexcel-maths-suite';
import {
  MOCK_CALCULATOR_SUBJECTS,
  MOCK_EXAM_BOARDS,
  MOCK_EXAM_SERIES,
  type ExamBoardId,
  type ExamBoardOption,
} from '../mocks/calculator.mock';
import {
  CALCULATOR_FOCUS_RING,
  GradeTierProgressBar,
  MiloGradeSpotlight,
  PearsonConverterLink,
  isPeakGradeLabel,
} from './CalculatorMiloSpotlight';
import {
  EDEXCEL_MATHS_SUITE_PRESETS,
  EdexcelMathsSuiteView,
} from './EdexcelMathsSuiteView';

export interface CalculatorSeriesOption {
  id: string;
  label: string;
  tag: string;
}

export interface GradeCalculationSnapshot {
  boardId: ExamBoardId;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  seriesId: string;
  routeId?: string;
  routeLabel?: string;
  inputMode?: 'raw' | 'ums';
  perPaperSeriesById?: Record<string, string>;
  rawMarksByPaper: Record<string, number>;
  umsMarksByPaper?: Record<string, number>;
  totalRaw: number;
  maxTotalRaw: number;
  totalUms?: number;
  maxTotalUms?: number;
  percentage: number;
  finalGrade: string;
}

export interface CalculatorSaveFeedback {
  tone: 'success' | 'info' | 'error';
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface GradeCalculatorViewProps {
  /** Which app is mounting the calculator ('org' on the-ants.org/calculator or 'study' on study.the-ants.org/calculator) */
  hostApp?: EcosystemAppId;
  /** Exam board options list */
  boards?: ExamBoardOption[];
  /** Subject catalog with paper, route, and boundary definitions */
  subjects?: EngineSubjectInput[];
  /** Exam series boundary options */
  seriesOptions?: CalculatorSeriesOption[];
  /** Initial selected board */
  defaultBoardId?: ExamBoardId;
  /** Initial selected subject id */
  defaultSubjectId?: string;
  /** Initial selected exam series */
  defaultSeriesId?: string;
  /** Optional starting wizard step (1 = Board & Subject, 2 = Options, 3 = Marks & Grade) */
  initialStep?: 1 | 2 | 3;
  /** Optional callback when user saves a calculation snapshot to Study Tracker */
  onSaveSnapshot?: (snapshot: GradeCalculationSnapshot) => void | Promise<void>;
  /** Optional container-managed save status feedback (disables default mock banner when provided) */
  saveFeedback?: CalculatorSaveFeedback | null;
  /** Optional loading state while saving snapshot */
  isSaving?: boolean;
  /** Hide top navigation bar when embedded inside another app shell */
  hideHeader?: boolean;
}

function uniqueOrdered<T>(items: Array<T | undefined>): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (item !== undefined && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function formatBoardScaleBadge(boardId: ExamBoardId, rawBadge: string): string {
  if (boardId === 'edexcel-ial' || boardId === 'caie-alevel') return 'Grades A*–U';
  if (boardId === 'caie-igcse') return 'Grades A*–G';
  if (boardId === 'edexcel-igcse') return 'Grades 9–1';
  return rawBadge.replace(/^(UMS|PUM|Linear|Extended)\s*·\s*/i, 'Grades ');
}

function formatSubjectSubtitle(subj: EngineSubjectInput): string {
  if (subj.calculatorMode === 'edexcel_maths_suite') {
    return '14 Units · Maths & Further Maths';
  }
  if (subj.boardId === 'edexcel-ial') {
    return isDirectUmsOnlySubject(subj)
      ? `${subj.papers.length} Units · Direct UMS`
      : `${subj.papers.length} Units · AS & Full IAL`;
  }
  if (subj.boardId === 'caie-alevel') {
    return `${subj.papers.length} Papers · AS & Full A-Level`;
  }
  const hasExtCore =
    subj.routes?.some((r) => r.tier === 'Extended') &&
    subj.routes?.some((r) => r.tier === 'Core');
  if (hasExtCore) return 'Extended & Core';
  const hasHighFnd =
    subj.routes?.some((r) => r.tier === 'Higher') &&
    subj.routes?.some((r) => r.tier === 'Foundation');
  if (hasHighFnd) return 'Higher & Foundation';
  return `${subj.papers.length} ${subj.papers.length === 1 ? 'Paper' : 'Papers'}`;
}

function getBoardGreeting(boardId: ExamBoardId): string {
  switch (boardId) {
    case 'edexcel-ial':
      return 'Pick a subject — Maths jumps straight into all 14 units at once!';
    case 'caie-alevel':
      return 'Pick a Cambridge AS or A-Level subject to calculate your exact grade.';
    case 'caie-igcse':
      return 'Choose a Cambridge IGCSE subject — switch tiers and variants in one click.';
    case 'edexcel-igcse':
      return 'Pick an Edexcel IGCSE (9–1) subject — supports raw marks and UMS!';
  }
}

export function GradeCalculatorView({
  hostApp = 'org',
  boards = MOCK_EXAM_BOARDS,
  subjects = MOCK_CALCULATOR_SUBJECTS,
  seriesOptions = MOCK_EXAM_SERIES,
  defaultBoardId = 'edexcel-ial',
  defaultSubjectId = 'edexcel-ial-maths',
  defaultSeriesId = 'mj-2025',
  initialStep = 1,
  onSaveSnapshot,
  saveFeedback,
  isSaving = false,
  hideHeader = false,
}: GradeCalculatorViewProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);
  const [selectedBoardId, setSelectedBoardId] = useState<ExamBoardId>(defaultBoardId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(defaultSubjectId);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(defaultSeriesId);
  const [inputModeBySubject, setInputModeBySubject] = useState<Record<string, 'raw' | 'ums'>>({});
  const [umsEditedSubjects, setUmsEditedSubjects] = useState<Record<string, boolean>>({});
  const [perPaperSeriesOverrides, setPerPaperSeriesOverrides] = useState<Record<string, string>>(
    {}
  );
  const [subjectSearch, setSubjectSearch] = useState('');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const [marksByPaper, setMarksByPaper] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const subj of subjects) {
      for (const p of subj.papers) {
        initial[p.id] = p.defaultRaw;
      }
    }
    return initial;
  });
  const [umsByPaper, setUmsByPaper] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const subj of subjects) {
      for (const p of subj.papers) {
        initial[p.id] = Math.round((p.maxUms ?? 100) * 0.85);
      }
    }
    return initial;
  });

  // Lifted 14-Unit Edexcel Maths Suite state so switching subjects/steps preserves entries
  const [suiteSelectedUnits, setSuiteSelectedUnits] = useState<EdexcelMathsUnitCode[]>(() => [
    ...EDEXCEL_MATHS_SUITE_PRESETS[3]!.units,
  ]);
  const [suiteAwardMode, setSuiteAwardMode] = useState<EdexcelMathsSuiteAwardMode>('auto');
  const [suiteInputMode, setSuiteInputMode] = useState<'raw' | 'ums'>('ums');
  const [suiteRawMarks, setSuiteRawMarks] = useState<Record<string, number>>(() => {
    const maths = subjects.find((s) => s.id === 'edexcel-ial-maths');
    const init: Record<string, number> = {};
    for (const p of maths?.papers ?? []) {
      init[p.code] = p.defaultRaw;
    }
    return init;
  });
  const [suiteUmsMarks, setSuiteUmsMarks] = useState<Record<string, number>>(() => {
    const maths = subjects.find((s) => s.id === 'edexcel-ial-maths');
    const init: Record<string, number> = {};
    for (const p of maths?.papers ?? []) {
      init[p.code] = Math.round((p.maxUms ?? 100) * 0.85);
    }
    return init;
  });
  const [suiteSeriesOverrides, setSuiteSeriesOverrides] = useState<Record<string, string>>({});

  const effectiveBoardId = useMemo(
    () =>
      boards.some((b) => b.id === selectedBoardId)
        ? selectedBoardId
        : (boards[0]?.id ?? defaultBoardId),
    [boards, selectedBoardId, defaultBoardId]
  );

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === effectiveBoardId) ?? boards[0]!,
    [boards, effectiveBoardId]
  );

  const boardSubjects = useMemo(
    () => subjects.filter((s) => s.boardId === effectiveBoardId),
    [subjects, effectiveBoardId]
  );

  const filteredBoardSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return boardSubjects;
    return boardSubjects.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        formatSubjectSubtitle(s).toLowerCase().includes(q)
    );
  }, [boardSubjects, subjectSearch]);

  const activeSubject = useMemo(
    () =>
      boardSubjects.find((s) => s.id === selectedSubjectId) ??
      boardSubjects[0] ??
      subjects[0]!,
    [boardSubjects, selectedSubjectId, subjects]
  );

  const isMathsSuite = activeSubject.calculatorMode === 'edexcel_maths_suite';
  const canUseDirectUms = supportsDirectUms(activeSubject);
  const isUmsOnly = isDirectUmsOnlySubject(activeSubject);

  const activeRoutes = useMemo<EngineRouteInput[]>(
    () => activeSubject.routes ?? [],
    [activeSubject.routes]
  );

  const activeRoute = useMemo<EngineRouteInput | null>(() => {
    if (activeRoutes.length === 0) return null;
    return (
      activeRoutes.find((r) => r.id === selectedRouteId) ??
      (activeSubject.defaultRouteId
        ? activeRoutes.find((r) => r.id === activeSubject.defaultRouteId)
        : undefined) ??
      activeRoutes[0]!
    );
  }, [activeRoutes, selectedRouteId, activeSubject.defaultRouteId]);

  const activeInputMode: 'raw' | 'ums' = useMemo(() => {
    if (!canUseDirectUms) return 'raw';
    if (isMathsSuite) return suiteInputMode;
    if (isUmsOnly) return 'ums';
    return (
      inputModeBySubject[activeSubject.id] ??
      (activeSubject.isModularUms ? 'ums' : 'raw')
    );
  }, [canUseDirectUms, isMathsSuite, suiteInputMode, isUmsOnly, inputModeBySubject, activeSubject]);

  const availableSeriesForActive = useMemo(() => {
    if (isMathsSuite) {
      const union = new Set<string>();
      for (const p of activeSubject.papers) {
        for (const id of p.availableSeriesIds ?? Object.keys(p.seriesThresholds ?? {})) {
          union.add(id);
        }
      }
      const hasNoOctNov = suiteSelectedUnits.some((u) =>
        EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(u)
      );
      const list = seriesOptions
        .filter((s) => union.size === 0 || union.has(s.id))
        .filter((s) => (hasNoOctNov ? !isOctNovSeriesId(s.id) : true));
      return list.length > 0 ? list : seriesOptions;
    }

    const keys = activeRoute
      ? Object.keys(activeRoute.seriesBoundaries)
      : Object.keys(activeSubject.seriesBoundaries);
    if (keys.length === 0) return seriesOptions;
    const keySet = new Set(keys);
    const list = seriesOptions.filter((s) => keySet.has(s.id));
    return list.length > 0 ? list : seriesOptions;
  }, [activeSubject, activeRoute, isMathsSuite, suiteSelectedUnits, seriesOptions]);

  const activeSeries = useMemo(
    () =>
      availableSeriesForActive.find((s) => s.id === selectedSeriesId) ??
      availableSeriesForActive[0] ??
      seriesOptions[0]!,
    [availableSeriesForActive, selectedSeriesId, seriesOptions]
  );

  const calculation = useMemo(() => {
    const modeOpts = canUseDirectUms
      ? { inputMode: activeInputMode, umsMarksByPaper: umsByPaper }
      : undefined;

    if (activeRoute) {
      return calculateRouteGrade(
        activeSubject,
        activeRoute,
        activeSeries.id,
        marksByPaper,
        perPaperSeriesOverrides,
        modeOpts
      );
    }
    return calculateSubjectGrade(
      activeSubject,
      activeSeries.id,
      marksByPaper,
      perPaperSeriesOverrides,
      modeOpts
    );
  }, [
    canUseDirectUms,
    activeSubject,
    activeRoute,
    activeSeries.id,
    marksByPaper,
    umsByPaper,
    perPaperSeriesOverrides,
    activeInputMode,
  ]);

  const handleBoardChange = (nextBoardId: ExamBoardId) => {
    setSelectedBoardId(nextBoardId);
    const firstSubj = subjects.find((s) => s.boardId === nextBoardId);
    if (firstSubj) {
      setSelectedSubjectId(firstSubj.id);
      setSelectedRouteId(firstSubj.defaultRouteId ?? firstSubj.routes?.[0]?.id ?? '');
    }
    setPerPaperSeriesOverrides({});
    setSubjectSearch('');
    setSavedBanner(null);
  };

  const handleSubjectCardClick = (subj: EngineSubjectInput) => {
    setSelectedSubjectId(subj.id);
    setSelectedRouteId(subj.defaultRouteId ?? subj.routes?.[0]?.id ?? '');
    setPerPaperSeriesOverrides({});
    setSavedBanner(null);
    setCurrentStep(subj.calculatorMode === 'edexcel_maths_suite' ? 3 : 2);
  };

  const selectMatchingRoute = (criteria: {
    awardLevel?: string;
    tier?: string;
    pathwayLabel?: string;
    variant?: string;
  }) => {
    if (activeRoutes.length === 0) return;
    const nextAward = criteria.awardLevel ?? activeRoute?.awardLevel;
    const nextTier = criteria.tier ?? activeRoute?.tier;
    const nextPathway = criteria.pathwayLabel ?? activeRoute?.pathwayLabel;
    const nextVariant = criteria.variant ?? activeRoute?.variant;

    const exact = activeRoutes.find(
      (r) =>
        (!nextAward || r.awardLevel === nextAward) &&
        (!nextTier || r.tier === nextTier) &&
        (!nextPathway || r.pathwayLabel === nextPathway) &&
        (!nextVariant || r.variant === nextVariant)
    );
    const partial =
      exact ??
      activeRoutes.find(
        (r) =>
          (criteria.awardLevel === undefined || r.awardLevel === nextAward) &&
          (criteria.tier === undefined || r.tier === nextTier) &&
          (criteria.pathwayLabel === undefined || r.pathwayLabel === nextPathway) &&
          (criteria.variant === undefined || r.variant === nextVariant)
      ) ??
      activeRoutes.find(
        (r) =>
          (criteria.awardLevel === undefined || r.awardLevel === nextAward) &&
          (criteria.tier === undefined || r.tier === nextTier)
      ) ??
      activeRoutes[0];

    if (partial) {
      setSelectedRouteId(partial.id);
      setSavedBanner(null);
    }
  };

  const handleSeriesSelect = (seriesId: string) => {
    setSelectedSeriesId(seriesId);
    if (
      seriesId.startsWith('fm-') &&
      activeRoutes.length > 0 &&
      activeRoute?.variant &&
      activeRoute.variant !== 'V2'
    ) {
      const v2Route = activeRoutes.find(
        (r) =>
          r.awardLevel === activeRoute.awardLevel &&
          r.tier === activeRoute.tier &&
          r.pathwayLabel === activeRoute.pathwayLabel &&
          r.variant === 'V2'
      );
      if (v2Route) {
        setSelectedRouteId(v2Route.id);
      }
    }
    setSavedBanner(null);
  };

  const handleStandardInputModeChange = (nextMode: 'raw' | 'ums') => {
    if (!canUseDirectUms || isUmsOnly || nextMode === activeInputMode) return;
    if (nextMode === 'ums' && !umsEditedSubjects[activeSubject.id]) {
      const rawCalc = activeRoute
        ? calculateRouteGrade(
            activeSubject,
            activeRoute,
            activeSeries.id,
            marksByPaper,
            perPaperSeriesOverrides,
            { inputMode: 'raw' }
          )
        : calculateSubjectGrade(
            activeSubject,
            activeSeries.id,
            marksByPaper,
            perPaperSeriesOverrides,
            { inputMode: 'raw' }
          );
      setUmsByPaper((prev) => {
        const next = { ...prev };
        for (const item of rawCalc.paperResults) {
          next[item.paper.id] = Math.min(item.maxUms, item.ums);
        }
        return next;
      });
    }
    setInputModeBySubject((prev) => ({ ...prev, [activeSubject.id]: nextMode }));
    setSavedBanner(null);
  };

  const handlePaperValueChange = (paperId: string, maxVal: number, val: number) => {
    const clamped = Math.max(0, Math.min(maxVal, Math.round(Number.isNaN(val) ? 0 : val)));
    if (activeInputMode === 'ums') {
      setUmsEditedSubjects((prev) => ({ ...prev, [activeSubject.id]: true }));
      setUmsByPaper((prev) => ({ ...prev, [paperId]: clamped }));
    } else {
      setMarksByPaper((prev) => ({ ...prev, [paperId]: clamped }));
    }
    setSavedBanner(null);
  };

  const applySubjectPreset = (preset: 'zero' | 'top') => {
    if (activeInputMode === 'ums') {
      const next = { ...umsByPaper };
      for (const item of calculation.paperResults) {
        const maxUms = item.maxUms;
        next[item.paper.id] = preset === 'zero' ? 0 : Math.round(maxUms * 0.92);
      }
      setUmsEditedSubjects((prev) => ({ ...prev, [activeSubject.id]: true }));
      setUmsByPaper(next);
      setSavedBanner(null);
      return;
    }

    const next = { ...marksByPaper };
    for (const item of calculation.paperResults) {
      const p = item.paper;
      if (preset === 'zero') {
        next[p.id] = 0;
      } else {
        const variantMap =
          activeRoute?.variant && p.seriesThresholdsByVariant?.[activeRoute.variant];
        const directThresh =
          variantMap?.[item.effectiveSeriesId] ?? p.seriesThresholds?.[item.effectiveSeriesId];
        const cutoff =
          directThresh?.['A*'] ??
          directThresh?.['9'] ??
          directThresh?.['5'] ??
          directThresh?.A ??
          directThresh?.C ??
          p.seriesPaperCutoffs[item.effectiveSeriesId]?.topGrade ??
          Object.values(p.seriesPaperCutoffs)[0]?.topGrade ??
          Math.round(item.effectiveMaxRaw * 0.85);
        next[p.id] = Math.min(item.effectiveMaxRaw, cutoff);
      }
    }
    setMarksByPaper(next);
    setSavedBanner(null);
  };

  const awardLevelOptions = useMemo(
    () => uniqueOrdered(activeRoutes.map((r) => r.awardLevel)),
    [activeRoutes]
  );
  const tierOptions = useMemo(
    () =>
      uniqueOrdered(
        activeRoutes
          .filter((r) => !activeRoute || r.awardLevel === activeRoute.awardLevel)
          .map((r) => r.tier)
      ),
    [activeRoutes, activeRoute]
  );
  const pathwayOptions = useMemo(
    () =>
      uniqueOrdered(
        activeRoutes
          .filter(
            (r) =>
              (!activeRoute || r.awardLevel === activeRoute.awardLevel) &&
              (!activeRoute?.tier || r.tier === activeRoute.tier)
          )
          .map((r) => r.pathwayLabel)
      ),
    [activeRoutes, activeRoute]
  );
  const variantOptions = useMemo(
    () =>
      uniqueOrdered(
        activeRoutes
          .filter(
            (r) =>
              (!activeRoute || r.awardLevel === activeRoute.awardLevel) &&
              (!activeRoute?.tier || r.tier === activeRoute.tier) &&
              (!activeRoute?.pathwayLabel || r.pathwayLabel === activeRoute.pathwayLabel)
          )
          .map((r) => r.variant)
      ),
    [activeRoutes, activeRoute]
  );

  const isTopGrade =
    calculation.finalGrade === 'A*' ||
    calculation.finalGrade === '9' ||
    calculation.finalGrade === 'A' ||
    calculation.finalGrade === '8';

  const handleSaveSnapshot = (snapshotOverride?: GradeCalculationSnapshot) => {
    const snapshot: GradeCalculationSnapshot =
      snapshotOverride ??
      (() => {
        const rawMarksByPaper: Record<string, number> = {};
        const umsMarksByPaper: Record<string, number> = {};
        const perPaperSeriesById: Record<string, string> = {};
        for (const item of calculation.paperResults) {
          if (activeInputMode === 'ums') {
            umsMarksByPaper[item.paper.code] = item.ums;
          } else {
            rawMarksByPaper[item.paper.code] = item.raw;
            perPaperSeriesById[item.paper.code] = item.effectiveSeriesId;
          }
        }
        const includeUmsFields = Boolean(
          activeInputMode === 'ums' || activeRoute?.isModularUms || activeSubject.isModularUms
        );
        return {
          boardId: effectiveBoardId,
          subjectId: activeSubject.id,
          subjectCode: activeRoute?.cashInCode ?? activeSubject.code,
          subjectTitle: activeSubject.title,
          seriesId: activeInputMode === 'ums' ? 'direct-ums' : activeSeries.id,
          ...(activeRoute ? { routeId: activeRoute.id, routeLabel: activeRoute.label } : {}),
          inputMode: activeInputMode,
          ...(activeInputMode === 'raw' && Object.keys(perPaperSeriesOverrides).length > 0
            ? { perPaperSeriesById }
            : {}),
          rawMarksByPaper,
          ...(activeInputMode === 'ums' ? { umsMarksByPaper } : {}),
          totalRaw: calculation.totalRaw,
          maxTotalRaw: calculation.maxTotalRaw,
          totalUms: includeUmsFields ? calculation.totalUms : undefined,
          maxTotalUms: includeUmsFields ? calculation.maxTotalUms : undefined,
          percentage: calculation.percentage,
          finalGrade: calculation.finalGrade,
        };
      })();

    void onSaveSnapshot?.(snapshot);
    if (saveFeedback === undefined) {
      const top =
        snapshot.finalGrade === 'A*' ||
        snapshot.finalGrade === '9' ||
        snapshot.finalGrade === 'A' ||
        snapshot.finalGrade === '8';
      emitMiloCheer({
        mood: top ? 'celebrating' : 'happy',
        propVariant: 'pencil',
        badge: `Grade ${snapshot.finalGrade}`,
        message: `Saved ${snapshot.subjectCode} (${snapshot.finalGrade}) to your Study Tracker!`,
      });
      setSavedBanner(
        `Saved ${snapshot.subjectTitle} (${
          activeInputMode === 'ums' ? 'Direct UMS' : activeSeries.label
        }) — Grade ${snapshot.finalGrade}`
      );
    }
  };

  const activeBanner: CalculatorSaveFeedback | null =
    saveFeedback !== undefined
      ? saveFeedback
      : savedBanner
        ? { tone: 'success', message: savedBanner }
        : null;

  const step2Summary = activeRoute ? activeRoute.label : formatSubjectSubtitle(activeSubject);

  const stepperItems = isMathsSuite
    ? [
        {
          index: 1,
          targetStep: 1 as const,
          title: 'Pick Subject',
          sub: `${activeBoard.shortName} · ${activeSubject.code}`,
        },
        {
          index: 2,
          targetStep: 3 as const,
          title: 'Units & Grades',
          sub: `${suiteSelectedUnits.length} units · ${
            suiteInputMode === 'ums' ? 'Direct UMS' : activeSeries.label
          }`,
        },
      ]
    : [
        {
          index: 1,
          targetStep: 1 as const,
          title: 'Pick Subject',
          sub: `${activeBoard.shortName} · ${activeSubject.code}`,
        },
        {
          index: 2,
          targetStep: 2 as const,
          title: 'Exam Options',
          sub: step2Summary,
        },
        {
          index: 3,
          targetStep: 3 as const,
          title: 'Scores & Grade',
          sub: `${activeInputMode === 'ums' ? 'Direct UMS' : activeSeries.label} · Grade ${calculation.finalGrade}`,
        },
      ];

  const visualActiveIndex = isMathsSuite && currentStep >= 2 ? 2 : currentStep;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {!hideHeader && (
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
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
                  CALCULATOR_FOCUS_RING
                )}
              >
                Home
              </a>
              <ThemeToggle className={CALCULATOR_FOCUS_RING} />
              <AppSwitcher currentApp={hostApp} useLocalUrls />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-6 pb-24 lg:pb-10 sm:px-6 space-y-5">
        {/* Compact Page Title + Live Greeting */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Grade Calculator
            </h1>
            <p className="text-xs sm:text-sm text-foreground-muted">
              {visualActiveIndex === 1
                ? 'Choose your exam board and click a subject card to begin.'
                : isMathsSuite
                  ? 'Toggle any of the 14 units below to check Maths & Further Maths grades side by side.'
                  : visualActiveIndex === 2
                    ? 'Confirm your paper tier, variant, and score mode.'
                    : 'Adjust any slider or click a number box to test your live grade.'}
            </p>
          </div>

          {currentStep === 1 && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface-card px-3.5 py-2 max-w-md">
              <AntMascot
                size={44}
                mood="happy"
                app={hostApp === 'study' ? 'study' : 'org'}
                propVariant="pencil"
                interactive
                tapLines={[
                  'Small daily past-paper habits build top boundaries!',
                  'Click any subject card below to jump straight in.',
                ]}
                ariaLabel=""
                className="shrink-0"
              />
              <p className="text-xs font-medium text-foreground leading-snug">
                {getBoardGreeting(effectiveBoardId)}
              </p>
            </div>
          )}
        </div>

        {/* Clean Connected Step Progress Rail */}
        <nav
          aria-label="Calculator steps"
          className="rounded-2xl border border-border bg-surface-card p-1.5 sm:p-2"
        >
          <ol className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
            {stepperItems.map((item, idx) => {
              const isCurrent = visualActiveIndex === item.index;
              const isDone = visualActiveIndex > item.index;
              return (
                <React.Fragment key={item.index}>
                  <li className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(item.targetStep)}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors',
                        CALCULATOR_FOCUS_RING,
                        isCurrent
                          ? 'bg-primary-tint/70 border border-primary/40'
                          : isDone
                            ? 'hover:bg-surface-inset/80'
                            : 'opacity-80 hover:opacity-100 hover:bg-surface-inset/60'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold',
                          isCurrent
                            ? 'bg-primary text-on-primary'
                            : isDone
                              ? 'bg-success-tint text-on-success-tint'
                              : 'bg-surface-inset text-foreground-muted'
                        )}
                      >
                        {isDone ? <Check className="h-3.5 w-3.5" /> : item.index}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono uppercase tracking-wide text-foreground-muted">
                            Step {item.index}
                          </span>
                          <span className="truncate text-xs sm:text-sm font-semibold text-foreground">
                            {item.title}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-foreground-muted">
                          {item.sub}
                        </p>
                      </div>
                    </button>
                  </li>
                  {idx < stepperItems.length - 1 && (
                    <li aria-hidden="true" className="hidden sm:flex items-center px-0.5 text-foreground-muted/60">
                      <ChevronRight className="h-4 w-4" />
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </nav>

        {/* ===================================================================== */}
        {/* STEP 1: Choose Exam Board & Subject (Compact 3-Col Grid)              */}
        {/* ===================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <section className="space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Exam Board
              </h2>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {boards.map((b) => {
                  const selected = b.id === effectiveBoardId;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleBoardChange(b.id)}
                      className={cn(
                        'rounded-2xl border px-3.5 py-3 text-left transition-all space-y-0.5',
                        CALCULATOR_FOCUS_RING,
                        selected
                          ? 'border-primary bg-primary-tint/50'
                          : 'border-border bg-surface-card hover:border-border-hover'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">{b.shortName}</p>
                        {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <p className="font-mono text-[11px] text-foreground-muted">
                        {formatBoardScaleBadge(b.id, b.scaleBadge)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2.5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  Select a Subject ({boardSubjects.length} in {activeBoard.shortName})
                </h2>

                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-foreground-muted" />
                  <input
                    type="text"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Filter by code or subject..."
                    aria-label="Filter subjects"
                    className={cn(
                      'w-full rounded-xl border border-border bg-surface-card pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-foreground-muted',
                      CALCULATOR_FOCUS_RING
                    )}
                  />
                </div>
              </div>

              {filteredBoardSubjects.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-surface-card p-6 text-center">
                  <AntMascot
                    size={52}
                    mood="curious"
                    app={hostApp === 'study' ? 'study' : 'org'}
                    propVariant="magnifier"
                    ariaLabel=""
                  />
                  <p className="text-sm text-foreground-muted">
                    Milo looked everywhere, but no subject matched &ldquo;{subjectSearch}&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBoardSubjects.map((subj) => {
                    const isSelected = subj.id === activeSubject.id;
                    return (
                      <button
                        key={subj.id}
                        type="button"
                        onClick={() => handleSubjectCardClick(subj)}
                        className={cn(
                          'flex items-center justify-between gap-2.5 rounded-xl border p-3 text-left transition-all',
                          CALCULATOR_FOCUS_RING,
                          isSelected
                            ? 'border-primary bg-primary-tint/50'
                            : 'border-border bg-surface-card hover:border-border-hover'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={cn(
                              'rounded-lg px-2 py-1 font-mono text-[11px] font-bold shrink-0',
                              isSelected
                                ? 'bg-primary text-on-primary'
                                : 'bg-primary-tint text-on-primary-tint'
                            )}
                          >
                            {subj.code}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {subj.title}
                            </p>
                            <p className="truncate text-[11px] text-foreground-muted">
                              {formatSubjectSubtitle(subj)}
                            </p>
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-foreground-muted shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ===================================================================== */}
        {/* UNIFIED 14-UNIT WORKSPACE: Edexcel IAL Maths & Further Maths          */}
        {/* ===================================================================== */}
        {(currentStep === 2 || currentStep === 3) && isMathsSuite && (
          <EdexcelMathsSuiteView
            suiteSubject={activeSubject}
            seriesOptions={availableSeriesForActive}
            defaultSeriesId={activeSeries.id}
            selectedUnits={suiteSelectedUnits}
            onSelectedUnitsChange={setSuiteSelectedUnits}
            awardMode={suiteAwardMode}
            onAwardModeChange={setSuiteAwardMode}
            inputMode={suiteInputMode}
            onInputModeChange={setSuiteInputMode}
            rawMarksByUnit={suiteRawMarks}
            onRawMarksByUnitChange={setSuiteRawMarks}
            umsMarksByUnit={suiteUmsMarks}
            onUmsMarksByUnitChange={setSuiteUmsMarks}
            seriesOverrides={suiteSeriesOverrides}
            onSeriesOverridesChange={setSuiteSeriesOverrides}
            onDefaultSeriesChange={handleSeriesSelect}
            onBackStep={() => setCurrentStep(1)}
            hostApp={hostApp}
            onSaveSnapshot={
              onSaveSnapshot ? (snap) => handleSaveSnapshot(snap) : undefined
            }
            saveFeedback={activeBanner}
            isSaving={isSaving}
          />
        )}

        {/* ===================================================================== */}
        {/* STEP 2: Configure Exam Options (Fits cleanly on 1 screen)             */}
        {/* ===================================================================== */}
        {currentStep === 2 && !isMathsSuite && (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-card px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="rounded-lg bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint shrink-0">
                  {activeSubject.code}
                </span>
                <p className="truncate text-sm font-semibold text-foreground">
                  {activeSubject.title}
                </p>
                <span className="hidden sm:inline truncate text-xs text-foreground-muted">
                  · {activeBoard.shortName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={CALCULATOR_FOCUS_RING}
                leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                onClick={() => setCurrentStep(1)}
              >
                Change Subject
              </Button>
            </div>

            {isUmsOnly && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-card px-4 py-3">
                <AntMascot
                  size={40}
                  mood="nudge"
                  app={hostApp === 'study' ? 'study' : 'org'}
                  propVariant="scholar"
                  interactive
                  ariaLabel=""
                  className="shrink-0"
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs font-medium text-foreground">
                    Official raw mark cutoffs aren&apos;t stored for this syllabus yet — enter unit UMS directly.
                  </p>
                  <PearsonConverterLink compact />
                </div>
              </div>
            )}

            {activeRoutes.length > 1 && (
              <div className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Qualification Tier &amp; Paper Options
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {awardLevelOptions.length > 1 && (
                    <div className="space-y-1.5">
                      <span className="block text-xs font-semibold text-foreground-muted">
                        Level
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {awardLevelOptions.map((lvl) => {
                          const active = activeRoute?.awardLevel === lvl;
                          const label =
                            lvl === 'IAL'
                              ? `Full IAL (${activeSubject.aLevelAwardCode ?? 'IAL'})`
                              : lvl === 'AS' && activeSubject.asAwardCode
                                ? `AS (${activeSubject.asAwardCode})`
                                : lvl === 'AL'
                                  ? 'Full A-Level'
                                  : lvl === 'AS'
                                    ? 'AS Level'
                                    : lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => selectMatchingRoute({ awardLevel: lvl })}
                              className={cn(
                                'rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                                CALCULATOR_FOCUS_RING,
                                active
                                  ? 'bg-primary text-on-primary'
                                  : 'border border-border bg-background text-foreground-muted hover:text-foreground'
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {tierOptions.length > 1 && (
                    <div className="space-y-1.5">
                      <span className="block text-xs font-semibold text-foreground-muted">
                        Tier
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tierOptions.map((tier) => {
                          const active = activeRoute?.tier === tier;
                          return (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => selectMatchingRoute({ tier })}
                              className={cn(
                                'rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                                CALCULATOR_FOCUS_RING,
                                active
                                  ? 'bg-primary text-on-primary'
                                  : 'border border-border bg-background text-foreground-muted hover:text-foreground'
                              )}
                            >
                              {tier}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {pathwayOptions.length > 1 && (
                    <div className="space-y-1.5">
                      <span className="block text-xs font-semibold text-foreground-muted">
                        Pathway
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {pathwayOptions.map((pw) => {
                          const active = activeRoute?.pathwayLabel === pw;
                          return (
                            <button
                              key={pw}
                              type="button"
                              onClick={() => selectMatchingRoute({ pathwayLabel: pw })}
                              className={cn(
                                'rounded-xl px-3 py-1.5 font-mono text-xs font-semibold transition-colors',
                                CALCULATOR_FOCUS_RING,
                                active
                                  ? 'bg-primary text-on-primary'
                                  : 'border border-border bg-background text-foreground-muted hover:text-foreground'
                              )}
                            >
                              {pw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {variantOptions.length > 1 && (
                    <div className="space-y-1.5">
                      <span className="block text-xs font-semibold text-foreground-muted">
                        {effectiveBoardId === 'edexcel-igcse' ? 'Paper Set' : 'Variant'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {variantOptions.map((v) => {
                          const active = activeRoute?.variant === v;
                          const fmDisabled =
                            activeSeries.id.startsWith('fm-') && v !== 'V2';
                          return (
                            <button
                              key={v}
                              type="button"
                              disabled={fmDisabled}
                              title={
                                fmDisabled
                                  ? 'Cambridge Feb/March papers are exclusively Variant 2'
                                  : undefined
                              }
                              onClick={() => selectMatchingRoute({ variant: v })}
                              className={cn(
                                'rounded-xl px-3 py-1.5 font-mono text-xs font-semibold transition-colors disabled:opacity-40',
                                CALCULATOR_FOCUS_RING,
                                active
                                  ? 'bg-primary text-on-primary'
                                  : 'border border-border bg-background text-foreground-muted hover:text-foreground'
                              )}
                            >
                              {v === 'R' ? 'Regional (R)' : v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input Mode & Exam Session combined cleanly */}
            {(canUseDirectUms && !isUmsOnly) || activeInputMode === 'raw' ? (
              <div className="rounded-2xl border border-border bg-surface-card p-4 sm:p-5 space-y-4">
                {canUseDirectUms && !isUmsOnly && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Score Input Mode
                      </span>
                      {activeInputMode === 'ums' && <PearsonConverterLink compact />}
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleStandardInputModeChange('ums')}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all',
                          CALCULATOR_FOCUS_RING,
                          activeInputMode === 'ums'
                            ? 'border-primary bg-primary-tint/50'
                            : 'border-border bg-background/70 hover:border-border-hover'
                        )}
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-foreground">
                            Direct UMS
                          </p>
                          <p className="text-[11px] text-foreground-muted">
                            No exam session needed
                          </p>
                        </div>
                        {activeInputMode === 'ums' && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStandardInputModeChange('raw')}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all',
                          CALCULATOR_FOCUS_RING,
                          activeInputMode === 'raw'
                            ? 'border-primary bg-primary-tint/50'
                            : 'border-border bg-background/70 hover:border-border-hover'
                        )}
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-foreground">
                            Raw Marks
                          </p>
                          <p className="text-[11px] text-foreground-muted">
                            Lookup by exam session
                          </p>
                        </div>
                        {activeInputMode === 'raw' && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeInputMode === 'raw' && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="step2-series-select"
                      className="block text-sm font-semibold text-foreground"
                    >
                      Exam Session
                    </label>
                    <select
                      id="step2-series-select"
                      value={activeSeries.id}
                      onChange={(e) => handleSeriesSelect(e.target.value)}
                      className={cn(
                        'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground',
                        CALCULATOR_FOCUS_RING
                      )}
                    >
                      {availableSeriesForActive.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label} ({s.tag})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                variant="ghost"
                className={CALCULATOR_FOCUS_RING}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setCurrentStep(1)}
              >
                Back to Subjects
              </Button>
              <Button
                variant="primary"
                className={CALCULATOR_FOCUS_RING}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => setCurrentStep(3)}
              >
                Next: Enter {activeInputMode === 'ums' ? 'UMS' : 'Marks'}
              </Button>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 3: Compact Multi-Col Marks Grid & No-Scroll Sticky Grade Card    */}
        {/* ===================================================================== */}
        {currentStep === 3 && !isMathsSuite && (
          <div className="space-y-4">
            {/* Slim Context & Mode Strip */}
            <div className="rounded-2xl border border-border bg-surface-card px-4 py-2.5 space-y-2">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={CALCULATOR_FOCUS_RING}
                    leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                    onClick={() => setCurrentStep(2)}
                  >
                    Options
                  </Button>
                  <span className="rounded-md bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint">
                    {activeSubject.code}
                  </span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {activeSubject.title}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    · {activeRoute ? activeRoute.label : formatSubjectSubtitle(activeSubject)} ·{' '}
                    {activeInputMode === 'ums' ? 'Direct UMS' : activeSeries.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {canUseDirectUms && !isUmsOnly && (
                    <div
                      role="group"
                      aria-label="Score input mode"
                      className="inline-flex rounded-xl border border-border bg-background p-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => handleStandardInputModeChange('ums')}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                          CALCULATOR_FOCUS_RING,
                          activeInputMode === 'ums'
                            ? 'bg-primary text-on-primary'
                            : 'text-foreground-muted hover:text-foreground'
                        )}
                      >
                        Direct UMS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStandardInputModeChange('raw')}
                        className={cn(
                          'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                          CALCULATOR_FOCUS_RING,
                          activeInputMode === 'raw'
                            ? 'bg-primary text-on-primary'
                            : 'text-foreground-muted hover:text-foreground'
                        )}
                      >
                        Raw Marks
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => applySubjectPreset('top')}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-tint/50',
                      CALCULATOR_FOCUS_RING
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {activeInputMode === 'ums'
                        ? 'Fill top UMS'
                        : `Fill ${
                            activeSubject.gradingScale === '9-1'
                              ? activeRoute?.tier === 'Foundation'
                                ? 'Grade 5'
                                : 'Grade 9'
                              : activeRoute?.awardLevel === 'AS'
                                ? 'Grade A'
                                : activeRoute?.tier === 'Core'
                                  ? 'Grade C'
                                  : 'A* marks'
                          }`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applySubjectPreset('zero')}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground-muted hover:text-foreground',
                      CALCULATOR_FOCUS_RING
                    )}
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {activeInputMode === 'ums' && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                  {isUmsOnly && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>Direct UMS mode</span>
                    </span>
                  )}
                  <PearsonConverterLink compact />
                </div>
              )}
            </div>

            {/* 12-Col Split: Compact 2-Column Paper Cards (Left 7) + Sticky Result (Right 5) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Left 7 cols */}
              <div className="lg:col-span-7">
                <div
                  className={cn(
                    'grid gap-3',
                    calculation.paperResults.length >= 2
                      ? 'grid-cols-1 sm:grid-cols-2'
                      : 'grid-cols-1'
                  )}
                >
                  {calculation.paperResults.map(
                    ({
                      paper,
                      raw,
                      effectiveMaxRaw,
                      effectiveSeriesId,
                      ums,
                      maxUms,
                      paperGrade,
                    }) => {
                      const showPaperUms =
                        activeInputMode === 'ums' || activeSubject.isModularUms;
                      const unitSeriesOptions =
                        paper.availableSeriesIds && paper.availableSeriesIds.length > 0
                          ? availableSeriesForActive.filter((s) =>
                              paper.availableSeriesIds!.includes(s.id)
                            )
                          : availableSeriesForActive;

                      const currentVal = activeInputMode === 'ums' ? ums : raw;
                      const maxVal = activeInputMode === 'ums' ? maxUms : effectiveMaxRaw;

                      return (
                        <div
                          key={paper.id}
                          className="rounded-xl border border-border bg-surface-card p-3.5 sm:p-4 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label
                              htmlFor={`mark-input-${paper.id}`}
                              className="min-w-0 cursor-pointer space-y-0.5"
                            >
                              <span className="block font-mono text-[11px] font-bold text-primary">
                                {paper.code}
                              </span>
                              <span className="block truncate text-xs sm:text-sm font-semibold text-foreground">
                                {paper.title}
                              </span>
                            </label>

                            <span className="rounded-lg bg-surface-inset px-2 py-0.5 font-mono tabular-nums text-xs font-bold text-foreground shrink-0">
                              {showPaperUms
                                ? `${ums}/${maxUms} · ${paperGrade}`
                                : `Grade ${paperGrade}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={maxVal}
                              value={currentVal}
                              aria-label={`${paper.code} ${paper.title} slider`}
                              onChange={(e) =>
                                handlePaperValueChange(paper.id, maxVal, Number(e.target.value))
                              }
                              className={cn(
                                'h-2 flex-1 min-w-0 cursor-pointer appearance-none rounded-lg bg-surface-inset accent-[var(--primary)]',
                                CALCULATOR_FOCUS_RING
                              )}
                            />

                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                id={`mark-input-${paper.id}`}
                                type="number"
                                min={0}
                                max={maxVal}
                                value={currentVal}
                                onFocus={(e) => e.currentTarget.select()}
                                onClick={(e) => e.currentTarget.select()}
                                onChange={(e) =>
                                  handlePaperValueChange(paper.id, maxVal, Number(e.target.value))
                                }
                                className={cn(
                                  'w-14 rounded-lg border border-border bg-background px-2 py-1 text-center font-mono tabular-nums text-sm font-semibold text-foreground focus:border-primary',
                                  CALCULATOR_FOCUS_RING
                                )}
                              />
                              <span className="font-mono tabular-nums text-[11px] text-foreground-muted">
                                /{maxVal}
                              </span>
                            </div>
                          </div>

                          {activeSubject.isModularUms && activeInputMode === 'raw' && (
                            <select
                              aria-label={`${paper.code} exam session`}
                              value={effectiveSeriesId}
                              onChange={(e) =>
                                setPerPaperSeriesOverrides((prev) => ({
                                  ...prev,
                                  [paper.id]: e.target.value,
                                }))
                              }
                              className={cn(
                                'w-full rounded-lg border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground',
                                CALCULATOR_FOCUS_RING
                              )}
                            >
                              {(unitSeriesOptions.length > 0
                                ? unitSeriesOptions
                                : availableSeriesForActive
                              ).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Right 5 cols: Compact Sticky Result Card + Milo Spotlight */}
              <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-20 rounded-2xl border border-border bg-surface-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">
                      {activeSubject.title}
                    </h2>
                    <p className="truncate text-xs text-foreground-muted">
                      {activeInputMode === 'ums' ? 'Direct UMS' : activeSeries.label}
                      {activeRoute ? ` · ${activeRoute.label}` : ''}
                    </p>
                    <div className="pt-1.5 flex items-baseline gap-2">
                      <span className="font-mono tabular-nums text-3xl font-extrabold text-foreground">
                        {calculation.metricScore}
                      </span>
                      <span className="font-mono tabular-nums text-xs text-foreground-muted">
                        / {calculation.metricMax} {calculation.metricUnit} ({calculation.percentage}%)
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-mono text-2xl font-extrabold transition-colors',
                      isTopGrade
                        ? 'bg-primary text-on-primary'
                        : 'border border-border bg-surface-inset text-foreground'
                    )}
                    aria-label={`Overall grade ${calculation.finalGrade}`}
                  >
                    {calculation.finalGrade}
                  </div>
                </div>

                <GradeTierProgressBar
                  maxScore={calculation.metricMax}
                  percentage={calculation.percentage}
                  boundaries={calculation.boundaries}
                  isPeakGrade={isPeakGradeLabel(calculation.finalGrade)}
                />

                {calculation.aStarRuleStatus && (
                  <div className="rounded-xl bg-surface-inset/70 px-3 py-1.5 text-xs flex items-center justify-between">
                    <span className="text-foreground-muted">A2 Units Requirement (A*)</span>
                    <span className="font-mono font-semibold text-foreground tabular-nums">
                      {calculation.aStarRuleStatus.actualA2Ums} /{' '}
                      {calculation.aStarRuleStatus.requiredA2Ums} UMS
                    </span>
                  </div>
                )}

                <MiloGradeSpotlight
                  finalGrade={calculation.finalGrade}
                  nextBoundary={calculation.nextBoundary}
                  bufferAboveTop={calculation.bufferAboveTop}
                  metricUnit={calculation.metricUnit}
                  hostApp={hostApp}
                />

                <div
                  className={cn(
                    'grid gap-1 pt-3 border-t border-border',
                    calculation.boundaries.length > 6
                      ? 'grid-cols-5 sm:grid-cols-9'
                      : 'grid-cols-6'
                  )}
                >
                  {calculation.boundaries.map((b) => {
                    const isCurrent = b.grade === calculation.finalGrade;
                    return (
                      <div
                        key={b.grade}
                        className={cn(
                          'flex flex-col items-center rounded-lg py-1.5 text-center transition-colors',
                          isCurrent
                            ? 'bg-primary-tint text-on-primary-tint font-bold'
                            : 'text-foreground-muted'
                        )}
                      >
                        <span className="font-mono text-xs font-bold">{b.grade}</span>
                        <span className="font-mono tabular-nums text-[10px] opacity-80">
                          {b.minScore}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {activeBanner && (
                  <div
                    role="status"
                    className={cn(
                      'flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-xs font-medium',
                      activeBanner.tone === 'success' && 'bg-success-tint text-on-success-tint',
                      activeBanner.tone === 'info' &&
                        'border border-border bg-primary-tint/50 text-foreground',
                      activeBanner.tone === 'error' &&
                        'border border-destructive-border bg-destructive-tint text-destructive'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{activeBanner.message}</span>
                    </div>
                    {activeBanner.actionHref && activeBanner.actionLabel && (
                      <a
                        href={activeBanner.actionHref}
                        className="shrink-0 font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
                      >
                        {activeBanner.actionLabel}
                      </a>
                    )}
                  </div>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  disabled={isSaving}
                  className={CALCULATOR_FOCUS_RING}
                  leftIcon={<BookmarkCheck className="h-4 w-4" />}
                  onClick={() => handleSaveSnapshot()}
                >
                  {isSaving ? 'Saving...' : 'Save to Study Tracker'}
                </Button>
              </div>
            </div>

            {activeBanner && (
              <div
                role="status"
                className={cn(
                  'lg:hidden flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-medium',
                  activeBanner.tone === 'success' && 'bg-success-tint text-on-success-tint',
                  activeBanner.tone === 'info' &&
                    'border border-border bg-primary-tint/50 text-foreground',
                  activeBanner.tone === 'error' &&
                    'border border-destructive-border bg-destructive-tint text-destructive'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{activeBanner.message}</span>
                </div>
                {activeBanner.actionHref && activeBanner.actionLabel && (
                  <a
                    href={activeBanner.actionHref}
                    className="shrink-0 font-semibold text-primary underline underline-offset-2"
                  >
                    {activeBanner.actionLabel}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Sticky Bottom Bar (Step 3, Standard Subjects) */}
      {currentStep === 3 && !isMathsSuite && (
        <div className="sticky bottom-0 z-50 border-t border-border-hover bg-surface-elevated/95 px-4 py-3 backdrop-blur-md shadow-[var(--shadow-tier-3)] lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AntMascot
                variant="avatar"
                size={28}
                mood={
                  isTopGrade
                    ? 'celebrating'
                    : calculation.finalGrade === 'U'
                      ? 'curious'
                      : 'studying'
                }
                app={hostApp === 'study' ? 'study' : 'org'}
                animated={false}
                ariaLabel=""
                className="shrink-0"
              />
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-extrabold',
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
                    ? calculation.nextBoundary.a2UmsNeeded &&
                      calculation.nextBoundary.a2UmsNeeded > 0
                      ? `+${calculation.nextBoundary.a2UmsNeeded} A2 UMS to Grade ${calculation.nextBoundary.grade}`
                      : `+${calculation.nextBoundary.needed} ${calculation.metricUnit} to Grade ${calculation.nextBoundary.grade}`
                    : `Top Grade ${calculation.finalGrade} (+${calculation.bufferAboveTop} ${calculation.metricUnit})`}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              disabled={isSaving}
              className={cn('shrink-0', CALCULATOR_FOCUS_RING)}
              leftIcon={<BookmarkCheck className="h-4 w-4" />}
              onClick={() => handleSaveSnapshot()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
