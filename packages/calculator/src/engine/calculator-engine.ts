/**
 * Pure TypeScript Grade & UMS/PUM Calculation Engine (`@ants/calculator/engine`).
 *
 * Strictly framework-agnostic (zero React, Next.js, DOM, or UI library imports)
 * so both browser views and Cloudflare Workers (`@ants/api`) share identical math.
 */

import type {
  CalculatorAwardLevel,
  CalculatorBoundarySource,
  CalculatorMode,
} from '@ants/shared-types';

export const A_STAR_TO_E_ORDER = ['A*', 'A', 'B', 'C', 'D', 'E'] as const;
export const A_STAR_TO_G_ORDER = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const NINE_TO_ONE_ORDER = ['9', '8', '7', '6', '5', '4', '3', '2', '1'] as const;

export const CORE_ALLOWED_GRADES = ['C', 'D', 'E', 'F', 'G'] as const;
export const FOUNDATION_ALLOWED_GRADES = ['5', '4', '3', '2', '1'] as const;
export const AS_ALLOWED_GRADES = ['A', 'B', 'C', 'D', 'E'] as const;

export const PEARSON_UMS_CONVERTER_URL =
  'https://qualifications.pearson.com/en/support/support-topics/results-certification/understanding-marks-and-grades/converting-marks-points-and-grades.html';

export const UMS_PUM_ANCHOR_PERCENT_BY_GRADE: Readonly<Record<string, number>> = {
  'A*': 90,
  A: 80,
  B: 70,
  C: 60,
  D: 50,
  E: 40,
  F: 30,
  G: 20,
  '9': 90,
  '8': 80,
  '7': 70,
  '6': 60,
  '5': 50,
  '4': 40,
  '3': 30,
  '2': 20,
  '1': 10,
};

export interface LegacyPaperCutoffs {
  passC: number;
  gradeA: number;
  topGrade: number;
}

export interface EngineGradeThreshold {
  grade: string;
  minScore: number;
}

export interface EngineAStarRule {
  minTotalUms: number;
  minA2Ums: number;
  a2PaperCodes: string[];
  countBestA2Units?: number;
}

export interface EngineRouteInput {
  id: string;
  label: string;
  awardLevel: CalculatorAwardLevel;
  cashInCode?: string;
  tier?: 'Extended' | 'Core' | 'Higher' | 'Foundation';
  variant?: 'V1' | 'V2' | 'V3' | 'Standard' | 'R';
  pathwayLabel?: string;
  paperIds: string[];
  paperWeights?: Record<string, number>;
  maxTotalScore: number;
  isModularUms: boolean;
  gradingScale: 'A*-U' | '9-1';
  allowedGrades?: string[];
  aStarRule?: EngineAStarRule;
  availableSeriesIds?: string[];
  seriesBoundaries: Partial<Record<string, EngineGradeThreshold[]>>;
}

export interface EnginePaperInput {
  id: string;
  code: string;
  unitCode?: string;
  title: string;
  maxRaw: number;
  seriesMaxRaw?: Partial<Record<string, number>>;
  maxUms?: number;
  weightLabel: string;
  defaultRaw: number;
  level?: 'AS' | 'A2' | 'IGCSE' | 'CORE' | 'EXTENDED';
  availableSeriesIds?: string[];
  seriesPaperCutoffs: Partial<Record<string, LegacyPaperCutoffs>>;
  seriesThresholds?: Partial<Record<string, Record<string, number>>>;
  seriesThresholdsByVariant?: Partial<
    Record<string, Partial<Record<string, Record<string, number>>>>
  >;
}

export interface EngineSubjectInput {
  id: string;
  boardId: string;
  code: string;
  title: string;
  levelLabel: string;
  gradingScale: 'A*-U' | '9-1';
  isModularUms: boolean;
  maxTotalRaw: number;
  maxTotalUms?: number;
  calculatorMode?: CalculatorMode;
  asAwardCode?: string;
  aLevelAwardCode?: string;
  boundarySource?: CalculatorBoundarySource;
  defaultRouteId?: string;
  aStarRule?: EngineAStarRule;
  papers: EnginePaperInput[];
  routes?: EngineRouteInput[];
  seriesBoundaries: Partial<Record<string, EngineGradeThreshold[]>>;
}

