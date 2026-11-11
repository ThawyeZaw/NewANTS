/**
 * Shared `@ants/ui` Account Settings, Public Portfolio & Tutor Slot-Painter Helpers (`[ZYY-3.4]`).
 *
 * Pure TypeScript state transformers & defensive `localStorage` sanitization so
 * Zyy's shared views in `@ants/ui` and Thaw's `[THAW-3.4]` containers share
 * deterministic availability painting and Telegram verification semantics.
 */
import type { UserRole } from '../mocks/ecosystem-chrome.mock';

export const ACCOUNT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type WeekdayKey = (typeof ACCOUNT_WEEKDAYS)[number];

export const TUTOR_SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] as const;

export type AvailabilityStatus = 'available' | 'flexible' | 'unavailable';
export type TutorSchedulePresetId =
  | 'balanced-mentor'
  | 'weekday-evenings'
  | 'weekend-intensive'
  | 'clear';

export type TutorScheduleMap = Record<WeekdayKey, Record<number, AvailabilityStatus>>;

export type TelegramConnectionStatus = 'unlinked' | 'pending' | 'connected';
export type TelegramLeadMinutes = 5 | 10 | 15 | 30;

export interface TelegramNotificationPreferences {
  blockReminders: boolean;
  defaultLeadMinutes: TelegramLeadMinutes;
  dailyMorningDigest: boolean;
  digestTime: string;
  examCountdownAlerts: boolean;
  tutorInquiryAlerts: boolean;
}

export interface TelegramAccountState {
  status: TelegramConnectionStatus;
  handle: string;
  verificationCode: string;
  codeExpiresAt?: string;
  linkedAt?: string;
  preferences: TelegramNotificationPreferences;
}

export interface PortfolioHighlightItem {
  id: string;
  title: string;
  category: 'Study Notes' | 'Build & Tooling' | 'Research & Essays' | 'Exam Prep';
  summary: string;
  tags: string[];
  linkLabel?: string;
  href?: string;
  updatedLabel: string;
}

export interface CertificationItem {
  id: string;
  title: string;
  issuer: string;
  year: string;
  credentialCode?: string;
  verified: boolean;
}

export interface ProfileSectionVisibility {
  showStatsStreak: boolean;
  showPortfolioProjects: boolean;
  showCertifications: boolean;
  showTutorSchedule: boolean;
  showTelegramInquiry: boolean;
}

export interface SharedUserProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  headline: string;
  bio: string;
  institution: string;
  curriculumLabel: string;
  timezone: string;
  preferredApp: 'flow' | 'study';
  memberSince: string;
  role: UserRole;
  roles: UserRole[];
  roleUpgradeStatus: 'none' | 'pending_tutor' | 'pending_contributor';
  xp: number;
  streakDays: number;
  focusHoursThisMonth: number;
  completedSessions: number;
  hourlyRateLabel: string;
  tutorTelegramUsername: string;
  taughtSubjects: string[];
  tutorSchedule: TutorScheduleMap;
  portfolioItems: PortfolioHighlightItem[];
  certifications: CertificationItem[];
  telegram: TelegramAccountState;
  visibility: ProfileSectionVisibility;
}

export interface AccountProfileStorageState {
  version: 1;
  activeUsername: string;
  profilesByUsername: Record<string, SharedUserProfileData>;
}

export const ACCOUNT_PROFILE_STORAGE_KEY = 'ants-account-profile-v1';

const RESERVED_ANT_USERNAMES = new Set([
  'admin',
  'api',
  'countdown',
  'curriculum',
  'login',
  'notes',
  'past-papers',
  'pomodoro',
  'profile',
  'quizzes',
  'settings',
  'signup',
  'studio',
  'tasks',
  'team',
  'timetable',
  'unknown',
]);

/** Strips URL-encoded `%40`, leading `@`, whitespace, and normalizes lowercase usernames. */
export function normalizeProfileHandle(raw: string): string {
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  return decoded.trim().replace(/^@+/, '').toLowerCase();
}

