import type { D1Database } from '@cloudflare/workers-types';
import {
  asc,
  certifications,
  createDb,
  desc,
  eq,
  inArray,
  orgActivities,
  orgArticles,
  orgSettings,
  orgTeamMembers,
  paperGradeBoundaries,
  profiles,
  sql,
  tutorProfiles,
  type OrgActivityPhotoRecord,
  type OrgArticleSectionRecord,
  type OrgMissionPillarRecord,
} from '@ants/db';
import {
  ORG_ACTIVITY_CATEGORIES,
  ORG_ARTICLE_CATEGORIES,
  ORG_ARTWORK_THEMES,
  ORG_MEMBER_CATEGORIES,
  toOrgActivityDbCategory,
  toOrgActivityDisplayCategory,
  type OrgActivityDetailResponseDto,
  type OrgActivityDto,
  type OrgActivityListResponseDto,
  type OrgArticleCategory,
  type OrgArticleDetailResponseDto,
  type OrgArticleDto,
  type OrgArticleListResponseDto,
  type OrgArticleSectionDto,
  type OrgArtworkTheme,
  type OrgFeaturedMemberDto,
  type OrgHomePayloadDto,
  type OrgImpactStatDto,
  type OrgMemberCategory,
  type OrgMissionPillarDto,
  type OrgTeamListResponseDto,
  type OrgTeamMemberDto,
  type OrgTeamMemberDetailResponseDto,
  type OrgTutorWeeklyScheduleDto,
  type TutorSlotStatus,
} from '@ants/shared-types';

const VALID_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const VALID_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] as const;
const D1_IN_ARRAY_CHUNK_SIZE = 40;

export class OrgServiceError extends Error {
  readonly status: 400 | 404 | 500 | 503;
  readonly code: string;

  constructor(status: 400 | 404 | 500 | 503, code: string, message: string) {
    super(message);
    this.name = 'OrgServiceError';
    this.status = status;
    this.code = code;
  }
}

function createEmptyWeeklySchedule(): OrgTutorWeeklyScheduleDto {
  const schedule: OrgTutorWeeklyScheduleDto = {};
  for (const day of VALID_WEEKDAYS) {
    const daySlots: Record<string, TutorSlotStatus> = {};
    for (const hour of VALID_HOURS) {
      daySlots[String(hour)] = 'unavailable';
    }
    schedule[day] = daySlots;
  }
  return schedule;
}

export function normalizeWeeklySchedule(raw: unknown): OrgTutorWeeklyScheduleDto {
  const schedule = createEmptyWeeklySchedule();
  if (!raw || typeof raw !== 'object') return schedule;
  const record = raw as Record<string, unknown>;

  for (const day of VALID_WEEKDAYS) {
    const rawDay = record[day];
    if (!rawDay || typeof rawDay !== 'object') continue;
    const dayObj = rawDay as Record<string, unknown>;
    for (const hour of VALID_HOURS) {
      const value = dayObj[String(hour)] ?? dayObj[hour as unknown as string];
      if (value === 'available' || value === 'flexible' || value === 'unavailable') {
        schedule[day]![String(hour)] = value;
      }
    }
  }
  return schedule;
}

export function hasOpenTutorSlots(schedule: OrgTutorWeeklyScheduleDto): boolean {
  for (const day of VALID_WEEKDAYS) {
    const slots = schedule[day];
    if (!slots) continue;
    for (const status of Object.values(slots)) {
      if (status === 'available' || status === 'flexible') {
        return true;
      }
    }
  }
  return false;
}

export function formatAvailabilityDaysLabel(schedule: OrgTutorWeeklyScheduleDto): string {
  const activeDays = VALID_WEEKDAYS.filter((day) => {
    const daySlots = schedule[day];
    if (!daySlots) return false;
    return Object.values(daySlots).some(
      (status) => status === 'available' || status === 'flexible'
    );
  });
  if (activeDays.length === 0) return 'By request';
  return activeDays.slice(0, 4).join(' · ');
}

