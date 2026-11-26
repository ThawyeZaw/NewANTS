import type { D1Database } from '@cloudflare/workers-types';
import {
  asc,
  contributorProfiles,
  createDb,
  desc,
  eq,
  nowIso,
  orgActivities,
  orgArticles,
  orgSettings,
  orgTeamMembers,
  profiles,
  tutorProfiles,
  user,
  type OrgActivityPhotoRecord,
  type OrgArticleSectionRecord,
  type OrgMissionPillarRecord,
} from '@ants/db';
import {
  ORG_ARTICLE_CATEGORIES,
  ORG_ARTWORK_THEMES,
  ORG_MEMBER_CATEGORIES,
  hasAdminAccess,
  hasMainContributorAccess,
  normalizeUserRoles,
  parseRolesJson,
  serializeRolesJson,
  toOrgActivityDbCategory,
  toOrgActivityDisplayCategory,
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
  type OrgArticleCategory,
  type OrgArtworkTheme,
  type OrgMemberCategory,
  type UserRole,
} from '@ants/shared-types';
import { generateEntityId } from '../auth/crypto';
import {
  deriveInitials,
  formatPublishedMonthYear,
  normalizeTelegramHandle,
  normalizeWeeklySchedule,
} from '../org/service';

export class AdminServiceError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 409 | 500;
  readonly code: string;

  constructor(
    status: 400 | 401 | 403 | 404 | 409 | 500,
    code: string,
    message: string
  ) {
    super(message);
    this.name = 'AdminServiceError';
    this.status = status;
    this.code = code;
  }
}

function normalizeArticleCategory(raw: string): OrgArticleCategory {
  if ((ORG_ARTICLE_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as OrgArticleCategory;
  }
  return 'Study Guide';
}

function normalizeArtworkTheme(
  raw: string | undefined,
  fallback: OrgArtworkTheme
): OrgArtworkTheme {
  if (raw && (ORG_ARTWORK_THEMES as readonly string[]).includes(raw)) {
    return raw as OrgArtworkTheme;
  }
  return fallback;
}

function mapTeamRowToAdminDto(
  row: typeof orgTeamMembers.$inferSelect
): AdminOrgTeamMemberRecordDto {
  const validCategories = new Set<string>(ORG_MEMBER_CATEGORIES);
  const categories = (row.categoriesJson ?? []).filter((c): c is OrgMemberCategory =>
    validCategories.has(c)
  );
  if (row.isFounder && !categories.includes('founder')) categories.push('founder');
  if (row.isTutor && !categories.includes('tutor')) categories.push('tutor');
  if (categories.length === 0) categories.push('contributor');

  return {
    id: row.id,
    userId: row.userId ?? null,
    username: row.username,
    name: row.name,
    initials: row.initials,
    roleCategories: categories,
    roleBadge: row.roleBadge,
    isFounder: Boolean(row.isFounder),
    isTutor: Boolean(row.isTutor),
    headline: row.headline,
    bio: row.bio,
    institution: row.institution,
    specialization: row.specialization,
    curriculums: [...(row.curriculumsJson ?? [])],
    taughtSubjects: [...(row.taughtSubjectsJson ?? [])],
    ...(row.hourlyRateLabel ? { hourlyRateLabel: row.hourlyRateLabel } : {}),
    timezoneLabel: row.timezoneLabel,
    ...(normalizeTelegramHandle(row.tutorTelegramUsername)
      ? { tutorTelegramUsername: normalizeTelegramHandle(row.tutorTelegramUsername) }
      : {}),
    weeklySchedule: normalizeWeeklySchedule(row.weeklyScheduleJson),
    achievements: [...(row.achievementsJson ?? [])],
    joinedLabel: row.joinedLabel,
    displayOrder: row.displayOrder,
    source: 'org_team_member',
    isPublished: Boolean(row.isPublished),
  };
}

function mapActivityRowToAdminDto(
  row: typeof orgActivities.$inferSelect
): AdminOrgActivityRecordDto {
  const dbCategory = toOrgActivityDbCategory(row.category);
  const displayCategory = toOrgActivityDisplayCategory(dbCategory);
  const defaultTheme: OrgArtworkTheme =
    dbCategory === 'hackathon'
      ? 'hackathon'
      : dbCategory === 'exam_venue_visit'
        ? 'venue'
        : dbCategory === 'students_meet'
          ? 'meetup'
          : 'tutoring';

  const gallery = (row.galleryPhotosJson ?? []).map(
    (photo: OrgActivityPhotoRecord, idx) => ({
      id: photo.id || `${row.id}_gal_${idx + 1}`,
      imageSrc: photo.imageSrc,
      imageAlt: photo.imageAlt || row.coverAlt || row.title,
      caption: photo.caption || '',
      locationTag: photo.locationTag || row.location,
      shotLabel: photo.shotLabel || `Photo ${idx + 1}`,
      artworkTheme: normalizeArtworkTheme(photo.artworkTheme, defaultTheme),
    })
  );

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
    ...(row.externalLinksJson && row.externalLinksJson.length > 0
      ? { externalLinks: row.externalLinksJson }
      : {}),
    ...(row.schedulePhasesJson && row.schedulePhasesJson.length > 0
      ? { schedulePhases: row.schedulePhasesJson }
      : {}),
    coverImageSrc: row.coverImageSrc,
    coverAlt: row.coverAlt,
    artworkTheme: defaultTheme,
    gallery,
    displayOrder: row.displayOrder,
    isPublished: Boolean(row.isPublished),
  };
}

