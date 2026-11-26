import { z } from 'zod';
import {
  EdexcelMathsCashInCodeSchema,
  EdexcelMathsUnitCodeSchema,
  EdexcelMathsValidationResultSchema,
} from './edexcel-maths';
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

export const ORG_ACTIVITY_DISPLAY_CATEGORIES = [
  'Tutoring',
  "Student's Meet",
  'Exam Venue Visit',
  'Hackathon',
] as const;
export const OrgActivityDisplayCategorySchema = z.enum(ORG_ACTIVITY_DISPLAY_CATEGORIES);
export type OrgActivityDisplayCategory = z.infer<typeof OrgActivityDisplayCategorySchema>;

export const ORG_ARTICLE_CATEGORIES = [
  'Study Guide',
  'Exam Strategy',
  'Productivity',
  'Announcement',
] as const;
export const OrgArticleCategorySchema = z.enum(ORG_ARTICLE_CATEGORIES);
export type OrgArticleCategory = z.infer<typeof OrgArticleCategorySchema>;

export const ORG_ARTWORK_THEMES = [
  'tutoring',
  'meetup',
  'venue',
  'hackathon',
  'article-ums',
  'article-focus',
  'article-maths',
] as const;
export const OrgArtworkThemeSchema = z.enum(ORG_ARTWORK_THEMES);
export type OrgArtworkTheme = z.infer<typeof OrgArtworkThemeSchema>;

/**
 * Converts either snake_case DB `org_activities.category` values or display labels
 * into canonical Title Case UI categories.
 */
export function toOrgActivityDisplayCategory(raw: string): OrgActivityDisplayCategory {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'hackathon') return 'Hackathon';
  if (normalized === 'exam_venue_visit' || normalized === 'exam venue visit') {
    return 'Exam Venue Visit';
  }
  if (
    normalized === 'students_meet' ||
    normalized === "student's meet" ||
    normalized === 'students meet'
  ) {
    return "Student's Meet";
  }
  return 'Tutoring';
}

/**
 * Converts either Title Case UI activity labels or DB enums into canonical
 * snake_case `org_activities.category` values.
 */
export function toOrgActivityDbCategory(raw: string): OrgActivityCategory {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'hackathon') return 'hackathon';
  if (normalized === 'exam_venue_visit' || normalized === 'exam venue visit') {
    return 'exam_venue_visit';
  }
  if (
    normalized === 'students_meet' ||
    normalized === "student's meet" ||
    normalized === 'students meet'
  ) {
    return 'students_meet';
  }
  return 'tutoring';
}

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

export const OrgMissionPillarDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
});
export type OrgMissionPillarDto = z.infer<typeof OrgMissionPillarDtoSchema>;

export const OrgImpactStatDtoSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
  label: z.string().min(1),
  detail: z.string(),
});
export type OrgImpactStatDto = z.infer<typeof OrgImpactStatDtoSchema>;

export const OrgHackathonBannerDtoSchema = z.object({
  title: z.string().min(1),
  dateLabel: z.string(),
  location: z.string(),
  summary: z.string(),
  externalUrl: z.string().min(1),
  ctaLabel: z.string().min(1),
});
export type OrgHackathonBannerDto = z.infer<typeof OrgHackathonBannerDtoSchema>;

export const OrgFeaturedMemberDtoSchema = z.object({
  username: z.string().min(1),
  name: z.string().min(1),
  roleBadge: z.string().min(1),
  title: z.string(),
  specialization: z.string(),
  availabilityLabel: z.string(),
});
export type OrgFeaturedMemberDto = z.infer<typeof OrgFeaturedMemberDtoSchema>;

export const OrgActivityPreviewDtoSchema = z.object({
  slug: z.string().min(1),
  category: OrgActivityDisplayCategorySchema,
  title: z.string().min(1),
  dateLabel: z.string(),
  location: z.string(),
  summary: z.string(),
  coverImageSrc: z.string().optional(),
});
export type OrgActivityPreviewDto = z.infer<typeof OrgActivityPreviewDtoSchema>;

export const OrgTutorWeeklyScheduleDtoSchema = z.record(
  z.string(),
  z.record(z.string(), TutorSlotStatusSchema)
);
export type OrgTutorWeeklyScheduleDto = z.infer<typeof OrgTutorWeeklyScheduleDtoSchema>;

export const ORG_TEAM_MEMBER_SOURCES = [
  'org_team_member',
  'tutor_profile',
  'merged',
] as const;
export const OrgTeamMemberSourceSchema = z.enum(ORG_TEAM_MEMBER_SOURCES);
export type OrgTeamMemberSource = z.infer<typeof OrgTeamMemberSourceSchema>;

export const OrgTeamMemberDtoSchema = z.object({
  id: z.string().min(1),
  userId: z.string().nullable(),
  username: z.string().min(1),
  name: z.string().min(1),
  initials: z.string().min(1),
  roleCategories: z.array(OrgMemberCategorySchema).min(1),
  roleBadge: z.string().min(1),
  isFounder: z.boolean(),
  isTutor: z.boolean(),
  headline: z.string(),
  bio: z.string(),
  institution: z.string(),
  specialization: z.string(),
  curriculums: z.array(z.string()),
  taughtSubjects: z.array(z.string()),
  hourlyRateLabel: z.string().optional(),
  timezoneLabel: z.string(),
  tutorTelegramUsername: z.string().optional(),
  weeklySchedule: OrgTutorWeeklyScheduleDtoSchema,
  achievements: z.array(z.string()),
  joinedLabel: z.string(),
  displayOrder: z.number().int(),
  source: OrgTeamMemberSourceSchema,
});
export type OrgTeamMemberDto = z.infer<typeof OrgTeamMemberDtoSchema>;

export const OrgActivityExternalLinkDtoSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  variant: z.enum(['primary', 'secondary']).optional(),
});
export type OrgActivityExternalLinkDto = z.infer<typeof OrgActivityExternalLinkDtoSchema>;

export const OrgActivityPhaseDtoSchema = z.object({
  window: z.string(),
  phase: z.string(),
  mode: z.string(),
  summary: z.string(),
});
export type OrgActivityPhaseDto = z.infer<typeof OrgActivityPhaseDtoSchema>;

