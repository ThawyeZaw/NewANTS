/**
 * Study Curriculum Catalog & Edexcel Modular Maths Suite (`WMA11-SET`) Rule Engine (`[ZYY-4.2]`).
 *
 * Pure TypeScript module with zero React, Next.js, or database dependencies.
 * Designed so Thaw Ye Zaw can reuse these exact types and validation rules in `[THAW-4.1]`.
 */

import type { StudySubjectType } from './dashboard';

export const STUDY_CURRICULUM_STORAGE_KEY = 'ants-study-curriculum-v1';

export type CurriculumBoardId =
  | 'edexcel-ial'
  | 'cambridge-igcse'
  | 'cambridge-alevel'
  | 'edexcel-igcse';

export type SubjectFaculty =
  | 'Mathematics'
  | 'Sciences'
  | 'Computing & Economics'
  | 'Languages & Humanities';

export type EdexcelMathsUnitCategory =
  | 'pure'
  | 'further_pure'
  | 'mechanics'
  | 'statistics'
  | 'decision';

export type EdexcelMathsUnitCode =
  | 'WMA11'
  | 'WMA12'
  | 'WMA13'
  | 'WMA14'
  | 'WFM01'
  | 'WFM02'
  | 'WFM03'
  | 'WME01'
  | 'WME02'
  | 'WME03'
  | 'WST01'
  | 'WST02'
  | 'WST03'
  | 'WDM11';

export type EdexcelMathsCashInCode = 'XMA01' | 'YMA01' | 'XFM01' | 'YFM01';

export type EdexcelMathsRuleType =
  | 'CHOOSE_N_FROM_SET'
  | 'EXACT_COMBINATION_PAIRS'
  | 'AT_LEAST_ONE_OF';

export interface CurriculumBoardMeta {
  id: CurriculumBoardId;
  label: string;
  shortLabel: string;
  qualificationLevel: string;
  gradingScaleLabel: string;
  summary: string;
}

export interface SubjectUnitComponent {
  code: string;
  shortCode: string;
  title: string;
  level: 'AS' | 'A2' | 'Core' | 'Extended';
  maxUms?: number;
  maxRaw: number;
  durationMinutes: number;
  compulsory?: boolean;
}

export interface SyllabusTopicPreviewItem {
  code: string;
  unitCode: string;
  title: string;
  subtopicCount: number;
  status: 'mastered' | 'in_progress' | 'not_started';
}

export interface CurriculumSubjectItem {
  id: string;
  code: string;
  boardId: CurriculumBoardId;
  boardLabel: string;
  title: string;
  faculty: SubjectFaculty;
  subjectType: StudySubjectType;
  gradingScale: 'A*-U' | '9-1';
  totalUms?: number;
  totalRawMarks: number;
  topicCount: number;
  paperCount: number;
  examSessionWindow: string;
  summary: string;
  defaultEnrolled: boolean;
  defaultTargetGrade: string;
  units: SubjectUnitComponent[];
  sampleTopics: SyllabusTopicPreviewItem[];
}

export interface EdexcelMathsUnitDefinition {
  code: EdexcelMathsUnitCode;
  shortCode: string;
  title: string;
  category: EdexcelMathsUnitCategory;
  categoryLabel: string;
  level: 'AS' | 'A2';
  maxUms: number;
  maxRaw: number;
  durationMinutes: number;
  prerequisiteCodes: EdexcelMathsUnitCode[];
  summary: string;
}

export interface EdexcelMathsCombinationPair {
  id: string;
  label: string;
  shortLabel: string;
  units: [EdexcelMathsUnitCode, EdexcelMathsUnitCode];
  recommendedFor: string;
}

export interface EdexcelMathsCashInDefinition {
  code: EdexcelMathsCashInCode;
  title: string;
  shortTitle: string;
  level: 'AS' | 'IAL';
  requiredUnits: number;
  totalUms: number;
  compulsoryUnits: EdexcelMathsUnitCode[];
  ruleSummary: string;
}

export interface EdexcelMathsRuleCheckResult {
  id: string;
  ruleType: EdexcelMathsRuleType;
  label: string;
  passed: boolean;
  detail: string;
}