/** Sanitizes an interactive ANTs account username draft (url-safe `[a-z0-9_-]`, lowercase, <= 32 chars). */
export function sanitizeAccountUsernameInput(raw: string): string {
  return normalizeProfileHandle(raw)
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

/** Validates an editable ANTs account `@username` independently of any linked Telegram handle. */
export function validateAccountUsername(
  raw: string,
  existingUsernames: readonly string[] = [],
  currentUsername?: string
): { valid: boolean; normalized: string; error?: string } {
  const normalized = sanitizeAccountUsernameInput(raw);
  if (!normalized) {
    return { valid: false, normalized, error: 'Enter an ANTs username (3–32 characters).' };
  }
  if (normalized.length < 3) {
    return { valid: false, normalized, error: 'ANTs username must be at least 3 characters.' };
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Start with a letter or number (only a–z, 0–9, _ or - allowed).',
    };
  }
  if (RESERVED_ANT_USERNAMES.has(normalized)) {
    return { valid: false, normalized, error: 'That handle matches a reserved app route.' };
  }
  const normalizedCurrent = currentUsername ? sanitizeAccountUsernameInput(currentUsername) : '';
  const conflict = existingUsernames.some((other) => {
    const cleanOther = sanitizeAccountUsernameInput(other);
    return cleanOther && cleanOther !== normalizedCurrent && cleanOther === normalized;
  });
  if (conflict) {
    return { valid: false, normalized, error: 'That ANTs username is already claimed.' };
  }
  return { valid: true, normalized };
}

/** Allocates a clean 7x14 weekly availability matrix initialized to `'unavailable'`. */
export function createEmptyTutorSchedule(): TutorScheduleMap {
  const map = {} as TutorScheduleMap;
  for (const day of ACCOUNT_WEEKDAYS) {
    const hours: Record<number, AvailabilityStatus> = {};
    for (const h of TUTOR_SLOT_HOURS) {
      hours[h] = 'unavailable';
    }
    map[day] = hours;
  }
  return map;
}

export function cloneTutorSchedule(source: TutorScheduleMap): TutorScheduleMap {
  const next = createEmptyTutorSchedule();
  for (const day of ACCOUNT_WEEKDAYS) {
    for (const h of TUTOR_SLOT_HOURS) {
      next[day][h] = source[day]?.[h] ?? 'unavailable';
    }
  }
  return next;
}

export function cycleAvailabilityStatus(current: AvailabilityStatus): AvailabilityStatus {
  if (current === 'unavailable') return 'available';
  if (current === 'available') return 'flexible';
  return 'unavailable';
}

export function setTutorSlotStatus(
  schedule: TutorScheduleMap,
  day: WeekdayKey,
  hour: number,
  status: AvailabilityStatus
): TutorScheduleMap {
  const next = cloneTutorSchedule(schedule);
  if (next[day] && hour in next[day]) {
    next[day][hour] = status;
  }
  return next;
}

/**
 * Interactive Slot-Painter Range Stroke:
 * When the tutor presses down on `(anchorDayIdx, anchorHourIdx)` and drags to
 * `(targetDayIdx, targetHourIdx)`, every cell inside the bounding rectangle is
 * stamped with the active brush status (`available` / `flexible` / `unavailable`).
 * Painting from an immutable baseline (`strokeSnapshot`) prevents erratic flicker
 * if the pointer reverses direction mid-drag.
 */
export function paintTutorSlotRect(
  baselineSchedule: TutorScheduleMap,
  from: { dayIdx: number; hourIdx: number },
  to: { dayIdx: number; hourIdx: number },
  brush: AvailabilityStatus
): TutorScheduleMap {
  const next = cloneTutorSchedule(baselineSchedule);
  const minDay = Math.max(0, Math.min(from.dayIdx, to.dayIdx));
  const maxDay = Math.min(ACCOUNT_WEEKDAYS.length - 1, Math.max(from.dayIdx, to.dayIdx));
  const minHourIdx = Math.max(0, Math.min(from.hourIdx, to.hourIdx));
  const maxHourIdx = Math.min(TUTOR_SLOT_HOURS.length - 1, Math.max(from.hourIdx, to.hourIdx));

  for (let d = minDay; d <= maxDay; d += 1) {
    const dayKey = ACCOUNT_WEEKDAYS[d];
    if (!dayKey) continue;
    for (let h = minHourIdx; h <= maxHourIdx; h += 1) {
      const hourVal = TUTOR_SLOT_HOURS[h];
      if (hourVal !== undefined) {
        next[dayKey][hourVal] = brush;
      }
    }
  }

  return next;
}

