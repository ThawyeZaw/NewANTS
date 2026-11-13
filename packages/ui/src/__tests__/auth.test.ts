import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ANTS_SSO_COOKIE_KEY,
  AuthStudioView,
  CONTRIBUTOR_ROLES,
  MOCK_AUTHENTICATED_USER,
  MOCK_SHARED_PROFILES,
  WorkspaceAuthGateView,
  authenticateDemoPersona,
  authenticateOAuthProvider,
  authenticateSignIn,
  authenticateSignUp,
  createInitialAccountStorageState,
  evaluatePasswordStrength,
  getAccessMatrixPolicy,
  hasContributorRole,
  loadAccountStorageState,
  loadAuthSession,
  parseSsoCookieValue,
  sanitizeRedirectPath,
  saveAuthSession,
  serializeSsoCookieValue,
  signOutEverywhere,
  validateAuthEmail,
  validateSignInIdentifier,
} from '../index';

describe('@ants/ui Cross-Subdomain Authentication System & Access Matrix', () => {
  it('evaluates password strength, email format, and sign-in identifiers accurately', () => {
    expect(evaluatePasswordStrength('').score).toBe(0);
    expect(evaluatePasswordStrength('short1A').checks.minLength).toBe(false);
    expect(evaluatePasswordStrength('short1A').score).toBe(1);

    const strong = evaluatePasswordStrength('AntsStudio#2026');
    expect(strong.score).toBe(4);
    expect(strong.label).toBe('Strong');

    expect(validateAuthEmail('zay@the-ants.org')).toEqual({
      valid: true,
      normalized: 'zay@the-ants.org',
    });
    expect(validateAuthEmail('invalid-email').valid).toBe(false);

    expect(validateSignInIdentifier('@ZayLynnHtet')).toEqual({
      valid: true,
      kind: 'username',
      normalized: 'zaylynnhtet',
    });
    expect(validateSignInIdentifier('thaw@the-ants.org')).toEqual({
      valid: true,
      kind: 'email',
      normalized: 'thaw@the-ants.org',
    });
    expect(validateSignInIdentifier('ab').valid).toBe(false);
  });

  it('authenticates Sign In, Sign Up, Demo Personas, and OAuth providers deterministically', () => {
    const initialAccounts = createInitialAccountStorageState('zaylynnhtet');

    // Sign in by email or @username
    const signInByHandle = authenticateSignIn(
      {
        identifier: '@thawyezaw',
        password: 'password123',
        rememberMe: true,
      },
      initialAccounts
    );
    expect(signInByHandle.ok).toBe(true);
    expect(signInByHandle.session?.username).toBe('thawyezaw');
    expect(signInByHandle.session?.user?.roles).toContain('admin');

    // Rejects invalid sign-up (reserved route username & short password)
    const invalidSignUp = authenticateSignUp(
      {
        mode: 'signup',
        name: 'Aung Myat',
        username: 'settings',
        email: 'aung@the-ants.org',
        password: 'short',
        academicTrack: 'ial',
        rememberMe: true,
      },
      initialAccounts
    );
    expect(invalidSignUp.ok).toBe(false);
    expect(invalidSignUp.fieldErrors?.username).toBeDefined();
    expect(invalidSignUp.fieldErrors?.password).toBeDefined();

    // Registers a new unified account on /signup
    const validSignUp = authenticateSignUp(
      {
        mode: 'signup',
        name: 'Aung Myat',
        username: 'aung_ial',
        email: 'aung@the-ants.org',
        password: 'StrongPassword2026!',
        academicTrack: 'tutor',
        rememberMe: true,
      },
      initialAccounts
    );
    expect(validSignUp.ok).toBe(true);
    expect(validSignUp.session?.username).toBe('aung_ial');
    expect(validSignUp.session?.user?.roles).toEqual(['student', 'tutor']);
    expect(validSignUp.session?.customProfile?.username).toBe('aung_ial');
    expect(validSignUp.nextAccountState?.profilesByUsername.aung_ial?.name).toBe(
      'Aung Myat'
    );

    // Demo persona & OAuth handshakes
    const demoMinKhant = authenticateDemoPersona('minkhant', initialAccounts);
    expect(demoMinKhant.ok).toBe(true);
    expect(demoMinKhant.session?.user?.username).toBe('minkhant');

    const githubAuth = authenticateOAuthProvider('github', 'flow', initialAccounts);
    expect(githubAuth.ok).toBe(true);
    expect(githubAuth.session?.authMethod).toBe('github');
    expect(githubAuth.session?.user?.roles).toContain('admin');
  });

  it('serializes and syncs cross-port SSO cookies and hydrates custom signup accounts across apps', () => {
    const flowMemory = new Map<string, string>();
    const flowStorage = {
      getItem: (k: string) => flowMemory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        flowMemory.set(k, v);
      },
      removeItem: (k: string) => {
        flowMemory.delete(k);
      },
    };

    const studyMemory = new Map<string, string>();
    const studyStorage = {
      getItem: (k: string) => studyMemory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        studyMemory.set(k, v);
      },
      removeItem: (k: string) => {
        studyMemory.delete(k);
      },
    };

    // Create a brand-new account on Flow (:3002)
    const signUpRes = authenticateSignUp({
      mode: 'signup',
      name: 'May Thu',
      username: 'maythu_igcse',
      email: 'maythu@the-ants.org',
      password: 'MayThuPassword2026!',
      academicTrack: 'igcse',
      rememberMe: true,
    });
    expect(signUpRes.ok).toBe(true);
    const session = signUpRes.session!;

    saveAuthSession(session, {
      storage: flowStorage,
      accountState: signUpRes.nextAccountState,
      skipCookie: true,
    });

    const cookieString = serializeSsoCookieValue(session, 'flow.the-ants.org');
    expect(cookieString).toContain(`${ANTS_SSO_COOKIE_KEY}=`);
    expect(cookieString).toContain('Domain=.the-ants.org');

    const parsedCookie = parseSsoCookieValue(cookieString);
    expect(parsedCookie?.username).toBe('maythu_igcse');

    // Study (:3001) has a separate localStorage origin, but receives the shared cookie
    const loadedOnStudy = loadAuthSession({
      storage: studyStorage,
      cookieString,
    });
    expect(loadedOnStudy.status).toBe('authenticated');
    expect(loadedOnStudy.user?.username).toBe('maythu_igcse');
    expect(loadedOnStudy.user?.name).toBe('May Thu');

    // Custom profile is automatically hydrated into Study's account storage
    const studyAccounts = loadAccountStorageState(
      MOCK_SHARED_PROFILES,
      undefined,
      studyStorage
    );
    expect(studyAccounts?.activeUsername).toBe('maythu_igcse');
    expect(studyAccounts?.profilesByUsername.maythu_igcse?.email).toBe(
      'maythu@the-ants.org'
    );

    // Signing out sets status to 'guest' and user to null
    const guestSession = signOutEverywhere({
      storage: studyStorage,
      skipCookie: true,
    });
    expect(guestSession.status).toBe('guest');
    expect(guestSession.user).toBeNull();
  });

  it('enforces all 6 rows of the Strict Guest vs. Authenticated Access Matrix and sanitizes redirects', () => {
    expect(sanitizeRedirectPath('/curriculum?subject=0580', '/')).toBe(
      '/curriculum?subject=0580'
    );
    expect(sanitizeRedirectPath('https://evil.example.com', '/')).toBe('/');
    expect(sanitizeRedirectPath('//evil.example.com', '/')).toBe('/');
    expect(sanitizeRedirectPath('/login', '/timetable')).toBe('/timetable');
    expect(sanitizeRedirectPath('/signup?redirect=/tasks', '/timetable')).toBe(
      '/timetable'
    );

    // Row 1: the-ants.org Public Showcase (+ /admin & restricted /cms)
    expect(getAccessMatrixPolicy('org', '/').guestAccess).toBe('public');
    expect(getAccessMatrixPolicy('org', '/team').requiresLogin).toBe(false);
    expect(getAccessMatrixPolicy('org', '/admin').requiresLogin).toBe(true);
    expect(getAccessMatrixPolicy('org', '/admin').requiredRoles).toEqual([
      'admin',
      'main_contributor',
    ]);
    expect(getAccessMatrixPolicy('org', '/cms').requiresLogin).toBe(true);
    expect(getAccessMatrixPolicy('org', '/cms').requiredRoles).toEqual([
      'contributor',
      'main_contributor',
      'admin',
    ]);
    expect(CONTRIBUTOR_ROLES).toEqual(['contributor', 'main_contributor', 'admin']);
    expect(
      hasContributorRole({
        id: '1',
        name: 'Zay',
        username: 'zay',
        email: 'zay@the-ants.org',
        role: 'tutor',
        roles: ['tutor', 'contributor'],
        xp: 100,
        streakDays: 5,
        telegramConnected: false,
      })
    ).toBe(true);
    expect(
      hasContributorRole({
        id: '2',
        name: 'Min',
        username: 'minkhant',
        email: 'min@the-ants.org',
        role: 'student',
        roles: ['student'],
        xp: 50,
        streakDays: 1,
        telegramConnected: false,
      })
    ).toBe(false);

    // Row 2: /calculator on both org and study -> 100% Usable Without Login
    expect(getAccessMatrixPolicy('org', '/calculator').guestAccess).toBe(
      'guest-usable'
    );
    expect(getAccessMatrixPolicy('org', '/calculator').requiresLogin).toBe(false);
    expect(getAccessMatrixPolicy('study', '/calculator').guestAccess).toBe(
      'guest-usable'
    );
    expect(getAccessMatrixPolicy('study', '/calculator').requiresLogin).toBe(false);

    // Row 3: flow.the-ants.org/pomodoro -> 100% Usable Without Login
    expect(getAccessMatrixPolicy('flow', '/pomodoro').guestAccess).toBe(
      'guest-usable'
    );
    expect(getAccessMatrixPolicy('flow', '/pomodoro').requiresLogin).toBe(false);

    // Row 4: /login & /signup on Flow and Study -> Shared SSO views
    expect(getAccessMatrixPolicy('flow', '/login').guestAccess).toBe('sso-auth');
    expect(getAccessMatrixPolicy('study', '/signup').guestAccess).toBe('sso-auth');

    // Row 5: flow.the-ants.org (/timetable, /tasks -> prototype-preview; /settings -> login-gate)
    expect(getAccessMatrixPolicy('flow', '/timetable').guestAccess).toBe(
      'prototype-preview'
    );
    expect(getAccessMatrixPolicy('flow', '/tasks').guestAccess).toBe(
      'prototype-preview'
    );
    expect(getAccessMatrixPolicy('flow', '/settings').guestAccess).toBe(
      'login-gate'
    );
    expect(getAccessMatrixPolicy('flow', '/settings').requiresLogin).toBe(true);

    // Row 6: study.the-ants.org (/, /curriculum, /past-papers, /settings -> login-gate)
    expect(getAccessMatrixPolicy('study', '/').guestAccess).toBe('login-gate');
    expect(getAccessMatrixPolicy('study', '/curriculum').requiresLogin).toBe(true);
    expect(getAccessMatrixPolicy('study', '/past-papers').requiresLogin).toBe(true);
    expect(getAccessMatrixPolicy('study', '/settings').requiresLogin).toBe(true);
  });

  it('renders AuthStudioView, AuthFormView, and WorkspaceAuthGateView cleanly during SSR', () => {
    const studioHtml = renderToStaticMarkup(
      React.createElement(AuthStudioView, {
        app: 'flow',
        mode: 'signup',
        activeUser: MOCK_AUTHENTICATED_USER,
        redirectTo: '/tasks',
      })
    );
    expect(studioHtml).toContain('Create your unified ANTs account');
    expect(studioHtml).toContain('Sync schedules, tasks &amp; study in one place.');
    expect(studioHtml).toContain('data-testid="auth-showcase-video"');
    expect(studioHtml).toContain('<video');
    expect(studioHtml).toContain('Timetable &amp; Tasks');
    expect(studioHtml).toContain('@TheANTsFlowBot Cron');
    expect(studioHtml).toContain('Study SSO Bridge');
    expect(studioHtml).toContain('data-testid="active-sso-session-banner"');
    expect(studioHtml).toContain('/calculator');
    expect(studioHtml).toContain('/pomodoro');

    const studyStudioHtml = renderToStaticMarkup(
      React.createElement(AuthStudioView, {
        app: 'study',
        mode: 'login',
      })
    );
    expect(studyStudioHtml).toContain('Track topics, past papers &amp; exam countdowns.');
    expect(studyStudioHtml).toContain('WMA11-SET Mastery');
    expect(studyStudioHtml).toContain('Past Paper UMS');
    expect(studyStudioHtml).toContain('Flow Sprint Sync');

    const gateHtml = renderToStaticMarkup(
      React.createElement(WorkspaceAuthGateView, {
        variant: 'gate',
        app: 'study',
        routePath: '/past-papers',
        onResumeDemoPersona: () => undefined,
      })
    );
    expect(gateHtml).toContain('data-testid="workspace-auth-login-gate"');
    expect(gateHtml).toContain('data-route="/past-papers"');
    expect(gateHtml).toContain('Topic Mastery');
    expect(gateHtml).toContain('Paper UMS');
    expect(gateHtml).toContain('Countdowns');
    expect(gateHtml).toContain('Instant Demo');
    expect(gateHtml).toContain('Open Without Login');

    const bannerHtml = renderToStaticMarkup(
      React.createElement(WorkspaceAuthGateView, {
        variant: 'banner',
        app: 'flow',
        routePath: '/timetable',
      })
    );
    expect(bannerHtml).toContain('data-testid="guest-prototype-preview-banner"');
    expect(bannerHtml).toContain('Guest Preview');
    expect(bannerHtml).toContain('/timetable');
  });
});
