/**
 * Pearson Edexcel International A-Level Mathematics & Further Mathematics Suite Optimizer.
 *
 * Evaluates all 14 modular units (`WMA11`..`WDM11`) with per-unit exam sessions and
 * exhaustively optimizes non-overlapping unit allocation across Maths (`XMA01`/`YMA01`)
 * and Further Maths (`XFM01`/`YFM01`) following official Pearson Edexcel rules.
 *
 * Strictly framework-agnostic (zero React/DOM imports) so both client & Worker share it.
 */

import {
  EDEXCEL_MATHS_CASH_IN_DEFINITIONS,
  EDEXCEL_MATHS_UNIT_BY_CODE,
  EDEXCEL_MATHS_UNIT_CODES,
  EDEXCEL_MATHS_YMA01_APPLIED_PAIRS,
  type EdexcelMathsCashInCode,
  type EdexcelMathsSuiteAwardMode,
  type EdexcelMathsUnitCategory,
  type EdexcelMathsUnitCode,
} from '@ants/shared-types';
import {
  AS_ALLOWED_GRADES,
  A_STAR_TO_E_ORDER,
  calculatePaperFromDirectUms,
  calculatePaperGrade,
  evaluateAStarRule,
  sortBoundariesDescending,
  type AStarRuleEvaluation,
  type EngineAStarRule,
  type EngineGradeThreshold,
  type EnginePaperInput,
  type EngineSubjectInput,
  type NextBoundaryHint,
  type PaperCalculationResult,
} from './calculator-engine';

export const EDEXCEL_IAL_FM_CORE_UNITS: readonly EdexcelMathsUnitCode[] = [
  'WFM01',
  'WFM02',
  'WFM03',
];

export const EDEXCEL_IAL_NO_OCT_NOV_UNITS: readonly EdexcelMathsUnitCode[] = [
  'WFM01',
  'WFM02',
  'WFM03',
  'WME03',
  'WST03',
  'WDM11',
];

export function isOctNovSeriesId(seriesId: string): boolean {
  return /^on-/i.test(seriesId.trim());
}

export function hasFurtherMathsUnits(unitCodes: readonly EdexcelMathsUnitCode[]): boolean {
  return unitCodes.some((u) => EDEXCEL_IAL_FM_CORE_UNITS.includes(u));
}

const PURE_MATHS_CODES = new Set<EdexcelMathsUnitCode>(['WMA11', 'WMA12', 'WMA13', 'WMA14']);
const FURTHER_PURE_A2_CODES: readonly EdexcelMathsUnitCode[] = ['WFM02', 'WFM03'];
const FM_ELIGIBLE_POOL: ReadonlySet<EdexcelMathsUnitCode> = new Set([
  'WFM01',
  'WFM02',
  'WFM03',
  'WME01',
  'WME02',
  'WME03',
  'WST01',
  'WST02',
  'WST03',
  'WDM11',
]);
const FM_A2_UNIT_CODES: readonly EdexcelMathsUnitCode[] = [
  'WFM02',
  'WFM03',
  'WME02',
  'WME03',
  'WST02',
  'WST03',
];
const AS_APPLIED_POOL: readonly EdexcelMathsUnitCode[] = ['WME01', 'WST01', 'WDM11'];

const IAL_600_BOUNDARIES: readonly EngineGradeThreshold[] = [
  { grade: 'A*', minScore: 480 },
  { grade: 'A', minScore: 480 },
  { grade: 'B', minScore: 420 },
  { grade: 'C', minScore: 360 },
  { grade: 'D', minScore: 300 },
  { grade: 'E', minScore: 240 },
];

const AS_300_BOUNDARIES: readonly EngineGradeThreshold[] = [
  { grade: 'A', minScore: 240 },
  { grade: 'B', minScore: 210 },
  { grade: 'C', minScore: 180 },
  { grade: 'D', minScore: 150 },
  { grade: 'E', minScore: 120 },
];

const YMA01_ASTAR_RULE: EngineAStarRule = {
  minTotalUms: 480,
  minA2Ums: 180,
  a2PaperCodes: ['WMA13', 'WMA14'],
};

