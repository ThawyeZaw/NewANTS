import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrgCmsStudioView } from '../components/cms/views/OrgCmsStudioView';
import {
  ORG_CMS_STORAGE_KEY,
  createBlankActivity,
  createBlankArticle,
  createBlankTeamMember,
  createDefaultOrgCmsState,
  deleteCmsActivity,
  deleteCmsArticle,
  deleteCmsTeamMember,
  deriveInitials,
  ensureUniqueSlug,
  ensureUniqueUsername,
  estimateArticleReadMinutes,
  exportOrgCmsJson,
  importOrgCmsJson,
  loadOrgCmsState,
  moveCmsTeamMember,
  resetOrgCmsState,
  saveOrgCmsState,
  updateCmsHomeData,
  upsertCmsActivity,
  upsertCmsArticle,
  upsertCmsTeamMember,
  type OrgCmsStorageLike,
} from '../lib/cms';

function createMemoryStorage(): OrgCmsStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe('@ants/org CMS Content Studio (/cms)', () => {
  it('loads defaults, persists edits, and resets cleanly in storage', () => {
    const storage = createMemoryStorage();
    const initial = loadOrgCmsState(storage);
    expect(initial.home.heroTitle).toContain('ACE With Us');
    expect(initial.team.length).toBeGreaterThanOrEqual(5);
    expect(initial.activities.length).toBeGreaterThanOrEqual(5);
    expect(initial.articles.length).toBeGreaterThanOrEqual(4);

    const edited = updateCmsHomeData(initial, {
      ...initial.home,
      heroTitle: 'Updated Headline — Custom Mission Tagline',
    });
    saveOrgCmsState(edited, storage);

    const reloaded = loadOrgCmsState(storage);
    expect(reloaded.home.heroTitle).toBe(
      'Updated Headline — Custom Mission Tagline'
    );
    expect(storage.getItem(ORG_CMS_STORAGE_KEY)).toContain(
      'Updated Headline'
    );

    const reset = resetOrgCmsState(storage);
    expect(reset.home.heroTitle).toContain('ACE With Us');
    expect(storage.getItem(ORG_CMS_STORAGE_KEY)).toBeNull();
  });

  it('supports full CRUD and ordering across Team, Activities, and Articles', () => {
    let state = createDefaultOrgCmsState('2026-11-12T00:00:00.000Z');

    // Team CRUD
    const newMember = createBlankTeamMember(state.team.map((m) => m.username));
    newMember.name = 'Min Khant Thu';
    newMember.initials = deriveInitials(newMember.name);
    expect(newMember.initials).toBe('MT');

    state = upsertCmsTeamMember(state, newMember);
    expect(state.team[0]?.id).toBe(newMember.id);

    state = moveCmsTeamMember(state, newMember.id, 'down');
    expect(state.team[1]?.id).toBe(newMember.id);

    state = deleteCmsTeamMember(state, newMember.id);
    expect(state.team.some((m) => m.id === newMember.id)).toBe(false);

    // Activity CRUD
    const newAct = createBlankActivity(state.activities.map((a) => a.slug));
    newAct.title = 'December Pure 1 Workshop';
    newAct.slug = ensureUniqueSlug(
      newAct.title,
      state.activities.map((a) => a.slug)
    );
    state = upsertCmsActivity(state, newAct);
    expect(state.activities[0]?.slug).toBe('december-pure-1-workshop');

    state = deleteCmsActivity(state, newAct.id);
    expect(state.activities.some((a) => a.id === newAct.id)).toBe(false);

    // Article CRUD
    const newArt = createBlankArticle(
      state.articles.map((a) => a.slug),
      state.team[0]
    );
    expect(estimateArticleReadMinutes(newArt)).toBeGreaterThanOrEqual(2);
    state = upsertCmsArticle(state, newArt);
    expect(state.articles[0]?.id).toBe(newArt.id);

    state = deleteCmsArticle(state, newArt.id);
    expect(state.articles.some((a) => a.id === newArt.id)).toBe(false);

    expect(
      ensureUniqueUsername('thawyezaw', state.team.map((m) => m.username))
    ).toBe('thawyezaw2');
  });

  it('exports and imports JSON backups with defensive validation', () => {
    const state = createDefaultOrgCmsState('2026-11-12T00:00:00.000Z');
    const modified = updateCmsHomeData(state, {
      ...state.home,
      heroBadge: 'Custom Backup Badge',
    });
    const json = exportOrgCmsJson(modified);
    const imported = importOrgCmsJson(json);

    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.state.home.heroBadge).toBe('Custom Backup Badge');
      expect(imported.state.team.length).toBe(state.team.length);
    }

    const badJson = importOrgCmsJson('{not valid json');
    expect(badJson.ok).toBe(false);

    const wrongShape = importOrgCmsJson('{"foo":"bar"}');
    expect(wrongShape.ok).toBe(false);
  });

  it('renders OrgCmsStudioView cleanly across all 4 sections on SSR', () => {
    const state = createDefaultOrgCmsState('2026-11-12T00:00:00.000Z');

    const homeHtml = renderToStaticMarkup(
      React.createElement(OrgCmsStudioView, {
        initialState: state,
        initialSection: 'home',
      })
    );
    expect(homeHtml).toContain('Organization Content Studio');
    expect(homeHtml).toContain('Home Landing Content');

    const teamHtml = renderToStaticMarkup(
      React.createElement(OrgCmsStudioView, {
        initialState: state,
        initialSection: 'team',
      })
    );
    expect(teamHtml).toContain('Team, Founders &amp; Tutors');

    const activitiesHtml = renderToStaticMarkup(
      React.createElement(OrgCmsStudioView, {
        initialState: state,
        initialSection: 'activities',
      })
    );
    expect(activitiesHtml).toContain('Activities &amp; Hackathon Events');

    const articlesHtml = renderToStaticMarkup(
      React.createElement(OrgCmsStudioView, {
        initialState: state,
        initialSection: 'articles',
      })
    );
    expect(articlesHtml).toContain('Articles &amp; Study Guides');
  });

  it('enforces restricted contributor access gate with dev simulation and 1-click persona switchers', () => {
    const lockedHtml = renderToStaticMarkup(
      React.createElement(OrgCmsStudioView, {
        simulatedAccess: 'locked',
      })
    );
    expect(lockedHtml).toContain('Contributor Access Required');
    expect(lockedHtml).toContain('Sign In as Contributor');
    expect(lockedHtml).toContain('Simulate Contributor (Dev Preview)');
    expect(lockedHtml).toContain('Quick Contributor Switch');
    expect(lockedHtml).toContain('Zay Lynn Htet');
    expect(lockedHtml).toContain('Thaw Ye Zaw');

    const unlockedHtml = renderToStaticMarkup(
      React.createElement(OrgCmsStudioView, {
        simulatedAccess: 'contributor',
      })
    );
    expect(unlockedHtml).toContain('Organization Content Studio');
    expect(unlockedHtml).toContain('Contributor: @');
    expect(unlockedHtml).toContain('Preview Gate');
  });
});

