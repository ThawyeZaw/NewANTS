import {
  ACCOUNT_WEEKDAYS,
  createEmptyTutorSchedule,
  type AvailabilityStatus,
  type SharedUserProfileData,
  type TelegramLeadMinutes,
  type TutorScheduleMap,
} from '@ants/ui';
import { resolveApiBaseUrl } from '@ants/auth-client';
import {
  AccountProfileDtoSchema,
  FlowPomodoroSessionDtoSchema,
  FlowPomodoroSettingsDtoSchema,
  FlowPomodoroStateDtoSchema,
  FlowTaskDtoSchema,
  FlowTasksListDtoSchema,
  FlowTimetableBlockDtoSchema,
  FlowTimetableBootstrapDtoSchema,
  PublicProfileResponseDtoSchema,
  TelegramStatusDtoSchema,
  type AccountProfileDto,
  type AccountProfileUpdateInput,
  type FlowPomodoroSessionCreateInput,
  type FlowPomodoroSessionDto,
  type FlowPomodoroSettingsDto,
  type FlowPomodoroStateDto,
  type FlowTaskDto,
  type FlowTaskUpsertInput,
  type FlowTasksListDto,
  type FlowTimetableBlockDto,
  type FlowTimetableBlockUpsertInput,
  type FlowTimetableBootstrapDto,
  type OrgTutorWeeklyScheduleDto,
  type PublicProfileResponseDto,
  type TelegramNotificationPrefs,
  type TelegramStatusDto,
  type UserRole,
} from '@ants/shared-types';
import {
  DEFAULT_POMODORO_SETTINGS,
  createInitialTimer,
  type AccentId,
  type AmbientSoundId,
  type FocusSceneId,
  type FontId,
  type PomodoroPersistedState,
  type PomodoroSessionRecord,
  type PomodoroSettings,
  type PomodoroTask,
} from './pomodoro/engine';
import type { PlannerTask, TasksPersistedState } from './tasks/engine';
import type {
  SyncedExamCountdown,
  TimetableBlock,
  TimetablePersistedState,
} from './timetable/engine';

interface SchemaParser<T> {
  parse(data: unknown): T;
}

export class FlowApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'FlowApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestFlowJson<T>(
  path: string,
  schema: SchemaParser<T>,
  init?: RequestInit
): Promise<T> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
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
    throw new FlowApiError(
      response.status,
      payload?.error?.code ?? 'FLOW_API_ERROR',
      payload?.error?.message ?? `Request failed (${response.status})`
    );
  }

  return schema.parse(payload.data);
}

// ============================================================================
// Pomodoro API & Mappers (`[THAW-3.1]`)
// ============================================================================

export async function fetchFlowPomodoroState(): Promise<FlowPomodoroStateDto> {
  return requestFlowJson('/api/flow/pomodoro', FlowPomodoroStateDtoSchema);
}