export interface EdexcelMathsValidationResult {
  cashInCode: EdexcelMathsCashInCode;
  isValid: boolean;
  requiredUnitCount: number;
  selectedUnitCount: number;
  totalUms: number;
  targetUms: number;
  matchedPairLabel: string | null;
  conflictingUnits: EdexcelMathsUnitCode[];
  missingCompulsoryUnits: EdexcelMathsUnitCode[];
  ruleChecks: EdexcelMathsRuleCheckResult[];
  summaryMessage: string;
}

export interface EdexcelMathsPathwayPreset {
  id: string;
  label: string;
  badge: string;
  cashInCode: EdexcelMathsCashInCode;
  units: EdexcelMathsUnitCode[];
  description: string;
}

export interface StudyCurriculumPersistedState {
  version: 1;
  activeBoard: CurriculumBoardId;
  enrolledSubjectIds: string[];
  targetGradeBySubjectId: Record<string, string>;
  /** Active cash-in code being configured in the WMA11-SET workbench */
  activeMathsCashIn: EdexcelMathsCashInCode;
  /** Enrolled cash-in awards (a student can take YMA01 alone or YMA01 + XFM01/YFM01) */
  enrolledMathsCashIns: EdexcelMathsCashInCode[];
  /** Unit selections keyed by cash-in code */
  mathsUnitsByCashIn: Record<EdexcelMathsCashInCode, EdexcelMathsUnitCode[]>;
}

/**
 * Official 5 Edexcel IAL Mathematics (`YMA01`) applied unit pairs (`EXACT_COMBINATION_PAIRS`).
 */
export const EDEXCEL_YMA01_APPLIED_PAIRS: EdexcelMathsCombinationPair[] = [
  {
    id: 'm1-s1',
    label: 'Mechanics 1 + Statistics 1 (WME01 + WST01)',
    shortLabel: 'M1 + S1',
    units: ['WME01', 'WST01'],
    recommendedFor: 'Engineering, Physics, Chemistry & Natural Sciences',
  },
  {
    id: 'm1-m2',
    label: 'Mechanics 1 + Mechanics 2 (WME01 + WME02)',
    shortLabel: 'M1 + M2',
    units: ['WME01', 'WME02'],
    recommendedFor: 'Mechanical, Civil & Aeronautical Engineering',
  },
  {
    id: 's1-s2',
    label: 'Statistics 1 + Statistics 2 (WST01 + WST02)',
    shortLabel: 'S1 + S2',
    units: ['WST01', 'WST02'],
    recommendedFor: 'Economics, Data Science, Medicine & Finance',
  },
  {
    id: 'm1-d1',
    label: 'Mechanics 1 + Decision 1 (WME01 + WDM11)',
    shortLabel: 'M1 + D1',
    units: ['WME01', 'WDM11'],
    recommendedFor: 'Computer Science, Robotics & Electrical Engineering',
  },
  {
    id: 's1-d1',
    label: 'Statistics 1 + Decision 1 (WST01 + WDM11)',
    shortLabel: 'S1 + D1',
    units: ['WST01', 'WDM11'],
    recommendedFor: 'Software Engineering, Operations Research & Quantitative Economics',
  },
];

const AS_APPLIED_POOL: EdexcelMathsUnitCode[] = ['WME01', 'WST01', 'WDM11'];
const FURTHER_PURE_A2_POOL: EdexcelMathsUnitCode[] = ['WFM02', 'WFM03'];
const FURTHER_MATHS_OPTIONAL_POOL: EdexcelMathsUnitCode[] = [
  'WFM02',
  'WFM03',
  'WME01',
  'WME02',
  'WME03',
  'WST01',
  'WST02',
  'WST03',
  'WDM11',
];

const COMPULSORY_BY_CASH_IN: Record<EdexcelMathsCashInCode, EdexcelMathsUnitCode[]> = {
  XMA01: ['WMA11', 'WMA12'],
  YMA01: ['WMA11', 'WMA12', 'WMA13', 'WMA14'],
  XFM01: ['WFM01'],
  YFM01: ['WFM01'],
};

const REQUIRED_COUNT_BY_CASH_IN: Record<EdexcelMathsCashInCode, number> = {
  XMA01: 3,
  YMA01: 6,
  XFM01: 3,
  YFM01: 6,
};

const CANONICAL_UNIT_ORDER: EdexcelMathsUnitCode[] = [
  'WMA11',
  'WMA12',
  'WMA13',
  'WMA14',
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
];

