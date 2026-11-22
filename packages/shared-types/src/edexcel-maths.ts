import { z } from 'zod';

/**
 * Pearson Edexcel IAL Modular Mathematics Suite (`WMA11-SET`)
 * 14 Units · 4 Cash-In Awards · Deterministic Combination Validator
 */
export const EDEXCEL_MATHS_UNIT_CODES = [
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
] as const;

export const EdexcelMathsUnitCodeSchema = z.enum(EDEXCEL_MATHS_UNIT_CODES);
export type EdexcelMathsUnitCode = z.infer<typeof EdexcelMathsUnitCodeSchema>;

export const EDEXCEL_MATHS_UNIT_CATEGORIES = [
  'pure',
  'further_pure',
  'mechanics',
  'statistics',
  'decision',
] as const;

export const EdexcelMathsUnitCategorySchema = z.enum(EDEXCEL_MATHS_UNIT_CATEGORIES);
export type EdexcelMathsUnitCategory = z.infer<typeof EdexcelMathsUnitCategorySchema>;

export const EDEXCEL_MATHS_CASH_IN_CODES = ['XMA01', 'YMA01', 'XFM01', 'YFM01'] as const;
export const EdexcelMathsCashInCodeSchema = z.enum(EDEXCEL_MATHS_CASH_IN_CODES);
export type EdexcelMathsCashInCode = z.infer<typeof EdexcelMathsCashInCodeSchema>;

export const EDEXCEL_MATHS_RULE_TYPES = [
  'CHOOSE_N_FROM_SET',
  'EXACT_COMBINATION_PAIRS',
  'AT_LEAST_ONE_OF',
] as const;

export const EdexcelMathsRuleTypeSchema = z.enum(EDEXCEL_MATHS_RULE_TYPES);
export type EdexcelMathsRuleType = z.infer<typeof EdexcelMathsRuleTypeSchema>;

export const EdexcelMathsUnitDefinitionSchema = z.object({
  code: EdexcelMathsUnitCodeSchema,
  shortCode: z.string().min(2),
  title: z.string().min(1),
  category: EdexcelMathsUnitCategorySchema,
  level: z.enum(['AS', 'A2']),
  maxUms: z.number().int().positive(),
  maxRaw: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  prerequisiteCodes: z.array(EdexcelMathsUnitCodeSchema),
});

export type EdexcelMathsUnitDefinition = z.infer<typeof EdexcelMathsUnitDefinitionSchema>;

export const EdexcelMathsCombinationPairSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  units: z.tuple([EdexcelMathsUnitCodeSchema, EdexcelMathsUnitCodeSchema]),
  recommendedFor: z.string().min(1),
});

export type EdexcelMathsCombinationPair = z.infer<typeof EdexcelMathsCombinationPairSchema>;

export const EdexcelMathsCashInDefinitionSchema = z.object({
  code: EdexcelMathsCashInCodeSchema,
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  level: z.enum(['AS', 'IAL']),
  requiredUnits: z.number().int().positive(),
  totalUms: z.number().int().positive(),
  compulsoryUnits: z.array(EdexcelMathsUnitCodeSchema),
  ruleSummary: z.string().min(1),
});

export type EdexcelMathsCashInDefinition = z.infer<typeof EdexcelMathsCashInDefinitionSchema>;

export const EdexcelMathsRuleCheckResultSchema = z.object({
  id: z.string().min(1),
  ruleType: EdexcelMathsRuleTypeSchema,
  label: z.string().min(1),
  passed: z.boolean(),
  detail: z.string().min(1),
});

export type EdexcelMathsRuleCheckResult = z.infer<typeof EdexcelMathsRuleCheckResultSchema>;

export const EdexcelMathsValidationResultSchema = z.object({
  cashInCode: EdexcelMathsCashInCodeSchema,
  isValid: z.boolean(),
  requiredUnitCount: z.number().int().positive(),
  selectedUnitCount: z.number().int().nonnegative(),
  totalUms: z.number().int().nonnegative(),
  targetUms: z.number().int().positive(),
  matchedPairLabel: z.string().nullable(),
  conflictingUnits: z.array(EdexcelMathsUnitCodeSchema),
  missingCompulsoryUnits: z.array(EdexcelMathsUnitCodeSchema),
  ruleChecks: z.array(EdexcelMathsRuleCheckResultSchema),
  summaryMessage: z.string().min(1),
});

