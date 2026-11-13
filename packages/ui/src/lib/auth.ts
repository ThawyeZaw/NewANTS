/**
 * Shared `@ants/ui` Cross-Subdomain Authentication, SSO Cookie/Storage Bridge &
 * Strict Guest vs. Authenticated Access Matrix Engine.
 *
 * Pure TypeScript state transformers & defensive browser cookie/storage helpers so
 * `flow.the-ants.org` (`localhost:3002`) and `study.the-ants.org` (`localhost:3001`)
 * share a single `.the-ants.org` / `localhost` session in Zay's UI prototypes and
 * wire cleanly into Thaw's `[THAW-1.5]` / `[THAW-1.7]` Better Auth containers.
 */
import {
  MOCK_AUTHENTICATED_USER,
  type EcosystemAppId,
  type MockUserProfile,
  type UserRole,
} from '../mocks/ecosystem-chrome.mock';
import {
  MOCK_SHARED_PROFILES,
  ZYY_PROFILE_MOCK,
  createInitialAccountStorageState,
} from '../mocks/account-profile.mock';
import {
  ACCOUNT_PROFILE_STORAGE_KEY,
  applyTutorSchedulePreset,
  loadAccountStorageState,
  normalizeProfileHandle,
  sanitizeAccountUsernameInput,
  saveAccountStorageState,
  validateAccountUsername,
  type AccountProfileStorageState,
  type SharedUserProfileData,
} from './account';
import type { AcademicTrackOption, AuthFormSubmitPayload } from '../views/AuthFormView';

export const ANTS_SSO_COOKIE_KEY = 'ants_sso_session';
export const ANTS_AUTH_STORAGE_KEY = 'ants-auth-session-v1';
export const ANTS_AUTH_SESSION_EVENT = 'ants-auth-session-change';

export type AuthSessionStatus = 'authenticated' | 'guest';
export type AuthMethodId = 'email' | 'google' | 'github' | 'demo';

export interface PasswordStrengthReport {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Enter password' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: {
    minLength: boolean;
    hasLetterAndNumber: boolean;
    hasMixedCase: boolean;
    hasSymbolOrLong: boolean;
  };
}

export interface AntsSsoSessionState {
  version: 1;
  status: AuthSessionStatus;
  username: string | null;
  authMethod: AuthMethodId;
  rememberMe: boolean;
  signedInAtIso: string;
  user: MockUserProfile | null;
  /** Optional custom profile metadata so newly registered `/signup` accounts sync across `:3001` and `:3002` via cookie */
  customProfile?: {
    id: string;
    name: string;
    username: string;
    email: string;
    headline: string;
    curriculumLabel: string;
    preferredApp: 'flow' | 'study';
    role: UserRole;
    roles: UserRole[];
  };
}

export type AccessMatrixFeatureId =
  | 'org-showcase'
  | 'org-admin'
  | 'org-cms'
  | 'calculator'
  | 'flow-pomodoro'
  | 'flow-workspace'
  | 'flow-settings'
  | 'flow-profile'
  | 'study-workspace'
  | 'study-settings'
  | 'auth-route';

export type GuestAccessLevel =
  | 'public'
  | 'guest-usable'
  | 'prototype-preview'
  | 'login-gate'
  | 'sso-auth';

export interface AccessMatrixPolicy {
  feature: AccessMatrixFeatureId;
  app: EcosystemAppId;
  pathname: string;
  guestAccess: GuestAccessLevel;
  requiresLogin: boolean;
  requiredRoles?: UserRole[];
  defaultRedirectPath: string;
  guestSummary: string;
  authenticatedSummary: string;
}

export interface AuthFieldErrors {
  email?: string;
  password?: string;
  name?: string;
  username?: string;
}

export interface AuthOperationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: AuthFieldErrors;
  session?: AntsSsoSessionState;
  profile?: SharedUserProfileData;
  nextAccountState?: AccountProfileStorageState;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Converts a full `SharedUserProfileData` record into a compact header `MockUserProfile`. */
export function profileToMockUser(profile: SharedUserProfileData): MockUserProfile {
  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email: profile.email,
    role: profile.role,
    roles: profile.roles,
    xp: profile.xp,
    streakDays: profile.streakDays,
    telegramConnected: profile.telegram.status === 'connected',
    curriculumLabel: profile.curriculumLabel,
  };
}

/** Contributor hierarchy roles authorized to access and edit the Content Studio. */
export const CONTRIBUTOR_ROLES: readonly UserRole[] = [
  'contributor',
  'main_contributor',
  'admin',
];

/** Checks whether a user profile has contributor, main_contributor, or admin permissions. */
export function hasContributorRole(user: MockUserProfile | null | undefined): boolean {
  if (!user) return false;
  const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  return userRoles.some((role) => (CONTRIBUTOR_ROLES as readonly string[]).includes(role));
}

