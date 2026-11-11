import { describe, expect, it } from 'vitest';
import {
  STUDENT_PROFILE_MOCK,
  ZYY_PROFILE_MOCK,
  completeTelegramVerification,
  startTelegramLinking,
} from '@ants/ui';
import { FlowProfilePageView } from '../components/account/views/FlowProfilePageView';
import { FlowSettingsPageView } from '../components/account/views/FlowSettingsPageView';
import {
  syncTelegramToTimetableStorage,
  toUserMenuProfile,
} from '../components/account/views/accountSync';
import { loadTimetableState } from '../lib/timetable/storage';

describe('@ants/flow [ZYY-3.4] Shared Profile & Settings Mounting + Telegram Sync', () => {
  it('exports Flow settings & public handle page views cleanly', () => {
    expect(FlowSettingsPageView).toBeDefined();
    expect(FlowProfilePageView).toBeDefined();

    const menuProfile = toUserMenuProfile(ZYY_PROFILE_MOCK);
    expect(menuProfile.username).toBe('zyylinnhtet');
    expect(menuProfile.telegramConnected).toBe(false);
    expect(menuProfile.roles).toContain('tutor');

    const linkedProfile = toUserMenuProfile({
      ...ZYY_PROFILE_MOCK,
      telegram: completeTelegramVerification(startTelegramLinking(ZYY_PROFILE_MOCK.telegram), '@zyy_tg'),
    });
    expect(linkedProfile.telegramConnected).toBe(true);
  });

  it('syncs Telegram link updates directly into Flow timetable storage', () => {
    const memory = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
    };

    // Unlinked student state propagates telegramConnected=false and empty handle to timetable store
    expect(syncTelegramToTimetableStorage(STUDENT_PROFILE_MOCK, 'tt-sync-test', fakeStorage)).toBe(
      true
    );
    const beforeLink = loadTimetableState('tt-sync-test', fakeStorage);
    expect(beforeLink?.telegramConnected).toBe(false);
    expect(beforeLink?.telegramHandle).toBe('');

    // Completing /start bot verification updates timetable store to connected + webhook handle
    const pending = startTelegramLinking(STUDENT_PROFILE_MOCK.telegram);
    const verified = completeTelegramVerification(pending, '@minkhant_synced');
    syncTelegramToTimetableStorage(
      { ...STUDENT_PROFILE_MOCK, telegram: verified },
      'tt-sync-test',
      fakeStorage
    );

    const afterLink = loadTimetableState('tt-sync-test', fakeStorage);
    expect(afterLink?.telegramConnected).toBe(true);
    expect(afterLink?.telegramHandle).toBe('@minkhant_synced');
  });
});

