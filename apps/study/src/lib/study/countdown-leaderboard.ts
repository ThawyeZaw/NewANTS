/**
 * Study Exam Countdown & Scholar Leaderboard — pure TypeScript domain math,
 * filtering, XP rank computation, and defensive localStorage persistence (`[ZYY-4.5]`).
 * Contains zero React, Next.js, or database dependencies so Thaw can reuse it in `[THAW-4.4]` / `[THAW-4.5]`.
 */
import {
  getCountdownUrgency,
  loadStudyDashboardState,
  saveStudyDashboardState,
  toggleExamFlowSync,
  toggleExamPinned,
  type CountdownUrgency,
  type StudyBoardPresetId,
  type StudyDashboardPersistedState,
} from './dashboard';

export const STUDY_COUNTDOWNS_STORAGE_KEY = 'ants-study-countdowns-v1';
export const STUDY_LEADERBOARD_STORAGE_KEY = 'ants-study-leaderboard-v1';

export type ExamCategory = 'official' | 'mock' | 'custom';
export type ExamColorTag = 'amber' | 'emerald' | 'indigo' | 'rose' | 'slate';

export interface ExamCountdownEntry {
  id: string;
  boardId: StudyBoardPresetId;
  boardLabel: string;
  paperCode: string;
  title: string;
  /** YYYY-MM-DD */
  examDateIso: string;
  /** Human display date e.g. '23 Nov 2026' */
  examDateLabel: string;
  /** HH:MM 24h session start e.g. '09:00' */
  examTime24h: string;
  targetGrade: string;
  category: ExamCategory;
  isCustom: boolean;
  isMock: boolean;
  colorTag: ExamColorTag;
  venueOrNotes?: string;
  defaultPinned: boolean;
  defaultSyncedToFlow: boolean;
}

export interface LiveCountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  urgency: CountdownUrgency;
  totalSecondsRemaining: number;
}

export interface StudyCountdownsPersistedState {
  version: 1;
  customCountdowns: ExamCountdownEntry[];
  deletedCustomIds: string[];
  targetGradeOverrides: Record<string, string>;
}

export type LeaderboardTimeframe = 'weekly' | 'all_time';
export type LeaderboardBoardFilter = 'all' | StudyBoardPresetId;

export interface ScholarLeaderboardEntry {
  id: string;
  name: string;
  username: string;
  boardId: StudyBoardPresetId;
  boardLabel: string;
  cohortLabel: string;
  weeklyXp: number;
  allTimeXp: number;
  streakDays: number;
  topicsMastered: number;
  papersLogged: number;
  avgUmsOrGradeLabel: string;
  badgeCount: number;
  isTutor?: boolean;
  isCurrentUser?: boolean;
}

export interface RankedScholarEntry extends ScholarLeaderboardEntry {
  rank: number;
  displayXp: number;
}

export interface StudyBadgeItem {
  id: string;
  title: string;
  description: string;
  criteriaLabel: string;
  xpReward: number;
  earned: boolean;
  earnedDateLabel?: string;
  category: 'streak' | 'papers' | 'mastery' | 'sync';
}

export interface StudyLeaderboardPrefsState {
  version: 1;
  timeframe: LeaderboardTimeframe;
  boardFilter: LeaderboardBoardFilter;
  visibleOnLeaderboard: boolean;
}

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatExamDateLabel(examDateIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDateIso.trim());
  if (!match) return examDateIso;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const monthLabel = MONTH_SHORT_NAMES[monthIdx] ?? 'Jan';
  return `${String(day).padStart(2, '0')} ${monthLabel} ${year}`;
}

/**
 * Parses `YYYY-MM-DD` + `HH:MM` deterministically in UTC (+06:30 offset omitted for cross-env parity)
 * so SSR and client hydration produce identical initial countdowns.
 */
export function parseExamTargetUtcMs(examDateIso: string, examTime24h = '09:00'): number | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDateIso.trim());
  if (!dateMatch) return null;
  const timeMatch = /^(\d{2}):(\d{2})$/.exec((examTime24h || '09:00').trim());
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = timeMatch ? Math.min(23, Math.max(0, Number(timeMatch[1]))) : 9;
  const minute = timeMatch ? Math.min(59, Math.max(0, Number(timeMatch[2]))) : 0;
  return Date.UTC(year, month, day, hour, minute, 0, 0);
}

/**
 * Computes exact days, hours, minutes, seconds remaining until an exam timestamp.
 */
