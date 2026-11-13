import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STUDY_NAV_ITEMS,
  StudyShellView,
} from '../components/layout/views/StudyShellView';
import { StudyDashboardView } from '../components/dashboard/views/StudyDashboardView';
import {
  computeBoardSummary,
  computeCurrentXp,
  computeDaysRemaining,
  computeMasteryPercent,
  getCountdownUrgency,
  REVISION_CHECKIN_XP,
  sanitizeStudyDashboardState,
  setSidebarCollapsed,
  setStudyBoard,
  toggleExamFlowSync,
  toggleExamPinned,
  toggleSubjectReviewedToday,
} from '../lib/study/dashboard';
import {
  createDefaultStudyDashboardState,
  DEFAULT_STUDY_REFERENCE_DATE,
  MOCK_RECENT_STUDY_ACTIVITY,
  MOCK_STUDY_COUNTDOWNS,
  MOCK_STUDY_SUBJECTS_BY_BOARD,
  STUDY_BOARD_TABS,
} from '../mocks/study-dashboard.mock';

describe('@ants/study [ZYY-4.1] App Shell & Study Dashboard View', () => {
  it('exports StudyShellView, StudyDashboardView, and complete default navigation items', () => {
    expect(StudyShellView).toBeDefined();
    expect(StudyDashboardView).toBeDefined();
    expect(DEFAULT_STUDY_NAV_ITEMS.some((item) => item.id === 'dashboard' && item.available)).toBe(
      true
    );
    expect(DEFAULT_STUDY_NAV_ITEMS.some((item) => item.id === 'calculator' && item.available)).toBe(
      true
    );
    expect(STUDY_BOARD_TABS.map((t) => t.id)).toEqual(['edexcel-ial', 'cambridge-igcse']);
  });

  it('computes exact UTC calendar countdowns and urgency tiers without timezone drift', () => {
    expect(computeDaysRemaining('2026-11-23', DEFAULT_STUDY_REFERENCE_DATE)).toBe(12);
    expect(computeDaysRemaining('2026-12-01', DEFAULT_STUDY_REFERENCE_DATE)).toBe(20);
    expect(computeDaysRemaining('2026-10-01', DEFAULT_STUDY_REFERENCE_DATE)).toBe(0);
    expect(computeDaysRemaining('invalid-date', DEFAULT_STUDY_REFERENCE_DATE)).toBe(0);

    expect(getCountdownUrgency(12)).toBe('urgent');
    expect(getCountdownUrgency(20)).toBe('upcoming');
    expect(getCountdownUrgency(35)).toBe('steady');
  });

  it('aggregates board syllabus mastery, papers logged, and today check-ins deterministically', () => {
    const defaults = createDefaultStudyDashboardState();
    const ialSubjects = MOCK_STUDY_SUBJECTS_BY_BOARD['edexcel-ial'];
    const summary = computeBoardSummary(
      ialSubjects,
      defaults.reviewedSubjectIdsByBoard['edexcel-ial']
    );

    expect(computeMasteryPercent(19, 28)).toBe(68);
    expect(computeMasteryPercent(0, 0)).toBe(0);
    expect(summary.masteredTopics).toBe(43);
    expect(summary.totalTopics).toBe(70);
    expect(summary.overallPercent).toBe(61);
    expect(summary.totalPapers).toBe(18);
    expect(summary.reviewedTodayCount).toBe(1);
    expect(summary.subjectCount).toBe(3);
  });

  it('toggles daily subject revision check-ins, exam pins, Flow sync, board & sidebar state', () => {
    let state = createDefaultStudyDashboardState();
    expect(computeCurrentXp(2840, state.xpBonus)).toBe(2840);

    state = toggleSubjectReviewedToday(state, 'edexcel-ial', 'sub_wph_ial');
    expect(state.reviewedSubjectIdsByBoard['edexcel-ial']).toContain('sub_wph_ial');
    expect(computeCurrentXp(2840, state.xpBonus)).toBe(2840 + REVISION_CHECKIN_XP);

    state = toggleSubjectReviewedToday(state, 'edexcel-ial', 'sub_wph_ial');
    expect(state.reviewedSubjectIdsByBoard['edexcel-ial']).not.toContain('sub_wph_ial');
    expect(computeCurrentXp(2840, state.xpBonus)).toBe(2840);

    state = toggleExamPinned(state, 'exam_wch11');
    expect(state.pinnedExamIds).toContain('exam_wch11');

    state = toggleExamFlowSync(state, 'exam_wch11');
    expect(state.flowSyncedExamIds).toContain('exam_wch11');

    state = setStudyBoard(state, 'cambridge-igcse');
    expect(state.activeBoard).toBe('cambridge-igcse');

    state = setSidebarCollapsed(state, true);
    expect(state.sidebarCollapsed).toBe(true);
  });

  it('sanitizes malformed localStorage payloads safely back to valid defaults', () => {
    const fallback = createDefaultStudyDashboardState();
    expect(sanitizeStudyDashboardState(null, fallback)).toEqual(fallback);

    const sanitized = sanitizeStudyDashboardState(
      {
        activeBoard: 'unknown-board',
        sidebarCollapsed: 'yes',
        xpBonus: 999999,
        reviewedSubjectIdsByBoard: { 'edexcel-ial': ['sub_wma11_set', 42, ''] },
        pinnedExamIds: 'bad-type',
      },
      fallback
    );

    expect(sanitized.activeBoard).toBe(fallback.activeBoard);
    expect(sanitized.sidebarCollapsed).toBe(fallback.sidebarCollapsed);
    expect(sanitized.xpBonus).toBe(2000);
    expect(sanitized.reviewedSubjectIdsByBoard['edexcel-ial']).toEqual(['sub_wma11_set']);
    expect(sanitized.pinnedExamIds).toEqual(fallback.pinnedExamIds);
    expect(MOCK_STUDY_COUNTDOWNS.length).toBeGreaterThanOrEqual(6);
    expect(MOCK_RECENT_STUDY_ACTIVITY.length).toBeGreaterThanOrEqual(6);
  });
});

