import type { D1Database } from '@cloudflare/workers-types';
import {
  account,
  and,
  createDb,
  eq,
  notificationPreferences,
  nowIso,
  or,
  profiles,
  session,
  studentProfiles,
  tutorProfiles,
  user,
  userStreaks,
} from '@ants/db';
import {
  parseRolesJson,
  serializeRolesJson,
  type AcademicTrackOption,
  type AuthProfileSummaryDto,
  type AuthSessionBundle,
  type AuthSessionDto,
  type AuthSignInEmailInput,
  type AuthSignUpInput,
  type AuthUserDto,
  type CurriculumBoardId,
  type UserRole,
} from '@ants/shared-types';
import {
  SESSION_TTL_REMEMBER_SECONDS,
  SESSION_TTL_SHORT_SECONDS,
} from './cookies';
import {
  generateEntityId,
  generateSessionToken,
  hashPassword,
  verifyPassword,
} from './crypto';

export interface RequestClientMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthMutationResult extends AuthSessionBundle {
  rawToken: string;
  maxAgeSeconds: number;
  rememberMe: boolean;
}

export class AuthServiceError extends Error {
  readonly status: 400 | 401 | 403 | 409 | 500;
  readonly code: string;

  constructor(status: 400 | 401 | 403 | 409 | 500, code: string, message: string) {
    super(message);
    this.name = 'AuthServiceError';
    this.status = status;
    this.code = code;
  }
}

interface TrackPreset {
  role: UserRole;
  roles: UserRole[];
  headline: string;
  curriculumLabel: string;
  preferredApp: 'flow' | 'study';
  activeBoardId: CurriculumBoardId;
}

const TRACK_PRESETS: Record<AcademicTrackOption, TrackPreset> = {
  igcse: {
    role: 'student',
    roles: ['student'],
    headline: 'Cambridge & Edexcel IGCSE Candidate',
    curriculumLabel: 'Cambridge IGCSE',
    preferredApp: 'study',
    activeBoardId: 'cambridge-igcse',
  },
  ial: {
    role: 'student',
    roles: ['student'],
    headline: 'Pearson Edexcel IAL & AS/A-Level Scholar',
    curriculumLabel: 'Pearson Edexcel IAL',
    preferredApp: 'study',
    activeBoardId: 'edexcel-ial',
  },
  tutor: {
    role: 'tutor',
    roles: ['tutor', 'student'],
    headline: 'Peer & Exam Tutor · IGCSE & IAL Specialist',
    curriculumLabel: 'Pearson Edexcel IAL & Cambridge IGCSE Educator',
    preferredApp: 'flow',
    activeBoardId: 'edexcel-ial',
  },
  productivity: {
    role: 'student',
    roles: ['student'],
    headline: 'Flow Time-Blocking & Deep Work Practitioner',
    curriculumLabel: 'Flow 24h Timetable & Pomodoro Studio',
    preferredApp: 'flow',
    activeBoardId: 'edexcel-ial',
  },
};

function sanitizeUsernameFromEmail(email: string): string {
  const localPart = (email.split('@')[0] ?? 'scholar').toLowerCase();
  const normalized = localPart
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const base = normalized.length >= 3 ? normalized : `${normalized || 'scholar'}ant`;
  return base.slice(0, 18);
}

async function isUsernameTaken(
  db: ReturnType<typeof createDb>,
  candidate: string
): Promise<boolean> {
  const [existingUser, existingProfile] = await Promise.all([
    db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, candidate))
      .limit(1),
    db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.username, candidate))
      .limit(1),
  ]);
  return existingUser.length > 0 || existingProfile.length > 0;
}