function mapArticleRowToAdminDto(
  row: typeof orgArticles.$inferSelect
): AdminOrgArticleRecordDto {
  const category = normalizeArticleCategory(row.category);
  const theme: OrgArtworkTheme =
    category === 'Exam Strategy'
      ? 'article-ums'
      : category === 'Productivity'
        ? 'article-focus'
        : category === 'Announcement'
          ? 'hackathon'
          : 'article-maths';

  const sections = (row.sectionsJson ?? []).map(
    (sec: OrgArticleSectionRecord, idx) => {
      const callout =
        typeof sec.callout === 'string' && sec.callout.trim()
          ? { title: 'Note', body: sec.callout.trim() }
          : sec.callout && typeof sec.callout === 'object'
            ? { title: sec.callout.title || 'Note', body: sec.callout.body || '' }
            : undefined;
      const codeSnippet = sec.codeSnippet || sec.codeBlock || undefined;
      return {
        id: sec.id || `sec-${idx + 1}`,
        heading: sec.heading || `Section ${idx + 1}`,
        paragraphs: [...(sec.paragraphs ?? [])],
        ...(callout ? { callout } : {}),
        ...(codeSnippet ? { codeSnippet } : {}),
        ...(sec.checklist && sec.checklist.length > 0
          ? { checklist: [...sec.checklist] }
          : {}),
      };
    }
  );

  return {
    id: row.id,
    slug: row.slug,
    category,
    title: row.title,
    subtitle: row.subtitle || '',
    publishedAtIso: row.publishedAtIso,
    publishedLabel: formatPublishedMonthYear(row.publishedAtIso),
    readMinutes: Math.max(1, row.readingTimeMinutes || 5),
    authorUsername: row.authorUsername,
    authorName: row.authorName,
    authorRole: row.authorRole,
    summary: row.excerpt,
    tags: [...(row.tagsJson ?? [])],
    artworkTheme: theme,
    ...(row.coverImageSrc ? { coverImageSrc: row.coverImageSrc } : {}),
    ...(row.coverCode ? { coverCode: row.coverCode } : {}),
    ...(row.coverFormula ? { coverFormula: row.coverFormula } : {}),
    ...(row.coverMetric ? { coverMetric: row.coverMetric } : {}),
    isFeatured: Boolean(row.isFeatured),
    sections,
    ...(row.markdownBody ? { markdownBody: row.markdownBody } : {}),
    isPublished: Boolean(row.isPublished),
  };
}