export const OrgActivityPhotoDtoSchema = z.object({
  id: z.string().min(1),
  imageSrc: z.string().min(1),
  imageAlt: z.string(),
  caption: z.string(),
  locationTag: z.string(),
  shotLabel: z.string(),
  artworkTheme: OrgArtworkThemeSchema,
});
export type OrgActivityPhotoDto = z.infer<typeof OrgActivityPhotoDtoSchema>;

export const OrgActivityDtoSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  category: OrgActivityDisplayCategorySchema,
  dbCategory: OrgActivityCategorySchema,
  isUpcoming: z.boolean(),
  title: z.string().min(1),
  dateLabel: z.string(),
  location: z.string(),
  attendanceLabel: z.string(),
  facilitators: z.array(z.string()),
  summary: z.string(),
  recapParagraphs: z.array(z.string()),
  highlights: z.array(z.string()),
  externalLinks: z.array(OrgActivityExternalLinkDtoSchema).optional(),
  schedulePhases: z.array(OrgActivityPhaseDtoSchema).optional(),
  coverImageSrc: z.string().min(1),
  coverAlt: z.string(),
  artworkTheme: OrgArtworkThemeSchema,
  gallery: z.array(OrgActivityPhotoDtoSchema),
  displayOrder: z.number().int(),
});
export type OrgActivityDto = z.infer<typeof OrgActivityDtoSchema>;

export const OrgArticleCalloutDtoSchema = z.object({
  title: z.string(),
  body: z.string(),
});
export type OrgArticleCalloutDto = z.infer<typeof OrgArticleCalloutDtoSchema>;

export const OrgArticleSectionDtoSchema = z.object({
  id: z.string().min(1),
  heading: z.string(),
  paragraphs: z.array(z.string()),
  callout: OrgArticleCalloutDtoSchema.optional(),
  codeSnippet: z.string().optional(),
  checklist: z.array(z.string()).optional(),
});
export type OrgArticleSectionDto = z.infer<typeof OrgArticleSectionDtoSchema>;

export const OrgArticleDtoSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  category: OrgArticleCategorySchema,
  title: z.string().min(1),
  subtitle: z.string(),
  publishedAtIso: z.string(),
  publishedLabel: z.string(),
  readMinutes: z.number().int().positive(),
  authorUsername: z.string().min(1),
  authorName: z.string().min(1),
  authorRole: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  artworkTheme: OrgArtworkThemeSchema,
  coverImageSrc: z.string().optional(),
  coverCode: z.string().optional(),
  coverFormula: z.string().optional(),
  coverMetric: z.string().optional(),
  isFeatured: z.boolean(),
  sections: z.array(OrgArticleSectionDtoSchema),
  markdownBody: z.string().optional(),
});
export type OrgArticleDto = z.infer<typeof OrgArticleDtoSchema>;

export const OrgHomePayloadDtoSchema = z.object({
  heroBadge: z.string(),
  heroTitle: z.string(),
  heroHighlight: z.string(),
  heroDescription: z.string(),
  missionStatement: z.string(),
  impactStats: z.array(OrgImpactStatDtoSchema),
  missionPillars: z.array(OrgMissionPillarDtoSchema),
  hackathonBanner: OrgHackathonBannerDtoSchema.nullable(),
  socialLinks: z.record(z.string(), z.string()),
  featuredMembers: z.array(OrgFeaturedMemberDtoSchema),
  recentActivities: z.array(OrgActivityPreviewDtoSchema),
  counts: z.object({
    teamCount: z.number().int().nonnegative(),
    tutorCount: z.number().int().nonnegative(),
    activityCount: z.number().int().nonnegative(),
    articleCount: z.number().int().nonnegative(),
    boundaryTablesCount: z.number().int().nonnegative(),
  }),
});
export type OrgHomePayloadDto = z.infer<typeof OrgHomePayloadDtoSchema>;

export const OrgTeamListResponseDtoSchema = z.object({
  members: z.array(OrgTeamMemberDtoSchema),
  total: z.number().int().nonnegative(),
  tutorCount: z.number().int().nonnegative(),
});
export type OrgTeamListResponseDto = z.infer<typeof OrgTeamListResponseDtoSchema>;

export const OrgTeamMemberDetailResponseDtoSchema = z.object({
  member: OrgTeamMemberDtoSchema,
});
export type OrgTeamMemberDetailResponseDto = z.infer<typeof OrgTeamMemberDetailResponseDtoSchema>;

export const OrgActivityListResponseDtoSchema = z.object({
  activities: z.array(OrgActivityDtoSchema),
  total: z.number().int().nonnegative(),
});
export type OrgActivityListResponseDto = z.infer<typeof OrgActivityListResponseDtoSchema>;

export const OrgActivityDetailResponseDtoSchema = z.object({
  activity: OrgActivityDtoSchema,
  relatedActivities: z.array(OrgActivityDtoSchema),
});
export type OrgActivityDetailResponseDto = z.infer<typeof OrgActivityDetailResponseDtoSchema>;

export const OrgArticleListResponseDtoSchema = z.object({
  articles: z.array(OrgArticleDtoSchema),
  authors: z.array(OrgTeamMemberDtoSchema),
  total: z.number().int().nonnegative(),
});
export type OrgArticleListResponseDto = z.infer<typeof OrgArticleListResponseDtoSchema>;

export const OrgArticleDetailResponseDtoSchema = z.object({
  article: OrgArticleDtoSchema,
  relatedArticles: z.array(OrgArticleDtoSchema),
});
export type OrgArticleDetailResponseDto = z.infer<typeof OrgArticleDetailResponseDtoSchema>;

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

// ============================================================================
// Admin CMS Contracts (`/api/admin/*`, `[THAW-2.3]`)
// ============================================================================

export const AdminOrgSettingsUpdateInputSchema = z.object({
  heroHeadline: z.string().trim().min(1).max(300),
  heroSubheadline: z.string().trim().min(1).max(600),
  missionStatement: z.string().trim().min(1).max(2000),
  missionPillars: z.array(OrgMissionPillarDtoSchema).max(12),
  hackathonBanner: OrgHackathonBannerDtoSchema.nullable().default(null),
  socialLinks: z.record(z.string(), z.string()).default({}),
});
export type AdminOrgSettingsUpdateInput = z.infer<
  typeof AdminOrgSettingsUpdateInputSchema