const YFM01_ASTAR_RULE: EngineAStarRule = {
  minTotalUms: 480,
  minA2Ums: 270,
  a2PaperCodes: [...FM_A2_UNIT_CODES],
  countBestA2Units: 3,
};

export type EdexcelMathsAssignedAward = EdexcelMathsCashInCode | 'unused';

export interface EdexcelMathsUnitEvaluation {
  unitCode: EdexcelMathsUnitCode;
  shortCode: string;
  title: string;
  level: 'AS' | 'A2';
  category: EdexcelMathsUnitCategory;
  seriesId: string;
  raw: number;
  maxRaw: number;
  ums: number;
  maxUms: number;
  unitGrade: string;
  pct: number;
  assignedAward: EdexcelMathsAssignedAward;
  inputMode?: 'raw' | 'ums';
}

export interface EdexcelMathsAwardSummary {
  cashInCode: EdexcelMathsCashInCode;
  title: string;
  shortTitle: string;
  level: 'AS' | 'IAL';
  unitCodes: EdexcelMathsUnitCode[];
  totalRaw: number;
  maxTotalRaw: number;
  totalUms: number;
  maxTotalUms: number;
  percentage: number;
  finalGrade: string;
  aStarRuleStatus: AStarRuleEvaluation | null;
  a2UnitsUsedForAStar?: EdexcelMathsUnitCode[];
  nextBoundary: NextBoundaryHint | null;
  bufferAboveTop: number;
  matchedPairLabel: string | null;
  boundaries: EngineGradeThreshold[];
}

export interface EdexcelMathsSuiteResult {
  resolvedMode: string;
  requestedMode: EdexcelMathsSuiteAwardMode;
  inputMode: 'raw' | 'ums';
  mathsAward: EdexcelMathsAwardSummary | null;
  furtherMathsAward: EdexcelMathsAwardSummary | null;
  unitResults: EdexcelMathsUnitEvaluation[];
  unusedUnitCodes: EdexcelMathsUnitCode[];
  optimizationNote: string;
  missingGuidance: string[];
}

export interface CalculateEdexcelMathsSuiteParams {
  suiteSubject: EngineSubjectInput;
  selectedUnitCodes: readonly EdexcelMathsUnitCode[];
  inputMode?: 'raw' | 'ums';
  rawMarksByUnit?: Record<string, number>;
  umsMarksByUnit?: Record<string, number>;
  seriesByUnit?: Record<string, string>;
  defaultSeriesId?: string;
  awardMode?: EdexcelMathsSuiteAwardMode;
}

function gradeRankScore(grade: string): number {
  const idx = A_STAR_TO_E_ORDER.indexOf(grade as (typeof A_STAR_TO_E_ORDER)[number]);
  return idx === -1 ? 0 : A_STAR_TO_E_ORDER.length - idx;
}

function makeDefaultFallbackPaper(code: EdexcelMathsUnitCode): EnginePaperInput {
  const def = EDEXCEL_MATHS_UNIT_BY_CODE[code];
  return {
    id: code.toLowerCase(),
    code: def.code,
    unitCode: def.code,
    title: `${def.title} (${def.shortCode})`,
    maxRaw: def.maxRaw,
    maxUms: def.maxUms,
    weightLabel: `${def.maxUms} UMS`,
    defaultRaw: Math.round(def.maxRaw * 0.8),
    level: def.level,
    seriesPaperCutoffs: {
      'mj-2025': { passC: 40, gradeA: 55, topGrade: 63 },
    },
  };
}

function chooseKCombinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const results: T[][] = [];
  const current: T[] = [];

  function backtrack(startIdx: number) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    const needed = k - current.length;
    for (let i = startIdx; i <= items.length - needed; i++) {
      current.push(items[i]!);
      backtrack(i + 1);
      current.pop();
    }
  }

  backtrack(0);
  return results;
}

