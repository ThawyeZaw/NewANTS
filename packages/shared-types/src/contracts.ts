import { z } from 'zod';
import { EdexcelMathsUnitCodeSchema } from './edexcel-maths';
import { UserRoleSchema } from './roles';

// ============================================================================
// Academic & Study Contracts (`@ants/study` & `@ants/calculator`)
// ============================================================================

export const CURRICULUM_BOARD_IDS = [
  'edexcel-ial',
  'cambridge-igcse',
  'cambridge-alevel',
  'edexcel-igcse',
] as const;
export const CurriculumBoardIdSchema = z.enum(CURRICULUM_BOARD_IDS);
export type CurriculumBoardId = z.infer<typeof CurriculumBoardIdSchema>;

export const CALCULATOR_BOARD_IDS = [
  'edexcel-ial',
  'caie-alevel',
  'caie-igcse',
  'edexcel-igcse',
] as const;
export const CalculatorBoardIdSchema = z.enum(CALCULATOR_BOARD_IDS);
export type CalculatorBoardId = z.infer<typeof CalculatorBoardIdSchema>;

/**
 * Maps canonical D1/Study curriculum board IDs (`cambridge-*`) to Calculator UI board IDs (`caie-*`).
 */
export function toCalculatorBoardId(
  boardId: CurriculumBoardId | CalculatorBoardId
): CalculatorBoardId {
  if (boardId === 'cambridge-alevel') return 'caie-alevel';
  if (boardId === 'cambridge-igcse') return 'caie-igcse';
  return boardId;
}

/**
 * Maps Calculator UI board IDs (`caie-*`) back to canonical D1 `curriculums.code` IDs (`cambridge-*`).
 */
export function toCurriculumBoardId(
  boardId: CurriculumBoardId | CalculatorBoardId
): CurriculumBoardId {
  if (boardId === 'caie-alevel') return 'cambridge-alevel';
  if (boardId === 'caie-igcse') return 'cambridge-igcse';
  return boardId;
}

export const SUBJECT_TYPES = [
  'fixed_linear',
  'modular_sciences',
  'modular_maths_suite',
] as const;
export const SubjectTypeSchema = z.enum(SUBJECT_TYPES);
export type SubjectType = z.infer<typeof SubjectTypeSchema>;

export const GRADING_SCALES = ['A*-U', '9-1'] as const;
export const GradingScaleSchema = z.enum(GRADING_SCALES);
export type GradingScale = z.infer<typeof GradingScaleSchema>;

export const TOPIC_CONFIDENCE_STATUSES = [
  'not_started',
  'in_progress',
  'mastered',
] as const;
export const TopicConfidenceStatusSchema = z.enum(TOPIC_CONFIDENCE_STATUSES);
export type TopicConfidenceStatus = z.infer<typeof TopicConfidenceStatusSchema>;

export const TOPIC_DIFFICULTIES = ['foundation', 'standard', 'stretch'] as const;
export const TopicDifficultySchema = z.enum(TOPIC_DIFFICULTIES);
export type TopicDifficulty = z.infer<typeof TopicDifficultySchema>;

export const EXAM_SERIES_PRESET_IDS = [
  'may-june-2025',
  'january-2025',
  'oct-nov-2024',
  'mj-2025',
  'jan-2025',
  'jan-fm-2025',
  'on-2024',
  'mj-2024',
  'jan-fm-2024',
  'on-2023',
] as const;

export const ExamSeriesIdSchema = z.union([
  z.enum(EXAM_SERIES_PRESET_IDS),
  z.string().regex(/^[a-z0-9-]+$/).min(3).max(40),
]);
export type ExamSeriesId = z.infer<typeof ExamSeriesIdSchema>;

export const CALCULATOR_MODES = ['standard', 'edexcel_maths_suite'] as const;
export const CalculatorModeSchema = z.enum(CALCULATOR_MODES);
export type CalculatorMode = z.infer<typeof CalculatorModeSchema>;