>;

export const AdminOrgSettingsDtoSchema = AdminOrgSettingsUpdateInputSchema.extend({
  id: z.string().min(1),
  updatedAt: z.string(),
});
export type AdminOrgSettingsDto = z.infer<typeof AdminOrgSettingsDtoSchema>;

export const AdminOrgTeamMemberUpsertInputSchema = z.object({
  id: z.string().min(1).optional(),
  userId: z.string().min(1).nullable().optional(),
  username: z.string().trim().min(2).max(60),
  name: z.string().trim().min(1).max(160),
  initials: z.string().trim().max(4).optional(),
  roleBadge: z.string().trim().min(1).max(120),
  roleCategories: z.array(OrgMemberCategorySchema).min(1),
  isFounder: z.boolean().default(false),
  isTutor: z.boolean().default(false),
  headline: z.string().max(300).default(''),
  bio: z.string().max(4000).default(''),
  institution: z.string().max(200).default(''),
  specialization: z.string().max(300).default(''),
  curriculums: z.array(z.string()).default([]),
  taughtSubjects: z.array(z.string()).default([]),
  hourlyRateLabel: z.string().max(120).nullable().optional(),
  timezoneLabel: z.string().max(120).default('Asia/Yangon (UTC+06:30)'),
  tutorTelegramUsername: z.string().max(80).nullable().optional(),
  weeklySchedule: OrgTutorWeeklyScheduleDtoSchema.default({}),
  achievements: z.array(z.string()).default([]),
  joinedLabel: z.string().max(120).default(''),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});
export type AdminOrgTeamMemberUpsertInput = z.infer<
  typeof AdminOrgTeamMemberUpsertInputSchema
>;

export const AdminOrgActivityUpsertInputSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z.string().trim().min(1).max(160),
  category: z.union([OrgActivityCategorySchema, OrgActivityDisplayCategorySchema]),
  isUpcoming: z.boolean().default(false),
  title: z.string().trim().min(1).max(240),
  dateLabel: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(200),
  attendanceLabel: z.string().max(120).default(''),
  facilitators: z.array(z.string()).default([]),
  summary: z.string().trim().min(1).max(2000),
  recapParagraphs: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  externalLinks: z.array(OrgActivityExternalLinkDtoSchema).optional(),
  schedulePhases: z.array(OrgActivityPhaseDtoSchema).optional(),
  coverImageSrc: z.string().trim().min(1),
  coverAlt: z.string().max(400).default(''),
  gallery: z.array(OrgActivityPhotoDtoSchema).default([]),
  displayOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});
export type AdminOrgActivityUpsertInput = z.infer<
  typeof AdminOrgActivityUpsertInputSchema
>;

export const AdminOrgArticleUpsertInputSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(240),
  subtitle: z.string().max(400).default(''),
  summary: z.string().trim().min(1).max(2000),
  category: OrgArticleCategorySchema.default('Study Guide'),
  authorName: z.string().trim().min(1).max(160),
  authorUsername: z.string().trim().min(1).max(80),
  authorRole: z.string().max(120).default('Contributor'),
  publishedAtIso: z.string().optional(),
  readMinutes: z.number().int().positive().default(5),
  tags: z.array(z.string()).default([]),
  coverImageSrc: z.string().nullable().optional(),
  coverCode: z.string().max(80).nullable().optional(),
  coverFormula: z.string().max(160).nullable().optional(),
  coverMetric: z.string().max(120).nullable().optional(),
  sections: z.array(OrgArticleSectionDtoSchema).default([]),
  markdownBody: z.string().default(''),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});
export type AdminOrgArticleUpsertInput = z.infer<
  typeof AdminOrgArticleUpsertInputSchema
>;

export const AdminOrgTeamMemberRecordDtoSchema = OrgTeamMemberDtoSchema.extend({
  isPublished: z.boolean(),
});
export type AdminOrgTeamMemberRecordDto = z.infer<
  typeof AdminOrgTeamMemberRecordDtoSchema
>;

export const AdminOrgActivityRecordDtoSchema = OrgActivityDtoSchema.extend({
  isPublished: z.boolean(),
});
export type AdminOrgActivityRecordDto = z.infer<
  typeof AdminOrgActivityRecordDtoSchema
>;

export const AdminOrgArticleRecordDtoSchema = OrgArticleDtoSchema.extend({
  isPublished: z.boolean(),
});
export type AdminOrgArticleRecordDto = z.infer<typeof AdminOrgArticleRecordDtoSchema>;

export const AdminUserSummaryDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(1),
  role: UserRoleSchema,
  roles: z.array(UserRoleSchema).min(1),
  isTutor: z.boolean(),
  createdAt: z.string(),
});
export type AdminUserSummaryDto = z.infer<typeof AdminUserSummaryDtoSchema>;

export const AdminUserRolesUpdateInputSchema = z.object({
  role: UserRoleSchema,
  roles: z.array(UserRoleSchema).min(1),
});
export type AdminUserRolesUpdateInput = z.infer<
  typeof AdminUserRolesUpdateInputSchema
>;

export const AdminOrgBootstrapDtoSchema = z.object({
  settings: AdminOrgSettingsDtoSchema,
  team: z.array(AdminOrgTeamMemberRecordDtoSchema),
  activities: z.array(AdminOrgActivityRecordDtoSchema),
  articles: z.array(AdminOrgArticleRecordDtoSchema),
  users: z.array(AdminUserSummaryDtoSchema),
  capabilities: z.object({
    canManageSettings: z.boolean(),
    canManageRoles: z.boolean(),
    canManageContent: z.boolean(),
  }),
});
export type AdminOrgBootstrapDto = z.infer<typeof AdminOrgBootstrapDtoSchema>;

// ============================================================================
// Flow Productivity API Contracts (`/api/flow/*`, `[THAW-3.1]`–`[THAW-3.3]`)
// ============================================================================

