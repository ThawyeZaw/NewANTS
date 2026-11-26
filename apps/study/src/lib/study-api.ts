import type { MockUserProfile, UserRole } from '@ants/ui';
import { fetchWithRetry, resolveApiBaseUrl } from '@ants/auth-client';
import {
  StudyCatalogResponseDtoSchema,
  StudyCheckInResponseDtoSchema,
  StudyCountdownsResponseDtoSchema,
  StudyDashboardResponseDtoSchema,
  StudyExamCountdownDtoSchema,
  StudyLeaderboardResponseDtoSchema,
  StudyLeaderboardVisibilityInputSchema,
  StudyLogPastPaperResponseDtoSchema,
  StudyMathsSuiteMutationResponseDtoSchema,
  StudyPastPapersResponseDtoSchema,
  StudyTopicProgressMutationResponseDtoSchema,
  StudyTopicsResponseDtoSchema,
  type CurriculumBoardId,
  type EdexcelMathsCashInCode,
  type EdexcelMathsUnitCode,
  type StudyCatalogResponseDto,
  type StudyCatalogSubjectDto,
  type StudyCheckInResponseDto,
  type StudyCountdownsResponseDto,
  type StudyDashboardResponseDto,
  type StudyExamCountdownDto,
  type StudyLeaderboardResponseDto,
  type StudyLogPastPaperAttemptInput,
  type StudyLogPastPaperResponseDto,
  type StudyMathsSuiteMutationResponseDto,
  type StudyPastPapersResponseDto,
  type StudySaveCountdownInput,
  type StudyTopicProgressMutationResponseDto,
  type StudyTopicsResponseDto,
  type StudyUpdateCountdownFlagsInput,
  type StudyUpdateMathsSuiteInput,
  type StudyUpsertTopicProgressInput,
} from '@ants/shared-types';
import type {
  CurriculumSubjectItem,
  StudyCurriculumPersistedState,
} from './study/curriculum';
import type {
  EnrolledSubjectSummary,
  RecentStudyActivityItem,
  StudyBoardTab,
  StudyDashboardPersistedState,
  StudyExamCountdownItem,
} from './study/dashboard';
import type { StudyTopicsPersistedState, SyllabusTopicItem } from './study/topics';
import type {
  PastPaperAttempt,
  PastPaperRowDefinition,
  PastPaperSeriesMeta,
  StudyPapersPersistedState,
} from './study/papers';
import type {
  ExamCountdownEntry,
  ScholarLeaderboardEntry,
  StudyBadgeItem,
  StudyCountdownsPersistedState,
} from './study/countdown-leaderboard';

interface SchemaParser<T> {
  parse(data: unknown): T;
}

export class StudyApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'StudyApiError';
    this.status = status;
    this.code = code;
  }
}

export const ALL_STUDY_BOARD_TABS: StudyBoardTab[] = [
  {
    id: 'edexcel-ial',
    label: 'Pearson Edexcel IAL',
    shortLabel: 'Edexcel IAL',
    summary: 'Modular · UMS 300 / 600',
  },
  {
    id: 'cambridge-igcse',
    label: 'Cambridge IGCSE',
    shortLabel: 'Cambridge IGCSE',
    summary: 'Extended & Core Linear',
  },
  {
    id: 'cambridge-alevel',
    label: 'Cambridge AS & A-Level',
    shortLabel: 'Cambridge A-Level',
    summary: 'Staged AS + A2 Linear',
  },
  {
    id: 'edexcel-igcse',
    label: 'Pearson Edexcel IGCSE',
    shortLabel: 'Edexcel IGCSE',
    summary: '9–1 Linear & Modular',
  },
];

/**
 * Exhaustive list of canonical D1 subject IDs + legacy mock aliases for `generateStaticParams()`.
 */