export const CALCULATOR_BOUNDARY_SOURCES = ['official_d1', 'representative'] as const;
export const CalculatorBoundarySourceSchema = z.enum(CALCULATOR_BOUNDARY_SOURCES);
export type CalculatorBoundarySource = z.infer<typeof CalculatorBoundarySourceSchema>;

export const CALCULATOR_AWARD_LEVELS = ['IGCSE', 'AS', 'AL', 'IAL'] as const;
export const CalculatorAwardLevelSchema = z.enum(CALCULATOR_AWARD_LEVELS);
export type CalculatorAwardLevel = z.infer<typeof CalculatorAwardLevelSchema>;

export const CALCULATOR_INPUT_MODES = ['raw', 'ums'] as const;
export const CalculatorInputModeSchema = z.enum(CALCULATOR_INPUT_MODES);
export type CalculatorInputMode = z.infer<typeof CalculatorInputModeSchema>;

export const GradeCalculationSnapshotSchema = z.object({
  boardId: z.union([CalculatorBoardIdSchema, CurriculumBoardIdSchema]),
  subjectId: z.string().min(1),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  seriesId: ExamSeriesIdSchema,
  routeId: z.string().min(1).optional(),
  routeLabel: z.string().min(1).optional(),
  inputMode: CalculatorInputModeSchema.optional(),
  perPaperSeriesById: z.record(z.string(), ExamSeriesIdSchema).optional(),
  rawMarksByPaper: z.record(z.string(), z.number().nonnegative()).default({}),
  umsMarksByPaper: z.record(z.string(), z.number().nonnegative()).optional(),
  totalRaw: z.number().nonnegative(),
  maxTotalRaw: z.number().positive(),
  totalUms: z.number().nonnegative().optional(),
  maxTotalUms: z.number().positive().optional(),
  percentage: z.number().min(0).max(100),
  finalGrade: z.string().min(1),
});
export type GradeCalculationSnapshot = z.infer<typeof GradeCalculationSnapshotSchema>;

export const CalculatorGradeThresholdSchema = z.object({
  grade: z.string().min(1),
  minScore: z.number().nonnegative(),
});
export type CalculatorGradeThreshold = z.infer<typeof CalculatorGradeThresholdSchema>;

export const CalculatorAStarRuleSchema = z.object({
  minTotalUms: z.number().positive(),
  minA2Ums: z.number().positive(),
  a2PaperCodes: z.array(z.string().min(1)).min(1),
  countBestA2Units: z.number().int().positive().optional(),
});
export type CalculatorAStarRule = z.infer<typeof CalculatorAStarRuleSchema>;

export const CalculatorRouteOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  awardLevel: CalculatorAwardLevelSchema,
  cashInCode: z.string().min(1).optional(),
  tier: z.enum(['Extended', 'Core', 'Higher', 'Foundation']).optional(),
  variant: z.enum(['V1', 'V2', 'V3', 'Standard', 'R']).optional(),
  pathwayLabel: z.string().min(1).optional(),
  paperIds: z.array(z.string().min(1)).min(1),
  paperWeights: z.record(z.string(), z.number().positive()).optional(),
  maxTotalScore: z.number().positive(),
  isModularUms: z.boolean(),
  gradingScale: GradingScaleSchema,
  allowedGrades: z.array(z.string().min(1)).optional(),
  aStarRule: CalculatorAStarRuleSchema.optional(),
  availableSeriesIds: z.array(z.string().min(1)).optional(),
  seriesBoundaries: z.record(z.string(), z.array(CalculatorGradeThresholdSchema)),
});
export type CalculatorRouteOption = z.infer<typeof CalculatorRouteOptionSchema>;

export const CalculatorPaperCutoffsSummarySchema = z.object({
  passC: z.number().nonnegative(),
  gradeA: z.number().nonnegative(),
  topGrade: z.number().nonnegative(),
});
export type CalculatorPaperCutoffsSummary = z.infer<typeof CalculatorPaperCutoffsSummarySchema>;

