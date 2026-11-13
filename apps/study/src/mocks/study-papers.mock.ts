/**
 * Realistic Past Paper Variant × Exam Series Fixtures & Historical Grade Boundaries (`[ZYY-4.4]`).
 *
 * Covers all 13 subjects in `MOCK_CURRICULUM_SUBJECTS` across 6 chronological exam series
 * (MJ25, Jan/FM25, ON24, MJ24, Jan/FM24, ON23) with Cambridge regional variants (V1–V3),
 * Edexcel IGCSE regional (R) papers, and all 14 Edexcel IAL Mathematics units (`WMA11-SET`).
 */
import type {
  PaperGradeCutoffs,
  PastPaperAttempt,
  PastPaperRowDefinition,
  PastPaperSeriesId,
  PastPaperSeriesMeta,
  StudyPapersPersistedState,
} from '../lib/study/papers';
import { getCellStorageKey } from '../lib/study/papers';
import { EDEXCEL_MATHS_14_UNITS } from './study-curriculum.mock';

export const PAST_PAPER_SERIES: PastPaperSeriesMeta[] = [
  {
    id: 'mj-2025',
    chronologicalIndex: 5,
    edexcelLabel: 'May / June 2025',
    edexcelShort: 'MJ 25',
    cambridgeLabel: 'May / June 2025',
    cambridgeShort: 'MJ 25',
    sessionKind: 'summer',
  },
  {
    id: 'jan-fm-2025',
    chronologicalIndex: 4,
    edexcelLabel: 'January 2025',
    edexcelShort: 'Jan 25',
    cambridgeLabel: 'Feb / Mar 2025',
    cambridgeShort: 'FM 25',
    sessionKind: 'winter',
  },
  {
    id: 'on-2024',
    chronologicalIndex: 3,
    edexcelLabel: 'October 2024',
    edexcelShort: 'Oct 24',
    cambridgeLabel: 'Oct / Nov 2024',
    cambridgeShort: 'ON 24',
    sessionKind: 'autumn',
  },
  {
    id: 'mj-2024',
    chronologicalIndex: 2,
    edexcelLabel: 'May / June 2024',
    edexcelShort: 'MJ 24',
    cambridgeLabel: 'May / June 2024',
    cambridgeShort: 'MJ 24',
    sessionKind: 'summer',
  },
  {
    id: 'jan-fm-2024',
    chronologicalIndex: 1,
    edexcelLabel: 'January 2024',
    edexcelShort: 'Jan 24',
    cambridgeLabel: 'Feb / Mar 2024',
    cambridgeShort: 'FM 24',
    sessionKind: 'winter',
  },
  {
    id: 'on-2023',
    chronologicalIndex: 0,
    edexcelLabel: 'October 2023',
    edexcelShort: 'Oct 23',
    cambridgeLabel: 'Oct / Nov 2023',
    cambridgeShort: 'ON 23',
    sessionKind: 'autumn',
  },
];

const SERIES_SHIFT: Record<PastPaperSeriesId, number> = {
  'mj-2025': 0,
  'jan-fm-2025': -1,
  'on-2024': 1,
  'mj-2024': -1,
  'jan-fm-2024': -2,
  'on-2023': 0,
};

function makeALevelCutoffs(
  base: { aStar: number; a: number; b: number; c: number; d: number; e: number },
  maxRaw: number
): Record<PastPaperSeriesId, PaperGradeCutoffs> {
  const clamp = (val: number) => Math.max(1, Math.min(maxRaw - 1, val));
  const out = {} as Record<PastPaperSeriesId, PaperGradeCutoffs>;

  for (const s of PAST_PAPER_SERIES) {
    const shift = SERIES_SHIFT[s.id];
    out[s.id] = {
      thresholds: {
        'A*': clamp(base.aStar + shift),
        A: clamp(base.a + shift),
        B: clamp(base.b + shift),
        C: clamp(base.c + shift),
        D: clamp(base.d + shift),
        E: clamp(base.e + shift),
      },
    };
  }
  return out;
}

function makeNineToOneCutoffs(
  base: { g9: number; g8: number; g7: number; g6: number; g5: number; g4: number },
  maxRaw: number
): Record<PastPaperSeriesId, PaperGradeCutoffs> {
  const clamp = (val: number) => Math.max(1, Math.min(maxRaw - 1, val));
  const out = {} as Record<PastPaperSeriesId, PaperGradeCutoffs>;

  for (const s of PAST_PAPER_SERIES) {
    const shift = SERIES_SHIFT[s.id];
    out[s.id] = {
      thresholds: {
        '9': clamp(base.g9 + shift),
        '8': clamp(base.g8 + shift),
        '7': clamp(base.g7 + shift),
        '6': clamp(base.g6 + shift),
        '5': clamp(base.g5 + shift),
        '4': clamp(base.g4 + shift),
      },
    };
  }
  return out;
}