export interface PaperCalculationResult {
  paper: EnginePaperInput;
  raw: number;
  effectiveMaxRaw: number;
  effectiveSeriesId: string;
  weight: number;
  weightedMark: number;
  ums: number;
  maxUms: number;
  umsLabel: 'UMS' | 'PUM';
  paperGrade: string;
  pct: number;
  inputMode?: 'raw' | 'ums';
}

export interface AStarRuleEvaluation {
  requiredTotalUms: number;
  actualTotalUms: number;
  requiredA2Ums: number;
  actualA2Ums: number;
  maxA2Ums: number;
  met: boolean;
  missingTotalUms: number;
  missingA2Ums: number;
}

export interface NextBoundaryHint {
  grade: string;
  needed: number;
  minScore: number;
  a2UmsNeeded?: number;
  requiredA2Ums?: number;
}

export interface SubjectCalculationResult {
  paperResults: PaperCalculationResult[];
  totalRaw: number;
  maxTotalRaw: number;
  unweightedTotalRaw: number;
  unweightedMaxTotalRaw: number;
  totalUms: number;
  maxTotalUms: number;
  metricScore: number;
  metricMax: number;
  metricUnit: 'UMS' | 'marks';
  boundaries: EngineGradeThreshold[];
  finalGrade: string;
  nextBoundary: NextBoundaryHint | null;
  bufferAboveTop: number;
  percentage: number;
  aStarRuleStatus: AStarRuleEvaluation | null;
  routeId?: string;
  routeLabel?: string;
  inputMode?: 'raw' | 'ums';
}

export interface CompositeGradeInputOptions {
  inputMode?: 'raw' | 'ums';
  umsMarksByPaper?: Record<string, number>;
}

export interface CalculatePaperOptions {
  variant?: string;
  weight?: number;
  allowedGrades?: readonly string[];
}

export function getGradeOrder(
  gradingScale: 'A*-U' | '9-1',
  options?: { includeFG?: boolean; allowedGrades?: readonly string[] }
): readonly string[] {
  if (gradingScale === '9-1') {
    if (options?.allowedGrades && options.allowedGrades.length > 0) {
      const allowedSet = new Set(options.allowedGrades);
      return NINE_TO_ONE_ORDER.filter((g) => allowedSet.has(g));
    }
    return NINE_TO_ONE_ORDER;
  }

  const base =
    options?.includeFG ||
    options?.allowedGrades?.includes('F') ||
    options?.allowedGrades?.includes('G')
      ? A_STAR_TO_G_ORDER
      : A_STAR_TO_E_ORDER;

  if (options?.allowedGrades && options.allowedGrades.length > 0) {
    const allowedSet = new Set(options.allowedGrades);
    return base.filter((g) => allowedSet.has(g));
  }
  return base;
}

/**
 * Expands compact 3-cutoff mock bounds (`passC`, `gradeA`, `topGrade`) into a full
 * grade threshold dictionary (`A*`–`E` or `9`–`1`) matching legacy paper behavior.
 */
export function expandLegacyPaperCutoffs(
  cutoffs: LegacyPaperCutoffs,
  gradingScale: 'A*-U' | '9-1'
): Record<string, number> {
  if (gradingScale === '9-1') {
    return {
      '9': cutoffs.topGrade,
      '8': Math.round((cutoffs.topGrade + cutoffs.gradeA) / 2),
      '7': cutoffs.gradeA,
      '6': Math.round((cutoffs.gradeA + cutoffs.passC) / 2),
      '5': cutoffs.passC,
      '4': Math.round(cutoffs.passC * 0.75),
      '3': Math.round(cutoffs.passC * 0.55),
      '2': Math.round(cutoffs.passC * 0.35),
      '1': Math.round(cutoffs.passC * 0.18),
    };
  }

  return {
    'A*': cutoffs.topGrade,
    A: cutoffs.gradeA,
    B: Math.round((cutoffs.gradeA + cutoffs.passC) / 2),
    C: cutoffs.passC,
    D: Math.round(cutoffs.passC * 0.8),
    E: Math.round(cutoffs.passC * 0.65),
  };
}

/**
 * Summarizes a full threshold map back into the 3-point `{ passC, gradeA, topGrade }` shape
 * expected by `PaperComponentMock`.
 */
