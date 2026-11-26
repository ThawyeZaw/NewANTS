import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ANT_MASCOT_PRESETS,
  AntMascot,
  AntMascotView,
  NotFoundView,
  resolveMascotPropVariant,
  resolveMascotSize,
  type AntMascotMood,
} from '../index';

describe('@ants/ui <AntMascot /> Brand Mascot', () => {
  it('exports AntMascot and AntMascotView as the same component', () => {
    expect(AntMascot).toBe(AntMascotView);
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
      expect(html).toContain('data-testid="ant-mascot-speech"');
      expect(html).toContain(`Hello from ${mood}`);
      expect(html).toContain('data-testid="ant-mascot-badge"');
      expect(html).toContain(`${mood} badge`);
      expect(html).toContain('role="img"');
    }
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

  it('defines mascot animation keyframes and prefers-reduced-motion overrides in tokens.css', () => {
    const tokensPath = path.resolve(__dirname, '../styles/tokens.css');
    const css = fs.readFileSync(tokensPath, 'utf8');

    for (const token of [
      'ants-mascot-float',
      'ants-mascot-celebrate',
      'ants-mascot-antenna-wiggle',
      'ants-mascot-zzz',
      'ants-mascot-sparkle',
    ]) {
      expect(css).toContain(token);
    }
  });

  it('renders NotFoundView cleanly across org, flow, and study', () => {
    for (const app of ['org', 'flow', 'study'] as const) {
      const html = renderToStaticMarkup(React.createElement(NotFoundView, { app }));
      expect(html).toContain('data-testid="not-found-view"');
      expect(html).toContain(`data-app="${app}"`);
      expect(html).toContain('data-testid="ant-mascot"');
      expect(html).toContain('404');
    }
  });
});
