import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@ants/auth-client';
import type { AccountProfileDto } from '@ants/shared-types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

import { StudySettingsContainer } from '../components/account/containers/StudySettingsContainer';
import {
  mapAccountDtoToSharedProfile,
  mapSharedProfileToUpdateInput,
} from '../lib/account-api';

describe('@ants/study [THAW-3.4] Account Settings Container & Mappers', () => {
  it('maps D1 AccountProfileDto <-> SharedUserProfileData including Tutor Schedule & Telegram status', () => {
    const dto: AccountProfileDto = {
      id: 'prof_2',
      userId: 'usr_2',
      name: 'Min Khant',
      username: 'minkhant',
      email: 'minkhant@the-ants.org',
      headline: 'IGCSE Scholar',
      bio: 'Preparing for 0580 Maths',
      institution: 'Yangon Academy',
      curriculumLabel: 'Cambridge IGCSE',
      timezone: 'Asia/Yangon (UTC+06:30)',
      preferredApp: 'study',
      memberSince: 'Oct 2025',
      role: 'student',
      roles: ['student'],
      xp: 90,
      streakDays: 4,
      focusHoursThisMonth: 8,
      completedSessions: 16,
      hourlyRateLabel: '',
      tutorTelegramUsername: '',
      curriculums: ['Cambridge IGCSE'],
      taughtSubjects: [],
      featuredOnOrg: false,
      tutorSchedule: { Sun: { '14': 'flexible' } },
      portfolioItems: [],
      certifications: [],
      telegram: {
        status: 'linked',
        handle: '@minkhant_tg',
        chatId: '987654',
        botUsername: 'TheANTsFlowBot',
        verificationCode: null,
        codeExpiresAt: null,
        linkedAt: '2026-11-22T00:00:00.000Z',
        startCommand: null,
        deepLinkUrl: null,
        preferences: {
          blockReminders: true,
          defaultLeadMinutes: 15,
          dailyMorningDigest: false,
          digestTime: '07:00',
          examCountdownAlerts: true,
          tutorInquiryAlerts: true,
        },
      },
      visibility: {
        showStatsStreak: true,
        showPortfolioProjects: true,
        showCertifications: true,
        showTutorSchedule: true,
        showTelegramInquiry: true,
      },
    };

    const viewProfile = mapAccountDtoToSharedProfile(dto);
    expect(viewProfile.telegram.status).toBe('connected');
    expect(viewProfile.tutorSchedule.Sun[14]).toBe('flexible');

    const updateInput = mapSharedProfileToUpdateInput(viewProfile);
    expect(updateInput.tutorSchedule?.Sun?.['14']).toBe('flexible');
  });

  it('renders StudySettingsContainer guest gate safely during SSR', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        AuthProvider,
        { skipInitialFetch: true },
        React.createElement(StudySettingsContainer)
      )
    );
    expect(html).toContain('the-ants.org');
  });
});
