export type ExamBoardId =
  | 'edexcel-ial'
  | 'caie-alevel'
  | 'caie-igcse'
  | 'edexcel-igcse';

export type ExamSeriesId = 'mj-2025' | 'jan-2025' | 'on-2024';

export interface GradeThreshold {
  grade: string;
  /** Minimum total raw mark (or UMS for modular IAL) required for this grade */
  minScore: number;
}

export interface PaperComponentMock {
  id: string;
  code: string;
  title: string;
  maxRaw: number;
  /** Optional UMS cap for modular Edexcel units (e.g. 100 UMS or 120 UMS) */
  maxUms?: number;
  weightLabel: string;
  defaultRaw: number;
  /** Per-series raw mark thresholds for [Pass C, Grade A, Top Grade] on this individual paper */
  seriesPaperCutoffs: Record<
    ExamSeriesId,
    { passC: number; gradeA: number; topGrade: number }
  >;
}

export interface CalculatorSubjectMock {
  id: string;
  boardId: ExamBoardId;
  code: string;
  title: string;
  levelLabel: string;
  gradingScale: 'A*-U' | '9-1';
  isModularUms: boolean;
  maxTotalRaw: number;
  maxTotalUms?: number;
  papers: PaperComponentMock[];
  /** Per-series overall grade boundaries (measured against total UMS if modular, or total raw mark if linear) */
  seriesBoundaries: Record<ExamSeriesId, GradeThreshold[]>;
}

export interface ExamBoardOption {
  id: ExamBoardId;
  shortName: string;
  fullName: string;
  scaleBadge: string;
}

export interface ExamSeriesOption {
  id: ExamSeriesId;
  label: string;
  tag: string;
}

export const MOCK_EXAM_BOARDS: ExamBoardOption[] = [
  {
    id: 'edexcel-ial',
    shortName: 'Edexcel IAL',
    fullName: 'Pearson Edexcel International Advanced Level',
    scaleBadge: 'UMS · A*–U',
  },
  {
    id: 'caie-alevel',
    shortName: 'Cambridge AS & A-Level',
    fullName: 'Cambridge International AS & A Level',
    scaleBadge: 'PUM · A*–U',
  },
  {
    id: 'caie-igcse',
    shortName: 'Cambridge IGCSE',
    fullName: 'Cambridge International General Certificate (IGCSE)',
    scaleBadge: 'Extended · A*–G',
  },
  {
    id: 'edexcel-igcse',
    shortName: 'Edexcel IGCSE',
    fullName: 'Pearson Edexcel International GCSE (9–1)',
    scaleBadge: 'Linear · 9–1',
  },
];

export const MOCK_EXAM_SERIES: ExamSeriesOption[] = [
  { id: 'mj-2025', label: 'May / June 2025', tag: 'Summer' },
  { id: 'jan-2025', label: 'January 2025', tag: 'Winter' },
  { id: 'on-2024', label: 'Oct / Nov 2024', tag: 'Autumn' },
];

const IAL_600_UMS_BOUNDARIES: Record<ExamSeriesId, GradeThreshold[]> = {
  'mj-2025': [
    { grade: 'A*', minScore: 525 },
    { grade: 'A', minScore: 480 },
    { grade: 'B', minScore: 420 },
    { grade: 'C', minScore: 360 },
    { grade: 'D', minScore: 300 },
    { grade: 'E', minScore: 240 },
  ],
  'jan-2025': [
    { grade: 'A*', minScore: 520 },
    { grade: 'A', minScore: 480 },
    { grade: 'B', minScore: 420 },
    { grade: 'C', minScore: 360 },
    { grade: 'D', minScore: 300 },
    { grade: 'E', minScore: 240 },
  ],
  'on-2024': [
    { grade: 'A*', minScore: 530 },
    { grade: 'A', minScore: 480 },
    { grade: 'B', minScore: 420 },
    { grade: 'C', minScore: 360 },
    { grade: 'D', minScore: 300 },
    { grade: 'E', minScore: 240 },
  ],
};