export const ALL_STUDY_STATIC_SUBJECT_IDS: readonly string[] = [
  // 49 canonical D1 IDs
  'caie-igcse-maths-0580',
  'caie-igcse-add-maths-0606',
  'caie-igcse-physics-0625',
  'caie-igcse-chemistry-0620',
  'caie-igcse-biology-0610',
  'caie-igcse-cs-0478',
  'caie-igcse-ict-0417',
  'caie-igcse-fle-0500',
  'caie-igcse-esl-0510',
  'caie-igcse-economics-0455',
  'caie-igcse-business-0450',
  'caie-igcse-accounting-0452',
  'edexcel-igcse-maths-a-4ma1',
  'edexcel-igcse-maths-b-4mb1',
  'edexcel-igcse-fpm-4pm1',
  'edexcel-igcse-physics-4ph1',
  'edexcel-igcse-chemistry-4ch1',
  'edexcel-igcse-biology-4bi1',
  'edexcel-igcse-human-bio-4hb1',
  'edexcel-igcse-cs-4cp0',
  'edexcel-igcse-ict-4it1',
  'edexcel-igcse-eng-lang-b-4eb1',
  'edexcel-igcse-esl-4es1',
  'edexcel-igcse-economics-4ec1',
  'edexcel-igcse-business-4bs1',
  'edexcel-igcse-accounting-4ac1',
  'edexcel-ial-maths',
  'edexcel-ial-physics',
  'edexcel-ial-chemistry',
  'edexcel-ial-biology',
  'edexcel-ial-it',
  'edexcel-ial-cs',
  'edexcel-ial-economics',
  'edexcel-ial-business',
  'edexcel-ial-accounting',
  'edexcel-ial-english-lang',
  'edexcel-ial-english-lit',
  'caie-alevel-maths-9709',
  'caie-alevel-fmaths-9231',
  'caie-alevel-physics-9702',
  'caie-alevel-chemistry-9701',
  'caie-alevel-biology-9700',
  'caie-alevel-cs-9618',
  'caie-alevel-it-9626',
  'caie-alevel-economics-9708',
  'caie-alevel-business-9609',
  'caie-alevel-accounting-9706',
  'caie-alevel-english-lang-9093',
  'caie-alevel-lit-9695',
  // Legacy prototype / dashboard alias IDs
  'ial-maths-suite',
  'ial-physics',
  'ial-chemistry',
  'ial-biology',
  'igcse-maths-0580',
  'igcse-physics-0625',
  'igcse-chemistry-0620',
  'igcse-cs-0478',
  'cie-maths-9709',
  'cie-physics-9702',
  'edexcel-igcse-4ma1',
  'edexcel-igcse-4pm1',
];

async function requestStudyJson<T>(
  path: string,
  schema: SchemaParser<T>,
  init?: RequestInit
): Promise<T> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetchWithRetry(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: unknown; error?: { code?: string; message?: string } }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new StudyApiError(
      response.status,
      payload?.error?.code ?? 'STUDY_API_ERROR',
      payload?.error?.message ?? `Study API request failed (${response.status})`
    );
  }

  return schema.parse(payload.data);
}

async function requestStudyRaw(
  path: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetchWithRetry(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: Record<string, unknown>; error?: { code?: string; message?: string } }
    | null;

  if (!response.ok || !payload?.ok || !payload.data) {
    throw new StudyApiError(
      response.status,
      payload?.error?.code ?? 'STUDY_API_ERROR',
      payload?.error?.message ?? `Study API request failed (${response.status})`
    );
  }

  return payload.data;
}

export function sessionToMockUser(
  user: {
    id: string;
    name: string;
    email: string;
    username?: string | null;
    role?: string | null;
    roles?: string[] | null;
  },
  profile?: {
    xp?: number;
    streakDays?: number;
    telegramStatus?: string;
    curriculumLabel?: string;
  } | null,
  xpOverride?: number,
  streakOverride?: number
): MockUserProfile {
  const roles = (
    Array.isArray(user.roles) && user.roles.length > 0
      ? user.roles
      : [user.role ?? 'student']
  ) as UserRole[];
  const primaryRole = (user.role ?? roles[0] ?? 'student') as UserRole;
  const derivedUsername =
    user.username && user.username.trim().length > 0
      ? user.username.trim().toLowerCase()
      : user.email.split('@')[0]?.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'scholar';

  return {
    id: user.id,
    name: user.name,
    username: derivedUsername,
    email: user.email,
    role: primaryRole,
    roles,
    xp: xpOverride ?? profile?.xp ?? 0,
    streakDays: streakOverride ?? profile?.streakDays ?? 0,
    telegramConnected:
      profile?.telegramStatus === 'linked' || profile?.telegramStatus === 'connected',
    curriculumLabel: profile?.curriculumLabel,
  };
}

export const LOADING_STUDY_SHELL_USER: MockUserProfile = {
  id: 'loading',
  name: 'Loading workspace…',
  username: 'loading',
  email: '',
  role: 'student',
  roles: ['student'],
  xp: 0,
  streakDays: 0,
  telegramConnected: false,
};

// ============================================================================
// API Functions
// ============================================================================