export function summarizeThresholdsToLegacyCutoffs(
  thresholds: Record<string, number>,
  gradingScale: 'A*-U' | '9-1',
  maxRaw: number
): LegacyPaperCutoffs {
  const clampRaw = (val: number) => Math.max(0, Math.min(maxRaw, Math.round(val)));

  if (gradingScale === '9-1') {
    const top = thresholds['9'] ?? Math.round(maxRaw * 0.85);
    const grade7 = thresholds['7'] ?? Math.round(top * 0.82);
    const pass5 = thresholds['5'] ?? Math.round(grade7 * 0.65);
    return {
      topGrade: clampRaw(top),
      gradeA: clampRaw(grade7),
      passC: clampRaw(pass5),
    };
  }

  const top = thresholds['A*'] ?? thresholds['A'] ?? Math.round(maxRaw * 0.85);
  const gradeA = thresholds['A'] ?? Math.round(top * 0.88);
  const passC = thresholds['C'] ?? Math.round(gradeA * 0.72);
  return {
    topGrade: clampRaw(top),
    gradeA: clampRaw(gradeA),
    passC: clampRaw(passC),
  };
}

function clampMark(rawInput: number, maxRaw: number): number {
  const safe = Number.isFinite(rawInput) ? Math.round(rawInput) : 0;
  return Math.max(0, Math.min(Math.max(1, maxRaw), safe));
}

export function resolveEffectivePaperMaxRaw(paper: EnginePaperInput, seriesId: string): number {
  const override = paper.seriesMaxRaw?.[seriesId];
  return typeof override === 'number' && override > 0 ? override : Math.max(1, paper.maxRaw);
}

function pickNearestRecordEntry<T>(
  map: Partial<Record<string, T>> | undefined,
  preferredKey: string
): T | undefined {
  if (!map) return undefined;
  const direct = map[preferredKey];
  if (direct !== undefined) return direct;
  return Object.values(map).find((entry): entry is T => entry !== undefined);
}

function resolvePaperThresholds(
  paper: EnginePaperInput,
  seriesId: string,
  gradingScale: 'A*-U' | '9-1',
  maxRaw: number,
  variant?: string
): Record<string, number> {
  if (variant && paper.seriesThresholdsByVariant) {
    const bySeries =
      paper.seriesThresholdsByVariant[variant] ??
      Object.values(paper.seriesThresholdsByVariant).find(Boolean);
    const variantThresholds = pickNearestRecordEntry(bySeries, seriesId);
    if (variantThresholds && Object.keys(variantThresholds).length > 0) {
      return variantThresholds;
    }
  }

  const direct = pickNearestRecordEntry(paper.seriesThresholds, seriesId);
  if (direct && Object.keys(direct).length > 0) {
    return direct;
  }

  const legacy =
    paper.seriesPaperCutoffs[seriesId] ??
    Object.values(paper.seriesPaperCutoffs).find(
      (entry): entry is LegacyPaperCutoffs => entry !== undefined
    ) ?? {
      passC: Math.round(maxRaw * 0.5),
      gradeA: Math.round(maxRaw * 0.72),
      topGrade: Math.round(maxRaw * 0.85),
    };

  return expandLegacyPaperCutoffs(legacy, gradingScale);
}

/**
 * Evaluates a single paper/unit using piecewise-linear threshold interpolation
 * across official UMS/PUM grade anchors (`A*`–`G` or `9`–`1`).
 */
