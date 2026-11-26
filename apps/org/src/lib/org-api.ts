import { fetchWithRetry, isLocalHostname, resolveApiBaseUrl } from '@ants/auth-client';
import {
  ApiErrorResponseSchema,
  ECOSYSTEM_APPS,
  OrgActivityDetailResponseDtoSchema,
  OrgActivityListResponseDtoSchema,
  OrgArticleDetailResponseDtoSchema,
  OrgArticleListResponseDtoSchema,
  OrgHomePayloadDtoSchema,
  OrgTeamListResponseDtoSchema,
  OrgTeamMemberDetailResponseDtoSchema,
  type OrgActivityDetailResponseDto,
  type OrgActivityDto,
  type OrgActivityListResponseDto,
  type OrgArticleDetailResponseDto,
  type OrgArticleDto,
  type OrgArticleListResponseDto,
  type OrgHomePayloadDto,
  type OrgTeamListResponseDto,
  type OrgTeamMemberDetailResponseDto,
  type OrgTeamMemberDto,
} from '@ants/shared-types';
import {
  ACCOUNT_WEEKDAYS,
  TUTOR_SLOT_HOURS,
  createEmptyTutorSchedule,
  type TutorScheduleMap,
} from '@ants/ui';
import type { OrgActivityMock, OrgArticleMock } from '../mocks/showcase-content.mock';
import {
  MOCK_ORG_HOME_DATA,
  MOCK_ORG_NAV_LINKS,
  type OrgHomeLandingMockData,
} from '../mocks/showcase-home.mock';
import type {
  OrgCurriculumBoard,
  OrgTeamMemberMock,
} from '../mocks/showcase-team.mock';

export class OrgApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'OrgApiError';
    this.status = status;
    this.code = code;
  }
}

export interface OrgApiRequestOptions {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

const VALID_ORG_CURRICULUM_BOARDS: readonly OrgCurriculumBoard[] = [
  'Edexcel IAL',
  'Cambridge AS & A-Level',
  'Cambridge IGCSE',
];

interface SchemaParser<T> {
  safeParse: (input: unknown) => { success: true; data: T } | { success: false };
}

async function fetchOrgJson<T>(
  path: string,
  dataSchema: SchemaParser<T>,
  options?: OrgApiRequestOptions
): Promise<T> {
  const baseUrl = resolveApiBaseUrl(options?.apiBaseUrl).replace(/\/+$/, '');
  const fetchFn = options?.fetchImpl ?? globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new OrgApiError(
      503,
      'FETCH_UNAVAILABLE',
      'Fetch client is unavailable in this environment.'
    );
  }

