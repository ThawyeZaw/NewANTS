import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActivityGalleryLightboxView } from '../components/activities/views/ActivityGalleryLightboxView';
import { OrgActivitiesView } from '../components/activities/views/OrgActivitiesView';
import { OrgActivityDetailView } from '../components/activities/views/OrgActivityDetailView';
import { OrgArticleReaderView } from '../components/articles/views/OrgArticleReaderView';
import { OrgArticlesView } from '../components/articles/views/OrgArticlesView';
import {
  countActivitiesByCategory,
  countArticlesByCategory,
  extractArticleToc,
  filterActivities,
  filterArticles,
  findActivityBySlug,
  findArticleBySlug,
  findTeamMemberByUsername,
  sortArticles,
} from '../lib/showcase';
import {
  MOCK_ORG_ACTIVITIES,
  MOCK_ORG_ARTICLES,
} from '../mocks/showcase-content.mock';
import { MOCK_ORG_TEAM_MEMBERS } from '../mocks/showcase-team.mock';

describe('@ants/org [ZYY-2.4] Activities & Articles Views', () => {
  it('exports all Activities, Articles, and Lightbox views', () => {
    expect(OrgActivitiesView).toBeDefined();
    expect(OrgActivityDetailView).toBeDefined();
    expect(ActivityGalleryLightboxView).toBeDefined();
    expect(OrgArticlesView).toBeDefined();
    expect(OrgArticleReaderView).toBeDefined();
  });

  it('filters activities across Tutoring, Students Meet, Exam Venue Visit, and Hackathon', () => {
    const counts = countActivitiesByCategory(MOCK_ORG_ACTIVITIES);
    expect(counts.Tutoring).toBeGreaterThanOrEqual(2);
    expect(counts["Student's Meet"]).toBeGreaterThanOrEqual(2);
    expect(counts['Exam Venue Visit']).toBeGreaterThanOrEqual(2);
    expect(counts.Hackathon).toBeGreaterThanOrEqual(1);

    const venueVisits = filterActivities(MOCK_ORG_ACTIVITIES, {
      category: 'Exam Venue Visit',
      searchQuery: '',
    });
    expect(venueVisits.length).toBe(counts['Exam Venue Visit']);

    const hackathons = filterActivities(MOCK_ORG_ACTIVITIES, {
      category: 'Hackathon',
      searchQuery: '',
    });
    expect(hackathons.length).toBe(counts.Hackathon);
    expect(
      findActivityBySlug(MOCK_ORG_ACTIVITIES, 'oct-nov-exam-venue-visit-2025')?.gallery.length
    ).toBeGreaterThanOrEqual(3);
  });

  it('includes curated Hackathon overview, single registration button, verified dates, and clean UTF-8 text inside Activities', () => {
    const hackathonActivity = findActivityBySlug(
      MOCK_ORG_ACTIVITIES,
      'edtech-students-hackathon-2026'
    );
    expect(hackathonActivity).not.toBeNull();
    expect(hackathonActivity?.category).toBe('Hackathon');
    expect(hackathonActivity?.isUpcoming).toBe(true);
    expect(hackathonActivity?.externalLinks).toEqual([
      {
        label: 'Register for Free',
        href: 'https://edtechhackathon.dev/register',
        variant: 'primary',
      },
    ]);
    expect(hackathonActivity?.schedulePhases?.length).toBe(4);
    expect(hackathonActivity?.schedulePhases?.[1]?.window).toBe('Sun, Nov 29');
    expect(hackathonActivity?.gallery.length).toBeGreaterThanOrEqual(3);

    const serialized = JSON.stringify({ MOCK_ORG_ACTIVITIES, MOCK_ORG_ARTICLES });
    expect(serialized).not.toMatch(
      /\u00e2\u20ac|\u00c2\u00b7|\u00c3\u2014|\u00ce\u201d|\u00ce\u00b5|\u00c2\u00b1|\u00e2\u2020/
    );

    const detailHtml = renderToStaticMarkup(
      React.createElement(OrgActivityDetailView, {
        slug: 'edtech-students-hackathon-2026',
      })
    );
    expect(detailHtml).toContain('EdTech Students Hackathon 2026');
    expect(detailHtml).toContain('Event Overview');
    expect(detailHtml).toContain('Key Highlights');
    expect(detailHtml).not.toContain('Session Recap');
    expect(detailHtml).not.toContain('What Was Covered');
    expect(detailHtml).toContain('https://edtechhackathon.dev/register');
    expect(detailHtml).toContain('Sun, Nov 29');
    expect(detailHtml).toContain('Program Schedule Summary');
    expect(detailHtml).not.toContain('Official 100-Point Judging Rubric');
    expect(detailHtml).not.toContain('5 Innovation Themes');
  });

  it('filters articles, sorts by read time/title, extracts TOC entries, and links valid authors', () => {
    const categoryCounts = countArticlesByCategory(MOCK_ORG_ARTICLES);
    expect(categoryCounts.all).toBe(MOCK_ORG_ARTICLES.length);
    expect(categoryCounts['Study Guide']).toBeGreaterThanOrEqual(2);
    expect(categoryCounts['Exam Strategy']).toBeGreaterThanOrEqual(1);
    expect(categoryCounts.Productivity).toBeGreaterThanOrEqual(1);
    expect(categoryCounts.Announcement).toBeGreaterThanOrEqual(1);

    const guides = filterArticles(MOCK_ORG_ARTICLES, {
      category: 'Exam Strategy',
      searchQuery: 'UMS',
    });
    expect(guides.length).toBeGreaterThanOrEqual(1);

    const shortestFirst = sortArticles(MOCK_ORG_ARTICLES, 'shortest');
    expect(shortestFirst[0]!.readMinutes).toBeLessThanOrEqual(
      shortestFirst[shortestFirst.length - 1]!.readMinutes
    );

    const alphaSorted = filterArticles(MOCK_ORG_ARTICLES, {
      category: 'all',
      searchQuery: '',
      sortBy: 'title',
    });
    expect(alphaSorted[0]!.title.localeCompare(alphaSorted[1]!.title)).toBeLessThanOrEqual(0);

    for (const article of MOCK_ORG_ARTICLES) {
      expect(findArticleBySlug(MOCK_ORG_ARTICLES, article.slug)).not.toBeNull();
      expect(extractArticleToc(article).length).toBeGreaterThanOrEqual(1);
      expect(article.coverCode).toBeTruthy();
      expect(article.coverFormula).toBeTruthy();
      expect(
        findTeamMemberByUsername(MOCK_ORG_TEAM_MEMBERS, article.authorUsername)
      ).not.toBeNull();
    }
  });

  it('links every activity cover and gallery photo to an existing asset in public/images/org', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    const resolveAsset = (src: string) =>
      path.join(publicDir, src.replace(/^\/+/, ''));

    for (const activity of MOCK_ORG_ACTIVITIES) {
      expect(fs.existsSync(resolveAsset(activity.coverImageSrc))).toBe(true);
      expect(activity.coverAlt.length).toBeGreaterThan(10);
      for (const photo of activity.gallery) {
        expect(fs.existsSync(resolveAsset(photo.imageSrc))).toBe(true);
        expect(photo.imageAlt.length).toBeGreaterThan(10);
      }
    }
  });
});