/** Evaluates password strength across 4 deterministic criteria for `/signup`. */
export function evaluatePasswordStrength(password: string): PasswordStrengthReport {
  const checks = {
    minLength: password.length >= 8,
    hasLetterAndNumber: /[A-Za-z]/.test(password) && /\d/.test(password),
    hasMixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasSymbolOrLong: /[^A-Za-z0-9]/.test(password) || password.length >= 12,
  };

  if (password.length === 0) {
    return {
      score: 0,
      label: 'Enter password',
      checks,
    };
  }

  const rawPoints =
    (checks.minLength ? 1 : 0) +
    (checks.hasLetterAndNumber ? 1 : 0) +
    (checks.hasMixedCase ? 1 : 0) +
    (checks.hasSymbolOrLong ? 1 : 0);

  const score = (
    !checks.minLength ? 1 : Math.max(1, Math.min(4, rawPoints))
  ) as 1 | 2 | 3 | 4;

  const labels: Record<1 | 2 | 3 | 4, PasswordStrengthReport['label']> = {
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };

  return {
    score,
    label: labels[score],
    checks,
  };
}

/** Validates an email address format for Sign Up and Sign In. */
export function validateAuthEmail(rawEmail: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = rawEmail.trim().toLowerCase();
  if (!normalized) {
    return {
      valid: false,
      normalized: '',
      error: 'Enter your academic or personal email address.',
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Enter a valid email address (e.g. scholar@the-ants.org).',
    };
  }
  return { valid: true, normalized };
}

/** Validates a Sign-In identifier (accepts either an email address or an `@username` handle). */
export function validateSignInIdentifier(raw: string): {
  valid: boolean;
  kind: 'email' | 'username';
  normalized: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      kind: 'email',
      normalized: '',
      error: 'Enter your email address or ANTs @username.',
    };
  }

  if (trimmed.includes('@') && !trimmed.startsWith('@')) {
    const emailResult = validateAuthEmail(trimmed);
    return {
      valid: emailResult.valid,
      kind: 'email',
      normalized: emailResult.normalized,
      error: emailResult.error,
    };
  }

  const normalizedHandle = sanitizeAccountUsernameInput(trimmed);
  if (normalizedHandle.length < 3) {
    return {
      valid: false,
      kind: 'username',
      normalized: normalizedHandle,
      error: 'Enter a valid email or @username (at least 3 characters).',
    };
  }

  return {
    valid: true,
    kind: 'username',
    normalized: normalizedHandle,
  };
}

const TRACK_DEFAULTS: Record<
  AcademicTrackOption,
  {
    headline: string;
    curriculumLabel: string;
    preferredApp: 'flow' | 'study';
    role: UserRole;
    roles: UserRole[];
  }
> = {
  igcse: {
    headline: 'Cambridge & Edexcel IGCSE Candidate · May/June Track',
    curriculumLabel: 'Cambridge IGCSE · 0580, 0625, 0620',
    preferredApp: 'study',
    role: 'student',
    roles: ['student'],
  },
  ial: {
    headline: 'Pearson Edexcel IAL & AS/A-Level Scholar',
    curriculumLabel: 'Pearson Edexcel IAL · WMA11–WMA14 & Sciences',
    preferredApp: 'study',
    role: 'student',
    roles: ['student'],
  },
  tutor: {
    headline: 'Peer & Exam Tutor · IGCSE & IAL Specialist',
    curriculumLabel: 'Pearson Edexcel IAL & Cambridge IGCSE Educator',
    preferredApp: 'flow',
    role: 'tutor',
    roles: ['student', 'tutor'],
  },
  productivity: {
    headline: 'Flow Time-Blocking & Deep Work Practitioner',
    curriculumLabel: 'Flow 24h Timetable & Pomodoro Studio',
    preferredApp: 'flow',
    role: 'student',
    roles: ['student'],
  },
};