  let response: Response;
  try {
    response = await fetchWithRetry(
      `${baseUrl}${path}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: options?.signal,
      },
      { fetchImpl: fetchFn }
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new OrgApiError(
      503,
      'NETWORK_ERROR',
      err instanceof Error && err.message
        ? err.message
        : 'Unable to reach The ANTs API server.'
    );
  }

  let rawJson: unknown;
  try {
    rawJson = await response.json();
  } catch {
    throw new OrgApiError(
      response.status || 500,
      'INVALID_JSON',
      `Unexpected non-JSON response (${response.status}) from @ants/api.`
    );
  }

  if (!response.ok) {
    const parsedErr = ApiErrorResponseSchema.safeParse(rawJson);
    if (parsedErr.success) {
      throw new OrgApiError(
        response.status,
        parsedErr.data.error.code,
        parsedErr.data.error.message
      );
    }
    throw new OrgApiError(
      response.status,
      response.status === 404 ? 'NOT_FOUND' : 'REQUEST_FAILED',
      `Showcase request failed with status ${response.status}.`
    );
  }

  if (
    !rawJson ||
    typeof rawJson !== 'object' ||
    (rawJson as { ok?: unknown }).ok !== true ||
    !('data' in rawJson)
  ) {
    throw new OrgApiError(
      500,
      'INVALID_RESPONSE_SHAPE',
      'Showcase response payload did not match expected envelope.'
    );
  }

  const parsed = dataSchema.safeParse((rawJson as { data: unknown }).data);
  if (!parsed.success) {
    throw new OrgApiError(
      500,
      'INVALID_RESPONSE_SHAPE',
      'Showcase response payload did not match expected schema.'
    );
  }

  return parsed.data;
}

export async function fetchOrgHome(
  options?: OrgApiRequestOptions
): Promise<OrgHomePayloadDto> {
  return fetchOrgJson('/api/org/home', OrgHomePayloadDtoSchema, options);
}

export async function fetchOrgTeam(
  options?: OrgApiRequestOptions & { role?: string; board?: string; q?: string }
): Promise<OrgTeamListResponseDto> {
  const params = new URLSearchParams();
  if (options?.role && options.role !== 'all') params.set('role', options.role);
  if (options?.board && options.board !== 'all') params.set('board', options.board);
  if (options?.q?.trim()) params.set('q', options.q.trim());
  const qs = params.toString();
  return fetchOrgJson(
    `/api/org/team${qs ? `?${qs}` : ''}`,
    OrgTeamListResponseDtoSchema,
    options
  );
}

export async function fetchOrgTeamMember(
  username: string,
  options?: OrgApiRequestOptions
): Promise<OrgTeamMemberDetailResponseDto> {
  return fetchOrgJson(
    `/api/org/team/${encodeURIComponent(username)}`,
    OrgTeamMemberDetailResponseDtoSchema,
    options
  );
}

export async function fetchOrgActivities(
  options?: OrgApiRequestOptions & { category?: string }
): Promise<OrgActivityListResponseDto> {
  const params = new URLSearchParams();
  if (options?.category && options.category !== 'all') {
    params.set('category', options.category);
  }
  const qs = params.toString();
  return fetchOrgJson(
    `/api/org/activities${qs ? `?${qs}` : ''}`,
    OrgActivityListResponseDtoSchema,
    options
  );
}

export async function fetchOrgActivityDetail(
  slug: string,
  options?: OrgApiRequestOptions
): Promise<OrgActivityDetailResponseDto> {
  return fetchOrgJson(
    `/api/org/activities/${encodeURIComponent(slug)}`,
    OrgActivityDetailResponseDtoSchema,
    options
  );
}

export async function fetchOrgArticles(
  options?: OrgApiRequestOptions & { category?: string }
): Promise<OrgArticleListResponseDto> {
  const params = new URLSearchParams();
  if (options?.category && options.category !== 'all') {
    params.set('category', options.category);
  }
  const qs = params.toString();
  return fetchOrgJson(
    `/api/org/articles${qs ? `?${qs}` : ''}`,
    OrgArticleListResponseDtoSchema,
    options
  );
}

export async function fetchOrgArticleDetail(
  slug: string,
  options?: OrgApiRequestOptions
): Promise<OrgArticleDetailResponseDto> {
  return fetchOrgJson(
    `/api/org/articles/${encodeURIComponent(slug)}`,
    OrgArticleDetailResponseDtoSchema,
    options
  );
}

/**
 * Converts serialized string-hour schedule maps from `@ants/api` into `@ants/ui`
 * numeric-hour `TutorScheduleMap` structures.
 */
export function mapWeeklyScheduleDtoToMap(
  raw: Record<string, Record<string, 'available' | 'flexible' | 'unavailable'>>
): TutorScheduleMap {
  const schedule = createEmptyTutorSchedule();
  for (const day of ACCOUNT_WEEKDAYS) {
    const rawDay = raw[day];
    if (!rawDay) continue;
    for (const hour of TUTOR_SLOT_HOURS) {
      const status = rawDay[String(hour)];
      if (status === 'available' || status === 'flexible' || status === 'unavailable') {
        schedule[day][hour] = status;
      }
    }
  }
  return schedule;
}

export function mapOrgHomeDtoToLandingData(
  dto: OrgHomePayloadDto
): OrgHomeLandingMockData {
  const products = MOCK_ORG_HOME_DATA.products.map((product) => {
    if (product.id === 'study') {
      return {
        ...product,
        href: dto.socialLinks.study || ECOSYSTEM_APPS.study.prodUrl,
        localHref: ECOSYSTEM_APPS.study.localUrl,
      };
    }
    if (product.id === 'flow') {
      return {
        ...product,
        href: dto.socialLinks.flow || ECOSYSTEM_APPS.flow.prodUrl,
        localHref: ECOSYSTEM_APPS.flow.localUrl,
      };
    }
    return product;
  });

  return {
    heroBadge: dto.heroBadge,
    heroTitle: dto.heroTitle,
    heroHighlight: dto.heroHighlight,
    heroDescription: dto.heroDescription,
    missionStatement: dto.missionStatement,
    navLinks: MOCK_ORG_NAV_LINKS,
    impactStats: dto.impactStats,
    missionPillars: dto.missionPillars,
    products,
    featuredMembers: dto.featuredMembers,
    recentActivities: dto.recentActivities,
  };
}

export function mapOrgTeamMemberDtoToView(
  dto: OrgTeamMemberDto
): OrgTeamMemberMock {
  const curriculums = dto.curriculums.filter((board): board is OrgCurriculumBoard =>
    (VALID_ORG_CURRICULUM_BOARDS as readonly string[]).includes(board)
  );

  return {
    id: dto.id,
    username: dto.username,
    name: dto.name,
    initials: dto.initials,
    roleCategories: dto.roleCategories,
    roleBadge: dto.roleBadge,
    isFounder: dto.isFounder,
    isTutor: dto.isTutor,
    headline: dto.headline,
    bio: dto.bio,
    institution: dto.institution,
    specialization: dto.specialization,
    curriculums,
    taughtSubjects: dto.taughtSubjects,
    hourlyRateLabel: dto.hourlyRateLabel,
    timezoneLabel: dto.timezoneLabel,
    tutorTelegramUsername: dto.tutorTelegramUsername,
    weeklySchedule: mapWeeklyScheduleDtoToMap(dto.weeklySchedule),
    achievements: dto.achievements,
    joinedLabel: dto.joinedLabel,
  };
}

export function mapOrgActivityDtoToView(dto: OrgActivityDto): OrgActivityMock {
  return {
    id: dto.id,
    slug: dto.slug,
    category: dto.category,
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
    coverImageSrc: dto.coverImageSrc,
    coverAlt: dto.coverAlt,
    artworkTheme: dto.artworkTheme,
    gallery: dto.gallery,
  };
}

export function mapOrgArticleDtoToView(dto: OrgArticleDto): OrgArticleMock {
  return {
    id: dto.id,
    slug: dto.slug,
    category: dto.category,
    title: dto.title,
    subtitle: dto.subtitle,
    publishedLabel: dto.publishedLabel,
    readMinutes: dto.readMinutes,
    authorUsername: dto.authorUsername,
    authorName: dto.authorName,
    authorRole: dto.authorRole,
    summary: dto.summary,
    tags: dto.tags,
    artworkTheme: dto.artworkTheme,
    coverCode: dto.coverCode,
    coverFormula: dto.coverFormula,
    coverMetric: dto.coverMetric,
    sections: dto.sections,
  };
}

/**
 * Resolves the live dynamic route segment from `window.location.pathname` when running
 * in the browser so newly added D1 slugs resolve even when served via `cf-worker.mjs`
 * static export fallback HTML.
 */
export function resolveDynamicRouteParam(
  fallbackParam: string,
  prefix: '/team/' | '/activities/' | '/articles/',
  pathname?: string
): string {
  const pathToCheck =
    pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : undefined);

  if (pathToCheck && pathToCheck.startsWith(prefix)) {
    const remainder = pathToCheck.slice(prefix.length).split('/')[0]?.trim();
    if (remainder) {
      try {
        return decodeURIComponent(remainder);
      } catch {
        return remainder;
      }
    }
  }
  return fallbackParam;
}

export function detectUseLocalUrls(hostname?: string): boolean {
  const target =
    hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : undefined);
  if (!target) return true;
  return isLocalHostname(target);
}
