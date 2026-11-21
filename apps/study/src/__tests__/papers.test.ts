import { describe, expect, it } from 'vitest';
import {
  computeAllEnrolledPaperSummary,
  computeSeriesTrendPoints,
  computeSubjectPaperStats,
  deletePaperAttempt,
  derivePaperResult,
  filterPastPaperRows,
  getCellAttempts,
  isRowAvailableInSeries,
  logPaperAttempt,
  PAPER_FIRST_LOG_XP,
  PAPER_PB_IMPROVEMENT_XP,
  sanitizeStudyPapersState,
  setCellDisplayMode,
} from '../lib/study/papers';
import { MOCK_CURRICULUM_SUBJECTS } from '../mocks/study-curriculum.mock';
import {
  createDefaultStudyPapersState,
  MOCK_PAST_PAPER_ROWS,
  PAST_PAPER_SERIES,
} from '../mocks/study-papers.mock';

describe('Study Past Paper Tracker Engine ([ZYY-4.4])', () => {
  it('derives modular Edexcel IAL UMS, A*-U grades, and boundary margins accurately', () => {
    const wma11 = MOCK_PAST_PAPER_ROWS.find((r) => r.id === 'ial-maths-wma11')!;
    // jan-fm-2025 shift is -1 => A* cutoff = 62, A = 54, B = 47, C = 40
    const resAStar = derivePaperResult(64, wma11, 'jan-fm-2025');
    expect(resAStar.grade).toBe('A*');
    expect(resAStar.umsOrPumLabel).toBe('UMS');
    expect(resAStar.umsOrPum).toBeGreaterThanOrEqual(90);
    expect(resAStar.isTopGrade).toBe(true);
    expect(resAStar.nextGradeStop).toBeNull();

    const resA = derivePaperResult(58, wma11, 'jan-fm-2025');
    expect(resA.grade).toBe('A');
    expect(resA.umsOrPum).toBeGreaterThanOrEqual(80);
    expect(resA.umsOrPum).toBeLessThan(90);
    expect(resA.nextGradeStop).toEqual({
      grade: 'A*',
      minRaw: 62,
      marksNeeded: 4,
    });

    // Clamps out-of-range raw inputs cleanly
    expect(derivePaperResult(999, wma11, 'jan-fm-2025').rawScore).toBe(75);
    expect(derivePaperResult(-10, wma11, 'jan-fm-2025').rawScore).toBe(0);
    expect(derivePaperResult(-10, wma11, 'jan-fm-2025').grade).toBe('U');
  });

  it('derives Cambridge PUM and Edexcel IGCSE 9-1 grades accurately', () => {
    const igcse4ma1 = MOCK_PAST_PAPER_ROWS.find((r) => r.id === 'edexcel-igcse-4ma1-2h')!;
    const res9 = derivePaperResult(86, igcse4ma1, 'mj-2025');
    expect(res9.grade).toBe('9');
    expect(res9.umsOrPumLabel).toBe('PUM');
    expect(res9.umsOrPum).toBeGreaterThanOrEqual(90);

    const cam0580p41 = MOCK_PAST_PAPER_ROWS.find((r) => r.id === 'igcse-maths-0580-41')!;
    const cam0580p42 = MOCK_PAST_PAPER_ROWS.find((r) => r.id === 'igcse-maths-0580-42')!;
    expect(isRowAvailableInSeries(cam0580p41, 'jan-fm-2025')).toBe(false);
    expect(isRowAvailableInSeries(cam0580p42, 'jan-fm-2025')).toBe(true);
  });

  it('logs attempts with idempotent +25 XP first sit, +15 XP PB bonus, and best/latest mode switching', () => {
    const baseState = createDefaultStudyPapersState();
    const wma13 = MOCK_PAST_PAPER_ROWS.find((r) => r.id === 'ial-maths-wma13')!;

    // First sit on empty cell -> +25 XP
    const firstSit = logPaperAttempt(baseState, wma13, 'mj-2025', {
      rawScore: 58,
      timed: true,
      durationMinutes: 88,
      weakTopics: ['Chain rule'],
      notes: 'First attempt on WMA13 MJ25.',
      loggedAtIso: '2026-11-12T10:00:00.000Z',
    });
    expect(firstSit.xpEarned).toBe(PAPER_FIRST_LOG_XP);
    expect(firstSit.xpReason).toBe('first_clear');
    expect(firstSit.nextState.earnedPaperXp).toBe(
      baseState.earnedPaperXp + PAPER_FIRST_LOG_XP
    );

    // Lower practice sit on same cell -> 0 XP
    const lowerSit = logPaperAttempt(firstSit.nextState, wma13, 'mj-2025', {
      rawScore: 52,
      timed: false,
      durationMinutes: 95,
      notes: 'Quick untimed drill.',
      loggedAtIso: '2026-11-12T11:00:00.000Z',
    });
    expect(lowerSit.xpEarned).toBe(0);
    expect(lowerSit.xpReason).toBe('practice_logged');

    // Best mode vs Latest mode on the same cell
    const bestCell = getCellAttempts(lowerSit.nextState.attempts, wma13.id, 'mj-2025', 'best');
    expect(bestCell.displayAttempt?.rawScore).toBe(58);
    expect(bestCell.attemptCount).toBe(2);

    const latestState = setCellDisplayMode(lowerSit.nextState, 'latest');
    const latestCell = getCellAttempts(
      latestState.attempts,
      wma13.id,
      'mj-2025',
      latestState.cellDisplayMode
    );
    expect(latestCell.displayAttempt?.rawScore).toBe(52);

    // Higher PB sit -> +15 XP
    const pbSit = logPaperAttempt(latestState, wma13, 'mj-2025', {
      rawScore: 67,
      timed: true,
      durationMinutes: 81,
      loggedAtIso: '2026-11-12T12:00:00.000Z',
    });
    expect(pbSit.xpEarned).toBe(PAPER_PB_IMPROVEMENT_XP);
    expect(pbSit.xpReason).toBe('personal_best');

    // Delete latest attempt works cleanly
    const afterDelete = deletePaperAttempt(pbSit.nextState, pbSit.createdAttempt.id);
    expect(afterDelete.attempts.some((a) => a.id === pbSit.createdAttempt.id)).toBe(false);
  });

  it('filters past paper rows by cash-in units, Cambridge variants, status, and search query', () => {
    const state = createDefaultStudyPapersState();

    const yma01Only = filterPastPaperRows(
      MOCK_PAST_PAPER_ROWS,
      state.attempts,
      PAST_PAPER_SERIES,
      {
        subjectId: 'ial-maths-suite',
        allowedUnitCodes: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
      }
    );
    expect(yma01Only).toHaveLength(6);
    expect(yma01Only.every((r) => r.unitCode !== 'WFP01' && r.unitCode !== 'WFM01')).toBe(
      true
    );

    const cam0580V2 = filterPastPaperRows(
      MOCK_PAST_PAPER_ROWS,
      state.attempts,
      PAST_PAPER_SERIES,
      {
        subjectId: 'igcse-maths-0580',
        variantFilter: 'v2',
      }
    );
    expect(cam0580V2.map((r) => r.paperCode)).toEqual(['0580/22', '0580/42']);

    const searchByNote = filterPastPaperRows(
      MOCK_PAST_PAPER_ROWS,
      state.attempts,
      PAST_PAPER_SERIES,
      {
        subjectId: 'ial-maths-suite',
        searchQuery: 'radian sector',
      }
    );
    expect(searchByNote.map((r) => r.paperCode)).toEqual(['WMA11']);
  });

  it('computes subject stats, cross-subject summary, chronological trend points, and sanitizes corrupt storage', () => {
    const state = createDefaultStudyPapersState();
    const ialMathsStats = computeSubjectPaperStats(
      MOCK_PAST_PAPER_ROWS,
      PAST_PAPER_SERIES,
      state.attempts,
      'ial-maths-suite',
      'best'
    );
    expect(ialMathsStats.completedCells).toBeGreaterThanOrEqual(7);
    expect(ialMathsStats.bestGrade).toBe('A*');
    expect(ialMathsStats.umsOrPumLabel).toBe('UMS');

    const enrolledIds = MOCK_CURRICULUM_SUBJECTS.filter((s) => s.defaultEnrolled).map(
      (s) => s.id
    );
    const summary = computeAllEnrolledPaperSummary(
      MOCK_CURRICULUM_SUBJECTS,
      enrolledIds,
      state.attempts
    );
    expect(summary.totalLoggedCells).toBeGreaterThanOrEqual(10);

    const trend = computeSeriesTrendPoints(
      PAST_PAPER_SERIES,
      MOCK_PAST_PAPER_ROWS,
      state.attempts,
      'ial-maths-suite',
      'edexcel-ial',
      'best'
    );
    expect(trend).toHaveLength(6);
    expect(trend[0]?.seriesId).toBe('on-2023');
    expect(trend[5]?.seriesId).toBe('mj-2025');

    const sanitized = sanitizeStudyPapersState(
      {
        cellDisplayMode: 'latest',
        attempts: [
          {
            id: 'ok-1',
            subjectId: 'ial-maths-suite',
            rowId: 'ial-maths-wma11',
            paperCode: 'WMA11',
            seriesId: 'mj-2025',
            rawScore: 999,
            maxRaw: 75,
            derivedGrade: 'A*',
          },
          {
            id: 'corrupt-attempt',
            maxRaw: 0,
          },
        ],
      },
      state
    );
    expect(sanitized.cellDisplayMode).toBe('latest');
    expect(sanitized.attempts).toHaveLength(1);
    expect(sanitized.attempts[0]?.rawScore).toBe(75);
    expect(sanitized.attempts[0]?.percentage).toBe(100);
  });
});