const SHORT_LABEL_BY_UNIT: Record<EdexcelMathsUnitCode, string> = {
  WMA11: 'P1',
  WMA12: 'P2',
  WMA13: 'P3',
  WMA14: 'P4',
  WFM01: 'FP1',
  WFM02: 'FP2',
  WFM03: 'FP3',
  WME01: 'M1',
  WME02: 'M2',
  WME03: 'M3',
  WST01: 'S1',
  WST02: 'S2',
  WST03: 'S3',
  WDM11: 'D1',
};

export function sortMathsUnitsCanonical(
  units: readonly EdexcelMathsUnitCode[]
): EdexcelMathsUnitCode[] {
  const unique = Array.from(new Set(units));
  return unique.sort(
    (a, b) => CANONICAL_UNIT_ORDER.indexOf(a) - CANONICAL_UNIT_ORDER.indexOf(b)
  );
}

export function isCompulsoryUnitForCashIn(
  cashInCode: EdexcelMathsCashInCode,
  unitCode: EdexcelMathsUnitCode
): boolean {
  return COMPULSORY_BY_CASH_IN[cashInCode].includes(unitCode);
}

export function isUnitAllowedInCashInPool(
  cashInCode: EdexcelMathsCashInCode,
  unitCode: EdexcelMathsUnitCode
): boolean {
  if (cashInCode === 'XMA01') {
    return COMPULSORY_BY_CASH_IN.XMA01.includes(unitCode) || AS_APPLIED_POOL.includes(unitCode);
  }
  if (cashInCode === 'YMA01') {
    return (
      COMPULSORY_BY_CASH_IN.YMA01.includes(unitCode) ||
      ['WME01', 'WME02', 'WST01', 'WST02', 'WDM11'].includes(unitCode)
    );
  }
  // XFM01 and YFM01 draw from FP1 + FURTHER_MATHS_OPTIONAL_POOL (never P1-P4)
  return unitCode === 'WFM01' || FURTHER_MATHS_OPTIONAL_POOL.includes(unitCode);
}

/**
 * Evaluates Edexcel IAL Modular Mathematics (`WMA11-SET`) unit combinations against
 * `CHOOSE_N_FROM_SET`, `EXACT_COMBINATION_PAIRS`, and `AT_LEAST_ONE_OF` rules.
 *
 * @param cashInCode Target cash-in award (`XMA01` | `YMA01` | `XFM01` | `YFM01`)
 * @param selectedUnits Units currently selected for that cash-in award
 * @param primaryMathsUnits Optional units already locked to `XMA01` / `YMA01` (used to detect overlap in Further Maths)
 */