export function applyTutorSchedulePreset(preset: TutorSchedulePresetId): TutorScheduleMap {
  const schedule = createEmptyTutorSchedule();
  if (preset === 'clear') return schedule;

  if (preset === 'weekday-evenings') {
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const) {
      schedule[day][18] = 'available';
      schedule[day][19] = 'available';
      schedule[day][20] = 'available';
      schedule[day][21] = 'flexible';
    }
    return schedule;
  }

  if (preset === 'weekend-intensive') {
    for (const day of ['Sat', 'Sun'] as const) {
      for (const h of [9, 10, 11, 14, 15, 16] as const) {
        schedule[day][h] = 'available';
      }
      for (const h of [12, 13, 17, 19] as const) {
        schedule[day][h] = 'flexible';
      }
    }
    return schedule;
  }

  // 'balanced-mentor' default: selected weekday evening blocks + Saturday/Sunday morning windows
  for (const day of ['Mon', 'Wed', 'Fri'] as const) {
    schedule[day][19] = 'available';
    schedule[day][20] = 'available';
    schedule[day][21] = 'flexible';
  }
  for (const day of ['Tue', 'Thu'] as const) {
    schedule[day][20] = 'flexible';
  }
  for (const h of [9, 10, 11] as const) {
    schedule.Sat[h] = 'available';
  }
  schedule.Sat[14] = 'flexible';
  schedule.Sun[10] = 'available';
  schedule.Sun[11] = 'available';
  schedule.Sun[15] = 'flexible';
  return schedule;
}

export function summarizeTutorSchedule(schedule: TutorScheduleMap): {
  availableHours: number;
  flexibleHours: number;
  activeDays: number;
} {
  let availableHours = 0;
  let flexibleHours = 0;
  let activeDays = 0;

  for (const day of ACCOUNT_WEEKDAYS) {
    let dayHasOpen = false;
    for (const h of TUTOR_SLOT_HOURS) {
      const status = schedule[day]?.[h];
      if (status === 'available') {
        availableHours += 1;
        dayHasOpen = true;
      } else if (status === 'flexible') {
        flexibleHours += 1;
        dayHasOpen = true;
      }
    }
    if (dayHasOpen) activeDays += 1;
  }

  return { availableHours, flexibleHours, activeDays };
}

export function formatSlotHourLabel(hour: number, mode: '12h' | '24h' = '24h'): string {
  if (mode === '24h') {
    return `${String(hour).padStart(2, '0')}:00`;
  }
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${suffix}`;
}

export function formatSlotRangeLabel(
  day: WeekdayKey,
  hour: number,
  mode: '12h' | '24h' = '24h'
): string {
  const start = formatSlotHourLabel(hour, mode);
  const end = formatSlotHourLabel(hour + 1, mode);
  return `${day} · ${start}–${end}`;
}

/**
 * Generates a short one-time verification code (`ANT-XXXX`) excluding ambiguous
 * characters (`0/O`, `1/I/L`) for `/start <CODE>` Telegram account linking.
 */
export function generateTelegramVerificationCode(seed?: number): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let suffix = '';
  let state = seed !== undefined ? Math.abs(Math.floor(seed)) : undefined;

  for (let i = 0; i < 4; i += 1) {
    let idx: number;
    if (state !== undefined) {
      state = (state * 1103515245 + 12345) % 2147483647;
      idx = state % alphabet.length;
    } else if (typeof globalThis.crypto?.getRandomValues === 'function') {
      const buf = new Uint32Array(1);
      globalThis.crypto.getRandomValues(buf);
      idx = (buf[0] ?? 0) % alphabet.length;
    } else {
      idx = Math.floor(Math.random() * alphabet.length);
    }
    suffix += alphabet[idx] ?? 'A';
  }
  return `ANT-${suffix}`;
}

export function buildTelegramBotDeepLink(code: string): string {
  return `https://t.me/TheANTsFlowBot?start=${encodeURIComponent(code.trim())}`;
}

