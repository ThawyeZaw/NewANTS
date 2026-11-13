import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  AppSwitcher,
  AuthFormView,
  Badge,
  BrandHeaderBadge,
  Button,
  Card,
  Checkbox,
  cn,
  DesignSystemShowcaseView,
  Input,
  MOCK_ADMIN_USER,
  MOCK_AUTHENTICATED_USER,
  MOCK_DESIGN_SYSTEM_DATA,
  MOCK_ECOSYSTEM_APPS,
  Modal,
  NavigationProgressView,
  parseThemeCookieValue,
  persistThemeMode,
  readStoredThemeMode,
  ScrollReveal,
  serializeThemeCookieValue,
  Tabs,
  THEME_COOKIE_KEY,
  THEME_STORAGE_KEY,
  ThemeToggle,
  useSlidingIndicator,
  UserMenuView,
} from '../index';

describe('@ants/ui [ZYY-1.1] & [ZYY-1.2] Primitives & Ecosystem Chrome', () => {
  it('concatenates class names cleanly with cn()', () => {
    const isHidden = Boolean(0);
    expect(cn('bg-background', isHidden && 'hidden', undefined, 'text-foreground')).toBe(
      'bg-background text-foreground'
    );
  });

  it('exports all core [ZYY-1.1] presentational primitives', () => {
    expect(ThemeToggle).toBeDefined();
    expect(Button).toBeDefined();
    expect(Card).toBeDefined();
    expect(Badge).toBeDefined();
    expect(Input).toBeDefined();
    expect(Checkbox).toBeDefined();
    expect(Tabs).toBeDefined();
    expect(Modal).toBeDefined();
    expect(NavigationProgressView).toBeDefined();
    expect(ScrollReveal).toBeDefined();
    expect(DesignSystemShowcaseView).toBeDefined();
    expect(useSlidingIndicator).toBeDefined();
  });

  it('renders NavigationProgressView and ScrollReveal safely during SSR', () => {
    const progressHtml = renderToStaticMarkup(
      React.createElement(NavigationProgressView, {
        routeKey: '/hackathon',
        variant: 'showcase',
      })
    );
    expect(progressHtml).toContain('data-testid="navigation-route-curtain"');
    expect(progressHtml).toContain('data-testid="navigation-progress-bar"');
    expect(progressHtml).toContain('data-variant="showcase"');
    expect(progressHtml).toContain('data-phase="idle"');
    expect(progressHtml).toContain('data-state="idle"');
    expect(progressHtml).toContain('aria-hidden="true"');

    const revealHtml = renderToStaticMarkup(
      React.createElement(ScrollReveal, {
        as: 'section',
        delayMs: 80,
        children: React.createElement('p', null, 'Section copy'),
      })
    );
    expect(revealHtml).toContain('<section');
    expect(revealHtml).toContain('data-reveal-state="ready"');
    expect(revealHtml).toContain('--ants-reveal-delay:80ms');
    expect(revealHtml).toContain('Section copy');
  });

  it('defines sticky-safe motion tokens, gliding highlight rules, route curtains, and reduced-motion overrides in tokens.css', () => {
    const tokensPath = path.resolve(__dirname, '../styles/tokens.css');
    const css = fs.readFileSync(tokensPath, 'utf8');

    for (const token of [
      '--ease-out-expo',
      '--ease-spring',
      '--duration-route',
      '--duration-reveal',
      '--duration-workspace',
      '.ants-main-enter',
      '.ants-hero-enter',
      '.ants-clip-reveal',
      '.ants-stagger-item',
      '.ants-workspace-enter',
      '.ants-fade-enter',
      '.ants-modal-backdrop-in',
      '.ants-modal-panel-in',
      '.ants-drawer-right-in',
      '.ants-drawer-left-in',
      '.ants-bottom-sheet-in',
      '.ants-panel-enter',
      '.ants-card-interactive',
      '.ants-glide-indicator',
      '.ants-glide-host',
      '.ants-accordion',
      '.ants-accordion-inner',
      '.ants-reveal',
      '.ants-reveal-item',
      '.ants-route-bar',
      '.ants-route-bar-indicator',
      '.ants-route-curtain',
      '@media (prefers-reduced-motion: reduce)',
    ]) {
      expect(css).toContain(token);
    }

    // Gliding host hides static active fill across both direct children and grouped sidebars once measured
    expect(css).toMatch(/\.ants-glide-host\[data-gliding-ready='true'\]\s+\.ants-glide-item\[data-active='true'\]/);
    // Route curtains stay strictly non-blocking (`pointer-events: none`)
    expect(css).toMatch(/\.ants-route-curtain\s*\{[^}]*pointer-events:\s*none;/s);
    // Closed accordions isolate hidden controls from pointer & tab interaction
    expect(css).toMatch(/\.ants-accordion\s*\{[^}]*grid-template-rows:\s*0fr;[^}]*visibility:\s*hidden;[^}]*pointer-events:\s*none;/s);
    // Entry classes avoid sticky-breaking animation-fill-mode: forwards on .ants-main-enter
    expect(css).not.toContain('antsMainEnter var(--duration-route, 240ms) var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) forwards');
  });

  it('exports all [ZYY-1.2] ecosystem chrome views and mock fixtures', () => {
    expect(BrandHeaderBadge).toBeDefined();
    expect(AppSwitcher).toBeDefined();
    expect(AuthFormView).toBeDefined();
    expect(UserMenuView).toBeDefined();
    expect(MOCK_ECOSYSTEM_APPS).toHaveLength(3);
    expect(MOCK_AUTHENTICATED_USER.username).toBe('zaylynnhtet');
    expect(MOCK_AUTHENTICATED_USER.telegramConnected).toBe(false);
    expect(MOCK_ADMIN_USER.roles).toContain('admin');
    expect(MOCK_ADMIN_USER.telegramConnected).toBe(false);
  });

  it('provides realistic mock data for DesignSystemShowcaseView', () => {
    expect(MOCK_DESIGN_SYSTEM_DATA.systemNameLight).toBe('The ANTs Academic System');
    expect(MOCK_DESIGN_SYSTEM_DATA.systemNameDark).toBe('Amber Academic Studio');
    expect(MOCK_DESIGN_SYSTEM_DATA.sampleSubjects.length).toBeGreaterThan(0);
    expect(MOCK_DESIGN_SYSTEM_DATA.sampleChecklist.length).toBeGreaterThan(0);
  });

  it('syncs light/dark theme via shared .the-ants.org / localhost cookie + per-origin localStorage with light fallback', () => {
    expect(parseThemeCookieValue('')).toBeNull();
    expect(parseThemeCookieValue(`foo=1; ${THEME_COOKIE_KEY}=dark; bar=2`)).toBe('dark');
    expect(parseThemeCookieValue(`${THEME_COOKIE_KEY}=light`)).toBe('light');
    expect(parseThemeCookieValue(`${THEME_COOKIE_KEY}=system`)).toBeNull();

    const prodCookie = serializeThemeCookieValue('dark', 'study.the-ants.org');
    expect(prodCookie).toContain(`${THEME_COOKIE_KEY}=dark`);
    expect(prodCookie).toContain('Domain=.the-ants.org');
    expect(prodCookie).toContain('SameSite=Lax');

    const rootCookie = serializeThemeCookieValue('light', 'the-ants.org');
    expect(rootCookie).toContain(`${THEME_COOKIE_KEY}=light`);
    expect(rootCookie).toContain('Domain=.the-ants.org');

    const localCookie = serializeThemeCookieValue('dark', 'localhost');
    expect(localCookie).toContain(`${THEME_COOKIE_KEY}=dark`);
    expect(localCookie).not.toContain('Domain=');

    const storeMap = new Map<string, string>([[THEME_STORAGE_KEY, 'light']]);
    const memoryStorage = {
      getItem: (key: string) => storeMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storeMap.set(key, value);
      },
    };

    // Shared cookie wins over stale per-origin localStorage and updates it
    const resolvedFromCookie = readStoredThemeMode('light', {
      cookieString: `${THEME_COOKIE_KEY}=dark`,
      storage: memoryStorage,
    });
    expect(resolvedFromCookie).toBe('dark');
    expect(storeMap.get(THEME_STORAGE_KEY)).toBe('dark');

    // Empty cookie + empty storage falls back strictly to 'light'
    storeMap.clear();
    expect(
      readStoredThemeMode('light', {
        cookieString: '',
        storage: memoryStorage,
      })
    ).toBe('light');

    // persistThemeMode writes cleanly in Node without DOM globals
    expect(() =>
      persistThemeMode('dark', {
        storage: memoryStorage,
        skipCookie: true,
        skipTransition: true,
        dispatch: false,
      })
    ).not.toThrow();
    expect(storeMap.get(THEME_STORAGE_KEY)).toBe('dark');
  });
});
