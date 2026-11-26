import {
  ACCOUNT_WEEKDAYS,
  createEmptyTutorSchedule,
  type AvailabilityStatus,
  type TutorScheduleMap,
} from '@ants/ui';
import { resolveApiBaseUrl } from '@ants/auth-client';
import {
  AdminOrgActivityRecordDtoSchema,
  AdminOrgArticleRecordDtoSchema,
  AdminOrgBootstrapDtoSchema,
  AdminOrgSettingsDtoSchema,
  AdminOrgTeamMemberRecordDtoSchema,
  AdminUserSummaryDtoSchema,
  StorageFileMetadataDtoSchema,
  type AdminOrgActivityRecordDto,
  type AdminOrgActivityUpsertInput,
  type AdminOrgArticleRecordDto,
  type AdminOrgArticleUpsertInput,
  type AdminOrgBootstrapDto,
  type AdminOrgSettingsDto,
  type AdminOrgSettingsUpdateInput,
  type AdminOrgTeamMemberRecordDto,
  type AdminOrgTeamMemberUpsertInput,
  type AdminUserRolesUpdateInput,
  type AdminUserSummaryDto,
  type OrgActivityDisplayCategory,
  type OrgArticleCategory,
  type OrgHackathonBannerDto,
  type OrgMemberCategory,
  type OrgTutorWeeklyScheduleDto,
  type StorageUploadDataUrlInput,
  type UserRole,
} from '@ants/shared-types';
import {
  MOCK_ORG_HOME_DATA,
  type OrgHomeLandingMockData,
} from '../mocks/showcase-home.mock';
import type {
  OrgCurriculumBoard,
  OrgMemberRoleCategory,
  OrgTeamMemberMock,
} from '../mocks/showcase-team.mock';
import type {
  OrgActivityCategory,
  OrgActivityMock,
  OrgArticleMock,
  OrgArtworkTheme,
} from '../mocks/showcase-content.mock';

interface SchemaParser<T> {
  parse(data: unknown): T;
}

export class AdminApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

async function requestAdminJson<T>(
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
    throw new AdminApiError(
      response.status,
      payload?.error?.code ?? 'ADMIN_API_ERROR',
      payload?.error?.message ?? `Request failed (${response.status})`
    );
  }

  return schema.parse(payload.data);
}

export function resolveAdminMediaUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/storage/')) {
    return `${resolveApiBaseUrl().replace(/\/+$/, '')}${trimmed}`;
  }
  return trimmed;
}

export function stripAdminMediaOrigin(src: string): string {
  const trimmed = src.trim();
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  if (baseUrl && trimmed.startsWith(`${baseUrl}/api/storage/`)) {
    return trimmed.slice(baseUrl.length);
  }
  return trimmed;
}

export async function uploadDataUrlToR2IfNeeded(
  src: string,
  prefix: StorageUploadDataUrlInput['prefix'],
  filename?: string
): Promise<string> {
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('data:image/')) {
    return stripAdminMediaOrigin(trimmed);
  }

  const uploaded = await requestAdminJson(
    '/api/storage/upload',
    StorageFileMetadataDtoSchema,
    {
      method: 'POST',
      body: JSON.stringify({
        dataUrl: trimmed,
        prefix,
        filename,
      } satisfies StorageUploadDataUrlInput),
    }
  );
  return uploaded.url;
}

export async function fetchAdminBootstrap(): Promise<AdminOrgBootstrapDto> {
  return requestAdminJson('/api/admin/bootstrap', AdminOrgBootstrapDtoSchema);
}