export const FlowPomodoroSettingsDtoSchema = z.object({
  workMinutes: z.number().int().min(1).max(180).default(25),
  shortBreakMinutes: z.number().int().min(1).max(60).default(5),
  longBreakMinutes: z.number().int().min(1).max(90).default(15),
  longBreakInterval: z.number().int().min(1).max(12).default(4),
  autoStartBreaks: z.boolean().default(false),
  autoStartWork: z.boolean().default(false),
  dailyGoal: z.number().int().min(1).max(40).default(8),
  notificationsEnabled: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
  soundVolume: z.number().min(0).max(1).default(0.7),
  tickingEnabled: z.boolean().default(true),
  tickingVolume: z.number().min(0).max(1).default(0.35),
  ambientScene: z.string().default('none'),
  ambientSound: z.string().default('off'),
  appearanceMode: z.enum(['light', 'dark', 'system']).default('light'),
  appearanceAccent: z.string().default('amber'),
  appearanceFont: z.string().default('jakarta'),
});
export type FlowPomodoroSettingsDto = z.infer<typeof FlowPomodoroSettingsDtoSchema>;

export const FlowPomodoroSessionDtoSchema = z.object({
  id: z.string().min(1),
  phase: z.enum(['work', 'shortBreak', 'longBreak']),
  startedAtIso: z.string(),
  endedAtIso: z.string().nullable(),
  durationSeconds: z.number().int().nonnegative(),
  completed: z.boolean(),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  xpAwarded: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type FlowPomodoroSessionDto = z.infer<typeof FlowPomodoroSessionDtoSchema>;

export const FlowPomodoroSessionCreateInputSchema = z.object({
  id: z.string().min(1).optional(),
  phase: z.enum(['work', 'shortBreak', 'longBreak']).default('work'),
  startedAtIso: z.string().min(1),
  endedAtIso: z.string().nullable().optional(),
  durationSeconds: z.number().int().nonnegative(),
  completed: z.boolean().default(true),
  taskId: z.string().nullable().optional(),
  taskTitle: z.string().max(300).nullable().optional(),
});
export type FlowPomodoroSessionCreateInput = z.infer<
  typeof FlowPomodoroSessionCreateInputSchema
>;

export const FlowPomodoroStateDtoSchema = z.object({
  settings: FlowPomodoroSettingsDtoSchema,
  sessions: z.array(FlowPomodoroSessionDtoSchema),
  userXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
});
export type FlowPomodoroStateDto = z.infer<typeof FlowPomodoroStateDtoSchema>;

export const FlowTaskDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  notes: z.string(),
  priority: TaskPrioritySchema,
  dueDateIso: z.string().nullable(),
  tags: z.array(z.string()),
  estimatedMinutes: z.number().int().positive(),
  pomodorosPlanned: z.number().int().nonnegative(),
  pomodorosDone: z.number().int().nonnegative(),
  inTodayFocus: z.boolean(),
  done: z.boolean(),
  subtasks: z.array(TaskSubtaskSchema),
  linkedBlockId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FlowTaskDto = z.infer<typeof FlowTaskDtoSchema>;

export const FlowTaskUpsertInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(300),
  notes: z.string().max(4000).default(''),
  priority: TaskPrioritySchema.default('P3'),
  dueDateIso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  tags: z.array(z.string()).default([]),
  estimatedMinutes: z.number().int().positive().default(25),
  pomodorosPlanned: z.number().int().nonnegative().default(1),
  pomodorosDone: z.number().int().nonnegative().default(0),
  inTodayFocus: z.boolean().default(false),
  done: z.boolean().default(false),
  subtasks: z.array(TaskSubtaskSchema).default([]),
  linkedBlockId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
});
export type FlowTaskUpsertInput = z.infer<typeof FlowTaskUpsertInputSchema>;

export const FlowTasksSyncInputSchema = z.object({
  tasks: z.array(FlowTaskUpsertInputSchema),
});
export type FlowTasksSyncInput = z.infer<typeof FlowTasksSyncInputSchema>;

export const FlowTasksListDtoSchema = z.object({
  tasks: z.array(FlowTaskDtoSchema),
});
export type FlowTasksListDto = z.infer<typeof FlowTasksListDtoSchema>;

export const FLOW_REMINDER_LEAD_MINUTES = [0, 5, 10, 15, 30] as const;

export const FlowTimetableBlockDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinutes: z.number().int().min(0).max(1425),
  endMinutes: z.number().int().min(15).max(1440),
  category: TimetableCategorySchema,
  priority: TaskPrioritySchema.optional(),
  pomodorosPlanned: z.number().int().nonnegative(),
  pomodorosDone: z.number().int().nonnegative(),
  recurrence: TimetableRecurrenceSchema,
  telegramEnabled: z.boolean(),
  telegramLeadMinutes: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(10),
    z.literal(15),
    z.literal(30),
  ]),
  telegramNote: z.string().optional(),
  notes: z.string(),
  completed: z.boolean(),
  locked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type FlowTimetableBlockDto = z.infer<typeof FlowTimetableBlockDtoSchema>;

export const FlowTimetableBlockUpsertInputSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(300),
  dateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinutes: z.number().int().min(0).max(1425),
  endMinutes: z.number().int().min(15).max(1440),
  category: TimetableCategorySchema.default('deep-work'),
  priority: TaskPrioritySchema.optional(),
  pomodorosPlanned: z.number().int().nonnegative().default(0),
  pomodorosDone: z.number().int().nonnegative().default(0),
  recurrence: TimetableRecurrenceSchema.default('none'),
  telegramEnabled: z.boolean().default(false),
  telegramLeadMinutes: z
    .union([z.literal(0), z.literal(5), z.literal(10), z.literal(15), z.literal(30)])
    .default(10),
  telegramNote: z.string().max(500).optional(),
  notes: z.string().max(2000).default(''),
  completed: z.boolean().default(false),
  locked: z.boolean().default(false),
});
export type FlowTimetableBlockUpsertInput = z.infer<
  typeof FlowTimetableBlockUpsertInputSchema
>;

export const FlowSyncedExamDtoSchema = z.object({
  id: z.string().min(1),
  board: z.string(),
  code: z.string(),
  title: z.string(),
  examDate: z.string(),
  daysLeft: z.number().int(),
  tone: z.enum(['danger', 'primary', 'success']),
  targetGrade: z.string().optional(),
});
export type FlowSyncedExamDto = z.infer<typeof FlowSyncedExamDtoSchema>;