export function normalizeTelegramHandle(rawHandle: string, fallback = '@ants_tg_member'): string {
  const clean = rawHandle.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
  return clean ? `@${clean}` : fallback;
}

/**
 * Telegram Linking Flow (Phase 1 -> Pending):
 * Issues a time-limited `/start <code>` nonce bound to the authenticated Better Auth user
 * so `@TheANTsFlowBot` webhook verification (`[THAW-1.6]`) captures the user's real Telegram
 * `@username` & `chat_id` independently of their ANTs account username.
 */
export function startTelegramLinking(
  current: TelegramAccountState,
  draftHandle?: string,
  nowMs: number = Date.now()
): TelegramAccountState {
  const code = generateTelegramVerificationCode();
  return {
    ...current,
    status: 'pending',
    handle: draftHandle?.trim() ? normalizeTelegramHandle(draftHandle) : current.handle,
    verificationCode: code,
    codeExpiresAt: new Date(nowMs + 15 * 60 * 1000).toISOString(),
  };
}

/**
 * Telegram Linking Flow (Phase 2 -> Connected):
 * Simulates `@TheANTsFlowBot` webhook confirmation returning the sender's Telegram `@username`
 * after executing `/start <CODE>` inside Telegram.
 */
export function completeTelegramVerification(
  current: TelegramAccountState,
  handleInput?: string,
  nowIso: string = new Date().toISOString()
): TelegramAccountState {
  const finalHandle = normalizeTelegramHandle(handleInput || current.handle, '@ants_tg_member');
  return {
    ...current,
    status: 'connected',
    handle: finalHandle,
    linkedAt: nowIso,
  };
}

export function unlinkTelegramAccount(current: TelegramAccountState): TelegramAccountState {
  return {
    ...current,
    status: 'unlinked',
    handle: '',
    verificationCode: generateTelegramVerificationCode(),
    codeExpiresAt: undefined,
    linkedAt: undefined,
  };
}

export function buildTelegramInquiryUrl(
  tutorHandle: string,
  tutorName: string,
  selectedSlot?: string
): string {
  const cleanHandle = normalizeTelegramHandle(tutorHandle, '@TheANTsFlowBot').replace(/^@/, '');
  const message = selectedSlot
    ? `Hi ${tutorName}, I saw your ${selectedSlot} tutoring slot on The ANTs and would love to inquire!`
    : `Hi ${tutorName}, I viewed your profile on The ANTs and would like to inquire about tutoring.`;
  return `https://t.me/${cleanHandle}?text=${encodeURIComponent(message)}`;
}

export function hasTutorRole(roles: readonly UserRole[]): boolean {
  return roles.includes('tutor') || roles.includes('teacher') || roles.includes('admin');
}