export function computeLiveCountdownParts(
  examDateIso: string,
  nowMs: number,
  examTime24h = '09:00'
): LiveCountdownParts {
  const targetMs = parseExamTargetUtcMs(examDateIso, examTime24h);
  if (targetMs === null) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: false,
      urgency: 'steady',
      totalSecondsRemaining: 0,
    };
  }

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      urgency: 'urgent',
      totalSecondsRemaining: 0,
    };
  }

  const totalSecondsRemaining = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSecondsRemaining / 86_400);
  const remAfterDays = totalSecondsRemaining % 86_400;
  const hours = Math.floor(remAfterDays / 3_600);
  const remAfterHours = remAfterDays % 3_600;
  const minutes = Math.floor(remAfterHours / 60);
  const seconds = remAfterHours % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isPast: false,
    urgency: getCountdownUrgency(days),
    totalSecondsRemaining,
  };
}

export function formatCountdownClock(parts: LiveCountdownParts): string {
  if (parts.isPast) return '00d 00h 00m 00s';
  const dd = String(parts.days).padStart(2, '0');
  const hh = String(parts.hours).padStart(2, '0');
  const mm = String(parts.minutes).padStart(2, '0');
  const ss = String(parts.seconds).padStart(2, '0');
  return `${dd}d ${hh}h ${mm}m ${ss}s`;
}

export interface CreateCustomCountdownInput {
  id?: string;
  boardId: StudyBoardPresetId;
  paperCode: string;
  title: string;
  examDateIso: string;
  examTime24h?: string;
  targetGrade: string;
  category: 'mock' | 'custom';
  colorTag?: ExamColorTag;
  venueOrNotes?: string;
  pinned?: boolean;
  syncedToFlow?: boolean;
}

export function validateCustomCountdownInput(
  input: CreateCustomCountdownInput
): { valid: boolean; error?: string } {
  if (!input.paperCode.trim()) {
    return { valid: false, error: 'Enter a paper or module code (e.g. WMA12 or Mock 01).' };
  }
  if (input.title.trim().length < 2) {
    return { valid: false, error: 'Enter an exam title (at least 2 characters).' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.examDateIso.trim())) {
    return { valid: false, error: 'Select a valid exam date (YYYY-MM-DD).' };
  }
  return { valid: true };
}

export function createCustomCountdownEntry(
  input: CreateCustomCountdownInput,
  fallbackIdSeed = Date.now()
): ExamCountdownEntry {
  const cleanCode = input.paperCode.trim().toUpperCase().slice(0, 20);
  const cleanTitle = input.title.trim().slice(0, 96);
  const cleanDate = input.examDateIso.trim();
  const cleanTime = /^\d{2}:\d{2}$/.test((input.examTime24h ?? '').trim())
    ? (input.examTime24h ?? '09:00').trim()
    : '09:00';
  const boardLabel = input.boardId === 'edexcel-ial' ? 'Edexcel IAL' : 'Cambridge IGCSE';

  return {
    id: input.id?.trim() || `custom_exam_${fallbackIdSeed}`,
    boardId: input.boardId,
    boardLabel,
    paperCode: cleanCode,
    title: cleanTitle,
    examDateIso: cleanDate,
    examDateLabel: formatExamDateLabel(cleanDate),
    examTime24h: cleanTime,
    targetGrade: input.targetGrade.trim() || 'A*',
    category: input.category,
    isCustom: true,
    isMock: input.category === 'mock',
    colorTag: input.colorTag ?? (input.category === 'mock' ? 'indigo' : 'amber'),
    venueOrNotes: input.venueOrNotes?.trim().slice(0, 140) || undefined,
    defaultPinned: input.pinned ?? true,
    defaultSyncedToFlow: input.syncedToFlow ?? true,
  };
}

export type CountdownKindFilter = 'all' | 'pinned' | 'official' | 'mock_custom' | 'flow_synced';

export function mergeCountdownEntries(
  baseExams: ExamCountdownEntry[],
  persisted: StudyCountdownsPersistedState
): ExamCountdownEntry[] {
  const deletedSet = new Set(persisted.deletedCustomIds);
  const merged = new Map<string, ExamCountdownEntry>();

  for (const item of baseExams) {
    if (deletedSet.has(item.id)) continue;
    const overrideGrade = persisted.targetGradeOverrides[item.id];
    merged.set(item.id, overrideGrade ? { ...item, targetGrade: overrideGrade } : item);
  }

  for (const custom of persisted.customCountdowns) {
    if (deletedSet.has(custom.id)) continue;
    const overrideGrade = persisted.targetGradeOverrides[custom.id];
    merged.set(custom.id, overrideGrade ? { ...custom, targetGrade: overrideGrade } : custom);
  }

  return Array.from(merged.values());
}