export const FlowTimetableBootstrapDtoSchema = z.object({
  blocks: z.array(FlowTimetableBlockDtoSchema),
  exams: z.array(FlowSyncedExamDtoSchema),
  telegramConnected: z.boolean(),
  telegramHandle: z.string(),
});
export type FlowTimetableBootstrapDto = z.infer<typeof FlowTimetableBootstrapDtoSchema>;

// ============================================================================
// Shared Account & Public Profile Contracts (`/api/account/*`, `[THAW-3.4]`)
// ============================================================================

export const AccountPortfolioItemDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  category: z.enum([
    'Study Notes',
    'Build & Tooling',
    'Research & Essays',
    'Exam Prep',
  ]),
  summary: z.string().max(1000).default(''),
  tags: z.array(z.string()).default([]),
  linkLabel: z.string().max(120).optional(),
  href: z.string().max(400).optional(),
  updatedLabel: z.string().max(60).default('Nov 2026'),
});
export type AccountPortfolioItemDto = z.infer<typeof AccountPortfolioItemDtoSchema>;

export const AccountCertificationDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  issuer: z.string().trim().min(1).max(160),
  year: z.string().trim().min(1).max(20),
  credentialCode: z.string().max(120).optional(),
  verified: z.boolean().default(false),
});
export type AccountCertificationDto = z.infer<typeof AccountCertificationDtoSchema>;

export const AccountVisibilityDtoSchema = z.object({
  showStatsStreak: z.boolean().default(true),
  showPortfolioProjects: z.boolean().default(true),
  showCertifications: z.boolean().default(true),
  showTutorSchedule: z.boolean().default(true),
  showTelegramInquiry: z.boolean().default(true),
});
export type AccountVisibilityDto = z.infer<typeof AccountVisibilityDtoSchema>;

export const AccountProfileDtoSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  username: z.string().min(1),
  email: z.string(),
  headline: z.string(),
  bio: z.string(),
  institution: z.string(),
  curriculumLabel: z.string(),
  timezone: z.string(),
  preferredApp: z.enum(['flow', 'study']),
  memberSince: z.string(),
  role: UserRoleSchema,
  roles: z.array(UserRoleSchema).min(1),
  xp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  focusHoursThisMonth: z.number().nonnegative(),
  completedSessions: z.number().int().nonnegative(),
  hourlyRateLabel: z.string(),
  tutorTelegramUsername: z.string(),
  curriculums: z.array(z.string()),
  taughtSubjects: z.array(z.string()),
  featuredOnOrg: z.boolean(),
  tutorSchedule: OrgTutorWeeklyScheduleDtoSchema,
  portfolioItems: z.array(AccountPortfolioItemDtoSchema),
  certifications: z.array(AccountCertificationDtoSchema),
  telegram: TelegramStatusDtoSchema,
  visibility: AccountVisibilityDtoSchema,
});
export type AccountProfileDto = z.infer<typeof AccountProfileDtoSchema>;

export const AccountProfileUpdateInputSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_-]{2,31}$/, 'Username must be 3–32 safe characters.')
    .optional(),
  headline: z.string().max(300).optional(),
  bio: z.string().max(4000).optional(),
  institution: z.string().max(200).optional(),
  curriculumLabel: z.string().max(120).optional(),
  timezone: z.string().max(120).optional(),
  preferredApp: z.enum(['flow', 'study']).optional(),
  hourlyRateLabel: z.string().max(120).optional(),
  tutorTelegramUsername: z.string().max(80).optional(),
  curriculums: z.array(z.string()).optional(),
  taughtSubjects: z.array(z.string()).optional(),
  featuredOnOrg: z.boolean().optional(),
  tutorSchedule: OrgTutorWeeklyScheduleDtoSchema.optional(),
  portfolioItems: z.array(AccountPortfolioItemDtoSchema).optional(),
  certifications: z.array(AccountCertificationDtoSchema).optional(),
  visibility: AccountVisibilityDtoSchema.optional(),
});
export type AccountProfileUpdateInput = z.infer<typeof AccountProfileUpdateInputSchema>;

export const PublicProfileSwitchDtoSchema = z.object({
  username: z.string().min(1),
  name: z.string().min(1),
  roleLabel: z.string().min(1),
});
export type PublicProfileSwitchDto = z.infer<typeof PublicProfileSwitchDtoSchema>;

export const PublicProfileResponseDtoSchema = z.object({
  profile: AccountProfileDtoSchema,
  isOwnProfile: z.boolean(),
  availableProfiles: z.array(PublicProfileSwitchDtoSchema),
});
export type PublicProfileResponseDto = z.infer<typeof PublicProfileResponseDtoSchema>;

// ============================================================================
// Study Workspace Contracts (`/api/study/*`, Stage T4 `[THAW-4.1]`–`[THAW-4.5]`)
// ============================================================================

export const STUDY_SUBJECT_FACULTIES = [
  'Mathematics',
  'Sciences',
  'Computing & Economics',
  'Languages & Humanities',
] as const;
export const StudySubjectFacultySchema = z.enum(STUDY_SUBJECT_FACULTIES);
export type StudySubjectFaculty = z.infer<typeof StudySubjectFacultySchema>;

export const StudyBoardDtoSchema = z.object({
  id: CurriculumBoardIdSchema,
  label: z.string().min(1),
  shortLabel: z.string().min(1),
  qualificationLevel: z.string().min(1),
  gradingScaleLabel: z.string().min(1),
  summary: z.string(),
});
export type StudyBoardDto = z.infer<typeof StudyBoardDtoSchema>;

export const StudySubjectUnitDtoSchema = z.object({
  code: z.string().min(1),
  shortCode: z.string().min(1),
  title: z.string().min(1),
  level: z.enum(['AS', 'A2', 'Core', 'Extended']),
  maxUms: z.number().int().positive().optional(),
  maxRaw: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  compulsory: z.boolean().optional(),
});
export type StudySubjectUnitDto = z.infer<typeof StudySubjectUnitDtoSchema>;