export function computeProfileCompleteness(profile: SharedUserProfileData): {
  percent: number;
  completedCount: number;
  totalCount: number;
  missingItems: string[];
} {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Bio & headline', ok: profile.bio.trim().length >= 16 && profile.headline.trim().length > 0 },
    { label: 'Telegram Bot link', ok: profile.telegram.status === 'connected' },
    { label: 'Portfolio highlight', ok: profile.portfolioItems.length > 0 },
    { label: 'Certification', ok: profile.certifications.length > 0 },
  ];

  if (hasTutorRole(profile.roles)) {
    const slotSummary = summarizeTutorSchedule(profile.tutorSchedule);
    checks.push({
      label: 'Tutor hours',
      ok: slotSummary.availableHours + slotSummary.flexibleHours > 0,
    });
  }

  const completedCount = checks.filter((c) => c.ok).length;
  const totalCount = checks.length;
  const percent = totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100);
  const missingItems = checks.filter((c) => !c.ok).map((c) => c.label);

  return { percent, completedCount, totalCount, missingItems };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeSchedule(raw: unknown, fallback: TutorScheduleMap): TutorScheduleMap {
  if (!isRecord(raw)) return cloneTutorSchedule(fallback);
  const next = createEmptyTutorSchedule();
  for (const day of ACCOUNT_WEEKDAYS) {
    const dayObj = raw[day];
    if (!isRecord(dayObj)) continue;
    for (const h of TUTOR_SLOT_HOURS) {
      const cell = dayObj[String(h)];
      if (cell === 'available' || cell === 'flexible' || cell === 'unavailable') {
        next[day][h] = cell;
      }
    }
  }
  return next;
}

/**
 * Relocates or updates an account profile inside `profilesByUsername` when the user edits
 * their ANTs account `@username`, preserving key order while keeping `telegram.handle` intact.
 */
export function renameAccountStorageProfile(
  state: AccountProfileStorageState,
  previousUsername: string,
  nextProfile: SharedUserProfileData
): AccountProfileStorageState {
  const prevKey = sanitizeAccountUsernameInput(previousUsername) || previousUsername;
  const nextKey = sanitizeAccountUsernameInput(nextProfile.username) || prevKey;
  const normalizedNextProfile: SharedUserProfileData = {
    ...nextProfile,
    username: nextKey,
  };

  if (prevKey === nextKey || !state.profilesByUsername[prevKey]) {
    return {
      ...state,
      activeUsername:
        state.activeUsername === previousUsername || state.activeUsername === prevKey
          ? nextKey
          : state.activeUsername,
      profilesByUsername: {
        ...state.profilesByUsername,
        [nextKey]: normalizedNextProfile,
      },
    };
  }

  const nextMap: Record<string, SharedUserProfileData> = {};
  let inserted = false;
  for (const [k, existing] of Object.entries(state.profilesByUsername)) {
    if (k === prevKey) {
      nextMap[nextKey] = normalizedNextProfile;
      inserted = true;
    } else if (k !== nextKey) {
      nextMap[k] = existing;
    }
  }
  if (!inserted) {
    nextMap[nextKey] = normalizedNextProfile;
  }

  return {
    ...state,
    activeUsername:
      state.activeUsername === previousUsername || state.activeUsername === prevKey
        ? nextKey
        : state.activeUsername,
    profilesByUsername: nextMap,
  };
}