export function normalizeTelegramHandle(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

export function deriveInitials(name: string): string {
  const cleaned = name.replace(/\(.*?\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AN';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export function formatPublishedMonthYear(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Nov 2026';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function parseRolesJson(rawRoles: string | null | undefined, fallbackRole: string): string[] {
  const result = new Set<string>();
  if (fallbackRole) result.add(fallbackRole);
  if (rawRoles) {
    try {
      const parsed: unknown = JSON.parse(rawRoles);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && item.trim()) {
            result.add(item.trim());
          }
        }
      }
    } catch {
      // Ignore malformed JSON and rely on primary role fallback
    }
  }
  return [...result];
}

function normalizeMemberCategories(
  rawCategories: readonly string[] | null | undefined,
  isFounder: boolean,
  isTutor: boolean
): OrgMemberCategory[] {
  const validSet = new Set<string>(ORG_MEMBER_CATEGORIES);
  const categories = new Set<OrgMemberCategory>();

  for (const item of rawCategories ?? []) {
    if (validSet.has(item)) {
      categories.add(item as OrgMemberCategory);
    }
  }
  if (isFounder) categories.add('founder');
  if (isTutor) categories.add('tutor');
  if (categories.size === 0) categories.add('contributor');
  return [...categories];
}

function decodeRouteParam(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function defaultArtworkThemeForActivity(
  dbCategory: (typeof ORG_ACTIVITY_CATEGORIES)[number]
): OrgArtworkTheme {
  switch (dbCategory) {
    case 'hackathon':
      return 'hackathon';
    case 'exam_venue_visit':
      return 'venue';
    case 'students_meet':
      return 'meetup';
    case 'tutoring':
    default:
      return 'tutoring';
  }
}

function normalizeArtworkTheme(
  rawTheme: string | null | undefined,
  fallback: OrgArtworkTheme
): OrgArtworkTheme {
  if (rawTheme && (ORG_ARTWORK_THEMES as readonly string[]).includes(rawTheme)) {
    return rawTheme as OrgArtworkTheme;
  }
  return fallback;
}

function deriveArticleArtworkTheme(
  category: OrgArticleCategory,
  tags: readonly string[]
): OrgArtworkTheme {
  const loweredTags = tags.map((t) => t.toLowerCase());
  if (loweredTags.some((t) => t.includes('ums') || t.includes('wma11-set'))) {
    return 'article-ums';
  }
  if (loweredTags.some((t) => t.includes('flow') || t.includes('pomodoro'))) {
    return 'article-focus';
  }
  if (loweredTags.some((t) => t.includes('physics') || t.includes('9702'))) {
    return 'tutoring';
  }
  if (category === 'Exam Strategy') return 'article-ums';
  if (category === 'Productivity') return 'article-focus';
  if (category === 'Announcement') return 'hackathon';
  return 'article-maths';
}

function normalizeArticleCategory(raw: string): OrgArticleCategory {
  if ((ORG_ARTICLE_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as OrgArticleCategory;
  }
  return 'Study Guide';
}

function normalizeArticleSections(
  sectionsRaw: OrgArticleSectionRecord[] | null | undefined,
  markdownBody: string
): OrgArticleSectionDto[] {
  const mapped: OrgArticleSectionDto[] = [];

  for (let idx = 0; idx < (sectionsRaw?.length ?? 0); idx += 1) {
    const sec = sectionsRaw![idx]!;
    const heading = sec.heading?.trim() || `Section ${idx + 1}`;
    let callout: { title: string; body: string } | undefined;
    if (typeof sec.callout === 'string' && sec.callout.trim()) {
      callout = { title: 'Note', body: sec.callout.trim() };
    } else if (
      sec.callout &&
      typeof sec.callout === 'object' &&
      (sec.callout.title?.trim() || sec.callout.body?.trim())
    ) {
      callout = {
        title: sec.callout.title?.trim() || 'Note',
        body: sec.callout.body?.trim() || '',
      };
    }

    const codeSnippet = sec.codeSnippet?.trim() || sec.codeBlock?.trim() || undefined;
    const checklist = (sec.checklist ?? []).map((item) => item.trim()).filter(Boolean);
    const paragraphs = (sec.paragraphs ?? []).map((p) => p.trim()).filter(Boolean);

    mapped.push({
      id: sec.id?.trim() || `section-${idx + 1}`,
      heading,
      paragraphs,
      ...(callout ? { callout } : {}),
      ...(codeSnippet ? { codeSnippet } : {}),
      ...(checklist.length > 0 ? { checklist } : {}),
    });
  }

  if (mapped.length > 0) return mapped;

  const fallbackParagraphs = markdownBody
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return [
    {
      id: 'overview',
      heading: 'Overview',
      paragraphs:
        fallbackParagraphs.length > 0
          ? fallbackParagraphs
          : ['Article content is being prepared.'],
    },
  ];
}

function mapJoinedDateLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Verified Tutor';
  return `Tutor · ${parsed.getUTCFullYear()}`;
}

export async function loadOrgTeamFromD1(
  d1: D1Database,
  filters?: { role?: string; board?: string; q?: string }
): Promise<OrgTeamListResponseDto> {
  const db = createDb(d1);

  const [publishedRows, activeTutorRows] = await Promise.all([
    db
      .select()
      .from(orgTeamMembers)
      .where(eq(orgTeamMembers.isPublished, true))
      .orderBy(asc(orgTeamMembers.displayOrder), asc(orgTeamMembers.createdAt)),
    db
      .select({
        tutorProfile: tutorProfiles,
        profile: profiles,
      })
      .from(tutorProfiles)
      .innerJoin(profiles, eq(tutorProfiles.userId, profiles.userId))
      .where(eq(tutorProfiles.isActive, true)),
  ]);

  const tutorByUserId = new Map(
    activeTutorRows.map((entry) => [entry.tutorProfile.userId, entry])
  );

  const coveredUserIds = new Set<string>();
  const coveredUsernames = new Set<string>();

  const mergedMembers: OrgTeamMemberDto[] = publishedRows.map((row) => {
    coveredUsernames.add(row.username.toLowerCase());
    if (row.userId) coveredUserIds.add(row.userId);

    const linkedTutor = row.userId ? tutorByUserId.get(row.userId) : undefined;
    let weeklySchedule = normalizeWeeklySchedule(row.weeklyScheduleJson);
    let specialization = row.specialization;
    let hourlyRateLabel = row.hourlyRateLabel ?? undefined;
    let curriculums = [...(row.curriculumsJson ?? [])];
    let taughtSubjects = [...(row.taughtSubjectsJson ?? [])];
    let tutorTelegramUsername = normalizeTelegramHandle(row.tutorTelegramUsername);
    let timezoneLabel = row.timezoneLabel;
    let isTutor = Boolean(row.isTutor);
    let source: OrgTeamMemberDto['source'] = 'org_team_member';

    if (linkedTutor) {
      source = 'merged';
      isTutor = true;
      const { tutorProfile, profile } = linkedTutor;
      const visibility = profile.visibilityJson;

      if (tutorProfile.specialization.trim()) {
        specialization = tutorProfile.specialization.trim();
      }
      if (tutorProfile.hourlyRateLabel.trim()) {
        hourlyRateLabel = tutorProfile.hourlyRateLabel.trim();
      }
      if (tutorProfile.curriculumsJson.length > 0) {
        curriculums = [...tutorProfile.curriculumsJson];
      }
      if (tutorProfile.taughtSubjectsJson.length > 0) {
        taughtSubjects = [...tutorProfile.taughtSubjectsJson];
      }
      if (profile.timezone.trim()) {
        timezoneLabel = profile.timezone.trim();
      }

      if (visibility?.showTutorSchedule === false) {
        weeklySchedule = createEmptyWeeklySchedule();
      } else {
        const liveSchedule = normalizeWeeklySchedule(tutorProfile.weeklyScheduleJson);
        if (hasOpenTutorSlots(liveSchedule)) {
          weeklySchedule = liveSchedule;
        }
      }

      if (visibility?.showTelegramInquiry === false) {
        tutorTelegramUsername = undefined;
      } else {
        const liveHandle = normalizeTelegramHandle(
          tutorProfile.tutorTelegramUsername || profile.telegramHandle
        );
        if (liveHandle) {
          tutorTelegramUsername = liveHandle;
        }
      }
    }

    const roleCategories = normalizeMemberCategories(
      row.categoriesJson,
      Boolean(row.isFounder),
      isTutor
    );

    return {
      id: row.id,
      userId: row.userId ?? null,
      username: row.username,
      name: row.name,
      initials: row.initials,
      roleCategories,
      roleBadge: row.roleBadge,
      isFounder: Boolean(row.isFounder),
      isTutor,
      headline: row.headline,
      bio: row.bio,
      institution: row.institution,
      specialization,
      curriculums,
      taughtSubjects,
      ...(hourlyRateLabel ? { hourlyRateLabel } : {}),
      timezoneLabel,
      ...(tutorTelegramUsername ? { tutorTelegramUsername } : {}),
      weeklySchedule,
      achievements: [...(row.achievementsJson ?? [])],
      joinedLabel: row.joinedLabel,
      displayOrder: row.displayOrder,
      source,
    };
  });

  const standaloneTutors = activeTutorRows.filter(({ tutorProfile, profile }) => {
    if (!tutorProfile.featuredOnOrg) return false;
    if (coveredUserIds.has(tutorProfile.userId)) return false;
    if (coveredUsernames.has(profile.username.toLowerCase())) return false;
    return true;
  });

  const certsByUserId = new Map<string, string[]>();
  const standaloneUserIds = standaloneTutors.map((t) => t.tutorProfile.userId);
  for (let i = 0; i < standaloneUserIds.length; i += D1_IN_ARRAY_CHUNK_SIZE) {
    const chunk = standaloneUserIds.slice(i, i + D1_IN_ARRAY_CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const certRows = await db
      .select()
      .from(certifications)
      .where(inArray(certifications.userId, chunk))
      .orderBy(asc(certifications.displayOrder), desc(certifications.verified));

    for (const cert of certRows) {
      const list = certsByUserId.get(cert.userId) ?? [];
      list.push(`${cert.title} (${cert.issuer}, ${cert.year})`);
      certsByUserId.set(cert.userId, list);
    }
  }

  let nextOrder =
    mergedMembers.reduce((max, item) => Math.max(max, item.displayOrder), 0) + 1;

  for (const { tutorProfile, profile } of standaloneTutors) {
    const visibility = profile.visibilityJson;
    const roles = parseRolesJson(profile.roles, profile.role);
    const categories = normalizeMemberCategories(
      roles.filter((r) => r === 'contributor' || r === 'tutor'),
      false,
      true
    );

    const weeklySchedule =
      visibility?.showTutorSchedule === false
        ? createEmptyWeeklySchedule()
        : normalizeWeeklySchedule(tutorProfile.weeklyScheduleJson);

    const tutorTelegramUsername =
      visibility?.showTelegramInquiry === false
        ? undefined
        : normalizeTelegramHandle(
            tutorProfile.tutorTelegramUsername || profile.telegramHandle
          );

    const achievements =
      visibility?.showCertifications === false
        ? []
        : (certsByUserId.get(tutorProfile.userId) ?? []);

    mergedMembers.push({
      id: `tutor_${tutorProfile.id}`,
      userId: tutorProfile.userId,
      username: profile.username,
      name: profile.displayName,
      initials: deriveInitials(profile.displayName),
      roleCategories: categories,
      roleBadge: 'Verified Tutor',
      isFounder: false,
      isTutor: true,
      headline:
        profile.headline.trim() ||
        tutorProfile.specialization.trim() ||
        'Verified ANTs Tutor',
      bio: profile.bio.trim(),
      institution: profile.institution.trim() || 'The ANTs',
      specialization:
        tutorProfile.specialization.trim() || profile.curriculumLabel,
      curriculums:
        tutorProfile.curriculumsJson.length > 0
          ? [...tutorProfile.curriculumsJson]
          : [profile.curriculumLabel],
      taughtSubjects: [...tutorProfile.taughtSubjectsJson],
      ...(tutorProfile.hourlyRateLabel.trim()
        ? { hourlyRateLabel: tutorProfile.hourlyRateLabel.trim() }
        : {}),
      timezoneLabel: profile.timezone.trim() || 'Asia/Yangon (UTC+06:30)',
      ...(tutorTelegramUsername ? { tutorTelegramUsername } : {}),
      weeklySchedule,
      achievements,
      joinedLabel: mapJoinedDateLabel(tutorProfile.createdAt),
      displayOrder: nextOrder,
      source: 'tutor_profile',
    });
    nextOrder += 1;
  }

  const roleFilter = filters?.role?.trim().toLowerCase() ?? 'all';
  const boardFilter = filters?.board?.trim().toLowerCase() ?? 'all';
  const searchQuery = filters?.q?.trim().toLowerCase() ?? '';

  const filtered = mergedMembers.filter((member) => {
    if (
      roleFilter &&
      roleFilter !== 'all' &&
      !member.roleCategories.includes(roleFilter as OrgMemberCategory)
    ) {
      return false;
    }
    if (
      boardFilter &&
      boardFilter !== 'all' &&
      !member.curriculums.some((c) => c.toLowerCase() === boardFilter)
    ) {
      return false;
    }
    if (searchQuery) {
      const haystack = [
        member.name,
        member.username,
        member.roleBadge,
        member.headline,
        member.institution,
        member.specialization,
        ...member.taughtSubjects,
        ...member.curriculums,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  return {
    members: filtered,
    total: filtered.length,
    tutorCount: filtered.filter((m) => m.isTutor).length,
  };
}

export async function loadOrgTeamMemberByUsernameFromD1(
  d1: D1Database,
  rawUsername: string
): Promise<OrgTeamMemberDetailResponseDto> {
  const clean = decodeRouteParam(rawUsername).replace(/^@+/, '').toLowerCase();
  if (!clean) {
    throw new OrgServiceError(400, 'INVALID_USERNAME', 'Team member username is required.');
  }
  const { members } = await loadOrgTeamFromD1(d1);
  const member = members.find((m) => m.username.toLowerCase() === clean);
  if (!member) {
    throw new OrgServiceError(
      404,
      'TEAM_MEMBER_NOT_FOUND',
      `No published team member or featured tutor matches '@${clean}'.`
    );
  }
  return { member };
}

function mapActivityRowToDto(row: typeof orgActivities.$inferSelect): OrgActivityDto {
  const dbCategory = toOrgActivityDbCategory(row.category);
  const displayCategory = toOrgActivityDisplayCategory(dbCategory);
  const defaultTheme = defaultArtworkThemeForActivity(dbCategory);

  const gallery = (row.galleryPhotosJson ?? []).map((photo: OrgActivityPhotoRecord, idx) => ({
    id: photo.id || `${row.id}_gal_${idx + 1}`,
    imageSrc: photo.imageSrc,
    imageAlt: photo.imageAlt || row.coverAlt || row.title,
    caption: photo.caption || '',
    locationTag: photo.locationTag || row.location,
    shotLabel: photo.shotLabel || `Photo ${idx + 1}`,
    artworkTheme: normalizeArtworkTheme(photo.artworkTheme, defaultTheme),
  }));

  const externalLinks = (row.externalLinksJson ?? []).filter(
    (link) => Boolean(link.label && link.href)
  );
  const schedulePhases = row.schedulePhasesJson ?? [];

  return {
    id: row.id,
    slug: row.slug,
    category: displayCategory,
    dbCategory,
    isUpcoming: Boolean(row.isUpcoming),
    title: row.title,
    dateLabel: row.dateLabel,
    location: row.location,
    attendanceLabel: row.attendanceLabel,
    facilitators: [...(row.facilitatorsJson ?? [])],
    summary: row.summary,
    recapParagraphs: [...(row.recapParagraphsJson ?? [])],
    highlights: [...(row.highlightsJson ?? [])],
    ...(externalLinks.length > 0 ? { externalLinks } : {}),
    ...(schedulePhases.length > 0 ? { schedulePhases } : {}),
    coverImageSrc: row.coverImageSrc,
    coverAlt: row.coverAlt,
    artworkTheme: defaultTheme,
    gallery,
    displayOrder: row.displayOrder,
  };
}

export async function loadOrgActivitiesFromD1(
  d1: D1Database,
  filters?: { category?: string }
): Promise<OrgActivityListResponseDto> {
  const db = createDb(d1);
  const rows = await db
    .select()
    .from(orgActivities)
    .where(eq(orgActivities.isPublished, true))
    .orderBy(asc(orgActivities.displayOrder), desc(orgActivities.createdAt));

  let activities = rows.map(mapActivityRowToDto);

  const categoryFilter = filters?.category?.trim();
  if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
    const targetDbCategory = toOrgActivityDbCategory(categoryFilter);
    activities = activities.filter((act) => act.dbCategory === targetDbCategory);
  }

  return {
    activities,
    total: activities.length,
  };
}

export async function loadOrgActivityBySlugFromD1(
  d1: D1Database,
  rawSlug: string
): Promise<OrgActivityDetailResponseDto> {
  const clean = decodeRouteParam(rawSlug).toLowerCase();
  if (!clean) {
    throw new OrgServiceError(400, 'INVALID_ACTIVITY_SLUG', 'Activity slug is required.');
  }

  const { activities } = await loadOrgActivitiesFromD1(d1);
  const activity = activities.find((a) => a.slug.toLowerCase() === clean);
  if (!activity) {
    throw new OrgServiceError(
      404,
      'ACTIVITY_NOT_FOUND',
      `No published community activity matches '${clean}'.`
    );
  }

  const relatedActivities = activities
    .filter((a) => a.slug !== activity.slug)
    .slice(0, 2);

  return {
    activity,
    relatedActivities,
  };
}

function mapArticleRowToDto(row: typeof orgArticles.$inferSelect): OrgArticleDto {
  const category = normalizeArticleCategory(row.category);
  const tags = [...(row.tagsJson ?? [])];
  const artworkTheme = deriveArticleArtworkTheme(category, tags);
  const sections = normalizeArticleSections(row.sectionsJson, row.markdownBody);

  return {
    id: row.id,
    slug: row.slug,
    category,
    title: row.title,
    subtitle: row.subtitle || row.excerpt,
    publishedAtIso: row.publishedAtIso,
    publishedLabel: formatPublishedMonthYear(row.publishedAtIso),
    readMinutes: Math.max(1, row.readingTimeMinutes || 5),
    authorUsername: row.authorUsername,
    authorName: row.authorName,
    authorRole: row.authorRole,
    summary: row.excerpt,
    tags,
    artworkTheme,
    ...(row.coverImageSrc ? { coverImageSrc: row.coverImageSrc } : {}),
    ...(row.coverCode ? { coverCode: row.coverCode } : {}),
    ...(row.coverFormula ? { coverFormula: row.coverFormula } : {}),
    ...(row.coverMetric ? { coverMetric: row.coverMetric } : {}),
    isFeatured: Boolean(row.isFeatured),
    sections,
    ...(row.markdownBody ? { markdownBody: row.markdownBody } : {}),
  };
}

export async function loadOrgArticlesFromD1(
  d1: D1Database,
  filters?: { category?: string }
): Promise<OrgArticleListResponseDto> {
  const db = createDb(d1);

  const [rows, teamList] = await Promise.all([
    db
      .select()
      .from(orgArticles)
      .where(eq(orgArticles.isPublished, true))
      .orderBy(
        desc(orgArticles.isFeatured),
        desc(orgArticles.publishedAtIso),
        desc(orgArticles.createdAt)
      ),
    loadOrgTeamFromD1(d1),
  ]);

  let articles = rows.map(mapArticleRowToDto);
  const categoryFilter = filters?.category?.trim();
  if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
    const lower = categoryFilter.toLowerCase();
    articles = articles.filter((art) => art.category.toLowerCase() === lower);
  }

  return {
    articles,
    authors: teamList.members,
    total: articles.length,
  };
}

export async function loadOrgArticleBySlugFromD1(
  d1: D1Database,
  rawSlug: string
): Promise<OrgArticleDetailResponseDto> {
  const clean = decodeRouteParam(rawSlug).toLowerCase();
  if (!clean) {
    throw new OrgServiceError(400, 'INVALID_ARTICLE_SLUG', 'Article slug is required.');
  }

  const { articles } = await loadOrgArticlesFromD1(d1);
  const article = articles.find((a) => a.slug.toLowerCase() === clean);
  if (!article) {
    throw new OrgServiceError(
      404,
      'ARTICLE_NOT_FOUND',
      `No published article matches '${clean}'.`
    );
  }

  const relatedArticles = articles
    .filter((a) => a.slug !== article.slug)
    .slice(0, 2);

  return {
    article,
    relatedArticles,
  };
}

export async function loadOrgHomeFromD1(d1: D1Database): Promise<OrgHomePayloadDto> {
  const db = createDb(d1);

  const [settingsRows, teamList, activityList, articleCountRows, boundaryCountRows] =
    await Promise.all([
      db.select().from(orgSettings).limit(5),
      loadOrgTeamFromD1(d1),
      loadOrgActivitiesFromD1(d1),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orgArticles)
        .where(eq(orgArticles.isPublished, true)),
      db.select({ count: sql<number>`count(*)` }).from(paperGradeBoundaries),
    ]);

  const settings =
    settingsRows.find((row) => row.id === 'default') ?? settingsRows[0];
  if (!settings) {
    throw new OrgServiceError(
      404,
      'ORG_SETTINGS_NOT_FOUND',
      'Organization showcase settings have not been seeded in D1.'
    );
  }

  const articleCount = Number(articleCountRows[0]?.count ?? 0);
  const boundaryTablesCount = Number(boundaryCountRows[0]?.count ?? 0);

  const missionPillars: OrgMissionPillarDto[] = (settings.missionPillarsJson ?? []).map(
    (pillar: OrgMissionPillarRecord, idx) => ({
      id: pillar.id || `pillar-${idx + 1}`,
      code:
        pillar.code?.trim() ||
        (idx === 0 ? 'Tutoring' : idx === 1 ? 'Software' : 'Community'),
      title: pillar.title,
      description: pillar.description,
    })
  );

  // Prioritize Founders and Tutors for the homepage carousel (up to 3)
  const prioritizedMembers = [...teamList.members].sort((a, b) => {
    const scoreA = (a.isFounder ? 2 : 0) + (a.isTutor ? 1 : 0);
    const scoreB = (b.isFounder ? 2 : 0) + (b.isTutor ? 1 : 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.displayOrder - b.displayOrder;
  });

  const featuredMembers: OrgFeaturedMemberDto[] = prioritizedMembers
    .slice(0, 3)
    .map((member) => ({
      username: member.username,
      name: member.name,
      roleBadge: member.roleBadge,
      title: member.headline,
      specialization: member.specialization,
      availabilityLabel: formatAvailabilityDaysLabel(member.weeklySchedule),
    }));

  const recentActivities = activityList.activities.slice(0, 4).map((act) => ({
    slug: act.slug,
    category: act.category,
    title: act.title,
    dateLabel: act.dateLabel,
    location: act.location,
    summary: act.summary,
    coverImageSrc: act.coverImageSrc,
  }));

  const impactStats: OrgImpactStatDto[] = [
    {
      id: 'students',
      value: '4,800+',
      label: 'Candidates using our calculators',
      detail: 'Cambridge IGCSE, AS/A-Level & Edexcel IAL',
    },
    {
      id: 'tutors',
      value: `${teamList.tutorCount}+`,
      label: 'Tutors with live weekly hours',
      detail: 'Verified instructors listing Sun–Sat slots',
    },
    {
      id: 'papers',
      value:
        boundaryTablesCount > 0
          ? `${boundaryTablesCount.toLocaleString('en-US')}+`
          : '1,250+',
      label: 'Paper boundary tables indexed',
      detail: 'January, May/June, and Oct/Nov series',
    },
    {
      id: 'events',
      value: `${activityList.total}`,
      label: 'In-person meets and venue walks',
      detail: 'Revision clinics, Student Meets, and hall briefings',
    },
  ];

  return {
    heroBadge: 'The ANTs · Academic Network & Tutors',
    heroTitle: settings.heroHeadline,
    heroHighlight: '',
    heroDescription: settings.heroSubheadline,
    missionStatement: settings.missionStatement,
    impactStats,
    missionPillars,
    hackathonBanner: settings.hackathonBannerJson ?? null,
    socialLinks: settings.socialLinksJson ?? {},
    featuredMembers,
    recentActivities,
    counts: {
      teamCount: teamList.total,
      tutorCount: teamList.tutorCount,
      activityCount: activityList.total,
      articleCount,
      boundaryTablesCount,
    },
  };
}
