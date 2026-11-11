import type { MockUserProfile, SharedUserProfileData } from '@ants/ui';
import {
  TIMETABLE_STORAGE_KEY,
  loadTimetableState,
  saveTimetableState,
} from '../../../lib/timetable/storage';
import {
  DEFAULT_TIMETABLE_REFERENCE_DATE,
  createPresetTimetableState,
} from '../../../mocks/timetable.mock';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function toUserMenuProfile(profile: SharedUserProfileData): MockUserProfile {
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

/**
 * Propagates `/settings` Telegram verification/unlink changes directly into
 * Flow's `ants-flow-timetable-v1` store so `/timetable` & `/tasks` reflect
 * the live verified `@TheANTsFlowBot` channel without page reloads.
 */
export function syncTelegramToTimetableStorage(
  profile: SharedUserProfileData,
  timetableStorageKey: string = TIMETABLE_STORAGE_KEY,
  storage?: StorageLike
): boolean {
  const existing =
    loadTimetableState(timetableStorageKey, storage) ??
    createPresetTimetableState('workday-coaching', DEFAULT_TIMETABLE_REFERENCE_DATE);

  return saveTimetableState(
    {
      ...existing,
      telegramConnected: profile.telegram.status === 'connected',
      telegramHandle:
        profile.telegram.status === 'connected' ? profile.telegram.handle : '',
    },
    timetableStorageKey,
    storage
  );
}