function sanitizeStoredProfile(
  candidate: Record<string, unknown>,
  fallbackProfile: SharedUserProfileData,
  fallbackKey: string
): SharedUserProfileData {
  const rawTg = isRecord(candidate.telegram) ? candidate.telegram : {};
  const rawPrefs = isRecord(rawTg.preferences) ? rawTg.preferences : {};
  const rawVis = isRecord(candidate.visibility) ? candidate.visibility : {};

  const sanitizedUsername =
    typeof candidate.username === 'string' && sanitizeAccountUsernameInput(candidate.username).length >= 3
      ? sanitizeAccountUsernameInput(candidate.username)
      : sanitizeAccountUsernameInput(fallbackKey) || fallbackProfile.username;

  const tgStatus: TelegramConnectionStatus =
    rawTg.status === 'connected' || rawTg.status === 'pending' || rawTg.status === 'unlinked'
      ? rawTg.status
      : fallbackProfile.telegram.status;

  const sanitizedTgHandle =
    tgStatus === 'unlinked'
      ? ''
      : typeof rawTg.handle === 'string' && rawTg.handle.trim()
        ? normalizeTelegramHandle(rawTg.handle, '')
        : fallbackProfile.telegram.handle;

  const tutorHandleRaw = candidate.tutorTelegramUsername;
  const sanitizedTutorTelegram =
    typeof tutorHandleRaw === 'string'
      ? tutorHandleRaw.trim()
        ? normalizeTelegramHandle(tutorHandleRaw, '')
        : ''
      : fallbackProfile.tutorTelegramUsername;

  return {
    ...fallbackProfile,
    id:
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id.trim().slice(0, 64)
        : fallbackProfile.id,
    username: sanitizedUsername,
    name:
      typeof candidate.name === 'string' && candidate.name.trim()
        ? candidate.name.trim().slice(0, 80)
        : fallbackProfile.name,
    headline:
      typeof candidate.headline === 'string'
        ? candidate.headline.slice(0, 120)
        : fallbackProfile.headline,
    bio:
      typeof candidate.bio === 'string'
        ? candidate.bio.slice(0, 480)
        : fallbackProfile.bio,
    institution:
      typeof candidate.institution === 'string'
        ? candidate.institution.slice(0, 100)
        : fallbackProfile.institution,
    curriculumLabel:
      typeof candidate.curriculumLabel === 'string'
        ? candidate.curriculumLabel.slice(0, 100)
        : fallbackProfile.curriculumLabel,
    timezone:
      typeof candidate.timezone === 'string'
        ? candidate.timezone.slice(0, 60)
        : fallbackProfile.timezone,
    preferredApp: candidate.preferredApp === 'study' ? 'study' : 'flow',
    hourlyRateLabel:
      typeof candidate.hourlyRateLabel === 'string'
        ? candidate.hourlyRateLabel.slice(0, 40)
        : fallbackProfile.hourlyRateLabel,
    tutorTelegramUsername: sanitizedTutorTelegram,
    roleUpgradeStatus:
      candidate.roleUpgradeStatus === 'pending_tutor' ||
      candidate.roleUpgradeStatus === 'pending_contributor'
        ? candidate.roleUpgradeStatus
        : 'none',
    taughtSubjects: Array.isArray(candidate.taughtSubjects)
      ? candidate.taughtSubjects.filter((s): s is string => typeof s === 'string').slice(0, 12)
      : fallbackProfile.taughtSubjects,
    tutorSchedule: sanitizeSchedule(candidate.tutorSchedule, fallbackProfile.tutorSchedule),
    portfolioItems: Array.isArray(candidate.portfolioItems)
      ? (candidate.portfolioItems as PortfolioHighlightItem[]).slice(0, 12)
      : fallbackProfile.portfolioItems,
    certifications: Array.isArray(candidate.certifications)
      ? (candidate.certifications as CertificationItem[]).slice(0, 12)
      : fallbackProfile.certifications,
    telegram: {
      status: tgStatus,
      handle: sanitizedTgHandle,
      verificationCode:
        typeof rawTg.verificationCode === 'string'
          ? rawTg.verificationCode.slice(0, 16)
          : fallbackProfile.telegram.verificationCode,
      codeExpiresAt:
        tgStatus === 'pending' && typeof rawTg.codeExpiresAt === 'string'
          ? rawTg.codeExpiresAt
          : undefined,
      linkedAt:
        tgStatus === 'connected' && typeof rawTg.linkedAt === 'string'
          ? rawTg.linkedAt
          : undefined,
      preferences: {
        blockReminders:
          typeof rawPrefs.blockReminders === 'boolean'
            ? rawPrefs.blockReminders
            : fallbackProfile.telegram.preferences.blockReminders,
        defaultLeadMinutes:
          rawPrefs.defaultLeadMinutes === 5 ||
          rawPrefs.defaultLeadMinutes === 10 ||
          rawPrefs.defaultLeadMinutes === 15 ||
          rawPrefs.defaultLeadMinutes === 30
            ? rawPrefs.defaultLeadMinutes
            : fallbackProfile.telegram.preferences.defaultLeadMinutes,
        dailyMorningDigest:
          typeof rawPrefs.dailyMorningDigest === 'boolean'
            ? rawPrefs.dailyMorningDigest
            : fallbackProfile.telegram.preferences.dailyMorningDigest,
        digestTime:
          typeof rawPrefs.digestTime === 'string'
            ? rawPrefs.digestTime.slice(0, 8)
            : fallbackProfile.telegram.preferences.digestTime,
        examCountdownAlerts:
          typeof rawPrefs.examCountdownAlerts === 'boolean'
            ? rawPrefs.examCountdownAlerts
            : fallbackProfile.telegram.preferences.examCountdownAlerts,
        tutorInquiryAlerts:
          typeof rawPrefs.tutorInquiryAlerts === 'boolean'
            ? rawPrefs.tutorInquiryAlerts
            : fallbackProfile.telegram.preferences.tutorInquiryAlerts,
      },
    },
    visibility: {
      showStatsStreak:
        typeof rawVis.showStatsStreak === 'boolean'
          ? rawVis.showStatsStreak
          : fallbackProfile.visibility.showStatsStreak,
      showPortfolioProjects:
        typeof rawVis.showPortfolioProjects === 'boolean'
          ? rawVis.showPortfolioProjects
          : fallbackProfile.visibility.showPortfolioProjects,
      showCertifications:
        typeof rawVis.showCertifications === 'boolean'
          ? rawVis.showCertifications
          : fallbackProfile.visibility.showCertifications,
      showTutorSchedule:
        typeof rawVis.showTutorSchedule === 'boolean'
          ? rawVis.showTutorSchedule
          : fallbackProfile.visibility.showTutorSchedule,
      showTelegramInquiry:
        typeof rawVis.showTelegramInquiry === 'boolean'
          ? rawVis.showTelegramInquiry
          : fallbackProfile.visibility.showTelegramInquiry,
    },
  };
}