function mapSettingsRowToAdminDto(
  row: typeof orgSettings.$inferSelect | undefined
): AdminOrgSettingsDto {
  if (!row) {
    return {
      id: 'default',
      heroHeadline: 'ACE With Us — open study tools, past papers and peer tutoring.',
      heroSubheadline:
        'Check Cambridge IGCSE and Edexcel IAL grade boundaries with zero login walls.',
      missionStatement:
        'We keep boundary calculators, syllabus checklists, and tutor schedules open in one quiet place.',
      missionPillars: [],
      hackathonBanner: null,
      socialLinks: {},
      updatedAt: nowIso(),
    };
  }
  return {
    id: row.id,
    heroHeadline: row.heroHeadline,
    heroSubheadline: row.heroSubheadline,
    missionStatement: row.missionStatement,
    missionPillars: (row.missionPillarsJson ?? []).map(
      (p: OrgMissionPillarRecord, idx) => ({
        id: p.id || `pillar-${idx + 1}`,
        code: p.code?.trim() || 'Pillar',
        title: p.title,
        description: p.description,
      })
    ),
    hackathonBanner: row.hackathonBannerJson ?? null,
    socialLinks: row.socialLinksJson ?? {},
    updatedAt: row.updatedAt,
  };
}

export async function listAdminUsersFromD1(
  d1: D1Database
): Promise<AdminUserSummaryDto[]> {
  const db = createDb(d1);
  const [userRows, tutorRows] = await Promise.all([
    db.select().from(user).orderBy(desc(user.createdAt)),
    db.select({ userId: tutorProfiles.userId, isActive: tutorProfiles.isActive }).from(tutorProfiles),
  ]);

  const activeTutorUserIds = new Set(
    tutorRows.filter((t) => Boolean(t.isActive)).map((t) => t.userId)
  );

  return userRows.map((u) => {
    const roles = parseRolesJson(u.roles, u.role);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username || u.email.split('@')[0] || u.id,
      role: u.role as AdminUserSummaryDto['role'],
      roles,
      isTutor:
        activeTutorUserIds.has(u.id) ||
        roles.includes('tutor') ||
        roles.includes('teacher'),
      createdAt:
        u.createdAt instanceof Date
          ? u.createdAt.toISOString()
          : new Date(u.createdAt).toISOString(),
    };
  });
}

export async function loadAdminBootstrapFromD1(
  d1: D1Database,
  actorRoles: readonly UserRole[]
): Promise<AdminOrgBootstrapDto> {
  const db = createDb(d1);
  const canManageSettings = hasAdminAccess(actorRoles);
  const canManageRoles = hasAdminAccess(actorRoles);
  const canManageContent = hasMainContributorAccess(actorRoles);

  const [settingsRows, teamRows, activityRows, articleRows, users] =
    await Promise.all([
      db.select().from(orgSettings).limit(5),
      db
        .select()
        .from(orgTeamMembers)
        .orderBy(asc(orgTeamMembers.displayOrder), asc(orgTeamMembers.createdAt)),
      db
        .select()
        .from(orgActivities)
        .orderBy(asc(orgActivities.displayOrder), desc(orgActivities.createdAt)),
      db
        .select()
        .from(orgArticles)
        .orderBy(
          desc(orgArticles.isFeatured),
          desc(orgArticles.publishedAtIso),
          desc(orgArticles.createdAt)
        ),
      canManageRoles ? listAdminUsersFromD1(d1) : Promise.resolve([]),
    ]);

  const settingsRow =
    settingsRows.find((r) => r.id === 'default') ?? settingsRows[0];

  return {
    settings: mapSettingsRowToAdminDto(settingsRow),
    team: teamRows.map(mapTeamRowToAdminDto),
    activities: activityRows.map(mapActivityRowToAdminDto),
    articles: articleRows.map(mapArticleRowToAdminDto),
    users,
    capabilities: {
      canManageSettings,
      canManageRoles,
      canManageContent,
    },
  };
}