/** Builds a complete `SharedUserProfileData` record for a newly registered account. */
export function createProfileFromSignUp(
  payload: {
    name: string;
    username: string;
    email: string;
    academicTrack?: AcademicTrackOption;
  },
  nowIso: string = '2026-11-12T08:00:00.000Z'
): SharedUserProfileData {
  const track = payload.academicTrack ?? 'ial';
  const preset = TRACK_DEFAULTS[track];
  const normalizedUsername = sanitizeAccountUsernameInput(payload.username) || 'scholar';
  const cleanName = payload.name.trim() || normalizedUsername;
  const cleanEmail = payload.email.trim().toLowerCase() || `${normalizedUsername}@the-ants.org`;
  const monthStamp = nowIso.slice(0, 7);

  return {
    id: `usr_${normalizedUsername}`,
    name: cleanName,
    username: normalizedUsername,
    email: cleanEmail,
    headline: preset.headline,
    bio: `Unified .the-ants.org member tracking ${preset.curriculumLabel} across Flow and Study.`,
    institution: 'The ANTs Academic Community',
    curriculumLabel: preset.curriculumLabel,
    timezone: 'Asia/Yangon (UTC+06:30)',
    preferredApp: preset.preferredApp,
    memberSince: /^\d{4}-\d{2}$/.test(monthStamp) ? monthStamp : '2026-11',
    role: preset.role,
    roles: [...preset.roles],
    roleUpgradeStatus: 'none',
    xp: 250,
    streakDays: 1,
    focusHoursThisMonth: 2.5,
    completedSessions: 5,
    hourlyRateLabel: preset.roles.includes('tutor') ? '25,000 MMK / hr' : '—',
    tutorTelegramUsername: preset.roles.includes('tutor') ? `@${normalizedUsername}` : '',
    taughtSubjects: preset.roles.includes('tutor')
      ? ['WMA11 Pure 1', '0580 IGCSE Maths']
      : [],
    tutorSchedule: preset.roles.includes('tutor')
      ? applyTutorSchedulePreset('balanced-mentor')
      : applyTutorSchedulePreset('clear'),
    portfolioItems: [],
    certifications: [],
    telegram: {
      status: 'unlinked',
      handle: '',
      verificationCode: 'ANT-8N4K',
      preferences: {
        blockReminders: true,
        defaultLeadMinutes: 10,
        dailyMorningDigest: true,
        digestTime: '06:30',
        examCountdownAlerts: true,
        tutorInquiryAlerts: preset.roles.includes('tutor'),
      },
    },
    visibility: {
      showStatsStreak: true,
      showPortfolioProjects: true,
      showCertifications: true,
      showTutorSchedule: preset.roles.includes('tutor'),
      showTelegramInquiry: preset.roles.includes('tutor'),
    },
  };
}

/** Creates an authenticated `AntsSsoSessionState` from a profile. */
export function createAuthenticatedSessionForProfile(
  profile: SharedUserProfileData,
  options: {
    authMethod?: AuthMethodId;
    rememberMe?: boolean;
    includeCustomProfile?: boolean;
    nowIso?: string;
  } = {}
): AntsSsoSessionState {
  const isBuiltInPersona = Boolean(MOCK_SHARED_PROFILES[profile.username]);
  const includeCustom = options.includeCustomProfile ?? !isBuiltInPersona;

  return {
    version: 1,
    status: 'authenticated',
    username: profile.username,
    authMethod: options.authMethod ?? 'email',
    rememberMe: options.rememberMe ?? true,
    signedInAtIso: options.nowIso ?? new Date().toISOString(),
    user: profileToMockUser(profile),
    ...(includeCustom
      ? {
          customProfile: {
            id: profile.id,
            name: profile.name,
            username: profile.username,
            email: profile.email,
            headline: profile.headline,
            curriculumLabel: profile.curriculumLabel,
            preferredApp: profile.preferredApp,
            role: profile.role,
            roles: profile.roles,
          },
        }
      : {}),
  };
}

/** Creates a logged-out Guest session state (`status: 'guest'`, `user: null`). */
export function createGuestSession(nowIso?: string): AntsSsoSessionState {
  return {
    version: 1,
    status: 'guest',
    username: null,
    authMethod: 'email',
    rememberMe: true,
    signedInAtIso: nowIso ?? new Date().toISOString(),
    user: null,
  };
}