export const CALCULATOR_PAPER_LEVELS = ['AS', 'A2', 'IGCSE', 'CORE', 'EXTENDED'] as const;
export const CalculatorPaperLevelSchema = z.enum(CALCULATOR_PAPER_LEVELS);
export type CalculatorPaperLevel = z.infer<typeof CalculatorPaperLevelSchema>;

export const CalculatorPaperDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  unitCode: z.string().min(1),
  title: z.string().min(1),
  maxRaw: z.number().int().positive(),
  seriesMaxRaw: z.record(z.string(), z.number().int().positive()).optional(),
  maxUms: z.number().int().positive().optional(),
  weightLabel: z.string().min(1),
  defaultRaw: z.number().int().nonnegative(),
  level: CalculatorPaperLevelSchema.optional(),
  availableSeriesIds: z.array(z.string().min(1)).optional(),
  seriesPaperCutoffs: z.record(z.string(), CalculatorPaperCutoffsSummarySchema),
  seriesThresholds: z.record(z.string(), z.record(z.string(), z.number().nonnegative())).optional(),
  seriesThresholdsByVariant: z
    .record(z.string(), z.record(z.string(), z.record(z.string(), z.number().nonnegative())))
    .optional(),
});
export type CalculatorPaperDto = z.infer<typeof CalculatorPaperDtoSchema>;

export const CalculatorSubjectDtoSchema = z.object({
  id: z.string().min(1),
  boardId: CalculatorBoardIdSchema,
  code: z.string().min(1),
  title: z.string().min(1),
  levelLabel: z.string().min(1),
  gradingScale: GradingScaleSchema,
  isModularUms: z.boolean(),
  maxTotalRaw: z.number().int().positive(),
  maxTotalUms: z.number().int().positive().optional(),
  calculatorMode: CalculatorModeSchema.optional(),
  asAwardCode: z.string().min(1).optional(),
  aLevelAwardCode: z.string().min(1).optional(),
  boundarySource: CalculatorBoundarySourceSchema.optional(),
  defaultRouteId: z.string().min(1).optional(),
  aStarRule: CalculatorAStarRuleSchema.optional(),
  papers: z.array(CalculatorPaperDtoSchema).min(1),
  routes: z.array(CalculatorRouteOptionSchema).optional(),
  seriesBoundaries: z.record(z.string(), z.array(CalculatorGradeThresholdSchema)),
});
export type CalculatorSubjectDto = z.infer<typeof CalculatorSubjectDtoSchema>;

export const CalculatorBoardDtoSchema = z.object({
  id: CalculatorBoardIdSchema,
  shortName: z.string().min(1),
  fullName: z.string().min(1),
  scaleBadge: z.string().min(1),
});
export type CalculatorBoardDto = z.infer<typeof CalculatorBoardDtoSchema>;

export const CalculatorSeriesDtoSchema = z.object({
  id: ExamSeriesIdSchema,
  label: z.string().min(1),
  tag: z.string().min(1),
});
export type CalculatorSeriesDto = z.infer<typeof CalculatorSeriesDtoSchema>;

export const CalculatorCatalogResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    boards: z.array(CalculatorBoardDtoSchema),
    seriesOptions: z.array(CalculatorSeriesDtoSchema),
    subjects: z.array(CalculatorSubjectDtoSchema),
    source: z.literal('d1'),
  }),
});
export type CalculatorCatalogResponse = z.infer<typeof CalculatorCatalogResponseSchema>;

export const CalculatorCalculateInputSchema = z.object({
  subjectId: z.string().min(1),
  seriesId: ExamSeriesIdSchema.optional(),
  routeId: z.string().min(1).optional(),
  inputMode: CalculatorInputModeSchema.optional(),
  perPaperSeriesById: z.record(z.string(), ExamSeriesIdSchema).optional(),
  rawMarksByPaper: z.record(z.string(), z.number().nonnegative()).default({}),
  umsMarksByPaper: z.record(z.string(), z.number().nonnegative()).optional(),
});
export type CalculatorCalculateInput = z.infer<typeof CalculatorCalculateInputSchema>;

