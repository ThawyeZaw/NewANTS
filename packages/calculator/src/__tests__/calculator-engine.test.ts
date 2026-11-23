import { describe, expect, it } from 'vitest';
import {
  AS_ALLOWED_GRADES,
  CORE_ALLOWED_GRADES,
  FOUNDATION_ALLOWED_GRADES,
  PEARSON_UMS_CONVERTER_URL,
  buildEdexcelIgcseUmsBoundaries,
  calculateEdexcelMathsSuite,
  calculatePaperFromDirectUms,
  calculatePaperGrade,
  calculateRouteGrade,
  calculateSubjectGrade,
  deriveUnitGradeFromUms,
  expandLegacyPaperCutoffs,
  isDirectUmsOnlySubject,
  summarizeThresholdsToLegacyCutoffs,
  supportsDirectUms,
  type EngineSubjectInput,
} from '../engine';
import { GradeCalculatorContainer } from '../index';
import { MOCK_CALCULATOR_SUBJECTS } from '../mocks/calculator.mock';

describe('@ants/calculator [THAW-2.1] Pure Grade & UMS Engine', () => {
  it('exports GradeCalculatorContainer for app wiring', () => {
    expect(GradeCalculatorContainer).toBeDefined();
  });

  it('expands legacy 3-cutoff bounds and summarizes full thresholds symmetrically', () => {
    const expandedA = expandLegacyPaperCutoffs(
      { passC: 41, gradeA: 55, topGrade: 63 },
      'A*-U'
    );
    expect(expandedA).toEqual({
      'A*': 63,
      A: 55,
      B: 48,
      C: 41,
      D: 33,
      E: 27,
    });
    expect(summarizeThresholdsToLegacyCutoffs(expandedA, 'A*-U', 75)).toEqual({
      topGrade: 63,
      gradeA: 55,
      passC: 41,
    });

    const expanded9 = expandLegacyPaperCutoffs(
      { passC: 39, gradeA: 68, topGrade: 83 },
      '9-1'
    );
    expect(expanded9['9']).toBe(83);
    expect(expanded9['7']).toBe(68);
    expect(expanded9['5']).toBe(39);
    expect(summarizeThresholdsToLegacyCutoffs(expanded9, '9-1', 100)).toEqual({
      topGrade: 83,
      gradeA: 68,
      passC: 39,
    });
  });

  it('interpolates piecewise-linear UMS and clamps out-of-range or NaN raw inputs', () => {
    const ialMaths = MOCK_CALCULATOR_SUBJECTS.find((s) => s.id === 'edexcel-ial-maths')!;
    const p1 = ialMaths.papers[0]!;

    expect(calculatePaperGrade(0, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      raw: 0,
      ums: 0,
      paperGrade: 'U',
      pct: 0,
    });
    expect(calculatePaperGrade(Number.NaN, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      raw: 0,
      ums: 0,
      paperGrade: 'U',
    });
    expect(calculatePaperGrade(-10, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      raw: 0,
      ums: 0,
      paperGrade: 'U',
    });
    expect(calculatePaperGrade(999, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      raw: 75,
      ums: 100,
      paperGrade: 'A*',
      pct: 100,
    });
    // Exact thresholds map to canonical UMS anchors (A*=90, A=80, C=60, E=40)
    expect(calculatePaperGrade(63, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      ums: 90,
      paperGrade: 'A*',
    });
    expect(calculatePaperGrade(55, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      ums: 80,
      paperGrade: 'A',
    });
    expect(calculatePaperGrade(41, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      ums: 60,
      paperGrade: 'C',
    });
    expect(calculatePaperGrade(27, p1, 'mj-2025', 'A*-U', true)).toMatchObject({
      ums: 40,
      paperGrade: 'E',
    });
  });

  it('enforces Edexcel IAL A* rule (480 total UMS + 180 A2 UMS for YMA01 Maths)', () => {
    const mockMaths = MOCK_CALCULATOR_SUBJECTS.find((s) => s.id === 'edexcel-ial-maths')!;
    const d1Maths: EngineSubjectInput = {
      ...mockMaths,
      aStarRule: {
        minTotalUms: 480,
        minA2Ums: 180,
        a2PaperCodes: ['WMA13', 'WMA14'],
      },
      seriesBoundaries: {
        'mj-2025': [
          { grade: 'A*', minScore: 480 },
          { grade: 'A', minScore: 480 },
          { grade: 'B', minScore: 420 },
          { grade: 'C', minScore: 360 },
          { grade: 'D', minScore: 300 },
          { grade: 'E', minScore: 240 },
        ],
      },
    };

    // High AS/applied marks (400 UMS) + weak A2 marks (P3=50 -> ~73 UMS, P4=50 -> ~74 UMS => 147 A2 UMS)
    // Total UMS >= 480, but A2 UMS < 180 -> capped at Grade A!
    const cappedAtA = calculateSubjectGrade(d1Maths, 'mj-2025', {
      WMA11: 75,
      WMA12: 75,
      WME01: 75,
      WST01: 75,
      WMA13: 50,
      WMA14: 50,
    });
    expect(cappedAtA.totalUms).toBeGreaterThanOrEqual(480);
    expect(cappedAtA.finalGrade).toBe('A');
    expect(cappedAtA.aStarRuleStatus?.met).toBe(false);
    expect(cappedAtA.aStarRuleStatus?.actualA2Ums).toBeLessThan(180);
    expect(cappedAtA.nextBoundary?.grade).toBe('A*');
    expect(cappedAtA.nextBoundary?.a2UmsNeeded).toBeGreaterThan(0);

    // Total UMS >= 480 AND P3+P4 >= 180 -> awards A*
    const achievedAStar = calculateSubjectGrade(d1Maths, 'mj-2025', {
      WMA11: 60,
      WMA12: 60,
      WME01: 60,
      WST01: 60,
      WMA13: 64,
      WMA14: 63,
    });
    expect(achievedAStar.totalUms).toBeGreaterThanOrEqual(480);
    expect(achievedAStar.aStarRuleStatus?.actualA2Ums).toBeGreaterThanOrEqual(180);
    expect(achievedAStar.aStarRuleStatus?.met).toBe(true);
    expect(achievedAStar.finalGrade).toBe('A*');
    expect(achievedAStar.nextBoundary).toBeNull();
  });

  it('enforces Edexcel IAL A* rule for 600-UMS Sciences (270 A2) & Further Maths (best 3 of 4 A2)', () => {
    const mockPhysics = MOCK_CALCULATOR_SUBJECTS.find((s) => s.id === 'edexcel-ial-physics')!;
    const d1Physics: EngineSubjectInput = {
      ...mockPhysics,
      aStarRule: {
        minTotalUms: 480,
        minA2Ums: 270,
        a2PaperCodes: ['WPH14', 'WPH15', 'WPH16'],
      },
      seriesBoundaries: {
        'mj-2025': [
          { grade: 'A*', minScore: 480 },
          { grade: 'A', minScore: 480 },
          { grade: 'B', minScore: 420 },
          { grade: 'C', minScore: 360 },
          { grade: 'D', minScore: 300 },
          { grade: 'E', minScore: 240 },
        ],
      },
    };

    const scienceCap = calculateSubjectGrade(d1Physics, 'mj-2025', {
      WPH11: 80, // 120 UMS
      WPH12: 80, // 120 UMS
      WPH13: 50, // 60 UMS => 300 AS UMS
      WPH14: 65, // 96 UMS
      WPH15: 64, // 96 UMS
      WPH16: 36, // 48 UMS => 240 A2 UMS (< 270)
    });
    expect(scienceCap.totalUms).toBeGreaterThanOrEqual(480);
    expect(scienceCap.aStarRuleStatus?.actualA2Ums).toBeLessThan(270);
    expect(scienceCap.finalGrade).toBe('A');

    const mockFMaths = MOCK_CALCULATOR_SUBJECTS.find((s) => s.id === 'edexcel-ial-fmaths')!;
    const d1FMaths: EngineSubjectInput = {
      ...mockFMaths,
      aStarRule: {
        minTotalUms: 480,
        minA2Ums: 270,
        a2PaperCodes: ['WFM02', 'WFM03', 'WME02', 'WST02'],
        countBestA2Units: 3,
      },
      seriesBoundaries: {
        'mj-2025': [
          { grade: 'A*', minScore: 480 },
          { grade: 'A', minScore: 480 },
          { grade: 'B', minScore: 420 },
          { grade: 'C', minScore: 360 },
          { grade: 'D', minScore: 300 },
          { grade: 'E', minScore: 240 },
        ],
      },
    };

    // Best 3 of 4 A2 units >= 270 -> A* even if 4th A2 unit is weaker
    const fmResult = calculateSubjectGrade(d1FMaths, 'mj-2025', {
      WFM01: 60, // ~86 UMS
      WDM11: 60, // ~85 UMS
      WFM02: 65, // ~92 UMS
      WFM03: 65, // ~92 UMS
      WME02: 63, // ~91 UMS (top 3 = 275 >= 270)
      WST02: 45, // ~68 UMS
    });
    expect(fmResult.aStarRuleStatus?.maxA2Ums).toBe(300);
    expect(fmResult.aStarRuleStatus?.actualA2Ums).toBeGreaterThanOrEqual(270);
    expect(fmResult.totalUms).toBeGreaterThanOrEqual(480);
    expect(fmResult.finalGrade).toBe('A*');
  });

  it('computes linear Cambridge A-Level, Cambridge IGCSE, and Edexcel IGCSE (9-1) grades', () => {
    const caieMaths = MOCK_CALCULATOR_SUBJECTS.find((s) => s.id === 'caie-alevel-maths-9709')!;
    const caieRes = calculateSubjectGrade(caieMaths, 'mj-2025', {
      '9709-p1': 65,
      '9709-p3': 62,
      '9709-p4': 43,
      '9709-p5': 44,
    });
    expect(caieRes.metricUnit).toBe('marks');
    expect(caieRes.totalRaw).toBe(214);
    expect(caieRes.finalGrade).toBe('A'); // A* is 215 in mj-2025
    expect(caieRes.nextBoundary).toEqual({
      grade: 'A*',
      needed: 1,
      minScore: 215,
    });

    const edexcelIgcseMaths = MOCK_CALCULATOR_SUBJECTS.find(
      (s) => s.id === 'edexcel-igcse-maths-4ma1'
    )!;
    const igcseRes = calculateSubjectGrade(edexcelIgcseMaths, 'mj-2025', {
      'Paper 1H': 85,
      'Paper 2H': 86,
    });
    expect(igcseRes.totalRaw).toBe(171);
    expect(igcseRes.finalGrade).toBe('9');
    expect(igcseRes.bufferAboveTop).toBe(6);
  });

  it('evaluates weighted CAIE IGCSE routes, seriesMaxRaw overrides, Core/Foundation ceilings & variant boundaries', () => {
    const physics0625: EngineSubjectInput = {
      id: 'caie-igcse-physics-0625',
      boardId: 'caie-igcse',
      code: '0625',
      title: 'Cambridge IGCSE Physics',
      levelLabel: 'IGCSE · Extended & Core',
      gradingScale: 'A*-U',
      isModularUms: false,
      maxTotalRaw: 200,
      defaultRouteId: 'ext-v2-p6',
      papers: [
        {
          id: 'p1',
          code: 'Paper 1',
          title: 'Core MCQ',
          maxRaw: 40,
          weightLabel: '×1.5',
          defaultRaw: 30,
          level: 'CORE',
          seriesPaperCutoffs: { 'mj-2025': { passC: 25, gradeA: 32, topGrade: 36 } },
        },
        {
          id: 'p2',
          code: 'Paper 2',
          title: 'Extended MCQ',
          maxRaw: 40,
          weightLabel: '×1.5',
          defaultRaw: 34,
          level: 'EXTENDED',
          seriesPaperCutoffs: { 'mj-2025': { passC: 24, gradeA: 31, topGrade: 35 } },
        },
        {
          id: 'p3',
          code: 'Paper 3',
          title: 'Core Theory',
          maxRaw: 80,
          weightLabel: '×1.25',
          defaultRaw: 52,
          level: 'CORE',
          seriesPaperCutoffs: { 'mj-2025': { passC: 44, gradeA: 56, topGrade: 65 } },
        },
        {
          id: 'p4',
          code: 'Paper 4',
          title: 'Extended Theory',
          maxRaw: 80,
          weightLabel: '×1.25',
          defaultRaw: 62,
          level: 'EXTENDED',
          seriesPaperCutoffs: { 'mj-2025': { passC: 41, gradeA: 54, topGrade: 63 } },
        },
        {
          id: 'p6',
          code: 'Paper 6',
          title: 'Alternative to Practical',
          maxRaw: 40,
          weightLabel: '×1.0',
          defaultRaw: 32,
          seriesPaperCutoffs: { 'mj-2025': { passC: 22, gradeA: 29, topGrade: 34 } },
        },
      ],
      routes: [
        {
          id: 'ext-v2-p6',
          label: 'Extended · V2 · ATP (P2+P4+P6)',
          awardLevel: 'IGCSE',
          tier: 'Extended',
          variant: 'V2',
          pathwayLabel: 'ATP (P6)',
          paperIds: ['p2', 'p4', 'p6'],
          paperWeights: { p2: 1.5, p4: 1.25, p6: 1.0 },
          maxTotalScore: 200,
          isModularUms: false,
          gradingScale: 'A*-U',
          seriesBoundaries: {
            'mj-2025': [
              { grade: 'A*', minScore: 152 },
              { grade: 'A', minScore: 130 },
              { grade: 'B', minScore: 108 },
              { grade: 'C', minScore: 86 },
              { grade: 'D', minScore: 71 },
              { grade: 'E', minScore: 57 },
              { grade: 'F', minScore: 43 },
              { grade: 'G', minScore: 29 },
            ],
          },
        },
        {
          id: 'core-v2-p6',
          label: 'Core · V2 · ATP (P1+P3+P6)',
          awardLevel: 'IGCSE',
          tier: 'Core',
          variant: 'V2',
          pathwayLabel: 'ATP (P6)',
          paperIds: ['p1', 'p3', 'p6'],
          paperWeights: { p1: 1.5, p3: 1.25, p6: 1.0 },
          maxTotalScore: 200,
          isModularUms: false,
          gradingScale: 'A*-U',
          allowedGrades: [...CORE_ALLOWED_GRADES],
          seriesBoundaries: {
            'mj-2025': [
              { grade: 'C', minScore: 118 },
              { grade: 'D', minScore: 98 },
              { grade: 'E', minScore: 78 },
              { grade: 'F', minScore: 59 },
              { grade: 'G', minScore: 40 },
            ],
          },
        },
      ],
      seriesBoundaries: {},
    };

    // Weighted check: 35*1.5 (52.5) + 60*1.25 (75) + 25*1.0 (25) = 152.5 -> rounds to 153 -> A*
    const extRes = calculateRouteGrade(physics0625, physics0625.routes![0]!, 'mj-2025', {
      p2: 35,
      p4: 60,
      p6: 25,
    });
    expect(extRes.unweightedTotalRaw).toBe(120);
    expect(extRes.unweightedMaxTotalRaw).toBe(160);
    expect(extRes.metricScore).toBe(153);
    expect(extRes.metricMax).toBe(200);
    expect(extRes.finalGrade).toBe('A*');

    // Core check: full marks (40, 80, 40 => 200) must still cap at Grade C
    const coreRes = calculateRouteGrade(physics0625, physics0625.routes![1]!, 'mj-2025', {
      p1: 40,
      p3: 80,
      p6: 40,
    });
    expect(coreRes.finalGrade).toBe('C');
    expect(coreRes.paperResults.every((p) => ['C', 'D', 'E', 'F', 'G', 'U'].includes(p.paperGrade))).toBe(true);

    // seriesMaxRaw check (CAIE 0580 pre-2025 P2 /70 vs 2025+ P2 /100) + Edexcel 4MA1 Foundation & R variant
    const maths0580: EngineSubjectInput = {
      id: 'caie-igcse-maths-0580',
      boardId: 'caie-igcse',
      code: '0580',
      title: 'Cambridge IGCSE Mathematics',
      levelLabel: 'IGCSE',
      gradingScale: 'A*-U',
      isModularUms: false,
      maxTotalRaw: 200,
      papers: [
        {
          id: 'p2',
          code: 'Paper 2',
          title: 'Extended P2',
          maxRaw: 100,
          seriesMaxRaw: { 'on-2024': 70, 'mj-2025': 100 },
          weightLabel: '50%',
          defaultRaw: 85,
          seriesPaperCutoffs: { 'mj-2025': { passC: 50, gradeA: 74, topGrade: 88 } },
        },
        {
          id: 'p4',
          code: 'Paper 4',
          title: 'Extended P4',
          maxRaw: 100,
          seriesMaxRaw: { 'on-2024': 130, 'mj-2025': 100 },
          weightLabel: '50%',
          defaultRaw: 85,
          seriesPaperCutoffs: { 'mj-2025': { passC: 50, gradeA: 74, topGrade: 88 } },
        },
      ],
      routes: [
        {
          id: 'ext-v2',
          label: 'Extended V2',
          awardLevel: 'IGCSE',
          tier: 'Extended',
          variant: 'V2',
          paperIds: ['p2', 'p4'],
          maxTotalScore: 200,
          isModularUms: false,
          gradingScale: 'A*-U',
          seriesBoundaries: {
            'on-2024': [{ grade: 'A*', minScore: 175 }],
            'mj-2025': [{ grade: 'A*', minScore: 176 }],
          },
        },
      ],
      seriesBoundaries: {},
    };

    const pre2025 = calculateRouteGrade(maths0580, maths0580.routes![0]!, 'on-2024', {
      p2: 65,
      p4: 125,
    });
    expect(pre2025.paperResults[0]?.effectiveMaxRaw).toBe(70);
    expect(pre2025.paperResults[1]?.effectiveMaxRaw).toBe(130);
    expect(pre2025.totalRaw).toBe(190);
    expect(pre2025.finalGrade).toBe('A*');

    // Foundation 9-1 cap & Regional R variant
    const edexcel4ma1: EngineSubjectInput = {
      id: 'edexcel-igcse-4ma1',
      boardId: 'edexcel-igcse',
      code: '4MA1',
      title: 'Edexcel IGCSE Mathematics A',
      levelLabel: 'IGCSE (9–1)',
      gradingScale: '9-1',
      isModularUms: false,
      maxTotalRaw: 200,
      papers: [
        {
          id: '1f',
          code: '1F',
          title: 'Foundation Paper 1',
          maxRaw: 100,
          weightLabel: '50%',
          defaultRaw: 70,
          seriesPaperCutoffs: {},
          seriesThresholdsByVariant: {
            Standard: { 'mj-2025': { '5': 68, '4': 54, '3': 38, '2': 24, '1': 11 } },
            R: { 'mj-2025': { '5': 64, '4': 50, '3': 35, '2': 22, '1': 10 } },
          },
        },
        {
          id: '2f',
          code: '2F',
          title: 'Foundation Paper 2',
          maxRaw: 100,
          weightLabel: '50%',
          defaultRaw: 70,
          seriesPaperCutoffs: {},
          seriesThresholdsByVariant: {
            Standard: { 'mj-2025': { '5': 68, '4': 54, '3': 38, '2': 24, '1': 11 } },
            R: { 'mj-2025': { '5': 64, '4': 50, '3': 35, '2': 22, '1': 10 } },
          },
        },
      ],
      routes: [
        {
          id: 'fnd-r',
          label: 'Foundation (R)',
          awardLevel: 'IGCSE',
          tier: 'Foundation',
          variant: 'R',
          paperIds: ['1f', '2f'],
          maxTotalScore: 200,
          isModularUms: false,
          gradingScale: '9-1',
          allowedGrades: [...FOUNDATION_ALLOWED_GRADES],
          seriesBoundaries: {
            'mj-2025': [
              { grade: '5', minScore: 128 },
              { grade: '4', minScore: 100 },
              { grade: '3', minScore: 70 },
              { grade: '2', minScore: 44 },
              { grade: '1', minScore: 20 },
            ],
          },
        },
      ],
      seriesBoundaries: {},
    };
    const fndRes = calculateRouteGrade(edexcel4ma1, edexcel4ma1.routes![0]!, 'mj-2025', {
      '1f': 65,
      '2f': 65,
    });
    expect(fndRes.paperResults[0]?.paperGrade).toBe('5'); // 65 >= 64 in R variant (would be 4 in Standard)
    expect(fndRes.finalGrade).toBe('5');
  });

  it('enforces Edexcel IAL 400-UMS A* rules, AS ceiling, Accounting 300-UMS units & per-unit sessions', () => {
    const econSubject: EngineSubjectInput = {
      id: 'edexcel-ial-economics',
      boardId: 'edexcel-ial',
      code: 'YEC11',
      asAwardCode: 'XEC11',
      aLevelAwardCode: 'YEC11',
      title: 'IAL Economics',
      levelLabel: 'AS XEC11 (200 UMS) · IAL YEC11 (400 UMS)',
      gradingScale: 'A*-U',
      isModularUms: true,
      maxTotalRaw: 320,
      maxTotalUms: 400,
      papers: ['WEC11', 'WEC12', 'WEC13', 'WEC14'].map((code, idx) => ({
        id: code.toLowerCase(),
        code,
        unitCode: code,
        title: `Unit ${idx + 1}`,
        maxRaw: 80,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 62,
        level: idx < 2 ? 'AS' : 'A2',
        seriesPaperCutoffs: {},
        seriesThresholds: {
          'mj-2025': { A: 58, B: 51, C: 44, D: 37, E: 30 },
          'jan-2025': { A: 54, B: 47, C: 40, D: 33, E: 26 },
        },
      })),
      routes: [
        {
          id: 'XEC11',
          label: 'International AS (XEC11 · U1–U2)',
          awardLevel: 'AS',
          cashInCode: 'XEC11',
          paperIds: ['wec11', 'wec12'],
          maxTotalScore: 200,
          isModularUms: true,
          gradingScale: 'A*-U',
          allowedGrades: [...AS_ALLOWED_GRADES],
          seriesBoundaries: {
            'mj-2025': [
              { grade: 'A', minScore: 160 },
              { grade: 'B', minScore: 140 },
              { grade: 'C', minScore: 120 },
              { grade: 'D', minScore: 100 },
              { grade: 'E', minScore: 80 },
            ],
          },
        },
        {
          id: 'YEC11',
          label: 'Full IAL (YEC11 · U1–U4)',
          awardLevel: 'IAL',
          cashInCode: 'YEC11',
          paperIds: ['wec11', 'wec12', 'wec13', 'wec14'],
          maxTotalScore: 400,
          isModularUms: true,
          gradingScale: 'A*-U',
          aStarRule: {
            minTotalUms: 320,
            minA2Ums: 180,
            a2PaperCodes: ['WEC13', 'WEC14'],
          },
          seriesBoundaries: {
            'mj-2025': [
              { grade: 'A*', minScore: 320 },
              { grade: 'A', minScore: 320 },
              { grade: 'B', minScore: 280 },
              { grade: 'C', minScore: 240 },
              { grade: 'D', minScore: 200 },
              { grade: 'E', minScore: 160 },
            ],
          },
        },
      ],
      seriesBoundaries: {},
    };

    // AS route caps at Grade A even with 200/200 UMS
    const asRes = calculateRouteGrade(econSubject, econSubject.routes![0]!, 'mj-2025', {
      WEC11: 80,
      WEC12: 80,
    });
    expect(asRes.totalUms).toBe(200);
    expect(asRes.finalGrade).toBe('A');
    expect(asRes.nextBoundary).toBeNull();

    // Mixed sessions: U1 sat in jan-2025 (54 raw => 80 UMS), U2 in mj-2025 (80 raw => 100 UMS),
    // U3/U4 in mj-2025 (69 raw => 90 UMS each = 180 A2 UMS) => 360 total >= 320 & 180 A2 >= 180 => A*
    const ialRes = calculateRouteGrade(
      econSubject,
      econSubject.routes![1]!,
      'mj-2025',
      { WEC11: 54, WEC12: 80, WEC13: 69, WEC14: 69 },
      { WEC11: 'jan-2025' }
    );
    expect(ialRes.paperResults[0]?.effectiveSeriesId).toBe('jan-2025');
    expect(ialRes.paperResults[0]?.ums).toBe(80);
    expect(ialRes.aStarRuleStatus?.met).toBe(true);
    expect(ialRes.finalGrade).toBe('A*');
  });

  it('optimizes simultaneous Edexcel IAL Maths + Further Maths allocations across 3u, 6u, 9u & 12u without overlap', () => {
    const suiteUnits = [
      'WMA11', 'WMA12', 'WMA13', 'WMA14',
      'WFM01', 'WFM02', 'WFM03',
      'WME01', 'WME02', 'WME03',
      'WST01', 'WST02', 'WST03',
      'WDM11',
    ];
    const suiteSubject: EngineSubjectInput = {
      id: 'edexcel-ial-maths',
      boardId: 'edexcel-ial',
      code: 'YMA01+YFM01',
      title: 'IAL Mathematics & Further Mathematics Suite',
      levelLabel: '14 Units',
      gradingScale: 'A*-U',
      isModularUms: true,
      calculatorMode: 'edexcel_maths_suite',
      maxTotalRaw: 1050,
      maxTotalUms: 1400,
      papers: suiteUnits.map((code) => ({
        id: code.toLowerCase(),
        code,
        unitCode: code,
        title: code,
        maxRaw: 75,
        maxUms: 100,
        weightLabel: '100 UMS',
        defaultRaw: 60,
        seriesPaperCutoffs: {
          'mj-2025': { passC: 40, gradeA: 55, topGrade: 65 },
          'jan-2025': { passC: 36, gradeA: 50, topGrade: 60 },
        },
      })),
      seriesBoundaries: {},
    };

    // 1. 3-unit AS Maths (XMA01) caps at A
    const threeUnit = calculateEdexcelMathsSuite({
      suiteSubject,
      selectedUnitCodes: ['WMA11', 'WMA12', 'WME01'],
      rawMarksByUnit: { WMA11: 75, WMA12: 75, WME01: 75 },
      defaultSeriesId: 'mj-2025',
    });
    expect(threeUnit.resolvedMode).toBe('XMA01');
    expect(threeUnit.mathsAward?.finalGrade).toBe('A');
    expect(threeUnit.furtherMathsAward).toBeNull();

    // 2. Invalid YMA01 applied pair (M1 + M3 is not official):
    //    auto falls back to valid XMA01 (leaving P3, P4, M3 unused), while explicit YMA01 reports incomplete
    const fallbackAs = calculateEdexcelMathsSuite({
      suiteSubject,
      selectedUnitCodes: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WME03'],
      rawMarksByUnit: { WMA11: 70, WMA12: 70, WMA13: 70, WMA14: 70, WME01: 70, WME03: 70 },
      defaultSeriesId: 'mj-2025',
    });
    expect(fallbackAs.resolvedMode).toBe('XMA01');
    expect(fallbackAs.unusedUnitCodes).toEqual(['WMA13', 'WMA14', 'WME03']);

    const explicitYma = calculateEdexcelMathsSuite({
      suiteSubject,
      selectedUnitCodes: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WME03'],
      rawMarksByUnit: { WMA11: 70, WMA12: 70, WMA13: 70, WMA14: 70, WME01: 70, WME03: 70 },
      defaultSeriesId: 'mj-2025',
      awardMode: 'YMA01',
    });
    expect(explicitYma.resolvedMode).toBe('incomplete');
    expect(explicitYma.missingGuidance.length).toBeGreaterThan(0);

    // 3. 9-unit suite (YMA01 + XFM01)
    const nineUnit = calculateEdexcelMathsSuite({
      suiteSubject,
      selectedUnitCodes: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01', 'WFM01', 'WFM02', 'WME02'],
      rawMarksByUnit: {
        WMA11: 70, WMA12: 70, WMA13: 68, WMA14: 68,
        WME01: 68, WST01: 68, WFM01: 68, WFM02: 68, WME02: 68,
      },
      defaultSeriesId: 'mj-2025',
    });
    expect(nineUnit.resolvedMode).toBe('YMA01+XFM01');
    expect(nineUnit.mathsAward?.finalGrade).toBe('A*');
    expect(nineUnit.furtherMathsAward?.cashInCode).toBe('XFM01');
    expect(nineUnit.furtherMathsAward?.finalGrade).toBe('A');

    // 4. 12-unit optimization: Student took M1, M2, S1, S2, D1, FP1, FP2, FP3 + P1..P4.
    // Suppose M2 is weak (50 raw -> 73 UMS), D1 is strong (70 -> 95 UMS),
    // FP2=70 (95), FP3=70 (95), S2=70 (95), M1=65 (90), S1=65 (90), P3=68, P4=68.
    // Plus test mixed per-unit session: WMA11 in jan-2025 at 50 raw (A=50 => 80 UMS!)
    const twelveUnit = calculateEdexcelMathsSuite({
      suiteSubject,
      selectedUnitCodes: [
        'WMA11', 'WMA12', 'WMA13', 'WMA14',
        'WFM01', 'WFM02', 'WFM03',
        'WME01', 'WME02', 'WST01', 'WST02', 'WDM11',
      ],
      rawMarksByUnit: {
        WMA11: 50, WMA12: 68, WMA13: 68, WMA14: 68,
        WFM01: 66, WFM02: 70, WFM03: 70,
        WME01: 65, WME02: 50, WST01: 65, WST02: 70, WDM11: 70,
      },
      seriesByUnit: { WMA11: 'jan-2025' },
      defaultSeriesId: 'mj-2025',
    });

    expect(twelveUnit.resolvedMode).toBe('YMA01+YFM01');
    expect(twelveUnit.mathsAward?.finalGrade).toBe('A*');
    expect(twelveUnit.furtherMathsAward?.finalGrade).toBe('A*');
    expect(twelveUnit.unusedUnitCodes).toHaveLength(0);

    // Verify disjoint partition (no unit counted twice)
    const mSet = new Set(twelveUnit.mathsAward!.unitCodes);
    const fmSet = new Set(twelveUnit.furtherMathsAward!.unitCodes);
    expect(mSet.size).toBe(6);
    expect(fmSet.size).toBe(6);
    for (const u of mSet) {
      expect(fmSet.has(u)).toBe(false);
    }

    // Verify jan-2025 session gave WMA11 80 UMS instead of mj-2025's 73 UMS
    const p1Eval = twelveUnit.unitResults.find((u) => u.unitCode === 'WMA11');
    expect(p1Eval?.seriesId).toBe('jan-2025');
    expect(p1Eval?.ums).toBe(80);

    // Direct UMS mode across 12 units (skipping raw conversion)
    const directSuite = calculateEdexcelMathsSuite({
      suiteSubject,
      selectedUnitCodes: [
        'WMA11', 'WMA12', 'WMA13', 'WMA14',
        'WFM01', 'WFM02', 'WFM03',
        'WME01', 'WME02', 'WST01', 'WST02', 'WDM11',
      ],
      inputMode: 'ums',
      umsMarksByUnit: {
        WMA11: 95, WMA12: 92, WMA13: 94, WMA14: 96,
        WFM01: 90, WFM02: 95, WFM03: 91,
        WME01: 88, WME02: 92, WST01: 86, WST02: 94, WDM11: 85,
      },
    });
    expect(directSuite.inputMode).toBe('ums');
    expect(directSuite.mathsAward?.finalGrade).toBe('A*');
    expect(directSuite.furtherMathsAward?.finalGrade).toBe('A*');
    expect(directSuite.mathsAward?.totalUms).toBe(551);
    expect(directSuite.furtherMathsAward?.totalUms).toBe(547);

    // Oct/Nov safety guard automatically avoids on-* on Further Maths units in raw mode
    const fmSafeFallback = calculateEdexcelMathsSuite({
      suiteSubject,
      selectedUnitCodes: ['WFM01', 'WFM02', 'WME02'],
      rawMarksByUnit: { WFM01: 70, WFM02: 70, WME02: 70 },
      defaultSeriesId: 'on-2025',
    });
    const fp1Eval = fmSafeFallback.unitResults.find((u) => u.unitCode === 'WFM01');
    expect(fp1Eval?.seriesId).toBe('mj-2025');
  });

  it('supports Direct UMS input on standard Edexcel IAL Physics (600 UMS), Accounting (300x2 UMS) & Economics (400 UMS)', () => {
    expect(deriveUnitGradeFromUms(108, 120, { allowAStar: true })).toBe('A*');
    expect(deriveUnitGradeFromUms(108, 120, { allowAStar: false })).toBe('A');
    expect(deriveUnitGradeFromUms(96, 120, { allowAStar: true })).toBe('A');
    expect(deriveUnitGradeFromUms(48, 120, { allowAStar: true })).toBe('E');
    expect(deriveUnitGradeFromUms(47, 120, { allowAStar: true })).toBe('U');

    const physicsSubject: EngineSubjectInput = {
      id: 'edexcel-ial-physics',
      boardId: 'edexcel-ial',
      code: 'YPH11',
      title: 'IAL Physics',
      levelLabel: '600 UMS',
      gradingScale: 'A*-U',
      isModularUms: true,
      maxTotalRaw: 440,
      maxTotalUms: 600,
      papers: [
        { id: 'wph11', code: 'WPH11', unitCode: 'WPH11', title: 'U1', maxRaw: 80, maxUms: 120, level: 'AS', weightLabel: '120 UMS', defaultRaw: 60, seriesPaperCutoffs: {} },
        { id: 'wph12', code: 'WPH12', unitCode: 'WPH12', title: 'U2', maxRaw: 80, maxUms: 120, level: 'AS', weightLabel: '120 UMS', defaultRaw: 60, seriesPaperCutoffs: {} },
        { id: 'wph13', code: 'WPH13', unitCode: 'WPH13', title: 'U3', maxRaw: 50, maxUms: 60, level: 'AS', weightLabel: '60 UMS', defaultRaw: 40, seriesPaperCutoffs: {} },
        { id: 'wph14', code: 'WPH14', unitCode: 'WPH14', title: 'U4', maxRaw: 90, maxUms: 120, level: 'A2', weightLabel: '120 UMS', defaultRaw: 70, seriesPaperCutoffs: {} },
        { id: 'wph15', code: 'WPH15', unitCode: 'WPH15', title: 'U5', maxRaw: 90, maxUms: 120, level: 'A2', weightLabel: '120 UMS', defaultRaw: 70, seriesPaperCutoffs: {} },
        { id: 'wph16', code: 'WPH16', unitCode: 'WPH16', title: 'U6', maxRaw: 50, maxUms: 60, level: 'A2', weightLabel: '60 UMS', defaultRaw: 40, seriesPaperCutoffs: {} },
      ],
      routes: [
        {
          id: 'YPH11',
          label: 'Full IAL (YPH11)',
          awardLevel: 'IAL',
          cashInCode: 'YPH11',
          paperIds: ['wph11', 'wph12', 'wph13', 'wph14', 'wph15', 'wph16'],
          maxTotalScore: 600,
          isModularUms: true,
          gradingScale: 'A*-U',
          aStarRule: { minTotalUms: 480, minA2Ums: 270, a2PaperCodes: ['WPH14', 'WPH15', 'WPH16'] },
          seriesBoundaries: {
            'mj-2025': [
              { grade: 'A*', minScore: 480 },
              { grade: 'A', minScore: 480 },
              { grade: 'B', minScore: 420 },
              { grade: 'C', minScore: 360 },
              { grade: 'D', minScore: 300 },
              { grade: 'E', minScore: 240 },
            ],
          },
        },
        {
          id: 'XPH11',
          label: 'AS (XPH11)',
          awardLevel: 'AS',
          cashInCode: 'XPH11',
          paperIds: ['wph11', 'wph12', 'wph13'],
          maxTotalScore: 300,
          isModularUms: true,
          gradingScale: 'A*-U',
          allowedGrades: [...AS_ALLOWED_GRADES],
          seriesBoundaries: {
            'mj-2025': [
              { grade: 'A', minScore: 240 },
              { grade: 'B', minScore: 210 },
              { grade: 'C', minScore: 180 },
              { grade: 'D', minScore: 150 },
              { grade: 'E', minScore: 120 },
            ],
          },
        },
      ],
      seriesBoundaries: {},
    };

    const singleUnit = calculatePaperFromDirectUms(112, physicsSubject.papers[3]!);
    expect(singleUnit.paperGrade).toBe('A*');
    expect(singleUnit.ums).toBe(112);

    // 520 total UMS with only 250 A2 UMS -> capped at A
    const physicsCapped = calculateRouteGrade(
      physicsSubject,
      physicsSubject.routes![0]!,
      'direct-ums',
      {},
      undefined,
      {
        inputMode: 'ums',
        umsMarksByPaper: { WPH11: 115, WPH12: 110, WPH13: 55, WPH14: 100, WPH15: 100, WPH16: 50 },
      }
    );
    expect(physicsCapped.inputMode).toBe('ums');
    expect(physicsCapped.totalUms).toBe(530);
    expect(physicsCapped.aStarRuleStatus?.actualA2Ums).toBe(250);
    expect(physicsCapped.finalGrade).toBe('A');

    // AS route in Direct UMS caps at A with 300/300
    const physicsAs = calculateRouteGrade(
      physicsSubject,
      physicsSubject.routes![1]!,
      'direct-ums',
      {},
      undefined,
      {
        inputMode: 'ums',
        umsMarksByPaper: { WPH11: 120, WPH12: 120, WPH13: 60 },
      }
    );
    expect(physicsAs.totalUms).toBe(300);
    expect(physicsAs.finalGrade).toBe('A');
  });

  it('supports Direct UMS for Edexcel IGCSE (9-1 Higher & Foundation) and flags UMS-only representative subjects', () => {
    expect(PEARSON_UMS_CONVERTER_URL).toContain('qualifications.pearson.com');
    expect(
      supportsDirectUms({ boardId: 'edexcel-igcse', isModularUms: false })
    ).toBe(true);
    expect(
      supportsDirectUms({ boardId: 'caie-igcse', isModularUms: false })
    ).toBe(false);
    expect(
      isDirectUmsOnlySubject({
        boardId: 'edexcel-ial',
        isModularUms: true,
        boundarySource: 'representative',
      })
    ).toBe(true);
    expect(
      isDirectUmsOnlySubject({
        boardId: 'caie-alevel',
        isModularUms: false,
        boundarySource: 'representative',
      })
    ).toBe(false);

    const igcseUmsBounds200 = buildEdexcelIgcseUmsBoundaries(200);
    expect(igcseUmsBounds200[0]).toEqual({ grade: '9', minScore: 180 });
    expect(igcseUmsBounds200[igcseUmsBounds200.length - 1]).toEqual({ grade: '1', minScore: 20 });

    const igcseBounds100 = buildEdexcelIgcseUmsBoundaries(100);
    expect(igcseBounds100[0]).toEqual({ grade: '9', minScore: 90 });

    const edexcelIgcse4ma1: EngineSubjectInput = {
      id: 'edexcel-igcse-maths-a-4ma1',
      boardId: 'edexcel-igcse',
      code: '4MA1',
      title: 'Mathematics A',
      levelLabel: 'IGCSE (9-1)',
      gradingScale: '9-1',
      isModularUms: false,
      boundarySource: 'official_d1',
      maxTotalRaw: 200,
      papers: [
        { id: '4ma1-1h', code: 'Paper 1H', title: '1H', maxRaw: 100, weightLabel: '50%', defaultRaw: 80, seriesPaperCutoffs: {} },
        { id: '4ma1-2h', code: 'Paper 2H', title: '2H', maxRaw: 100, weightLabel: '50%', defaultRaw: 80, seriesPaperCutoffs: {} },
        { id: '4ma1-1f', code: 'Paper 1F', title: '1F', maxRaw: 100, weightLabel: '50%', defaultRaw: 80, seriesPaperCutoffs: {} },
        { id: '4ma1-2f', code: 'Paper 2F', title: '2F', maxRaw: 100, weightLabel: '50%', defaultRaw: 80, seriesPaperCutoffs: {} },
      ],
      routes: [
        {
          id: 'higher-std',
          label: 'Higher (1H+2H)',
          awardLevel: 'IGCSE',
          tier: 'Higher',
          paperIds: ['4ma1-1h', '4ma1-2h'],
          maxTotalScore: 200,
          isModularUms: false,
          gradingScale: '9-1',
          allowedGrades: ['9', '8', '7', '6', '5', '4', '3', '2', '1'],
          seriesBoundaries: {},
        },
        {
          id: 'foundation-std',
          label: 'Foundation (1F+2F)',
          awardLevel: 'IGCSE',
          tier: 'Foundation',
          paperIds: ['4ma1-1f', '4ma1-2f'],
          maxTotalScore: 200,
          isModularUms: false,
          gradingScale: '9-1',
          allowedGrades: ['5', '4', '3', '2', '1'],
          seriesBoundaries: {},
        },
      ],
      seriesBoundaries: {},
    };

    const higherUms = calculateRouteGrade(
      edexcelIgcse4ma1,
      edexcelIgcse4ma1.routes![0]!,
      'direct-ums',
      {},
      undefined,
      {
        inputMode: 'ums',
        umsMarksByPaper: { '4ma1-1h': 92, '4ma1-2h': 90 },
      }
    );
    expect(higherUms.inputMode).toBe('ums');
    expect(higherUms.metricUnit).toBe('UMS');
    expect(higherUms.totalUms).toBe(182);
    expect(higherUms.maxTotalUms).toBe(200);
    expect(higherUms.finalGrade).toBe('9');
    expect(higherUms.paperResults[0]?.paperGrade).toBe('9');

    const foundationUms = calculateRouteGrade(
      edexcelIgcse4ma1,
      edexcelIgcse4ma1.routes![1]!,
      'direct-ums',
      {},
      undefined,
      {
        inputMode: 'ums',
        umsMarksByPaper: { '4ma1-1f': 95, '4ma1-2f': 95 },
      }
    );
    expect(foundationUms.totalUms).toBe(190);
    expect(foundationUms.finalGrade).toBe('5');
    expect(foundationUms.boundaries.map((b) => b.grade)).toEqual(['5', '4', '3', '2', '1']);
  });
});