export function validateMathsSuiteSelection(
  cashInCode: EdexcelMathsCashInCode,
  selectedUnits: readonly EdexcelMathsUnitCode[],
  primaryMathsUnits: readonly EdexcelMathsUnitCode[] = []
): EdexcelMathsValidationResult {
  const sorted = sortMathsUnitsCanonical(selectedUnits);
  const selectedSet = new Set(sorted);
  const requiredUnitCount = REQUIRED_COUNT_BY_CASH_IN[cashInCode];
  const targetUms = requiredUnitCount * 100;
  const compulsory = COMPULSORY_BY_CASH_IN[cashInCode];
  const missingCompulsoryUnits = compulsory.filter((u) => !selectedSet.has(u));

  const isFurtherAward = cashInCode === 'XFM01' || cashInCode === 'YFM01';
  const primarySet = new Set(primaryMathsUnits);
  const conflictingUnits = isFurtherAward
    ? sorted.filter((u) => primarySet.has(u) && !u.startsWith('WFM'))
    : [];

  const ruleChecks: EdexcelMathsRuleCheckResult[] = [];
  let matchedPairLabel: string | null = null;

  if (cashInCode === 'XMA01') {
    const compulsoryPassed = missingCompulsoryUnits.length === 0;
    ruleChecks.push({
      id: 'xma01-pure',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Compulsory AS Pure units (WMA11 P1 + WMA12 P2)',
      passed: compulsoryPassed,
      detail: compulsoryPassed
        ? 'Both P1 (WMA11) and P2 (WMA12) are included.'
        : `Missing ${missingCompulsoryUnits.map((u) => SHORT_LABEL_BY_UNIT[u]).join(', ')}.`,
    });

    const appliedChosen = sorted.filter((u) => !compulsory.includes(u));
    const singleApplied = appliedChosen[0];
    const validApplied =
      appliedChosen.length === 1 &&
      singleApplied !== undefined &&
      AS_APPLIED_POOL.includes(singleApplied);
    ruleChecks.push({
      id: 'xma01-applied',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Choose 1 AS Applied unit from {M1, S1, D1}',
      passed: validApplied,
      detail:
        validApplied && singleApplied
          ? `Selected ${SHORT_LABEL_BY_UNIT[singleApplied]} (${singleApplied}).`
          : `Select exactly 1 unit from M1 (WME01), S1 (WST01), or D1 (WDM11) (currently ${appliedChosen.length}).`,
    });
  } else if (cashInCode === 'YMA01') {
    const compulsoryPassed = missingCompulsoryUnits.length === 0;
    ruleChecks.push({
      id: 'yma01-pure',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Compulsory IAL Pure Spine (WMA11 P1 – WMA14 P4)',
      passed: compulsoryPassed,
      detail: compulsoryPassed
        ? 'All 4 Pure units (P1, P2, P3, P4 = 400 UMS) are locked in.'
        : `Missing ${missingCompulsoryUnits.map((u) => SHORT_LABEL_BY_UNIT[u]).join(', ')}.`,
    });

    const appliedChosen = sorted.filter((u) => !compulsory.includes(u));
    const matchedPair = EDEXCEL_YMA01_APPLIED_PAIRS.find(
      (pair) =>
        appliedChosen.length === 2 &&
        appliedChosen.includes(pair.units[0]) &&
        appliedChosen.includes(pair.units[1])
    );
    matchedPairLabel = matchedPair ? matchedPair.label : null;

    ruleChecks.push({
      id: 'yma01-pair',
      ruleType: 'EXACT_COMBINATION_PAIRS',
      label: 'Valid 2-unit Applied Pair {(M1,S1), (M1,M2), (S1,S2), (M1,D1), (S1,D1)}',
      passed: Boolean(matchedPair),
      detail: matchedPair
        ? `Matched official pair: ${matchedPair.shortLabel} (${matchedPair.units.join(' + ')}).`
        : appliedChosen.length === 2
          ? `${appliedChosen.map((u) => SHORT_LABEL_BY_UNIT[u]).join(' + ')} is not an official Edexcel YMA01 pair.`
          : `Select 2 applied units forming a valid pair (currently ${appliedChosen.length} selected).`,
    });
  } else if (cashInCode === 'XFM01') {
    const hasFp1 = selectedSet.has('WFM01');
    ruleChecks.push({
      id: 'xfm01-fp1',
      ruleType: 'AT_LEAST_ONE_OF',
      label: 'Compulsory AS Further Pure 1 (WFM01 FP1)',
      passed: hasFp1,
      detail: hasFp1 ? 'FP1 (WFM01) is included.' : 'FP1 (WFM01) is required for XFM01.',
    });

    const optionalUnits = sorted.filter((u) => u !== 'WFM01');
    const allInPool = optionalUnits.every((u) => FURTHER_MATHS_OPTIONAL_POOL.includes(u));
    const countPassed = optionalUnits.length === 2 && allInPool && conflictingUnits.length === 0;
    ruleChecks.push({
      id: 'xfm01-electives',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Choose 2 non-overlapping Further/Applied units',
      passed: countPassed,
      detail:
        conflictingUnits.length > 0
          ? `Units ${conflictingUnits.map((u) => SHORT_LABEL_BY_UNIT[u]).join(', ')} are already counted toward IAL Mathematics.`
          : countPassed
            ? `Selected ${optionalUnits.map((u) => SHORT_LABEL_BY_UNIT[u]).join(' + ')}.`
            : `Choose 2 units from FP2, FP3, M1–M3, S1–S3, D1 (currently ${optionalUnits.length}).`,
    });
  } else {
    // YFM01 — IAL Further Mathematics (6 units · 600 UMS)
    const hasFp1 = selectedSet.has('WFM01');
    const hasA2FurtherPure = FURTHER_PURE_A2_POOL.some((u) => selectedSet.has(u));
    ruleChecks.push({
      id: 'yfm01-fp-core',
      ruleType: 'AT_LEAST_ONE_OF',
      label: 'FP1 (WFM01) + at least one of {FP2 (WFM02), FP3 (WFM03)}',
      passed: hasFp1 && hasA2FurtherPure,
      detail:
        hasFp1 && hasA2FurtherPure
          ? `Includes FP1 and ${FURTHER_PURE_A2_POOL.filter((u) => selectedSet.has(u))
              .map((u) => SHORT_LABEL_BY_UNIT[u])
              .join(' + ')}.`
          : 'IAL Further Maths requires FP1 plus at least one of FP2 or FP3.',
    });

    const allAllowed = sorted.every(
      (u) => u === 'WFM01' || FURTHER_MATHS_OPTIONAL_POOL.includes(u)
    );
    const sixNonOverlapping =
      sorted.length === 6 && allAllowed && conflictingUnits.length === 0;
    ruleChecks.push({
      id: 'yfm01-six-units',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Complete 6-unit (600 UMS) Further Maths combination without YMA01 overlap',
      passed: sixNonOverlapping,
      detail:
        conflictingUnits.length > 0
          ? `Remove ${conflictingUnits.map((u) => SHORT_LABEL_BY_UNIT[u]).join(', ')} (already counted in YMA01).`
          : sixNonOverlapping
            ? `All 6 Further Maths units (${sorted.map((u) => SHORT_LABEL_BY_UNIT[u]).join(', ')}) verified.`
            : `Select 6 total units for YFM01 (currently ${sorted.length}/6).`,
    });
  }

  const isValid =
    sorted.length === requiredUnitCount &&
    missingCompulsoryUnits.length === 0 &&
    conflictingUnits.length === 0 &&
    ruleChecks.every((c) => c.passed);

  const summaryMessage = isValid
    ? `${cashInCode} combination valid (${sorted.map((u) => SHORT_LABEL_BY_UNIT[u]).join(', ')} · ${targetUms} UMS).`
    : ruleChecks.find((c) => !c.passed)?.detail ??
      `Select ${requiredUnitCount} valid units for ${cashInCode}.`;

  return {
    cashInCode,
    isValid,
    requiredUnitCount,
    selectedUnitCount: sorted.length,
    totalUms: sorted.length * 100,
    targetUms,
    matchedPairLabel,
    conflictingUnits,
    missingCompulsoryUnits,
    ruleChecks,
    summaryMessage,
  };
}