export function calculatePaperGrade(
  rawInput: number,
  paper: EnginePaperInput,
  seriesId: string,
  gradingScale: 'A*-U' | '9-1',
  isModularUms: boolean,
  options?: CalculatePaperOptions
): PaperCalculationResult {
  const effectiveMaxRaw = resolveEffectivePaperMaxRaw(paper, seriesId);
  const raw = clampMark(rawInput, effectiveMaxRaw);
  const maxUms = isModularUms ? (paper.maxUms ?? 100) : 100;
  const umsLabel: 'UMS' | 'PUM' = isModularUms ? 'UMS' : 'PUM';
  const pct = Math.round((raw / effectiveMaxRaw) * 100);
  const weight =
    typeof options?.weight === 'number' && options.weight > 0 ? options.weight : 1;
  const weightedMark = raw * weight;

  const thresholds = resolvePaperThresholds(
    paper,
    seriesId,
    gradingScale,
    effectiveMaxRaw,
    options?.variant
  );

  const hasFG = 'F' in thresholds || 'G' in thresholds;
  const curveOrder = getGradeOrder(gradingScale, { includeFG: hasFG });

  const curveStops = curveOrder
    .filter((grade) => typeof thresholds[grade] === 'number' && Number.isFinite(thresholds[grade]))
    .map((grade) => ({
      grade,
      minRaw: Math.max(0, Math.min(effectiveMaxRaw, thresholds[grade]!)),
      ums: ((UMS_PUM_ANCHOR_PERCENT_BY_GRADE[grade] ?? 40) / 100) * maxUms,
    }))
    .sort((a, b) => {
      if (b.minRaw !== a.minRaw) return b.minRaw - a.minRaw;
      return b.ums - a.ums;
    });

  // Grade label obeys tier/AS cap (`allowedGrades`) even when UMS uses full raw thresholds
  const gradeStops =
    options?.allowedGrades && options.allowedGrades.length > 0
      ? curveStops.filter((s) => options.allowedGrades!.includes(s.grade))
      : curveStops;

  let paperGrade = 'U';
  for (const stop of gradeStops) {
    if (raw >= stop.minRaw) {
      paperGrade = stop.grade;
      break;
    }
  }

  let umsValue = 0;
  if (raw <= 0) {
    umsValue = 0;
  } else if (raw >= effectiveMaxRaw) {
    umsValue = maxUms;
  } else if (curveStops.length === 0) {
    umsValue = (raw / effectiveMaxRaw) * maxUms;
  } else {
    const ascendingMap = new Map<number, number>();
    for (const stop of [...curveStops].reverse()) {
      const existing = ascendingMap.get(stop.minRaw);
      if (existing === undefined || stop.ums > existing) {
        ascendingMap.set(stop.minRaw, stop.ums);
      }
    }
    const curve = Array.from(ascendingMap.entries())
      .map(([minRaw, ums]) => ({ minRaw, ums }))
      .sort((a, b) => a.minRaw - b.minRaw);

    const lowest = curve[0]!;
    const highest = curve[curve.length - 1]!;

    if (raw >= highest.minRaw) {
      const span = effectiveMaxRaw - highest.minRaw;
      umsValue =
        span <= 0
          ? maxUms
          : highest.ums + ((raw - highest.minRaw) / span) * (maxUms - highest.ums);
    } else if (raw < lowest.minRaw) {
      umsValue = lowest.minRaw <= 0 ? lowest.ums : (raw / lowest.minRaw) * lowest.ums;
    } else {
      umsValue = lowest.ums;
      for (let i = 0; i < curve.length - 1; i++) {
        const lower = curve[i]!;
        const upper = curve[i + 1]!;
        if (raw >= lower.minRaw && raw < upper.minRaw) {
          const span = Math.max(1, upper.minRaw - lower.minRaw);
          umsValue = lower.ums + ((raw - lower.minRaw) / span) * (upper.ums - lower.ums);
          break;
        }
      }
    }
  }

  const ums = Math.round(Math.min(maxUms, Math.max(0, umsValue)));
  return {
    paper,
    raw,
    effectiveMaxRaw,
    effectiveSeriesId: seriesId,
    weight,
    weightedMark,
    ums,
    maxUms,
    umsLabel,
    paperGrade,
    pct,
  };
}

function getGradeRankWeight(grade: string, order: readonly string[]): number {
  const index = order.indexOf(grade);
  return index === -1 ? order.length + 1 : index;
}

export function sortBoundariesDescending(
  boundaries: readonly EngineGradeThreshold[],
  gradingScale: 'A*-U' | '9-1',
  allowedGrades?: readonly string[]
): EngineGradeThreshold[] {
  const hasFG = boundaries.some((b) => b.grade === 'F' || b.grade === 'G');
  const order = getGradeOrder(gradingScale, { includeFG: hasFG, allowedGrades });
  const allowedSet = allowedGrades && allowedGrades.length > 0 ? new Set(allowedGrades) : null;

  return boundaries
    .filter((b) => !allowedSet || allowedSet.has(b.grade))
    .sort((a, b) => {
      if (b.minScore !== a.minScore) return b.minScore - a.minScore;
      return getGradeRankWeight(a.grade, order) - getGradeRankWeight(b.grade, order);
    });
}