/** Authenticates a Sign-In submission against known profiles or synthesizes a valid member session. */
export function authenticateSignIn(
  input: {
    identifier: string;
    password?: string;
    rememberMe?: boolean;
    authMethod?: AuthMethodId;
    nowIso?: string;
  },
  accountState?: AccountProfileStorageState
): AuthOperationResult {
  const baseAccountState = accountState ?? createInitialAccountStorageState('zaylynnhtet');
  const identifierCheck = validateSignInIdentifier(input.identifier);
  const password = input.password ?? '';

  const fieldErrors: AuthFieldErrors = {};
  if (!identifierCheck.valid) {
    fieldErrors.email = identifierCheck.error;
  }
  if (input.authMethod !== 'demo' && input.authMethod !== 'google' && input.authMethod !== 'github') {
    if (!password) {
      fieldErrors.password = 'Enter your account password.';
    } else if (password.length < 6) {
      fieldErrors.password = 'Password must be at least 6 characters.';
    }
  }

  if (fieldErrors.email || fieldErrors.password) {
    return {
      ok: false,
      error: fieldErrors.email ?? fieldErrors.password ?? 'Check your sign-in details.',
      fieldErrors,
    };
  }

  const allProfiles = Object.values(baseAccountState.profilesByUsername);
  const matchedProfile =
    allProfiles.find((p) => {
      if (identifierCheck.kind === 'username') {
        return p.username.toLowerCase() === identifierCheck.normalized;
      }
      return p.email.toLowerCase() === identifierCheck.normalized;
    }) ??
    // Also match email local-part against known handles (e.g. zaylynnhtet@the-ants.org)
    allProfiles.find((p) => {
      const localPart = identifierCheck.normalized.split('@')[0] ?? '';
      return p.username.toLowerCase() === sanitizeAccountUsernameInput(localPart);
    });

  if (matchedProfile) {
    const nextAccountState: AccountProfileStorageState = {
      ...baseAccountState,
      activeUsername: matchedProfile.username,
    };
    const session = createAuthenticatedSessionForProfile(matchedProfile, {
      authMethod: input.authMethod ?? 'email',
      rememberMe: input.rememberMe ?? true,
      nowIso: input.nowIso,
    });
    return {
      ok: true,
      session,
      profile: matchedProfile,
      nextAccountState,
    };
  }

  // Synthesize a member profile for any valid external email/username during prototype sign-in
  const rawLocal =
    identifierCheck.kind === 'email'
      ? (identifierCheck.normalized.split('@')[0] ?? 'scholar')
      : identifierCheck.normalized;
  let candidateHandle = sanitizeAccountUsernameInput(rawLocal);
  if (candidateHandle.length < 3) {
    candidateHandle = `${candidateHandle}scholar`.slice(0, 16);
  }
  const displayName = candidateHandle
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const createdProfile = createProfileFromSignUp(
    {
      name: displayName || 'ANTs Scholar',
      username: candidateHandle,
      email:
        identifierCheck.kind === 'email'
          ? identifierCheck.normalized
          : `${candidateHandle}@the-ants.org`,
      academicTrack: 'ial',
    },
    input.nowIso
  );

  const nextAccountState: AccountProfileStorageState = {
    version: 1,
    activeUsername: createdProfile.username,
    profilesByUsername: {
      ...baseAccountState.profilesByUsername,
      [createdProfile.username]: createdProfile,
    },
  };

  const session = createAuthenticatedSessionForProfile(createdProfile, {
    authMethod: input.authMethod ?? 'email',
    rememberMe: input.rememberMe ?? true,
    includeCustomProfile: true,
    nowIso: input.nowIso,
  });

  return {
    ok: true,
    session,
    profile: createdProfile,
    nextAccountState,
  };
}

/** Validates and registers a new unified `.the-ants.org` account via `/signup`. */
export function authenticateSignUp(
  payload: AuthFormSubmitPayload,
  accountState?: AccountProfileStorageState,
  nowIso?: string
): AuthOperationResult {
  const baseAccountState = accountState ?? createInitialAccountStorageState('zaylynnhtet');
  const existingUsernames = Object.keys(baseAccountState.profilesByUsername);
  const existingEmails = new Set(
    Object.values(baseAccountState.profilesByUsername).map((p) => p.email.toLowerCase())
  );

  const fieldErrors: AuthFieldErrors = {};
  const cleanName = (payload.name ?? '').trim();
  if (cleanName.length < 2) {
    fieldErrors.name = 'Enter your full name (at least 2 characters).';
  }

  const usernameResult = validateAccountUsername(payload.username ?? '', existingUsernames);
  if (!usernameResult.valid) {
    fieldErrors.username = usernameResult.error;
  }

  const emailResult = validateAuthEmail(payload.email);
  if (!emailResult.valid) {
    fieldErrors.email = emailResult.error;
  } else if (existingEmails.has(emailResult.normalized)) {
    fieldErrors.email = 'An account with this email already exists. Sign in instead.';
  }

  const strength = evaluatePasswordStrength(payload.password);
  if (!strength.checks.minLength) {
    fieldErrors.password = 'Password must be at least 8 characters.';
  }

  if (
    fieldErrors.name ||
    fieldErrors.username ||
    fieldErrors.email ||
    fieldErrors.password
  ) {
    return {
      ok: false,
      error:
        fieldErrors.username ??
        fieldErrors.email ??
        fieldErrors.password ??
        fieldErrors.name ??
        'Please complete all required account fields.',
      fieldErrors,
    };
  }

  const newProfile = createProfileFromSignUp(
    {
      name: cleanName,
      username: usernameResult.normalized,
      email: emailResult.normalized,
      academicTrack: payload.academicTrack ?? 'ial',
    },
    nowIso
  );

  const nextAccountState: AccountProfileStorageState = {
    version: 1,
    activeUsername: newProfile.username,
    profilesByUsername: {
      ...baseAccountState.profilesByUsername,
      [newProfile.username]: newProfile,
    },
  };

  const session = createAuthenticatedSessionForProfile(newProfile, {
    authMethod: 'email',
    rememberMe: payload.rememberMe,
    includeCustomProfile: true,
    nowIso,
  });

  return {
    ok: true,
    session,
    profile: newProfile,
    nextAccountState,
  };
}