export const EDEXCEL_MATHS_SUITE_AWARD_MODES = [
  'auto',
  'YMA01+YFM01',
  'YMA01+XFM01',
  'XMA01+XFM01',
  'YMA01',
  'XMA01',
  'YFM01',
  'XFM01',
] as const;
export const EdexcelMathsSuiteAwardModeSchema = z.enum(EDEXCEL_MATHS_SUITE_AWARD_MODES);
export type EdexcelMathsSuiteAwardMode = z.infer<typeof EdexcelMathsSuiteAwardModeSchema>;

export const EdexcelMathsSuiteCalculateInputSchema = z.object({
  selectedUnitCodes: z.array(EdexcelMathsUnitCodeSchema).min(1),
  inputMode: CalculatorInputModeSchema.optional(),
  rawMarksByUnit: z.record(z.string(), z.number().nonnegative()).default({}),
  umsMarksByUnit: z.record(z.string(), z.number().nonnegative()).optional(),
  seriesByUnit: z.record(z.string(), ExamSeriesIdSchema).optional(),
  defaultSeriesId: ExamSeriesIdSchema.optional(),
  awardMode: EdexcelMathsSuiteAwardModeSchema.optional(),
});
export type EdexcelMathsSuiteCalculateInput = z.infer<typeof EdexcelMathsSuiteCalculateInputSchema>;

export const CalculatorSavedSnapshotDtoSchema = z.object({
  id: z.string().min(1),
  userId: z.string().nullable(),
  subjectId: z.string().nullable(),
  boardId: z.union([CalculatorBoardIdSchema, CurriculumBoardIdSchema]),
  subjectCode: z.string().min(1),
  subjectTitle: z.string().min(1),
  seriesId: ExamSeriesIdSchema,
  rawMarksByPaper: z.record(z.string(), z.number().nonnegative()),
  totalRaw: z.number().nonnegative(),
  maxTotalRaw: z.number().positive(),
  totalUms: z.number().nonnegative().nullable(),
  maxTotalUms: z.number().positive().nullable(),
  percentage: z.number().min(0).max(100),
  finalGrade: z.string().min(1),
  createdAt: z.string().min(1),
});
export type CalculatorSavedSnapshotDto = z.infer<typeof CalculatorSavedSnapshotDtoSchema>;

export const PastPaperAttemptInputSchema = z.object({
  subjectId: z.string().min(1),
  paperCode: z.string().min(1),
  seriesId: ExamSeriesIdSchema,
  rawScore: z.number().min(0),
  maxRaw: z.number().positive(),
  timed: z.boolean(),
  weakTopics: z.array(z.string()).default([]),
  reflectionNotes: z.string().max(4000).optional(),
  attemptedAtIso: z.string().datetime().optional(),
});
export type PastPaperAttemptInput = z.infer<typeof PastPaperAttemptInputSchema>;

export const EXAM_COUNTDOWN_CATEGORIES = ['official', 'mock', 'custom'] as const;
export const ExamCountdownCategorySchema = z.enum(EXAM_COUNTDOWN_CATEGORIES);
export type ExamCountdownCategory = z.infer<typeof ExamCountdownCategorySchema>;

export const EXAM_COLOR_TAGS = ['amber', 'emerald', 'indigo', 'rose', 'slate'] as const;
export const ExamColorTagSchema = z.enum(EXAM_COLOR_TAGS);
export type ExamColorTag = z.infer<typeof ExamColorTagSchema>;

export const ExamCountdownItemSchema = z.object({
  id: z.string().min(1),
  boardId: CurriculumBoardIdSchema,
  paperCode: z.string().min(1),
  title: z.string().min(1),
  examDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  examTime24h: z.string().regex(/^\d{2}:\d{2}$/),
  targetGrade: z.string().min(1),
  category: ExamCountdownCategorySchema,
  isCustom: z.boolean(),
  isMock: z.boolean(),
  colorTag: ExamColorTagSchema,
  pinned: z.boolean().default(false),
  syncedToFlow: z.boolean().default(false),
  venueOrNotes: z.string().max(1000).optional(),
});
export type ExamCountdownItem = z.infer<typeof ExamCountdownItemSchema>;