function evaluateAwardCandidate(params: {
  cashInCode: EdexcelMathsCashInCode;
  unitCodes: EdexcelMathsUnitCode[];
  paperResultByCode: Map<EdexcelMathsUnitCode, PaperCalculationResult>;
  matchedPairLabel: string | null;
}): EdexcelMathsAwardSummary {
  const { cashInCode, unitCodes, paperResultByCode, matchedPairLabel } = params;
  const def = EDEXCEL_MATHS_CASH_IN_DEFINITIONS[cashInCode];
  const isAsAward = def.level === 'AS';
  const paperResults = unitCodes.map((c) => paperResultByCode.get(c)!);

  let totalRaw = 0;
  let maxTotalRaw = 0;
  let totalUms = 0;
  for (const res of paperResults) {
    totalRaw += res.raw;
    maxTotalRaw += res.effectiveMaxRaw;
    totalUms += res.ums;
  }

  const allowedGrades = isAsAward ? AS_ALLOWED_GRADES : A_STAR_TO_E_ORDER;
  const rawBoundaries = isAsAward ? AS_300_BOUNDARIES : IAL_600_BOUNDARIES;
  const boundaries = sortBoundariesDescending(rawBoundaries, 'A*-U', allowedGrades);

  let finalGrade = 'U';
  let nextBoundary: NextBoundaryHint | null = null;
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i]!;
    if (totalUms >= b.minScore) {
      finalGrade = b.grade;
      if (i > 0) {
        const higher = boundaries[i - 1]!;
        nextBoundary = {
          grade: higher.grade,
          needed: Math.max(0, higher.minScore - totalUms),
          minScore: higher.minScore,
        };
      }
      break;
    }
  }
  if (finalGrade === 'U' && boundaries.length > 0) {
    const lowest = boundaries[boundaries.length - 1]!;
    nextBoundary = {
      grade: lowest.grade,
      needed: Math.max(0, lowest.minScore - totalUms),
      minScore: lowest.minScore,
    };
  }

  let aStarRuleStatus: AStarRuleEvaluation | null = null;
  let a2UnitsUsedForAStar: EdexcelMathsUnitCode[] | undefined;

  if (cashInCode === 'YMA01' || cashInCode === 'YFM01') {
    const rule = cashInCode === 'YMA01' ? YMA01_ASTAR_RULE : YFM01_ASTAR_RULE;
    aStarRuleStatus = evaluateAStarRule(rule, paperResults, totalUms);

    if (cashInCode === 'YFM01') {
      const a2Pool = unitCodes
        .filter((c) => FM_A2_UNIT_CODES.includes(c))
        .sort(
          (a, b) =>
            (paperResultByCode.get(b)?.ums ?? 0) - (paperResultByCode.get(a)?.ums ?? 0)
        );
      a2UnitsUsedForAStar = a2Pool.slice(0, 3);
      // With fewer than 3 A2 units, even 100 UMS on 2 A2 units sums to 200 (< 270), so A* is impossible.
      aStarRuleStatus = {
        ...aStarRuleStatus,
        maxA2Ums: Math.min(300, a2Pool.length * 100),
      };
    }

    if (aStarRuleStatus.met) {
      finalGrade = 'A*';
      nextBoundary = null;
    } else if (finalGrade === 'A*') {
      finalGrade = 'A';
      nextBoundary = {
        grade: 'A*',
        needed: Math.max(aStarRuleStatus.missingTotalUms, aStarRuleStatus.missingA2Ums),
        minScore: rule.minTotalUms,
        a2UmsNeeded: aStarRuleStatus.missingA2Ums,
        requiredA2Ums: rule.minA2Ums,
      };
    }
  }

  const topBoundary = boundaries[0];
  const topScore = aStarRuleStatus ? aStarRuleStatus.requiredTotalUms : (topBoundary?.minScore ?? 240);
  const bufferAboveTop =
    finalGrade === (topBoundary?.grade ?? 'A*') && totalUms >= topScore
      ? totalUms - topScore
      : 0;

  return {
    cashInCode,
    title: def.title,
    shortTitle: def.shortTitle,
    level: def.level,
    unitCodes,
    totalRaw,
    maxTotalRaw,
    totalUms,
    maxTotalUms: def.totalUms,
    percentage: Math.round((totalUms / Math.max(1, def.totalUms)) * 100),
    finalGrade,
    aStarRuleStatus,
    ...(a2UnitsUsedForAStar ? { a2UnitsUsedForAStar } : {}),
    nextBoundary,
    bufferAboveTop,
    matchedPairLabel,
    boundaries,
  };
}