function ialMathsCutoffs(unitCode: string): Record<PastPaperSeriesId, PaperGradeCutoffs> {
  switch (unitCode) {
    case 'WMA11':
      return makeALevelCutoffs({ aStar: 63, a: 55, b: 48, c: 41, d: 34, e: 27 }, 75);
    case 'WMA12':
      return makeALevelCutoffs({ aStar: 61, a: 53, b: 46, c: 39, d: 32, e: 25 }, 75);
    case 'WMA13':
      return makeALevelCutoffs({ aStar: 64, a: 57, b: 49, c: 42, d: 35, e: 28 }, 75);
    case 'WMA14':
      return makeALevelCutoffs({ aStar: 63, a: 56, b: 48, c: 41, d: 34, e: 27 }, 75);
    case 'WME01':
      return makeALevelCutoffs({ aStar: 60, a: 52, b: 45, c: 38, d: 31, e: 24 }, 75);
    case 'WST01':
      return makeALevelCutoffs({ aStar: 62, a: 54, b: 46, c: 39, d: 32, e: 25 }, 75);
    default:
      return makeALevelCutoffs({ aStar: 62, a: 54, b: 47, c: 40, d: 33, e: 26 }, 75);
  }
}

const CAMBRIDGE_V2_ONLY_SERIES: PastPaperSeriesId[] = [
  'mj-2025',
  'jan-fm-2025',
  'on-2024',
  'mj-2024',
  'jan-fm-2024',
  'on-2023',
];

const CAMBRIDGE_V1_V3_SERIES: PastPaperSeriesId[] = [
  'mj-2025',
  'on-2024',
  'mj-2024',
  'on-2023',
];

const EDEXCEL_NON_REGIONAL_SERIES: PastPaperSeriesId[] = [
  'mj-2025',
  'jan-fm-2025',
  'on-2024',
  'mj-2024',
  'jan-fm-2024',
  'on-2023',
];

const EDEXCEL_REGIONAL_SERIES: PastPaperSeriesId[] = [
  'mj-2025',
  'jan-fm-2025',
  'mj-2024',
  'jan-fm-2024',
];

function makeIalScienceRows(
  subjectId: string,
  prefix: string,
  subjectLabel: string
): PastPaperRowDefinition[] {
  const units = [
    { code: `${prefix}11`, short: 'Unit 1', title: `Unit 1: Core ${subjectLabel} I`, maxRaw: 80, maxUms: 120, mins: 90, base: { aStar: 63, a: 55, b: 48, c: 41, d: 34, e: 27 } },
    { code: `${prefix}12`, short: 'Unit 2', title: `Unit 2: Core ${subjectLabel} II`, maxRaw: 80, maxUms: 120, mins: 90, base: { aStar: 62, a: 54, b: 47, c: 40, d: 33, e: 26 } },
    { code: `${prefix}13`, short: 'Unit 3', title: `Unit 3: Practical Skills I`, maxRaw: 50, maxUms: 60, mins: 80, base: { aStar: 41, a: 36, b: 31, c: 27, d: 22, e: 18 } },
    { code: `${prefix}14`, short: 'Unit 4', title: `Unit 4: Advanced ${subjectLabel} I`, maxRaw: 90, maxUms: 120, mins: 105, base: { aStar: 73, a: 65, b: 57, c: 49, d: 41, e: 33 } },
    { code: `${prefix}15`, short: 'Unit 5', title: `Unit 5: Advanced ${subjectLabel} II`, maxRaw: 90, maxUms: 120, mins: 105, base: { aStar: 72, a: 64, b: 56, c: 48, d: 40, e: 32 } },
    { code: `${prefix}16`, short: 'Unit 6', title: `Unit 6: Practical Skills II`, maxRaw: 50, maxUms: 60, mins: 80, base: { aStar: 41, a: 36, b: 31, c: 27, d: 22, e: 18 } },
  ];

  return units.map((u) => ({
    id: `${subjectId}-${u.code.toLowerCase()}`,
    subjectId,
    boardId: 'edexcel-ial',
    unitCode: u.code,
    paperCode: u.code,
    shortLabel: u.short,
    title: u.title,
    variantGroup: 'main',
    variantBadge: 'Modular Unit',
    maxRaw: u.maxRaw,
    maxUms: u.maxUms,
    durationMinutes: u.mins,
    isModularUms: true,
    gradingScale: 'A*-U',
    seriesBoundaries: makeALevelCutoffs(u.base, u.maxRaw),
  }));
}

