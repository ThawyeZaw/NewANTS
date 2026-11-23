import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ANT_MASCOT_NAME,
  ANT_MASCOT_PRESETS,
  AntMascot,
  AntMascotView,
  DEFAULT_MILO_COMPANION_PREFS,
  MILO_COMPANION_STORAGE_KEY,
  MiloCompanionDock,
  MiloCompanionDockView,
  NotFoundView,
  clampMiloDragPosition,
  getRouteMiloQuips,
  loadMiloCompanionPrefs,
  resolveMascotPropVariant,
  resolveMascotSize,
  saveMiloCompanionPrefs,
  type AntMascotMood,
} from '../index';

describe('@ants/ui <AntMascot /> Brand Mascot (Milo)', () => {
  it('exports AntMascot, AntMascotView, and official mascot name Milo', () => {
    expect(AntMascot).toBe(AntMascotView);
    expect(ANT_MASCOT_NAME).toBe('Milo');
  });

  it('resolves named and numeric sizes accurately', () => {
    expect(resolveMascotSize('xs')).toBe(40);
    expect(resolveMascotSize('sm')).toBe(64);
    expect(resolveMascotSize('md')).toBe(104);
    expect(resolveMascotSize('lg')).toBe(148);
    expect(resolveMascotSize('xl')).toBe(204);
    expect(resolveMascotSize(128)).toBe(128);
  });

  it('infers context-aware signature props by app & mood and honors explicit overrides', () => {
    expect(resolveMascotPropVariant('org', 'happy')).toBe('pencil');
    expect(resolveMascotPropVariant('flow', 'focus')).toBe('headphones');
    expect(resolveMascotPropVariant('flow', 'sleeping')).toBe('timer');
    expect(resolveMascotPropVariant('study', 'studying')).toBe('scholar');
    expect(resolveMascotPropVariant('telegram', 'nudge')).toBe('bell');
    expect(resolveMascotPropVariant('flow', 'focus', 'pencil')).toBe('pencil');
    expect(resolveMascotPropVariant('org', 'curious', 'magnifier')).toBe('magnifier');
    expect(resolveMascotPropVariant('flow', 'sleeping', 'pillow')).toBe('pillow');
    expect(resolveMascotPropVariant('org', 'idle', 'none')).toBe('none');
  });

  it('renders all 8 moods cleanly during SSR with accessible roles and optional speech/badge', () => {
    const moods: AntMascotMood[] = [
      'idle',
      'happy',
      'celebrating',
      'studying',
      'focus',
      'nudge',
      'sleeping',
      'curious',
    ];

    for (const mood of moods) {
      const html = renderToStaticMarkup(
        React.createElement(AntMascot, {
          mood,
          speech: `Hello from ${mood}`,
          badge: `${mood} badge`,
        })
      );
      expect(html).toContain(`data-mood="${mood}"`);
      expect(html).toContain('data-testid="ant-mascot"');
      expect(html).toContain('data-variant="full"');
      expect(html).toContain('data-testid="ant-mascot-speech"');
      expect(html).toContain(`Hello from ${mood}`);
      expect(html).toContain('data-testid="ant-mascot-badge"');
      expect(html).toContain(`${mood} badge`);
      expect(html).toContain('role="img"');
    }
  });

  it('supports avatar variant, magnifier/pillow props, and interactive button tap semantics', () => {
    const avatarHtml = renderToStaticMarkup(
      React.createElement(AntMascot, {
        variant: 'avatar',
        mood: 'happy',
        app: 'study',
        interactive: true,
        speech: 'Hi from Milo',
        tapLines: ['Tap line 2'],
      })
    );
    expect(avatarHtml).toContain('data-variant="avatar"');
    expect(avatarHtml).toContain('<button type="button"');
    expect(avatarHtml).toContain('Hi from Milo');

    const magnifierHtml = renderToStaticMarkup(
      React.createElement(AntMascot, { mood: 'curious', propVariant: 'magnifier' })
    );
    expect(magnifierHtml).toContain('data-prop-variant="magnifier"');

    const pillowHtml = renderToStaticMarkup(
      React.createElement(AntMascot, { mood: 'sleeping', propVariant: 'pillow' })
    );
    expect(pillowHtml).toContain('data-prop-variant="pillow"');
  });

  it('supports decorative mode when ariaLabel is empty string', () => {
    const html = renderToStaticMarkup(
      React.createElement(AntMascot, { ariaLabel: '', animated: false })
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
    expect(html).not.toContain('ants-mascot-float');
  });

  it('renders every curated ecosystem preset without errors', () => {
    for (const [key, preset] of Object.entries(ANT_MASCOT_PRESETS)) {
      const html = renderToStaticMarkup(React.createElement(AntMascot, preset));
      expect(html, `preset ${key}`).toContain(`data-mood="${preset.mood}"`);
      expect(html, `preset ${key}`).toContain(`data-app="${preset.app}"`);
      expect(html, `preset ${key}`).toContain(`data-prop-variant="${preset.propVariant}"`);
    }
  });

  it('renders shared <NotFoundView /> cleanly across org, study, and flow', () => {
    for (const app of ['org', 'study', 'flow'] as const) {
      const html = renderToStaticMarkup(
        React.createElement(NotFoundView, {
          app,
          quickLinks: [{ label: 'Home', href: '/' }],
        })
      );
      expect(html).toContain(`data-testid="not-found-${app}"`);
      expect(html).toContain('data-prop-variant="magnifier"');
      expect(html).toContain('404 · Route Missing');
    }
  });

  it('defines mascot animation keyframes, hidden scrollbars, and prefers-reduced-motion overrides in tokens.css', () => {
    const tokensPath = path.resolve(__dirname, '../styles/tokens.css');
    const css = fs.readFileSync(tokensPath, 'utf8');

    for (const token of [
      'ants-mascot-float',
      'ants-mascot-celebrate',
      'ants-mascot-antenna-wiggle',
      'ants-mascot-zzz',
      'ants-mascot-sparkle',
      'ants-mascot-hop',
      'ants-mascot-blink',
      'ants-mascot-companion-idle',
      'ants-mascot-drag-wiggle',
      'ants-mascot-burst',
      'scrollbar-width: none',
      '::-webkit-scrollbar',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('persists Milo companion prefs & drag edge position safely, clamps drags, and renders unified full-body dock', () => {
    expect(MiloCompanionDock).toBe(MiloCompanionDockView);

    const store = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };

    expect(loadMiloCompanionPrefs(fakeStorage)).toEqual(DEFAULT_MILO_COMPANION_PREFS);
    saveMiloCompanionPrefs({ minimized: true, quiet: true }, fakeStorage);
    expect(loadMiloCompanionPrefs(fakeStorage)).toEqual({ minimized: true, quiet: true });

    saveMiloCompanionPrefs(
      { minimized: false, quiet: false, position: { edge: 'left', bottomPx: 142 } },
      fakeStorage
    );
    expect(loadMiloCompanionPrefs(fakeStorage)).toEqual({
      minimized: false,
      quiet: false,
      position: { edge: 'left', bottomPx: 142 },
    });

    const leftSnap = clampMiloDragPosition({
      x: 40,
      y: 260,
      viewportWidth: 1280,
      viewportHeight: 900,
      dockSize: 64,
    });
    expect(leftSnap.edge).toBe('left');
    expect(leftSnap.left).toBe(40);
    expect(leftSnap.bottomPx).toBe(576);

    const clampedOutOfBounds = clampMiloDragPosition({
      x: 1500,
      y: -40,
      viewportWidth: 390,
      viewportHeight: 844,
      dockSize: 64,
    });
    expect(clampedOutOfBounds.edge).toBe('right');
    expect(clampedOutOfBounds.left).toBe(312);
    expect(clampedOutOfBounds.top).toBe(68);

    fakeStorage.setItem(MILO_COMPANION_STORAGE_KEY, '{broken json');
    expect(loadMiloCompanionPrefs(fakeStorage)).toEqual(DEFAULT_MILO_COMPANION_PREFS);

    expect(getRouteMiloQuips('org', '/calculator').lines.length).toBeGreaterThan(0);
    expect(getRouteMiloQuips('study', '/past-papers').propVariant).toBe('pencil');
    expect(getRouteMiloQuips('flow', '/tasks').mood).toBe('focus');

    const dockHtml = renderToStaticMarkup(
      React.createElement(MiloCompanionDock, { app: 'study', pathname: '/curriculum' })
    );
    expect(dockHtml).toContain('data-testid="milo-companion-dock"');
    expect(dockHtml).toContain('data-testid="milo-dock-trigger"');
    expect(dockHtml).toContain('data-edge="right"');
    expect(dockHtml).toContain('data-dragging="false"');
    expect(dockHtml).toContain('data-variant="full"');
    expect(dockHtml).not.toContain('data-variant="avatar"');
  });
});