function generateMathsCandidates(
  code: 'XMA01' | 'YMA01',
  selectedSet: ReadonlySet<EdexcelMathsUnitCode>
): Array<{ unitCodes: EdexcelMathsUnitCode[]; matchedPairLabel: string | null }> {
  if (code === 'YMA01') {
    const pureSpine: EdexcelMathsUnitCode[] = ['WMA11', 'WMA12', 'WMA13', 'WMA14'];
    if (!pureSpine.every((u) => selectedSet.has(u))) return [];
    const results: Array<{ unitCodes: EdexcelMathsUnitCode[]; matchedPairLabel: string | null }> = [];
    for (const pair of EDEXCEL_MATHS_YMA01_APPLIED_PAIRS) {
      if (selectedSet.has(pair.units[0]) && selectedSet.has(pair.units[1])) {
        results.push({
          unitCodes: [...pureSpine, pair.units[0], pair.units[1]],
          matchedPairLabel: pair.shortLabel,
        });
      }
    }
    return results;
  }

  const asSpine: EdexcelMathsUnitCode[] = ['WMA11', 'WMA12'];
  if (!asSpine.every((u) => selectedSet.has(u))) return [];
  const results: Array<{ unitCodes: EdexcelMathsUnitCode[]; matchedPairLabel: string | null }> = [];
  for (const app of AS_APPLIED_POOL) {
    if (selectedSet.has(app)) {
      results.push({
        unitCodes: [...asSpine, app],
        matchedPairLabel: EDEXCEL_MATHS_UNIT_BY_CODE[app].shortCode,
      });
    }
  }
  return results;
}

function generateFurtherMathsCandidates(
  code: 'XFM01' | 'YFM01',
  remainingPool: readonly EdexcelMathsUnitCode[]
): EdexcelMathsUnitCode[][] {
  const eligible = remainingPool.filter((u) => FM_ELIGIBLE_POOL.has(u));
  if (!eligible.includes('WFM01')) return [];
  const electives: EdexcelMathsUnitCode[] = eligible.filter(
    (u): u is EdexcelMathsUnitCode => u !== 'WFM01'
  );

  if (code === 'XFM01') {
    return chooseKCombinations(electives, 2).map((pair) => ['WFM01', ...pair]);
  }

  return chooseKCombinations(electives, 5)
    .filter((five) => FURTHER_PURE_A2_CODES.some((fp) => five.includes(fp)))
    .map((five) => ['WFM01', ...five]);
}

interface ScoredAllocation {
  modeKey: string;
  maths: EdexcelMathsAwardSummary | null;
  fm: EdexcelMathsAwardSummary | null;
  candidateCount: number;
  scoreTuple: [number, number, number, number];
}

function compareScoreTuples(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number]
): number {
  for (let i = 0; i < 4; i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]!;
  }
  return 0;
}