async function resolveUniqueUsername(
  db: ReturnType<typeof createDb>,
  email: string,
  requestedUsername?: string
): Promise<string> {
  if (requestedUsername) {
    const taken = await isUsernameTaken(db, requestedUsername);
    if (taken) {
      throw new AuthServiceError(
        409,
        'USERNAME_TAKEN',
        `Username @${requestedUsername} is already taken.`
      );
    }
    return requestedUsername;
  }

  const base = sanitizeUsernameFromEmail(email);
  if (!(await isUsernameTaken(db, base))) {
    return base;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = generateEntityId('u').slice(-4);
    const candidate = `${base.slice(0, 19)}_${suffix}`;
    if (!(await isUsernameTaken(db, candidate))) {
      return candidate;
    }
  }

  return `${base.slice(0, 14)}_${generateEntityId('u').slice(-8)}`;
}

function mapUserDto(row: typeof user.$inferSelect): AuthUserDto {
  const roles = parseRolesJson(row.roles, row.role);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: Boolean(row.emailVerified),
    image: row.image ?? null,
    username: row.username ?? sanitizeUsernameFromEmail(row.email),
    role: row.role,
    roles,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSessionDto(row: typeof session.$inferSelect): AuthSessionDto {
  return {
    id: row.id,
    userId: row.userId,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ipAddress: row.ipAddress ?? null,
    userAgent: row.userAgent ?? null,
  };
}

function mapProfileDto(
  row: typeof profiles.$inferSelect,
  hasTutorProfile: boolean
): AuthProfileSummaryDto {
  const roles = parseRolesJson(row.roles, row.role);
  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    headline: row.headline,
    bio: row.bio,
    institution: row.institution,
    curriculumLabel: row.curriculumLabel,
    timezone: row.timezone,
    preferredApp: row.preferredApp,
    role: row.role,
    roles,
    xp: row.xp,
    streakDays: row.streakDays,
    telegramStatus: row.telegramStatus,
    isTutor: hasTutorProfile || roles.includes('tutor') || roles.includes('teacher'),
  };
}

function resolveSessionMaxAgeSeconds(rememberMe: boolean): number {
  return rememberMe ? SESSION_TTL_REMEMBER_SECONDS : SESSION_TTL_SHORT_SECONDS;
}

/**
 * Registers a new user via email + password and atomically provisions baseline D1 tables:
 * `user`, `account`, `session`, `profiles`, `student_profiles`, `notification_preferences`,
 * `user_streaks`, and `tutor_profiles` (when registering on the tutor track).
 */