/** Instant 1-click sign-in for one of the built-in multi-role demo personas. */
export function authenticateDemoPersona(
  username: string,
  accountState?: AccountProfileStorageState,
  nowIso?: string
): AuthOperationResult {
  const normalized = normalizeProfileHandle(username);
  const baseAccountState = accountState ?? createInitialAccountStorageState('zaylynnhtet');
  const profile =
    baseAccountState.profilesByUsername[normalized] ??
    MOCK_SHARED_PROFILES[normalized] ??
    ZYY_PROFILE_MOCK;

  const nextAccountState: AccountProfileStorageState = {
    version: 1,
    activeUsername: profile.username,
    profilesByUsername: {
      ...baseAccountState.profilesByUsername,
      [profile.username]: profile,
    },
  };

  return {
    ok: true,
    session: createAuthenticatedSessionForProfile(profile, {
      authMethod: 'demo',
      rememberMe: true,
      nowIso,
    }),
    profile,
    nextAccountState,
  };
}

/** Simulated OAuth provider handshake (`Google` or `GitHub`). */
export function authenticateOAuthProvider(
  provider: 'google' | 'github',
  app: EcosystemAppId = 'study',
  accountState?: AccountProfileStorageState,
  nowIso?: string
): AuthOperationResult {
  // Google maps to Zay Lynn Htet (IAL Tutor/Scholar); GitHub maps to Thaw Ye Zaw (Admin/Lead)
  const targetHandle = provider === 'github' ? 'thawyezaw' : app === 'study' ? 'zaylynnhtet' : 'zaylynnhtet';
  const baseResult = authenticateDemoPersona(targetHandle, accountState, nowIso);
  if (!baseResult.ok || !baseResult.session || !baseResult.profile) {
    return baseResult;
  }

  return {
    ...baseResult,
    session: {
      ...baseResult.session,
      authMethod: provider,
    },
  };
}

/** Sanitizes a parsed JSON session object safely. */
export function sanitizeAuthSession(raw: unknown): AntsSsoSessionState | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const status: AuthSessionStatus =
    raw.status === 'guest'
      ? 'guest'
      : raw.status === 'authenticated'
        ? 'authenticated'
        : 'authenticated';

  const authMethod: AuthMethodId =
    raw.authMethod === 'google' ||
    raw.authMethod === 'github' ||
    raw.authMethod === 'demo' ||
    raw.authMethod === 'email'
      ? raw.authMethod
      : 'email';

  const rememberMe = typeof raw.rememberMe === 'boolean' ? raw.rememberMe : true;
  const signedInAtIso =
    typeof raw.signedInAtIso === 'string' && raw.signedInAtIso
      ? raw.signedInAtIso
      : '2026-11-12T08:00:00.000Z';

  if (status === 'guest') {
    return {
      version: 1,
      status: 'guest',
      username: null,
      authMethod,
      rememberMe,
      signedInAtIso,
      user: null,
    };
  }

  const rawUsername =
    typeof raw.username === 'string' ? sanitizeAccountUsernameInput(raw.username) : '';
  const username = rawUsername === 'zyylinnhtet' ? 'zaylynnhtet' : rawUsername;

  const builtInProfile = username ? MOCK_SHARED_PROFILES[username] : undefined;

  let user: MockUserProfile | null = null;
  if (isRecord(raw.user) && typeof raw.user.username === 'string') {
    const cleanUserHandle = sanitizeAccountUsernameInput(raw.user.username);
    const roles: UserRole[] = Array.isArray(raw.user.roles)
      ? (raw.user.roles.filter(
          (r): r is UserRole =>
            r === 'student' ||
            r === 'tutor' ||
            r === 'teacher' ||
            r === 'contributor' ||
            r === 'main_contributor' ||
            r === 'admin'
        ) as UserRole[])
      : builtInProfile?.roles ?? ['student'];
    const primaryRole: UserRole =
      typeof raw.user.role === 'string' && roles.includes(raw.user.role as UserRole)
        ? (raw.user.role as UserRole)
        : (roles[0] ?? 'student');

    user = {
      id: typeof raw.user.id === 'string' ? raw.user.id : `usr_${cleanUserHandle}`,
      name:
        typeof raw.user.name === 'string' && raw.user.name.trim()
          ? raw.user.name.trim()
          : (builtInProfile?.name ?? cleanUserHandle),
      username: cleanUserHandle || (builtInProfile?.username ?? 'zaylynnhtet'),
      email:
        typeof raw.user.email === 'string' && raw.user.email.trim()
          ? raw.user.email.trim()
          : (builtInProfile?.email ?? `${cleanUserHandle}@the-ants.org`),
      role: primaryRole,
      roles: roles.length > 0 ? roles : ['student'],
      xp: typeof raw.user.xp === 'number' ? raw.user.xp : (builtInProfile?.xp ?? 250),
      streakDays:
        typeof raw.user.streakDays === 'number'
          ? raw.user.streakDays
          : (builtInProfile?.streakDays ?? 1),
      telegramConnected: Boolean(raw.user.telegramConnected),
      curriculumLabel:
        typeof raw.user.curriculumLabel === 'string'
          ? raw.user.curriculumLabel
          : builtInProfile?.curriculumLabel,
    };
  } else if (builtInProfile) {
    user = profileToMockUser(builtInProfile);
  } else {
    user = MOCK_AUTHENTICATED_USER;
  }

  let customProfile: AntsSsoSessionState['customProfile'];
  if (isRecord(raw.customProfile) && typeof raw.customProfile.username === 'string') {
    customProfile = {
      id: typeof raw.customProfile.id === 'string' ? raw.customProfile.id : user.id,
      name: typeof raw.customProfile.name === 'string' ? raw.customProfile.name : user.name,
      username: sanitizeAccountUsernameInput(raw.customProfile.username) || user.username,
      email: typeof raw.customProfile.email === 'string' ? raw.customProfile.email : user.email,
      headline:
        typeof raw.customProfile.headline === 'string'
          ? raw.customProfile.headline
          : 'Pearson Edexcel IAL & IGCSE Scholar',
      curriculumLabel:
        typeof raw.customProfile.curriculumLabel === 'string'
          ? raw.customProfile.curriculumLabel
          : (user.curriculumLabel ?? 'Pearson Edexcel IAL'),
      preferredApp: raw.customProfile.preferredApp === 'flow' ? 'flow' : 'study',
      role: user.role,
      roles: user.roles,
    };
  }

  return {
    version: 1,
    status: 'authenticated',
    username: user.username,
    authMethod,
    rememberMe,
    signedInAtIso,
    user,
    ...(customProfile ? { customProfile } : {}),
  };
}

