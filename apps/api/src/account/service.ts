import type { D1Database } from '@cloudflare/workers-types';
import {
  asc,
  certifications,
  createDb,
  desc,
  eq,
  nowIso,
  profiles,
  tutorProfiles,
  user,
} from '@ants/db';
import {
  parseRolesJson,
  type AccountProfileDto,
  type AccountProfileUpdateInput,
  type PublicProfileResponseDto,
  type PublicProfileSwitchDto,
  type UserRole,
} from '@ants/shared-types';
import { generateEntityId } from '../auth/crypto';
import { normalizeWeeklySchedule } from '../org/service';
import { getTelegramStatusForUser } from '../telegram/service';
import type { ApiBindings } from '../types';

export class AccountServiceError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 409 | 500;
  readonly code: string;

  constructor(
    status: 400 | 401 | 403 | 404 | 409 | 500,
    code: string,
    message: string
  ) {
    super(message);
    this.name = 'AccountServiceError';
    this.status = status;
    this.code = code;
  }
}

function formatMemberSince(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '2026';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function buildRoleLabel(roles: readonly UserRole[]): string {
  if (roles.includes('admin') && roles.includes('tutor')) return 'Admin+Tutor';
  if (roles.includes('admin')) return 'Admin';
  if (roles.includes('main_contributor')) return 'Lead Reviewer';
  if (roles.includes('tutor') || roles.includes('teacher')) return 'Tutor';
  if (roles.includes('contributor')) return 'Contributor';
  return 'Student';
}

export async function loadMyAccountProfile(
  d1: D1Database,
  userId: string,
  env?: ApiBindings
): Promise<AccountProfileDto> {
  const db = createDb(d1);

  const [userRows, profileRows, tutorRows, certRows, telegram] = await Promise.all([
    db.select().from(user).where(eq(user.id, userId)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select().from(tutorProfiles).where(eq(tutorProfiles.userId, userId)).limit(1),
    db
      .select()
      .from(certifications)
      .where(eq(certifications.userId, userId))
      .orderBy(asc(certifications.displayOrder), desc(certifications.verified)),
    getTelegramStatusForUser(d1, userId, env),
  ]);

  const userRow = userRows[0];
  const profileRow = profileRows[0];
  if (!userRow || !profileRow) {
    throw new AccountServiceError(
      404,
      'PROFILE_NOT_FOUND',
      'User profile was not found.'
    );
  }

  const tutorRow = tutorRows[0];
  const roles = parseRolesJson(profileRow.roles, profileRow.role);

  return {
    id: profileRow.id,
    userId: profileRow.userId,
    name: profileRow.displayName || userRow.name,
    username: profileRow.username,
    email: userRow.email,
    headline: profileRow.headline,
    bio: profileRow.bio,
    institution: profileRow.institution,
    curriculumLabel: profileRow.curriculumLabel,
    timezone: profileRow.timezone,
    preferredApp: profileRow.preferredApp,
    memberSince: formatMemberSince(profileRow.createdAt),
    role: profileRow.role,
    roles,
    xp: profileRow.xp,
    streakDays: profileRow.streakDays,
    focusHoursThisMonth: profileRow.focusHoursThisMonth,
    completedSessions: profileRow.completedSessions,
    hourlyRateLabel: tutorRow?.hourlyRateLabel ?? '',
    tutorTelegramUsername: tutorRow?.tutorTelegramUsername ?? '',
    curriculums: [...(tutorRow?.curriculumsJson ?? [])],
    taughtSubjects: [...(tutorRow?.taughtSubjectsJson ?? [])],
    featuredOnOrg: Boolean(tutorRow?.featuredOnOrg),
    tutorSchedule: normalizeWeeklySchedule(tutorRow?.weeklyScheduleJson),
    portfolioItems: [...(profileRow.portfolioJson ?? [])],
    certifications: certRows.map((c) => ({
      id: c.id,
      title: c.title,
      issuer: c.issuer,
      year: c.year,
      ...(c.credentialCode ? { credentialCode: c.credentialCode } : {}),
      verified: Boolean(c.verified),
    })),
    telegram,
    visibility: {
      showStatsStreak: profileRow.visibilityJson?.showStatsStreak ?? true,
      showPortfolioProjects: profileRow.visibilityJson?.showPortfolioProjects ?? true,
      showCertifications: profileRow.visibilityJson?.showCertifications ?? true,
      showTutorSchedule: profileRow.visibilityJson?.showTutorSchedule ?? true,
      showTelegramInquiry: profileRow.visibilityJson?.showTelegramInquiry ?? true,
    },
  };
}

export async function updateMyAccountProfile(
  d1: D1Database,
  userId: string,
  input: AccountProfileUpdateInput,
  env?: ApiBindings
): Promise<AccountProfileDto> {
  const db = createDb(d1);
  const timestampIso = nowIso();
  const timestampDate = new Date();

  const [userRows, profileRows] = await Promise.all([
    db.select().from(user).where(eq(user.id, userId)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
  ]);

  const userRow = userRows[0];
  const profileRow = profileRows[0];
  if (!userRow || !profileRow) {
    throw new AccountServiceError(
      404,
      'PROFILE_NOT_FOUND',
      'User profile was not found.'
    );
  }

  let nextUsername = profileRow.username;
  if (input.username && input.username !== profileRow.username) {
    const [existingProfile, existingUser] = await Promise.all([
      db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.username, input.username))
        .limit(1),
      db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, input.username))
        .limit(1),
    ]);

    if (
      (existingProfile[0] && existingProfile[0].userId !== userId) ||
      (existingUser[0] && existingUser[0].id !== userId)
    ) {
      throw new AccountServiceError(
        409,
        'USERNAME_TAKEN',
        `Username '@${input.username}' is already claimed.`
      );
    }
    nextUsername = input.username;
  }

  const nextName = input.name?.trim() || profileRow.displayName || userRow.name;

  await Promise.all([
    db
      .update(user)
      .set({
        name: nextName,
        username: nextUsername,
        updatedAt: timestampDate,
      })
      .where(eq(user.id, userId)),
    db
      .update(profiles)
      .set({
        username: nextUsername,
        displayName: nextName,
        headline: input.headline ?? profileRow.headline,
        bio: input.bio ?? profileRow.bio,
        institution: input.institution ?? profileRow.institution,
        curriculumLabel: input.curriculumLabel ?? profileRow.curriculumLabel,
        timezone: input.timezone ?? profileRow.timezone,
        preferredApp: input.preferredApp ?? profileRow.preferredApp,
        visibilityJson: input.visibility ?? profileRow.visibilityJson,
        portfolioJson: input.portfolioItems ?? profileRow.portfolioJson,
        updatedAt: timestampIso,
      })
      .where(eq(profiles.userId, userId)),
  ]);

  const hasTutorUpdate =
    input.tutorSchedule !== undefined ||
    input.hourlyRateLabel !== undefined ||
    input.tutorTelegramUsername !== undefined ||
    input.curriculums !== undefined ||
    input.taughtSubjects !== undefined ||
    input.featuredOnOrg !== undefined;

  if (hasTutorUpdate) {
    const existingTutorRows = await db
      .select()
      .from(tutorProfiles)
      .where(eq(tutorProfiles.userId, userId))
      .limit(1);
    const existingTutor = existingTutorRows[0];

    const normalizedTelegram =
      input.tutorTelegramUsername !== undefined
        ? input.tutorTelegramUsername.trim()
          ? input.tutorTelegramUsername.trim().startsWith('@')
            ? input.tutorTelegramUsername.trim()
            : `@${input.tutorTelegramUsername.trim()}`
          : ''
        : (existingTutor?.tutorTelegramUsername ?? '');

    const nextSchedule =
      input.tutorSchedule !== undefined
        ? normalizeWeeklySchedule(input.tutorSchedule)
        : (existingTutor?.weeklyScheduleJson ?? {});

    if (existingTutor) {
      await db
        .update(tutorProfiles)
        .set({
          hourlyRateLabel: input.hourlyRateLabel ?? existingTutor.hourlyRateLabel,
          tutorTelegramUsername: normalizedTelegram,
          curriculumsJson: input.curriculums ?? existingTutor.curriculumsJson,
          taughtSubjectsJson:
            input.taughtSubjects ?? existingTutor.taughtSubjectsJson,
          featuredOnOrg: input.featuredOnOrg ?? existingTutor.featuredOnOrg,
          weeklyScheduleJson: nextSchedule,
          updatedAt: timestampIso,
        })
        .where(eq(tutorProfiles.id, existingTutor.id));
    } else {
      await db.insert(tutorProfiles).values({
        id: generateEntityId('tp'),
        userId,
        isActive: true,
        specialization: input.headline ?? profileRow.headline,
        hourlyRateLabel: input.hourlyRateLabel ?? '',
        tutorTelegramUsername: normalizedTelegram,
        curriculumsJson: input.curriculums ?? [],
        taughtSubjectsJson: input.taughtSubjects ?? [],
        weeklyScheduleJson: nextSchedule,
        featuredOnOrg: input.featuredOnOrg ?? false,
        createdAt: timestampIso,
        updatedAt: timestampIso,
      });
    }
  }

  if (input.certifications !== undefined) {
    await db.delete(certifications).where(eq(certifications.userId, userId));
    for (let idx = 0; idx < input.certifications.length; idx += 1) {
      const cert = input.certifications[idx]!;
      await db.insert(certifications).values({
        id: cert.id || generateEntityId('cert'),
        userId,
        title: cert.title,
        issuer: cert.issuer,
        year: cert.year,
        credentialCode: cert.credentialCode ?? null,
        verified: cert.verified,
        displayOrder: idx + 1,
        createdAt: timestampIso,
        updatedAt: timestampIso,
      });
    }
  }

  return loadMyAccountProfile(d1, userId, env);
}

