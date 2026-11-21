import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrgHomeLandingView } from '../components/home/views/OrgHomeLandingView';
import { OrgProductsVideoView } from '../components/home/views/OrgProductsVideoView';
import { OrgFooterView } from '../components/layout/views/OrgFooterView';
import { OrgNavbarView } from '../components/layout/views/OrgNavbarView';
import { findActivityBySlug, findTeamMemberByUsername } from '../lib/showcase';
import { MOCK_ORG_ACTIVITIES } from '../mocks/showcase-content.mock';
import { MOCK_ORG_HOME_DATA, MOCK_ORG_NAV_LINKS } from '../mocks/showcase-home.mock';
import { MOCK_ORG_TEAM_MEMBERS } from '../mocks/showcase-team.mock';

describe('@ants/org [ZYY-2.1] Showcase Navbar, Footer & Home Landing View', () => {
  it('exports OrgNavbarView, OrgFooterView, and OrgHomeLandingView', () => {
    expect(OrgNavbarView).toBeDefined();
    expect(OrgFooterView).toBeDefined();
    expect(OrgHomeLandingView).toBeDefined();
    expect(OrgProductsVideoView).toBeDefined();
  });

  it('provides complete mock data for the-ants.org showcase landing page without standalone hackathon nav or spotlight', () => {
    expect(MOCK_ORG_NAV_LINKS.length).toBeGreaterThanOrEqual(4);
    expect(MOCK_ORG_NAV_LINKS.some((link) => link.href === '/hackathon')).toBe(false);
    expect(MOCK_ORG_HOME_DATA.missionStatement.length).toBeGreaterThan(20);
    expect(MOCK_ORG_HOME_DATA.missionPillars.length).toBe(3);
    expect(MOCK_ORG_HOME_DATA.products.map((p) => p.id)).toEqual(['study', 'flow']);
    expect(
      MOCK_ORG_HOME_DATA.recentActivities.some((act) => act.category === 'Hackathon')
    ).toBe(true);
  });

  it('cross-links featured home members and activities cleanly to Stage Z2 routes', () => {
    for (const member of MOCK_ORG_HOME_DATA.featuredMembers) {
      expect(findTeamMemberByUsername(MOCK_ORG_TEAM_MEMBERS, member.username)).not.toBeNull();
    }
    for (const act of MOCK_ORG_HOME_DATA.recentActivities) {
      expect(findActivityBySlug(MOCK_ORG_ACTIVITIES, act.slug)).not.toBeNull();
    }
    for (const act of MOCK_ORG_ACTIVITIES) {
      expect(findActivityBySlug(MOCK_ORG_ACTIVITIES, act.slug)).not.toBeNull();
    }
  });

  it('renders the hero ACE With Us tagline, Register/Calculator/Sign-in CTAs, Interactive Ecosystem Map, and OrgProductsVideoView', () => {
    const html = renderToStaticMarkup(React.createElement(OrgHomeLandingView));
    expect(html).toContain('ACE With Us');
    expect(html).toContain('Register for Free');
    expect(html).toContain('href="http://localhost:3001/signup"');
    expect(html).toContain('href="http://localhost:3001/login"');
    expect(html).toContain('Launch Grade Calculator');
    expect(html).toContain('data-testid="hero-ecosystem-orbit"');
    expect(html).toContain('data-testid="bento-products-grid"');
    expect(html).toContain('data-testid="org-products-video"');
    expect(html).toContain('data-testid="activity-vertical-timeline"');
    expect(html).toContain('EdTech Students Hackathon 2026');
    expect(html).toContain('href="/activities/edtech-students-hackathon-2026"');
    expect(html).not.toContain('data-testid="hackathon-spotlight-banner"');
    expect(html).toContain('<video');
    expect(html).toContain('<canvas');
    expect(html).toContain('Study');
    expect(html).toContain('Flow');
    expect(html).toContain('Guest Grade Calculator');
    expect(html).toContain('Telegram QR &amp; Bot');
    expect(html).toContain('href="http://localhost:3001"');
    expect(html).toContain('href="http://localhost:3002"');
    expect(html).toContain('href="/calculator"');
    expect(html).toContain('href="/team"');

    const externalHtml = renderToStaticMarkup(
      React.createElement(OrgProductsVideoView, {
        videoUrl: 'https://cdn.the-ants.org/showcase/products.mp4',
        posterUrl: 'https://cdn.the-ants.org/showcase/products-poster.jpg',
        studyUrl: 'https://study.the-ants.org',
        flowUrl: 'https://flow.the-ants.org',
      })
    );
    expect(externalHtml).toContain('src="https://cdn.the-ants.org/showcase/products.mp4"');
    expect(externalHtml).toContain('poster="https://cdn.the-ants.org/showcase/products-poster.jpg"');
    expect(externalHtml).toContain('aria-label="Jump to chapter 01: Study"');
    expect(externalHtml).toContain('aria-label="Jump to chapter 02: Flow"');
  });
});