/**
 * Toggles an optional unit in the given cash-in award while keeping compulsory units locked.
 */
export function toggleUnitInCashIn(
  cashInCode: EdexcelMathsCashInCode,
  currentUnits: readonly EdexcelMathsUnitCode[],
  unitCode: EdexcelMathsUnitCode
): EdexcelMathsUnitCode[] {
  if (isCompulsoryUnitForCashIn(cashInCode, unitCode)) {
    return sortMathsUnitsCanonical(currentUnits);
  }
  if (!isUnitAllowedInCashInPool(cashInCode, unitCode)) {
    return sortMathsUnitsCanonical(currentUnits);
  }
  const exists = currentUnits.includes(unitCode);
  const next = exists
    ? currentUnits.filter((u) => u !== unitCode)
    : [...currentUnits, unitCode];
  return sortMathsUnitsCanonical([
    ...COMPULSORY_BY_CASH_IN[cashInCode],
    ...next,
  ]);
}

/**
 * Formats a concise human-readable summary string for `WMA11-SET` on the Study Dashboard & Catalog.
 */
export function formatMathsSuiteSummary(
  cashInCode: EdexcelMathsCashInCode,
  units: readonly EdexcelMathsUnitCode[],
  enrolledCashIns: readonly EdexcelMathsCashInCode[] = [cashInCode]
): string {
  const sorted = sortMathsUnitsCanonical(units);
  const shortCodes = sorted.map((u) => SHORT_LABEL_BY_UNIT[u]);
  const cashInLabel =
    enrolledCashIns.length > 1 ? enrolledCashIns.join(' + ') : cashInCode;
  return `Cash-in ${cashInLabel} · ${sorted.length}/14 units (${shortCodes.join(', ')})`;
}

/**
 * Filters the curriculum catalog by board, faculty, enrollment filter, and search query.
 */