/** Encodes `AntsSsoSessionState` into a `document.cookie` assignment string. */
export function serializeSsoCookieValue(
  session: AntsSsoSessionState,
  hostname?: string
): string {
  const encoded = encodeURIComponent(JSON.stringify(session));
  const maxAge = session.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  const host =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
  const domainAttr =
    host === 'the-ants.org' || host.endsWith('.the-ants.org')
      ? '; Domain=.the-ants.org'
      : '';
  return `${ANTS_SSO_COOKIE_KEY}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainAttr}`;
}

/** Parses `ants_sso_session` from a raw `document.cookie` or HTTP `Cookie` header string. */
export function parseSsoCookieValue(cookieHeader: string): AntsSsoSessionState | null {
  if (!cookieHeader) return null;
  const segments = cookieHeader.split(';');
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (trimmed.startsWith(`${ANTS_SSO_COOKIE_KEY}=`)) {
      const rawValue = trimmed.slice(ANTS_SSO_COOKIE_KEY.length + 1);
      try {
        const decoded = decodeURIComponent(rawValue);
        return sanitizeAuthSession(JSON.parse(decoded));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Loads the active `.the-ants.org` / `localhost` SSO session.
 * Priority:
 * 1. Shared browser cookie (`ants_sso_session`) — shared across `:3000`, `:3001`, and `:3002`!
 * 2. LocalStorage (`ants-auth-session-v1`)
 * 3. Default authenticated `@zaylynnhtet` session (so prototype routes and unit tests work out-of-the-box).
 */
export function loadAuthSession(
  options: {
    storage?: StorageLike;
    cookieString?: string;
    accountStorageKey?: string;
  } = {}
): AntsSsoSessionState {
  const store = resolveStorage(options.storage);
  const cookieHeader =
    options.cookieString ??
    (typeof document !== 'undefined' ? document.cookie : '');

  const cookieSession = parseSsoCookieValue(cookieHeader);
  let resolvedSession: AntsSsoSessionState | null = cookieSession;

  if (!resolvedSession && store) {
    try {
      const raw = store.getItem(ANTS_AUTH_STORAGE_KEY);
      if (raw) {
        resolvedSession = sanitizeAuthSession(JSON.parse(raw));
      }
    } catch {
      resolvedSession = null;
    }
  }

  const accountKey = options.accountStorageKey ?? ACCOUNT_PROFILE_STORAGE_KEY;
  const accountState = store
    ? loadAccountStorageState(MOCK_SHARED_PROFILES, accountKey, store)
    : null;

  if (!resolvedSession) {
    const activeProfile =
      (accountState && accountState.profilesByUsername[accountState.activeUsername]) ??
      ZYY_PROFILE_MOCK;
    return createAuthenticatedSessionForProfile(activeProfile, {
      authMethod: 'demo',
      rememberMe: true,
      nowIso: '2026-11-12T08:00:00.000Z',
    });
  }

  if (resolvedSession.status === 'guest') {
    return resolvedSession;
  }

  // Synchronize with local `ants-account-profile-v1` store so cross-port custom accounts or Telegram links stay unified
  if (store && resolvedSession.username) {
    const currentAccountState =
      accountState ?? createInitialAccountStorageState(resolvedSession.username);
    const existingLocalProfile =
      currentAccountState.profilesByUsername[resolvedSession.username];

    if (existingLocalProfile) {
      if (currentAccountState.activeUsername !== resolvedSession.username) {
        saveAccountStorageState(
          {
            ...currentAccountState,
            activeUsername: resolvedSession.username,
          },
          accountKey,
          store
        );
      }
      return {
        ...resolvedSession,
        user: profileToMockUser(existingLocalProfile),
      };
    }

    if (resolvedSession.customProfile) {
      const hydratedCustom = createProfileFromSignUp({
        name: resolvedSession.customProfile.name,
        username: resolvedSession.customProfile.username,
        email: resolvedSession.customProfile.email,
        academicTrack: resolvedSession.customProfile.roles.includes('tutor')
          ? 'tutor'
          : resolvedSession.customProfile.preferredApp === 'flow'
            ? 'productivity'
            : 'ial',
      });
      const mergedProfile: SharedUserProfileData = {
        ...hydratedCustom,
        id: resolvedSession.customProfile.id,
        headline: resolvedSession.customProfile.headline,
        curriculumLabel: resolvedSession.customProfile.curriculumLabel,
        preferredApp: resolvedSession.customProfile.preferredApp,
        role: resolvedSession.customProfile.role,
        roles: resolvedSession.customProfile.roles,
      };
      saveAccountStorageState(
        {
          version: 1,
          activeUsername: mergedProfile.username,
          profilesByUsername: {
            ...currentAccountState.profilesByUsername,
            [mergedProfile.username]: mergedProfile,
          },
        },
        accountKey,
        store
      );
      return {
        ...resolvedSession,
        user: profileToMockUser(mergedProfile),
      };
    }
  }

  return resolvedSession;
}

/** Persists the SSO session to both `document.cookie` and `localStorage`, and notifies mounted views. */
export function saveAuthSession(
  session: AntsSsoSessionState,
  options: {
    storage?: StorageLike;
    accountState?: AccountProfileStorageState;
    accountStorageKey?: string;
    skipCookie?: boolean;
  } = {}
): boolean {
  const store = resolveStorage(options.storage);
  const accountKey = options.accountStorageKey ?? ACCOUNT_PROFILE_STORAGE_KEY;

  if (options.accountState && store) {
    saveAccountStorageState(options.accountState, accountKey, store);
  }

  let savedToStore = false;
  if (store) {
    try {
      store.setItem(ANTS_AUTH_STORAGE_KEY, JSON.stringify(session));
      savedToStore = true;
    } catch {
      savedToStore = false;
    }
  }

  if (!options.skipCookie && typeof document !== 'undefined') {
    try {
      document.cookie = serializeSsoCookieValue(session);
    } catch {
      // Ignore cookie write errors in restricted environments
    }
  }

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent(ANTS_AUTH_SESSION_EVENT, { detail: session })
      );
    } catch {
      // Ignore event dispatch errors in non-DOM test runners
    }
  }

  return savedToStore;
}

