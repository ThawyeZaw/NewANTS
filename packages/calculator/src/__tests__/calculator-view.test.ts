import { describe, expect, it } from 'vitest';
import {
  GradeCalculatorView,
  MOCK_CALCULATOR_SUBJECTS,
  MOCK_EXAM_BOARDS,
  MOCK_EXAM_SERIES,
} from '../index';

describe('@ants/calculator [ZYY-1.3] GradeCalculatorView & Mock Catalog', () => {
  it('exports GradeCalculatorView component', () => {
    expect(GradeCalculatorView).toBeDefined();
  });

  it('includes all 4 core ANTs exam boards in mock catalog', () => {
    expect(MOCK_EXAM_BOARDS.map((b) => b.id)).toEqual([
      'edexcel-ial',
      'caie-alevel',
      'caie-igcse',
      'edexcel-igcse',
    ]);
  });

  it('provides multi-series boundaries for each mock subject', () => {
    expect(MOCK_EXAM_SERIES).toHaveLength(3);
    for (const subject of MOCK_CALCULATOR_SUBJECTS) {
      expect(subject.papers.length).toBeGreaterThan(0);
      expect(subject.seriesBoundaries['mj-2025'].length).toBeGreaterThan(0);
      expect(subject.seriesBoundaries['jan-2025'].length).toBeGreaterThan(0);
      expect(subject.seriesBoundaries['on-2024'].length).toBeGreaterThan(0);
    }
  });
});