// ============================================================================
// Productivity & Profile Contracts (`@ants/flow` & `@ants/ui`)
// ============================================================================

export const TASK_PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskSubtaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean(),
});
export type TaskSubtask = z.infer<typeof TaskSubtaskSchema>;

export const FlowTaskItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().max(4000).optional(),
  priority: TaskPrioritySchema,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tags: z.array(z.string()).default([]),
  estimatedMinutes: z.number().int().positive(),
  pomodorosPlanned: z.number().int().nonnegative().optional(),
  pomodorosDone: z.number().int().nonnegative().optional(),
  inTodayFocus: z.boolean().default(false),
  done: z.boolean().default(false),
  subtasks: z.array(TaskSubtaskSchema).default([]),
  linkedBlockId: z.string().optional(),
  createdAt: z.string(),
});
export type FlowTaskItem = z.infer<typeof FlowTaskItemSchema>;

export const TIMETABLE_RECURRENCE_RULES = ['none', 'daily', 'weekdays', 'weekly'] as const;
export const TimetableRecurrenceSchema = z.enum(TIMETABLE_RECURRENCE_RULES);
export type TimetableRecurrence = z.infer<typeof TimetableRecurrenceSchema>;

export const TIMETABLE_CATEGORIES = [
  'deep-work',
  'work',
  'study',
  'health',
  'family',
  'commute',
  'meal',
  'buffer',
  'reading',
  'sleep',
] as const;
export const TimetableCategorySchema = z.enum(TIMETABLE_CATEGORIES);
export type TimetableCategory = z.infer<typeof TimetableCategorySchema>;

export const TimetableEventItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinutes: z.number().int().min(0).max(1425),
  endMinutes: z.number().int().min(15).max(1440),
  category: TimetableCategorySchema,
  priority: TaskPrioritySchema.optional(),
  pomodorosPlanned: z.number().int().nonnegative().optional(),
  pomodorosDone: z.number().int().nonnegative().optional(),
  recurrence: TimetableRecurrenceSchema,
  telegramReminder: z.object({
    enabled: z.boolean(),
    leadMinutes: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
    note: z.string().max(500).optional(),
  }),
  notes: z.string().max(2000).optional(),
  completed: z.boolean().optional(),
  locked: z.boolean().optional(),
});
export type TimetableEventItem = z.infer<typeof TimetableEventItemSchema>;

export const POMODORO_PHASES = [
  'focus',
  'short_break',
  'long_break',
  'work',
  'shortBreak',
  'longBreak',
] as const;
export const PomodoroPhaseSchema = z.enum(POMODORO_PHASES);
export type PomodoroPhase = z.infer<typeof PomodoroPhaseSchema>;

export const PomodoroSettingsSchema = z.object({
  workMinutes: z.number().int().min(1).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(90),
  longBreakInterval: z.number().int().min(1).max(12),
  autoStartBreaks: z.boolean(),
  autoStartWork: z.boolean(),
  dailyGoal: z.number().int().min(1).max(40),
  notifications: z.boolean(),
});
export type PomodoroSettings = z.infer<typeof PomodoroSettingsSchema>;

export const PomodoroSessionRecordSchema = z.object({
  id: z.string().min(1),
  phase: PomodoroPhaseSchema,
  startedAt: z.string(),
  endedAt: z.string().optional(),
  durationSeconds: z.number().int().nonnegative(),
  completed: z.boolean(),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
});
export type PomodoroSessionRecord = z.infer<typeof PomodoroSessionRecordSchema>;

