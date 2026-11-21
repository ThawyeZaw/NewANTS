/**
 * Study Dashboard — pure TypeScript domain types, progress rollups, countdown math,
 * and defensive localStorage persistence (`ants-study-dashboard-v1`).
 * Contains zero React, Next.js, or database dependencies so Thaw can reuse it when wiring `[THAW-4.5]`.
 */

export const STUDY_DASHBOARD_STORAGE_KEY = 'ants-study-dashboard-v1';

export type StudyBoardPresetId = 'edexcel-ial' | 'cambridge-igcse';

export type StudyNavRouteId =
  | 'dashboard'
  | 'curriculum'
  | 'past-papers'
  | 'countdown'
  | 'calculator'
  | 'notes'
  | 'flashcards'
  | 'quizzes'
  | 'leaderboard'
  | 'settings';

export type StudySubjectType = 'modular_maths_suite' | 'modular_sciences' | 'fixed_linear';

export type CountdownUrgency = 'urgent' | 'upcoming' | 'steady';

export interface StudyBoardTab {
  id: StudyBoardPresetId;
  label: string;
  shortLabel: string;
  summary: string;
}

export interface EnrolledSubjectSummary {
  id: string;
  code: string;
  boardId: StudyBoardPresetId;
  boardLabel: string;
  title: string;
  subjectType: StudySubjectType;
  unitSummary: string;
  topicsMastered: number;
  topicsInProgress: number;
  topicsTotal: number;
  papersLogged: number;
  latestPaperLabel: string;
  targetGrade: string;
  nextMilestoneLabel: string;
  lastStudiedLabel: string;
  /** Default check-in status before user toggles live state in the session. */
  defaultReviewedToday?: boolean;
}

export interface StudyExamCountdownItem {
  id: string;
  boardId: StudyBoardPresetId;
  boardLabel: string;
  paperCode: string;
  title: string;
  examDateIso: string;
  examDateLabel: string;
  targetGrade: string;
  defaultPinned: boolean;
  defaultSyncedToFlow: boolean;
}

export interface RecentStudyActivityItem {
  id: string;
  boardId: StudyBoardPresetId;
  dateLabel: string;
  subjectCode: string;
  summary: string;
  metricLabel: string;
  xpDelta: number;
}

export interface StudyDashboardPersistedState {
  version: 1;
  activeBoard: StudyBoardPresetId;
  sidebarCollapsed: boolean;
  xpBonus: number;
  reviewedSubjectIdsByBoard: Record<StudyBoardPresetId, string[]>;
  pinnedExamIds: string[];
  flowSyncedExamIds: string[];
}

export interface BoardProgressSummary {
  overallPercent: number;
  masteredTopics: number;
  inProgressTopics: number;
  totalTopics: number;
  totalPapers: number;
  reviewedTodayCount: number;
  subjectCount: number;
}

export const REVISION_CHECKIN_XP = 15;

/**
 * Computes non-negative calendar days between two YYYY-MM-DD strings using UTC midnight
 * so local daylight-saving transitions never drift exam countdowns by a day.
 */
export function computeDaysRemaining(examDateIso: string, referenceDateIso: string): number {
  const parseUtcMidnight = (iso: string): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return Date.UTC(year, month, day);
  };

  const examMs = parseUtcMidnight(examDateIso);
  const refMs = parseUtcMidnight(referenceDateIso);
  if (examMs === null || refMs === null) return 0;

  const diffDays = Math.round((examMs - refMs) / 86_400_000);
  return Math.max(0, diffDays);
}

export function getCountdownUrgency(daysRemaining: number): CountdownUrgency {
  if (daysRemaining <= 14) return 'urgent';
  if (daysRemaining <= 28) return 'upcoming';
  return 'steady';
}

export function computeMasteryPercent(mastered: number, total: number): number {
  if (total <= 0 || mastered <= 0) return 0;
  return Math.min(100, Math.round((mastered / total) * 100));
}

export function computeBoardSummary(
  subjects: EnrolledSubjectSummary[],
  reviewedSubjectIds: string[]
): BoardProgressSummary {
  const reviewedSet = new Set(reviewedSubjectIds);
  let masteredTopics = 0;
  let inProgressTopics = 0;
  let totalTopics = 0;
  let totalPapers = 0;
  let reviewedTodayCount = 0;

  for (const subject of subjects) {
    masteredTopics += subject.topicsMastered;
    inProgressTopics += subject.topicsInProgress;
    totalTopics += subject.topicsTotal;
    totalPapers += subject.papersLogged;
    if (reviewedSet.has(subject.id)) {
      reviewedTodayCount += 1;
    }
  }

  return {
    overallPercent: computeMasteryPercent(masteredTopics, totalTopics),
    masteredTopics,
    inProgressTopics,
    totalTopics,
    totalPapers,
    reviewedTodayCount,
    subjectCount: subjects.length,
  };
}