export const StudyTopicPreviewDtoSchema = z.object({
  code: z.string().min(1),
  unitCode: z.string().min(1),
  title: z.string().min(1),
  subtopicCount: z.number().int().nonnegative(),
  status: TopicConfidenceStatusSchema,
});
export type StudyTopicPreviewDto = z.infer<typeof StudyTopicPreviewDtoSchema>;

export const StudyCatalogSubjectDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  boardId: CurriculumBoardIdSchema,
  boardLabel: z.string().min(1),
  title: z.string().min(1),
  faculty: StudySubjectFacultySchema,
  subjectType: SubjectTypeSchema,
  gradingScale: GradingScaleSchema,
  totalUms: z.number().int().positive().optional(),
  totalRawMarks: z.number().int().positive(),
  topicCount: z.number().int().nonnegative(),
  paperCount: z.number().int().nonnegative(),
  examSessionWindow: z.string().min(1),
  summary: z.string(),
  defaultEnrolled: z.boolean(),
  defaultTargetGrade: z.string().min(1),
  units: z.array(StudySubjectUnitDtoSchema),
  sampleTopics: z.array(StudyTopicPreviewDtoSchema),
});
export type StudyCatalogSubjectDto = z.infer<typeof StudyCatalogSubjectDtoSchema>;

export const StudyMathsSuiteStateDtoSchema = z.object({
  activeCashIn: EdexcelMathsCashInCodeSchema,
  enrolledCashIns: z.array(EdexcelMathsCashInCodeSchema).min(1),
  unitsByCashIn: z.object({
    XMA01: z.array(EdexcelMathsUnitCodeSchema),
    YMA01: z.array(EdexcelMathsUnitCodeSchema),
    XFM01: z.array(EdexcelMathsUnitCodeSchema),
    YFM01: z.array(EdexcelMathsUnitCodeSchema),
  }),
  validationByCashIn: z
    .object({
      XMA01: EdexcelMathsValidationResultSchema,
      YMA01: EdexcelMathsValidationResultSchema,
      XFM01: EdexcelMathsValidationResultSchema,
      YFM01: EdexcelMathsValidationResultSchema,
    })
    .optional(),
});
export type StudyMathsSuiteStateDto = z.infer<typeof StudyMathsSuiteStateDtoSchema>;

export const StudyCatalogResponseDtoSchema = z.object({
  boards: z.array(StudyBoardDtoSchema),
  subjects: z.array(StudyCatalogSubjectDtoSchema),
  activeBoard: CurriculumBoardIdSchema,
  enrolledSubjectIds: z.array(z.string()),
  targetGradeBySubjectId: z.record(z.string(), z.string()),
  mathsSuite: StudyMathsSuiteStateDtoSchema,
});
export type StudyCatalogResponseDto = z.infer<typeof StudyCatalogResponseDtoSchema>;

export const StudyUpdateBoardInputSchema = z.object({
  boardId: CurriculumBoardIdSchema,
});
export type StudyUpdateBoardInput = z.infer<typeof StudyUpdateBoardInputSchema>;

export const StudyToggleEnrollmentInputSchema = z.object({
  subjectId: z.string().min(1),
  enrolled: z.boolean(),
  targetGrade: z.string().trim().min(1).max(8).optional(),
});
export type StudyToggleEnrollmentInput = z.infer<typeof StudyToggleEnrollmentInputSchema>;

export const StudyUpdateTargetGradeInputSchema = z.object({
  subjectId: z.string().min(1),
  targetGrade: z.string().trim().min(1).max(8),
});
export type StudyUpdateTargetGradeInput = z.infer<typeof StudyUpdateTargetGradeInputSchema>;

export const StudyUpdateMathsSuiteInputSchema = z.object({
  activeCashIn: EdexcelMathsCashInCodeSchema,
  enrolledCashIns: z.array(EdexcelMathsCashInCodeSchema).min(1),
  unitsByCashIn: z.object({
    XMA01: z.array(EdexcelMathsUnitCodeSchema),
    YMA01: z.array(EdexcelMathsUnitCodeSchema),
    XFM01: z.array(EdexcelMathsUnitCodeSchema),
    YFM01: z.array(EdexcelMathsUnitCodeSchema),
  }),
});
export type StudyUpdateMathsSuiteInput = z.infer<typeof StudyUpdateMathsSuiteInputSchema>;

export const StudyMathsSuiteMutationResponseDtoSchema = z.object({
  mathsSuite: StudyMathsSuiteStateDtoSchema,
  validation: EdexcelMathsValidationResultSchema,
  enrolledSubjectIds: z.array(z.string()),
});
export type StudyMathsSuiteMutationResponseDto = z.infer<
  typeof StudyMathsSuiteMutationResponseDtoSchema
>;

// [THAW-4.2] Syllabus Topic Tracker Contracts
export const StudyTopicSubtopicDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  defaultCompleted: z.boolean(),
});
export type StudyTopicSubtopicDto = z.infer<typeof StudyTopicSubtopicDtoSchema>;

export const StudyTopicDtoSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  unitCode: z.string().min(1),
  unitLabel: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1),
  difficulty: TopicDifficultySchema,
  estimatedMinutes: z.number().int().positive(),
  keyFormulasAndPitfalls: z.array(z.string()),
  defaultStatus: TopicConfidenceStatusSchema,
  defaultNote: z.string().optional(),
  subtopics: z.array(StudyTopicSubtopicDtoSchema),
});
export type StudyTopicDto = z.infer<typeof StudyTopicDtoSchema>;

export const StudyTopicsResponseDtoSchema = z.object({
  subjects: z.array(StudyCatalogSubjectDtoSchema),
  topics: z.array(StudyTopicDtoSchema),
  selectedSubjectId: z.string().min(1),
  completedSubtopicIds: z.array(z.string()),
  statusOverrideByTopicId: z.record(z.string(), TopicConfidenceStatusSchema),
  notesByTopicId: z.record(z.string(), z.string()),
  xpAwardedTopicIds: z.array(z.string()),
  activeMathsCashIn: EdexcelMathsCashInCodeSchema,
  activeMathsUnits: z.array(EdexcelMathsUnitCodeSchema),
  totalXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
});
export type StudyTopicsResponseDto = z.infer<typeof StudyTopicsResponseDtoSchema>;

