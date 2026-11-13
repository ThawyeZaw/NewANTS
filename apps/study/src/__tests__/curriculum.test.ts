import { describe, expect, it } from 'vitest';
import {
  EDEXCEL_YMA01_APPLIED_PAIRS,
  filterCurriculumSubjects,
  formatMathsSuiteSummary,
  isCompulsoryUnitForCashIn,
  isUnitAllowedInCashInPool,
  sanitizeStudyCurriculumState,
  sortMathsUnitsCanonical,
  toggleUnitInCashIn,
  validateMathsSuiteSelection,
} from '../lib/study/curriculum';
import {
  CURRICULUM_BOARDS,
  createDefaultStudyCurriculumState,
  EDEXCEL_MATHS_14_UNITS,
  EDEXCEL_MATHS_CASH_IN_AWARDS,
  MATHS_SUITE_PATHWAY_PRESETS,
  MOCK_CURRICULUM_SUBJECTS,
} from '../mocks/study-curriculum.mock';

describe('Study Curriculum Catalog & Edexcel Modular Maths Suite Rule Engine ([ZYY-4.2])', () => {
  it('defines 4 exam boards, 14 Edexcel Maths units, and 4 cash-in awards', () => {
    expect(CURRICULUM_BOARDS).toHaveLength(4);
    expect(EDEXCEL_MATHS_14_UNITS).toHaveLength(14);
    expect(EDEXCEL_MATHS_CASH_IN_AWARDS.map((a) => a.code)).toEqual([
      'XMA01',
      'YMA01',
      'XFM01',
      'YFM01',
    ]);
  });

  it('validates XMA01 (AS Mathematics · 3 units · 300 UMS)', () => {
    const valid = validateMathsSuiteSelection('XMA01', ['WMA11', 'WMA12', 'WME01']);
    expect(valid.isValid).toBe(true);
    expect(valid.totalUms).toBe(300);

    const invalidMissingApplied = validateMathsSuiteSelection('XMA01', ['WMA11', 'WMA12']);
    expect(invalidMissingApplied.isValid).toBe(false);
    expect(invalidMissingApplied.selectedUnitCount).toBe(2);
  });

  it('validates all 5 official YMA01 (IAL Mathematics · 6 units · 600 UMS) applied pairs and rejects invalid pairs', () => {
    for (const pair of EDEXCEL_YMA01_APPLIED_PAIRS) {
      const result = validateMathsSuiteSelection('YMA01', [
        'WMA11',
        'WMA12',
        'WMA13',
        'WMA14',
        pair.units[0],
        pair.units[1],
      ]);
      expect(result.isValid).toBe(true);
      expect(result.matchedPairLabel).toBe(pair.label);
      expect(result.totalUms).toBe(600);
    }

    // M1 + S2 is not an official YMA01 pair (requires S1 before S2)
    const invalidPair = validateMathsSuiteSelection('YMA01', [
      'WMA11',
      'WMA12',
      'WMA13',
      'WMA14',
      'WME01',
      'WST02',
    ]);
    expect(invalidPair.isValid).toBe(false);
    expect(invalidPair.matchedPairLabel).toBeNull();
  });

  it('validates XFM01 and YFM01 Further Mathematics rules and detects overlap with YMA01 units', () => {
    const yma01Units = ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'] as const;

    const validYfm01 = validateMathsSuiteSelection(
      'YFM01',
      ['WFM01', 'WFM02', 'WFM03', 'WME02', 'WME03', 'WST02'],
      yma01Units
    );
    expect(validYfm01.isValid).toBe(true);
    expect(validYfm01.conflictingUnits).toEqual([]);

    // Overlapping WME01 (already used in YMA01) must fail validation
    const overlappingYfm01 = validateMathsSuiteSelection(
      'YFM01',
      ['WFM01', 'WFM02', 'WFM03', 'WME01', 'WME02', 'WST02'],
      yma01Units
    );
    expect(overlappingYfm01.isValid).toBe(false);
    expect(overlappingYfm01.conflictingUnits).toContain('WME01');

    // Missing both FP2 and FP3 in YFM01 must fail AT_LEAST_ONE_OF rule
    const missingA2Fp = validateMathsSuiteSelection(
      'YFM01',
      ['WFM01', 'WME02', 'WME03', 'WST02', 'WST03', 'WDM11'],
      yma01Units
    );
    expect(missingA2Fp.isValid).toBe(false);
  });

  it('validates all curated pathway presets cleanly', () => {
    for (const preset of MATHS_SUITE_PATHWAY_PRESETS) {
      const result = validateMathsSuiteSelection(preset.cashInCode, preset.units);
      expect(result.isValid).toBe(true);
    }
  });

  it('locks compulsory units and toggles optional units in toggleUnitInCashIn', () => {
    expect(isCompulsoryUnitForCashIn('YMA01', 'WMA11')).toBe(true);
    expect(isCompulsoryUnitForCashIn('YMA01', 'WME01')).toBe(false);
    expect(isUnitAllowedInCashInPool('YFM01', 'WMA11')).toBe(false);
    expect(isUnitAllowedInCashInPool('YFM01', 'WFM02')).toBe(true);

    const baseYma01 = ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'] as const;
    // Attempting to toggle compulsory WMA11 keeps it locked
    expect(toggleUnitInCashIn('YMA01', baseYma01, 'WMA11')).toEqual(baseYma01);

    // Toggling WST01 removes it; toggling WDM11 adds it in canonical order
    const withoutS1 = toggleUnitInCashIn('YMA01', baseYma01, 'WST01');
    expect(withoutS1).toEqual(['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01']);

    const withD1 = toggleUnitInCashIn('YMA01', withoutS1, 'WDM11');
    expect(withD1).toEqual(['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WDM11']);
  });

  it('formats WMA11-SET summary and filters subjects across all 4 boards', () => {
    const summary = formatMathsSuiteSummary(
      'YMA01',
      ['WST01', 'WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01'],
      ['YMA01', 'YFM01']
    );
    expect(summary).toBe('Cash-in YMA01 + YFM01 · 6/14 units (P1, P2, P3, P4, M1, S1)');

    const edexcelIal = filterCurriculumSubjects(MOCK_CURRICULUM_SUBJECTS, {
      boardId: 'edexcel-ial',
    });
    expect(edexcelIal.length).toBeGreaterThanOrEqual(4);

    const cieAlevelMaths = filterCurriculumSubjects(MOCK_CURRICULUM_SUBJECTS, {
      boardId: 'cambridge-alevel',
      searchQuery: '9709',
    });
    expect(cieAlevelMaths).toHaveLength(1);
    expect(cieAlevelMaths[0]?.id).toBe('cie-maths-9709');
  });

  it('sanitizes persisted curriculum state safely against malformed storage payloads', () => {
    const fallback = createDefaultStudyCurriculumState();
    const sanitized = sanitizeStudyCurriculumState(
      {
        activeBoard: 'cambridge-igcse',
        activeMathsCashIn: 'YFM01',
        enrolledSubjectIds: ['igcse-maths-0580', 123],
        mathsUnitsByCashIn: {
          YMA01: ['WME01', 'WDM11'],
        },
      },
      fallback
    );

    expect(sanitized.activeBoard).toBe('cambridge-igcse');
    expect(sanitized.activeMathsCashIn).toBe('YFM01');
    expect(sanitized.enrolledSubjectIds).toEqual(['igcse-maths-0580']);
    // Compulsory P1-P4 are automatically preserved
    expect(sanitized.mathsUnitsByCashIn.YMA01).toEqual(
      sortMathsUnitsCanonical(['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WDM11'])
    );
  });
});