export function computeCurrentXp(baseXp: number, xpBonus: number): number {
  return Math.max(0, baseXp + xpBonus);
}

export function toggleSubjectReviewedToday(
  state: StudyDashboardPersistedState,
  boardId: StudyBoardPresetId,
  subjectId: string
): StudyDashboardPersistedState {
  const current = state.reviewedSubjectIdsByBoard[boardId] ?? [];
  const exists = current.includes(subjectId);
  const nextIds = exists ? current.filter((id) => id !== subjectId) : [...current, subjectId];
  const nextXpBonus = exists
    ? state.xpBonus - REVISION_CHECKIN_XP
    : state.xpBonus + REVISION_CHECKIN_XP;

  return {
    ...state,
    xpBonus: nextXpBonus,
    reviewedSubjectIdsByBoard: {
      ...state.reviewedSubjectIdsByBoard,
      [boardId]: nextIds,
    },
  };
}

export function toggleExamPinned(
  state: StudyDashboardPersistedState,
  examId: string
): StudyDashboardPersistedState {
  const exists = state.pinnedExamIds.includes(examId);
  return {
    ...state,
    pinnedExamIds: exists
      ? state.pinnedExamIds.filter((id) => id !== examId)
      : [...state.pinnedExamIds, examId],
  };
}

export function toggleExamFlowSync(
  state: StudyDashboardPersistedState,
  examId: string
): StudyDashboardPersistedState {
  const exists = state.flowSyncedExamIds.includes(examId);
  return {
    ...state,
    flowSyncedExamIds: exists
      ? state.flowSyncedExamIds.filter((id) => id !== examId)
      : [...state.flowSyncedExamIds, examId],
  };
}

export function setStudyBoard(
  state: StudyDashboardPersistedState,
  boardId: StudyBoardPresetId
): StudyDashboardPersistedState {
  return {
    ...state,
    activeBoard: boardId,
  };
}

export function setSidebarCollapsed(
  state: StudyDashboardPersistedState,
  collapsed: boolean
): StudyDashboardPersistedState {
  return {
    ...state,
    sidebarCollapsed: collapsed,
  };
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item === 'string' && item.trim().length > 0) {
      unique.add(item);
    }
  }
  return Array.from(unique);
}

/**
 * Validates persisted client state against current schema invariants so corrupt or older
 * localStorage snapshots fall back cleanly without crashing hydration.
 */
export function sanitizeStudyDashboardState(
  raw: unknown,
  fallback: StudyDashboardPersistedState
): StudyDashboardPersistedState {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const candidate = raw as Partial<StudyDashboardPersistedState>;
  const activeBoard: StudyBoardPresetId =
    candidate.activeBoard === 'cambridge-igcse' || candidate.activeBoard === 'edexcel-ial'
      ? candidate.activeBoard
      : fallback.activeBoard;

  const reviewedRaw = candidate.reviewedSubjectIdsByBoard;
  const reviewedIal =
    reviewedRaw && typeof reviewedRaw === 'object'
      ? normalizeStringArray(
          (reviewedRaw as Record<string, unknown>)['edexcel-ial'],
          fallback.reviewedSubjectIdsByBoard['edexcel-ial']
        )
      : [...fallback.reviewedSubjectIdsByBoard['edexcel-ial']];
  const reviewedIgcse =
    reviewedRaw && typeof reviewedRaw === 'object'
      ? normalizeStringArray(
          (reviewedRaw as Record<string, unknown>)['cambridge-igcse'],
          fallback.reviewedSubjectIdsByBoard['cambridge-igcse']
        )
      : [...fallback.reviewedSubjectIdsByBoard['cambridge-igcse']];

  const xpBonus =
    typeof candidate.xpBonus === 'number' && Number.isFinite(candidate.xpBonus)
      ? Math.max(-300, Math.min(2000, candidate.xpBonus))
      : fallback.xpBonus;

  return {
    version: 1,
    activeBoard,
    sidebarCollapsed:
      typeof candidate.sidebarCollapsed === 'boolean'
        ? candidate.sidebarCollapsed
        : fallback.sidebarCollapsed,
    xpBonus,
    reviewedSubjectIdsByBoard: {
      'edexcel-ial': reviewedIal,
      'cambridge-igcse': reviewedIgcse,
    },
    pinnedExamIds: normalizeStringArray(candidate.pinnedExamIds, fallback.pinnedExamIds),
    flowSyncedExamIds: normalizeStringArray(candidate.flowSyncedExamIds, fallback.flowSyncedExamIds),
  };
}

export function loadStudyDashboardState(
  fallback: StudyDashboardPersistedState
): StudyDashboardPersistedState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_DASHBOARD_STORAGE_KEY);
    if (!raw) return fallback;
    return sanitizeStudyDashboardState(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveStudyDashboardState(state: StudyDashboardPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDY_DASHBOARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or private browsing storage restrictions.
  }
}