export type EdexcelMathsValidationResult = z.infer<typeof EdexcelMathsValidationResultSchema>;

/**
 * Canonical 14 Edexcel IAL Modular Mathematics Units.
 */
export const EDEXCEL_MATHS_UNITS: readonly EdexcelMathsUnitDefinition[] = [
  { code: 'WMA11', shortCode: 'P1', title: 'Pure Mathematics 1', category: 'pure', level: 'AS', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: [] },
  { code: 'WMA12', shortCode: 'P2', title: 'Pure Mathematics 2', category: 'pure', level: 'AS', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WMA11'] },
  { code: 'WMA13', shortCode: 'P3', title: 'Pure Mathematics 3', category: 'pure', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WMA11', 'WMA12'] },
  { code: 'WMA14', shortCode: 'P4', title: 'Pure Mathematics 4', category: 'pure', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WMA11', 'WMA12', 'WMA13'] },
  { code: 'WFM01', shortCode: 'FP1', title: 'Further Pure Mathematics 1', category: 'further_pure', level: 'AS', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: [] },
  { code: 'WFM02', shortCode: 'FP2', title: 'Further Pure Mathematics 2', category: 'further_pure', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WFM01'] },
  { code: 'WFM03', shortCode: 'FP3', title: 'Further Pure Mathematics 3', category: 'further_pure', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WFM01'] },
  { code: 'WME01', shortCode: 'M1', title: 'Mechanics 1', category: 'mechanics', level: 'AS', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: [] },
  { code: 'WME02', shortCode: 'M2', title: 'Mechanics 2', category: 'mechanics', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WME01'] },
  { code: 'WME03', shortCode: 'M3', title: 'Mechanics 3', category: 'mechanics', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WME01', 'WME02'] },
  { code: 'WST01', shortCode: 'S1', title: 'Statistics 1', category: 'statistics', level: 'AS', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: [] },
  { code: 'WST02', shortCode: 'S2', title: 'Statistics 2', category: 'statistics', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WST01'] },
  { code: 'WST03', shortCode: 'S3', title: 'Statistics 3', category: 'statistics', level: 'A2', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: ['WST01', 'WST02'] },
  { code: 'WDM11', shortCode: 'D1', title: 'Decision Mathematics 1', category: 'decision', level: 'AS', maxUms: 100, maxRaw: 75, durationMinutes: 90, prerequisiteCodes: [] },
];

export const EDEXCEL_MATHS_UNIT_BY_CODE: Record<
  EdexcelMathsUnitCode,
  EdexcelMathsUnitDefinition
> = Object.fromEntries(
  EDEXCEL_MATHS_UNITS.map((unit) => [unit.code, unit])
) as Record<EdexcelMathsUnitCode, EdexcelMathsUnitDefinition>;

/**
 * Official 5 Edexcel IAL Mathematics (`YMA01`) applied unit pairs (`EXACT_COMBINATION_PAIRS`).
 */
export const EDEXCEL_MATHS_YMA01_APPLIED_PAIRS: readonly EdexcelMathsCombinationPair[] = [
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

export const EDEXCEL_MATHS_CASH_IN_DEFINITIONS: Record<
  EdexcelMathsCashInCode,
  EdexcelMathsCashInDefinition
> = {
  XMA01: {
    code: 'XMA01',
    title: 'International AS Mathematics',
    shortTitle: 'AS Maths',
    level: 'AS',
    requiredUnits: 3,
    totalUms: 300,
    compulsoryUnits: ['WMA11', 'WMA12'],
    ruleSummary: 'P1 (WMA11) + P2 (WMA12) + 1 unit from {M1, S1, D1}.',
  },
  YMA01: {
    code: 'YMA01',
    title: 'International A-Level Mathematics',
    shortTitle: 'IAL Maths',
    level: 'IAL',
    requiredUnits: 6,
    totalUms: 600,
    compulsoryUnits: ['WMA11', 'WMA12', 'WMA13', 'WMA14'],
    ruleSummary:
      'P1–P4 compulsory + 1 valid applied pair from {(M1,S1), (M1,M2), (S1,S2), (M1,D1), (S1,D1)}.',
  },
  XFM01: {
    code: 'XFM01',
    title: 'International AS Further Mathematics',
    shortTitle: 'AS Further Maths',
    level: 'AS',
    requiredUnits: 3,
    totalUms: 300,
    compulsoryUnits: ['WFM01'],
    ruleSummary:
      'FP1 (WFM01) compulsory + 2 non-overlapping units from {FP2, FP3, M1–M3, S1–S3, D1}.',
  },
  YFM01: {
    code: 'YFM01',
    title: 'International A-Level Further Mathematics',
    shortTitle: 'IAL Further Maths',
    level: 'IAL',
    requiredUnits: 6,
    totalUms: 600,
    compulsoryUnits: ['WFM01'],
    ruleSummary:
      'FP1 (WFM01) + at least one of {FP2, FP3} + 4 more non-overlapping Further/Applied units.',
  },
};

const AS_APPLIED_POOL: readonly EdexcelMathsUnitCode[] = ['WME01', 'WST01', 'WDM11'];
const FURTHER_PURE_A2_POOL: readonly EdexcelMathsUnitCode[] = ['WFM02', 'WFM03'];
const FURTHER_MATHS_OPTIONAL_POOL: readonly EdexcelMathsUnitCode[] = [
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

function sortCanonicalUnits(units: readonly EdexcelMathsUnitCode[]): EdexcelMathsUnitCode[] {
  const unique = Array.from(new Set(units));
  return unique.sort(
    (a, b) =>
      EDEXCEL_MATHS_UNIT_CODES.indexOf(a) - EDEXCEL_MATHS_UNIT_CODES.indexOf(b)
  );
}

/**
 * Validates unit combinations for any Edexcel IAL Modular Maths cash-in award
 * (`XMA01`, `YMA01`, `XFM01`, `YFM01`) across `CHOOSE_N_FROM_SET`,
 * `EXACT_COMBINATION_PAIRS`, `AT_LEAST_ONE_OF`, and cross-award overlap prevention.
 */
export function validateEdexcelMathsCashIn(
  cashInCode: EdexcelMathsCashInCode,
  selectedUnits: readonly EdexcelMathsUnitCode[],
  lockedUnitsFromOtherAwards: readonly EdexcelMathsUnitCode[] = []
): EdexcelMathsValidationResult {
  const def = EDEXCEL_MATHS_CASH_IN_DEFINITIONS[cashInCode];
  const sorted = sortCanonicalUnits(selectedUnits);
  const selectedSet = new Set(sorted);
  const lockedSet = new Set(lockedUnitsFromOtherAwards);

  const missingCompulsoryUnits = def.compulsoryUnits.filter((u) => !selectedSet.has(u));
  const conflictingUnits = sorted.filter((u) => lockedSet.has(u));
  const ruleChecks: EdexcelMathsRuleCheckResult[] = [];
  let matchedPairLabel: string | null = null;

  const shortOf = (u: EdexcelMathsUnitCode) => EDEXCEL_MATHS_UNIT_BY_CODE[u].shortCode;

  if (cashInCode === 'XMA01') {
    const compulsoryPassed = missingCompulsoryUnits.length === 0;
    ruleChecks.push({
      id: 'xma01-pure',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Compulsory AS Pure units (WMA11 P1 + WMA12 P2)',
      passed: compulsoryPassed,
      detail: compulsoryPassed
        ? 'Both P1 (WMA11) and P2 (WMA12) are included.'
        : `Missing ${missingCompulsoryUnits.map(shortOf).join(', ')}.`,
    });

    const appliedChosen = sorted.filter((u) => !def.compulsoryUnits.includes(u));
    const singleApplied = appliedChosen[0];
    const validApplied =
      appliedChosen.length === 1 &&
      singleApplied !== undefined &&
      AS_APPLIED_POOL.includes(singleApplied) &&
      conflictingUnits.length === 0;

    ruleChecks.push({
      id: 'xma01-applied',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Choose 1 AS Applied unit from {M1, S1, D1}',
      passed: validApplied,
      detail:
        validApplied && singleApplied
          ? `Selected ${shortOf(singleApplied)} (${singleApplied}).`
          : `Select exactly 1 unique unit from M1, S1, or D1 (currently ${appliedChosen.length}).`,
    });
  } else if (cashInCode === 'YMA01') {
    const compulsoryPassed = missingCompulsoryUnits.length === 0;
    ruleChecks.push({
      id: 'yma01-pure',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Compulsory IAL Pure Spine (WMA11 P1 – WMA14 P4)',
      passed: compulsoryPassed,
      detail: compulsoryPassed
        ? 'All 4 Pure units (P1, P2, P3, P4 = 400 UMS) are included.'
        : `Missing ${missingCompulsoryUnits.map(shortOf).join(', ')}.`,
    });

    const appliedChosen = sorted.filter((u) => !def.compulsoryUnits.includes(u));
    const matchedPair = EDEXCEL_MATHS_YMA01_APPLIED_PAIRS.find(
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
      passed: Boolean(matchedPair) && conflictingUnits.length === 0,
      detail: matchedPair
        ? `Matched official pair: ${matchedPair.shortLabel} (${matchedPair.units.join(' + ')}).`
        : appliedChosen.length === 2
          ? `${appliedChosen.map(shortOf).join(' + ')} is not an official Edexcel YMA01 pair.`
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
    const allAllowed = optionalUnits.every((u) => FURTHER_MATHS_OPTIONAL_POOL.includes(u));
    const electivesOk =
      optionalUnits.length === 2 && allAllowed && conflictingUnits.length === 0;

    ruleChecks.push({
      id: 'xfm01-electives',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Choose 2 non-overlapping Further/Applied units',
      passed: electivesOk,
      detail:
        conflictingUnits.length > 0
          ? `Units ${conflictingUnits.map(shortOf).join(', ')} are already assigned to another award.`
          : electivesOk
            ? `Selected ${optionalUnits.map(shortOf).join(' + ')}.`
            : `Choose 2 allowed units from FP2, FP3, M1–M3, S1–S3, D1 (currently ${optionalUnits.length}).`,
    });
  } else {
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
              .map(shortOf)
              .join(' + ')}.`
          : 'IAL Further Maths requires FP1 plus at least one of FP2 or FP3.',
    });

    const allAllowed = sorted.every(
      (u) => u === 'WFM01' || FURTHER_MATHS_OPTIONAL_POOL.includes(u)
    );
    const sixOk =
      sorted.length === 6 && allAllowed && conflictingUnits.length === 0;

    ruleChecks.push({
      id: 'yfm01-six-units',
      ruleType: 'CHOOSE_N_FROM_SET',
      label: 'Complete 6-unit (600 UMS) Further Maths combination without cross-award overlap',
      passed: sixOk,
      detail:
        conflictingUnits.length > 0
          ? `Remove ${conflictingUnits.map(shortOf).join(', ')} (already counted in another award).`
          : sixOk
            ? `All 6 Further Maths units (${sorted.map(shortOf).join(', ')}) verified.`
            : `Select 6 valid units for YFM01 (currently ${sorted.length}/6).`,
    });
  }

  const isValid =
    sorted.length === def.requiredUnits &&
    missingCompulsoryUnits.length === 0 &&
    conflictingUnits.length === 0 &&
    ruleChecks.every((c) => c.passed);

  const totalUms = sorted.reduce(
    (sum, code) => sum + EDEXCEL_MATHS_UNIT_BY_CODE[code].maxUms,
    0
  );

  const summaryMessage = isValid
    ? `${def.code} (${def.shortTitle}) valid: ${sorted.length}/${def.requiredUnits} units (${def.totalUms} UMS).`
    : conflictingUnits.length > 0
      ? `Unit overlap detected: ${conflictingUnits.map(shortOf).join(', ')} already claimed.`
      : `${def.code} incomplete (${sorted.length}/${def.requiredUnits} units).`;

  return {
    cashInCode,
    isValid,
    requiredUnitCount: def.requiredUnits,
    selectedUnitCount: sorted.length,
    totalUms,
    targetUms: def.totalUms,
    matchedPairLabel,
    conflictingUnits,
    missingCompulsoryUnits,
    ruleChecks,
    summaryMessage,
  };
}