export const StudyUpsertTopicProgressInputSchema = z.object({
  subjectId: z.string().min(1),
  completedSubtopicIds: z.array(z.string()).optional(),
  status: TopicConfidenceStatusSchema.optional(),
  personalNote: z.string().max(8000).optional(),
});
export type StudyUpsertTopicProgressInput = z.infer<typeof StudyUpsertTopicProgressInputSchema>;

export const StudyTopicProgressMutationResponseDtoSchema = z.object({
  topicId: z.string().min(1),
  subjectId: z.string().min(1),
  status: TopicConfidenceStatusSchema,
  completedSubtopicIds: z.array(z.string()),
  personalNote: z.string(),
  xpAwardedNow: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
});
export type StudyTopicProgressMutationResponseDto = z.infer<
  typeof StudyTopicProgressMutationResponseDtoSchema
>;

// [THAW-4.3] Past Paper Tracker Contracts
export const StudyPastPaperSeriesDtoSchema = z.object({
  id: z.string().min(1),
  chronologicalIndex: z.number().int(),
  edexcelLabel: z.string().min(1),
  edexcelShort: z.string().min(1),
  cambridgeLabel: z.string().min(1),
  cambridgeShort: z.string().min(1),
  sessionKind: z.enum(['summer', 'winter', 'autumn']),
});
export type StudyPastPaperSeriesDto = z.infer<typeof StudyPastPaperSeriesDtoSchema>;

export const StudyPastPaperRowDtoSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  boardId: CurriculumBoardIdSchema,
  unitCode: z.string().min(1),
  paperCode: z.string().min(1),
  shortLabel: z.string().min(1),
  title: z.string().min(1),
  variantGroup: z.enum(['v1', 'v2', 'v3', 'main', 'regional']),
  variantBadge: z.string().min(1),
  maxRaw: z.number().int().positive(),
  maxUms: z.number().int().positive().optional(),
  durationMinutes: z.number().int().positive(),
  isModularUms: z.boolean(),
  gradingScale: GradingScaleSchema,
  availableSeriesIds: z.array(z.string()).optional(),
  seriesBoundaries: z.record(
    z.string(),
    z.object({
      thresholds: z.record(z.string(), z.number()),
    })
  ),
});
export type StudyPastPaperRowDto = z.infer<typeof StudyPastPaperRowDtoSchema>;

export const StudyPastPaperAttemptDtoSchema = z.object({
  id: z.string().min(1),
  subjectId: z.string().min(1),
  rowId: z.string().min(1),
  paperCode: z.string().min(1),
  seriesId: z.string().min(1),
  rawScore: z.number().nonnegative(),
  maxRaw: z.number().positive(),
  percentage: z.number().min(0).max(100),
  derivedGrade: z.string().min(1),
  derivedUmsOrPum: z.number().int().min(0),
  umsOrPumLabel: z.enum(['UMS', 'PUM']),
  timed: z.boolean(),
  durationMinutes: z.number().int().positive(),
  loggedAtIso: z.string().min(1),
  dateLabel: z.string().min(1),
  weakTopics: z.array(z.string()),
  notes: z.string(),
});
export type StudyPastPaperAttemptDto = z.infer<typeof StudyPastPaperAttemptDtoSchema>;

export const StudyPastPapersResponseDtoSchema = z.object({
  subjects: z.array(StudyCatalogSubjectDtoSchema),
  seriesList: z.array(StudyPastPaperSeriesDtoSchema),
  rows: z.array(StudyPastPaperRowDtoSchema),
  attempts: z.array(StudyPastPaperAttemptDtoSchema),
  selectedSubjectId: z.string().min(1),
  enrolledSubjectIds: z.array(z.string()),
  activeMathsCashIn: EdexcelMathsCashInCodeSchema,
  activeMathsUnits: z.array(EdexcelMathsUnitCodeSchema),
  earnedPaperXp: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
});
export type StudyPastPapersResponseDto = z.infer<typeof StudyPastPapersResponseDtoSchema>;

export const StudyLogPastPaperAttemptInputSchema = z.object({
  subjectId: z.string().min(1),
  pastPaperId: z.string().min(1),
  paperCode: z.string().min(1),
  seriesId: z.string().min(1),
  rawScore: z.number().int().min(0),
  maxRaw: z.number().int().positive().optional(),
  timed: z.boolean().default(true),
  weakTopics: z.array(z.string()).max(25).default([]),
  reflectionNotes: z.string().max(4000).default(''),
  attemptedAtIso: z.string().optional(),
});
export type StudyLogPastPaperAttemptInput = z.infer<
  typeof StudyLogPastPaperAttemptInputSchema
>;

export const StudyLogPastPaperResponseDtoSchema = z.object({
  attempt: StudyPastPaperAttemptDtoSchema,
  xpAwardedNow: z.number().int().nonnegative(),
  xpReason: z.enum(['first_attempt', 'personal_best', 'none']),
  totalXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
});
export type StudyLogPastPaperResponseDto = z.infer<
  typeof StudyLogPastPaperResponseDtoSchema
>;

// [THAW-4.4] Exam Countdown Contracts
export const StudyExamCountdownDtoSchema = z.object({
  id: z.string().min(1),
  boardId: CurriculumBoardIdSchema,
  boardLabel: z.string().min(1),
  subjectId: z.string().nullable().optional(),
  examScheduleId: z.string().nullable().optional(),
  paperCode: z.string().min(1),
  title: z.string().min(1),
  examDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  examDateLabel: z.string().min(1),
  examTime24h: z.string().regex(/^\d{2}:\d{2}$/),
  targetGrade: z.string().min(1),
  category: ExamCountdownCategorySchema,
  isCustom: z.boolean(),
  isMock: z.boolean(),
  colorTag: ExamColorTagSchema,
  venueOrNotes: z.string().max(1000).optional(),
  pinned: z.boolean(),
  syncedToFlow: z.boolean(),
});
export type StudyExamCountdownDto = z.infer<typeof StudyExamCountdownDtoSchema>;