export function evaluateAStarRule(
  rule: EngineAStarRule,
  paperResults: readonly PaperCalculationResult[],
  totalUms: number
): AStarRuleEvaluation {
  const codeSet = new Set(rule.a2PaperCodes.map((c) => c.toUpperCase()));
  const matching = paperResults.filter(
    (item) =>
      codeSet.has(item.paper.code.toUpperCase()) ||
      (item.paper.unitCode ? codeSet.has(item.paper.unitCode.toUpperCase()) : false)
  );

  const umsDesc = [...matching].sort((a, b) => b.ums - a.ums);
  const maxDesc = [...matching].sort((a, b) => b.maxUms - a.maxUms);
  const limit = rule.countBestA2Units ?? matching.length;

  const actualA2Ums = umsDesc.slice(0, limit).reduce((sum, item) => sum + item.ums, 0);
  const maxA2Ums = maxDesc.slice(0, limit).reduce((sum, item) => sum + item.maxUms, 0);

  const missingTotalUms = Math.max(0, rule.minTotalUms - totalUms);
  const missingA2Ums = Math.max(0, rule.minA2Ums - actualA2Ums);
  const met = missingTotalUms === 0 && missingA2Ums === 0;

  return {
    requiredTotalUms: rule.minTotalUms,
    actualTotalUms: totalUms,
    requiredA2Ums: rule.minA2Ums,
    actualA2Ums,
    maxA2Ums,
    met,
    missingTotalUms,
    missingA2Ums,
  };
}

/**
 * Returns true when a subject accepts direct UMS score input (Edexcel IAL and Edexcel IGCSE).
 */
export function supportsDirectUms(
  subject: Pick<EngineSubjectInput, 'isModularUms' | 'boardId'>
): boolean {
  return Boolean(subject.isModularUms || subject.boardId === 'edexcel-igcse');
}

/**
 * Returns true when an Edexcel subject lacks official raw-mark boundaries in D1
 * and therefore uses Direct UMS input exclusively (linking to Pearson's official converter).
 */
export function isDirectUmsOnlySubject(
  subject: Pick<EngineSubjectInput, 'isModularUms' | 'boardId' | 'boundarySource'>
): boolean {
  return Boolean(supportsDirectUms(subject) && subject.boundarySource === 'representative');
}

/**
 * Builds uniform Pearson Modular International GCSE (9–1) UMS cash-in thresholds
 * scaled to `maxTotalUms` (90% = 9, 80% = 8, ..., 10% = 1), respecting tier ceilings.
 */
export function buildEdexcelIgcseUmsBoundaries(
  maxTotalUms: number,
  allowedGrades?: readonly string[]
): EngineGradeThreshold[] {
  const safeMax = Math.max(1, maxTotalUms);
  const raw = NINE_TO_ONE_ORDER.map((grade) => ({
    grade,
    minScore: Math.round(((UMS_PUM_ANCHOR_PERCENT_BY_GRADE[grade] ?? 10) / 100) * safeMax),
  }));
  return sortBoundariesDescending(raw, '9-1', allowedGrades);
}

/**
 * Derives a modular unit grade from UMS score using official Pearson Edexcel UMS percentage cutoffs.
 */
export function deriveUnitGradeFromUms(
  ums: number,
  maxUms: number,
  options?: {
    allowAStar?: boolean;
    allowedGrades?: readonly string[];
    gradingScale?: 'A*-U' | '9-1';
  }
): string {
  const safeMax = Math.max(1, maxUms);
  const ratio = (ums / safeMax) * 100;
  const stops: Array<{ grade: string; minPct: number }> =
    options?.gradingScale === '9-1'
      ? NINE_TO_ONE_ORDER.map((grade) => ({
          grade,
          minPct: UMS_PUM_ANCHOR_PERCENT_BY_GRADE[grade] ?? 10,
        }))
      : [
          ...(options?.allowAStar ? [{ grade: 'A*', minPct: 90 }] : []),
          { grade: 'A', minPct: 80 },
          { grade: 'B', minPct: 70 },
          { grade: 'C', minPct: 60 },
          { grade: 'D', minPct: 50 },
          { grade: 'E', minPct: 40 },
        ];
  const allowedSet =
    options?.allowedGrades && options.allowedGrades.length > 0
      ? new Set(options.allowedGrades)
      : null;

  for (const stop of stops) {
    if (allowedSet && !allowedSet.has(stop.grade)) continue;
    // Allow tiny floating-point tolerance while keeping exact integer cutoffs (e.g. 96/120 = 80%)
    if (ratio + 1e-6 >= stop.minPct) {
      return stop.grade;
    }
  }
  return 'U';
}

/**
 * Evaluates a modular Edexcel IAL or Edexcel IGCSE paper directly from a user-entered UMS score (`0..maxUms`).
 */