export async function updateAdminOrgSettings(
  d1: D1Database,
  actorUserId: string,
  input: AdminOrgSettingsUpdateInput
): Promise<AdminOrgSettingsDto> {
  const db = createDb(d1);
  const timestamp = nowIso();
  const existing = await db
    .select()
    .from(orgSettings)
    .where(eq(orgSettings.id, 'default'))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(orgSettings)
      .set({
        heroHeadline: input.heroHeadline,
        heroSubheadline: input.heroSubheadline,
        missionStatement: input.missionStatement,
        missionPillarsJson: input.missionPillars,
        hackathonBannerJson: input.hackathonBanner ?? null,
        socialLinksJson: input.socialLinks,
        updatedByUserId: actorUserId,
        updatedAt: timestamp,
      })
      .where(eq(orgSettings.id, 'default'));
  } else {
    await db.insert(orgSettings).values({
      id: 'default',
      heroHeadline: input.heroHeadline,
      heroSubheadline: input.heroSubheadline,
      missionStatement: input.missionStatement,
      missionPillarsJson: input.missionPillars,
      hackathonBannerJson: input.hackathonBanner ?? null,
      socialLinksJson: input.socialLinks,
      updatedByUserId: actorUserId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const updated = await db
    .select()
    .from(orgSettings)
    .where(eq(orgSettings.id, 'default'))
    .limit(1);

  return mapSettingsRowToAdminDto(updated[0]);
}

export async function upsertAdminOrgTeamMember(
  d1: D1Database,
  input: AdminOrgTeamMemberUpsertInput
): Promise<AdminOrgTeamMemberRecordDto> {
  const db = createDb(d1);
  const cleanUsername = input.username.trim().replace(/^@+/, '').toLowerCase();
  const timestamp = nowIso();
  const id = input.id?.trim() || generateEntityId('mem');

  const existingByUsername = await db
    .select({ id: orgTeamMembers.id })
    .from(orgTeamMembers)
    .where(eq(orgTeamMembers.username, cleanUsername))
    .limit(1);

  if (existingByUsername[0] && existingByUsername[0].id !== id) {
    throw new AdminServiceError(
      409,
      'USERNAME_TAKEN',
      `Team member handle '@${cleanUsername}' already exists.`
    );
  }

  const existingById = input.id
    ? await db
        .select({ id: orgTeamMembers.id })
        .from(orgTeamMembers)
        .where(eq(orgTeamMembers.id, id))
        .limit(1)
    : [];

  const initials = input.initials?.trim()
    ? input.initials.trim().slice(0, 3).toUpperCase()
    : deriveInitials(input.name);
  const normalizedTelegram = normalizeTelegramHandle(input.tutorTelegramUsername) ?? null;
  const normalizedSchedule = normalizeWeeklySchedule(input.weeklySchedule);

  const values = {
    userId: input.userId ?? null,
    username: cleanUsername,
    name: input.name,
    initials,
    roleBadge: input.roleBadge,
    categoriesJson: input.roleCategories,
    isFounder: input.isFounder,
    isTutor: input.isTutor,
    headline: input.headline,
    bio: input.bio,
    institution: input.institution,
    specialization: input.specialization,
    curriculumsJson: input.curriculums,
    taughtSubjectsJson: input.taughtSubjects,
    hourlyRateLabel: input.hourlyRateLabel ?? null,
    timezoneLabel: input.timezoneLabel,
    tutorTelegramUsername: normalizedTelegram,
    weeklyScheduleJson: normalizedSchedule,
    achievementsJson: input.achievements,
    joinedLabel: input.joinedLabel,
    displayOrder: input.displayOrder,
    isPublished: input.isPublished,
    updatedAt: timestamp,
  };

  if (existingById.length > 0) {
    await db
      .update(orgTeamMembers)
      .set(values)
      .where(eq(orgTeamMembers.id, id));
  } else {
    await db.insert(orgTeamMembers).values({
      id,
      ...values,
      createdAt: timestamp,
    });
  }

  const saved = await db
    .select()
    .from(orgTeamMembers)
    .where(eq(orgTeamMembers.id, id))
    .limit(1);

  return mapTeamRowToAdminDto(saved[0]!);
}

export async function deleteAdminOrgTeamMember(
  d1: D1Database,
  id: string
): Promise<{ deletedId: string }> {
  const db = createDb(d1);
  const existing = await db
    .select({ id: orgTeamMembers.id })
    .from(orgTeamMembers)
    .where(eq(orgTeamMembers.id, id))
    .limit(1);

  if (existing.length === 0) {
    throw new AdminServiceError(404, 'TEAM_MEMBER_NOT_FOUND', 'Team member not found.');
  }

  await db.delete(orgTeamMembers).where(eq(orgTeamMembers.id, id));
  return { deletedId: id };
}

export async function upsertAdminOrgActivity(
  d1: D1Database,
  input: AdminOrgActivityUpsertInput
): Promise<AdminOrgActivityRecordDto> {
  const db = createDb(d1);
  const cleanSlug = input.slug.trim().toLowerCase();
  const timestamp = nowIso();
  const id = input.id?.trim() || generateEntityId('act');

  const existingBySlug = await db
    .select({ id: orgActivities.id })
    .from(orgActivities)
    .where(eq(orgActivities.slug, cleanSlug))
    .limit(1);

  if (existingBySlug[0] && existingBySlug[0].id !== id) {
    throw new AdminServiceError(
      409,
      'SLUG_TAKEN',
      `Activity slug '${cleanSlug}' already exists.`
    );
  }

  const existingById = input.id
    ? await db
        .select({ id: orgActivities.id })
        .from(orgActivities)
        .where(eq(orgActivities.id, id))
        .limit(1)
    : [];

  const dbCategory = toOrgActivityDbCategory(input.category);

  const values = {
    slug: cleanSlug,
    category: dbCategory,
    isUpcoming: input.isUpcoming,
    title: input.title,
    dateLabel: input.dateLabel,
    location: input.location,
    attendanceLabel: input.attendanceLabel,
    facilitatorsJson: input.facilitators,
    summary: input.summary,
    recapParagraphsJson: input.recapParagraphs,
    highlightsJson: input.highlights,
    externalLinksJson: input.externalLinks ?? [],
    schedulePhasesJson: input.schedulePhases ?? [],
    coverImageSrc: input.coverImageSrc,
    coverAlt: input.coverAlt,
    galleryPhotosJson: input.gallery,
    displayOrder: input.displayOrder,
    isPublished: input.isPublished,
    updatedAt: timestamp,
  };

  if (existingById.length > 0) {
    await db.update(orgActivities).set(values).where(eq(orgActivities.id, id));
  } else {
    await db.insert(orgActivities).values({
      id,
      ...values,
      createdAt: timestamp,
    });
  }

  const saved = await db
    .select()
    .from(orgActivities)
    .where(eq(orgActivities.id, id))
    .limit(1);

  return mapActivityRowToAdminDto(saved[0]!);
}

export async function deleteAdminOrgActivity(
  d1: D1Database,
  id: string
): Promise<{ deletedId: string }> {
  const db = createDb(d1);
  const existing = await db
    .select({ id: orgActivities.id })
    .from(orgActivities)
    .where(eq(orgActivities.id, id))
    .limit(1);

  if (existing.length === 0) {
    throw new AdminServiceError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found.');
  }

  await db.delete(orgActivities).where(eq(orgActivities.id, id));
  return { deletedId: id };
}

export async function upsertAdminOrgArticle(
  d1: D1Database,
  input: AdminOrgArticleUpsertInput
): Promise<AdminOrgArticleRecordDto> {
  const db = createDb(d1);
  const cleanSlug = input.slug.trim().toLowerCase();
  const timestamp = nowIso();
  const id = input.id?.trim() || generateEntityId('art');

  const existingBySlug = await db
    .select({ id: orgArticles.id })
    .from(orgArticles)
    .where(eq(orgArticles.slug, cleanSlug))
    .limit(1);

  if (existingBySlug[0] && existingBySlug[0].id !== id) {
    throw new AdminServiceError(
      409,
      'SLUG_TAKEN',
      `Article slug '${cleanSlug}' already exists.`
    );
  }

  const existingById = input.id
    ? await db
        .select({ id: orgArticles.id })
        .from(orgArticles)
        .where(eq(orgArticles.id, id))
        .limit(1)
    : [];

  const values = {
    slug: cleanSlug,
    title: input.title,
    subtitle: input.subtitle,
    excerpt: input.summary,
    category: input.category,
    authorName: input.authorName,
    authorUsername: input.authorUsername.trim().replace(/^@+/, '').toLowerCase(),
    authorRole: input.authorRole,
    publishedAtIso: input.publishedAtIso?.trim() || timestamp,
    readingTimeMinutes: input.readMinutes,
    tagsJson: input.tags,
    coverImageSrc: input.coverImageSrc ?? null,
    coverCode: input.coverCode ?? null,
    coverFormula: input.coverFormula ?? null,
    coverMetric: input.coverMetric ?? null,
    sectionsJson: input.sections,
    markdownBody: input.markdownBody,
    isFeatured: input.isFeatured,
    isPublished: input.isPublished,
    updatedAt: timestamp,
  };

  if (existingById.length > 0) {
    await db.update(orgArticles).set(values).where(eq(orgArticles.id, id));
  } else {
    await db.insert(orgArticles).values({
      id,
      ...values,
      createdAt: timestamp,
    });
  }

  const saved = await db
    .select()
    .from(orgArticles)
    .where(eq(orgArticles.id, id))
    .limit(1);

  return mapArticleRowToAdminDto(saved[0]!);
}

export async function deleteAdminOrgArticle(
  d1: D1Database,
  id: string
): Promise<{ deletedId: string }> {
  const db = createDb(d1);
  const existing = await db
    .select({ id: orgArticles.id })
    .from(orgArticles)
    .where(eq(orgArticles.id, id))
    .limit(1);

  if (existing.length === 0) {
    throw new AdminServiceError(404, 'ARTICLE_NOT_FOUND', 'Article not found.');
  }

  await db.delete(orgArticles).where(eq(orgArticles.id, id));
  return { deletedId: id };
}

export async function updateAdminUserRoles(
  d1: D1Database,
  actorUserId: string,
  targetUserId: string,
  input: AdminUserRolesUpdateInput
): Promise<AdminUserSummaryDto> {
  const db = createDb(d1);
  const normalizedRoles = normalizeUserRoles(input.role, input.roles);
  const primaryRole = input.role;

  if (actorUserId === targetUserId && !normalizedRoles.includes('admin')) {
    throw new AdminServiceError(
      400,
      'SELF_DEMOTION_FORBIDDEN',
      'You cannot remove your own admin role.'
    );
  }

  const existingUsers = await db
    .select()
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  const targetUser = existingUsers[0];
  if (!targetUser) {
    throw new AdminServiceError(404, 'USER_NOT_FOUND', 'Target user was not found.');
  }

  const timestampIso = nowIso();
  const timestampDate = new Date();
  const serializedRoles = serializeRolesJson(normalizedRoles);

  await Promise.all([
    db
      .update(user)
      .set({
        role: primaryRole,
        roles: serializedRoles,
        updatedAt: timestampDate,
      })
      .where(eq(user.id, targetUserId)),
    db
      .update(profiles)
      .set({
        role: primaryRole,
        roles: serializedRoles,
        updatedAt: timestampIso,
      })
      .where(eq(profiles.userId, targetUserId)),
  ]);

  if (normalizedRoles.includes('tutor') || normalizedRoles.includes('teacher')) {
    const existingTutor = await db
      .select({ id: tutorProfiles.id })
      .from(tutorProfiles)
      .where(eq(tutorProfiles.userId, targetUserId))
      .limit(1);

    if (existingTutor.length === 0) {
      await db.insert(tutorProfiles).values({
        id: generateEntityId('tp'),
        userId: targetUserId,
        isActive: true,
        specialization: '',
        hourlyRateLabel: '',
        tutorTelegramUsername: '',
        curriculumsJson: [],
        taughtSubjectsJson: [],
        weeklyScheduleJson: {},
        featuredOnOrg: false,
        createdAt: timestampIso,
        updatedAt: timestampIso,
      });
    }
  }

  if (
    normalizedRoles.includes('contributor') ||
    normalizedRoles.includes('main_contributor')
  ) {
    const level = normalizedRoles.includes('main_contributor')
      ? 'main_contributor'
      : 'contributor';
    const existingContrib = await db
      .select({ id: contributorProfiles.id })
      .from(contributorProfiles)
      .where(eq(contributorProfiles.userId, targetUserId))
      .limit(1);

    if (existingContrib.length === 0) {
      await db.insert(contributorProfiles).values({
        id: generateEntityId('cp'),
        userId: targetUserId,
        level,
        focusBoardsJson: [],
        approvedSubmissionsCount: 0,
        bio: '',
        createdAt: timestampIso,
        updatedAt: timestampIso,
      });
    } else {
      await db
        .update(contributorProfiles)
        .set({ level, updatedAt: timestampIso })
        .where(eq(contributorProfiles.userId, targetUserId));
    }
  }

  const users = await listAdminUsersFromD1(d1);
  const updated = users.find((u) => u.id === targetUserId);
  if (!updated) {
    throw new AdminServiceError(404, 'USER_NOT_FOUND', 'Updated user not found.');
  }
  return updated;
}
