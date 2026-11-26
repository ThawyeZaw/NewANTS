import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@ants/auth-client';
import type {
  AdminOrgActivityRecordDto,
  AdminOrgSettingsDto,
  AdminOrgTeamMemberRecordDto,
} from '@ants/shared-types';
import { OrgAdminContainer } from '../components/admin/containers/OrgAdminContainer';
import {
  buildAdminSettingsInput,
  buildHomeLandingMockFromAdmin,
  mapAdminActivityDtoToMock,
  mapAdminTeamDtoToMock,
  mapMockToAdminActivityInput,
  mapMockToAdminTeamInput,
  uploadDataUrlToR2IfNeeded,
} from '../lib/admin-api';

describe('@ants/org [THAW-2.3] Admin CMS Mappers, R2 Upload & Container', () => {
  it('maps team member schedule between D1 DTO and TutorSlotPainterView format', () => {
    const dto: AdminOrgTeamMemberRecordDto = {
      id: 'mem_1',
      userId: 'usr_1',
      username: 'thawyezaw',
      name: 'Thaw Ye Zaw',
      initials: 'TZ',
      roleBadge: 'Founder & Admin',
      roleCategories: ['founder', 'tutor'],
      isFounder: true,
      isTutor: true,
      headline: 'Further Maths Mentor',
      bio: 'Builds The ANTs',
      institution: 'The ANTs',
      specialization: 'Edexcel IAL Further Maths',
      curriculums: ['Edexcel IAL'],
      taughtSubjects: ['WFM01'],
      hourlyRateLabel: '35,000 MMK / hr',
      timezoneLabel: 'Asia/Yangon (UTC+06:30)',
      tutorTelegramUsername: '@thorin_ants',
      weeklySchedule: {
        Sat: { '9': 'available', '10': 'flexible' },
      },
      achievements: ['Founder'],
      joinedLabel: '2024',
      displayOrder: 0,
      source: 'org_team_member',
      isPublished: true,
    };

    const viewModel = mapAdminTeamDtoToMock(dto);
    expect(viewModel.weeklySchedule.Sat[9]).toBe('available');
    expect(viewModel.weeklySchedule.Sat[10]).toBe('flexible');

    const roundTrip = mapMockToAdminTeamInput(viewModel, 0);
    expect(roundTrip.weeklySchedule.Sat?.['9']).toBe('available');
    expect(roundTrip.username).toBe('thawyezaw');
  });

  it('uploads dropped base64 images to R2 via /api/storage/upload before saving activities', async () => {
    const mockFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            key: 'activities/demo-cover.png',
            url: '/api/storage/file/activities/demo-cover.png',
            contentType: 'image/png',
            size: 64,
            etag: 'etag-1',
            uploadedAt: '2026-11-25T12:00:00.000Z',
            visibility: 'public',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const uploaded = await uploadDataUrlToR2IfNeeded(
        'data:image/png;base64,iVBORw0KGgo=',
        'activities',
        'demo-cover.png'
      );
      expect(uploaded).toBe('/api/storage/file/activities/demo-cover.png');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const actDto: AdminOrgActivityRecordDto = {
        id: 'act_1',
        slug: 'hackathon-2026',
        category: 'Hackathon',
        dbCategory: 'hackathon',
        artworkTheme: 'hackathon',
        isUpcoming: true,
        title: 'Hackathon 2026',
        dateLabel: 'Nov 2026',
        location: 'Yangon',
        attendanceLabel: '40 students',
        facilitators: ['Thorin'],
        summary: 'Student builds',
        recapParagraphs: ['Great turnout'],
        highlights: ['Live demos'],
        coverImageSrc: uploaded,
        coverAlt: 'Hackathon cover',
        gallery: [],
        displayOrder: 1,
        isPublished: true,
      };
      const mappedAct = mapAdminActivityDtoToMock(actDto);
      expect(mappedAct.coverImageSrc).toContain('/api/storage/file/activities/demo-cover.png');

      const back = await mapMockToAdminActivityInput(mappedAct, 1);
      expect(back.coverImageSrc).toBe('/api/storage/file/activities/demo-cover.png');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('builds OrgHomeLandingMockData and serializes hackathon banner updates', () => {
    const settings: AdminOrgSettingsDto = {
      id: 'default',
      heroHeadline: 'ACE With Us',
      heroSubheadline: 'Zero-login calculators & mentors.',
      missionStatement: 'Our open mission.',
      missionPillars: [{ id: 'p1', code: 'Open', title: 'Free', description: 'Zero wall' }],
      hackathonBanner: {
        title: 'ANTs Hackathon',
        dateLabel: 'Nov 2026',
        location: 'Yangon',
        summary: 'Build tools',
        externalUrl: 'https://devpost.com/ants',
        ctaLabel: 'Apply',
      },
      socialLinks: {},
      updatedAt: '2026-11-25T12:00:00.000Z',
    };

    const landing = buildHomeLandingMockFromAdmin(settings, [], []);
    expect(landing.heroTitle).toBe('ACE With Us');

    const updateInput = buildAdminSettingsInput(landing, settings.hackathonBanner, {});
    expect(updateInput.hackathonBanner?.externalUrl).toBe('https://devpost.com/ants');
  });

  it('renders OrgAdminContainer SSR loading/auth card safely', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        AuthProvider,
        { skipInitialFetch: true },
        React.createElement(OrgAdminContainer)
      )
    );
    expect(html).toContain('the-ants.org');
  });
});