export async function saveFlowPomodoroSettings(
  settings: PomodoroSettings
): Promise<FlowPomodoroSettingsDto> {
  const payload: FlowPomodoroSettingsDto = {
    workMinutes: settings.workMinutes,
    shortBreakMinutes: settings.shortBreakMinutes,
    longBreakMinutes: settings.longBreakMinutes,
    longBreakInterval: settings.longBreakInterval,
    autoStartBreaks: settings.autoStartBreaks,
    autoStartWork: settings.autoStartWork,
    dailyGoal: settings.dailyGoal,
    notificationsEnabled: settings.notifications,
    soundEnabled: settings.sound.enabled,
    soundVolume: settings.sound.volume,
    tickingEnabled: settings.sound.ticking,
    tickingVolume: settings.sound.tickingVolume,
    ambientScene: settings.ambient.scene,
    ambientSound: settings.ambient.sound,
    appearanceMode: settings.appearance.mode,
    appearanceAccent: settings.appearance.accent,
    appearanceFont: settings.appearance.font,
  };
  return requestFlowJson('/api/flow/pomodoro/settings', FlowPomodoroSettingsDtoSchema, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function logFlowPomodoroSession(
  record: PomodoroSessionRecord
): Promise<FlowPomodoroSessionDto> {
  const payload: FlowPomodoroSessionCreateInput = {
    id: record.id,
    phase: record.phase,
    startedAtIso: record.startedAt,
    endedAtIso: record.endedAt,
    durationSeconds: Math.max(0, Math.round(record.durationSeconds)),
    completed: record.completed,
    taskId: record.taskId,
    taskTitle: record.taskTitle,
  };
  return requestFlowJson('/api/flow/pomodoro/sessions', FlowPomodoroSessionDtoSchema, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function mapPomodoroDtoToPersisted(
  dto: FlowPomodoroStateDto,
  d1Tasks: FlowTaskDto[] = []
): PomodoroPersistedState {
  const settings: PomodoroSettings = {
    workMinutes: dto.settings.workMinutes,
    shortBreakMinutes: dto.settings.shortBreakMinutes,
    longBreakMinutes: dto.settings.longBreakMinutes,
    longBreakInterval: dto.settings.longBreakInterval,
    autoStartBreaks: dto.settings.autoStartBreaks,
    autoStartWork: dto.settings.autoStartWork,
    dailyGoal: dto.settings.dailyGoal,
    notifications: dto.settings.notificationsEnabled,
    sound: {
      ...DEFAULT_POMODORO_SETTINGS.sound,
      enabled: dto.settings.soundEnabled,
      volume: dto.settings.soundVolume,
      ticking: dto.settings.tickingEnabled,
      tickingVolume: dto.settings.tickingVolume,
    },
    ambient: {
      ...DEFAULT_POMODORO_SETTINGS.ambient,
      scene: (dto.settings.ambientScene as FocusSceneId) || 'none',
      sound: (dto.settings.ambientSound as AmbientSoundId) || 'off',
    },
    appearance: {
      mode: dto.settings.appearanceMode,
      accent: (dto.settings.appearanceAccent as AccentId) || 'amber',
      font: (dto.settings.appearanceFont as FontId) || 'jakarta',
    },
    focus: { ...DEFAULT_POMODORO_SETTINGS.focus },
  };

  const tasks: PomodoroTask[] = d1Tasks.map((t) => ({
    id: t.id,
    title: t.title,
    estimatedPomodoros: Math.max(1, t.pomodorosPlanned || 1),
    completedPomodoros: t.pomodorosDone,
    done: t.done,
    createdAt: t.createdAt,
  }));

  const history: PomodoroSessionRecord[] = dto.sessions.map((s) => ({
    id: s.id,
    phase: s.phase,
    startedAt: s.startedAtIso,
    endedAt: s.endedAtIso ?? s.startedAtIso,
    durationSeconds: s.durationSeconds,
    plannedSeconds:
      s.phase === 'work'
        ? settings.workMinutes * 60
        : s.phase === 'shortBreak'
          ? settings.shortBreakMinutes * 60
          : settings.longBreakMinutes * 60,
    completed: s.completed,
    taskId: s.taskId,
    taskTitle: s.taskTitle,
    interruptions: 0,
  }));

  return {
    version: 1,
    settings,
    tasks,
    activeTaskId: tasks.find((t) => !t.done)?.id ?? tasks[0]?.id ?? null,
    history,
    timer: createInitialTimer(settings),
  };
}

// ============================================================================
// Task Planner API & Mappers (`[THAW-3.2]`)
// ============================================================================

export async function fetchFlowTasks(): Promise<FlowTasksListDto> {
  return requestFlowJson('/api/flow/tasks', FlowTasksListDtoSchema);
}

export async function upsertFlowTask(input: FlowTaskUpsertInput): Promise<FlowTaskDto> {
  return requestFlowJson('/api/flow/tasks', FlowTaskDtoSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function syncFlowTasks(tasks: PlannerTask[]): Promise<FlowTasksListDto> {
  return requestFlowJson('/api/flow/tasks/sync', FlowTasksListDtoSchema, {
    method: 'PUT',
    body: JSON.stringify({
      tasks: tasks.map(mapPlannerTaskToUpsertInput),
    }),
  });
}

export function mapFlowTaskDtoToPlanner(dto: FlowTaskDto): PlannerTask {
  return {
    id: dto.id,
    title: dto.title,
    notes: dto.notes || undefined,
    priority: dto.priority,
    dueDate: dto.dueDateIso ?? undefined,
    tags: dto.tags,
    estimatedMinutes: dto.estimatedMinutes,
    pomodorosPlanned: dto.pomodorosPlanned,
    pomodorosDone: dto.pomodorosDone,
    inTodayFocus: dto.inTodayFocus,
    done: dto.done,
    subtasks: dto.subtasks,
    linkedBlockId: dto.linkedBlockId ?? undefined,
    createdAt: dto.createdAt,
  };
}

export function mapPlannerTaskToUpsertInput(task: PlannerTask): FlowTaskUpsertInput {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes ?? '',
    priority: task.priority,
    dueDateIso: task.dueDate ?? null,
    tags: task.tags,
    estimatedMinutes: Math.max(5, Math.round(task.estimatedMinutes || 25)),
    pomodorosPlanned: Math.max(0, Math.round(task.pomodorosPlanned ?? 1)),
    pomodorosDone: Math.max(0, Math.round(task.pomodorosDone ?? 0)),
    inTodayFocus: Boolean(task.inTodayFocus),
    done: Boolean(task.done),
    subtasks: task.subtasks,
    linkedBlockId: task.linkedBlockId ?? null,
    createdAt: task.createdAt,
  };
}

export function buildTasksStateFromDtos(
  dtos: FlowTaskDto[],
  todayIso: string
): TasksPersistedState {
  return {
    version: 1,
    presetId: 'scholar-ial',
    selectedDate: todayIso,
    tasks: dtos.map(mapFlowTaskDtoToPlanner),
  };
}

// ============================================================================
// Smart Timetable API & Mappers (`[THAW-3.3]`)
// ============================================================================

export async function fetchFlowTimetableBootstrap(): Promise<FlowTimetableBootstrapDto> {
  return requestFlowJson('/api/flow/timetable', FlowTimetableBootstrapDtoSchema);
}

export async function saveFlowTimetableBlock(
  block: TimetableBlock,
  isNew: boolean
): Promise<FlowTimetableBlockDto> {
  const payload: FlowTimetableBlockUpsertInput = {
    id: block.id,
    title: block.title,
    dateIso: block.date,
    startMinutes: block.startMinutes,
    endMinutes: block.endMinutes,
    category: block.category,
    priority: block.priority,
    pomodorosPlanned: Math.max(0, block.pomodorosPlanned ?? 0),
    pomodorosDone: Math.max(0, block.pomodorosDone ?? 0),
    recurrence: block.recurrence,
    telegramEnabled: block.telegramReminder.enabled,
    telegramLeadMinutes: block.telegramReminder.leadMinutes,
    telegramNote: block.telegramReminder.note,
    notes: block.notes ?? '',
    completed: Boolean(block.completed),
    locked: Boolean(block.locked),
  };

  if (isNew) {
    return requestFlowJson('/api/flow/timetable/blocks', FlowTimetableBlockDtoSchema, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return requestFlowJson(
    `/api/flow/timetable/blocks/${encodeURIComponent(block.id)}`,
    FlowTimetableBlockDtoSchema,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteFlowTimetableBlock(blockId: string): Promise<void> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetch(
    `${baseUrl}/api/flow/timetable/blocks/${encodeURIComponent(blockId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new FlowApiError(response.status, 'DELETE_FAILED', 'Failed to delete block.');
  }
}

export function mapTimetableDtoToBlock(dto: FlowTimetableBlockDto): TimetableBlock {
  return {
    id: dto.id,
    title: dto.title,
    date: dto.dateIso,
    startMinutes: dto.startMinutes,
    endMinutes: dto.endMinutes,
    category: dto.category,
    priority: dto.priority,
    pomodorosPlanned: dto.pomodorosPlanned,
    pomodorosDone: dto.pomodorosDone,
    recurrence: dto.recurrence,
    telegramReminder: {
      enabled: dto.telegramEnabled,
      leadMinutes: dto.telegramLeadMinutes,
      note: dto.telegramNote,
    },
    notes: dto.notes || undefined,
    completed: dto.completed,
    locked: dto.locked,
  };
}

export function buildTimetableStateFromBootstrap(
  bootstrap: FlowTimetableBootstrapDto,
  todayIso: string,
  tasks: PlannerTask[] = []
): TimetablePersistedState {
  const blocks = bootstrap.blocks.map(mapTimetableDtoToBlock);
  const focusTasks = tasks
    .filter((t) => t.inTodayFocus || t.dueDate === todayIso)
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
      pomodorosPlanned: t.pomodorosPlanned,
      pomodorosDone: t.pomodorosDone,
      done: t.done,
      linkedBlockId: t.linkedBlockId,
      tag: t.tags[0],
    }));

  return {
    version: 1,
    presetId: 'scholar-ial',
    viewMode: 'week',
    selectedDate: todayIso,
    showExams: true,
    showOvernightHours: false,
    telegramConnected: bootstrap.telegramConnected,
    telegramHandle: bootstrap.telegramHandle,
    blocks,
    focusTasks,
  };
}

export function mapSyncedExams(dto: FlowTimetableBootstrapDto): SyncedExamCountdown[] {
  return dto.exams.map((exam) => ({
    id: exam.id,
    board: exam.board,
    code: exam.code,
    title: exam.title,
    examDate: exam.examDate,
    daysLeft: exam.daysLeft,
    tone: exam.tone,
    targetGrade: exam.targetGrade,
  }));
}

// ============================================================================
// Account, Public Profile & Telegram API (`[THAW-3.4]`)
// ============================================================================

function toTutorScheduleMap(dto: OrgTutorWeeklyScheduleDto): TutorScheduleMap {
  const map = createEmptyTutorSchedule();
  for (const day of ACCOUNT_WEEKDAYS) {
    const rawHours = dto[day];
    if (!rawHours) continue;
    for (const [hourKey, status] of Object.entries(rawHours)) {
      const hour = Number(hourKey);
      if (hour in map[day]) {
        map[day][hour] = status as AvailabilityStatus;
      }
    }
  }
  return map;
}

export function fromTutorScheduleMap(map: TutorScheduleMap): OrgTutorWeeklyScheduleDto {
  const dto: OrgTutorWeeklyScheduleDto = {};
  for (const day of ACCOUNT_WEEKDAYS) {
    const dayRecord: Record<string, 'available' | 'flexible' | 'unavailable'> = {};
    for (const [hourKey, status] of Object.entries(map[day])) {
      if (status !== 'unavailable') {
        dayRecord[hourKey] = status;
      }
    }
    if (Object.keys(dayRecord).length > 0) {
      dto[day] = dayRecord;
    }
  }
  return dto;
}

export function mapAccountDtoToSharedProfile(dto: AccountProfileDto): SharedUserProfileData {
  return {
    id: dto.id,
    name: dto.name,
    username: dto.username,
    email: dto.email,
    headline: dto.headline,
    bio: dto.bio,
    institution: dto.institution,
    curriculumLabel: dto.curriculumLabel,
    timezone: dto.timezone,
    preferredApp: dto.preferredApp,
    memberSince: dto.memberSince,
    role: dto.role as UserRole,
    roles: dto.roles as UserRole[],
    roleUpgradeStatus: 'none',
    xp: dto.xp,
    streakDays: dto.streakDays,
    focusHoursThisMonth: dto.focusHoursThisMonth,
    completedSessions: dto.completedSessions,
    hourlyRateLabel: dto.hourlyRateLabel,
    tutorTelegramUsername: dto.tutorTelegramUsername,
    taughtSubjects: dto.taughtSubjects,
    tutorSchedule: toTutorScheduleMap(dto.tutorSchedule),
    portfolioItems: dto.portfolioItems,
    certifications: dto.certifications,
    telegram: {
      status: dto.telegram.status === 'linked' ? 'connected' : dto.telegram.status,
      handle: dto.telegram.handle,
      verificationCode: dto.telegram.verificationCode ?? '',
      codeExpiresAt: dto.telegram.codeExpiresAt ?? undefined,
      linkedAt: dto.telegram.linkedAt ?? undefined,
      preferences: {
        ...dto.telegram.preferences,
        defaultLeadMinutes: dto.telegram.preferences.defaultLeadMinutes as TelegramLeadMinutes,
      },
    },
    visibility: dto.visibility,
  };
}

export function mapSharedProfileToUpdateInput(
  profile: SharedUserProfileData
): AccountProfileUpdateInput {
  return {
    name: profile.name,
    username: profile.username,
    headline: profile.headline,
    bio: profile.bio,
    institution: profile.institution,
    curriculumLabel: profile.curriculumLabel,
    timezone: profile.timezone,
    preferredApp: profile.preferredApp,
    hourlyRateLabel: profile.hourlyRateLabel,
    tutorTelegramUsername: profile.tutorTelegramUsername,
    taughtSubjects: profile.taughtSubjects,
    tutorSchedule: fromTutorScheduleMap(profile.tutorSchedule),
    portfolioItems: profile.portfolioItems,
    certifications: profile.certifications,
    visibility: profile.visibility,
  };
}

export async function fetchMyAccountProfile(): Promise<AccountProfileDto> {
  return requestFlowJson('/api/account/me', AccountProfileDtoSchema);
}

export async function updateMyAccountProfile(
  input: AccountProfileUpdateInput
): Promise<AccountProfileDto> {
  return requestFlowJson('/api/account/me', AccountProfileDtoSchema, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function fetchPublicAccountProfile(
  username: string
): Promise<PublicProfileResponseDto> {
  const clean = username.trim().replace(/^@+/, '').toLowerCase();
  return requestFlowJson(
    `/api/account/profiles/${encodeURIComponent(clean)}`,
    PublicProfileResponseDtoSchema
  );
}

export async function fetchTelegramStatus(): Promise<TelegramStatusDto> {
  return requestFlowJson('/api/telegram/status', TelegramStatusDtoSchema);
}

export async function startTelegramLink(): Promise<TelegramStatusDto> {
  return requestFlowJson('/api/telegram/link/start', TelegramStatusDtoSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function updateTelegramPreferences(
  prefs: Partial<TelegramNotificationPrefs>
): Promise<TelegramStatusDto> {
  return requestFlowJson('/api/telegram/preferences', TelegramStatusDtoSchema, {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

export async function sendTelegramTestPing(): Promise<TelegramStatusDto> {
  return requestFlowJson('/api/telegram/status', TelegramStatusDtoSchema);
}

export async function postTelegramTestPing(): Promise<void> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/api/telegram/test-ping`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dispatchImmediately: true }),
  });
  if (!response.ok) {
    throw new FlowApiError(response.status, 'TELEGRAM_PING_FAILED', 'Failed to send test ping.');
  }
}

export async function unlinkTelegramAccount(): Promise<TelegramStatusDto> {
  return requestFlowJson('/api/telegram/unlink', TelegramStatusDtoSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