export async function loadPublicAccountProfile(
  d1: D1Database,
  rawUsername: string,
  viewerUserId?: string,
  env?: ApiBindings
): Promise<PublicProfileResponseDto> {
  const cleanHandle = (() => {
    try {
      return decodeURIComponent(rawUsername).trim().replace(/^@+/, '').toLowerCase();
    } catch {
      return rawUsername.trim().replace(/^@+/, '').toLowerCase();
    }
  })();

  if (!cleanHandle) {
    throw new AccountServiceError(400, 'INVALID_HANDLE', 'Username handle is required.');
  }

  const db = createDb(d1);
  const [matchedRows, allProfiles] = await Promise.all([
    db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.username, cleanHandle))
      .limit(1),
    db
      .select({
        username: profiles.username,
        displayName: profiles.displayName,
        role: profiles.role,
        roles: profiles.roles,
      })
      .from(profiles)
      .orderBy(desc(profiles.xp))
      .limit(12),
  ]);

  const target = matchedRows[0];
  if (!target) {
    throw new AccountServiceError(
      404,
      'PROFILE_NOT_FOUND',
      `No member profile matches '@${cleanHandle}'.`
    );
  }

  const fullProfile = await loadMyAccountProfile(d1, target.userId, env);
  const isOwnProfile = Boolean(viewerUserId && viewerUserId === target.userId);

  const sanitizedProfile: AccountProfileDto = isOwnProfile
    ? fullProfile
    : {
        ...fullProfile,
        email: '',
        xp: fullProfile.visibility.showStatsStreak ? fullProfile.xp : 0,
        streakDays: fullProfile.visibility.showStatsStreak ? fullProfile.streakDays : 0,
        focusHoursThisMonth: fullProfile.visibility.showStatsStreak
          ? fullProfile.focusHoursThisMonth
          : 0,
        completedSessions: fullProfile.visibility.showStatsStreak
          ? fullProfile.completedSessions
          : 0,
        portfolioItems: fullProfile.visibility.showPortfolioProjects
          ? fullProfile.portfolioItems
          : [],
        certifications: fullProfile.visibility.showCertifications
          ? fullProfile.certifications
          : [],
        tutorSchedule: fullProfile.visibility.showTutorSchedule
          ? fullProfile.tutorSchedule
          : normalizeWeeklySchedule({}),
        tutorTelegramUsername: fullProfile.visibility.showTelegramInquiry
          ? fullProfile.tutorTelegramUsername
          : '',
        telegram: {
          ...fullProfile.telegram,
          handle: fullProfile.visibility.showTelegramInquiry
            ? fullProfile.telegram.handle
            : '',
          chatId: null,
          verificationCode: null,
          codeExpiresAt: null,
          startCommand: null,
          deepLinkUrl: null,
        },
      };

  const availableProfiles: PublicProfileSwitchDto[] = allProfiles.map((p) => ({
    username: p.username,
    name: p.displayName,
    roleLabel: buildRoleLabel(parseRolesJson(p.roles, p.role)),
  }));

  return {
    profile: sanitizedProfile,
    isOwnProfile,
    availableProfiles,
  };
}