function makeCambridgeVariantRows(params: {
  subjectId: string;
  boardId: 'cambridge-igcse' | 'cambridge-alevel';
  codePrefix: string;
  papers: Array<{
    paperDigit: string;
    unitVariantCode: string;
    title: string;
    maxRaw: number;
    durationMinutes: number;
    base: { aStar: number; a: number; b: number; c: number; d: number; e: number };
    variants?: Array<'1' | '2' | '3'>;
  }>;
}): PastPaperRowDefinition[] {
  const out: PastPaperRowDefinition[] = [];
  for (const p of params.papers) {
    const variants = p.variants ?? ['1', '2', '3'];
    for (const v of variants) {
      const fullPaperCode = `${params.codePrefix}/${p.paperDigit}${v}`;
      const variantGroup = v === '1' ? 'v1' : v === '2' ? 'v2' : 'v3';
      out.push({
        id: `${params.subjectId}-${p.paperDigit}${v}`,
        subjectId: params.subjectId,
        boardId: params.boardId,
        unitCode: p.unitVariantCode,
        paperCode: fullPaperCode,
        shortLabel: `P${p.paperDigit}${v}`,
        title: `${p.title} (Variant ${v})`,
        variantGroup,
        variantBadge: `Variant ${v}`,
        maxRaw: p.maxRaw,
        durationMinutes: p.durationMinutes,
        isModularUms: false,
        gradingScale: 'A*-U',
        availableSeriesIds: v === '2' ? CAMBRIDGE_V2_ONLY_SERIES : CAMBRIDGE_V1_V3_SERIES,
        seriesBoundaries: makeALevelCutoffs(p.base, p.maxRaw),
      });
    }
  }
  return out;
}

