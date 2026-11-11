import { describe, expect, it } from 'vitest';
import { OrgHomeLandingView } from '../components/home/views/OrgHomeLandingView';
import { OrgFooterView } from '../components/layout/views/OrgFooterView';
import { OrgNavbarView } from '../components/layout/views/OrgNavbarView';
import { MOCK_ORG_HOME_DATA, MOCK_ORG_NAV_LINKS } from '../mocks/showcase-home.mock';

describe('@ants/org [ZYY-2.1] Showcase Navbar, Footer & Home Landing View', () => {
  it('exports OrgNavbarView, OrgFooterView, and OrgHomeLandingView', () => {
    expect(OrgNavbarView).toBeDefined();
    expect(OrgFooterView).toBeDefined();
    expect(OrgHomeLandingView).toBeDefined();
  });

  it('provides complete mock data for the-ants.org showcase landing page', () => {
    expect(MOCK_ORG_NAV_LINKS.length).toBeGreaterThanOrEqual(4);
    expect(MOCK_ORG_HOME_DATA.products.map((p) => p.id)).toEqual(['study', 'flow']);
    expect(MOCK_ORG_HOME_DATA.hackathon.externalWebsiteUrl).toContain('https://');
  });
});