export function filterAndSortCountdowns(
  items: ExamCountdownEntry[],
  opts: {
    boardFilter: 'all' | StudyBoardPresetId;
    kindFilter: CountdownKindFilter;
    search: string;
    pinnedIds: string[];
    flowSyncedIds: string[];
    referenceNowMs: number;
  }
): ExamCountdownEntry[] {
  const pinnedSet = new Set(opts.pinnedIds);
  const syncedSet = new Set(opts.flowSyncedIds);
  const query = opts.search.trim().toLowerCase();

  const filtered = items.filter((item) => {
    if (opts.boardFilter !== 'all' && item.boardId !== opts.boardFilter) return false;
    if (opts.kindFilter === 'pinned' && !pinnedSet.has(item.id)) return false;
    if (opts.kindFilter === 'official' && item.category !== 'official') return false;
    if (opts.kindFilter === 'mock_custom' && !item.isCustom && !item.isMock) return false;
    if (opts.kindFilter === 'flow_synced' && !syncedSet.has(item.id)) return false;

    if (query) {
      const hay = `${item.paperCode} ${item.title} ${item.boardLabel} ${item.venueOrNotes ?? ''}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    const aParts = computeLiveCountdownParts(a.examDateIso, opts.referenceNowMs, a.examTime24h);
    const bParts = computeLiveCountdownParts(b.examDateIso, opts.referenceNowMs, b.examTime24h);
    if (aParts.isPast !== bParts.isPast) return aParts.isPast ? 1 : -1;
    if (aParts.totalSecondsRemaining !== bParts.totalSecondsRemaining) {
      return aParts.totalSecondsRemaining - bParts.totalSecondsRemaining;
    }
    const aPinned = pinnedSet.has(a.id) ? 0 : 1;
    const bPinned = pinnedSet.has(b.id) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    return a.paperCode.localeCompare(b.paperCode);
  });
}

export function upsertCustomCountdownState(
  state: StudyCountdownsPersistedState,
  entry: ExamCountdownEntry
): StudyCountdownsPersistedState {
  const exists = state.customCountdowns.some((c) => c.id === entry.id);
  const nextCustom = exists
    ? state.customCountdowns.map((c) => (c.id === entry.id ? entry : c))
    : [...state.customCountdowns, entry];

  return {
    ...state,
    deletedCustomIds: state.deletedCustomIds.filter((id) => id !== entry.id),
    customCountdowns: nextCustom,
  };
}

export function deleteCustomCountdownState(
  state: StudyCountdownsPersistedState,
  examId: string
): StudyCountdownsPersistedState {
  return {
    ...state,
    customCountdowns: state.customCountdowns.filter((c) => c.id !== examId),
    deletedCustomIds: state.deletedCustomIds.includes(examId)
      ? state.deletedCustomIds
      : [...state.deletedCustomIds, examId],
  };
}

/** Ensures a newly created custom exam's pin & Flow sync toggles are written to dashboard storage cleanly. */
export function syncCustomExamDashboardFlags(
  dashState: StudyDashboardPersistedState,
  examId: string,
  pinned: boolean,
  syncedToFlow: boolean
): StudyDashboardPersistedState {
  let next = dashState;
  const isPinned = next.pinnedExamIds.includes(examId);
  if (pinned !== isPinned) {
    next = toggleExamPinned(next, examId);
  }
  const isSynced = next.flowSyncedExamIds.includes(examId);
  if (syncedToFlow !== isSynced) {
    next = toggleExamFlowSync(next, examId);
  }
  return next;
}

export function sanitizeStudyCountdownsState(
  raw: unknown,
  fallback: StudyCountdownsPersistedState
): StudyCountdownsPersistedState {
  if (!raw || typeof raw !== 'object') return fallback;
  const candidate = raw as Partial<StudyCountdownsPersistedState>;

  const customCountdowns: ExamCountdownEntry[] = Array.isArray(candidate.customCountdowns)
    ? candidate.customCountdowns
        .filter((item): item is ExamCountdownEntry => {
          return (
            Boolean(item) &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.paperCode === 'string' &&
            typeof item.title === 'string' &&
            typeof item.examDateIso === 'string' &&
            (item.boardId === 'edexcel-ial' || item.boardId === 'cambridge-igcse')
          );
        })
        .map((item) => ({
          id: item.id,
          boardId: item.boardId,
          boardLabel: item.boardId === 'edexcel-ial' ? 'Edexcel IAL' : 'Cambridge IGCSE',
          paperCode: item.paperCode.slice(0, 20),
          title: item.title.slice(0, 96),
          examDateIso: item.examDateIso,
          examDateLabel: formatExamDateLabel(item.examDateIso),
          examTime24h:
            typeof item.examTime24h === 'string' && /^\d{2}:\d{2}$/.test(item.examTime24h)
              ? item.examTime24h
              : '09:00',
          targetGrade: typeof item.targetGrade === 'string' ? item.targetGrade : 'A*',
          category: item.category === 'official' || item.category === 'mock' ? item.category : 'custom',
          isCustom: true,
          isMock: Boolean(item.isMock),
          colorTag:
            item.colorTag === 'emerald' ||
            item.colorTag === 'indigo' ||
            item.colorTag === 'rose' ||
            item.colorTag === 'slate'
              ? item.colorTag
              : 'amber',
          venueOrNotes:
            typeof item.venueOrNotes === 'string' && item.venueOrNotes.trim()
              ? item.venueOrNotes.trim().slice(0, 140)
              : undefined,
          defaultPinned: Boolean(item.defaultPinned),
          defaultSyncedToFlow: Boolean(item.defaultSyncedToFlow),
        }))
    : [...fallback.customCountdowns];

  const deletedCustomIds = Array.isArray(candidate.deletedCustomIds)
    ? candidate.deletedCustomIds.filter((id): id is string => typeof id === 'string')
    : [...fallback.deletedCustomIds];

  const targetGradeOverrides: Record<string, string> = {};
  if (candidate.targetGradeOverrides && typeof candidate.targetGradeOverrides === 'object') {
    for (const [k, v] of Object.entries(candidate.targetGradeOverrides)) {
      if (typeof v === 'string' && v.trim()) {
        targetGradeOverrides[k] = v.trim().slice(0, 6);
      }
    }
  }

  return {
    version: 1,
    customCountdowns,
    deletedCustomIds,
    targetGradeOverrides,
  };
}

export function loadStudyCountdownsState(
  fallback: StudyCountdownsPersistedState
): StudyCountdownsPersistedState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_COUNTDOWNS_STORAGE_KEY);
    if (!raw) return fallback;
    return sanitizeStudyCountdownsState(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveStudyCountdownsState(state: StudyCountdownsPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDY_COUNTDOWNS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage restriction errors.
  }
}

/** Reads and updates dashboard pin/sync flags safely on the client. */
export function updateExamDashboardFlagsInStorage(
  fallbackDashboard: StudyDashboardPersistedState,
  examId: string,
  action: 'pin' | 'flow_sync'
): StudyDashboardPersistedState {
  const current = loadStudyDashboardState(fallbackDashboard);
  const next =
    action === 'pin' ? toggleExamPinned(current, examId) : toggleExamFlowSync(current, examId);
  saveStudyDashboardState(next);
  return next;
}

// ---------------------------------------------------------------------------
// Leaderboard Computation & Preferences
// ---------------------------------------------------------------------------

export function computeScholarLeaderboard(
  entries: ScholarLeaderboardEntry[],
  opts: {
    timeframe: LeaderboardTimeframe;
    boardFilter: LeaderboardBoardFilter;
    search?: string;
    currentUserUsername?: string;
    currentUserName?: string;
    liveCurrentUserXp?: number;
    currentUserXpDelta?: number;
    currentUserStreak?: number;
    visibleOnLeaderboard?: boolean;
  }
): {
  ranked: RankedScholarEntry[];
  currentUserEntry: RankedScholarEntry | null;
  xpToNextRank: number | null;
} {
  const activeHandle = (opts.currentUserUsername ?? 'zaylynnhtet').toLowerCase();
  const visibleSelf = opts.visibleOnLeaderboard ?? true;
  const query = (opts.search ?? '').trim().toLowerCase();

  let working: ScholarLeaderboardEntry[] = entries.map((entry) => {
    const isSelf = entry.username.toLowerCase() === activeHandle || Boolean(entry.isCurrentUser && !opts.currentUserUsername);
    if (!isSelf) {
      return { ...entry, isCurrentUser: false };
    }
    const baseAllTime = entry.allTimeXp;
    const nextAllTime =
      typeof opts.liveCurrentUserXp === 'number'
        ? Math.max(0, opts.liveCurrentUserXp)
        : baseAllTime;
    const delta =
      typeof opts.currentUserXpDelta === 'number'
        ? opts.currentUserXpDelta
        : nextAllTime - baseAllTime;
    return {
      ...entry,
      isCurrentUser: true,
      name: opts.currentUserName ?? entry.name,
      allTimeXp: nextAllTime,
      weeklyXp: Math.max(0, entry.weeklyXp + delta),
      streakDays:
        typeof opts.currentUserStreak === 'number' ? opts.currentUserStreak : entry.streakDays,
    };
  });

  // If the signed-in user is a newly registered @username not in the mock community yet, inject them live!
  if (
    opts.currentUserUsername &&
    !working.some((e) => e.username.toLowerCase() === activeHandle)
  ) {
    working = [
      ...working,
      {
        id: `usr_${activeHandle}`,
        name: opts.currentUserName ?? activeHandle,
        username: activeHandle,
        boardId: opts.boardFilter === 'cambridge-igcse' ? 'cambridge-igcse' : 'edexcel-ial',
        boardLabel: opts.boardFilter === 'cambridge-igcse' ? 'Cambridge IGCSE' : 'Edexcel IAL',
        cohortLabel: 'Unified Scholar',
        weeklyXp: Math.max(50, opts.liveCurrentUserXp ?? 250),
        allTimeXp: Math.max(50, opts.liveCurrentUserXp ?? 250),
        streakDays: opts.currentUserStreak ?? 1,
        topicsMastered: 4,
        papersLogged: 1,
        avgUmsOrGradeLabel: 'A Target',
        badgeCount: 1,
        isCurrentUser: true,
      },
    ];
  }

  // Respect board & privacy visibility filters
  const scoped = working.filter((entry) => {
    if (entry.isCurrentUser && !visibleSelf) return false;
    if (opts.boardFilter !== 'all' && entry.boardId !== opts.boardFilter) return false;
    return true;
  });

  const sorted = [...scoped].sort((a, b) => {
    const aXp = opts.timeframe === 'weekly' ? a.weeklyXp : a.allTimeXp;
    const bXp = opts.timeframe === 'weekly' ? b.weeklyXp : b.allTimeXp;
    if (bXp !== aXp) return bXp - aXp;
    if (b.streakDays !== a.streakDays) return b.streakDays - a.streakDays;
    return a.name.localeCompare(b.name);
  });

  const allRanked: RankedScholarEntry[] = sorted.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
    displayXp: opts.timeframe === 'weekly' ? entry.weeklyXp : entry.allTimeXp,
  }));

  const currentUserEntry = allRanked.find((e) => e.isCurrentUser) ?? null;
  let xpToNextRank: number | null = null;
  if (currentUserEntry && currentUserEntry.rank > 1) {
    const above = allRanked[currentUserEntry.rank - 2];
    if (above) {
      xpToNextRank = Math.max(1, above.displayXp - currentUserEntry.displayXp + 1);
    }
  }

  const ranked = query
    ? allRanked.filter((e) =>
        `${e.name} ${e.username} ${e.boardLabel} ${e.cohortLabel}`.toLowerCase().includes(query)
      )
    : allRanked;

  return {
    ranked,
    currentUserEntry,
    xpToNextRank,
  };
}

export function sanitizeLeaderboardPrefs(
  raw: unknown,
  fallback: StudyLeaderboardPrefsState
): StudyLeaderboardPrefsState {
  if (!raw || typeof raw !== 'object') return fallback;
  const candidate = raw as Partial<StudyLeaderboardPrefsState>;
  return {
    version: 1,
    timeframe: candidate.timeframe === 'all_time' ? 'all_time' : 'weekly',
    boardFilter:
      candidate.boardFilter === 'edexcel-ial' || candidate.boardFilter === 'cambridge-igcse'
        ? candidate.boardFilter
        : 'all',
    visibleOnLeaderboard:
      typeof candidate.visibleOnLeaderboard === 'boolean'
        ? candidate.visibleOnLeaderboard
        : fallback.visibleOnLeaderboard,
  };
}

export function loadLeaderboardPrefs(
  fallback: StudyLeaderboardPrefsState
): StudyLeaderboardPrefsState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_LEADERBOARD_STORAGE_KEY);
    if (!raw) return fallback;
    return sanitizeLeaderboardPrefs(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveLeaderboardPrefs(prefs: StudyLeaderboardPrefsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDY_LEADERBOARD_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage restrictions.
  }
}