export function calculatePaperFromDirectUms(
  umsInput: number,
  paper: EnginePaperInput,
  options?: {
    seriesId?: string;
    allowedGrades?: readonly string[];
    gradingScale?: 'A*-U' | '9-1';
  }
): PaperCalculationResult {
  const maxUms = Math.max(1, paper.maxUms ?? 100);
  const safeUms = Number.isFinite(umsInput) ? Math.round(umsInput) : 0;
  const ums = Math.max(0, Math.min(maxUms, safeUms));
  const pct = Math.round((ums / maxUms) * 100);
  const paperGrade = deriveUnitGradeFromUms(ums, maxUms, {
    allowAStar: options?.gradingScale !== '9-1' && paper.level === 'A2',
    allowedGrades: options?.allowedGrades,
    gradingScale: options?.gradingScale,
  });

  return {
    paper,
    raw: 0,
    effectiveMaxRaw: Math.max(1, paper.maxRaw),
    effectiveSeriesId: options?.seriesId ?? 'direct-ums',
    weight: 1,
    weightedMark: 0,
    ums,
    maxUms,
    umsLabel: 'UMS',
    paperGrade,
    pct,
    inputMode: 'ums',
  };
}

function evaluateCompositeGrade(params: {
  paperResults: PaperCalculationResult[];
  unweightedTotalRaw: number;
  unweightedMaxTotalRaw: number;
  weightedCompositeRaw: number;
  totalUms: number;
  maxTotalUms: number;
  maxTotalRaw: number;
  isModularUms: boolean;
  gradingScale: 'A*-U' | '9-1';
  allowedGrades?: readonly string[];
  aStarRule?: EngineAStarRule;
  boundariesRaw: readonly EngineGradeThreshold[];
  routeId?: string;
  routeLabel?: string;
  inputMode?: 'raw' | 'ums';
}): SubjectCalculationResult {
  const {
    paperResults,
    unweightedTotalRaw,
    unweightedMaxTotalRaw,
    weightedCompositeRaw,
    totalUms,
    maxTotalUms,
    maxTotalRaw,
    isModularUms,
    gradingScale,
    allowedGrades,
    aStarRule,
    boundariesRaw,
    routeId,
    routeLabel,
    inputMode,
  } = params;

  const metricScore = isModularUms ? totalUms : weightedCompositeRaw;
  const metricMax = isModularUms ? maxTotalUms : maxTotalRaw;
  const metricUnit: 'UMS' | 'marks' = isModularUms ? 'UMS' : 'marks';

  const boundaries = sortBoundariesDescending(boundariesRaw, gradingScale, allowedGrades);

  let finalGrade = 'U';
  let nextBoundary: NextBoundaryHint | null = null;

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

  let aStarRuleStatus: AStarRuleEvaluation | null = null;
  if (isModularUms && aStarRule) {
    aStarRuleStatus = evaluateAStarRule(aStarRule, paperResults, totalUms);
    if (aStarRuleStatus.met) {
      finalGrade = 'A*';
      nextBoundary = null;
    } else if (finalGrade === 'A*') {
      finalGrade = 'A';
      nextBoundary = {
        grade: 'A*',
        needed: Math.max(aStarRuleStatus.missingTotalUms, aStarRuleStatus.missingA2Ums),
        minScore: aStarRule.minTotalUms,
        a2UmsNeeded: aStarRuleStatus.missingA2Ums,
        requiredA2Ums: aStarRule.minA2Ums,
      };
    }
  }

  const topBoundary = boundaries[0];
  const topThreshold =
    isModularUms && aStarRule ? aStarRule.minTotalUms : (topBoundary?.minScore ?? 0);
  const bufferAboveTop =
    finalGrade === (topBoundary?.grade ?? 'A*') && metricScore >= topThreshold
      ? metricScore - topThreshold
      : 0;

  const percentage = Math.round((metricScore / Math.max(1, metricMax)) * 100);

  return {
    paperResults,
    totalRaw: isModularUms ? unweightedTotalRaw : weightedCompositeRaw,
    maxTotalRaw: isModularUms ? unweightedMaxTotalRaw : maxTotalRaw,
    unweightedTotalRaw,
    unweightedMaxTotalRaw,
    totalUms,
    maxTotalUms,
    metricScore,
    metricMax,
    metricUnit,
    boundaries,
    finalGrade,
    nextBoundary,
    bufferAboveTop,
    percentage,
    aStarRuleStatus,
    ...(routeId ? { routeId } : {}),
    ...(routeLabel ? { routeLabel } : {}),
    ...(inputMode ? { inputMode } : {}),
  };
}

