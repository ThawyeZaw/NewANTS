import type { D1Database } from '@cloudflare/workers-types';
import {
  and,
  asc,
  createDb,
  desc,
  eq,
  examCountdowns,
  examSchedules,
  exams,
  inArray,
  paperGradeBoundaries,
  pastPapers,
  profiles,
  studentProfiles,
  subjectComponentRoutes,
  subjects,
  curriculums,
  topicProgress,
  topics,
  userBadges,
  userCashInEnrollments,
  userComponentSelections,
  userCurriculums,
  userEnrollments,
  userPastPaperRecords,
  userStreaks,
  userXpLedger,
} from '@ants/db';
import {
  EDEXCEL_MATHS_CASH_IN_CODES,
  EDEXCEL_MATHS_UNIT_CODES,
  validateEdexcelMathsCashIn,
  type CurriculumBoardId,
  type EdexcelMathsCashInCode,
  type EdexcelMathsUnitCode,
  type GradingScale,
  type StudyBoardDto,
  type StudyCatalogSubjectDto,
  type StudyCatalogResponseDto,
  type StudyCheckInResponseDto,
  type StudyCheckInSubjectInput,
  type StudyCountdownsResponseDto,
  type StudyDashboardResponseDto,
  type StudyDashboardSubjectSummaryDto,
  type StudyExamCountdownDto,
  type StudyLeaderboardResponseDto,
  type StudyLeaderboardScholarDto,
  type StudyLogPastPaperAttemptInput,
  type StudyLogPastPaperResponseDto,
  type StudyMathsSuiteMutationResponseDto,
  type StudyMathsSuiteStateDto,
  type StudyPastPaperAttemptDto,
  type StudyPastPaperRowDto,
  type StudyPastPaperSeriesDto,
  type StudyPastPapersResponseDto,
  type StudyRecentActivityDto,
  type StudySaveCountdownInput,
  type StudySubjectFaculty,
  type StudySubjectUnitDto,
  type StudyToggleEnrollmentInput,
  type StudyTopicDto,
  type StudyTopicProgressMutationResponseDto,
  type StudyTopicsResponseDto,
  type StudyUpdateBoardInput,
  type StudyUpdateCountdownFlagsInput,
  type StudyUpdateMathsSuiteInput,
  type StudyUpdateTargetGradeInput,
  type StudyUpsertTopicProgressInput,
  type TopicConfidenceStatus,
  type TopicDifficulty,
} from '@ants/shared-types';

export class StudyServiceError extends Error {
  status: 400 | 401 | 403 | 404 | 409;
  code: string;

  constructor(status: 400 | 401 | 403 | 404 | 409, code: string, message: string) {
    super(message);
    this.name = 'StudyServiceError';
    this.status = status;
    this.code = code;
  }
}

const TOPIC_MASTERY_XP = 10;
const PAPER_FIRST_LOG_XP = 25;
const PAPER_PB_IMPROVEMENT_XP = 15;
const REVISION_CHECKIN_XP = 15;

const SUBJECT_ALIASES: Record<string, string> = {
  'ial-maths-suite': 'edexcel-ial-maths',
  sub_wma11_set: 'edexcel-ial-maths',
  'wma11-set': 'edexcel-ial-maths',
  'ial-physics': 'edexcel-ial-physics',
  sub_wph_ial: 'edexcel-ial-physics',
  'ial-chemistry': 'edexcel-ial-chemistry',
  sub_wch_ial: 'edexcel-ial-chemistry',
  'ial-biology': 'edexcel-ial-biology',
  'igcse-maths-0580': 'caie-igcse-maths-0580',
  sub_0580: 'caie-igcse-maths-0580',
  'igcse-physics-0625': 'caie-igcse-physics-0625',
  sub_0625: 'caie-igcse-physics-0625',
  'igcse-chemistry-0620': 'caie-igcse-chemistry-0620',
  sub_0620: 'caie-igcse-chemistry-0620',
  'igcse-cs-0478': 'caie-igcse-cs-0478',
  sub_0500: 'caie-igcse-fle-0500',
  'alevel-maths-9709': 'caie-alevel-maths-9709',
  'alevel-physics-9702': 'caie-alevel-physics-9702',
  'edexcel-igcse-4ma1': 'edexcel-igcse-maths-a-4ma1',
  'edexcel-igcse-4pm1': 'edexcel-igcse-fpm-4pm1',
};

const BOARD_SHORT_LABEL: Record<CurriculumBoardId, string> = {
  'edexcel-ial': 'Edexcel IAL',
  'cambridge-igcse': 'Cambridge IGCSE',
  'cambridge-alevel': 'Cambridge A-Level',
  'edexcel-igcse': 'Edexcel IGCSE',
};

const DEFAULT_MATHS_UNITS_BY_CASH_IN: Record<EdexcelMathsCashInCode, EdexcelMathsUnitCode[]> = {
  XMA01: ['WMA11', 'WMA12', 'WME01'],
  YMA01: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
  XFM01: ['WFM01', 'WFM02', 'WME02'],
  YFM01: ['WFM01', 'WFM02', 'WFM03', 'WME02', 'WME03', 'WST02'],
};

const COMPULSORY_MATHS_UNITS_SET: Record<EdexcelMathsCashInCode, ReadonlySet<string>> = {
  XMA01: new Set(['WMA11', 'WMA12']),
  YMA01: new Set(['WMA11', 'WMA12', 'WMA13', 'WMA14']),
  XFM01: new Set(['WFM01']),
  YFM01: new Set(['WFM01']),
};

const A_LEVEL_GRADE_ORDER = ['A*', 'A', 'B', 'C', 'D', 'E'] as const;
const NINE_TO_ONE_GRADE_ORDER = ['9', '8', '7', '6', '5', '4', '3', '2', '1'] as const;
const UMS_ANCHOR_PERCENT_BY_GRADE: Record<string, number> = {
  'A*': 90,
  A: 80,
  B: 70,
  C: 60,
  D: 50,
  E: 40,
  '9': 90,
  '8': 80,
  '7': 70,
  '6': 60,
  '5': 50,
  '4': 40,
  '3': 30,
  '2': 20,
  '1': 10,
};

const STUDY_SERIES_CATALOG: StudyPastPaperSeriesDto[] = [
  {
    id: 'mj-2025',
    chronologicalIndex: 10,
    edexcelLabel: 'May/June 2025',
    edexcelShort: 'MJ 25',
    cambridgeLabel: 'May/June 2025',
    cambridgeShort: 'MJ 25',
    sessionKind: 'summer',
  },
  {
    id: 'jan-fm-2025',
    chronologicalIndex: 9,
    edexcelLabel: 'Jan 2025',
    edexcelShort: 'Jan 25',
    cambridgeLabel: 'Feb/Mar 2025',
    cambridgeShort: 'FM 25',
    sessionKind: 'winter',
  },
  {
    id: 'on-2024',
    chronologicalIndex: 8,
    edexcelLabel: 'Oct/Nov 2024',
    edexcelShort: 'ON 24',
    cambridgeLabel: 'Oct/Nov 2024',
    cambridgeShort: 'ON 24',
    sessionKind: 'autumn',
  },
  {
    id: 'mj-2024',
    chronologicalIndex: 7,
    edexcelLabel: 'May/June 2024',
    edexcelShort: 'MJ 24',
    cambridgeLabel: 'May/June 2024',
    cambridgeShort: 'MJ 24',
    sessionKind: 'summer',
  },
  {
    id: 'jan-fm-2024',
    chronologicalIndex: 6,
    edexcelLabel: 'Jan 2024',
    edexcelShort: 'Jan 24',
    cambridgeLabel: 'Feb/Mar 2024',
    cambridgeShort: 'FM 24',
    sessionKind: 'winter',
  },
  {
    id: 'on-2023',
    chronologicalIndex: 5,
    edexcelLabel: 'Oct/Nov 2023',
    edexcelShort: 'ON 23',
    cambridgeLabel: 'Oct/Nov 2023',
    cambridgeShort: 'ON 23',
    sessionKind: 'autumn',
  },
  {
    id: 'mj-2023',
    chronologicalIndex: 4,
    edexcelLabel: 'May/June 2023',
    edexcelShort: 'MJ 23',
    cambridgeLabel: 'May/June 2023',
    cambridgeShort: 'MJ 23',
    sessionKind: 'summer',
  },
  {
    id: 'jan-fm-2023',
    chronologicalIndex: 3,
    edexcelLabel: 'Jan 2023',
    edexcelShort: 'Jan 23',
    cambridgeLabel: 'Feb/Mar 2023',
    cambridgeShort: 'FM 23',
    sessionKind: 'winter',
  },
  {
    id: 'on-2022',
    chronologicalIndex: 2,
    edexcelLabel: 'Oct/Nov 2022',
    edexcelShort: 'ON 22',
    cambridgeLabel: 'Oct/Nov 2022',
    cambridgeShort: 'ON 22',
    sessionKind: 'autumn',
  },
  {
    id: 'mj-2022',
    chronologicalIndex: 1,
    edexcelLabel: 'May/June 2022',
    edexcelShort: 'MJ 22',
    cambridgeLabel: 'May/June 2022',
    cambridgeShort: 'MJ 22',
    sessionKind: 'summer',
  },
];

const BADGE_DEFINITIONS = [
  {
    id: 'badge_streak_7',
    title: '7-Day Amber Flame',
    description: 'Maintained daily revision momentum across 7 consecutive UTC calendar days.',
    criteriaLabel: '7-day study streak',
    xpReward: 100,
    category: 'streak' as const,
  },
  {
    id: 'badge_papers_5',
    title: 'Past Paper Marathoner',
    description: 'Logged 5+ official past papers with boundary-derived UMS/PUM reflections.',
    criteriaLabel: '5 papers logged',
    xpReward: 75,
    category: 'papers' as const,
  },
  {
    id: 'badge_mastery_10',
    title: 'Syllabus Completionist',
    description: 'Marked 10+ syllabus topics as Mastered in the interactive Topic Tracker.',
    criteriaLabel: '10 topics mastered',
    xpReward: 120,
    category: 'mastery' as const,
  },
  {
    id: 'badge_flow_sync_1',
    title: 'Timetable Synchronizer',
    description: 'Bridged at least 1 upcoming exam countdown directly into Flow Timetable.',
    criteriaLabel: '1 exam synced to Flow',
    xpReward: 50,
    category: 'sync' as const,
  },
  {
    id: 'badge_xp_500',
    title: 'Scholar Centurion',
    description: 'Accumulated 500+ total XP across Study trackers and Flow Pomodoro sessions.',
    criteriaLabel: '500 total XP',
    xpReward: 50,
    category: 'mastery' as const,
  },
] as const;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

function getUtcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getYesterdayUtcString(todayStr: string): string {
  const d = new Date(`${todayStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso);
  if (!match) return dateIso;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const monthName = MONTH_SHORT[monthIdx] ?? 'Jan';
  return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
}

function parseJsonValue<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

function normalizeFaculty(raw: string): StudySubjectFaculty {
  const lower = raw.toLowerCase();
  if (lower.includes('math')) return 'Mathematics';
  if (lower.includes('science')) return 'Sciences';
  if (lower.includes('comput') || lower.includes('econom') || lower.includes('humanit') || lower.includes('commerce')) {
    return lower.includes('lang') ? 'Languages & Humanities' : 'Computing & Economics';
  }
  if (lower.includes('lang')) return 'Languages & Humanities';
  return 'Computing & Economics';
}

export function resolveCanonicalSubjectId(
  rawId: string | null | undefined,
  knownSubjects: ReadonlyArray<{ id: string; code: string }>
): string {
  if (!rawId) return knownSubjects[0]?.id ?? 'edexcel-ial-maths';
  const cleaned = decodeURIComponent(rawId).trim();
  if (!cleaned) return knownSubjects[0]?.id ?? 'edexcel-ial-maths';

  const alias = SUBJECT_ALIASES[cleaned.toLowerCase()];
  if (alias && knownSubjects.some((s) => s.id === alias)) {
    return alias;
  }

  const exactId = knownSubjects.find((s) => s.id.toLowerCase() === cleaned.toLowerCase());
  if (exactId) return exactId.id;

  const byCode = knownSubjects.find((s) => s.code.toLowerCase() === cleaned.toLowerCase());
  if (byCode) return byCode.id;

  return knownSubjects[0]?.id ?? 'edexcel-ial-maths';
}

function extractShortCode(paperCode: string, unitCode: string): string {
  if (unitCode && unitCode.length <= 8 && /^W[A-Z]{2}\d{2}$/i.test(unitCode)) {
    const map: Record<string, string> = {
      WMA11: 'P1',
      WMA12: 'P2',
      WMA13: 'P3',
      WMA14: 'P4',
      WFM01: 'FP1',
      WFM02: 'FP2',
      WFM03: 'FP3',
      WME01: 'M1',
      WME02: 'M2',
      WME03: 'M3',
      WST01: 'S1',
      WST02: 'S2',
      WST03: 'S3',
      WDM11: 'D1',
    };
    if (map[unitCode.toUpperCase()]) return map[unitCode.toUpperCase()]!;
  }
  const paperMatch = /Paper\s*(\d+[A-Za-z]*)/i.exec(paperCode);
  if (paperMatch?.[1]) return `P${paperMatch[1]}`;
  return unitCode.slice(0, 8) || paperCode.slice(0, 8);
}

function mapPaperLevel(
  levelRaw: unknown,
  subjectType: string,
  title: string
): 'AS' | 'A2' | 'Core' | 'Extended' {
  const upper = `${String(levelRaw ?? '')} ${title}`.toUpperCase();
  if (upper.includes('CORE')) return 'Core';
  if (upper.includes('EXTENDED') || upper.includes('HIGHER')) return 'Extended';
  if (upper.includes('A2') || upper.includes('P3') || upper.includes('P4') || upper.includes('UNIT 4') || upper.includes('UNIT 5') || upper.includes('UNIT 6')) {
    return 'A2';
  }
  return subjectType === 'fixed_linear' ? 'Extended' : 'AS';
}

async function fetchPaperBoundariesChunked(
  db: ReturnType<typeof createDb>,
  paperIds: string[]
) {
  if (paperIds.length === 0) return [];
  const rows: Array<typeof paperGradeBoundaries.$inferSelect> = [];
  const CHUNK_SIZE = 40;
  for (let i = 0; i < paperIds.length; i += CHUNK_SIZE) {
    const chunk = paperIds.slice(i, i + CHUNK_SIZE);
    const batch = await db
      .select()
      .from(paperGradeBoundaries)
      .where(inArray(paperGradeBoundaries.pastPaperId, chunk));
    rows.push(...batch);
  }
  return rows;
}

/**
 * Idempotently awards XP to `user_xp_ledger`, updates `profiles.xp` and `user_streaks`,
 * and unlocks any newly reached `user_badges`.
 */
async function awardStudyXpAndStreaks(
  db: ReturnType<typeof createDb>,
  userId: string,
  params: {
    idempotencyKey: string;
    sourceType: string;
    sourceId: string;
    xpAmount: number;
    summary: string;
    touchStreak?: boolean;
  }
): Promise<{ xpAwardedNow: number; totalXp: number; streakDays: number }> {
  const timestamp = nowIso();
  const todayStr = getUtcDateString();
  const yesterdayStr = getYesterdayUtcString(todayStr);

  const [profileRow, streakRow] = await Promise.all([
    db
      .select({ xp: profiles.xp, streakDays: profiles.streakDays })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
    db
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.userId, userId))
      .limit(1),
  ]);

  let currentTotalXp = profileRow[0]?.xp ?? 0;
  let currentStreak = streakRow[0]?.currentStreakDays ?? profileRow[0]?.streakDays ?? 0;
  let longestStreak = streakRow[0]?.longestStreakDays ?? currentStreak;
  let xpAwardedNow = 0;

  if (params.xpAmount > 0) {
    const existingLedger = await db
      .select({ id: userXpLedger.id })
      .from(userXpLedger)
      .where(eq(userXpLedger.idempotencyKey, params.idempotencyKey))
      .limit(1);

    if (existingLedger.length === 0) {
      xpAwardedNow = params.xpAmount;
      currentTotalXp += xpAwardedNow;
      await db.insert(userXpLedger).values({
        id: generateId('xpl'),
        userId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        idempotencyKey: params.idempotencyKey,
        xpAmount: xpAwardedNow,
        summary: params.summary,
        createdAt: timestamp,
      });
    }
  }

  if (params.touchStreak !== false) {
    const prevDate = streakRow[0]?.lastActiveDateIso ?? null;
    if (prevDate === yesterdayStr) {
      currentStreak += 1;
    } else if (prevDate !== todayStr) {
      currentStreak = Math.max(1, currentStreak === 0 ? 1 : 1);
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    if (streakRow[0]) {
      await db
        .update(userStreaks)
        .set({
          currentStreakDays: currentStreak,
          longestStreakDays: longestStreak,
          lastActiveDateIso: todayStr,
          updatedAt: timestamp,
        })
        .where(eq(userStreaks.userId, userId));
    } else {
      await db.insert(userStreaks).values({
        id: generateId('stk'),
        userId,
        currentStreakDays: currentStreak,
        longestStreakDays: longestStreak,
        lastActiveDateIso: todayStr,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  if (xpAwardedNow > 0 || params.touchStreak !== false) {
    await db
      .update(profiles)
      .set({
        xp: currentTotalXp,
        streakDays: currentStreak,
        updatedAt: timestamp,
      })
      .where(eq(profiles.userId, userId));
  }

  await evaluateAndUnlockBadges(db, userId, {
    totalXp: currentTotalXp,
    streakDays: currentStreak,
  });

  return { xpAwardedNow, totalXp: currentTotalXp, streakDays: currentStreak };
}

async function evaluateAndUnlockBadges(
  db: ReturnType<typeof createDb>,
  userId: string,
  stats: { totalXp: number; streakDays: number }
): Promise<void> {
  const [existingBadges, paperCountRows, masteredTopicRows, flowExamRows] = await Promise.all([
    db
      .select({ badgeCode: userBadges.badgeCode })
      .from(userBadges)
      .where(eq(userBadges.userId, userId)),
    db
      .select({ id: userPastPaperRecords.id })
      .from(userPastPaperRecords)
      .where(eq(userPastPaperRecords.userId, userId)),
    db
      .select({ id: topicProgress.id })
      .from(topicProgress)
      .where(and(eq(topicProgress.userId, userId), eq(topicProgress.status, 'mastered'))),
    db
      .select({ id: examCountdowns.id, syncedToFlow: examCountdowns.syncedToFlow })
      .from(examCountdowns)
      .where(eq(examCountdowns.userId, userId)),
  ]);

  const owned = new Set(existingBadges.map((b) => b.badgeCode));
  const conditions: Record<string, boolean> = {
    badge_streak_7: stats.streakDays >= 7,
    badge_papers_5: paperCountRows.length >= 5,
    badge_mastery_10: masteredTopicRows.length >= 10,
    badge_flow_sync_1: flowExamRows.some((e) => Boolean(e.syncedToFlow)),
    badge_xp_500: stats.totalXp >= 500,
  };

  const timestamp = nowIso();
  for (const def of BADGE_DEFINITIONS) {
    if (!owned.has(def.id) && conditions[def.id]) {
      await db.insert(userBadges).values({
        id: generateId('ubg'),
        userId,
        badgeCode: def.id,
        title: def.title,
        description: def.description,
        awardedAtIso: timestamp,
      });
    }
  }
}

async function loadUserMathsSuiteState(
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<StudyMathsSuiteStateDto> {
  const [cashInRows, selectionRows] = await Promise.all([
    db
      .select()
      .from(userCashInEnrollments)
      .where(
        and(
          eq(userCashInEnrollments.userId, userId),
          eq(userCashInEnrollments.subjectId, 'edexcel-ial-maths')
        )
      ),
    db
      .select()
      .from(userComponentSelections)
      .where(eq(userComponentSelections.userId, userId)),
  ]);

  const unitsByCashIn: Record<EdexcelMathsCashInCode, EdexcelMathsUnitCode[]> = {
    XMA01: [...DEFAULT_MATHS_UNITS_BY_CASH_IN.XMA01],
    YMA01: [...DEFAULT_MATHS_UNITS_BY_CASH_IN.YMA01],
    XFM01: [...DEFAULT_MATHS_UNITS_BY_CASH_IN.XFM01],
    YFM01: [...DEFAULT_MATHS_UNITS_BY_CASH_IN.YFM01],
  };

  if (cashInRows.length > 0) {
    const selectionsByCashInId = new Map<string, EdexcelMathsUnitCode[]>();
    for (const sel of selectionRows) {
      if ((EDEXCEL_MATHS_UNIT_CODES as readonly string[]).includes(sel.unitCode)) {
        const list = selectionsByCashInId.get(sel.cashInEnrollmentId) ?? [];
        list.push(sel.unitCode as EdexcelMathsUnitCode);
        selectionsByCashInId.set(sel.cashInEnrollmentId, list);
      }
    }
    for (const ci of cashInRows) {
      const units = selectionsByCashInId.get(ci.id);
      if (units && units.length > 0) {
        unitsByCashIn[ci.cashInCode] = Array.from(new Set(units));
      }
    }
  }

  const enrolledCashIns: EdexcelMathsCashInCode[] =
    cashInRows.length > 0
      ? Array.from(new Set(cashInRows.map((c) => c.cashInCode)))
      : ['YMA01'];

  const activeCashIn: EdexcelMathsCashInCode = enrolledCashIns.includes('YMA01')
    ? 'YMA01'
    : enrolledCashIns[0] ?? 'YMA01';

  return {
    activeCashIn,
    enrolledCashIns,
    unitsByCashIn,
    validationByCashIn: {
      XMA01: validateEdexcelMathsCashIn('XMA01', unitsByCashIn.XMA01),
      YMA01: validateEdexcelMathsCashIn('YMA01', unitsByCashIn.YMA01),
      XFM01: validateEdexcelMathsCashIn('XFM01', unitsByCashIn.XFM01, unitsByCashIn.YMA01),
      YFM01: validateEdexcelMathsCashIn('YFM01', unitsByCashIn.YFM01, unitsByCashIn.YMA01),
    },
  };
}

async function resolveUserActiveBoard(
  db: ReturnType<typeof createDb>,
  userId: string
): Promise<CurriculumBoardId> {
  const [studentRows, userCurrRows, currRows] = await Promise.all([
    db
      .select({ activeBoardId: studentProfiles.activeBoardId })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1),
    db
      .select()
      .from(userCurriculums)
      .where(eq(userCurriculums.userId, userId)),
    db.select().from(curriculums),
  ]);

  const primaryCurr = userCurrRows.find((u) => u.isPrimary) ?? userCurrRows[0];
  if (primaryCurr) {
    const matched = currRows.find((c) => c.id === primaryCurr.curriculumId);
    if (matched) return matched.code as CurriculumBoardId;
  }
  return studentRows[0]?.activeBoardId ?? 'edexcel-ial';
}

async function buildCatalogSubjects(
  db: ReturnType<typeof createDb>,
  userId?: string
): Promise<{
  boards: StudyBoardDto[];
  subjects: StudyCatalogSubjectDto[];
}> {
  const [currRows, subjectRows, paperRows, topicRows, progressRows] = await Promise.all([
    db
      .select()
      .from(curriculums)
      .where(eq(curriculums.isActive, true))
      .orderBy(asc(curriculums.displayOrder)),
    db.select().from(subjects).where(eq(subjects.isActive, true)),
    db.select().from(pastPapers),
    db.select().from(topics).orderBy(asc(topics.displayOrder)),
    userId
      ? db
          .select({
            topicId: topicProgress.topicId,
            status: topicProgress.status,
          })
          .from(topicProgress)
          .where(eq(topicProgress.userId, userId))
      : Promise.resolve([]),
  ]);

  const curriculumById = new Map(currRows.map((c) => [c.id, c]));
  const progressStatusByTopicId = new Map(progressRows.map((p) => [p.topicId, p.status]));

  const papersBySubject = new Map<string, Array<typeof pastPapers.$inferSelect>>();
  for (const p of paperRows) {
    const list = papersBySubject.get(p.subjectId) ?? [];
    list.push(p);
    papersBySubject.set(p.subjectId, list);
  }

  const topicsBySubject = new Map<string, Array<typeof topics.$inferSelect>>();
  for (const t of topicRows) {
    const list = topicsBySubject.get(t.subjectId) ?? [];
    list.push(t);
    topicsBySubject.set(t.subjectId, list);
  }

  const boards: StudyBoardDto[] = currRows.map((c) => ({
    id: c.code as CurriculumBoardId,
    label: c.label,
    shortLabel: c.shortLabel,
    qualificationLevel: c.qualificationLevel,
    gradingScaleLabel:
      c.code === 'edexcel-igcse'
        ? '9 – 1 Numeric Scale'
        : c.code === 'edexcel-ial'
          ? 'A* – U (UMS 300 / 600)'
          : c.code === 'cambridge-alevel'
            ? 'A* – U (PUM)'
            : 'A* – G',
    summary: c.summary,
  }));

  const enriched: Array<{ order: number; dto: StudyCatalogSubjectDto }> = [];

  for (const subj of subjectRows) {
    const curr = curriculumById.get(subj.curriculumId);
    if (!curr) continue;
    const boardId = curr.code as CurriculumBoardId;
    const qualData = parseJsonValue<Record<string, unknown>>(subj.qualificationDataJson, {});
    const paperMeta = (qualData.paperMeta as Record<string, { order?: number; level?: string }> | undefined) ?? {};
    const displayOrder = typeof qualData.displayOrder === 'number' ? qualData.displayOrder : 999;

    const subjPapers = [...(papersBySubject.get(subj.id) ?? [])].sort((a, b) => {
      const ordA = paperMeta[a.id]?.order ?? 999;
      const ordB = paperMeta[b.id]?.order ?? 999;
      if (ordA !== ordB) return ordA - ordB;
      return a.paperCode.localeCompare(b.paperCode);
    });

    const units: StudySubjectUnitDto[] = subjPapers.map((p) => {
      const metaLevel = paperMeta[p.id]?.level;
      return {
        code: p.unitCode,
        shortCode: extractShortCode(p.paperCode, p.unitCode),
        title: p.title,
        level: mapPaperLevel(metaLevel, subj.subjectType, p.title),
        ...(p.maxUms ? { maxUms: p.maxUms } : {}),
        maxRaw: p.maxRaw,
        durationMinutes: p.durationMinutes,
        compulsory: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WFM01'].includes(p.unitCode),
      };
    });

    const subjTopics = topicsBySubject.get(subj.id) ?? [];
    const sampleTopics = subjTopics.slice(0, 6).map((t) => {
      const subtopics = parseJsonValue<Array<{ id: string }>>(t.subtopicsJson, []);
      return {
        code: t.code,
        unitCode: t.unitCode,
        title: t.title,
        subtopicCount: subtopics.length,
        status: progressStatusByTopicId.get(t.id) ?? 'not_started',
      };
    });

    enriched.push({
      order: displayOrder,
      dto: {
        id: subj.id,
        code: subj.code,
        boardId,
        boardLabel: curr.shortLabel,
        title: subj.title,
        faculty: normalizeFaculty(subj.faculty),
        subjectType: subj.subjectType,
        gradingScale: subj.gradingScale,
        ...(subj.totalUms ? { totalUms: subj.totalUms } : {}),
        totalRawMarks: subj.totalRawMarks,
        topicCount: subjTopics.length,
        paperCount: subjPapers.length,
        examSessionWindow: subj.examSessionWindow,
        summary: subj.summary,
        defaultEnrolled: false,
        defaultTargetGrade: subj.gradingScale === '9-1' ? '9' : 'A*',
        units,
        sampleTopics,
      },
    });
  }

  enriched.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.dto.title.localeCompare(b.dto.title);
  });

  return { boards, subjects: enriched.map((e) => e.dto) };
}

/**
 * Materializes upcoming official `exam_schedules` for an enrolled subject into `exam_countdowns`
 * if not already created for that user.
 */
async function syncOfficialCountdownsForSubject(
  db: ReturnType<typeof createDb>,
  userId: string,
  subjectId: string,
  targetGrade: string
): Promise<void> {
  const [subjRows, currRows, examRows, existingCountdowns] = await Promise.all([
    db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1),
    db.select().from(curriculums),
    db.select().from(exams).where(eq(exams.subjectId, subjectId)),
    db
      .select({ examScheduleId: examCountdowns.examScheduleId })
      .from(examCountdowns)
      .where(and(eq(examCountdowns.userId, userId), eq(examCountdowns.subjectId, subjectId))),
  ]);

  const subj = subjRows[0];
  if (!subj || examRows.length === 0) return;
  const curr = currRows.find((c) => c.id === subj.curriculumId);
  if (!curr) return;

  const examIds = examRows.map((e) => e.id);
  const schedRows: Array<typeof examSchedules.$inferSelect> = [];
  for (let i = 0; i < examIds.length; i += 40) {
    const chunk = examIds.slice(i, i + 40);
    const batch = await db
      .select()
      .from(examSchedules)
      .where(inArray(examSchedules.examId, chunk));
    schedRows.push(...batch);
  }

  const existingSchedIds = new Set(
    existingCountdowns.map((c) => c.examScheduleId).filter(Boolean)
  );
  const examById = new Map(examRows.map((e) => [e.id, e]));
  const timestamp = nowIso();

  for (const sched of schedRows) {
    if (existingSchedIds.has(sched.id)) continue;
    const exam = examById.get(sched.examId);
    if (!exam) continue;
    await db.insert(examCountdowns).values({
      id: generateId('exc'),
      userId,
      subjectId,
      examScheduleId: sched.id,
      boardId: curr.code as CurriculumBoardId,
      paperCode: exam.paperCode,
      title: exam.title,
      examDateIso: sched.examDateIso,
      examTime24h: sched.examTime24h,
      targetGrade,
      category: 'official',
      isCustom: false,
      isMock: false,
      colorTag: 'amber',
      isPinned: false,
      syncedToFlow: false,
      venueOrNotes: `${sched.seriesLabel} · ${sched.sessionWindow} (${exam.durationMinutes} min)`,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}

// ============================================================================
// [THAW-4.1] Curriculum Catalog, Enrollment & WMA11-SET Rule Engine
// ============================================================================

export async function getStudyCatalog(
  d1: D1Database,
  userId: string
): Promise<StudyCatalogResponseDto> {
  const db = createDb(d1);
  const [{ boards, subjects: catalogSubjects }, activeBoard, enrollments, mathsSuite] =
    await Promise.all([
      buildCatalogSubjects(db, userId),
      resolveUserActiveBoard(db, userId),
      db
        .select()
        .from(userEnrollments)
        .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.isActive, true))),
      loadUserMathsSuiteState(db, userId),
    ]);

  const enrolledSubjectIds = enrollments.map((e) => e.subjectId);
  const targetGradeBySubjectId: Record<string, string> = {};
  for (const s of catalogSubjects) {
    targetGradeBySubjectId[s.id] = s.defaultTargetGrade;
  }
  for (const e of enrollments) {
    targetGradeBySubjectId[e.subjectId] = e.targetGrade;
  }

  return {
    boards,
    subjects: catalogSubjects,
    activeBoard,
    enrolledSubjectIds,
    targetGradeBySubjectId,
    mathsSuite,
  };
}

export async function updateStudyActiveBoard(
  d1: D1Database,
  userId: string,
  input: StudyUpdateBoardInput
): Promise<{ activeBoard: CurriculumBoardId }> {
  const db = createDb(d1);
  const timestamp = nowIso();
  const [currRows, studentRows, existingCurrRows] = await Promise.all([
    db.select().from(curriculums).where(eq(curriculums.code, input.boardId)).limit(1),
    db.select({ id: studentProfiles.id }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1),
    db.select().from(userCurriculums).where(eq(userCurriculums.userId, userId)),
  ]);

  const curr = currRows[0];
  if (!curr) {
    throw new StudyServiceError(404, 'CURRICULUM_NOT_FOUND', 'Examination board was not found.');
  }

  if (studentRows[0]) {
    await db
      .update(studentProfiles)
      .set({ activeBoardId: input.boardId, updatedAt: timestamp })
      .where(eq(studentProfiles.userId, userId));
  } else {
    await db.insert(studentProfiles).values({
      id: generateId('stp'),
      userId,
      activeBoardId: input.boardId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  await db
    .update(profiles)
    .set({ curriculumLabel: curr.shortLabel, updatedAt: timestamp })
    .where(eq(profiles.userId, userId));

  for (const row of existingCurrRows) {
    await db
      .update(userCurriculums)
      .set({ isPrimary: row.curriculumId === curr.id, updatedAt: timestamp })
      .where(eq(userCurriculums.id, row.id));
  }

  if (!existingCurrRows.some((r) => r.curriculumId === curr.id)) {
    await db.insert(userCurriculums).values({
      id: generateId('ucr'),
      userId,
      curriculumId: curr.id,
      isPrimary: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return { activeBoard: input.boardId };
}

export async function toggleStudySubjectEnrollment(
  d1: D1Database,
  userId: string,
  input: StudyToggleEnrollmentInput
): Promise<{
  subjectId: string;
  enrolled: boolean;
  enrolledSubjectIds: string[];
  targetGrade: string;
}> {
  const db = createDb(d1);
  const allSubjects = await db.select({ id: subjects.id, code: subjects.code, gradingScale: subjects.gradingScale }).from(subjects);
  const canonicalSubjectId = resolveCanonicalSubjectId(input.subjectId, allSubjects);
  const subj = allSubjects.find((s) => s.id === canonicalSubjectId);
  if (!subj) {
    throw new StudyServiceError(404, 'SUBJECT_NOT_FOUND', 'Subject was not found.');
  }

  const defaultGrade = subj.gradingScale === '9-1' ? '9' : 'A*';
  const targetGrade = input.targetGrade ?? defaultGrade;
  const timestamp = nowIso();

  const existing = await db
    .select()
    .from(userEnrollments)
    .where(
      and(
        eq(userEnrollments.userId, userId),
        eq(userEnrollments.subjectId, canonicalSubjectId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(userEnrollments)
      .set({
        isActive: input.enrolled,
        ...(input.targetGrade ? { targetGrade: input.targetGrade } : {}),
        updatedAt: timestamp,
      })
      .where(eq(userEnrollments.id, existing[0].id));
  } else if (input.enrolled) {
    await db.insert(userEnrollments).values({
      id: generateId('uen'),
      userId,
      subjectId: canonicalSubjectId,
      targetGrade,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  if (input.enrolled) {
    await syncOfficialCountdownsForSubject(db, userId, canonicalSubjectId, existing[0]?.targetGrade ?? targetGrade);
  } else {
    // Clean up non-custom, non-pinned official countdowns for unenrolled subjects
    await db
      .delete(examCountdowns)
      .where(
        and(
          eq(examCountdowns.userId, userId),
          eq(examCountdowns.subjectId, canonicalSubjectId),
          eq(examCountdowns.isCustom, false),
          eq(examCountdowns.isPinned, false)
        )
      );
  }

  const activeRows = await db
    .select({ subjectId: userEnrollments.subjectId })
    .from(userEnrollments)
    .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.isActive, true)));

  return {
    subjectId: canonicalSubjectId,
    enrolled: input.enrolled,
    enrolledSubjectIds: activeRows.map((r) => r.subjectId),
    targetGrade: existing[0]?.targetGrade ?? targetGrade,
  };
}

export async function updateStudySubjectTargetGrade(
  d1: D1Database,
  userId: string,
  input: StudyUpdateTargetGradeInput
): Promise<{ subjectId: string; targetGrade: string }> {
  const db = createDb(d1);
  const allSubjects = await db.select({ id: subjects.id, code: subjects.code }).from(subjects);
  const canonicalSubjectId = resolveCanonicalSubjectId(input.subjectId, allSubjects);
  const timestamp = nowIso();

  const existing = await db
    .select()
    .from(userEnrollments)
    .where(
      and(
        eq(userEnrollments.userId, userId),
        eq(userEnrollments.subjectId, canonicalSubjectId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(userEnrollments)
      .set({ targetGrade: input.targetGrade, updatedAt: timestamp })
      .where(eq(userEnrollments.id, existing[0].id));
  } else {
    await db.insert(userEnrollments).values({
      id: generateId('uen'),
      userId,
      subjectId: canonicalSubjectId,
      targetGrade: input.targetGrade,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return { subjectId: canonicalSubjectId, targetGrade: input.targetGrade };
}

export async function updateStudyMathsSuite(
  d1: D1Database,
  userId: string,
  input: StudyUpdateMathsSuiteInput
): Promise<StudyMathsSuiteMutationResponseDto> {
  const db = createDb(d1);
  const timestamp = nowIso();

  const activeUnits = input.unitsByCashIn[input.activeCashIn] ?? [];
  const isFurther = input.activeCashIn === 'XFM01' || input.activeCashIn === 'YFM01';
  const primaryMathsUnits = isFurther
    ? (input.enrolledCashIns.includes('YMA01')
        ? input.unitsByCashIn.YMA01
        : input.enrolledCashIns.includes('XMA01')
          ? input.unitsByCashIn.XMA01
          : [])
    : [];

  const activeValidation = validateEdexcelMathsCashIn(
    input.activeCashIn,
    activeUnits,
    primaryMathsUnits
  );

  const routeRows = await db
    .select()
    .from(subjectComponentRoutes)
    .where(eq(subjectComponentRoutes.subjectId, 'edexcel-ial-maths'));
  const routeIdByCashIn = new Map(routeRows.map((r) => [r.cashInCode, r.id]));

  // Delete old selections & cash-in enrollments for edexcel-ial-maths and write clean normalized state
  const oldCashIns = await db
    .select({ id: userCashInEnrollments.id })
    .from(userCashInEnrollments)
    .where(
      and(
        eq(userCashInEnrollments.userId, userId),
        eq(userCashInEnrollments.subjectId, 'edexcel-ial-maths')
      )
    );

  for (const old of oldCashIns) {
    await db
      .delete(userComponentSelections)
      .where(eq(userComponentSelections.cashInEnrollmentId, old.id));
  }

  await db
    .delete(userCashInEnrollments)
    .where(
      and(
        eq(userCashInEnrollments.userId, userId),
        eq(userCashInEnrollments.subjectId, 'edexcel-ial-maths')
      )
    );

  const uniqueCashIns = Array.from(new Set(input.enrolledCashIns));
  for (const code of uniqueCashIns) {
    if (!(EDEXCEL_MATHS_CASH_IN_CODES as readonly string[]).includes(code)) continue;
    const unitsForAward = input.unitsByCashIn[code] ?? [];
    const check = validateEdexcelMathsCashIn(
      code,
      unitsForAward,
      code === 'XFM01' || code === 'YFM01' ? input.unitsByCashIn.YMA01 : []
    );

    const cashInEnrollmentId = generateId('uci');
    await db.insert(userCashInEnrollments).values({
      id: cashInEnrollmentId,
      userId,
      subjectId: 'edexcel-ial-maths',
      routeId: routeIdByCashIn.get(code) ?? null,
      cashInCode: code,
      targetGrade: 'A*',
      isValidCombination: check.isValid,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const compulsorySet = COMPULSORY_MATHS_UNITS_SET[code];
    for (const unitCode of Array.from(new Set(unitsForAward))) {
      await db.insert(userComponentSelections).values({
        id: generateId('ucs'),
        cashInEnrollmentId,
        userId,
        unitCode,
        isCompulsory: compulsorySet.has(unitCode),
        targetUms: 90,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  // Ensure user is enrolled in edexcel-ial-maths
  const existingEnrollment = await db
    .select({ id: userEnrollments.id })
    .from(userEnrollments)
    .where(
      and(
        eq(userEnrollments.userId, userId),
        eq(userEnrollments.subjectId, 'edexcel-ial-maths')
      )
    )
    .limit(1);

  if (!existingEnrollment[0]) {
    await db.insert(userEnrollments).values({
      id: generateId('uen'),
      userId,
      subjectId: 'edexcel-ial-maths',
      targetGrade: 'A*',
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  } else {
    await db
      .update(userEnrollments)
      .set({ isActive: true, updatedAt: timestamp })
      .where(eq(userEnrollments.id, existingEnrollment[0].id));
  }

  const [mathsSuite, activeEnrollments] = await Promise.all([
    loadUserMathsSuiteState(db, userId),
    db
      .select({ subjectId: userEnrollments.subjectId })
      .from(userEnrollments)
      .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.isActive, true))),
  ]);

  return {
    mathsSuite: {
      ...mathsSuite,
      activeCashIn: input.activeCashIn,
    },
    validation: activeValidation,
    enrolledSubjectIds: activeEnrollments.map((r) => r.subjectId),
  };
}

// ============================================================================
// [THAW-4.2] Syllabus Topic Tracker
// ============================================================================

export async function getStudyTopicsState(
  d1: D1Database,
  userId: string,
  requestedSubjectId?: string
): Promise<StudyTopicsResponseDto> {
  const db = createDb(d1);
  const [{ subjects: catalogSubjects }, topicRows, progressRows, profileRows, mathsSuite] =
    await Promise.all([
      buildCatalogSubjects(db, userId),
      db.select().from(topics).orderBy(asc(topics.displayOrder)),
      db.select().from(topicProgress).where(eq(topicProgress.userId, userId)),
      db
        .select({ xp: profiles.xp, streakDays: profiles.streakDays })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1),
      loadUserMathsSuiteState(db, userId),
    ]);

  const selectedSubjectId = resolveCanonicalSubjectId(requestedSubjectId, catalogSubjects);
  const filteredTopicRows = topicRows.filter((t) => t.subjectId === selectedSubjectId);

  const progressByTopicId = new Map(progressRows.map((p) => [p.topicId, p]));
  const completedSubtopicIds: string[] = [];
  const statusOverrideByTopicId: Record<string, TopicConfidenceStatus> = {};
  const notesByTopicId: Record<string, string> = {};
  const xpAwardedTopicIds: string[] = [];

  for (const p of progressRows) {
    const subs = parseJsonValue<string[]>(p.completedSubtopicIdsJson, []);
    completedSubtopicIds.push(...subs);
    if (p.status !== 'not_started' || subs.length === 0) {
      statusOverrideByTopicId[p.topicId] = p.status;
    }
    if (p.personalNote) {
      notesByTopicId[p.topicId] = p.personalNote;
    }
    if (p.xpAwarded) {
      xpAwardedTopicIds.push(p.topicId);
    }
  }

  const mappedTopics: StudyTopicDto[] = filteredTopicRows.map((t) => {
    const rawSubs = parseJsonValue<Array<{ id: string; code: string; title: string }>>(
      t.subtopicsJson,
      []
    );
    const keyFormulas = parseJsonValue<string[]>(t.keyFormulasJson, []);
    const prog = progressByTopicId.get(t.id);
    const doneSet = new Set(
      parseJsonValue<string[]>(prog?.completedSubtopicIdsJson, [])
    );

    return {
      id: t.id,
      subjectId: t.subjectId,
      unitCode: t.unitCode,
      unitLabel: t.unitLabel,
      code: t.code,
      title: t.title,
      difficulty: t.difficulty as TopicDifficulty,
      estimatedMinutes: t.estimatedMinutes,
      keyFormulasAndPitfalls: keyFormulas,
      defaultStatus: prog?.status ?? 'not_started',
      ...(prog?.personalNote ? { defaultNote: prog.personalNote } : {}),
      subtopics: rawSubs.map((s) => ({
        id: s.id,
        code: s.code,
        title: s.title,
        defaultCompleted: doneSet.has(s.id),
      })),
    };
  });

  return {
    subjects: catalogSubjects,
    topics: mappedTopics,
    selectedSubjectId,
    completedSubtopicIds: Array.from(new Set(completedSubtopicIds)),
    statusOverrideByTopicId,
    notesByTopicId,
    xpAwardedTopicIds,
    activeMathsCashIn: mathsSuite.activeCashIn,
    activeMathsUnits: mathsSuite.unitsByCashIn[mathsSuite.activeCashIn] ?? [],
    totalXp: profileRows[0]?.xp ?? 0,
    streakDays: profileRows[0]?.streakDays ?? 0,
  };
}

export async function upsertStudyTopicProgress(
  d1: D1Database,
  userId: string,
  topicId: string,
  input: StudyUpsertTopicProgressInput
): Promise<StudyTopicProgressMutationResponseDto> {
  const db = createDb(d1);
  const topicRows = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
  const topic = topicRows[0];
  if (!topic) {
    throw new StudyServiceError(404, 'TOPIC_NOT_FOUND', 'Syllabus topic was not found.');
  }

  const existingRows = await db
    .select()
    .from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)))
    .limit(1);

  const existing = existingRows[0];
  const subtopicsDef = parseJsonValue<Array<{ id: string }>>(topic.subtopicsJson, []);
  const completedSubtopicIds =
    input.completedSubtopicIds ??
    parseJsonValue<string[]>(existing?.completedSubtopicIdsJson, []);

  let derivedStatus: TopicConfidenceStatus =
    input.status ?? existing?.status ?? 'not_started';

  if (input.status === undefined && input.completedSubtopicIds !== undefined) {
    if (completedSubtopicIds.length === 0) {
      derivedStatus = 'not_started';
    } else if (subtopicsDef.length > 0 && completedSubtopicIds.length >= subtopicsDef.length) {
      derivedStatus = 'mastered';
    } else {
      derivedStatus = 'in_progress';
    }
  }

  const personalNote = input.personalNote ?? existing?.personalNote ?? '';
  const timestamp = nowIso();
  const shouldMarkXpFlag = derivedStatus === 'mastered' || Boolean(existing?.xpAwarded);

  if (existing) {
    await db
      .update(topicProgress)
      .set({
        completedSubtopicIdsJson: completedSubtopicIds,
        status: derivedStatus,
        personalNote,
        xpAwarded: shouldMarkXpFlag,
        lastStudiedAtIso: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(topicProgress.id, existing.id));
  } else {
    await db.insert(topicProgress).values({
      id: generateId('tpg'),
      userId,
      subjectId: topic.subjectId,
      topicId: topic.id,
      status: derivedStatus,
      completedSubtopicIdsJson: completedSubtopicIds,
      personalNote,
      xpAwarded: shouldMarkXpFlag,
      lastStudiedAtIso: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const xpResult = await awardStudyXpAndStreaks(db, userId, {
    idempotencyKey: `topic-mastered:${userId}:${topic.id}`,
    sourceType: 'topic_mastered',
    sourceId: topic.id,
    xpAmount: derivedStatus === 'mastered' ? TOPIC_MASTERY_XP : 0,
    summary: `Mastered ${topic.code} — ${topic.title}`,
    touchStreak: true,
  });

  return {
    topicId: topic.id,
    subjectId: topic.subjectId,
    status: derivedStatus,
    completedSubtopicIds,
    personalNote,
    xpAwardedNow: xpResult.xpAwardedNow,
    totalXp: xpResult.totalXp,
    streakDays: xpResult.streakDays,
  };
}

// ============================================================================
// [THAW-4.3] Past Paper Tracker
// ============================================================================

function parseSeriesVariantKey(rawSeriesId: string): { seriesId: string; variant?: string } {
  const idx = rawSeriesId.indexOf(':');
  if (idx === -1) return { seriesId: rawSeriesId };
  const seriesId = rawSeriesId.slice(0, idx);
  const variant = rawSeriesId.slice(idx + 1).trim();
  return variant ? { seriesId, variant } : { seriesId };
}

function normalizeVariantGroup(
  rawGroup: string,
  variantLabel?: string
): 'v1' | 'v2' | 'v3' | 'main' | 'regional' {
  const val = (variantLabel ?? rawGroup).toLowerCase();
  if (val === 'v1' || val === 'variant 1') return 'v1';
  if (val === 'v2' || val === 'variant 2') return 'v2';
  if (val === 'v3' || val === 'variant 3') return 'v3';
  if (val === 'r' || val === 'regional') return 'regional';
  return 'main';
}

function derivePaperGradeAndUms(params: {
  rawScore: number;
  maxRaw: number;
  maxUms: number | null;
  isModularUms: boolean;
  gradingScale: GradingScale;
  thresholds: Record<string, number>;
}): {
  percentage: number;
  derivedGrade: string;
  derivedUmsOrPum: number;
  umsOrPumLabel: 'UMS' | 'PUM';
} {
  const rawScore = Math.max(0, Math.min(params.maxRaw, Math.round(params.rawScore)));
  const percentage =
    params.maxRaw > 0 ? Math.round((rawScore / params.maxRaw) * 100) : 0;

  const order =
    params.gradingScale === '9-1' ? NINE_TO_ONE_GRADE_ORDER : A_LEVEL_GRADE_ORDER;
  const targetScale = params.isModularUms && params.maxUms ? params.maxUms : 100;
  const umsOrPumLabel: 'UMS' | 'PUM' = params.isModularUms ? 'UMS' : 'PUM';

  const stops = order
    .filter((g) => typeof params.thresholds[g] === 'number')
    .map((g) => ({
      grade: g,
      minRaw: params.thresholds[g]!,
      umsOrPum: Math.round(((UMS_ANCHOR_PERCENT_BY_GRADE[g] ?? 40) / 100) * targetScale),
    }));

  let derivedGrade = 'U';
  for (const stop of stops) {
    if (rawScore >= stop.minRaw) {
      derivedGrade = stop.grade;
      break;
    }
  }

  let normalized = 0;
  if (stops.length === 0 || params.maxRaw <= 0) {
    normalized = Math.round((rawScore / Math.max(1, params.maxRaw)) * targetScale);
  } else {
    const topStop = stops[0]!;
    const bottomStop = stops[stops.length - 1]!;
    if (rawScore >= topStop.minRaw) {
      const span = Math.max(1, params.maxRaw - topStop.minRaw);
      const frac = Math.min(1, (rawScore - topStop.minRaw) / span);
      normalized = Math.round(topStop.umsOrPum + frac * (targetScale - topStop.umsOrPum));
    } else if (rawScore < bottomStop.minRaw) {
      const frac = rawScore / Math.max(1, bottomStop.minRaw);
      normalized = Math.round(frac * bottomStop.umsOrPum);
    } else {
      normalized = bottomStop.umsOrPum;
      for (let i = 0; i < stops.length - 1; i += 1) {
        const upper = stops[i]!;
        const lower = stops[i + 1]!;
        if (rawScore >= lower.minRaw && rawScore < upper.minRaw) {
          const span = Math.max(1, upper.minRaw - lower.minRaw);
          const frac = (rawScore - lower.minRaw) / span;
          normalized = Math.round(
            lower.umsOrPum + frac * (upper.umsOrPum - lower.umsOrPum)
          );
          break;
        }
      }
    }
  }

  return {
    percentage,
    derivedGrade,
    derivedUmsOrPum: Math.max(0, Math.min(targetScale, normalized)),
    umsOrPumLabel,
  };
}

export async function getStudyPastPapersState(
  d1: D1Database,
  userId: string,
  requestedSubjectId?: string
): Promise<StudyPastPapersResponseDto> {
  const db = createDb(d1);
  const [
    { subjects: catalogSubjects },
    enrollmentRows,
    profileRows,
    mathsSuite,
    recordRows,
    xpLedgerRows,
  ] = await Promise.all([
    buildCatalogSubjects(db, userId),
    db
      .select({ subjectId: userEnrollments.subjectId })
      .from(userEnrollments)
      .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.isActive, true))),
    db
      .select({ xp: profiles.xp, streakDays: profiles.streakDays })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
    loadUserMathsSuiteState(db, userId),
    db
      .select()
      .from(userPastPaperRecords)
      .where(eq(userPastPaperRecords.userId, userId))
      .orderBy(desc(userPastPaperRecords.attemptedAtIso)),
    db
      .select({ sourceType: userXpLedger.sourceType, xpAmount: userXpLedger.xpAmount })
      .from(userXpLedger)
      .where(eq(userXpLedger.userId, userId)),
  ]);

  const selectedSubjectId = resolveCanonicalSubjectId(requestedSubjectId, catalogSubjects);
  const selectedSubject = catalogSubjects.find((s) => s.id === selectedSubjectId);

  const dbPapers = await db
    .select()
    .from(pastPapers)
    .where(eq(pastPapers.subjectId, selectedSubjectId));
  const boundaryRows = await fetchPaperBoundariesChunked(
    db,
    dbPapers.map((p) => p.id)
  );

  const boundariesByPaperId = new Map<string, Array<typeof paperGradeBoundaries.$inferSelect>>();
  for (const b of boundaryRows) {
    const list = boundariesByPaperId.get(b.pastPaperId) ?? [];
    list.push(b);
    boundariesByPaperId.set(b.pastPaperId, list);
  }

  const rows: StudyPastPaperRowDto[] = [];
  for (const p of dbPapers) {
    const pBounds = boundariesByPaperId.get(p.id) ?? [];
    const variantsFound = new Set<string>();
    for (const b of pBounds) {
      const { variant } = parseSeriesVariantKey(b.seriesId);
      if (variant) variantsFound.add(variant);
    }

    const variantsToEmit =
      variantsFound.size > 0 ? Array.from(variantsFound) : ['__default__'];

    const isModularUms = Boolean(p.maxUms) && selectedSubject?.boardId === 'edexcel-ial';
    const gradingScale: GradingScale = selectedSubject?.gradingScale ?? 'A*-U';
    const availableBase = parseJsonValue<string[]>(p.availableSeriesJson, []);

    for (const variantKey of variantsToEmit) {
      const seriesBoundaries: Record<string, { thresholds: Record<string, number> }> = {};
      for (const b of pBounds) {
        const parsedKey = parseSeriesVariantKey(b.seriesId);
        if (
          variantKey === '__default__' ||
          parsedKey.variant === variantKey ||
          !parsedKey.variant
        ) {
          const thresh = parseJsonValue<Record<string, number>>(b.thresholdsJson, {});
          seriesBoundaries[parsedKey.seriesId] = { thresholds: thresh };
          // Also map jan-fm alias cleanly for unified matrix columns
          if (parsedKey.seriesId === 'jan-2025' || parsedKey.seriesId === 'fm-2025') {
            seriesBoundaries['jan-fm-2025'] = { thresholds: thresh };
          }
          if (parsedKey.seriesId === 'jan-2024' || parsedKey.seriesId === 'fm-2024') {
            seriesBoundaries['jan-fm-2024'] = { thresholds: thresh };
          }
          if (parsedKey.seriesId === 'jan-2023' || parsedKey.seriesId === 'fm-2023') {
            seriesBoundaries['jan-fm-2023'] = { thresholds: thresh };
          }
        }
      }

      const mappedAvailable = new Set<string>();
      for (const sId of availableBase) {
        if (sId === 'jan-2025' || sId === 'fm-2025') mappedAvailable.add('jan-fm-2025');
        else if (sId === 'jan-2024' || sId === 'fm-2024') mappedAvailable.add('jan-fm-2024');
        else if (sId === 'jan-2023' || sId === 'fm-2023') mappedAvailable.add('jan-fm-2023');
        else mappedAvailable.add(sId);
      }

      const variantLabel = variantKey === '__default__' ? '' : variantKey;
      const rowId = variantLabel ? `${p.id}::${variantLabel}` : p.id;
      const paperCode = variantLabel ? `${p.paperCode} · ${variantLabel}` : p.paperCode;
      const vGroup = normalizeVariantGroup(p.variantGroup, variantLabel);
      const vBadge =
        variantLabel === 'R'
          ? 'Regional (R)'
          : variantLabel
            ? variantLabel
            : p.variantBadge;

      rows.push({
        id: rowId,
        subjectId: p.subjectId,
        boardId: selectedSubject?.boardId ?? 'edexcel-ial',
        unitCode: p.unitCode,
        paperCode,
        shortLabel: extractShortCode(p.paperCode, p.unitCode),
        title: p.title,
        variantGroup: vGroup,
        variantBadge: vBadge,
        maxRaw: p.maxRaw,
        ...(p.maxUms ? { maxUms: p.maxUms } : {}),
        durationMinutes: p.durationMinutes,
        isModularUms,
        gradingScale,
        ...(mappedAvailable.size > 0
          ? { availableSeriesIds: Array.from(mappedAvailable) }
          : {}),
        seriesBoundaries,
      });
    }
  }

  const rowsById = new Map(rows.map((r) => [r.id, r]));
  const rowsByPaperCode = new Map(rows.map((r) => [r.paperCode, r]));

  const attempts: StudyPastPaperAttemptDto[] = recordRows.map((rec) => {
    const matchedRow =
      rowsByPaperCode.get(rec.paperCode) ??
      (rec.pastPaperId ? rowsById.get(rec.pastPaperId) : undefined);
    const rowId = matchedRow?.id ?? rec.pastPaperId ?? rec.id;

    return {
      id: rec.id,
      subjectId: rec.subjectId,
      rowId,
      paperCode: rec.paperCode,
      seriesId: rec.seriesId,
      rawScore: rec.rawScore,
      maxRaw: rec.maxRaw,
      percentage: rec.percentage,
      derivedGrade: rec.derivedGrade,
      derivedUmsOrPum: rec.derivedUmsOrPum,
      umsOrPumLabel: rec.umsOrPumLabel,
      timed: Boolean(rec.timed),
      durationMinutes: matchedRow?.durationMinutes ?? 90,
      loggedAtIso: rec.attemptedAtIso,
      dateLabel: formatDateLabel(rec.attemptedAtIso),
      weakTopics: parseJsonValue<string[]>(rec.weakTopicsJson, []),
      notes: rec.reflectionNotes,
    };
  });

  const earnedPaperXp = xpLedgerRows
    .filter((x) => x.sourceType === 'past_paper_first' || x.sourceType === 'past_paper_pb')
    .reduce((sum, x) => sum + x.xpAmount, 0);

  return {
    subjects: catalogSubjects,
    seriesList: STUDY_SERIES_CATALOG.slice(0, 6),
    rows,
    attempts,
    selectedSubjectId,
    enrolledSubjectIds: enrollmentRows.map((e) => e.subjectId),
    activeMathsCashIn: mathsSuite.activeCashIn,
    activeMathsUnits: mathsSuite.unitsByCashIn[mathsSuite.activeCashIn] ?? [],
    earnedPaperXp,
    totalXp: profileRows[0]?.xp ?? 0,
    streakDays: profileRows[0]?.streakDays ?? 0,
  };
}

export async function logStudyPastPaperAttempt(
  d1: D1Database,
  userId: string,
  input: StudyLogPastPaperAttemptInput
): Promise<StudyLogPastPaperResponseDto> {
  const db = createDb(d1);
  const allSubjects = await db
    .select({
      id: subjects.id,
      code: subjects.code,
      curriculumId: subjects.curriculumId,
      gradingScale: subjects.gradingScale,
      subjectType: subjects.subjectType,
    })
    .from(subjects);
  const canonicalSubjectId = resolveCanonicalSubjectId(input.subjectId, allSubjects);
  const subj = allSubjects.find((s) => s.id === canonicalSubjectId);
  if (!subj) {
    throw new StudyServiceError(404, 'SUBJECT_NOT_FOUND', 'Subject was not found.');
  }

  const currRows = await db
    .select({ code: curriculums.code })
    .from(curriculums)
    .where(eq(curriculums.id, subj.curriculumId))
    .limit(1);
  const boardId = (currRows[0]?.code ?? 'edexcel-ial') as CurriculumBoardId;

  const [basePaperId, variantHint] = input.pastPaperId.split('::');
  const paperRows = await db
    .select()
    .from(pastPapers)
    .where(eq(pastPapers.id, basePaperId!))
    .limit(1);
  const paper = paperRows[0];

  const maxRaw = paper?.maxRaw ?? input.maxRaw ?? 100;
  const maxUms = paper?.maxUms ?? null;
  const isModularUms = Boolean(maxUms) && boardId === 'edexcel-ial';
  const durationMinutes = paper?.durationMinutes ?? 90;

  let thresholds: Record<string, number> = {};
  if (paper) {
    const boundaries = await db
      .select()
      .from(paperGradeBoundaries)
      .where(eq(paperGradeBoundaries.pastPaperId, paper.id));

    const candidateSeriesIds = new Set<string>([input.seriesId]);
    if (input.seriesId === 'jan-fm-2025') {
      candidateSeriesIds.add('jan-2025');
      candidateSeriesIds.add('fm-2025');
    } else if (input.seriesId === 'jan-fm-2024') {
      candidateSeriesIds.add('jan-2024');
      candidateSeriesIds.add('fm-2024');
    } else if (input.seriesId === 'jan-fm-2023') {
      candidateSeriesIds.add('jan-2023');
      candidateSeriesIds.add('fm-2023');
    }

    const matchedBoundary =
      boundaries.find((b) => {
        const parsed = parseSeriesVariantKey(b.seriesId);
        return (
          candidateSeriesIds.has(parsed.seriesId) &&
          (!variantHint || parsed.variant === variantHint)
        );
      }) ??
      boundaries.find((b) =>
        candidateSeriesIds.has(parseSeriesVariantKey(b.seriesId).seriesId)
      );

    if (matchedBoundary) {
      thresholds = parseJsonValue<Record<string, number>>(matchedBoundary.thresholdsJson, {});
    }
  }

  const derived = derivePaperGradeAndUms({
    rawScore: input.rawScore,
    maxRaw,
    maxUms,
    isModularUms,
    gradingScale: subj.gradingScale,
    thresholds,
  });

  const existingRecords = await db
    .select({
      id: userPastPaperRecords.id,
      rawScore: userPastPaperRecords.rawScore,
    })
    .from(userPastPaperRecords)
    .where(
      and(
        eq(userPastPaperRecords.userId, userId),
        eq(userPastPaperRecords.subjectId, canonicalSubjectId),
        eq(userPastPaperRecords.paperCode, input.paperCode),
        eq(userPastPaperRecords.seriesId, input.seriesId)
      )
    );

  const isFirstAttempt = existingRecords.length === 0;
  const previousBestRaw = existingRecords.reduce(
    (best, r) => Math.max(best, r.rawScore),
    -1
  );
  const clampedRaw = Math.max(0, Math.min(maxRaw, Math.round(input.rawScore)));
  const isPersonalBest = !isFirstAttempt && clampedRaw > previousBestRaw;

  const attemptId = generateId('ppa');
  const attemptedAtIso = input.attemptedAtIso ?? nowIso();
  const timestamp = nowIso();

  await db.insert(userPastPaperRecords).values({
    id: attemptId,
    userId,
    subjectId: canonicalSubjectId,
    pastPaperId: paper ? paper.id : null,
    paperCode: input.paperCode,
    seriesId: input.seriesId,
    rawScore: clampedRaw,
    maxRaw,
    percentage: derived.percentage,
    derivedGrade: derived.derivedGrade,
    derivedUmsOrPum: derived.derivedUmsOrPum,
    umsOrPumLabel: derived.umsOrPumLabel,
    timed: input.timed,
    weakTopicsJson: input.weakTopics,
    reflectionNotes: input.reflectionNotes,
    attemptedAtIso,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  let xpReason: 'first_attempt' | 'personal_best' | 'none' = 'none';
  let xpAmount = 0;
  let sourceType = 'past_paper_sit';
  let idempotencyKey = `paper-sit:${userId}:${attemptId}`;

  if (isFirstAttempt) {
    xpReason = 'first_attempt';
    xpAmount = PAPER_FIRST_LOG_XP;
    sourceType = 'past_paper_first';
    idempotencyKey = `paper-first:${userId}:${input.pastPaperId}:${input.seriesId}`;
  } else if (isPersonalBest) {
    xpReason = 'personal_best';
    xpAmount = PAPER_PB_IMPROVEMENT_XP;
    sourceType = 'past_paper_pb';
    idempotencyKey = `paper-pb:${userId}:${attemptId}`;
  }

  const xpResult = await awardStudyXpAndStreaks(db, userId, {
    idempotencyKey,
    sourceType,
    sourceId: attemptId,
    xpAmount,
    summary: `Logged ${input.paperCode} (${input.seriesId}) — ${clampedRaw}/${maxRaw} (${derived.derivedGrade})`,
    touchStreak: true,
  });

  return {
    attempt: {
      id: attemptId,
      subjectId: canonicalSubjectId,
      rowId: input.pastPaperId,
      paperCode: input.paperCode,
      seriesId: input.seriesId,
      rawScore: clampedRaw,
      maxRaw,
      percentage: derived.percentage,
      derivedGrade: derived.derivedGrade,
      derivedUmsOrPum: derived.derivedUmsOrPum,
      umsOrPumLabel: derived.umsOrPumLabel,
      timed: input.timed,
      durationMinutes,
      loggedAtIso: attemptedAtIso,
      dateLabel: formatDateLabel(attemptedAtIso),
      weakTopics: input.weakTopics,
      notes: input.reflectionNotes,
    },
    xpAwardedNow: xpResult.xpAwardedNow,
    xpReason,
    totalXp: xpResult.totalXp,
    streakDays: xpResult.streakDays,
  };
}

export async function deleteStudyPastPaperAttempt(
  d1: D1Database,
  userId: string,
  attemptId: string
): Promise<{ deletedId: string }> {
  const db = createDb(d1);
  const existing = await db
    .select({ id: userPastPaperRecords.id })
    .from(userPastPaperRecords)
    .where(
      and(
        eq(userPastPaperRecords.id, attemptId),
        eq(userPastPaperRecords.userId, userId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    throw new StudyServiceError(404, 'ATTEMPT_NOT_FOUND', 'Past paper attempt was not found.');
  }

  await db
    .delete(userPastPaperRecords)
    .where(
      and(
        eq(userPastPaperRecords.id, attemptId),
        eq(userPastPaperRecords.userId, userId)
      )
    );

  return { deletedId: attemptId };
}

// ============================================================================
// [THAW-4.4] Exam Countdown + Flow Bridge
// ============================================================================

function mapExamCountdownRow(row: typeof examCountdowns.$inferSelect): StudyExamCountdownDto {
  return {
    id: row.id,
    boardId: row.boardId,
    boardLabel: BOARD_SHORT_LABEL[row.boardId] ?? row.boardId,
    subjectId: row.subjectId,
    examScheduleId: row.examScheduleId,
    paperCode: row.paperCode,
    title: row.title,
    examDateIso: row.examDateIso,
    examDateLabel: formatDateLabel(row.examDateIso),
    examTime24h: row.examTime24h,
    targetGrade: row.targetGrade,
    category: row.category,
    isCustom: Boolean(row.isCustom),
    isMock: Boolean(row.isMock),
    colorTag: row.colorTag,
    ...(row.venueOrNotes ? { venueOrNotes: row.venueOrNotes } : {}),
    pinned: Boolean(row.isPinned),
    syncedToFlow: Boolean(row.syncedToFlow),
  };
}

export async function getStudyCountdownsState(
  d1: D1Database,
  userId: string
): Promise<StudyCountdownsResponseDto> {
  const db = createDb(d1);
  const enrollments = await db
    .select()
    .from(userEnrollments)
    .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.isActive, true)));

  // Materialize official exam schedules for any active enrolled subject that has none yet
  for (const enr of enrollments) {
    await syncOfficialCountdownsForSubject(db, userId, enr.subjectId, enr.targetGrade);
  }

  const rows = await db
    .select()
    .from(examCountdowns)
    .where(eq(examCountdowns.userId, userId))
    .orderBy(asc(examCountdowns.examDateIso));

  const countdowns = rows.map(mapExamCountdownRow);
  const pinnedExamIds = countdowns.filter((c) => c.pinned).map((c) => c.id);
  const flowSyncedExamIds = countdowns.filter((c) => c.syncedToFlow).map((c) => c.id);
  const enrolledBoards = Array.from(new Set(countdowns.map((c) => c.boardId)));

  return {
    countdowns,
    pinnedExamIds,
    flowSyncedExamIds,
    enrolledBoards,
  };
}

export async function saveStudyCountdown(
  d1: D1Database,
  userId: string,
  input: StudySaveCountdownInput
): Promise<StudyExamCountdownDto> {
  const db = createDb(d1);
  const timestamp = nowIso();
  const id = input.id?.trim() || generateId('exc');

  const existing = await db
    .select()
    .from(examCountdowns)
    .where(eq(examCountdowns.id, id))
    .limit(1);

  if (existing[0] && existing[0].userId !== userId) {
    throw new StudyServiceError(403, 'FORBIDDEN', 'Cannot modify another user countdown.');
  }

  const values = {
    boardId: input.boardId,
    subjectId: input.subjectId ?? null,
    paperCode: input.paperCode.toUpperCase(),
    title: input.title,
    examDateIso: input.examDateIso,
    examTime24h: input.examTime24h,
    targetGrade: input.targetGrade,
    category: input.isMock ? ('mock' as const) : input.category,
    isCustom: input.isCustom,
    isMock: input.isMock,
    colorTag: input.colorTag,
    isPinned: input.pinned,
    syncedToFlow: input.syncedToFlow,
    venueOrNotes: input.venueOrNotes ?? null,
    updatedAt: timestamp,
  };

  if (existing[0]) {
    await db
      .update(examCountdowns)
      .set(values)
      .where(and(eq(examCountdowns.id, id), eq(examCountdowns.userId, userId)));
  } else {
    await db.insert(examCountdowns).values({
      id,
      userId,
      examScheduleId: null,
      ...values,
      createdAt: timestamp,
    });
  }

  const savedRows = await db
    .select()
    .from(examCountdowns)
    .where(and(eq(examCountdowns.id, id), eq(examCountdowns.userId, userId)))
    .limit(1);

  const profileRows = await db
    .select({ xp: profiles.xp, streakDays: profiles.streakDays })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  await evaluateAndUnlockBadges(db, userId, {
    totalXp: profileRows[0]?.xp ?? 0,
    streakDays: profileRows[0]?.streakDays ?? 0,
  });

  return mapExamCountdownRow(savedRows[0]!);
}

export async function updateStudyCountdownFlags(
  d1: D1Database,
  userId: string,
  countdownId: string,
  input: StudyUpdateCountdownFlagsInput
): Promise<StudyExamCountdownDto> {
  const db = createDb(d1);
  const existing = await db
    .select()
    .from(examCountdowns)
    .where(and(eq(examCountdowns.id, countdownId), eq(examCountdowns.userId, userId)))
    .limit(1);

  if (!existing[0]) {
    throw new StudyServiceError(404, 'COUNTDOWN_NOT_FOUND', 'Exam countdown was not found.');
  }

  const timestamp = nowIso();
  await db
    .update(examCountdowns)
    .set({
      ...(input.pinned !== undefined ? { isPinned: input.pinned } : {}),
      ...(input.syncedToFlow !== undefined ? { syncedToFlow: input.syncedToFlow } : {}),
      ...(input.targetGrade !== undefined ? { targetGrade: input.targetGrade } : {}),
      updatedAt: timestamp,
    })
    .where(and(eq(examCountdowns.id, countdownId), eq(examCountdowns.userId, userId)));

  const updated = await db
    .select()
    .from(examCountdowns)
    .where(and(eq(examCountdowns.id, countdownId), eq(examCountdowns.userId, userId)))
    .limit(1);

  if (input.syncedToFlow) {
    const profileRows = await db
      .select({ xp: profiles.xp, streakDays: profiles.streakDays })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    await evaluateAndUnlockBadges(db, userId, {
      totalXp: profileRows[0]?.xp ?? 0,
      streakDays: profileRows[0]?.streakDays ?? 0,
    });
  }

  return mapExamCountdownRow(updated[0]!);
}

export async function deleteStudyCountdown(
  d1: D1Database,
  userId: string,
  countdownId: string
): Promise<{ deletedId: string }> {
  const db = createDb(d1);
  const existing = await db
    .select({ id: examCountdowns.id })
    .from(examCountdowns)
    .where(and(eq(examCountdowns.id, countdownId), eq(examCountdowns.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    throw new StudyServiceError(404, 'COUNTDOWN_NOT_FOUND', 'Exam countdown was not found.');
  }

  await db
    .delete(examCountdowns)
    .where(and(eq(examCountdowns.id, countdownId), eq(examCountdowns.userId, userId)));

  return { deletedId: countdownId };
}

// ============================================================================
// [THAW-4.5] Study Dashboard & Scholar Leaderboard
// ============================================================================

export async function getStudyDashboardState(
  d1: D1Database,
  userId: string
): Promise<StudyDashboardResponseDto> {
  const db = createDb(d1);
  const todayIso = getUtcDateString();

  const [
    { subjects: catalogSubjects },
    activeBoard,
    enrollments,
    topicRows,
    progressRows,
    paperAttemptRows,
    countdownResp,
    xpLedgerRows,
    profileRows,
    streakRows,
    mathsSuite,
  ] = await Promise.all([
    buildCatalogSubjects(db, userId),
    resolveUserActiveBoard(db, userId),
    db
      .select()
      .from(userEnrollments)
      .where(and(eq(userEnrollments.userId, userId), eq(userEnrollments.isActive, true))),
    db.select({ id: topics.id, subjectId: topics.subjectId }).from(topics),
    db.select().from(topicProgress).where(eq(topicProgress.userId, userId)),
    db
      .select()
      .from(userPastPaperRecords)
      .where(eq(userPastPaperRecords.userId, userId))
      .orderBy(desc(userPastPaperRecords.attemptedAtIso)),
    getStudyCountdownsState(d1, userId),
    db
      .select()
      .from(userXpLedger)
      .where(eq(userXpLedger.userId, userId))
      .orderBy(desc(userXpLedger.createdAt))
      .limit(12),
    db
      .select({ xp: profiles.xp, streakDays: profiles.streakDays })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
    db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1),
    loadUserMathsSuiteState(db, userId),
  ]);

  const subjectById = new Map(catalogSubjects.map((s) => [s.id, s]));
  const topicCountsBySubject = new Map<string, number>();
  for (const t of topicRows) {
    topicCountsBySubject.set(t.subjectId, (topicCountsBySubject.get(t.subjectId) ?? 0) + 1);
  }

  const progressBySubject = new Map<string, { mastered: number; inProgress: number; lastStudiedIso?: string }>();
  for (const p of progressRows) {
    const entry = progressBySubject.get(p.subjectId) ?? { mastered: 0, inProgress: 0 };
    if (p.status === 'mastered') entry.mastered += 1;
    else if (p.status === 'in_progress') entry.inProgress += 1;
    if (p.lastStudiedAtIso && (!entry.lastStudiedIso || p.lastStudiedAtIso > entry.lastStudiedIso)) {
      entry.lastStudiedIso = p.lastStudiedAtIso;
    }
    progressBySubject.set(p.subjectId, entry);
  }

  const papersBySubject = new Map<string, Array<typeof userPastPaperRecords.$inferSelect>>();
  for (const a of paperAttemptRows) {
    const list = papersBySubject.get(a.subjectId) ?? [];
    list.push(a);
    papersBySubject.set(a.subjectId, list);
  }

  const subjectsByBoard: Record<CurriculumBoardId, StudyDashboardSubjectSummaryDto[]> = {
    'edexcel-ial': [],
    'cambridge-igcse': [],
    'cambridge-alevel': [],
    'edexcel-igcse': [],
  };

  const reviewedSubjectIdsByBoard: Record<CurriculumBoardId, string[]> = {
    'edexcel-ial': [],
    'cambridge-igcse': [],
    'cambridge-alevel': [],
    'edexcel-igcse': [],
  };

  const activeUnits = mathsSuite.unitsByCashIn[mathsSuite.activeCashIn] ?? [];
  const shortMap: Record<string, string> = {
    WMA11: 'P1', WMA12: 'P2', WMA13: 'P3', WMA14: 'P4',
    WFM01: 'FP1', WFM02: 'FP2', WFM03: 'FP3',
    WME01: 'M1', WME02: 'M2', WME03: 'M3',
    WST01: 'S1', WST02: 'S2', WST03: 'S3', WDM11: 'D1',
  };
  const mathsSuiteSummary = `Cash-in ${mathsSuite.enrolledCashIns.join(' + ')} · ${activeUnits.length}/14 units (${activeUnits.map((u) => shortMap[u] ?? u).join(', ')})`;

  for (const enr of enrollments) {
    const subj = subjectById.get(enr.subjectId);
    if (!subj) continue;
    const prog = progressBySubject.get(subj.id) ?? { mastered: 0, inProgress: 0 };
    const subjAttempts = papersBySubject.get(subj.id) ?? [];
    const latestAttempt = subjAttempts[0];
    const reviewedToday = enr.lastReviewedDateIso === todayIso;
    if (reviewedToday) {
      reviewedSubjectIdsByBoard[subj.boardId].push(subj.id);
    }

    const nextExam = countdownResp.countdowns.find((c) => c.subjectId === subj.id);

    subjectsByBoard[subj.boardId].push({
      id: subj.id,
      code: subj.code,
      boardId: subj.boardId,
      boardLabel: subj.boardLabel,
      title: subj.title,
      subjectType: subj.subjectType,
      unitSummary:
        subj.subjectType === 'modular_maths_suite'
          ? mathsSuiteSummary
          : `${subj.paperCount} papers · ${subj.examSessionWindow}`,
      topicsMastered: prog.mastered,
      topicsInProgress: prog.inProgress,
      topicsTotal: topicCountsBySubject.get(subj.id) ?? subj.topicCount,
      papersLogged: subjAttempts.length,
      latestPaperLabel: latestAttempt
        ? `${latestAttempt.paperCode} (${latestAttempt.seriesId}): ${latestAttempt.rawScore}/${latestAttempt.maxRaw} (${latestAttempt.derivedGrade})`
        : 'No papers logged yet',
      targetGrade: enr.targetGrade,
      nextMilestoneLabel: nextExam
        ? `${nextExam.paperCode} · ${nextExam.examDateLabel}`
        : `Target ${enr.targetGrade}`,
      lastStudiedLabel: prog.lastStudiedIso
        ? formatDateLabel(prog.lastStudiedIso)
        : latestAttempt
          ? formatDateLabel(latestAttempt.attemptedAtIso)
          : 'Ready to begin',
      reviewedToday,
    });
  }

  const recentActivity: StudyRecentActivityDto[] = xpLedgerRows.map((x) => ({
    id: x.id,
    boardId: activeBoard,
    dateLabel: formatDateLabel(x.createdAt),
    subjectCode:
      x.sourceType === 'pomodoro'
        ? 'FLOW'
        : x.sourceType.startsWith('past_paper')
          ? 'PAPER'
          : x.sourceType === 'topic_mastered'
            ? 'TOPIC'
            : 'STUDY',
    summary: x.summary,
    metricLabel: `+${x.xpAmount} XP`,
    xpDelta: x.xpAmount,
  }));

  return {
    activeBoard,
    totalXp: profileRows[0]?.xp ?? 0,
    streakDays: streakRows[0]?.currentStreakDays ?? profileRows[0]?.streakDays ?? 0,
    longestStreakDays: streakRows[0]?.longestStreakDays ?? profileRows[0]?.streakDays ?? 0,
    subjectsByBoard,
    countdowns: countdownResp.countdowns,
    recentActivity,
    reviewedSubjectIdsByBoard,
    pinnedExamIds: countdownResp.pinnedExamIds,
    flowSyncedExamIds: countdownResp.flowSyncedExamIds,
    mathsSuiteSummary,
  };
}

export async function toggleStudySubjectCheckIn(
  d1: D1Database,
  userId: string,
  input: StudyCheckInSubjectInput
): Promise<StudyCheckInResponseDto> {
  const db = createDb(d1);
  const allSubjects = await db.select({ id: subjects.id, code: subjects.code, title: subjects.title }).from(subjects);
  const canonicalSubjectId = resolveCanonicalSubjectId(input.subjectId, allSubjects);
  const subj = allSubjects.find((s) => s.id === canonicalSubjectId);
  if (!subj) {
    throw new StudyServiceError(404, 'SUBJECT_NOT_FOUND', 'Subject was not found.');
  }

  const todayIso = getUtcDateString();
  const timestamp = nowIso();

  const existing = await db
    .select()
    .from(userEnrollments)
    .where(
      and(
        eq(userEnrollments.userId, userId),
        eq(userEnrollments.subjectId, canonicalSubjectId)
      )
    )
    .limit(1);

  const alreadyReviewedToday = existing[0]?.lastReviewedDateIso === todayIso;
  const nextReviewedToday = !alreadyReviewedToday;

  if (existing[0]) {
    await db
      .update(userEnrollments)
      .set({
        isActive: true,
        lastReviewedDateIso: nextReviewedToday ? todayIso : null,
        updatedAt: timestamp,
      })
      .where(eq(userEnrollments.id, existing[0].id));
  } else {
    await db.insert(userEnrollments).values({
      id: generateId('uen'),
      userId,
      subjectId: canonicalSubjectId,
      targetGrade: 'A*',
      isActive: true,
      lastReviewedDateIso: todayIso,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  if (nextReviewedToday) {
    const xpResult = await awardStudyXpAndStreaks(db, userId, {
      idempotencyKey: `study-checkin:${userId}:${canonicalSubjectId}:${todayIso}`,
      sourceType: 'daily_checkin',
      sourceId: canonicalSubjectId,
      xpAmount: REVISION_CHECKIN_XP,
      summary: `Daily revision check-in: ${subj.code} (${subj.title})`,
      touchStreak: true,
    });
    return {
      subjectId: canonicalSubjectId,
      reviewedToday: true,
      xpAwardedNow: xpResult.xpAwardedNow,
      totalXp: xpResult.totalXp,
      streakDays: xpResult.streakDays,
    };
  }

  const profileRows = await db
    .select({ xp: profiles.xp, streakDays: profiles.streakDays })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return {
    subjectId: canonicalSubjectId,
    reviewedToday: false,
    xpAwardedNow: 0,
    totalXp: profileRows[0]?.xp ?? 0,
    streakDays: profileRows[0]?.streakDays ?? 0,
  };
}

export async function getStudyLeaderboard(
  d1: D1Database,
  userId: string
): Promise<StudyLeaderboardResponseDto> {
  const db = createDb(d1);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    allProfiles,
    allStudentPrefs,
    allStreaks,
    allXpLedger,
    allTopicProg,
    allPaperRecords,
    allBadges,
  ] = await Promise.all([
    db.select().from(profiles),
    db.select().from(studentProfiles),
    db.select().from(userStreaks),
    db.select().from(userXpLedger),
    db.select({ userId: topicProgress.userId, status: topicProgress.status }).from(topicProgress),
    db
      .select({
        userId: userPastPaperRecords.userId,
        derivedUmsOrPum: userPastPaperRecords.derivedUmsOrPum,
        umsOrPumLabel: userPastPaperRecords.umsOrPumLabel,
      })
      .from(userPastPaperRecords),
    db.select().from(userBadges),
  ]);

  const studentPrefByUserId = new Map(allStudentPrefs.map((s) => [s.userId, s]));
  const streakByUserId = new Map(allStreaks.map((s) => [s.userId, s]));

  const weeklyXpByUser = new Map<string, number>();
  for (const row of allXpLedger) {
    if (row.createdAt >= sevenDaysAgo) {
      weeklyXpByUser.set(row.userId, (weeklyXpByUser.get(row.userId) ?? 0) + row.xpAmount);
    }
  }

  const masteredByUser = new Map<string, number>();
  for (const row of allTopicProg) {
    if (row.status === 'mastered') {
      masteredByUser.set(row.userId, (masteredByUser.get(row.userId) ?? 0) + 1);
    }
  }

  const papersByUser = new Map<string, { count: number; totalUms: number; label: string }>();
  for (const row of allPaperRecords) {
    const entry = papersByUser.get(row.userId) ?? { count: 0, totalUms: 0, label: row.umsOrPumLabel };
    entry.count += 1;
    entry.totalUms += row.derivedUmsOrPum;
    papersByUser.set(row.userId, entry);
  }

  const badgesByUser = new Map<string, Array<typeof userBadges.$inferSelect>>();
  for (const b of allBadges) {
    const list = badgesByUser.get(b.userId) ?? [];
    list.push(b);
    badgesByUser.set(b.userId, list);
  }

  const scholars: StudyLeaderboardScholarDto[] = [];
  for (const p of allProfiles) {
    const isCurrentUser = p.userId === userId;
    const studentPref = studentPrefByUserId.get(p.userId);
    const isPrivate = Boolean(studentPref?.privateStudyMode);
    if (isPrivate && !isCurrentUser) continue;

    const boardId: CurriculumBoardId = studentPref?.activeBoardId ?? 'edexcel-ial';
    const streak = streakByUserId.get(p.userId)?.currentStreakDays ?? p.streakDays;
    const paperStats = papersByUser.get(p.userId);
    const avgScore =
      paperStats && paperStats.count > 0
        ? `${Math.round(paperStats.totalUms / paperStats.count)} ${paperStats.label}`
        : '—';
    const rolesList = parseJsonValue<string[]>(p.roles, [p.role]);
    const isTutor = rolesList.includes('tutor') || rolesList.includes('admin');

    scholars.push({
      id: p.id,
      name: p.displayName,
      username: p.username,
      boardId,
      boardLabel: BOARD_SHORT_LABEL[boardId] ?? p.curriculumLabel,
      cohortLabel: p.institution ? p.institution : `${BOARD_SHORT_LABEL[boardId]} Cohort`,
      weeklyXp: weeklyXpByUser.get(p.userId) ?? 0,
      allTimeXp: p.xp,
      streakDays: streak,
      topicsMastered: masteredByUser.get(p.userId) ?? 0,
      papersLogged: paperStats?.count ?? 0,
      avgUmsOrGradeLabel: avgScore,
      badgeCount: badgesByUser.get(p.userId)?.length ?? 0,
      ...(isTutor ? { isTutor: true } : {}),
      ...(isCurrentUser ? { isCurrentUser: true } : {}),
    });
  }

  const currentProfile = allProfiles.find((p) => p.userId === userId);
  const currentStudentPref = studentPrefByUserId.get(userId);
  const visibleOnLeaderboard = !currentStudentPref?.privateStudyMode;
  const currentBadges = badgesByUser.get(userId) ?? [];
  const currentBadgeByCode = new Map(currentBadges.map((b) => [b.badgeCode, b]));

  const badges = BADGE_DEFINITIONS.map((def) => {
    const unlocked = currentBadgeByCode.get(def.id);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      criteriaLabel: def.criteriaLabel,
      xpReward: def.xpReward,
      earned: Boolean(unlocked),
      ...(unlocked ? { earnedDateLabel: formatDateLabel(unlocked.awardedAtIso) } : {}),
      category: def.category,
    };
  });

  return {
    visibleOnLeaderboard,
    currentUserXp: currentProfile?.xp ?? 0,
    currentUserStreak: streakByUserId.get(userId)?.currentStreakDays ?? currentProfile?.streakDays ?? 0,
    scholars,
    badges,
  };
}

export async function updateStudyLeaderboardVisibility(
  d1: D1Database,
  userId: string,
  visibleOnLeaderboard: boolean
): Promise<{ visibleOnLeaderboard: boolean }> {
  const db = createDb(d1);
  const timestamp = nowIso();
  const existing = await db
    .select({ id: studentProfiles.id })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(studentProfiles)
      .set({ privateStudyMode: !visibleOnLeaderboard, updatedAt: timestamp })
      .where(eq(studentProfiles.userId, userId));
  } else {
    await db.insert(studentProfiles).values({
      id: generateId('stp'),
      userId,
      privateStudyMode: !visibleOnLeaderboard,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return { visibleOnLeaderboard };
}
