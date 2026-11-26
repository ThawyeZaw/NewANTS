import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrgActivitiesContainer } from '../components/activities/containers/OrgActivitiesContainer';
import { OrgActivityDetailContainer } from '../components/activities/containers/OrgActivityDetailContainer';
import { OrgArticleReaderContainer } from '../components/articles/containers/OrgArticleReaderContainer';
import { OrgArticlesContainer } from '../components/articles/containers/OrgArticlesContainer';
import { OrgHomeContainer } from '../components/home/containers/OrgHomeContainer';
import { OrgTeamContainer } from '../components/team/containers/OrgTeamContainer';
import { OrgTeamMemberContainer } from '../components/team/containers/OrgTeamMemberContainer';
import {
  OrgApiError,
  fetchOrgActivities,
  fetchOrgActivityDetail,
  fetchOrgArticleDetail,
  fetchOrgArticles,
  fetchOrgHome,
  fetchOrgTeam,
  fetchOrgTeamMember,
  mapOrgActivityDtoToView,
  mapOrgArticleDtoToView,
  mapOrgHomeDtoToLandingData,
  mapOrgTeamMemberDtoToView,
  resolveDynamicRouteParam,
} from '../lib/org-api';

function createMockFetch(
  status: number,
  body: unknown
): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

describe('@ants/org [THAW-2.2] D1 Showcase API Client & Smart Containers', () => {
  it('fetches and maps /api/org/home payload cleanly into OrgHomeLandingMockData', async () => {
    const fetchImpl = createMockFetch(200, {
      ok: true,
      data: {
        heroBadge: 'The ANTs · Academic Network & Tutors',
        heroTitle: 'ACE With Us — open study tools.',
        heroHighlight: '',
        heroDescription: 'Zero login walls.',
        missionStatement: 'Open calculators and tutor schedules.',
        impactStats: [
          { id: 'tutors', value: '4+', label: 'Tutors', detail: 'Sun–Sat slots' },
        ],
        missionPillars: [
          { id: 'p1', code: 'Tutoring', title: 'Schedules', description: 'Live slots' },
        ],
        hackathonBanner: null,
        socialLinks: {
          study: 'https://study.the-ants.org',
          flow: 'https://flow.the-ants.org',
        },
        featuredMembers: [
          {
            username: 'thawyezaw',
            name: 'Thaw Ye Zaw',
            roleBadge: 'Founder',
            title: 'Further Maths Tutor',
            specialization: 'Edexcel IAL',
            availabilityLabel: 'Tue · Thu · Sat',
          },
        ],
        recentActivities: [
          {
            slug: 'edtech-students-hackathon-2026',
            category: 'Hackathon',
            title: 'EdTech Students Hackathon 2026',
            dateLabel: 'Nov 23 – Dec 6, 2026',
            location: 'Yangon',
            summary: 'Student builders launchpad.',
            coverImageSrc: '/images/org/hackathon-table.jpg',
          },
        ],
        counts: {
          teamCount: 7,
          tutorCount: 4,
          activityCount: 7,
          articleCount: 5,
          boundaryTablesCount: 3779,
        },
      },
    });

    const dto = await fetchOrgHome({
      apiBaseUrl: 'http://localhost:8787',
      fetchImpl,
    });
    const mapped = mapOrgHomeDtoToLandingData(dto);
    expect(mapped.heroTitle).toBe('ACE With Us — open study tools.');
    expect(mapped.products.map((p) => p.id)).toEqual(['study', 'flow']);
    expect(mapped.featuredMembers[0]?.username).toBe('thawyezaw');
    expect(mapped.recentActivities[0]?.coverImageSrc).toBe(
      '/images/org/hackathon-table.jpg'
    );
  });

  it('maps team, activity, and article DTOs including string-hour TutorScheduleMap keys', async () => {
    const teamDto = await fetchOrgTeam({
      apiBaseUrl: 'http://localhost:8787',
      fetchImpl: createMockFetch(200, {
        ok: true,
        data: {
          total: 1,
          tutorCount: 1,
          members: [
            {
              id: 'mem_thaw',
              userId: 'usr_thaw',
              username: 'thawyezaw',
              name: 'Thaw Ye Zaw',
              initials: 'TZ',
              roleCategories: ['founder', 'tutor'],
              roleBadge: 'Founder & Lead Architect',
              isFounder: true,
              isTutor: true,
              headline: 'IAL Further Maths Tutor',
              bio: 'Bio text',
              institution: 'The ANTs',
              specialization: 'Further Maths',
              curriculums: ['Edexcel IAL'],
              taughtSubjects: ['WFM01'],
              hourlyRateLabel: '35,000 MMK / hr',
              timezoneLabel: 'Asia/Yangon (UTC+06:30)',
              tutorTelegramUsername: '@thorin_ants',
              weeklySchedule: {
                Tue: { '19': 'available', '20': 'flexible' },
              },
              achievements: ['A* Further Maths'],
              joinedLabel: 'Founding Member · 2025',
              displayOrder: 1,
              source: 'merged',
            },
          ],
        },
      }),
    });

    const mappedMember = mapOrgTeamMemberDtoToView(teamDto.members[0]!);
    expect(mappedMember.weeklySchedule.Tue[19]).toBe('available');
    expect(mappedMember.weeklySchedule.Tue[20]).toBe('flexible');
    expect(mappedMember.weeklySchedule.Mon[8]).toBe('unavailable');

    const activityDto = await fetchOrgActivities({
      apiBaseUrl: 'http://localhost:8787',
      fetchImpl: createMockFetch(200, {
        ok: true,
        data: {
          total: 1,
          activities: [
            {
              id: 'act_1',
              slug: 'test-activity',
              category: "Student's Meet",
              dbCategory: 'students_meet',
              isUpcoming: false,
              title: 'Test Meet',
              dateLabel: 'Nov 2026',
              location: 'Yangon',
              attendanceLabel: '100',
              facilitators: ['The ANTs'],
              summary: 'Summary',
              recapParagraphs: ['Paragraph'],
              highlights: ['Highlight'],
              coverImageSrc: '/images/org/students-meet.jpg',
              coverAlt: 'Alt text',
              artworkTheme: 'meetup',
              gallery: [],
              displayOrder: 1,
            },
          ],
        },
      }),
    });
    expect(mapOrgActivityDtoToView(activityDto.activities[0]!).category).toBe(
      "Student's Meet"
    );

    const articleDto = await fetchOrgArticles({
      apiBaseUrl: 'http://localhost:8787',
      fetchImpl: createMockFetch(200, {
        ok: true,
        data: {
          total: 1,
          authors: [],
          articles: [
            {
              id: 'art_1',
              slug: 'test-article',
              category: 'Exam Strategy',
              title: 'Test Article',
              subtitle: 'Sub',
              publishedAtIso: '2026-11-12T00:00:00.000Z',
              publishedLabel: 'Nov 2026',
              readMinutes: 5,
              authorUsername: 'thawyezaw',
              authorName: 'Thaw Ye Zaw',
              authorRole: 'Founder',
              summary: 'Summary',
              tags: ['UMS'],
              artworkTheme: 'article-ums',
              isFeatured: true,
              sections: [
                {
                  id: 's1',
                  heading: 'Section 1',
                  paragraphs: ['Text'],
                },
              ],
            },
          ],
        },
      }),
    });
    expect(mapOrgArticleDtoToView(articleDto.articles[0]!).publishedLabel).toBe(
      'Nov 2026'
    );
  });

  it('throws typed OrgApiError on 404 and 500 API responses', async () => {
    await expect(
      fetchOrgTeamMember('nobody', {
        apiBaseUrl: 'http://localhost:8787',
        fetchImpl: createMockFetch(404, {
          ok: false,
          error: { code: 'TEAM_MEMBER_NOT_FOUND', message: 'Not found' },
        }),
      })
    ).rejects.toMatchObject({
      name: 'OrgApiError',
      status: 404,
      code: 'TEAM_MEMBER_NOT_FOUND',
    } satisfies Partial<OrgApiError>);

    await expect(
      fetchOrgActivityDetail('bad', {
        apiBaseUrl: 'http://localhost:8787',
        fetchImpl: createMockFetch(500, {
          ok: false,
          error: { code: 'INTERNAL_SERVER_ERROR', message: 'Boom' },
        }),
      })
    ).rejects.toMatchObject({ status: 500, code: 'INTERNAL_SERVER_ERROR' });

    await expect(
      fetchOrgArticleDetail('bad', {
        apiBaseUrl: 'http://localhost:8787',
        fetchImpl: createMockFetch(404, {
          ok: false,
          error: { code: 'ARTICLE_NOT_FOUND', message: 'Missing' },
        }),
      })
    ).rejects.toMatchObject({ status: 404, code: 'ARTICLE_NOT_FOUND' });
  });

  it('resolves dynamic slugs from browser pathname for static fallback routing', () => {
    expect(
      resolveDynamicRouteParam(
        'thawyezaw',
        '/team/',
        '/team/new-live-tutor'
      )
    ).toBe('new-live-tutor');
    expect(
      resolveDynamicRouteParam(
        'edtech-students-hackathon-2026',
        '/activities/',
        '/activities/new-d1-workshop/'
      )
    ).toBe('new-d1-workshop');
    expect(
      resolveDynamicRouteParam(
        'edexcel-ial-ums-mastery-guide',
        '/articles/',
        '/articles/fresh%2Dguide'
      )
    ).toBe('fresh-guide');
    expect(
      resolveDynamicRouteParam('thawyezaw', '/team/', '/team')
    ).toBe('thawyezaw');
  });

  it('renders all 7 Smart Containers cleanly in SSR loading state without crashing', () => {
    const containers = [
      React.createElement(OrgHomeContainer),
      React.createElement(OrgTeamContainer),
      React.createElement(OrgTeamMemberContainer, { username: 'thawyezaw' }),
      React.createElement(OrgActivitiesContainer),
      React.createElement(OrgActivityDetailContainer, {
        slug: 'edtech-students-hackathon-2026',
      }),
      React.createElement(OrgArticlesContainer),
      React.createElement(OrgArticleReaderContainer, {
        slug: 'edexcel-ial-ums-mastery-guide',
      }),
    ];

    for (const element of containers) {
      const html = renderToStaticMarkup(element);
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('The ANTs');
    }
  });
});
