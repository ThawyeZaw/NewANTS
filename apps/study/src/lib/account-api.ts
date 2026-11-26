import {
  ACCOUNT_WEEKDAYS,
  createEmptyTutorSchedule,
  type AvailabilityStatus,
  type SharedUserProfileData,
  type TelegramLeadMinutes,
  type TutorScheduleMap,
} from '@ants/ui';
import { fetchWithRetry, resolveApiBaseUrl } from '@ants/auth-client';
import {
  AccountProfileDtoSchema,
  TelegramStatusDtoSchema,
  type AccountProfileDto,
  type AccountProfileUpdateInput,
  type OrgTutorWeeklyScheduleDto,
  type TelegramNotificationPrefs,
  type TelegramStatusDto,
  type UserRole,
} from '@ants/shared-types';

interface SchemaParser<T> {
  parse(data: unknown): T;
}

export class StudyAccountApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'StudyAccountApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestAccountJson<T>(
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
    throw new StudyAccountApiError(
      response.status,
      payload?.error?.code ?? 'ACCOUNT_API_ERROR',
      payload?.error?.message ?? `Request failed (${response.status})`
    );
  }

  return schema.parse(payload.data);
}

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

function fromTutorScheduleMap(map: TutorScheduleMap): OrgTutorWeeklyScheduleDto {
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
  return requestAccountJson('/api/account/me', AccountProfileDtoSchema);
}

export async function updateMyAccountProfile(
  input: AccountProfileUpdateInput
): Promise<AccountProfileDto> {
  return requestAccountJson('/api/account/me', AccountProfileDtoSchema, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function fetchTelegramStatus(): Promise<TelegramStatusDto> {
  return requestAccountJson('/api/telegram/status', TelegramStatusDtoSchema);
}

export async function startTelegramLink(): Promise<TelegramStatusDto> {
  return requestAccountJson('/api/telegram/link/start', TelegramStatusDtoSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function updateTelegramPreferences(
  prefs: Partial<TelegramNotificationPrefs>
): Promise<TelegramStatusDto> {
  return requestAccountJson('/api/telegram/preferences', TelegramStatusDtoSchema, {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
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
    throw new StudyAccountApiError(
      response.status,
      'TELEGRAM_PING_FAILED',
      'Failed to send test ping.'
    );
  }
}

export async function unlinkTelegramAccount(): Promise<TelegramStatusDto> {
  return requestAccountJson('/api/telegram/unlink', TelegramStatusDtoSchema, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