export async function fetchStudyCatalog(): Promise<StudyCatalogResponseDto> {
  return requestStudyJson('/api/study/catalog', StudyCatalogResponseDtoSchema);
}

export async function updateStudyActiveBoardApi(
  boardId: CurriculumBoardId
): Promise<{ activeBoard: CurriculumBoardId }> {
  const data = await requestStudyRaw('/api/study/board', {
    method: 'PUT',
    body: JSON.stringify({ boardId }),
  });
  return { activeBoard: (data.activeBoard as CurriculumBoardId) ?? boardId };
}

export async function toggleStudyEnrollmentApi(input: {
  subjectId: string;
  enrolled: boolean;
  targetGrade?: string;
}): Promise<{ enrolledSubjectIds: string[] }> {
  const data = await requestStudyRaw('/api/study/enrollments', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return {
    enrolledSubjectIds: Array.isArray(data.enrolledSubjectIds)
      ? (data.enrolledSubjectIds as string[])
      : [],
  };
}

export async function updateStudyTargetGradeApi(input: {
  subjectId: string;
  targetGrade: string;
}): Promise<void> {
  await requestStudyRaw('/api/study/target-grade', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function updateStudyMathsSuiteApi(
  input: StudyUpdateMathsSuiteInput
): Promise<StudyMathsSuiteMutationResponseDto> {
  return requestStudyJson('/api/study/maths-suite', StudyMathsSuiteMutationResponseDtoSchema, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function fetchStudyTopicsApi(
  subjectId?: string
): Promise<StudyTopicsResponseDto> {
  const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
  return requestStudyJson(`/api/study/topics${qs}`, StudyTopicsResponseDtoSchema);
}

export async function upsertStudyTopicProgressApi(
  topicId: string,
  input: StudyUpsertTopicProgressInput
): Promise<StudyTopicProgressMutationResponseDto> {
  return requestStudyJson(
    `/api/study/topics/${encodeURIComponent(topicId)}/progress`,
    StudyTopicProgressMutationResponseDtoSchema,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
}

export async function fetchStudyPastPapersApi(
  subjectId?: string
): Promise<StudyPastPapersResponseDto> {
  const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
  return requestStudyJson(`/api/study/past-papers${qs}`, StudyPastPapersResponseDtoSchema);
}

export async function logStudyPastPaperAttemptApi(
  input: StudyLogPastPaperAttemptInput
): Promise<StudyLogPastPaperResponseDto> {
  return requestStudyJson('/api/study/past-papers/attempts', StudyLogPastPaperResponseDtoSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteStudyPastPaperAttemptApi(attemptId: string): Promise<void> {
  await requestStudyRaw(`/api/study/past-papers/attempts/${encodeURIComponent(attemptId)}`, {
    method: 'DELETE',
  });
}

export async function fetchStudyCountdownsApi(): Promise<StudyCountdownsResponseDto> {
  return requestStudyJson('/api/study/countdowns', StudyCountdownsResponseDtoSchema);
}

export async function saveStudyCountdownApi(
  input: StudySaveCountdownInput
): Promise<StudyExamCountdownDto> {
  if (input.id && !input.id.startsWith('custom_exam_')) {
    return requestStudyJson(
      `/api/study/countdowns/${encodeURIComponent(input.id)}`,
      StudyExamCountdownDtoSchema,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    );
  }
  return requestStudyJson('/api/study/countdowns', StudyExamCountdownDtoSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateStudyCountdownFlagsApi(
  id: string,
  input: StudyUpdateCountdownFlagsInput
): Promise<StudyExamCountdownDto> {
  return requestStudyJson(
    `/api/study/countdowns/${encodeURIComponent(id)}`,
    StudyExamCountdownDtoSchema,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
}

export async function deleteStudyCountdownApi(id: string): Promise<void> {
  await requestStudyRaw(`/api/study/countdowns/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchStudyDashboardApi(): Promise<StudyDashboardResponseDto> {
  return requestStudyJson('/api/study/dashboard', StudyDashboardResponseDtoSchema);
}

export async function toggleStudySubjectCheckInApi(
  subjectId: string,
  boardId?: CurriculumBoardId
): Promise<StudyCheckInResponseDto> {
  return requestStudyJson('/api/study/dashboard/check-in', StudyCheckInResponseDtoSchema, {
    method: 'POST',
    body: JSON.stringify({ subjectId, ...(boardId ? { boardId } : {}) }),
  });
}

export async function fetchStudyLeaderboardApi(): Promise<StudyLeaderboardResponseDto> {
  return requestStudyJson('/api/study/leaderboard', StudyLeaderboardResponseDtoSchema);
}

export async function updateStudyLeaderboardVisibilityApi(
  visibleOnLeaderboard: boolean
): Promise<{ visibleOnLeaderboard: boolean }> {
  const payload = StudyLeaderboardVisibilityInputSchema.parse({ visibleOnLeaderboard });
  const data = await requestStudyRaw('/api/study/leaderboard/visibility', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return { visibleOnLeaderboard: Boolean(data.visibleOnLeaderboard) };
}

// ============================================================================
// DTO -> View Model Mappers
// ============================================================================

export function mapCatalogSubjectDto(s: StudyCatalogSubjectDto): CurriculumSubjectItem {
  return {
    id: s.id,
    code: s.code,
    boardId: s.boardId,
    boardLabel: s.boardLabel,
    title: s.title,
    faculty: s.faculty,
    subjectType: s.subjectType,
    gradingScale: s.gradingScale,
    totalUms: s.totalUms,
    totalRawMarks: s.totalRawMarks,
    topicCount: s.topicCount,
    paperCount: s.paperCount,
    examSessionWindow: s.examSessionWindow,
    summary: s.summary,
    defaultEnrolled: s.defaultEnrolled,
    defaultTargetGrade: s.defaultTargetGrade,
    units: s.units,
    sampleTopics: s.sampleTopics,
  };
}

export function mapCatalogDtoToCurriculumState(
  dto: StudyCatalogResponseDto
): StudyCurriculumPersistedState {
  return {
    version: 1,
    activeBoard: dto.activeBoard,
    enrolledSubjectIds: dto.enrolledSubjectIds,
    targetGradeBySubjectId: dto.targetGradeBySubjectId,
    activeMathsCashIn: dto.mathsSuite.activeCashIn as EdexcelMathsCashInCode,
    enrolledMathsCashIns: dto.mathsSuite.enrolledCashIns as EdexcelMathsCashInCode[],
    mathsUnitsByCashIn: {
      XMA01: dto.mathsSuite.unitsByCashIn.XMA01 as EdexcelMathsUnitCode[],
      YMA01: dto.mathsSuite.unitsByCashIn.YMA01 as EdexcelMathsUnitCode[],
      XFM01: dto.mathsSuite.unitsByCashIn.XFM01 as EdexcelMathsUnitCode[],
      YFM01: dto.mathsSuite.unitsByCashIn.YFM01 as EdexcelMathsUnitCode[],
    },
  };
}

export function mapTopicsDtoToViewProps(dto: StudyTopicsResponseDto): {
  subjects: CurriculumSubjectItem[];
  topics: SyllabusTopicItem[];
  initialState: StudyTopicsPersistedState;
} {
  return {
    subjects: dto.subjects.map(mapCatalogSubjectDto),
    topics: dto.topics.map((t) => ({
      id: t.id,
      subjectId: t.subjectId,
      unitCode: t.unitCode,
      unitLabel: t.unitLabel,
      code: t.code,
      title: t.title,
      difficulty: t.difficulty,
      estimatedMinutes: t.estimatedMinutes,
      keyFormulasAndPitfalls: t.keyFormulasAndPitfalls,
      defaultStatus: t.defaultStatus,
      defaultNote: t.defaultNote,
      subtopics: t.subtopics,
    })),
    initialState: {
      version: 1,
      completedSubtopicIds: dto.completedSubtopicIds,
      statusOverrideByTopicId: dto.statusOverrideByTopicId,
      notesByTopicId: dto.notesByTopicId,
      xpAwardedTopicIds: dto.xpAwardedTopicIds,
    },
  };
}

export function mapPastPapersDtoToViewProps(dto: StudyPastPapersResponseDto): {
  subjects: CurriculumSubjectItem[];
  seriesList: PastPaperSeriesMeta[];
  rows: PastPaperRowDefinition[];
  initialState: StudyPapersPersistedState;
} {
  return {
    subjects: dto.subjects.map(mapCatalogSubjectDto),
    seriesList: dto.seriesList,
    rows: dto.rows.map((r) => ({
      id: r.id,
      subjectId: r.subjectId,
      boardId: r.boardId,
      unitCode: r.unitCode,
      paperCode: r.paperCode,
      shortLabel: r.shortLabel,
      title: r.title,
      variantGroup: r.variantGroup,
      variantBadge: r.variantBadge,
      maxRaw: r.maxRaw,
      maxUms: r.maxUms,
      durationMinutes: r.durationMinutes,
      isModularUms: r.isModularUms,
      gradingScale: r.gradingScale,
      availableSeriesIds: r.availableSeriesIds,
      seriesBoundaries: r.seriesBoundaries,
    })),
    initialState: {
      version: 1,
      attempts: dto.attempts as PastPaperAttempt[],
      cellDisplayMode: 'best',
      xpAwardedCellKeys: dto.attempts.map((a) => `${a.rowId}::${a.seriesId}`),
      pbImprovedCount: 0,
      earnedPaperXp: dto.earnedPaperXp,
    },
  };
}

export function mapCountdownDtoToEntry(c: StudyExamCountdownDto): ExamCountdownEntry {
  return {
    id: c.id,
    boardId: c.boardId,
    boardLabel: c.boardLabel,
    paperCode: c.paperCode,
    title: c.title,
    examDateIso: c.examDateIso,
    examDateLabel: c.examDateLabel,
    examTime24h: c.examTime24h,
    targetGrade: c.targetGrade,
    category: c.category,
    isCustom: c.isCustom,
    isMock: c.isMock,
    colorTag: c.colorTag,
    venueOrNotes: c.venueOrNotes,
    defaultPinned: c.pinned,
    defaultSyncedToFlow: c.syncedToFlow,
  };
}

export function mapCountdownDtoToDashboardItem(
  c: StudyExamCountdownDto
): StudyExamCountdownItem {
  return {
    id: c.id,
    boardId: c.boardId,
    boardLabel: c.boardLabel,
    paperCode: c.paperCode,
    title: c.title,
    examDateIso: c.examDateIso,
    examDateLabel: c.examDateLabel,
    targetGrade: c.targetGrade,
    defaultPinned: c.pinned,
    defaultSyncedToFlow: c.syncedToFlow,
  };
}

export function mapCountdownsResponseToViewProps(dto: StudyCountdownsResponseDto): {
  baseExams: ExamCountdownEntry[];
  initialCountdownsState: StudyCountdownsPersistedState;
  initialDashboardState: StudyDashboardPersistedState;
} {
  return {
    baseExams: dto.countdowns.map(mapCountdownDtoToEntry),
    initialCountdownsState: {
      version: 1,
      customCountdowns: [],
      deletedCustomIds: [],
      targetGradeOverrides: {},
    },
    initialDashboardState: {
      version: 1,
      activeBoard: dto.enrolledBoards[0] ?? 'edexcel-ial',
      sidebarCollapsed: false,
      xpBonus: 0,
      reviewedSubjectIdsByBoard: {
        'edexcel-ial': [],
        'cambridge-igcse': [],
        'cambridge-alevel': [],
        'edexcel-igcse': [],
      },
      pinnedExamIds: dto.pinnedExamIds,
      flowSyncedExamIds: dto.flowSyncedExamIds,
    },
  };
}

export function mapDashboardDtoToViewProps(dto: StudyDashboardResponseDto): {
  boardTabs: StudyBoardTab[];
  subjectsByBoard: Record<CurriculumBoardId, EnrolledSubjectSummary[]>;
  countdowns: StudyExamCountdownItem[];
  recentActivity: RecentStudyActivityItem[];
  initialState: StudyDashboardPersistedState;
} {
  return {
    boardTabs: ALL_STUDY_BOARD_TABS,
    subjectsByBoard: dto.subjectsByBoard as Record<CurriculumBoardId, EnrolledSubjectSummary[]>,
    countdowns: dto.countdowns.map(mapCountdownDtoToDashboardItem),
    recentActivity: dto.recentActivity as RecentStudyActivityItem[],
    initialState: {
      version: 1,
      activeBoard: dto.activeBoard,
      sidebarCollapsed: false,
      xpBonus: 0,
      reviewedSubjectIdsByBoard: dto.reviewedSubjectIdsByBoard as Record<
        CurriculumBoardId,
        string[]
      >,
      pinnedExamIds: dto.pinnedExamIds,
      flowSyncedExamIds: dto.flowSyncedExamIds,
    },
  };
}

export function mapLeaderboardDtoToViewProps(dto: StudyLeaderboardResponseDto): {
  scholars: ScholarLeaderboardEntry[];
  badges: StudyBadgeItem[];
  visibleOnLeaderboard: boolean;
} {
  return {
    scholars: dto.scholars,
    badges: dto.badges,
    visibleOnLeaderboard: dto.visibleOnLeaderboard,
  };
}
