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
  { id: 'mj-2025', label: 'May / June 2025', tag: 'LATEST' },
  { id: 'jan-2025', label: 'January 2025', tag: 'WINTER' },
  { id: 'on-2024', label: 'Oct / Nov 2024', tag: 'AUTUMN' },
];

export const MOCK_CALCULATOR_SUBJECTS: CalculatorSubjectMock[] = [
  // 1. Pearson Edexcel IAL Modular Mathematics (WMA11-SET / YMA01)
  {
    id: 'edexcel-ial-maths',
    boardId: 'edexcel-ial',
    code: 'WMA11 / YMA01',
    title: 'IAL Mathematics (6-Unit Cash-In Suite)',
    levelLabel: 'Modular 600 UMS · P1–P4 + Applied',
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
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 480 },
        { grade: 'A', minScore: 480 }, // A* requires 480 UMS overall + 180 UMS on P3+P4; simplified threshold at 525 UMS for visual bar
        { grade: 'B', minScore: 420 },
        { grade: 'C', minScore: 360 },
        { grade: 'D', minScore: 300 },
        { grade: 'E', minScore: 240 },
      ].map((g) => (g.grade === 'A*' ? { grade: 'A*', minScore: 525 } : g)),
      'jan-2025': [
        { grade: 'A*', minScore: 520 },
        { grade: 'A', minScore: 480 },
        { grade: 'B', minScore: 420 },
        { grade: 'C', minScore: 360 },
        { grade: 'D', minScore: 300 },
        { grade: 'E', minScore: 240 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 528 },
        { grade: 'A', minScore: 480 },
        { grade: 'B', minScore: 420 },
        { grade: 'C', minScore: 360 },
        { grade: 'D', minScore: 300 },
        { grade: 'E', minScore: 240 },
      ],
    },
  },

  // 2. Pearson Edexcel IAL Physics (WPH11 / YPH11)
  {
    id: 'edexcel-ial-physics',
    boardId: 'edexcel-ial',
    code: 'WPH11 / YPH11',
    title: 'IAL Physics (Units 1–6 Modular)',
    levelLabel: 'Modular 600 UMS · Theory + Practical',
    gradingScale: 'A*-U',
    isModularUms: true,
    maxTotalRaw: 400,
    maxTotalUms: 600,
    papers: [
      {
        id: 'wph11',
        code: 'WPH11',
        title: 'Unit 1: Mechanics & Materials',
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
        id: 'wph12',
        code: 'WPH12',
        title: 'Unit 2: Waves & Electricity',
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
        id: 'wph13',
        code: 'WPH13',
        title: 'Unit 3: Practical Skills in Physics I',
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
        id: 'wph14',
        code: 'WPH14',
        title: 'Unit 4: Further Mechanics, Fields & Particles',
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
        id: 'wph15',
        code: 'WPH15',
        title: 'Unit 5: Thermodynamics, Radiation & Oscillations',
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
        id: 'wph16',
        code: 'WPH16',
        title: 'Unit 6: Practical Skills in Physics II',
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
    ],
    seriesBoundaries: {
      'mj-2025': [
        { grade: 'A*', minScore: 530 },
        { grade: 'A', minScore: 480 },
        { grade: 'B', minScore: 420 },
        { grade: 'C', minScore: 360 },
        { grade: 'D', minScore: 300 },
        { grade: 'E', minScore: 240 },
      ],
      'jan-2025': [
        { grade: 'A*', minScore: 525 },
        { grade: 'A', minScore: 480 },
        { grade: 'B', minScore: 420 },
        { grade: 'C', minScore: 360 },
        { grade: 'D', minScore: 300 },
        { grade: 'E', minScore: 240 },
      ],
      'on-2024': [
        { grade: 'A*', minScore: 534 },
        { grade: 'A', minScore: 480 },
        { grade: 'B', minScore: 420 },
        { grade: 'C', minScore: 360 },
        { grade: 'D', minScore: 300 },
        { grade: 'E', minScore: 240 },
      ],
    },
  },

  // 3. Cambridge International AS & A-Level Mathematics (9709)
  {
    id: 'caie-alevel-maths-9709',
    boardId: 'caie-alevel',
    code: '9709',
    title: 'AS & A-Level Mathematics (P1 + P3 + M1 + S1)',
    levelLabel: 'Linear Composite · 250 Raw Marks',
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

  // 4. Cambridge IGCSE Extended Mathematics (0580)
  {
    id: 'caie-igcse-maths-0580',
    boardId: 'caie-igcse',
    code: '0580',
    title: 'IGCSE Mathematics (Extended Tier)',
    levelLabel: 'Linear 200 Marks · Paper 2 + Paper 4',
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

  // 5. Pearson Edexcel International GCSE Mathematics A (4MA1 9–1)
  {
    id: 'edexcel-igcse-maths-4ma1',
    boardId: 'edexcel-igcse',
    code: '4MA1 (Higher)',
    title: 'International GCSE Mathematics A (9–1)',
    levelLabel: 'Linear 200 Marks · Paper 1H + Paper 2H',
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
];