export const MOCK_PAST_PAPER_ROWS: PastPaperRowDefinition[] = [
  // =========================================================================
  // 1. Edexcel IAL — WMA11-SET Modular Maths Suite (All 14 Units)
  // =========================================================================
  ...EDEXCEL_MATHS_14_UNITS.map((u) => ({
    id: `ial-maths-${u.code.toLowerCase()}`,
    subjectId: 'ial-maths-suite',
    boardId: 'edexcel-ial' as const,
    unitCode: u.code,
    paperCode: u.code,
    shortLabel: u.shortCode,
    title: u.title,
    variantGroup: 'main' as const,
    variantBadge: `${u.level} · ${u.categoryLabel}`,
    maxRaw: u.maxRaw,
    maxUms: u.maxUms,
    durationMinutes: u.durationMinutes,
    isModularUms: true,
    gradingScale: 'A*-U' as const,
    seriesBoundaries: ialMathsCutoffs(u.code),
  })),

  // 2. Edexcel IAL Physics, Chemistry, Biology & Economics
  ...makeIalScienceRows('ial-physics', 'WPH', 'Physics'),
  ...makeIalScienceRows('ial-chemistry', 'WCH', 'Chemistry'),
  ...makeIalScienceRows('ial-biology', 'WBI', 'Biology'),
  ...[
    { code: 'WEC11', short: 'Unit 1', title: 'Markets in Action', base: { aStar: 64, a: 56, b: 49, c: 42, d: 35, e: 28 }, mins: 105 },
    { code: 'WEC12', short: 'Unit 2', title: 'Macroeconomic Performance & Policy', base: { aStar: 63, a: 55, b: 48, c: 41, d: 34, e: 27 }, mins: 105 },
    { code: 'WEC13', short: 'Unit 3', title: 'Business Behaviour', base: { aStar: 65, a: 57, b: 50, c: 43, d: 36, e: 29 }, mins: 120 },
    { code: 'WEC14', short: 'Unit 4', title: 'Developments in the Global Economy', base: { aStar: 64, a: 56, b: 49, c: 42, d: 35, e: 28 }, mins: 120 },
  ].map((u) => ({
    id: `ial-econ-${u.code.toLowerCase()}`,
    subjectId: 'ial-economics',
    boardId: 'edexcel-ial' as const,
    unitCode: u.code,
    paperCode: u.code,
    shortLabel: u.short,
    title: u.title,
    variantGroup: 'main' as const,
    variantBadge: 'Modular Unit',
    maxRaw: 80,
    maxUms: 100,
    durationMinutes: u.mins,
    isModularUms: true,
    gradingScale: 'A*-U' as const,
    seriesBoundaries: makeALevelCutoffs(u.base, 80),
  })),

  // =========================================================================
  // 2. Cambridge IGCSE (Variant 1, 2, 3 Matrix)
  // =========================================================================
  ...makeCambridgeVariantRows({
    subjectId: 'igcse-maths-0580',
    boardId: 'cambridge-igcse',
    codePrefix: '0580',
    papers: [
      {
        paperDigit: '2',
        unitVariantCode: '0580/22',
        title: 'Extended Paper 2 (Non-Calc)',
        maxRaw: 70,
        durationMinutes: 90,
        base: { aStar: 61, a: 53, b: 46, c: 39, d: 32, e: 25 },
      },
      {
        paperDigit: '4',
        unitVariantCode: '0580/42',
        title: 'Extended Paper 4 (Structured)',
        maxRaw: 130,
        durationMinutes: 150,
        base: { aStar: 112, a: 97, b: 83, c: 69, d: 55, e: 42 },
      },
    ],
  }),
  ...makeCambridgeVariantRows({
    subjectId: 'igcse-add-maths-0606',
    boardId: 'cambridge-igcse',
    codePrefix: '0606',
    papers: [
      {
        paperDigit: '1',
        unitVariantCode: '0606/12',
        title: 'Additional Maths Paper 1',
        maxRaw: 80,
        durationMinutes: 120,
        base: { aStar: 69, a: 58, b: 49, c: 40, d: 31, e: 23 },
      },
      {
        paperDigit: '2',
        unitVariantCode: '0606/22',
        title: 'Additional Maths Paper 2',
        maxRaw: 80,
        durationMinutes: 120,
        base: { aStar: 69, a: 58, b: 49, c: 40, d: 31, e: 23 },
      },
    ],
  }),
  ...makeCambridgeVariantRows({
    subjectId: 'igcse-physics-0625',
    boardId: 'cambridge-igcse',
    codePrefix: '0625',
    papers: [
      {
        paperDigit: '2',
        unitVariantCode: '0625/22',
        title: 'Multiple Choice (Extended)',
        maxRaw: 40,
        durationMinutes: 45,
        base: { aStar: 34, a: 29, b: 25, c: 21, d: 17, e: 14 },
      },
      {
        paperDigit: '4',
        unitVariantCode: '0625/42',
        title: 'Theory (Extended)',
        maxRaw: 80,
        durationMinutes: 75,
        base: { aStar: 62, a: 52, b: 44, c: 36, d: 28, e: 21 },
      },
      {
        paperDigit: '6',
        unitVariantCode: '0625/62',
        title: 'Alternative to Practical',
        maxRaw: 40,
        durationMinutes: 60,
        base: { aStar: 34, a: 29, b: 25, c: 21, d: 17, e: 13 },
      },
    ],
  }),
  ...makeCambridgeVariantRows({
    subjectId: 'igcse-chemistry-0620',
    boardId: 'cambridge-igcse',
    codePrefix: '0620',
    papers: [
      {
        paperDigit: '2',
        unitVariantCode: '0620/22',
        title: 'Multiple Choice (Extended)',
        maxRaw: 40,
        durationMinutes: 45,
        base: { aStar: 34, a: 29, b: 25, c: 21, d: 17, e: 14 },
      },
      {
        paperDigit: '4',
        unitVariantCode: '0620/42',
        title: 'Theory (Extended)',
        maxRaw: 80,
        durationMinutes: 75,
        base: { aStar: 63, a: 53, b: 45, c: 37, d: 29, e: 22 },
      },
      {
        paperDigit: '6',
        unitVariantCode: '0620/62',
        title: 'Alternative to Practical',
        maxRaw: 40,
        durationMinutes: 60,
        base: { aStar: 34, a: 29, b: 25, c: 21, d: 17, e: 13 },
      },
    ],
  }),
  ...makeCambridgeVariantRows({
    subjectId: 'igcse-cs-0478',
    boardId: 'cambridge-igcse',
    codePrefix: '0478',
    papers: [
      {
        paperDigit: '1',
        unitVariantCode: '0478/12',
        title: 'Computer Systems',
        maxRaw: 75,
        durationMinutes: 105,
        base: { aStar: 61, a: 52, b: 44, c: 36, d: 29, e: 22 },
      },
      {
        paperDigit: '2',
        unitVariantCode: '0478/22',
        title: 'Algorithms, Programming & Logic',
        maxRaw: 75,
        durationMinutes: 105,
        base: { aStar: 60, a: 51, b: 43, c: 35, d: 28, e: 21 },
      },
    ],
  }),

  // =========================================================================
  // 3. Cambridge International AS & A-Level (9709 & 9702 Variants)
  // =========================================================================
  ...makeCambridgeVariantRows({
    subjectId: 'cie-maths-9709',
    boardId: 'cambridge-alevel',
    codePrefix: '9709',
    papers: [
      {
        paperDigit: '1',
        unitVariantCode: '9709/12',
        title: 'Pure Mathematics 1',
        maxRaw: 75,
        durationMinutes: 110,
        base: { aStar: 65, a: 56, b: 49, c: 42, d: 35, e: 28 },
      },
      {
        paperDigit: '3',
        unitVariantCode: '9709/32',
        title: 'Pure Mathematics 3',
        maxRaw: 75,
        durationMinutes: 110,
        base: { aStar: 63, a: 54, b: 47, c: 40, d: 33, e: 26 },
      },
      {
        paperDigit: '4',
        unitVariantCode: '9709/42',
        title: 'Mechanics',
        maxRaw: 50,
        durationMinutes: 75,
        base: { aStar: 44, a: 38, b: 33, c: 28, d: 23, e: 18 },
      },
      {
        paperDigit: '5',
        unitVariantCode: '9709/52',
        title: 'Probability & Statistics 1',
        maxRaw: 50,
        durationMinutes: 75,
        base: { aStar: 45, a: 39, b: 34, c: 29, d: 24, e: 19 },
      },
    ],
  }),
  ...makeCambridgeVariantRows({
    subjectId: 'cie-physics-9702',
    boardId: 'cambridge-alevel',
    codePrefix: '9702',
    papers: [
      {
        paperDigit: '1',
        unitVariantCode: '9702/12',
        title: 'Multiple Choice',
        maxRaw: 40,
        durationMinutes: 75,
        base: { aStar: 34, a: 29, b: 25, c: 21, d: 17, e: 14 },
      },
      {
        paperDigit: '2',
        unitVariantCode: '9702/22',
        title: 'AS Structured Questions',
        maxRaw: 60,
        durationMinutes: 75,
        base: { aStar: 50, a: 42, b: 36, c: 29, d: 23, e: 18 },
      },
      {
        paperDigit: '3',
        unitVariantCode: '9702/33',
        title: 'Advanced Practical Skills',
        maxRaw: 40,
        durationMinutes: 120,
        base: { aStar: 34, a: 29, b: 25, c: 21, d: 17, e: 14 },
        variants: ['3'],
      },
    ],
  }),
  {
    id: 'cie-physics-9702-42',
    subjectId: 'cie-physics-9702',
    boardId: 'cambridge-alevel',
    unitCode: '9702/42',
    paperCode: '9702/42',
    shortLabel: 'P42',
    title: 'A-Level Structured Questions (Variant 2)',
    variantGroup: 'v2',
    variantBadge: 'Variant 2',
    maxRaw: 100,
    durationMinutes: 120,
    isModularUms: false,
    gradingScale: 'A*-U',
    availableSeriesIds: CAMBRIDGE_V2_ONLY_SERIES,
    seriesBoundaries: makeALevelCutoffs({ aStar: 78, a: 66, b: 56, c: 46, d: 37, e: 28 }, 100),
  },
  {
    id: 'cie-physics-9702-52',
    subjectId: 'cie-physics-9702',
    boardId: 'cambridge-alevel',
    unitCode: '9702/52',
    paperCode: '9702/52',
    shortLabel: 'P52',
    title: 'Planning, Analysis & Evaluation (Variant 2)',
    variantGroup: 'v2',
    variantBadge: 'Variant 2',
    maxRaw: 30,
    durationMinutes: 75,
    isModularUms: false,
    gradingScale: 'A*-U',
    availableSeriesIds: CAMBRIDGE_V2_ONLY_SERIES,
    seriesBoundaries: makeALevelCutoffs({ aStar: 25, a: 21, b: 18, c: 15, d: 12, e: 9 }, 30),
  },

  // =========================================================================
  // 4. Pearson Edexcel International GCSE (9–1) with Main & Regional (R)
  // =========================================================================
  {
    id: 'edexcel-igcse-4ma1-1h',
    subjectId: 'edexcel-igcse-4ma1',
    boardId: 'edexcel-igcse',
    unitCode: '4MA1/1H',
    paperCode: '4MA1/1H',
    shortLabel: 'Paper 1H',
    title: 'Higher Tier Paper 1H (Standard)',
    variantGroup: 'main',
    variantBadge: 'Standard',
    maxRaw: 100,
    durationMinutes: 120,
    isModularUms: false,
    gradingScale: '9-1',
    availableSeriesIds: EDEXCEL_NON_REGIONAL_SERIES,
    seriesBoundaries: makeNineToOneCutoffs({ g9: 83, g8: 71, g7: 60, g6: 49, g5: 38, g4: 28 }, 100),
  },
  {
    id: 'edexcel-igcse-4ma1-1hr',
    subjectId: 'edexcel-igcse-4ma1',
    boardId: 'edexcel-igcse',
    unitCode: '4MA1/1H',
    paperCode: '4MA1/1HR',
    shortLabel: 'Paper 1HR',
    title: 'Higher Tier Paper 1HR (Regional TZ)',
    variantGroup: 'regional',
    variantBadge: 'Regional (R)',
    maxRaw: 100,
    durationMinutes: 120,
    isModularUms: false,
    gradingScale: '9-1',
    availableSeriesIds: EDEXCEL_REGIONAL_SERIES,
    seriesBoundaries: makeNineToOneCutoffs({ g9: 82, g8: 70, g7: 59, g6: 48, g5: 37, g4: 27 }, 100),
  },
  {
    id: 'edexcel-igcse-4ma1-2h',
    subjectId: 'edexcel-igcse-4ma1',
    boardId: 'edexcel-igcse',
    unitCode: '4MA1/2H',
    paperCode: '4MA1/2H',
    shortLabel: 'Paper 2H',
    title: 'Higher Tier Paper 2H (Standard)',
    variantGroup: 'main',
    variantBadge: 'Standard',
    maxRaw: 100,
    durationMinutes: 120,
    isModularUms: false,
    gradingScale: '9-1',
    availableSeriesIds: EDEXCEL_NON_REGIONAL_SERIES,
    seriesBoundaries: makeNineToOneCutoffs({ g9: 84, g8: 72, g7: 61, g6: 50, g5: 39, g4: 29 }, 100),
  },
  {
    id: 'edexcel-igcse-4ma1-2hr',
    subjectId: 'edexcel-igcse-4ma1',
    boardId: 'edexcel-igcse',
    unitCode: '4MA1/2H',
    paperCode: '4MA1/2HR',
    shortLabel: 'Paper 2HR',
    title: 'Higher Tier Paper 2HR (Regional TZ)',
    variantGroup: 'regional',
    variantBadge: 'Regional (R)',
    maxRaw: 100,
    durationMinutes: 120,
    isModularUms: false,
    gradingScale: '9-1',
    availableSeriesIds: EDEXCEL_REGIONAL_SERIES,
    seriesBoundaries: makeNineToOneCutoffs({ g9: 83, g8: 71, g7: 60, g6: 49, g5: 38, g4: 28 }, 100),
  },
  {
    id: 'edexcel-igcse-4pm1-01',
    subjectId: 'edexcel-igcse-4pm1',
    boardId: 'edexcel-igcse',
    unitCode: '4PM1/01',
    paperCode: '4PM1/01',
    shortLabel: 'Paper 1',
    title: 'Further Pure Maths Paper 1',
    variantGroup: 'main',
    variantBadge: 'Standard',
    maxRaw: 100,
    durationMinutes: 120,
    isModularUms: false,
    gradingScale: '9-1',
    availableSeriesIds: EDEXCEL_NON_REGIONAL_SERIES,
    seriesBoundaries: makeNineToOneCutoffs({ g9: 84, g8: 73, g7: 62, g6: 51, g5: 40, g4: 29 }, 100),
  },
  {
    id: 'edexcel-igcse-4pm1-02',
    subjectId: 'edexcel-igcse-4pm1',
    boardId: 'edexcel-igcse',
    unitCode: '4PM1/02',
    paperCode: '4PM1/02',
    shortLabel: 'Paper 2',
    title: 'Further Pure Maths Paper 2',
    variantGroup: 'main',
    variantBadge: 'Standard',
    maxRaw: 100,
    durationMinutes: 120,
    isModularUms: false,
    gradingScale: '9-1',
    availableSeriesIds: EDEXCEL_NON_REGIONAL_SERIES,
    seriesBoundaries: makeNineToOneCutoffs({ g9: 84, g8: 73, g7: 62, g6: 51, g5: 40, g4: 29 }, 100),
  },
];