/**
 * Computes syllabus-accurate route composite marks/UMS, paper weights, per-unit exam
 * sessions, variant thresholds, tier/AS ceilings, Direct UMS input, and Edexcel A* rules.
 */
export function calculateRouteGrade(
  subject: EngineSubjectInput,
  route: EngineRouteInput,
  seriesId: string,
  rawMarksByPaper: Record<string, number>,
  perPaperSeriesById?: Record<string, string>,
  options?: CompositeGradeInputOptions
): SubjectCalculationResult {
  const paperMap = new Map(subject.papers.map((p) => [p.id, p]));
  const routePapers = route.paperIds
    .map((id) => paperMap.get(id))
    .filter((p): p is EnginePaperInput => p !== undefined);

  const canUseDirectUms = Boolean(
    route.isModularUms || subject.isModularUms || subject.boardId === 'edexcel-igcse'
  );
  const useDirectUms = Boolean(canUseDirectUms && options?.inputMode === 'ums');

  let unweightedTotalRaw = 0;
  let unweightedMaxTotalRaw = 0;
  let weightedSum = 0;
  let totalUms = 0;

  const paperAllowedGrades =
    route.tier === 'Core'
      ? CORE_ALLOWED_GRADES
      : route.tier === 'Foundation'
        ? FOUNDATION_ALLOWED_GRADES
        : undefined;

  const paperResults = routePapers.map((paper) => {
    const paperSeriesId =
      perPaperSeriesById?.[paper.id] ?? perPaperSeriesById?.[paper.code] ?? seriesId;

    if (useDirectUms) {
      const maxUms = paper.maxUms ?? 100;
      const umsCandidate =
        options?.umsMarksByPaper?.[paper.id] ??
        options?.umsMarksByPaper?.[paper.code] ??
        (paper.unitCode ? options?.umsMarksByPaper?.[paper.unitCode] : undefined) ??
        Math.round(maxUms * 0.8);

      const result = calculatePaperFromDirectUms(umsCandidate, paper, {
        seriesId: 'direct-ums',
        allowedGrades: paperAllowedGrades,
        gradingScale: route.gradingScale,
      });
      unweightedMaxTotalRaw += result.effectiveMaxRaw;
      totalUms += result.ums;
      return result;
    }

    const rawCandidate =
      rawMarksByPaper[paper.id] ??
      rawMarksByPaper[paper.code] ??
      (paper.unitCode ? rawMarksByPaper[paper.unitCode] : undefined) ??
      paper.defaultRaw;
    const weight =
      route.paperWeights?.[paper.id] ?? route.paperWeights?.[paper.code] ?? 1;

    const result = calculatePaperGrade(
      rawCandidate,
      paper,
      paperSeriesId,
      route.gradingScale,
      route.isModularUms,
      {
        variant: route.variant,
        weight,
        allowedGrades: paperAllowedGrades,
      }
    );

    unweightedTotalRaw += result.raw;
    unweightedMaxTotalRaw += result.effectiveMaxRaw;
    weightedSum += result.weightedMark;
    totalUms += result.ums;
    return result;
  });

  const maxTotalUms = route.isModularUms
    ? route.maxTotalScore
    : routePapers.reduce((sum, p) => sum + (p.maxUms ?? 100), 0);

  const fallbackBoundaries =
    Object.values(route.seriesBoundaries).find(
      (entry): entry is EngineGradeThreshold[] => entry !== undefined
    ) ??
    Object.values(subject.seriesBoundaries).find(
      (entry): entry is EngineGradeThreshold[] => entry !== undefined
    ) ??
    [];
  const rawBoundaries =
    useDirectUms && !route.isModularUms && route.gradingScale === '9-1'
      ? buildEdexcelIgcseUmsBoundaries(maxTotalUms, route.allowedGrades)
      : (route.seriesBoundaries[seriesId] ?? fallbackBoundaries);

  const effectiveModularUms = Boolean(route.isModularUms || useDirectUms);

  return evaluateCompositeGrade({
    paperResults,
    unweightedTotalRaw: useDirectUms ? 0 : unweightedTotalRaw,
    unweightedMaxTotalRaw,
    weightedCompositeRaw: Math.round(weightedSum),
    totalUms,
    maxTotalUms,
    maxTotalRaw: effectiveModularUms ? unweightedMaxTotalRaw : route.maxTotalScore,
    isModularUms: effectiveModularUms,
    gradingScale: route.gradingScale,
    allowedGrades: route.allowedGrades,
    aStarRule: route.aStarRule,
    boundariesRaw: rawBoundaries,
    routeId: route.id,
    routeLabel: route.label,
    inputMode: useDirectUms ? 'ums' : 'raw',
  });
}