export function filterCurriculumSubjects(
  subjects: readonly CurriculumSubjectItem[],
  options: {
    boardId: CurriculumBoardId;
    faculty?: 'all' | SubjectFaculty;
    enrolledOnly?: boolean;
    enrolledIds?: readonly string[];
    searchQuery?: string;
  }
): CurriculumSubjectItem[] {
  const {
    boardId,
    faculty = 'all',
    enrolledOnly = false,
    enrolledIds = [],
    searchQuery = '',
  } = options;
  const enrolledSet = new Set(enrolledIds);
  const q = searchQuery.trim().toLowerCase();

  return subjects.filter((subj) => {
    if (subj.boardId !== boardId) return false;
    if (faculty !== 'all' && subj.faculty !== faculty) return false;
    if (enrolledOnly && !enrolledSet.has(subj.id)) return false;
    if (!q) return true;

    const unitHit = subj.units.some(
      (u) =>
        u.code.toLowerCase().includes(q) ||
        u.shortCode.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q)
    );
    return (
      subj.code.toLowerCase().includes(q) ||
      subj.title.toLowerCase().includes(q) ||
      subj.faculty.toLowerCase().includes(q) ||
      subj.summary.toLowerCase().includes(q) ||
      unitHit
    );
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const VALID_BOARDS: CurriculumBoardId[] = [
  'edexcel-ial',
  'cambridge-igcse',
  'cambridge-alevel',
  'edexcel-igcse',
];

const VALID_CASH_INS: EdexcelMathsCashInCode[] = [
  'XMA01',
  'YMA01',
  'XFM01',
  'YFM01',
];

export function sanitizeStudyCurriculumState(
  raw: unknown,
  fallback: StudyCurriculumPersistedState
): StudyCurriculumPersistedState {
  if (!isObjectRecord(raw)) return fallback;

  const activeBoard: CurriculumBoardId = VALID_BOARDS.includes(
    raw.activeBoard as CurriculumBoardId
  )
    ? (raw.activeBoard as CurriculumBoardId)
    : fallback.activeBoard;

  const activeMathsCashIn: EdexcelMathsCashInCode = VALID_CASH_INS.includes(
    raw.activeMathsCashIn as EdexcelMathsCashInCode
  )
    ? (raw.activeMathsCashIn as EdexcelMathsCashInCode)
    : fallback.activeMathsCashIn;

  const enrolledSubjectIds = Array.isArray(raw.enrolledSubjectIds)
    ? raw.enrolledSubjectIds.filter((v): v is string => typeof v === 'string')
    : fallback.enrolledSubjectIds;

  const enrolledMathsCashIns = Array.isArray(raw.enrolledMathsCashIns)
    ? raw.enrolledMathsCashIns.filter((v): v is EdexcelMathsCashInCode =>
        VALID_CASH_INS.includes(v as EdexcelMathsCashInCode)
      )
    : fallback.enrolledMathsCashIns;

  const targetGradeBySubjectId: Record<string, string> = {
    ...fallback.targetGradeBySubjectId,
  };
  if (isObjectRecord(raw.targetGradeBySubjectId)) {
    for (const [k, v] of Object.entries(raw.targetGradeBySubjectId)) {
      if (typeof v === 'string' && v.trim()) {
        targetGradeBySubjectId[k] = v.trim();
      }
    }
  }

  const mathsUnitsByCashIn: Record<EdexcelMathsCashInCode, EdexcelMathsUnitCode[]> = {
    ...fallback.mathsUnitsByCashIn,
  };
  if (isObjectRecord(raw.mathsUnitsByCashIn)) {
    for (const cashIn of VALID_CASH_INS) {
      const candidate = raw.mathsUnitsByCashIn[cashIn];
      if (Array.isArray(candidate)) {
        const validUnits = candidate.filter((u): u is EdexcelMathsUnitCode =>
          CANONICAL_UNIT_ORDER.includes(u as EdexcelMathsUnitCode)
        );
        if (validUnits.length > 0) {
          mathsUnitsByCashIn[cashIn] = sortMathsUnitsCanonical([
            ...COMPULSORY_BY_CASH_IN[cashIn],
            ...validUnits,
          ]);
        }
      }
    }
  }

  return {
    version: 1,
    activeBoard,
    enrolledSubjectIds,
    targetGradeBySubjectId,
    activeMathsCashIn,
    enrolledMathsCashIns:
      enrolledMathsCashIns.length > 0 ? enrolledMathsCashIns : ['YMA01'],
    mathsUnitsByCashIn,
  };
}

export function loadStudyCurriculumState(
  fallback: StudyCurriculumPersistedState
): StudyCurriculumPersistedState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_CURRICULUM_STORAGE_KEY);
    if (!raw) return fallback;
    return sanitizeStudyCurriculumState(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveStudyCurriculumState(
  state: StudyCurriculumPersistedState
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STUDY_CURRICULUM_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage quota errors
  }
}