export const WEAK_TOPIC_PRESETS_BY_BOARD: Record<string, string[]> = {
  'edexcel-ial': [
    'Calculus signs & constants',
    'Graph transformations',
    'Time management',
    'Proof / Show-that precision',
    'Vectors / Kinematics',
    'Numerical rounding',
  ],
  'cambridge-igcse': [
    'Vectors & Circle theorems',
    'Algebraic manipulation',
    'Significant figures',
    'ATP experimental design',
    'Time management',
    'Unit conversions',
  ],
  'cambridge-alevel': [
    'Integration & ODEs',
    'Argand / Complex locus',
    'Practical uncertainty %',
    'Fields & Induction',
    'Time management',
  ],
  'edexcel-igcse': [
    'Bounds & Proof',
    '3D Trigonometry',
    'Kinematics / Turning points',
    'Histograms & Venn sets',
    'Time management',
  ],
};

export const MOCK_INITIAL_PAPER_ATTEMPTS: PastPaperAttempt[] = [
  // Edexcel IAL Maths (WMA11-SET) — aligned with Dashboard + multi-attempt progress
  {
    id: 'seed-att-wma11-jan25-1',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wma11',
    paperCode: 'WMA11',
    seriesId: 'jan-fm-2025',
    rawScore: 55,
    maxRaw: 75,
    percentage: 73,
    derivedGrade: 'A',
    derivedUmsOrPum: 81,
    umsOrPumLabel: 'UMS',
    timed: false,
    durationMinutes: 98,
    loggedAtIso: '2026-10-29T15:30:00.000Z',
    dateLabel: '29 Oct',
    weakTopics: ['Graph transformations', 'Time management'],
    notes: 'Lost 8 marks rushing Q9 tangent normal question.',
  },
  {
    id: 'seed-att-wma11-jan25-2',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wma11',
    paperCode: 'WMA11',
    seriesId: 'jan-fm-2025',
    rawScore: 64,
    maxRaw: 75,
    percentage: 85,
    derivedGrade: 'A*',
    derivedUmsOrPum: 92,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 84,
    loggedAtIso: '2026-11-11T09:15:00.000Z',
    dateLabel: '11 Nov',
    weakTopics: ['Calculus signs & constants'],
    notes: 'Second timed sit: cleared A* threshold cleanly with 6 mins spare.',
  },
  {
    id: 'seed-att-wma11-on24',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wma11',
    paperCode: 'WMA11',
    seriesId: 'on-2024',
    rawScore: 61,
    maxRaw: 75,
    percentage: 81,
    derivedGrade: 'A',
    derivedUmsOrPum: 86,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 88,
    loggedAtIso: '2026-11-03T14:20:00.000Z',
    dateLabel: '03 Nov',
    weakTopics: ['Numerical rounding'],
    notes: 'Dropped 3 marks writing 2 s.f. instead of exact surd in Q7.',
  },
  {
    id: 'seed-att-wma11-mj24',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wma11',
    paperCode: 'WMA11',
    seriesId: 'mj-2024',
    rawScore: 65,
    maxRaw: 75,
    percentage: 87,
    derivedGrade: 'A*',
    derivedUmsOrPum: 93,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 82,
    loggedAtIso: '2026-11-06T16:10:00.000Z',
    dateLabel: '06 Nov',
    weakTopics: [],
    notes: 'Clean P1 paper; full marks on radian sector + differentiation.',
  },
  {
    id: 'seed-att-wma12-mj25',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wma12',
    paperCode: 'WMA12',
    seriesId: 'mj-2025',
    rawScore: 61,
    maxRaw: 75,
    percentage: 81,
    derivedGrade: 'A*',
    derivedUmsOrPum: 90,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 89,
    loggedAtIso: '2026-11-08T11:00:00.000Z',
    dateLabel: '08 Nov',
    weakTopics: ['Proof / Show-that precision'],
    notes: 'Hit exact A* threshold; tighten log laws justification.',
  },
  {
    id: 'seed-att-wma12-on24',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wma12',
    paperCode: 'WMA12',
    seriesId: 'on-2024',
    rawScore: 54,
    maxRaw: 75,
    percentage: 72,
    derivedGrade: 'A',
    derivedUmsOrPum: 80,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 90,
    loggedAtIso: '2026-11-01T17:40:00.000Z',
    dateLabel: '01 Nov',
    weakTopics: ['Trigonometric identities'],
    notes: 'Trapezium rule + geometric series solid; missed last trig proof.',
  },
  {
    id: 'seed-att-wme01-mj24',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wme01',
    paperCode: 'WME01',
    seriesId: 'mj-2024',
    rawScore: 56,
    maxRaw: 75,
    percentage: 75,
    derivedGrade: 'A',
    derivedUmsOrPum: 86,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 87,
    loggedAtIso: '2026-11-04T19:00:00.000Z',
    dateLabel: '04 Nov',
    weakTopics: ['Vectors / Kinematics'],
    notes: 'Inclined plane pulley smooth; forgot normal reaction sign on Q6.',
  },
  {
    id: 'seed-att-wst01-on23',
    subjectId: 'ial-maths-suite',
    rowId: 'ial-maths-wst01',
    paperCode: 'WST01',
    seriesId: 'on-2023',
    rawScore: 63,
    maxRaw: 75,
    percentage: 84,
    derivedGrade: 'A*',
    derivedUmsOrPum: 91,
    umsOrPumLabel: 'UMS',
    timed: false,
    durationMinutes: 95,
    loggedAtIso: '2026-10-27T13:20:00.000Z',
    dateLabel: '27 Oct',
    weakTopics: ['Regression coding'],
    notes: 'Normal tables accurate; check coding formula notation.',
  },

  // Edexcel IAL Physics & Chemistry
  {
    id: 'seed-att-wph11-on24',
    subjectId: 'ial-physics',
    rowId: 'ial-physics-wph11',
    paperCode: 'WPH11',
    seriesId: 'on-2024',
    rawScore: 68,
    maxRaw: 80,
    percentage: 85,
    derivedGrade: 'A*',
    derivedUmsOrPum: 111,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 85,
    loggedAtIso: '2026-11-10T14:00:00.000Z',
    dateLabel: '10 Nov',
    weakTopics: [],
    notes: 'High mechanics marks; check Young modulus gradient units.',
  },
  {
    id: 'seed-att-wch11-jan25',
    subjectId: 'ial-chemistry',
    rowId: 'ial-chemistry-wch11',
    paperCode: 'WCH11',
    seriesId: 'jan-fm-2025',
    rawScore: 59,
    maxRaw: 80,
    percentage: 74,
    derivedGrade: 'A',
    derivedUmsOrPum: 103,
    umsOrPumLabel: 'UMS',
    timed: true,
    durationMinutes: 89,
    loggedAtIso: '2026-11-09T16:45:00.000Z',
    dateLabel: '09 Nov',
    weakTopics: ['Hess cycle signs'],
    notes: 'Review Born-Haber electron affinity arrow direction.',
  },

  // Cambridge IGCSE 0580, 0625, 0620
  {
    id: 'seed-att-0580-42-mj25',
    subjectId: 'igcse-maths-0580',
    rowId: 'igcse-maths-0580-42',
    paperCode: '0580/42',
    seriesId: 'mj-2025',
    rawScore: 116,
    maxRaw: 130,
    percentage: 89,
    derivedGrade: 'A*',
    derivedUmsOrPum: 92,
    umsOrPumLabel: 'PUM',
    timed: true,
    durationMinutes: 140,
    loggedAtIso: '2026-11-11T10:30:00.000Z',
    dateLabel: '11 Nov',
    weakTopics: ['Vectors & Circle theorems'],
    notes: 'Full marks on mensuration; check final 3D trig angle bearing.',
  },
  {
    id: 'seed-att-0580-22-mj25',
    subjectId: 'igcse-maths-0580',
    rowId: 'igcse-maths-0580-22',
    paperCode: '0580/22',
    seriesId: 'mj-2025',
    rawScore: 63,
    maxRaw: 70,
    percentage: 90,
    derivedGrade: 'A*',
    derivedUmsOrPum: 92,
    umsOrPumLabel: 'PUM',
    timed: true,
    durationMinutes: 82,
    loggedAtIso: '2026-11-07T15:00:00.000Z',
    dateLabel: '07 Nov',
    weakTopics: [],
    notes: 'Fast non-calc mental arithmetic; 8 mins left to double-check.',
  },
  {
    id: 'seed-att-0580-42-on24',
    subjectId: 'igcse-maths-0580',
    rowId: 'igcse-maths-0580-42',
    paperCode: '0580/42',
    seriesId: 'on-2024',
    rawScore: 103,
    maxRaw: 130,
    percentage: 79,
    derivedGrade: 'A',
    derivedUmsOrPum: 83,
    umsOrPumLabel: 'PUM',
    timed: true,
    durationMinutes: 148,
    loggedAtIso: '2026-11-02T12:15:00.000Z',
    dateLabel: '02 Nov',
    weakTopics: ['Vectors & Circle theorems', 'Algebraic manipulation'],
    notes: 'Vector ratio collinearity proof needed explicit scalar k.',
  },
  {
    id: 'seed-att-0625-42-mj25',
    subjectId: 'igcse-physics-0625',
    rowId: 'igcse-physics-0625-42',
    paperCode: '0625/42',
    seriesId: 'mj-2025',
    rawScore: 66,
    maxRaw: 80,
    percentage: 83,
    derivedGrade: 'A*',
    derivedUmsOrPum: 92,
    umsOrPumLabel: 'PUM',
    timed: true,
    durationMinutes: 71,
    loggedAtIso: '2026-11-09T11:30:00.000Z',
    dateLabel: '09 Nov',
    weakTopics: ['Significant figures'],
    notes: 'Clean electromagnetic induction explanations.',
  },
  {
    id: 'seed-att-0620-42-on24',
    subjectId: 'igcse-chemistry-0620',
    rowId: 'igcse-chemistry-0620-42',
    paperCode: '0620/42',
    seriesId: 'on-2024',
    rawScore: 61,
    maxRaw: 80,
    percentage: 76,
    derivedGrade: 'A',
    derivedUmsOrPum: 87,
    umsOrPumLabel: 'PUM',
    timed: false,
    durationMinutes: 78,
    loggedAtIso: '2026-11-05T18:20:00.000Z',
    dateLabel: '05 Nov',
    weakTopics: ['Unit conversions'],
    notes: 'Check dm3 vs cm3 conversion in titration back-calc.',
  },

  // Cambridge Int'l A-Level 9709 + Edexcel IGCSE 4MA1
  {
    id: 'seed-att-9709-12-mj25',
    subjectId: 'cie-maths-9709',
    rowId: 'cie-maths-9709-12',
    paperCode: '9709/12',
    seriesId: 'mj-2025',
    rawScore: 66,
    maxRaw: 75,
    percentage: 88,
    derivedGrade: 'A*',
    derivedUmsOrPum: 91,
    umsOrPumLabel: 'PUM',
    timed: true,
    durationMinutes: 102,
    loggedAtIso: '2026-11-08T13:10:00.000Z',
    dateLabel: '08 Nov',
    weakTopics: [],
    notes: 'Circular measure + functions sharp.',
  },
  {
    id: 'seed-att-4ma1-2h-mj25',
    subjectId: 'edexcel-igcse-4ma1',
    rowId: 'edexcel-igcse-4ma1-2h',
    paperCode: '4MA1/2H',
    seriesId: 'mj-2025',
    rawScore: 86,
    maxRaw: 100,
    percentage: 86,
    derivedGrade: '9',
    derivedUmsOrPum: 91,
    umsOrPumLabel: 'PUM',
    timed: true,
    durationMinutes: 112,
    loggedAtIso: '2026-11-10T16:00:00.000Z',
    dateLabel: '10 Nov',
    weakTopics: ['Bounds & Proof'],
    notes: 'Strong Grade 9 buffer above 84 boundary.',
  },
];

export function createDefaultStudyPapersState(): StudyPapersPersistedState {
  const uniqueCellKeys = Array.from(
    new Set(
      MOCK_INITIAL_PAPER_ATTEMPTS.map((a) => getCellStorageKey(a.rowId, a.seriesId))
    )
  );
  return {
    version: 1,
    attempts: MOCK_INITIAL_PAPER_ATTEMPTS,
    cellDisplayMode: 'best',
    xpAwardedCellKeys: uniqueCellKeys,
    pbImprovedCount: 1,
    earnedPaperXp: uniqueCellKeys.length * 25 + 15,
  };
}