export async function saveAdminOrgSettings(
  input: AdminOrgSettingsUpdateInput
): Promise<AdminOrgSettingsDto> {
  return requestAdminJson('/api/admin/settings', AdminOrgSettingsDtoSchema, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function createAdminTeamMember(
  input: AdminOrgTeamMemberUpsertInput
): Promise<AdminOrgTeamMemberRecordDto> {
  return requestAdminJson('/api/admin/team', AdminOrgTeamMemberRecordDtoSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminTeamMember(
  id: string,
  input: AdminOrgTeamMemberUpsertInput
): Promise<AdminOrgTeamMemberRecordDto> {
  return requestAdminJson(
    `/api/admin/team/${encodeURIComponent(id)}`,
    AdminOrgTeamMemberRecordDtoSchema,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
}

export async function deleteAdminTeamMember(id: string): Promise<void> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/api/admin/team/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new AdminApiError(response.status, 'DELETE_FAILED', 'Failed to delete team member.');
  }
}

export async function createAdminActivity(
  input: AdminOrgActivityUpsertInput
): Promise<AdminOrgActivityRecordDto> {
  return requestAdminJson('/api/admin/activities', AdminOrgActivityRecordDtoSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminActivity(
  id: string,
  input: AdminOrgActivityUpsertInput
): Promise<AdminOrgActivityRecordDto> {
  return requestAdminJson(
    `/api/admin/activities/${encodeURIComponent(id)}`,
    AdminOrgActivityRecordDtoSchema,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
}

export async function deleteAdminActivity(id: string): Promise<void> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/api/admin/activities/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new AdminApiError(response.status, 'DELETE_FAILED', 'Failed to delete activity.');
  }
}

export async function createAdminArticle(
  input: AdminOrgArticleUpsertInput
): Promise<AdminOrgArticleRecordDto> {
  return requestAdminJson('/api/admin/articles', AdminOrgArticleRecordDtoSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminArticle(
  id: string,
  input: AdminOrgArticleUpsertInput
): Promise<AdminOrgArticleRecordDto> {
  return requestAdminJson(
    `/api/admin/articles/${encodeURIComponent(id)}`,
    AdminOrgArticleRecordDtoSchema,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
}

export async function deleteAdminArticle(id: string): Promise<void> {
  const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/api/admin/articles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new AdminApiError(response.status, 'DELETE_FAILED', 'Failed to delete article.');
  }
}

export async function updateAdminUserRoles(
  userId: string,
  roles: UserRole[]
): Promise<AdminUserSummaryDto> {
  const role: UserRole = roles[0] ?? 'student';
  return requestAdminJson(
    `/api/admin/users/${encodeURIComponent(userId)}/roles`,
    AdminUserSummaryDtoSchema,
    {
      method: 'PATCH',
      body: JSON.stringify({ role, roles } satisfies AdminUserRolesUpdateInput),
    }
  );
}

// ============================================================================
// DTO <-> Zay CMS Editor Mappers
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

function resolveArtworkThemeForActivity(category: string): OrgArtworkTheme {
  switch (category) {
    case "Student's Meet":
      return 'meetup';
    case 'Exam Venue Visit':
      return 'venue';
    case 'Hackathon':
      return 'hackathon';
    default:
      return 'tutoring';
  }
}

function resolveDisplayCategory(category: string): OrgActivityDisplayCategory {
  if (category === 'students_meet' || category === "Student's Meet") return "Student's Meet";
  if (category === 'exam_venue_visit' || category === 'Exam Venue Visit') return 'Exam Venue Visit';
  if (category === 'hackathon' || category === 'Hackathon') return 'Hackathon';
  return 'Tutoring';
}

const VALID_CURRICULUMS: readonly OrgCurriculumBoard[] = [
  'Edexcel IAL',
  'Cambridge AS & A-Level',
  'Cambridge IGCSE',
];

export function mapAdminTeamDtoToMock(dto: AdminOrgTeamMemberRecordDto): OrgTeamMemberMock {
  return {
    id: dto.id,
    username: dto.username,
    name: dto.name,
    initials: dto.initials || dto.name.slice(0, 2).toUpperCase(),
    roleCategories: dto.roleCategories.filter((c): c is OrgMemberRoleCategory =>
      c === 'founder' || c === 'tutor' || c === 'contributor' || c === 'alumni'
    ),
    roleBadge: dto.roleBadge,
    isFounder: dto.isFounder,
    isTutor: dto.isTutor,
    headline: dto.headline,
    bio: dto.bio,
    institution: dto.institution,
    specialization: dto.specialization,
    curriculums: dto.curriculums.filter((c): c is OrgCurriculumBoard =>
      (VALID_CURRICULUMS as readonly string[]).includes(c)
    ),
    taughtSubjects: dto.taughtSubjects,
    hourlyRateLabel: dto.hourlyRateLabel ?? undefined,
    timezoneLabel: dto.timezoneLabel || 'Asia/Yangon (UTC+06:30)',
    tutorTelegramUsername: dto.tutorTelegramUsername ?? undefined,
    weeklySchedule: toTutorScheduleMap(dto.weeklySchedule),
    achievements: dto.achievements,
    joinedLabel: dto.joinedLabel,
  };
}

export function mapMockToAdminTeamInput(
  member: OrgTeamMemberMock,
  displayOrder: number
): AdminOrgTeamMemberUpsertInput {
  return {
    id: member.id,
    username: member.username,
    name: member.name,
    initials: member.initials,
    roleBadge: member.roleBadge,
    roleCategories: (member.roleCategories.length > 0
      ? member.roleCategories
      : ['contributor']) as OrgMemberCategory[],
    isFounder: member.isFounder,
    isTutor: member.isTutor,
    headline: member.headline,
    bio: member.bio,
    institution: member.institution,
    specialization: member.specialization,
    curriculums: member.curriculums,
    taughtSubjects: member.taughtSubjects,
    hourlyRateLabel: member.hourlyRateLabel ?? null,
    timezoneLabel: member.timezoneLabel,
    tutorTelegramUsername: member.tutorTelegramUsername ?? null,
    weeklySchedule: fromTutorScheduleMap(member.weeklySchedule),
    achievements: member.achievements,
    joinedLabel: member.joinedLabel,
    displayOrder,
    isPublished: true,
  };
}

export function mapAdminActivityDtoToMock(dto: AdminOrgActivityRecordDto): OrgActivityMock {
  const category = resolveDisplayCategory(dto.category) as OrgActivityCategory;
  const theme = resolveArtworkThemeForActivity(category);
  return {
    id: dto.id,
    slug: dto.slug,
    category,
    isUpcoming: dto.isUpcoming,
    title: dto.title,
    dateLabel: dto.dateLabel,
    location: dto.location,
    attendanceLabel: dto.attendanceLabel,
    facilitators: dto.facilitators,
    summary: dto.summary,
    recapParagraphs: dto.recapParagraphs,
    highlights: dto.highlights,
    externalLinks: dto.externalLinks,
    schedulePhases: dto.schedulePhases,
    coverImageSrc: resolveAdminMediaUrl(dto.coverImageSrc),
    coverAlt: dto.coverAlt,
    artworkTheme: theme,
    gallery: dto.gallery.map((photo) => ({
      id: photo.id,
      imageSrc: resolveAdminMediaUrl(photo.imageSrc),
      imageAlt: photo.imageAlt,
      caption: photo.caption,
      locationTag: photo.locationTag,
      shotLabel: photo.shotLabel,
      artworkTheme: theme,
    })),
  };
}

export async function mapMockToAdminActivityInput(
  activity: OrgActivityMock,
  displayOrder: number
): Promise<AdminOrgActivityUpsertInput> {
  const coverImageSrc = await uploadDataUrlToR2IfNeeded(
    activity.coverImageSrc,
    'activities',
    `${activity.slug}-cover.png`
  );
  const gallery = await Promise.all(
    activity.gallery.map(async (photo, idx) => ({
      id: photo.id,
      imageSrc: await uploadDataUrlToR2IfNeeded(
        photo.imageSrc,
        'activities',
        `${activity.slug}-photo-${idx + 1}.png`
      ),
      imageAlt: photo.imageAlt,
      caption: photo.caption,
      locationTag: photo.locationTag,
      shotLabel: photo.shotLabel,
      artworkTheme: photo.artworkTheme,
    }))
  );

  return {
    id: activity.id,
    slug: activity.slug,
    category: activity.category,
    isUpcoming: Boolean(activity.isUpcoming),
    title: activity.title,
    dateLabel: activity.dateLabel,
    location: activity.location,
    attendanceLabel: activity.attendanceLabel,
    facilitators: activity.facilitators,
    summary: activity.summary,
    recapParagraphs: activity.recapParagraphs,
    highlights: activity.highlights,
    externalLinks: activity.externalLinks,
    schedulePhases: activity.schedulePhases,
    coverImageSrc: coverImageSrc || '/images/activities/placeholder.svg',
    coverAlt: activity.coverAlt,
    gallery,
    displayOrder,
    isPublished: true,
  };
}

export function mapAdminArticleDtoToMock(dto: AdminOrgArticleRecordDto): OrgArticleMock {
  return {
    id: dto.id,
    slug: dto.slug,
    category: (dto.category as OrgArticleCategory) || 'Study Guide',
    title: dto.title,
    subtitle: dto.subtitle,
    publishedLabel: dto.publishedAtIso,
    readMinutes: dto.readMinutes,
    authorName: dto.authorName,
    authorUsername: dto.authorUsername,
    authorRole: dto.authorRole,
    summary: dto.summary,
    tags: dto.tags,
    artworkTheme: 'article-ums',
    coverCode: dto.coverCode ?? 'ANT-01',
    coverFormula: dto.coverFormula ?? dto.title,
    coverMetric: dto.coverMetric ?? `${dto.readMinutes} min read`,
    sections: dto.sections,
  };
}

export async function mapMockToAdminArticleInput(
  article: OrgArticleMock
): Promise<AdminOrgArticleUpsertInput> {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    summary: article.summary,
    category: article.category as OrgArticleCategory,
    authorName: article.authorName,
    authorUsername: article.authorUsername,
    authorRole: article.authorRole,
    publishedAtIso: article.publishedLabel,
    readMinutes: article.readMinutes,
    tags: article.tags,
    coverImageSrc: null,
    coverCode: article.coverCode ?? 'ANT-01',
    coverFormula: article.coverFormula ?? article.title,
    coverMetric: article.coverMetric ?? `${article.readMinutes} min read`,
    sections: article.sections,
    markdownBody: article.sections.map((s) => `## ${s.heading}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n'),
    isFeatured: true,
    isPublished: true,
  };
}

export function buildHomeLandingMockFromAdmin(
  settings: AdminOrgSettingsDto,
  team: OrgTeamMemberMock[],
  activities: OrgActivityMock[]
): OrgHomeLandingMockData {
  return {
    ...MOCK_ORG_HOME_DATA,
    heroTitle: settings.heroHeadline,
    heroDescription: settings.heroSubheadline,
    missionStatement: settings.missionStatement,
    missionPillars:
      settings.missionPillars.length > 0
        ? settings.missionPillars
        : MOCK_ORG_HOME_DATA.missionPillars,
    featuredMembers: team.slice(0, 3).map((m) => ({
      username: m.username,
      name: m.name,
      roleBadge: m.roleBadge,
      title: m.headline,
      specialization: m.specialization,
      availabilityLabel: m.timezoneLabel,
    })),
    recentActivities: activities.slice(0, 3).map((a) => ({
      slug: a.slug,
      category: a.category,
      title: a.title,
      dateLabel: a.dateLabel,
      location: a.location,
      summary: a.summary,
      coverImageSrc: a.coverImageSrc,
    })),
  };
}

export function buildAdminSettingsInput(
  home: OrgHomeLandingMockData,
  hackathonBanner: OrgHackathonBannerDto | null,
  socialLinks: Record<string, string>
): AdminOrgSettingsUpdateInput {
  return {
    heroHeadline: home.heroTitle,
    heroSubheadline: home.heroDescription,
    missionStatement: home.missionStatement,
    missionPillars: home.missionPillars,
    hackathonBanner,
    socialLinks,
  };
}