export async function signUpWithEmail(
  d1: D1Database,
  input: AuthSignUpInput,
  meta: RequestClientMeta
): Promise<AuthMutationResult> {
  const db = createDb(d1);
  const existingEmail = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);

  if (existingEmail.length > 0) {
    throw new AuthServiceError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'An account with this email address already exists.'
    );
  }

  const username = await resolveUniqueUsername(db, input.email, input.username);
  const preset = TRACK_PRESETS[input.academicTrack];
  const serializedRoles = serializeRolesJson(preset.roles);
  const passwordHash = await hashPassword(input.password);

  const nowDate = new Date();
  const nowTimestampIso = nowDate.toISOString();
  const maxAgeSeconds = resolveSessionMaxAgeSeconds(input.rememberMe);
  const expiresAtDate = new Date(nowDate.getTime() + maxAgeSeconds * 1000);

  const userId = generateEntityId('usr');
  const accountId = generateEntityId('acc');
  const profileId = generateEntityId('prof');
  const studentProfileId = generateEntityId('stu');
  const notificationPrefsId = generateEntityId('npref');
  const streakId = generateEntityId('strk');
  const sessionId = generateEntityId('ses');
  const rawToken = generateSessionToken();
  const isTutor = preset.roles.includes('tutor');

  const userRowValues: typeof user.$inferInsert = {
    id: userId,
    name: input.name,
    email: input.email,
    emailVerified: false,
    image: input.image ?? null,
    username,
    role: preset.role,
    roles: serializedRoles,
    createdAt: nowDate,
    updatedAt: nowDate,
  };

  const accountRowValues: typeof account.$inferInsert = {
    id: accountId,
    accountId: userId,
    providerId: 'credential',
    userId,
    password: passwordHash,
    createdAt: nowDate,
    updatedAt: nowDate,
  };

  const profileRowValues: typeof profiles.$inferInsert = {
    id: profileId,
    userId,
    username,
    displayName: input.name,
    headline: preset.headline,
    bio: '',
    avatarUrl: input.image ?? null,
    institution: 'The ANTs Academic Community',
    curriculumLabel: preset.curriculumLabel,
    timezone: 'Asia/Yangon',
    preferredApp: preset.preferredApp,
    role: preset.role,
    roles: serializedRoles,
    xp: 0,
    streakDays: 0,
    focusHoursThisMonth: 0,
    completedSessions: 0,
    telegramStatus: 'unlinked',
    visibilityJson: {
      showStatsStreak: true,
      showPortfolioProjects: true,
      showCertifications: true,
      showTutorSchedule: isTutor,
      showTelegramInquiry: isTutor,
    },
    portfolioJson: [],
    createdAt: nowTimestampIso,
    updatedAt: nowTimestampIso,
  };

  const studentProfileValues: typeof studentProfiles.$inferInsert = {
    id: studentProfileId,
    userId,
    activeBoardId: preset.activeBoardId,
    privateStudyMode: false,
    weeklyGoalMinutes: 600,
    createdAt: nowTimestampIso,
    updatedAt: nowTimestampIso,
  };

  const notificationPrefsValues: typeof notificationPreferences.$inferInsert = {
    id: notificationPrefsId,
    userId,
    blockReminders: true,
    defaultLeadMinutes: 10,
    dailyMorningDigest: false,
    digestTime: '07:00',
    examCountdownAlerts: true,
    tutorInquiryAlerts: isTutor,
    createdAt: nowTimestampIso,
    updatedAt: nowTimestampIso,
  };

  const streakValues: typeof userStreaks.$inferInsert = {
    id: streakId,
    userId,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastActiveDateIso: null,
    createdAt: nowTimestampIso,
    updatedAt: nowTimestampIso,
  };

  const sessionRowValues: typeof session.$inferInsert = {
    id: sessionId,
    userId,
    token: rawToken,
    expiresAt: expiresAtDate,
    createdAt: nowDate,
    updatedAt: nowDate,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  };

  const insertUserStmt = db.insert(user).values(userRowValues);
  const insertAccountStmt = db.insert(account).values(accountRowValues);
  const insertProfileStmt = db.insert(profiles).values(profileRowValues);
  const insertStudentStmt = db.insert(studentProfiles).values(studentProfileValues);
  const insertPrefsStmt = db.insert(notificationPreferences).values(notificationPrefsValues);
  const insertStreakStmt = db.insert(userStreaks).values(streakValues);
  const insertSessionStmt = db.insert(session).values(sessionRowValues);

  if (isTutor) {
    const insertTutorStmt = db.insert(tutorProfiles).values({
      id: generateEntityId('tut'),
      userId,
      isActive: true,
      specialization: 'IGCSE & IAL Specialist',
      hourlyRateLabel: '25,000 MMK / hr',
      tutorTelegramUsername: '',
      curriculumsJson: ['Pearson Edexcel IAL', 'Cambridge IGCSE'],
      taughtSubjectsJson: [],
      weeklyScheduleJson: {},
      featuredOnOrg: false,
      createdAt: nowTimestampIso,
      updatedAt: nowTimestampIso,
    });

    await db.batch([
      insertUserStmt,
      insertAccountStmt,
      insertProfileStmt,
      insertStudentStmt,
      insertPrefsStmt,
      insertStreakStmt,
      insertTutorStmt,
      insertSessionStmt,
    ]);
  } else {
    await db.batch([
      insertUserStmt,
      insertAccountStmt,
      insertProfileStmt,
      insertStudentStmt,
      insertPrefsStmt,
      insertStreakStmt,
      insertSessionStmt,
    ]);
  }

  return {
    user: {
      id: userId,
      name: input.name,
      email: input.email,
      emailVerified: false,
      image: input.image ?? null,
      username,
      role: preset.role,
      roles: [...preset.roles],
      createdAt: nowTimestampIso,
      updatedAt: nowTimestampIso,
    },
    session: {
      id: sessionId,
      userId,
      expiresAt: expiresAtDate.toISOString(),
      createdAt: nowTimestampIso,
      updatedAt: nowTimestampIso,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
    profile: {
      id: profileId,
      userId,
      username,
      displayName: input.name,
      headline: preset.headline,
      bio: '',
      institution: 'The ANTs Academic Community',
      curriculumLabel: preset.curriculumLabel,
      timezone: 'Asia/Yangon',
      preferredApp: preset.preferredApp,
      role: preset.role,
      roles: [...preset.roles],
      xp: 0,
      streakDays: 0,
      telegramStatus: 'unlinked',
      isTutor,
    },
    rawToken,
    maxAgeSeconds,
    rememberMe: input.rememberMe,
  };
}

