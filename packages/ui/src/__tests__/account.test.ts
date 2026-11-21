import { describe, expect, it } from 'vitest';
import {
  AccountSettingsView,
  MOCK_SHARED_PROFILES,
  STUDENT_PROFILE_MOCK,
  THAW_PROFILE_MOCK,
  TelegramConnectCardView,
  TutorSlotPainterView,
  UserProfileView,
  ZYY_PROFILE_MOCK,
  applyTutorSchedulePreset,
  buildTelegramBotDeepLink,
  buildTelegramInquiryUrl,
  completeTelegramVerification,
  computeProfileCompleteness,
  createEmptyTutorSchedule,
  createInitialAccountStorageState,
  formatSlotHourLabel,
  formatSlotRangeLabel,
  generateTelegramVerificationCode,
  loadAccountStorageState,
  normalizeProfileHandle,
  paintTutorSlotRect,
  renameAccountStorageProfile,
  sanitizeAccountStorageState,
  sanitizeAccountUsernameInput,
  saveAccountStorageState,
  startTelegramLinking,
  summarizeTutorSchedule,
  unlinkTelegramAccount,
  validateAccountUsername,
} from '../index';

describe('@ants/ui [ZYY-3.4] Account Settings, Portfolio, Slot Painter & Telegram Linking', () => {
  it('exports all presentational views and multi-role persona mocks', () => {
    expect(AccountSettingsView).toBeDefined();
    expect(UserProfileView).toBeDefined();
    expect(TutorSlotPainterView).toBeDefined();
    expect(TelegramConnectCardView).toBeDefined();

    expect(Object.keys(MOCK_SHARED_PROFILES)).toEqual([
      'zaylynnhtet',
      'thawyezaw',
      'minkhant',
    ]);
    expect(ZYY_PROFILE_MOCK.roles).toContain('tutor');
    expect(THAW_PROFILE_MOCK.roles).toContain('admin');
    expect(STUDENT_PROFILE_MOCK.roles).toEqual(['student']);

    // All default personas start with Telegram unlinked (linked later in onboarding or Settings)
    expect(ZYY_PROFILE_MOCK.telegram.status).toBe('unlinked');
    expect(ZYY_PROFILE_MOCK.telegram.handle).toBe('');
    expect(ZYY_PROFILE_MOCK.tutorTelegramUsername).toBe('@zay_ants');
    expect(THAW_PROFILE_MOCK.telegram.status).toBe('unlinked');
    expect(THAW_PROFILE_MOCK.telegram.handle).toBe('');
    expect(STUDENT_PROFILE_MOCK.telegram.status).toBe('unlinked');
    expect(STUDENT_PROFILE_MOCK.telegram.handle).toBe('');
  });

  it('paints rectangular slot-painter strokes deterministically on forward & reversed drags', () => {
    const empty = createEmptyTutorSchedule();
    // Reverse drag from Wed 15:00 (dayIdx 3, hourIdx 7) back to Mon 13:00 (dayIdx 1, hourIdx 5)
    const painted = paintTutorSlotRect(
      empty,
      { dayIdx: 3, hourIdx: 7 },
      { dayIdx: 1, hourIdx: 5 },
      'available'
    );

    // Baseline matrix must remain untouched
    expect(summarizeTutorSchedule(empty).availableHours).toBe(0);

    // 3 days (Mon, Tue, Wed) × 3 hours (13, 14, 15) = 9 available slots
    expect(summarizeTutorSchedule(painted)).toEqual({
      availableHours: 9,
      flexibleHours: 0,
      activeDays: 3,
    });
    expect(painted.Mon[13]).toBe('available');
    expect(painted.Tue[14]).toBe('available');
    expect(painted.Wed[15]).toBe('available');
    expect(painted.Thu[15]).toBe('unavailable');

    const cleared = applyTutorSchedulePreset('clear');
    expect(summarizeTutorSchedule(cleared).availableHours).toBe(0);
    expect(formatSlotHourLabel(19, '12h')).toBe('7:00 PM');
    expect(formatSlotRangeLabel('Mon', 19, '24h')).toBe('Mon · 19:00–20:00');
  });

  it('runs the 2-step Telegram /start code flow independently from ANTs account username', () => {
    expect(STUDENT_PROFILE_MOCK.telegram.status).toBe('unlinked');
    expect(STUDENT_PROFILE_MOCK.telegram.handle).toBe('');

    const code = generateTelegramVerificationCode(42);
    expect(code).toMatch(/^ANT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    expect(code).not.toMatch(/[0O1IL]/);
    expect(buildTelegramBotDeepLink(code)).toBe(
      `https://t.me/TheANTsFlowBot?start=${encodeURIComponent(code)}`
    );

    // Phase 1 issues code immediately without requiring a handle first
    const pending = startTelegramLinking(STUDENT_PROFILE_MOCK.telegram);
    expect(pending.status).toBe('pending');
    expect(pending.handle).toBe('');
    expect(pending.verificationCode).toMatch(/^ANT-/);
    expect(pending.codeExpiresAt).toBeDefined();

    // Phase 2 captures simulated default webhook handle when override is omitted
    const connectedDefault = completeTelegramVerification(pending);
    expect(connectedDefault.status).toBe('connected');
    expect(connectedDefault.handle).toBe('@ants_tg_member');

    // Or captures explicit distinct Telegram handle returned by webhook
    const connectedCustom = completeTelegramVerification(pending, '@lynn_tg_verified');
    expect(connectedCustom.status).toBe('connected');
    expect(connectedCustom.handle).toBe('@lynn_tg_verified');
    expect(connectedCustom.linkedAt).toBeDefined();

    // Unlink resets status and clears stored Telegram handle cleanly
    const unlinked = unlinkTelegramAccount(connectedCustom);
    expect(unlinked.status).toBe('unlinked');
    expect(unlinked.handle).toBe('');
    expect(unlinked.linkedAt).toBeUndefined();

    const inquiry = buildTelegramInquiryUrl('@zay_ants', 'Zay Lynn Htet', 'Mon · 19:00–20:00');
    expect(inquiry).toContain('https://t.me/zay_ants?text=');
    expect(decodeURIComponent(inquiry)).toContain('Mon · 19:00–20:00');
  });

  it('validates & renames ANTs @usernames independently without losing persona or Telegram handle', () => {
    expect(sanitizeAccountUsernameInput('@Zay_Studio!! ')).toBe('zay_studio');

    expect(
      validateAccountUsername('settings', ['zaylynnhtet', 'thawyezaw'], 'zaylynnhtet').valid
    ).toBe(false);
    expect(
      validateAccountUsername('thawyezaw', ['zaylynnhtet', 'thawyezaw'], 'zaylynnhtet').valid
    ).toBe(false);
    expect(
      validateAccountUsername('ab', ['zaylynnhtet', 'thawyezaw'], 'zaylynnhtet').valid
    ).toBe(false);
    expect(
      validateAccountUsername('zay_studio', ['zaylynnhtet', 'thawyezaw'], 'zaylynnhtet')
    ).toEqual({ valid: true, normalized: 'zay_studio' });

    const initial = createInitialAccountStorageState('zaylynnhtet');
    const linkedZay = {
      ...ZYY_PROFILE_MOCK,
      username: 'zay_studio',
      telegram: completeTelegramVerification(
        startTelegramLinking(ZYY_PROFILE_MOCK.telegram),
        '@zay_ants'
      ),
    };
    const renamed = renameAccountStorageProfile(initial, 'zaylynnhtet', linkedZay);

    expect(renamed.activeUsername).toBe('zay_studio');
    expect(Object.keys(renamed.profilesByUsername)).toEqual([
      'zay_studio',
      'thawyezaw',
      'minkhant',
    ]);
    // Linked Telegram @handle remains completely distinct from renamed ANTs handle
    expect(renamed.profilesByUsername.zay_studio?.telegram.handle).toBe('@zay_ants');

    // Reload sanitization preserves renamed profile & linked Telegram without resurrecting duplicate
    const sanitized = sanitizeAccountStorageState(renamed, MOCK_SHARED_PROFILES);
    expect(sanitized?.activeUsername).toBe('zay_studio');
    expect(Object.keys(sanitized?.profilesByUsername ?? {})).toEqual([
      'zay_studio',
      'thawyezaw',
      'minkhant',
    ]);
    expect(sanitized?.profilesByUsername.zay_studio?.telegram.handle).toBe('@zay_ants');
    expect(sanitized?.profilesByUsername.minkhant?.telegram.handle).toBe('');
  });

  it('normalizes @handles, computes completeness, and sanitizes persisted account storage', () => {
    expect(normalizeProfileHandle('%40ZayLynnHtet ')).toBe('zaylynnhtet');
    expect(normalizeProfileHandle('@@ThawYeZaw')).toBe('thawyezaw');

    const zayScoreUnlinked = computeProfileCompleteness(ZYY_PROFILE_MOCK);
    expect(zayScoreUnlinked.percent).toBe(80);
    expect(zayScoreUnlinked.missingItems).toEqual(['Telegram Bot link']);

    const zayConnected = {
      ...ZYY_PROFILE_MOCK,
      telegram: completeTelegramVerification(
        startTelegramLinking(ZYY_PROFILE_MOCK.telegram),
        '@zay_ants'
      ),
    };
    const zayScoreLinked = computeProfileCompleteness(zayConnected);
    expect(zayScoreLinked.percent).toBe(100);
    expect(zayScoreLinked.missingItems).toEqual([]);

    const studentScore = computeProfileCompleteness(STUDENT_PROFILE_MOCK);
    expect(studentScore.percent).toBe(75);
    expect(studentScore.missingItems).toEqual(['Telegram Bot link']);

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

    const initial = createInitialAccountStorageState('thawyezaw');
    expect(saveAccountStorageState(initial, 'acc-test', fakeStorage)).toBe(true);
    const loaded = loadAccountStorageState(MOCK_SHARED_PROFILES, 'acc-test', fakeStorage);
    expect(loaded?.activeUsername).toBe('thawyezaw');
    expect(loaded?.profilesByUsername.zaylynnhtet?.name).toBe('Zay Lynn Htet');

    expect(sanitizeAccountStorageState({ bad: true }, MOCK_SHARED_PROFILES)).toBeNull();

    // Legacy cached demo profile (`zyylinnhtet` / `Zyy Linn Htet`) auto-migrates cleanly
    const legacyMigrated = sanitizeAccountStorageState(
      {
        version: 1,
        activeUsername: 'zyylinnhtet',
        profilesByUsername: {
          zyylinnhtet: {
            ...ZYY_PROFILE_MOCK,
            username: 'zyylinnhtet',
            name: 'Zyy Linn Htet',
            tutorTelegramUsername: '@zyy_ants',
          },
        },
      },
      MOCK_SHARED_PROFILES
    );
    expect(legacyMigrated?.activeUsername).toBe('zaylynnhtet');
    expect(legacyMigrated?.profilesByUsername.zaylynnhtet?.name).toBe('Zay Lynn Htet');
    expect(legacyMigrated?.profilesByUsername.zaylynnhtet?.tutorTelegramUsername).toBe('@zay_ants');
  });
});