export const StudyCountdownsResponseDtoSchema = z.object({
  countdowns: z.array(StudyExamCountdownDtoSchema),
  pinnedExamIds: z.array(z.string()),
  flowSyncedExamIds: z.array(z.string()),
  enrolledBoards: z.array(CurriculumBoardIdSchema),
});
export type StudyCountdownsResponseDto = z.infer<typeof StudyCountdownsResponseDtoSchema>;

export const StudySaveCountdownInputSchema = z.object({
  id: z.string().min(1).optional(),
  boardId: CurriculumBoardIdSchema,
  subjectId: z.string().min(1).optional(),
  paperCode: z.string().trim().min(1).max(60),
  title: z.string().trim().min(2).max(200),
  examDateIso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  examTime24h: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default('09:00'),
  targetGrade: z.string().trim().min(1).max(8).default('A*'),
  category: ExamCountdownCategorySchema.default('custom'),
  isCustom: z.boolean().default(true),
  isMock: z.boolean().default(false),
  colorTag: ExamColorTagSchema.default('amber'),
  venueOrNotes: z.string().max(1000).optional(),
  pinned: z.boolean().default(true),
  syncedToFlow: z.boolean().default(false),
});
export type StudySaveCountdownInput = z.infer<typeof StudySaveCountdownInputSchema>;

export const StudyUpdateCountdownFlagsInputSchema = z.object({
  pinned: z.boolean().optional(),
  syncedToFlow: z.boolean().optional(),
  targetGrade: z.string().trim().min(1).max(8).optional(),
});
export type StudyUpdateCountdownFlagsInput = z.infer<
  typeof StudyUpdateCountdownFlagsInputSchema
>;

// [THAW-4.5] Study Dashboard & Scholar Leaderboard Contracts
export const StudyDashboardSubjectSummaryDtoSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  boardId: CurriculumBoardIdSchema,
  boardLabel: z.string().min(1),
  title: z.string().min(1),
  subjectType: SubjectTypeSchema,
  unitSummary: z.string(),
  topicsMastered: z.number().int().nonnegative(),
  topicsInProgress: z.number().int().nonnegative(),
  topicsTotal: z.number().int().nonnegative(),
  papersLogged: z.number().int().nonnegative(),
  latestPaperLabel: z.string(),
  targetGrade: z.string().min(1),
  nextMilestoneLabel: z.string(),
  lastStudiedLabel: z.string(),
  reviewedToday: z.boolean(),
});
export type StudyDashboardSubjectSummaryDto = z.infer<
  typeof StudyDashboardSubjectSummaryDtoSchema
>;

export const StudyRecentActivityDtoSchema = z.object({
  id: z.string().min(1),
  boardId: CurriculumBoardIdSchema,
  dateLabel: z.string().min(1),
  subjectCode: z.string().min(1),
  summary: z.string().min(1),
  metricLabel: z.string().min(1),
  xpDelta: z.number().int(),
});
export type StudyRecentActivityDto = z.infer<typeof StudyRecentActivityDtoSchema>;

export const StudyDashboardResponseDtoSchema = z.object({
  activeBoard: CurriculumBoardIdSchema,
  totalXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  longestStreakDays: z.number().int().nonnegative(),
  subjectsByBoard: z.record(
    CurriculumBoardIdSchema,
    z.array(StudyDashboardSubjectSummaryDtoSchema)
  ),
  countdowns: z.array(StudyExamCountdownDtoSchema),
  recentActivity: z.array(StudyRecentActivityDtoSchema),
  reviewedSubjectIdsByBoard: z.record(CurriculumBoardIdSchema, z.array(z.string())),
  pinnedExamIds: z.array(z.string()),
  flowSyncedExamIds: z.array(z.string()),
  mathsSuiteSummary: z.string(),
});
export type StudyDashboardResponseDto = z.infer<typeof StudyDashboardResponseDtoSchema>;

export const StudyCheckInSubjectInputSchema = z.object({
  subjectId: z.string().min(1),
  boardId: CurriculumBoardIdSchema.optional(),
});
export type StudyCheckInSubjectInput = z.infer<typeof StudyCheckInSubjectInputSchema>;

export const StudyCheckInResponseDtoSchema = z.object({
  subjectId: z.string().min(1),
  reviewedToday: z.boolean(),
  xpAwardedNow: z.number().int().nonnegative(),
  totalXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
});
export type StudyCheckInResponseDto = z.infer<typeof StudyCheckInResponseDtoSchema>;

export const StudyBadgeDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  criteriaLabel: z.string().min(1),
  xpReward: z.number().int().nonnegative(),
  earned: z.boolean(),
  earnedDateLabel: z.string().optional(),
  category: z.enum(['streak', 'papers', 'mastery', 'sync']),
});
export type StudyBadgeDto = z.infer<typeof StudyBadgeDtoSchema>;

export const StudyLeaderboardScholarDtoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  username: z.string().min(1),
  boardId: CurriculumBoardIdSchema,
  boardLabel: z.string().min(1),
  cohortLabel: z.string().min(1),
  weeklyXp: z.number().int().nonnegative(),
  allTimeXp: z.number().int().nonnegative(),
  streakDays: z.number().int().nonnegative(),
  topicsMastered: z.number().int().nonnegative(),
  papersLogged: z.number().int().nonnegative(),
  avgUmsOrGradeLabel: z.string(),
  badgeCount: z.number().int().nonnegative(),
  isTutor: z.boolean().optional(),
  isCurrentUser: z.boolean().optional(),
});
export type StudyLeaderboardScholarDto = z.infer<typeof StudyLeaderboardScholarDtoSchema>;

export const StudyLeaderboardResponseDtoSchema = z.object({
  visibleOnLeaderboard: z.boolean(),
  currentUserXp: z.number().int().nonnegative(),
  currentUserStreak: z.number().int().nonnegative(),
  scholars: z.array(StudyLeaderboardScholarDtoSchema),
  badges: z.array(StudyBadgeDtoSchema),
});
export type StudyLeaderboardResponseDto = z.infer<
  typeof StudyLeaderboardResponseDtoSchema
>;

export const StudyLeaderboardVisibilityInputSchema = z.object({
  visibleOnLeaderboard: z.boolean(),
});
export type StudyLeaderboardVisibilityInput = z.infer<
  typeof StudyLeaderboardVisibilityInputSchema
>;