function makeIalScienceUnits(prefix: string, subjectName: string): PaperComponentMock[] {
  return [
    {
      id: `${prefix.toLowerCase()}-u1`,
      code: `${prefix}11`,
      title: `Unit 1: Core ${subjectName} I`,
      maxRaw: 80,
      maxUms: 120,
      weightLabel: '120 UMS',
      defaultRaw: 62,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 41, gradeA: 55, topGrade: 63 },
        'jan-2025': { passC: 40, gradeA: 54, topGrade: 62 },
        'on-2024': { passC: 42, gradeA: 56, topGrade: 64 },
      },
    },
    {
      id: `${prefix.toLowerCase()}-u2`,
      code: `${prefix}12`,
      title: `Unit 2: Core ${subjectName} II`,
      maxRaw: 80,
      maxUms: 120,
      weightLabel: '120 UMS',
      defaultRaw: 60,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 40, gradeA: 54, topGrade: 62 },
        'jan-2025': { passC: 39, gradeA: 53, topGrade: 61 },
        'on-2024': { passC: 41, gradeA: 55, topGrade: 63 },
      },
    },
    {
      id: `${prefix.toLowerCase()}-u3`,
      code: `${prefix}13`,
      title: `Unit 3: Practical Skills in ${subjectName} I`,
      maxRaw: 50,
      maxUms: 60,
      weightLabel: '60 UMS',
      defaultRaw: 41,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 27, gradeA: 36, topGrade: 41 },
        'jan-2025': { passC: 26, gradeA: 35, topGrade: 40 },
        'on-2024': { passC: 28, gradeA: 37, topGrade: 42 },
      },
    },
    {
      id: `${prefix.toLowerCase()}-u4`,
      code: `${prefix}14`,
      title: `Unit 4: Advanced ${subjectName} I`,
      maxRaw: 90,
      maxUms: 120,
      weightLabel: '120 UMS',
      defaultRaw: 72,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 49, gradeA: 65, topGrade: 73 },
        'jan-2025': { passC: 48, gradeA: 64, topGrade: 72 },
        'on-2024': { passC: 50, gradeA: 66, topGrade: 74 },
      },
    },
    {
      id: `${prefix.toLowerCase()}-u5`,
      code: `${prefix}15`,
      title: `Unit 5: Advanced ${subjectName} II`,
      maxRaw: 90,
      maxUms: 120,
      weightLabel: '120 UMS',
      defaultRaw: 70,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 48, gradeA: 64, topGrade: 72 },
        'jan-2025': { passC: 47, gradeA: 63, topGrade: 71 },
        'on-2024': { passC: 49, gradeA: 65, topGrade: 73 },
      },
    },
    {
      id: `${prefix.toLowerCase()}-u6`,
      code: `${prefix}16`,
      title: `Unit 6: Practical Skills in ${subjectName} II`,
      maxRaw: 50,
      maxUms: 60,
      weightLabel: '60 UMS',
      defaultRaw: 42,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 27, gradeA: 36, topGrade: 41 },
        'jan-2025': { passC: 26, gradeA: 35, topGrade: 40 },
        'on-2024': { passC: 28, gradeA: 37, topGrade: 42 },
      },
    },
  ];
}

function makeCaieSciencePapers(code: string, subjectName: string): PaperComponentMock[] {
  return [
    {
      id: `${code}-p1`,
      code: 'Paper 12',
      title: 'AS Multiple Choice',
      maxRaw: 40,
      weightLabel: '15% Weight',
      defaultRaw: 33,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 21, gradeA: 29, topGrade: 34 },
        'jan-2025': { passC: 20, gradeA: 28, topGrade: 33 },
        'on-2024': { passC: 22, gradeA: 30, topGrade: 35 },
      },
    },
    {
      id: `${code}-p2`,
      code: 'Paper 22',
      title: `AS Structured ${subjectName} Questions`,
      maxRaw: 60,
      weightLabel: '23% Weight',
      defaultRaw: 48,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 29, gradeA: 42, topGrade: 50 },
        'jan-2025': { passC: 28, gradeA: 41, topGrade: 49 },
        'on-2024': { passC: 30, gradeA: 43, topGrade: 51 },
      },
    },
    {
      id: `${code}-p3`,
      code: 'Paper 33',
      title: 'AS Advanced Practical Skills',
      maxRaw: 40,
      weightLabel: '12% Weight',
      defaultRaw: 32,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 21, gradeA: 29, topGrade: 34 },
        'jan-2025': { passC: 20, gradeA: 28, topGrade: 33 },
        'on-2024': { passC: 22, gradeA: 30, topGrade: 35 },
      },
    },
    {
      id: `${code}-p4`,
      code: 'Paper 42',
      title: `A2 Structured ${subjectName} Questions`,
      maxRaw: 100,
      weightLabel: '38% Weight',
      defaultRaw: 76,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 46, gradeA: 66, topGrade: 78 },
        'jan-2025': { passC: 45, gradeA: 64, topGrade: 76 },
        'on-2024': { passC: 48, gradeA: 68, topGrade: 80 },
      },
    },
    {
      id: `${code}-p5`,
      code: 'Paper 52',
      title: 'A2 Planning, Analysis & Evaluation',
      maxRaw: 30,
      weightLabel: '12% Weight',
      defaultRaw: 24,
      seriesPaperCutoffs: {
        'mj-2025': { passC: 15, gradeA: 21, topGrade: 25 },
        'jan-2025': { passC: 14, gradeA: 20, topGrade: 24 },
        'on-2024': { passC: 16, gradeA: 22, topGrade: 26 },
      },
    },
  ];
}