function solveTierAllocation(params: {
  mathsCode: 'XMA01' | 'YMA01' | null;
  fmCode: 'XFM01' | 'YFM01' | null;
  modeKey: string;
  selectedCanonical: readonly EdexcelMathsUnitCode[];
  selectedSet: ReadonlySet<EdexcelMathsUnitCode>;
  paperResultByCode: Map<EdexcelMathsUnitCode, PaperCalculationResult>;
}): ScoredAllocation | null {
  const { mathsCode, fmCode, modeKey, selectedCanonical, selectedSet, paperResultByCode } =
    params;

  const mathsOptions = mathsCode
    ? generateMathsCandidates(mathsCode, selectedSet)
    : [{ unitCodes: [] as EdexcelMathsUnitCode[], matchedPairLabel: null }];

  if (mathsOptions.length === 0) return null;

  let best: ScoredAllocation | null = null;
  let candidateCount = 0;

  for (const mCand of mathsOptions) {
    const usedByMaths = new Set(mCand.unitCodes);
    const remaining = selectedCanonical.filter((u) => !usedByMaths.has(u) && !PURE_MATHS_CODES.has(u));

    const fmOptions = fmCode ? generateFurtherMathsCandidates(fmCode, remaining) : [[]];
    if (fmOptions.length === 0) continue;

    for (const fmUnits of fmOptions) {
      candidateCount++;
      const mathsSummary = mathsCode
        ? evaluateAwardCandidate({
            cashInCode: mathsCode,
            unitCodes: mCand.unitCodes,
            paperResultByCode,
            matchedPairLabel: mCand.matchedPairLabel,
          })
        : null;
      const fmSummary = fmCode
        ? evaluateAwardCandidate({
            cashInCode: fmCode,
            unitCodes: fmUnits,
            paperResultByCode,
            matchedPairLabel: null,
          })
        : null;

      const tuple: [number, number, number, number] = [
        mathsSummary ? gradeRankScore(mathsSummary.finalGrade) : 0,
        fmSummary ? gradeRankScore(fmSummary.finalGrade) : 0,
        (mathsSummary?.totalUms ?? 0) + (fmSummary?.totalUms ?? 0),
        (mathsSummary?.aStarRuleStatus?.actualA2Ums ?? 0) +
          (fmSummary?.aStarRuleStatus?.actualA2Ums ?? 0),
      ];

      if (!best || compareScoreTuples(tuple, best.scoreTuple) > 0) {
        best = {
          modeKey,
          maths: mathsSummary,
          fm: fmSummary,
          candidateCount,
          scoreTuple: tuple,
        };
      } else {
        best.candidateCount = candidateCount;
      }
    }
  }

  return best;
}

function buildMissingGuidance(
  selectedSet: ReadonlySet<EdexcelMathsUnitCode>,
  resolvedMode: string
): string[] {
  const hints: string[] = [];
  if (resolvedMode === 'incomplete') {
    if (!selectedSet.has('WMA11') || !selectedSet.has('WMA12')) {
      hints.push('Select P1 (WMA11) + P2 (WMA12) + 1 unit from {M1, S1, D1} for AS Maths (XMA01).');
    } else if (!AS_APPLIED_POOL.some((u) => selectedSet.has(u))) {
      hints.push('Add M1 (WME01), S1 (WST01), or D1 (WDM11) to complete AS Maths (XMA01).');
    }
    if (selectedSet.has('WMA11') && selectedSet.has('WMA12') && selectedSet.has('WMA13') && selectedSet.has('WMA14')) {
      hints.push(
        'For IAL Maths (YMA01), include one official pair: M1+S1, M1+M2, S1+S2, M1+D1, or S1+D1.'
      );
    }
    if (selectedSet.has('WFM01')) {
      hints.push(
        'For AS Further Maths (XFM01), pair FP1 with any 2 further/applied units not used by Maths.'
      );
    }
    if (hints.length === 0) {
      hints.push('Select at least 3 valid units (e.g. P1 + P2 + M1 for AS Maths or use a Quick Preset).');
    }
  }
  return hints;
}

function buildOptimizationNote(
  allocation: ScoredAllocation | null,
  unusedCodes: readonly EdexcelMathsUnitCode[]
): string {
  if (!allocation || (!allocation.maths && !allocation.fm)) {
    return 'Select a valid combination of units to compute cash-in grades.';
  }

  const shortList = (codes: readonly EdexcelMathsUnitCode[]) =>
    codes.map((c) => EDEXCEL_MATHS_UNIT_BY_CODE[c].shortCode).join(', ');

  const parts: string[] = [];
  if (allocation.maths) {
    const mApplied = allocation.maths.unitCodes.filter((c) => !PURE_MATHS_CODES.has(c));
    parts.push(
      `${allocation.maths.cashInCode} uses ${shortList(mApplied)} (${allocation.maths.totalUms}/${allocation.maths.maxTotalUms} UMS, Grade ${allocation.maths.finalGrade})`
    );
  }
  if (allocation.fm) {
    parts.push(
      `${allocation.fm.cashInCode} uses ${shortList(allocation.fm.unitCodes)} (${allocation.fm.totalUms}/${allocation.fm.maxTotalUms} UMS, Grade ${allocation.fm.finalGrade})`
    );
  }
  if (unusedCodes.length > 0) {
    parts.push(`unused spillover: ${shortList(unusedCodes)}`);
  }

  const evalSuffix =
    allocation.candidateCount > 1
      ? ` Evaluated ${allocation.candidateCount} non-overlapping Pearson allocations.`
      : '';
  return `${parts.join('; ')}.${evalSuffix}`;
}