/**
 * Computes composite subject marks, UMS, grade boundaries, Edexcel IAL A* A2 UMS
 * rules (when `subject.aStarRule` is configured), Direct UMS mode, and next-grade guidance.
 */
export function calculateSubjectGrade(
  subject: EngineSubjectInput,
  seriesId: string,
  rawMarksByPaper: Record<string, number>,
  perPaperSeriesById?: Record<string, string>,
  options?: CompositeGradeInputOptions
): SubjectCalculationResult {
  if (subject.routes && subject.routes.length > 0) {
    const defaultRoute =
      (subject.defaultRouteId
        ? subject.routes.find((r) => r.id === subject.defaultRouteId)
        : undefined) ?? subject.routes[0]!;
    return calculateRouteGrade(
      subject,
      defaultRoute,
      seriesId,
      rawMarksByPaper,
      perPaperSeriesById,
      options
    );
  }

  const canUseDirectUms = Boolean(subject.isModularUms || subject.boardId === 'edexcel-igcse');
  const useDirectUms = Boolean(canUseDirectUms && options?.inputMode === 'ums');
  let totalRaw = 0;
  let maxRawSum = 0;
  let totalUms = 0;

  const paperResults = subject.papers.map((paper) => {
    const paperSeriesId =
      perPaperSeriesById?.[paper.id] ?? perPaperSeriesById?.[paper.code] ?? seriesId;

    if (useDirectUms) {
      const maxUms = paper.maxUms ?? 100;
      const umsCandidate =
        options?.umsMarksByPaper?.[paper.id] ??
        options?.umsMarksByPaper?.[paper.code] ??
        (paper.unitCode ? options?.umsMarksByPaper?.[paper.unitCode] : undefined) ??
        Math.round(maxUms * 0.8);
      const result = calculatePaperFromDirectUms(umsCandidate, paper, {
        seriesId: 'direct-ums',
        gradingScale: subject.gradingScale,
      });
      maxRawSum += result.effectiveMaxRaw;
      totalUms += result.ums;
      return result;
    }

    const rawCandidate =
      rawMarksByPaper[paper.id] ?? rawMarksByPaper[paper.code] ?? paper.defaultRaw;
    const result = calculatePaperGrade(
      rawCandidate,
      paper,
      paperSeriesId,
      subject.gradingScale,
      subject.isModularUms
    );
    totalRaw += result.raw;
    maxRawSum += result.effectiveMaxRaw;
    totalUms += result.ums;
    return result;
  });

  const maxTotalUms =
    subject.maxTotalUms ??
    (canUseDirectUms
      ? subject.papers.reduce((sum, paper) => sum + (paper.maxUms ?? 100), 0)
      : 600);

  const fallbackBoundaries =
    Object.values(subject.seriesBoundaries).find(
      (entry): entry is EngineGradeThreshold[] => entry !== undefined
    ) ?? [];
  const rawBoundaries =
    useDirectUms && !subject.isModularUms && subject.gradingScale === '9-1'
      ? buildEdexcelIgcseUmsBoundaries(maxTotalUms)
      : (subject.seriesBoundaries[seriesId] ?? fallbackBoundaries);

  const effectiveModularUms = Boolean(subject.isModularUms || useDirectUms);

  return evaluateCompositeGrade({
    paperResults,
    unweightedTotalRaw: useDirectUms ? 0 : totalRaw,
    unweightedMaxTotalRaw: maxRawSum || subject.maxTotalRaw,
    weightedCompositeRaw: totalRaw,
    totalUms,
    maxTotalUms,
    maxTotalRaw: subject.maxTotalRaw,
    isModularUms: effectiveModularUms,
    gradingScale: subject.gradingScale,
    aStarRule: subject.aStarRule,
    boundariesRaw: rawBoundaries,
    inputMode: useDirectUms ? 'ums' : 'raw',
  });
}