export const TUTOR_SLOT_STATUSES = ['available', 'flexible', 'unavailable'] as const;
export const TutorSlotStatusSchema = z.enum(TUTOR_SLOT_STATUSES);
export type TutorSlotStatus = z.infer<typeof TutorSlotStatusSchema>;

export const TELEGRAM_LINK_STATUSES = ['unlinked', 'pending', 'linked', 'connected'] as const;
export const TelegramLinkStatusSchema = z.enum(TELEGRAM_LINK_STATUSES);
export type TelegramLinkStatus = z.infer<typeof TelegramLinkStatusSchema>;

export const TelegramNotificationPrefsSchema = z.object({
  blockReminders: z.boolean(),
  defaultLeadMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
  dailyMorningDigest: z.boolean(),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/),
  examCountdownAlerts: z.boolean(),
  tutorInquiryAlerts: z.boolean(),
});
export type TelegramNotificationPrefs = z.infer<typeof TelegramNotificationPrefsSchema>;
export type TelegramLeadMinutes = TelegramNotificationPrefs['defaultLeadMinutes'];

// ============================================================================
// Organization Showcase Contracts (`@ants/org`)
// ============================================================================

export const ORG_MEMBER_CATEGORIES = ['founder', 'tutor', 'contributor', 'alumni'] as const;
export const OrgMemberCategorySchema = z.enum(ORG_MEMBER_CATEGORIES);
export type OrgMemberCategory = z.infer<typeof OrgMemberCategorySchema>;

export const ORG_ACTIVITY_CATEGORIES = [
  'tutoring',
  'students_meet',
  'exam_venue_visit',
  'hackathon',
] as const;
export const OrgActivityCategorySchema = z.enum(ORG_ACTIVITY_CATEGORIES);
export type OrgActivityCategory = z.infer<typeof OrgActivityCategorySchema>;

export const OrgArticleSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  authorName: z.string().min(1),
  authorUsername: z.string().min(1),
  publishedAtIso: z.string(),
  readingTimeMinutes: z.number().int().positive(),
  tags: z.array(z.string()),
});
export type OrgArticleSummary = z.infer<typeof OrgArticleSummarySchema>;

// ============================================================================
// Authentication & Cross-Subdomain SSO Contracts (`@ants/api` & `@ants/auth-client`)
// ============================================================================

export const ACADEMIC_TRACK_OPTIONS = ['igcse', 'ial', 'tutor', 'productivity'] as const;
export const AcademicTrackOptionSchema = z.enum(ACADEMIC_TRACK_OPTIONS);
export type AcademicTrackOption = z.infer<typeof AcademicTrackOptionSchema>;

export const AuthSignUpInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,24}$/,
      'Username must be 3-24 lowercase letters, numbers, or underscores.'
    )
    .optional(),
  academicTrack: AcademicTrackOptionSchema.default('ial'),
  rememberMe: z.boolean().default(true),
  image: z.string().url().optional(),
});
export type AuthSignUpInput = z.infer<typeof AuthSignUpInputSchema>;

export const AuthSignInEmailInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.').max(128),
  rememberMe: z.boolean().default(true),
});
export type AuthSignInEmailInput = z.infer<typeof AuthSignInEmailInputSchema>;

export const AuthUserDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  username: z.string().min(1),
  role: UserRoleSchema,
  roles: z.array(UserRoleSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AuthUserDto = z.infer<typeof AuthUserDtoSchema>;

export const AuthSessionDtoSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});
export type AuthSessionDto = z.infer<typeof AuthSessionDtoSchema>;

export const AuthProfileSummaryDtoSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  headline: z.string(),
  bio: z.string(),
  institution: z.string(),
  curriculumLabel: z.string(),
  timezone: z.string(),
  preferredApp: z.enum(['flow', 'study']),
  role: UserRoleSchema,
  roles: z.array(UserRoleSchema).min(1),
  xp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  telegramStatus: TelegramLinkStatusSchema,
  isTutor: z.boolean(),
});
export type AuthProfileSummaryDto = z.infer<typeof AuthProfileSummaryDtoSchema>;