async function loadOrProvisionProfileSummary(
  db: ReturnType<typeof createDb>,
  userRow: typeof user.$inferSelect
): Promise<AuthProfileSummaryDto> {
  const [profileRows, tutorRows] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userRow.id)).limit(1),
    db
      .select({ id: tutorProfiles.id })
      .from(tutorProfiles)
      .where(eq(tutorProfiles.userId, userRow.id))
      .limit(1),
  ]);

  const existingProfile = profileRows[0];
  if (existingProfile) {
    return mapProfileDto(existingProfile, tutorRows.length > 0);
  }

  // Self-heal missing baseline records for any pre-existing Better Auth user rows
  const username = userRow.username ?? sanitizeUsernameFromEmail(userRow.email);
  const roles = parseRolesJson(userRow.roles, userRow.role);
  const isTutor = roles.includes('tutor') || roles.includes('teacher') || tutorRows.length > 0;
  const nowTimestampIso = nowIso();
  const profileId = generateEntityId('prof');

  await db.batch([
    db
      .insert(profiles)
      .values({
        id: profileId,
        userId: userRow.id,
        username,
        displayName: userRow.name,
        headline: isTutor
          ? 'Peer & Exam Tutor · IGCSE & IAL Specialist'
          : 'Pearson Edexcel IAL & AS/A-Level Scholar',
        bio: '',
        avatarUrl: userRow.image ?? null,
        institution: 'The ANTs Academic Community',
        curriculumLabel: 'Pearson Edexcel IAL',
        timezone: 'Asia/Yangon',
        preferredApp: 'study',
        role: userRow.role,
        roles: serializeRolesJson(roles),
        xp: 0,
        streakDays: 0,
        focusHoursThisMonth: 0,
        completedSessions: 0,
        telegramStatus: 'unlinked',
        createdAt: nowTimestampIso,
        updatedAt: nowTimestampIso,
      })
      .onConflictDoNothing(),
    db
      .insert(studentProfiles)
      .values({
        id: generateEntityId('stu'),
        userId: userRow.id,
        activeBoardId: 'edexcel-ial',
        privateStudyMode: false,
        weeklyGoalMinutes: 600,
        createdAt: nowTimestampIso,
        updatedAt: nowTimestampIso,
      })
      .onConflictDoNothing(),
    db
      .insert(notificationPreferences)
      .values({
        id: generateEntityId('npref'),
        userId: userRow.id,
        blockReminders: true,
        defaultLeadMinutes: 10,
        dailyMorningDigest: false,
        digestTime: '07:00',
        examCountdownAlerts: true,
        tutorInquiryAlerts: isTutor,
        createdAt: nowTimestampIso,
        updatedAt: nowTimestampIso,
      })
      .onConflictDoNothing(),
    db
      .insert(userStreaks)
      .values({
        id: generateEntityId('strk'),
        userId: userRow.id,
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActiveDateIso: null,
        createdAt: nowTimestampIso,
        updatedAt: nowTimestampIso,
      })
      .onConflictDoNothing(),
  ]);

  const reloaded = await db
    .select()
    .from(profiles)
    .where(or(eq(profiles.userId, userRow.id), eq(profiles.id, profileId)))
    .limit(1);

  const row = reloaded[0];
  if (row) {
    return mapProfileDto(row, isTutor);
  }

  return {
    id: profileId,
    userId: userRow.id,
    username,
    displayName: userRow.name,
    headline: 'Pearson Edexcel IAL & AS/A-Level Scholar',
    bio: '',
    institution: 'The ANTs Academic Community',
    curriculumLabel: 'Pearson Edexcel IAL',
    timezone: 'Asia/Yangon',
    preferredApp: 'study',
    role: userRow.role,
    roles,
    xp: 0,
    streakDays: 0,
    telegramStatus: 'unlinked',
    isTutor,
  };
}