/** Signs the user out across `.the-ants.org` (`localhost:3001` & `localhost:3002`). */
export function signOutEverywhere(
  options: {
    storage?: StorageLike;
    skipCookie?: boolean;
    nowIso?: string;
  } = {}
): AntsSsoSessionState {
  const guestSession = createGuestSession(options.nowIso);
  saveAuthSession(guestSession, {
    storage: options.storage,
    skipCookie: options.skipCookie,
  });
  return guestSession;
}

/** Sanitizes `?redirect=` query values to prevent open redirects or auth-loop paths. */
export function sanitizeRedirectPath(
  rawRedirect: string | null | undefined,
  fallbackPath: string = '/'
): string {
  if (!rawRedirect || typeof rawRedirect !== 'string') return fallbackPath;
  const trimmed = rawRedirect.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallbackPath;
  }
  const pathWithoutQuery = trimmed.split('?')[0]?.split('#')[0] ?? '';
  if (pathWithoutQuery === '/login' || pathWithoutQuery === '/signup') {
    return fallbackPath;
  }
  return trimmed;
}

/**
 * Codifies the authoritative 6-row "Strict Guest (No-Login) vs. Authenticated Access Matrix"
 * from `spec.md` Section 4.
 */
export function getAccessMatrixPolicy(
  app: EcosystemAppId,
  pathname: string
): AccessMatrixPolicy {
  const cleanPath = (pathname.split('?')[0]?.split('#')[0] || '/').trim();

  if (cleanPath === '/login' || cleanPath === '/signup') {
    return {
      feature: 'auth-route',
      app,
      pathname: cleanPath,
      guestAccess: 'sso-auth',
      requiresLogin: false,
      defaultRedirectPath: app === 'flow' ? '/timetable' : '/',
      guestSummary:
        'Shared SSO sign-in / sign-up views (sets .the-ants.org cookie for both Flow and Study).',
      authenticatedSummary: 'Redirects to workspace.',
    };
  }

  if (cleanPath === '/calculator' || cleanPath.startsWith('/calculator/')) {
    return {
      feature: 'calculator',
      app,
      pathname: cleanPath,
      guestAccess: 'guest-usable',
      requiresLogin: false,
      defaultRedirectPath: '/calculator',
      guestSummary:
        '100% Usable Without Login (@ants/calculator fetches public syllabus/boundary rules).',
      authenticatedSummary: 'Same + optional save to grade_entries inside Study.',
    };
  }

  if (app === 'org') {
    if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
      return {
        feature: 'org-admin',
        app: 'org',
        pathname: cleanPath,
        guestAccess: 'login-gate',
        requiresLogin: true,
        requiredRoles: ['admin', 'main_contributor'],
        defaultRedirectPath: '/admin',
        guestSummary: 'Protected Organization Admin CMS.',
        authenticatedSummary: '/admin CMS accessible to admin / main_contributor roles.',
      };
    }

    if (cleanPath === '/cms' || cleanPath.startsWith('/cms/')) {
      return {
        feature: 'org-cms',
        app: 'org',
        pathname: cleanPath,
        guestAccess: 'login-gate',
        requiresLogin: true,
        requiredRoles: ['contributor', 'main_contributor', 'admin'],
        defaultRedirectPath: '/cms',
        guestSummary: 'Restricted Content Studio (contributors only).',
        authenticatedSummary:
          'Content Studio accessible to contributor, main_contributor, and admin roles.',
      };
    }

    return {
      feature: 'org-showcase',
      app: 'org',
      pathname: cleanPath,
      guestAccess: 'public',
      requiresLogin: false,
      defaultRedirectPath: '/',
      guestSummary: '100% Public Showcase (no user login UI in public navbar).',
      authenticatedSummary: 'Same (+ /admin CMS if admin / main_contributor).',
    };
  }

  if (app === 'flow') {
    if (cleanPath === '/pomodoro' || cleanPath.startsWith('/pomodoro/')) {
      return {
        feature: 'flow-pomodoro',
        app: 'flow',
        pathname: cleanPath,
        guestAccess: 'guest-usable',
        requiresLogin: false,
        defaultRedirectPath: '/pomodoro',
        guestSummary:
          '100% Usable Without Login (persists timer & preferences in localStorage).',
        authenticatedSummary:
          'Syncs settings (pomodoro_user_settings), logs pomodoro_sessions to D1, awards XP.',
      };
    }

    if (cleanPath === '/settings' || cleanPath.startsWith('/settings/')) {
      return {
        feature: 'flow-settings',
        app: 'flow',
        pathname: cleanPath,
        guestAccess: 'login-gate',
        requiresLogin: true,
        defaultRedirectPath: '/settings',
        guestSummary: 'Login gate for Account, Tutor Schedule & Telegram Bot settings.',
        authenticatedSummary: 'Full read/write persisted in D1 + Telegram cron reminders.',
      };
    }

    if (cleanPath.startsWith('/@') || cleanPath.startsWith('/%40')) {
      return {
        feature: 'flow-profile',
        app: 'flow',
        pathname: cleanPath,
        guestAccess: 'public',
        requiresLogin: false,
        defaultRedirectPath: cleanPath,
        guestSummary: 'Public member portfolio & weekly tutoring availability showcase.',
        authenticatedSummary: 'Same + quick link to edit own profile in /settings.',
      };
    }

    return {
      feature: 'flow-workspace',
      app: 'flow',
      pathname: cleanPath,
      guestAccess: 'prototype-preview',
      requiresLogin: false,
      defaultRedirectPath: cleanPath === '/' ? '/timetable' : cleanPath,
      guestSummary: 'Prototype preview or login gate.',
      authenticatedSummary: 'Full read/write persisted in D1 + Telegram cron reminders.',
    };
  }

  // Study app (`study.the-ants.org`)
  if (cleanPath === '/settings' || cleanPath.startsWith('/settings/')) {
    return {
      feature: 'study-settings',
      app: 'study',
      pathname: cleanPath,
      guestAccess: 'login-gate',
      requiresLogin: true,
      defaultRedirectPath: '/settings',
      guestSummary: 'Login gate.',
      authenticatedSummary: 'Full read/write persisted in D1.',
    };
  }

  return {
    feature: 'study-workspace',
    app: 'study',
    pathname: cleanPath,
    guestAccess: 'login-gate',
    requiresLogin: true,
    defaultRedirectPath: cleanPath,
    guestSummary: 'Login gate.',
    authenticatedSummary: 'Full read/write persisted in D1.',
  };
}