export const AuthSessionBundleSchema = z.object({
  user: AuthUserDtoSchema,
  session: AuthSessionDtoSchema,
  profile: AuthProfileSummaryDtoSchema,
});
export type AuthSessionBundle = z.infer<typeof AuthSessionBundleSchema>;

// ============================================================================
// Private R2 Object Storage Proxy Contracts (`@ants/api` /api/storage/*)
// ============================================================================

export const STORAGE_BUCKET_PREFIXES = [
  'org',
  'articles',
  'activities',
  'avatars',
  'study',
  'private',
] as const;
export const StoragePrefixSchema = z.enum(STORAGE_BUCKET_PREFIXES);
export type StoragePrefix = z.infer<typeof StoragePrefixSchema>;

export const StorageUploadDataUrlInputSchema = z.object({
  dataUrl: z
    .string()
    .trim()
    .regex(/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i, 'Invalid base64 Data URL.'),
  prefix: StoragePrefixSchema.default('org'),
  filename: z.string().trim().min(1).max(160).optional(),
  key: z.string().trim().min(1).max(320).optional(),
  cacheControl: z.string().trim().min(1).max(200).optional(),
});
export type StorageUploadDataUrlInput = z.infer<typeof StorageUploadDataUrlInputSchema>;

export const StorageFileMetadataDtoSchema = z.object({
  key: z.string().min(1),
  url: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  etag: z.string(),
  uploadedAt: z.string(),
  visibility: z.enum(['public', 'private']),
});
export type StorageFileMetadataDto = z.infer<typeof StorageFileMetadataDtoSchema>;

// ============================================================================
// Telegram Bot Linking, Preferences & Webhook Contracts (`/api/telegram/*`)
// ============================================================================

export const TELEGRAM_VERIFICATION_CODE_REGEX = /^ANT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/i;

export const TelegramLinkStartInputSchema = z.object({
  draftHandle: z.string().trim().max(40).optional(),
});
export type TelegramLinkStartInput = z.infer<typeof TelegramLinkStartInputSchema>;

export const TelegramPreferencesUpdateInputSchema = TelegramNotificationPrefsSchema.partial();
export type TelegramPreferencesUpdateInput = z.infer<typeof TelegramPreferencesUpdateInputSchema>;

export const TelegramTestPingInputSchema = z.object({
  message: z.string().trim().min(1).max(600).optional(),
  dispatchImmediately: z.boolean().default(true),
});
export type TelegramTestPingInput = z.infer<typeof TelegramTestPingInputSchema>;

export const TelegramStatusDtoSchema = z.object({
  status: TelegramLinkStatusSchema,
  handle: z.string(),
  chatId: z.string().nullable(),
  botUsername: z.string().min(1),
  verificationCode: z.string().nullable(),
  codeExpiresAt: z.string().nullable(),
  linkedAt: z.string().nullable(),
  startCommand: z.string().nullable(),
  deepLinkUrl: z.string().nullable(),
  preferences: TelegramNotificationPrefsSchema,
});
export type TelegramStatusDto = z.infer<typeof TelegramStatusDtoSchema>;

export const TelegramWebhookChatSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    type: z.string().optional(),
    username: z.string().optional(),
  })
  .passthrough();

export const TelegramWebhookFromSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    is_bot: z.boolean().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
  })
  .passthrough();

export const TelegramWebhookMessageSchema = z
  .object({
    message_id: z.number().optional(),
    date: z.number().optional(),
    text: z.string().optional(),
    chat: TelegramWebhookChatSchema,
    from: TelegramWebhookFromSchema.optional(),
  })
  .passthrough();

export const TelegramWebhookUpdateSchema = z
  .object({
    update_id: z.number().optional(),
    message: TelegramWebhookMessageSchema.optional(),
    edited_message: TelegramWebhookMessageSchema.optional(),
  })
  .passthrough();
export type TelegramWebhookUpdate = z.infer<typeof TelegramWebhookUpdateSchema>;