/**
 * Authenticates an existing user strictly by verified email address and password.
 */
export async function signInWithEmail(
  d1: D1Database,
  input: AuthSignInEmailInput,
  meta: RequestClientMeta
): Promise<AuthMutationResult> {
  const db = createDb(d1);
  const userRows = await db
    .select()
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);

  const userRow = userRows[0];
  if (!userRow) {
    throw new AuthServiceError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email address or password.'
    );
  }

  const accountRows = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userRow.id), eq(account.providerId, 'credential')))
    .limit(1);

  const accountRow = accountRows[0];
  if (!accountRow?.password) {
    throw new AuthServiceError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email address or password.'
    );
  }

  const passwordValid = await verifyPassword(input.password, accountRow.password);
  if (!passwordValid) {
    throw new AuthServiceError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email address or password.'
    );
  }

  const nowDate = new Date();
  const maxAgeSeconds = resolveSessionMaxAgeSeconds(input.rememberMe);
  const expiresAtDate = new Date(nowDate.getTime() + maxAgeSeconds * 1000);
  const sessionId = generateEntityId('ses');
  const rawToken = generateSessionToken();

  const [_, profileDto] = await Promise.all([
    db.insert(session).values({
      id: sessionId,
      userId: userRow.id,
      token: rawToken,
      expiresAt: expiresAtDate,
      createdAt: nowDate,
      updatedAt: nowDate,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    }),
    loadOrProvisionProfileSummary(db, userRow),
  ]);

  const mappedSession: AuthSessionDto = {
    id: sessionId,
    userId: userRow.id,
    expiresAt: expiresAtDate.toISOString(),
    createdAt: nowDate.toISOString(),
    updatedAt: nowDate.toISOString(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  };

  return {
    user: mapUserDto(userRow),
    session: mappedSession,
    profile: profileDto,
    rawToken,
    maxAgeSeconds,
    rememberMe: input.rememberMe,
  };
}

/**
 * Resolves the active session bundle (`user`, `session`, `profile`) for a valid session token.
 * Automatically purges expired D1 session records.
 */
export async function getSessionByToken(
  d1: D1Database,
  rawToken: string
): Promise<AuthSessionBundle | null> {
  if (!rawToken) return null;

  const db = createDb(d1);
  const sessionRows = await db
    .select()
    .from(session)
    .where(eq(session.token, rawToken))
    .limit(1);

  const sessionRow = sessionRows[0];
  if (!sessionRow) {
    return null;
  }

  if (sessionRow.expiresAt.getTime() <= Date.now()) {
    await db.delete(session).where(eq(session.id, sessionRow.id));
    return null;
  }

  const userRows = await db
    .select()
    .from(user)
    .where(eq(user.id, sessionRow.userId))
    .limit(1);

  const userRow = userRows[0];
  if (!userRow) {
    return null;
  }

  const profileDto = await loadOrProvisionProfileSummary(db, userRow);
  return {
    user: mapUserDto(userRow),
    session: mapSessionDto(sessionRow),
    profile: profileDto,
  };
}

/**
 * Deletes the active session token from D1 on sign-out.
 */
export async function signOutByToken(d1: D1Database, rawToken: string | null): Promise<void> {
  if (!rawToken) return;
  const db = createDb(d1);
  await db.delete(session).where(eq(session.token, rawToken));
}