export const MOCK_CALCULATOR_SUBJECTS: CalculatorSubjectMock[] = [
  // =========================================================================
  // BOARD 1: PEARSON EDEXCEL IAL (edexcel-ial)
  // =========================================================================
  {
    id: 'edexcel-ial-maths',
    boardId: 'edexcel-ial',
    code: 'YMA01',
    title: 'IAL Mathematics (P1–P4 + M1 + S1)',
    levelLabel: '6 Units · 600 UMS',
    gradingScale: 'A*-U',
    isModularUms: true,
    maxTotalRaw: 450,
    maxTotalUms: 600,
    papers: [
      {
        id: 'wma11',
        code: 'WMA11',
        title: 'Pure Mathematics 1 (P1)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 64,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 41, gradeA: 55, topGrade: 63 },
          'jan-2025': { passC: 40, gradeA: 54, topGrade: 62 },
          'on-2024': { passC: 42, gradeA: 56, topGrade: 64 },
        },
      },
      {
        id: 'wma12',
        code: 'WMA12',
        title: 'Pure Mathematics 2 (P2)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 61,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 53, topGrade: 61 },
          'jan-2025': { passC: 38, gradeA: 52, topGrade: 60 },
          'on-2024': { passC: 40, gradeA: 54, topGrade: 62 },
        },
      },
      {
        id: 'wma13',
        code: 'WMA13',
        title: 'Pure Mathematics 3 (P3)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 66,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 42, gradeA: 57, topGrade: 64 },
          'jan-2025': { passC: 41, gradeA: 56, topGrade: 63 },
          'on-2024': { passC: 43, gradeA: 58, topGrade: 65 },
        },
      },
      {
        id: 'wma14',
        code: 'WMA14',
        title: 'Pure Mathematics 4 (P4)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 65,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 41, gradeA: 56, topGrade: 63 },
          'jan-2025': { passC: 40, gradeA: 55, topGrade: 62 },
          'on-2024': { passC: 42, gradeA: 57, topGrade: 64 },
        },
      },
      {
        id: 'wme01',
        code: 'WME01',
        title: 'Mechanics 1 (M1)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 60,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 38, gradeA: 52, topGrade: 60 },
          'jan-2025': { passC: 37, gradeA: 51, topGrade: 59 },
          'on-2024': { passC: 39, gradeA: 53, topGrade: 61 },
        },
      },
      {
        id: 'wst01',
        code: 'WST01',
        title: 'Statistics 1 (S1)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 62,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 54, topGrade: 62 },
          'jan-2025': { passC: 38, gradeA: 53, topGrade: 61 },
          'on-2024': { passC: 40, gradeA: 55, topGrade: 63 },
        },
      },
    ],
    seriesBoundaries: IAL_600_UMS_BOUNDARIES,
  },
  {
    id: 'edexcel-ial-fmaths',
    boardId: 'edexcel-ial',
    code: 'YFM01',
    title: 'IAL Further Mathematics (FP1–FP3 + M2 + S2 + D1)',
    levelLabel: '6 Units · 600 UMS',
    gradingScale: 'A*-U',
    isModularUms: true,
    maxTotalRaw: 450,
    maxTotalUms: 600,
    papers: [
      {
        id: 'wfm01',
        code: 'WFM01',
        title: 'Further Pure Mathematics 1 (FP1)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 63,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 40, gradeA: 55, topGrade: 63 },
          'jan-2025': { passC: 39, gradeA: 54, topGrade: 62 },
          'on-2024': { passC: 41, gradeA: 56, topGrade: 64 },
        },
      },
      {
        id: 'wfm02',
        code: 'WFM02',
        title: 'Further Pure Mathematics 2 (FP2)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 62,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 54, topGrade: 62 },
          'jan-2025': { passC: 38, gradeA: 53, topGrade: 61 },
          'on-2024': { passC: 40, gradeA: 55, topGrade: 63 },
        },
      },
      {
        id: 'wfm03',
        code: 'WFM03',
        title: 'Further Pure Mathematics 3 (FP3)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 64,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 40, gradeA: 55, topGrade: 63 },
          'jan-2025': { passC: 39, gradeA: 54, topGrade: 62 },
          'on-2024': { passC: 41, gradeA: 56, topGrade: 64 },
        },
      },
      {
        id: 'wme02',
        code: 'WME02',
        title: 'Mechanics 2 (M2)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 61,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 38, gradeA: 53, topGrade: 61 },
          'jan-2025': { passC: 37, gradeA: 52, topGrade: 60 },
          'on-2024': { passC: 39, gradeA: 54, topGrade: 62 },
        },
      },
      {
        id: 'wst02',
        code: 'WST02',
        title: 'Statistics 2 (S2)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 63,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 54, topGrade: 62 },
          'jan-2025': { passC: 38, gradeA: 53, topGrade: 61 },
          'on-2024': { passC: 40, gradeA: 55, topGrade: 63 },
        },
      },
      {
        id: 'wdm11',
        code: 'WDM11',
        title: 'Decision Mathematics 1 (D1)',
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 64,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 41, gradeA: 56, topGrade: 63 },
          'jan-2025': { passC: 40, gradeA: 55, topGrade: 62 },
          'on-2024': { passC: 42, gradeA: 57, topGrade: 64 },
        },
      },
    ],
    seriesBoundaries: IAL_600_UMS_BOUNDARIES,
  },
  {
    id: 'edexcel-ial-physics',
    boardId: 'edexcel-ial',
    code: 'YPH11',
    title: 'IAL Physics (Units 1–6)',
    levelLabel: '6 Units · 600 UMS',
    gradingScale: 'A*-U',
    isModularUms: true,
    maxTotalRaw: 440,
    maxTotalUms: 600,
    papers: makeIalScienceUnits('WPH', 'Physics'),
    seriesBoundaries: IAL_600_UMS_BOUNDARIES,
  },
  {
    id: 'edexcel-ial-chemistry',
    boardId: 'edexcel-ial',
    code: 'YCH11',
    title: 'IAL Chemistry (Units 1–6)',
    levelLabel: '6 Units · 600 UMS',
    gradingScale: 'A*-U',
    isModularUms: true,
    maxTotalRaw: 440,
    maxTotalUms: 600,
    papers: makeIalScienceUnits('WCH', 'Chemistry'),
    seriesBoundaries: IAL_600_UMS_BOUNDARIES,
  },
  {
    id: 'edexcel-ial-biology',
    boardId: 'edexcel-ial',
    code: 'YBI11',
    title: 'IAL Biology (Units 1–6)',
    levelLabel: '6 Units · 600 UMS',
    gradingScale: 'A*-U',
    isModularUms: true,
    maxTotalRaw: 440,
    maxTotalUms: 600,
    papers: makeIalScienceUnits('WBI', 'Biology'),
    seriesBoundaries: IAL_600_UMS_BOUNDARIES,
  },

  // =========================================================================
  // BOARD 2: CAMBRIDGE INTERNATIONAL AS & A-LEVEL (caie-alevel)
  // =========================================================================
  {
    id: 'caie-alevel-maths-9709',
    boardId: 'caie-alevel',
    code: '9709',
    title: 'AS & A-Level Mathematics',
    levelLabel: '4 Papers · 250 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 250,
    papers: [
      {
        id: '9709-p1',
        code: 'Paper 12',
        title: 'Pure Mathematics 1 (P1)',
        maxRaw: 75,
        weightLabel: '30% Weight',
        defaultRaw: 65,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 42, gradeA: 56, topGrade: 65 },
          'jan-2025': { passC: 41, gradeA: 55, topGrade: 64 },
          'on-2024': { passC: 44, gradeA: 58, topGrade: 67 },
        },
      },
      {
        id: '9709-p3',
        code: 'Paper 32',
        title: 'Pure Mathematics 3 (P3)',
        maxRaw: 75,
        weightLabel: '30% Weight',
        defaultRaw: 62,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 40, gradeA: 54, topGrade: 63 },
          'jan-2025': { passC: 39, gradeA: 53, topGrade: 62 },
          'on-2024': { passC: 42, gradeA: 56, topGrade: 65 },
        },
      },
      {
        id: '9709-p4',
        code: 'Paper 42',
        title: 'Mechanics (M1)',
        maxRaw: 50,
        weightLabel: '20% Weight',
        defaultRaw: 43,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 28, gradeA: 38, topGrade: 44 },
          'jan-2025': { passC: 27, gradeA: 37, topGrade: 43 },
          'on-2024': { passC: 29, gradeA: 39, topGrade: 45 },
        },
      },
      {
        id: '9709-p5',
        code: 'Paper 52',
        title: 'Probability & Statistics 1 (S1)',
        maxRaw: 50,
        weightLabel: '20% Weight',
        defaultRaw: 44,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 29, gradeA: 39, topGrade: 45 },
          'jan-2025': { passC: 28, gradeA: 38, topGrade: 44 },
          'on-2024': { passC: 30, gradeA: 40, topGrade: 46 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 215 },
        { grade: 'A', minScore: 190 },
        { grade: 'B', minScore: 164 },
        { grade: 'C', minScore: 138 },
        { grade: 'D', minScore: 112 },
        { grade: 'E', minScore: 86 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 212 },
        { grade: 'A', minScore: 187 },
        { grade: 'B', minScore: 161 },
        { grade: 'C', minScore: 135 },
        { grade: 'D', minScore: 110 },
        { grade: 'E', minScore: 84 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 221 },
        { grade: 'A', minScore: 195 },
        { grade: 'B', minScore: 168 },
        { grade: 'C', minScore: 142 },
        { grade: 'D', minScore: 116 },
        { grade: 'E', minScore: 90 },
      ],
    },
  },
  {
    id: 'caie-alevel-physics-9702',
    boardId: 'caie-alevel',
    code: '9702',
    title: 'AS & A-Level Physics',
    levelLabel: '5 Papers · 270 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 270,
    papers: makeCaieSciencePapers('9702', 'Physics'),
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 208 },
        { grade: 'A', minScore: 182 },
        { grade: 'B', minScore: 158 },
        { grade: 'C', minScore: 132 },
        { grade: 'D', minScore: 108 },
        { grade: 'E', minScore: 84 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 204 },
        { grade: 'A', minScore: 178 },
        { grade: 'B', minScore: 154 },
        { grade: 'C', minScore: 129 },
        { grade: 'D', minScore: 105 },
        { grade: 'E', minScore: 81 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 212 },
        { grade: 'A', minScore: 186 },
        { grade: 'B', minScore: 162 },
        { grade: 'C', minScore: 136 },
        { grade: 'D', minScore: 112 },
        { grade: 'E', minScore: 88 },
      ],
    },
  },
  {
    id: 'caie-alevel-chemistry-9701',
    boardId: 'caie-alevel',
    code: '9701',
    title: 'AS & A-Level Chemistry',
    levelLabel: '5 Papers · 270 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 270,
    papers: makeCaieSciencePapers('9701', 'Chemistry'),
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 202 },
        { grade: 'A', minScore: 176 },
        { grade: 'B', minScore: 152 },
        { grade: 'C', minScore: 128 },
        { grade: 'D', minScore: 104 },
        { grade: 'E', minScore: 80 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 198 },
        { grade: 'A', minScore: 172 },
        { grade: 'B', minScore: 148 },
        { grade: 'C', minScore: 124 },
        { grade: 'D', minScore: 100 },
        { grade: 'E', minScore: 78 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 206 },
        { grade: 'A', minScore: 180 },
        { grade: 'B', minScore: 156 },
        { grade: 'C', minScore: 132 },
        { grade: 'D', minScore: 108 },
        { grade: 'E', minScore: 84 },
      ],
    },
  },
  {
    id: 'caie-alevel-biology-9700',
    boardId: 'caie-alevel',
    code: '9700',
    title: 'AS & A-Level Biology',
    levelLabel: '5 Papers · 270 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 270,
    papers: makeCaieSciencePapers('9700', 'Biology'),
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 205 },
        { grade: 'A', minScore: 180 },
        { grade: 'B', minScore: 156 },
        { grade: 'C', minScore: 130 },
        { grade: 'D', minScore: 106 },
        { grade: 'E', minScore: 82 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 201 },
        { grade: 'A', minScore: 176 },
        { grade: 'B', minScore: 152 },
        { grade: 'C', minScore: 127 },
        { grade: 'D', minScore: 103 },
        { grade: 'E', minScore: 80 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 209 },
        { grade: 'A', minScore: 184 },
        { grade: 'B', minScore: 160 },
        { grade: 'C', minScore: 134 },
        { grade: 'D', minScore: 110 },
        { grade: 'E', minScore: 86 },
      ],
    },
  },
  {
    id: 'caie-alevel-cs-9618',
    boardId: 'caie-alevel',
    code: '9618',
    title: 'AS & A-Level Computer Science',
    levelLabel: '4 Papers · 300 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 300,
    papers: [
      {
        id: '9618-p1',
        code: 'Paper 12',
        title: 'Theory Fundamentals',
        maxRaw: 75,
        weightLabel: '25% Weight',
        defaultRaw: 62,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 53, topGrade: 62 },
          'jan-2025': { passC: 38, gradeA: 52, topGrade: 61 },
          'on-2024': { passC: 40, gradeA: 54, topGrade: 63 },
        },
      },
      {
        id: '9618-p2',
        code: 'Paper 22',
        title: 'Fundamental Problem-Solving & Programming',
        maxRaw: 75,
        weightLabel: '25% Weight',
        defaultRaw: 60,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 38, gradeA: 52, topGrade: 61 },
          'jan-2025': { passC: 37, gradeA: 51, topGrade: 60 },
          'on-2024': { passC: 39, gradeA: 53, topGrade: 62 },
        },
      },
      {
        id: '9618-p3',
        code: 'Paper 32',
        title: 'Advanced Theory',
        maxRaw: 75,
        weightLabel: '25% Weight',
        defaultRaw: 61,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 53, topGrade: 62 },
          'jan-2025': { passC: 38, gradeA: 52, topGrade: 61 },
          'on-2024': { passC: 40, gradeA: 54, topGrade: 63 },
        },
      },
      {
        id: '9618-p4',
        code: 'Paper 42',
        title: 'Practical Programming Paper',
        maxRaw: 75,
        weightLabel: '25% Weight',
        defaultRaw: 64,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 40, gradeA: 55, topGrade: 64 },
          'jan-2025': { passC: 39, gradeA: 54, topGrade: 63 },
          'on-2024': { passC: 41, gradeA: 56, topGrade: 65 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 245 },
        { grade: 'A', minScore: 214 },
        { grade: 'B', minScore: 186 },
        { grade: 'C', minScore: 156 },
        { grade: 'D', minScore: 128 },
        { grade: 'E', minScore: 100 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 241 },
        { grade: 'A', minScore: 210 },
        { grade: 'B', minScore: 182 },
        { grade: 'C', minScore: 152 },
        { grade: 'D', minScore: 124 },
        { grade: 'E', minScore: 96 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 249 },
        { grade: 'A', minScore: 218 },
        { grade: 'B', minScore: 190 },
        { grade: 'C', minScore: 160 },
        { grade: 'D', minScore: 132 },
        { grade: 'E', minScore: 104 },
      ],
    },
  },

  // =========================================================================
  // BOARD 3: CAMBRIDGE IGCSE (caie-igcse)
  // =========================================================================
  {
    id: 'caie-igcse-maths-0580',
    boardId: 'caie-igcse',
    code: '0580',
    title: 'IGCSE Mathematics (Extended)',
    levelLabel: '2 Papers · 200 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 200,
    papers: [
      {
        id: '0580-p2',
        code: 'Paper 22',
        title: 'Extended Non-Calculator Paper',
        maxRaw: 100,
        weightLabel: '50% Weight',
        defaultRaw: 88,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 56, gradeA: 76, topGrade: 89 },
          'jan-2025': { passC: 54, gradeA: 74, topGrade: 87 },
          'on-2024': { passC: 58, gradeA: 78, topGrade: 91 },
        },
      },
      {
        id: '0580-p4',
        code: 'Paper 42',
        title: 'Extended Calculator Structured Paper',
        maxRaw: 100,
        weightLabel: '50% Weight',
        defaultRaw: 90,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 56, gradeA: 76, topGrade: 89 },
          'jan-2025': { passC: 54, gradeA: 74, topGrade: 87 },
          'on-2024': { passC: 58, gradeA: 78, topGrade: 91 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 176 },
        { grade: 'A', minScore: 152 },
        { grade: 'B', minScore: 132 },
        { grade: 'C', minScore: 112 },
        { grade: 'D', minScore: 90 },
        { grade: 'E', minScore: 68 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 172 },
        { grade: 'A', minScore: 148 },
        { grade: 'B', minScore: 128 },
        { grade: 'C', minScore: 108 },
        { grade: 'D', minScore: 86 },
        { grade: 'E', minScore: 65 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 180 },
        { grade: 'A', minScore: 156 },
        { grade: 'B', minScore: 136 },
        { grade: 'C', minScore: 116 },
        { grade: 'D', minScore: 94 },
        { grade: 'E', minScore: 72 },
      ],
    },
  },
  {
    id: 'caie-igcse-addmaths-0606',
    boardId: 'caie-igcse',
    code: '0606',
    title: 'IGCSE Additional Mathematics',
    levelLabel: '2 Papers · 160 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 160,
    papers: [
      {
        id: '0606-p1',
        code: 'Paper 12',
        title: 'Paper 1 (Non-Calculator)',
        maxRaw: 80,
        weightLabel: '50% Weight',
        defaultRaw: 68,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 42, gradeA: 58, topGrade: 69 },
          'jan-2025': { passC: 41, gradeA: 57, topGrade: 68 },
          'on-2024': { passC: 43, gradeA: 60, topGrade: 70 },
        },
      },
      {
        id: '0606-p2',
        code: 'Paper 22',
        title: 'Paper 2 (Calculator)',
        maxRaw: 80,
        weightLabel: '50% Weight',
        defaultRaw: 70,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 42, gradeA: 58, topGrade: 69 },
          'jan-2025': { passC: 41, gradeA: 57, topGrade: 68 },
          'on-2024': { passC: 43, gradeA: 60, topGrade: 70 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 137 },
        { grade: 'A', minScore: 116 },
        { grade: 'B', minScore: 100 },
        { grade: 'C', minScore: 84 },
        { grade: 'D', minScore: 68 },
        { grade: 'E', minScore: 52 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 134 },
        { grade: 'A', minScore: 113 },
        { grade: 'B', minScore: 97 },
        { grade: 'C', minScore: 82 },
        { grade: 'D', minScore: 66 },
        { grade: 'E', minScore: 50 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 140 },
        { grade: 'A', minScore: 119 },
        { grade: 'B', minScore: 103 },
        { grade: 'C', minScore: 86 },
        { grade: 'D', minScore: 70 },
        { grade: 'E', minScore: 54 },
      ],
    },
  },
  {
    id: 'caie-igcse-physics-0625',
    boardId: 'caie-igcse',
    code: '0625',
    title: 'IGCSE Physics (Extended)',
    levelLabel: '3 Papers · 160 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 160,
    papers: [
      {
        id: '0625-p2',
        code: 'Paper 22',
        title: 'Multiple Choice (Extended)',
        maxRaw: 40,
        weightLabel: '30% Weight',
        defaultRaw: 34,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 21, gradeA: 29, topGrade: 34 },
          'jan-2025': { passC: 20, gradeA: 28, topGrade: 33 },
          'on-2024': { passC: 22, gradeA: 30, topGrade: 35 },
        },
      },
      {
        id: '0625-p4',
        code: 'Paper 42',
        title: 'Theory (Extended)',
        maxRaw: 80,
        weightLabel: '50% Weight',
        defaultRaw: 64,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 36, gradeA: 52, topGrade: 62 },
          'jan-2025': { passC: 35, gradeA: 50, topGrade: 60 },
          'on-2024': { passC: 38, gradeA: 54, topGrade: 64 },
        },
      },
      {
        id: '0625-p6',
        code: 'Paper 62',
        title: 'Alternative to Practical',
        maxRaw: 40,
        weightLabel: '20% Weight',
        defaultRaw: 33,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 21, gradeA: 29, topGrade: 34 },
          'jan-2025': { passC: 20, gradeA: 28, topGrade: 33 },
          'on-2024': { passC: 22, gradeA: 30, topGrade: 35 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 129 },
        { grade: 'A', minScore: 110 },
        { grade: 'B', minScore: 94 },
        { grade: 'C', minScore: 78 },
        { grade: 'D', minScore: 62 },
        { grade: 'E', minScore: 48 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 126 },
        { grade: 'A', minScore: 107 },
        { grade: 'B', minScore: 91 },
        { grade: 'C', minScore: 75 },
        { grade: 'D', minScore: 60 },
        { grade: 'E', minScore: 46 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 132 },
        { grade: 'A', minScore: 113 },
        { grade: 'B', minScore: 97 },
        { grade: 'C', minScore: 80 },
        { grade: 'D', minScore: 64 },
        { grade: 'E', minScore: 50 },
      ],
    },
  },
  {
    id: 'caie-igcse-chemistry-0620',
    boardId: 'caie-igcse',
    code: '0620',
    title: 'IGCSE Chemistry (Extended)',
    levelLabel: '3 Papers · 160 Marks',
    gradingScale: 'A*-U',
    isModularUms: false,
    maxTotalRaw: 160,
    papers: [
      {
        id: '0620-p2',
        code: 'Paper 22',
        title: 'Multiple Choice (Extended)',
        maxRaw: 40,
        weightLabel: '30% Weight',
        defaultRaw: 35,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 21, gradeA: 29, topGrade: 34 },
          'jan-2025': { passC: 20, gradeA: 28, topGrade: 33 },
          'on-2024': { passC: 22, gradeA: 30, topGrade: 35 },
        },
      },
      {
        id: '0620-p4',
        code: 'Paper 42',
        title: 'Theory (Extended)',
        maxRaw: 80,
        weightLabel: '50% Weight',
        defaultRaw: 66,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 37, gradeA: 53, topGrade: 63 },
          'jan-2025': { passC: 36, gradeA: 51, topGrade: 61 },
          'on-2024': { passC: 39, gradeA: 55, topGrade: 65 },
        },
      },
      {
        id: '0620-p6',
        code: 'Paper 62',
        title: 'Alternative to Practical',
        maxRaw: 40,
        weightLabel: '20% Weight',
        defaultRaw: 34,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 21, gradeA: 29, topGrade: 34 },
          'jan-2025': { passC: 20, gradeA: 28, topGrade: 33 },
          'on-2024': { passC: 22, gradeA: 30, topGrade: 35 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 131 },
        { grade: 'A', minScore: 112 },
        { grade: 'B', minScore: 95 },
        { grade: 'C', minScore: 79 },
        { grade: 'D', minScore: 63 },
        { grade: 'E', minScore: 49 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 128 },
        { grade: 'A', minScore: 109 },
        { grade: 'B', minScore: 92 },
        { grade: 'C', minScore: 76 },
        { grade: 'D', minScore: 61 },
        { grade: 'E', minScore: 47 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 134 },
        { grade: 'A', minScore: 115 },
        { grade: 'B', minScore: 98 },
        { grade: 'C', minScore: 81 },
        { grade: 'D', minScore: 65 },
        { grade: 'E', minScore: 51 },
      ],
    },
  },

  // =========================================================================
  // BOARD 4: PEARSON EDEXCEL INTERNATIONAL GCSE (edexcel-igcse)
  // =========================================================================
  {
    id: 'edexcel-igcse-maths-4ma1',
    boardId: 'edexcel-igcse',
    code: '4MA1',
    title: 'International GCSE Mathematics A (Higher)',
    levelLabel: '2 Papers · 200 Marks',
    gradingScale: '9-1',
    isModularUms: false,
    maxTotalRaw: 200,
    papers: [
      {
        id: '4ma1-1h',
        code: 'Paper 1H',
        title: 'Higher Tier Calculator Paper 1H',
        maxRaw: 100,
        weightLabel: '50% Weight',
        defaultRaw: 84,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 68, topGrade: 83 },
          'jan-2025': { passC: 38, gradeA: 66, topGrade: 81 },
          'on-2024': { passC: 40, gradeA: 70, topGrade: 85 },
        },
      },
      {
        id: '4ma1-2h',
        code: 'Paper 2H',
        title: 'Higher Tier Calculator Paper 2H',
        maxRaw: 100,
        weightLabel: '50% Weight',
        defaultRaw: 86,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 39, gradeA: 68, topGrade: 83 },
          'jan-2025': { passC: 38, gradeA: 66, topGrade: 81 },
          'on-2024': { passC: 40, gradeA: 70, topGrade: 85 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: '9', minScore: 165 },
        { grade: '8', minScore: 142 },
        { grade: '7', minScore: 120 },
        { grade: '6', minScore: 98 },
        { grade: '5', minScore: 76 },
        { grade: '4', minScore: 55 },
      ],
      'jan-2025': [
        { grade: '9', minScore: 162 },
        { grade: '8', minScore: 139 },
        { grade: '7', minScore: 117 },
        { grade: '6', minScore: 95 },
        { grade: '5', minScore: 74 },
        { grade: '4', minScore: 53 },
      ],
      'on-2024': [
        { grade: '9', minScore: 169 },
        { grade: '8', minScore: 146 },
        { grade: '7', minScore: 124 },
        { grade: '6', minScore: 101 },
        { grade: '5', minScore: 79 },
        { grade: '4', minScore: 57 },
      ],
    },
  },
  {
    id: 'edexcel-igcse-fpm-4pm1',
    boardId: 'edexcel-igcse',
    code: '4PM1',
    title: 'International GCSE Further Pure Mathematics',
    levelLabel: '2 Papers · 200 Marks',
    gradingScale: '9-1',
    isModularUms: false,
    maxTotalRaw: 200,
    papers: [
      {
        id: '4pm1-p1',
        code: 'Paper 1',
        title: 'Further Pure Mathematics Paper 1',
        maxRaw: 100,
        weightLabel: '50% Weight',
        defaultRaw: 82,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 42, gradeA: 69, topGrade: 84 },
          'jan-2025': { passC: 40, gradeA: 67, topGrade: 82 },
          'on-2024': { passC: 43, gradeA: 71, topGrade: 86 },
        },
      },
      {
        id: '4pm1-p2',
        code: 'Paper 2',
        title: 'Further Pure Mathematics Paper 2',
        maxRaw: 100,
        weightLabel: '50% Weight',
        defaultRaw: 85,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 42, gradeA: 69, topGrade: 84 },
          'jan-2025': { passC: 40, gradeA: 67, topGrade: 82 },
          'on-2024': { passC: 43, gradeA: 71, topGrade: 86 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: '9', minScore: 168 },
        { grade: '8', minScore: 146 },
        { grade: '7', minScore: 124 },
        { grade: '6', minScore: 102 },
        { grade: '5', minScore: 80 },
        { grade: '4', minScore: 58 },
      ],
      'jan-2025': [
        { grade: '9', minScore: 164 },
        { grade: '8', minScore: 142 },
        { grade: '7', minScore: 120 },
        { grade: '6', minScore: 98 },
        { grade: '5', minScore: 77 },
        { grade: '4', minScore: 55 },
      ],
      'on-2024': [
        { grade: '9', minScore: 171 },
        { grade: '8', minScore: 149 },
        { grade: '7', minScore: 127 },
        { grade: '6', minScore: 105 },
        { grade: '5', minScore: 83 },
        { grade: '4', minScore: 60 },
      ],
    },
  },
  {
    id: 'edexcel-igcse-physics-4ph1',
    boardId: 'edexcel-igcse',
    code: '4PH1',
    title: 'International GCSE Physics (9–1)',
    levelLabel: '2 Papers · 180 Marks',
    gradingScale: '9-1',
    isModularUms: false,
    maxTotalRaw: 180,
    papers: [
      {
        id: '4ph1-1p',
        code: 'Paper 1P',
        title: 'Physics Paper 1P (Core & Higher)',
        maxRaw: 110,
        weightLabel: '61% Weight',
        defaultRaw: 90,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 46, gradeA: 74, topGrade: 89 },
          'jan-2025': { passC: 45, gradeA: 72, topGrade: 87 },
          'on-2024': { passC: 47, gradeA: 76, topGrade: 91 },
        },
      },
      {
        id: '4ph1-2p',
        code: 'Paper 2P',
        title: 'Physics Paper 2P (Higher Extension)',
        maxRaw: 70,
        weightLabel: '39% Weight',
        defaultRaw: 58,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 30, gradeA: 48, topGrade: 57 },
          'jan-2025': { passC: 29, gradeA: 47, topGrade: 56 },
          'on-2024': { passC: 31, gradeA: 49, topGrade: 58 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: '9', minScore: 146 },
        { grade: '8', minScore: 128 },
        { grade: '7', minScore: 110 },
        { grade: '6', minScore: 92 },
        { grade: '5', minScore: 74 },
        { grade: '4', minScore: 56 },
      ],
      'jan-2025': [
        { grade: '9', minScore: 143 },
        { grade: '8', minScore: 125 },
        { grade: '7', minScore: 107 },
        { grade: '6', minScore: 89 },
        { grade: '5', minScore: 71 },
        { grade: '4', minScore: 54 },
      ],
      'on-2024': [
        { grade: '9', minScore: 149 },
        { grade: '8', minScore: 131 },
        { grade: '7', minScore: 113 },
        { grade: '6', minScore: 95 },
        { grade: '5', minScore: 77 },
        { grade: '4', minScore: 58 },
      ],
    },
  },
  {
    id: 'edexcel-igcse-chemistry-4ch1',
    boardId: 'edexcel-igcse',
    code: '4CH1',
    title: 'International GCSE Chemistry (9–1)',
    levelLabel: '2 Papers · 180 Marks',
    gradingScale: '9-1',
    isModularUms: false,
    maxTotalRaw: 180,
    papers: [
      {
        id: '4ch1-1c',
        code: 'Paper 1C',
        title: 'Chemistry Paper 1C (Core & Higher)',
        maxRaw: 110,
        weightLabel: '61% Weight',
        defaultRaw: 92,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 48, gradeA: 76, topGrade: 91 },
          'jan-2025': { passC: 47, gradeA: 74, topGrade: 89 },
          'on-2024': { passC: 49, gradeA: 78, topGrade: 93 },
        },
      },
      {
        id: '4ch1-2c',
        code: 'Paper 2C',
        title: 'Chemistry Paper 2C (Higher Extension)',
        maxRaw: 70,
        weightLabel: '39% Weight',
        defaultRaw: 59,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 31, gradeA: 49, topGrade: 58 },
          'jan-2025': { passC: 30, gradeA: 48, topGrade: 57 },
          'on-2024': { passC: 32, gradeA: 50, topGrade: 59 },
        },
      },
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: '9', minScore: 149 },
        { grade: '8', minScore: 131 },
        { grade: '7', minScore: 113 },
        { grade: '6', minScore: 95 },
        { grade: '5', minScore: 77 },
        { grade: '4', minScore: 58 },
      ],
      'jan-2025': [
        { grade: '9', minScore: 146 },
        { grade: '8', minScore: 128 },
        { grade: '7', minScore: 110 },
        { grade: '6', minScore: 92 },
        { grade: '5', minScore: 74 },
        { grade: '4', minScore: 56 },
      ],
      'on-2024': [
        { grade: '9', minScore: 152 },
        { grade: '8', minScore: 134 },
        { grade: '7', minScore: 116 },
        { grade: '6', minScore: 98 },
        { grade: '5', minScore: 80 },
        { grade: '4', minScore: 60 },
      ],
    },
  },
];