export function sanitizeAccountStorageState(
  raw: unknown,
  defaults: Record<string, SharedUserProfileData>
): AccountProfileStorageState | null {
  if (!isRecord(raw) || !isRecord(raw.profilesByUsername)) return null;
  const profilesByUsername: Record<string, SharedUserProfileData> = {};
  const defaultsList = Object.values(defaults);
  const baseFallback = defaultsList[0];
  const defaultsById = new Map(defaultsList.map((p) => [p.id, p]));
  const seenIds = new Set<string>();

  for (const [key, candidate] of Object.entries(raw.profilesByUsername)) {
    if (!isRecord(candidate)) continue;
    const candidateId = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const matchedDefault =
      (candidateId ? defaultsById.get(candidateId) : undefined) ??
      defaults[key] ??
      baseFallback;
    if (!matchedDefault) continue;

    const sanitized = sanitizeStoredProfile(candidate, matchedDefault, key);
    if (!profilesByUsername[sanitized.username]) {
      profilesByUsername[sanitized.username] = sanitized;
      seenIds.add(sanitized.id);
    }
  }

  for (const [key, fallbackProfile] of Object.entries(defaults)) {
    if (!seenIds.has(fallbackProfile.id) && !profilesByUsername[key]) {
      profilesByUsername[fallbackProfile.username] = fallbackProfile;
    }
  }

  const normalizedActive =
    typeof raw.activeUsername === 'string' ? sanitizeAccountUsernameInput(raw.activeUsername) : '';
  const activeUsername =
    normalizedActive && profilesByUsername[normalizedActive]
      ? normalizedActive
      : typeof raw.activeUsername === 'string' && profilesByUsername[raw.activeUsername]
        ? raw.activeUsername
        : Object.keys(profilesByUsername)[0] ?? 'zyylinnhtet';

  return {
    version: 1,
    activeUsername,
    profilesByUsername,
  };
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadAccountStorageState(
  defaults: Record<string, SharedUserProfileData>,
  key: string = ACCOUNT_PROFILE_STORAGE_KEY,
  storage?: StorageLike
): AccountProfileStorageState | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return sanitizeAccountStorageState(JSON.parse(raw), defaults);
  } catch {
    return null;
  }
}

export function saveAccountStorageState(
  state: AccountProfileStorageState,
  key: string = ACCOUNT_PROFILE_STORAGE_KEY,
  storage?: StorageLike
): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