/**
 * Computes simultaneous Edexcel IAL Mathematics (`XMA01`/`YMA01`) and Further
 * Mathematics (`XFM01`/`YFM01`) cash-in awards with Pearson non-overlapping unit optimization.
 */
export function calculateEdexcelMathsSuite(
  params: CalculateEdexcelMathsSuiteParams
): EdexcelMathsSuiteResult {
  const {
    suiteSubject,
    selectedUnitCodes,
    inputMode = 'raw',
    rawMarksByUnit = {},
    umsMarksByUnit = {},
    seriesByUnit,
    defaultSeriesId = 'mj-2025',
    awardMode = 'auto',
  } = params;

  const selectedSet = new Set(selectedUnitCodes);
  const selectedCanonical = EDEXCEL_MATHS_UNIT_CODES.filter((c) => selectedSet.has(c));

  const paperByCode = new Map<string, EnginePaperInput>();
  for (const paper of suiteSubject.papers) {
    paperByCode.set(paper.code.toUpperCase(), paper);
    if (paper.unitCode) {
      paperByCode.set(paper.unitCode.toUpperCase(), paper);
    }
  }

  const paperResultByCode = new Map<EdexcelMathsUnitCode, PaperCalculationResult>();
  const unitSeriesByCode = new Map<EdexcelMathsUnitCode, string>();

  for (const code of selectedCanonical) {
    const paper = paperByCode.get(code) ?? makeDefaultFallbackPaper(code);
    if (inputMode === 'ums') {
      const umsCandidate =
        umsMarksByUnit[code] ??
        umsMarksByUnit[paper.id] ??
        Math.round((paper.maxUms ?? 100) * 0.8);
      const calc = calculatePaperFromDirectUms(umsCandidate, paper, { seriesId: 'direct-ums' });
      paperResultByCode.set(code, calc);
      unitSeriesByCode.set(code, 'direct-ums');
      continue;
    }

    let unitSeriesId = seriesByUnit?.[code] ?? defaultSeriesId;
    if (EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(code) && isOctNovSeriesId(unitSeriesId)) {
      const nonOctNov = (paper.availableSeriesIds ?? Object.keys(paper.seriesThresholds ?? {}))
        .find((sId) => !isOctNovSeriesId(sId));
      unitSeriesId = nonOctNov ?? 'mj-2025';
    }
    const rawCandidate = rawMarksByUnit[code] ?? rawMarksByUnit[paper.id] ?? paper.defaultRaw;
    const calc = calculatePaperGrade(rawCandidate, paper, unitSeriesId, 'A*-U', true);
    paperResultByCode.set(code, calc);
    unitSeriesByCode.set(code, unitSeriesId);
  }

  type TierSpec = {
    modeKey: string;
    mathsCode: 'XMA01' | 'YMA01' | null;
    fmCode: 'XFM01' | 'YFM01' | null;
  };

  const explicitTiers: Record<Exclude<EdexcelMathsSuiteAwardMode, 'auto'>, TierSpec[]> = {
    'YMA01+YFM01': [{ modeKey: 'YMA01+YFM01', mathsCode: 'YMA01', fmCode: 'YFM01' }],
    'YMA01+XFM01': [{ modeKey: 'YMA01+XFM01', mathsCode: 'YMA01', fmCode: 'XFM01' }],
    'XMA01+XFM01': [{ modeKey: 'XMA01+XFM01', mathsCode: 'XMA01', fmCode: 'XFM01' }],
    YMA01: [{ modeKey: 'YMA01', mathsCode: 'YMA01', fmCode: null }],
    XMA01: [{ modeKey: 'XMA01', mathsCode: 'XMA01', fmCode: null }],
    YFM01: [{ modeKey: 'YFM01', mathsCode: null, fmCode: 'YFM01' }],
    XFM01: [{ modeKey: 'XFM01', mathsCode: null, fmCode: 'XFM01' }],
  };

  const autoTiers: TierSpec[][] = [
    [{ modeKey: 'YMA01+YFM01', mathsCode: 'YMA01', fmCode: 'YFM01' }],
    [{ modeKey: 'YMA01+XFM01', mathsCode: 'YMA01', fmCode: 'XFM01' }],
    [
      { modeKey: 'XMA01+XFM01', mathsCode: 'XMA01', fmCode: 'XFM01' },
      { modeKey: 'YMA01', mathsCode: 'YMA01', fmCode: null },
      { modeKey: 'YFM01', mathsCode: null, fmCode: 'YFM01' },
    ],
    [
      { modeKey: 'XMA01', mathsCode: 'XMA01', fmCode: null },
      { modeKey: 'XFM01', mathsCode: null, fmCode: 'XFM01' },
    ],
  ];

  let winning: ScoredAllocation | null = null;

  if (awardMode !== 'auto') {
    for (const tier of explicitTiers[awardMode]) {
      const candidate = solveTierAllocation({
        ...tier,
        selectedCanonical,
        selectedSet,
        paperResultByCode,
      });
      if (candidate) {
        winning = candidate;
        break;
      }
    }
  } else {
    for (const tierGroup of autoTiers) {
      let bestInTier: ScoredAllocation | null = null;
      for (const tier of tierGroup) {
        const candidate = solveTierAllocation({
          ...tier,
          selectedCanonical,
          selectedSet,
          paperResultByCode,
        });
        if (!candidate) continue;
        if (!bestInTier || compareScoreTuples(candidate.scoreTuple, bestInTier.scoreTuple) > 0) {
          bestInTier = candidate;
        }
      }
      if (bestInTier) {
        winning = bestInTier;
        break;
      }
    }
  }

  const assignmentMap = new Map<EdexcelMathsUnitCode, EdexcelMathsAssignedAward>();
  if (winning?.maths) {
    for (const c of winning.maths.unitCodes) {
      assignmentMap.set(c, winning.maths.cashInCode);
    }
  }
  if (winning?.fm) {
    for (const c of winning.fm.unitCodes) {
      assignmentMap.set(c, winning.fm.cashInCode);
    }
  }

  const unusedUnitCodes: EdexcelMathsUnitCode[] = [];
  const unitResults: EdexcelMathsUnitEvaluation[] = selectedCanonical.map((code) => {
    const def = EDEXCEL_MATHS_UNIT_BY_CODE[code];
    const calc = paperResultByCode.get(code)!;
    const assignedAward = assignmentMap.get(code) ?? 'unused';
    if (assignedAward === 'unused') {
      unusedUnitCodes.push(code);
    }
    return {
      unitCode: code,
      shortCode: def.shortCode,
      title: def.title,
      level: def.level,
      category: def.category,
      seriesId: unitSeriesByCode.get(code) ?? (inputMode === 'ums' ? 'direct-ums' : defaultSeriesId),
      raw: calc.raw,
      maxRaw: calc.effectiveMaxRaw,
      ums: calc.ums,
      maxUms: calc.maxUms,
      unitGrade: calc.paperGrade,
      pct: calc.pct,
      assignedAward,
      inputMode,
    };
  });

  const resolvedMode = winning ? winning.modeKey : 'incomplete';
  const missingGuidance = buildMissingGuidance(selectedSet, resolvedMode);
  const optimizationNote =
    winning !== null
      ? buildOptimizationNote(winning, unusedUnitCodes)
      : awardMode !== 'auto'
        ? `Current unit selection cannot form ${awardMode} without missing or overlapping units.`
        : 'Select at least one complete AS or IAL combination to calculate Maths / Further Maths awards.';

  return {
    resolvedMode,
    requestedMode: awardMode,
    inputMode,
    mathsAward: winning?.maths ?? null,
    furtherMathsAward: winning?.fm ?? null,
    unitResults,
    unusedUnitCodes,
    optimizationNote,
    missingGuidance,
  };
}
