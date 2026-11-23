import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AuthSessionBundle, UserRole } from '@ants/shared-types';
import {
  AuthGuard,
  AuthProvider,
  DEFAULT_BETA_API_URL,
  DEFAULT_LOCAL_API_URL,
  DEFAULT_PROD_API_URL,
  buildCrossSubdomainAppUrl,
  buildCrossSubdomainLoginUrl,
  computeRoleCapabilities,
  createAuthClient,
  evaluateRouteAccess,
  evaluateServerRouteAccess,
  getEcosystemRouteRequirement,
  getServerSession,
  resolveApiBaseUrl,
  resolveAppOrigin,
  resolvePostAuthRedirect,
  sanitizeRedirectTarget,
  useRole,
  useSession,
} from '../index';

function buildSampleSession(overrides?: {
  role?: UserRole;
  roles?: UserRole[];
  preferredApp?: 'flow' | 'study';
}): AuthSessionBundle {
  const role = overrides?.role ?? 'student';
  const roles = overrides?.roles ?? [role, 'student'];
  return {
    user: {
      id: 'usr_ants_01',
      name: 'Thaw Ye Zaw',
      email: 'thaw@the-ants.org',
      emailVerified: true,
      image: null,
      username: 'thawyezaw',
      role,
      roles,
      createdAt: '2026-11-21T16:00:00.000Z',
      updatedAt: '2026-11-21T16:00:00.000Z',
    },
    session: {
      id: 'ses_ants_01',
      userId: 'usr_ants_01',
      expiresAt: '2026-12-21T16:00:00.000Z',
      createdAt: '2026-11-21T16:00:00.000Z',
      updatedAt: '2026-11-21T16:00:00.000Z',
      ipAddress: null,
      userAgent: 'Vitest',
    },
    profile: {
      id: 'prof_ants_01',
      userId: 'usr_ants_01',
      username: 'thawyezaw',
      displayName: 'Thaw Ye Zaw',
      headline: 'IAL Scholar',
      bio: '',
      institution: 'The ANTs',
      curriculumLabel: 'Pearson Edexcel IAL',
      timezone: 'Asia/Yangon',
      preferredApp: overrides?.preferredApp ?? 'study',
      role,
      roles,
      xp: 420,
      streakDays: 9,
      telegramStatus: 'connected',
      isTutor: roles.includes('tutor'),
    },
  };
}

describe('@ants/auth-client — Cross-Subdomain Origin & Redirect Helpers [THAW-1.7]', () => {
  it('resolves API and app origins accurately between local dev and *.the-ants.org production', () => {
    expect(resolveApiBaseUrl(undefined, 'localhost')).toBe(DEFAULT_LOCAL_API_URL);
    expect(resolveApiBaseUrl(undefined, 'study.the-ants.org')).toBe(DEFAULT_PROD_API_URL);
    expect(resolveApiBaseUrl(undefined, 'ants-study.thawyezaw.workers.dev')).toBe(
      DEFAULT_BETA_API_URL
    );
    expect(resolveApiBaseUrl('https://staging-api.the-ants.org/')).toBe(
      'https://staging-api.the-ants.org'
    );

    expect(resolveAppOrigin('org', { currentHostname: 'localhost' })).toBe('http://localhost:3000');
    expect(resolveAppOrigin('study', { currentHostname: 'flow.the-ants.org' })).toBe(
      'https://study.the-ants.org'
    );
    expect(resolveAppOrigin('flow', { currentHostname: 'the-ants.org' })).toBe(
      'https://flow.the-ants.org'
    );
    expect(
      resolveAppOrigin('study', { currentHostname: 'ants-org.thawyezaw.workers.dev' })
    ).toBe('https://ants-study.thawyezaw.workers.dev');
    expect(buildCrossSubdomainAppUrl('study', '/past-papers', { currentHostname: 'localhost' })).toBe(
      'http://localhost:3001/past-papers'
    );
  });

  it('sanitizes ?redirect= targets across relative paths and trusted ecosystem origins while blocking attacks and loops', () => {
    expect(sanitizeRedirectTarget('/past-papers?tab=1#matrix')).toBe('/past-papers?tab=1#matrix');
    expect(sanitizeRedirectTarget('https://the-ants.org/admin')).toBe('https://the-ants.org/admin');
    expect(sanitizeRedirectTarget('https://study.the-ants.org/curriculum')).toBe(
      'https://study.the-ants.org/curriculum'
    );
    expect(sanitizeRedirectTarget('http://localhost:3000/admin')).toBe('http://localhost:3000/admin');

    // Reject untrusted external URLs, protocol-relative paths, dangerous schemes, and auth loops
    expect(sanitizeRedirectTarget('https://evil.example.com/phish')).toBe('/');
    expect(sanitizeRedirectTarget('http://the-ants.org.attacker.com/admin')).toBe('/');
    expect(sanitizeRedirectTarget('//evil.example.com')).toBe('/');
    expect(sanitizeRedirectTarget('/\\evil.example.com')).toBe('/');
    expect(sanitizeRedirectTarget('javascript:alert(1)')).toBe('/');
    expect(sanitizeRedirectTarget('/login?redirect=/tasks')).toBe('/');
    expect(sanitizeRedirectTarget('https://flow.the-ants.org/signup')).toBe('/');
  });

  it('builds cross-subdomain SSO bounce URLs and resolves post-auth destinations', () => {
    // org/admin -> flow.the-ants.org/login?redirect=https%3A%2F%2Fthe-ants.org%2Fadmin
    const prodBounce = buildCrossSubdomainLoginUrl({
      fromApp: 'org',
      targetPath: '/admin',
      currentHostname: 'the-ants.org',
    });
    expect(prodBounce).toBe(
      'https://flow.the-ants.org/login?redirect=https%3A%2F%2Fthe-ants.org%2Fadmin'
    );

    const localBounce = buildCrossSubdomainLoginUrl({
      fromApp: 'org',
      targetPath: '/cms',
      currentHostname: 'localhost',
    });
    expect(localBounce).toBe(
      'http://localhost:3002/login?redirect=http%3A%2F%2Flocalhost%3A3000%2Fcms'
    );

    const sameAppRelative = buildCrossSubdomainLoginUrl({
      fromApp: 'study',
      targetPath: '/curriculum?tab=topics',
      relativeIfSameApp: true,
    });
    expect(sameAppRelative).toBe('/login?redirect=%2Fcurriculum%3Ftab%3Dtopics');

    expect(
      resolvePostAuthRedirect({
        rawRedirect: 'https://the-ants.org/admin',
        currentApp: 'flow',
        preferredApp: 'study',
        currentHostname: 'flow.the-ants.org',
      })
    ).toBe('https://the-ants.org/admin');

    expect(
      resolvePostAuthRedirect({
        rawRedirect: 'https://evil.com',
        currentApp: 'flow',
        preferredApp: 'study',
        currentHostname: 'flow.the-ants.org',
      })
    ).toBe('https://study.the-ants.org/');
  });
});

describe('@ants/auth-client — Typed HTTP Client & Server Session Helper [THAW-1.7]', () => {
  it('performs credentialed getSession, strict email-only signInWithEmail, signUpWithEmail & signOut', async () => {
    const sampleSession = buildSampleSession({ role: 'tutor', roles: ['tutor', 'student'] });
    const calls: Array<{ url: string; method: string; credentials?: string; body?: string }> = [];

    const mockFetch: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({
        url,
        method: init?.method ?? 'GET',
        credentials: init?.credentials,
        body: typeof init?.body === 'string' ? init.body : undefined,
      });

      if (url.endsWith('/api/auth/get-session')) {
        return new Response(JSON.stringify({ ok: true, data: sampleSession }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/api/auth/sign-in/email')) {
        const parsed = JSON.parse(String(init?.body ?? '{}')) as { password?: string };
        if (parsed.password === 'WrongPassword!') {
          return new Response(
            JSON.stringify({
              ok: false,
              error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ ok: true, data: sampleSession }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/api/auth/sign-up/email')) {
        return new Response(JSON.stringify({ ok: true, data: sampleSession }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/api/auth/sign-out')) {
        return new Response(JSON.stringify({ ok: true, data: { signedOut: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('{}', { status: 404 });
    };

    const client = createAuthClient({
      baseUrl: 'https://api.the-ants.org',
      fetchImpl: mockFetch,
    });

    // Rejects @username client-side before sending HTTP request
    const invalidIdentifier = await client.signInWithEmail({
      email: '@thawyezaw',
      password: 'Password123!',
      rememberMe: true,
    });
    expect(invalidIdentifier.ok).toBe(false);
    if (!invalidIdentifier.ok) {
      expect(invalidIdentifier.error.code).toBe('VALIDATION_ERROR');
    }
    expect(calls).toHaveLength(0);

    // Server error returned cleanly
    const wrongPass = await client.signInWithEmail({
      email: 'thaw@the-ants.org',
      password: 'WrongPassword!',
      rememberMe: true,
    });
    expect(wrongPass.ok).toBe(false);
    if (!wrongPass.ok) {
      expect(wrongPass.error.code).toBe('INVALID_CREDENTIALS');
      expect(wrongPass.error.status).toBe(401);
    }

    // Valid sign-in sends credentials: 'include'
    const signIn = await client.signInWithEmail({
      email: 'THAW@the-ants.org',
      password: 'CorrectPassword123!',
      rememberMe: true,
    });
    expect(signIn.ok).toBe(true);
    expect(calls.at(-1)?.credentials).toBe('include');

    // Valid sign-up + getSession + signOut
    const signUp = await client.signUpWithEmail({
      name: 'Thaw Ye Zaw',
      email: 'thaw@the-ants.org',
      password: 'StrongPassword123!',
      academicTrack: 'tutor',
      rememberMe: true,
    });
    expect(signUp.ok).toBe(true);

    const fetched = await client.getSession();
    expect(fetched.ok).toBe(true);
    if (fetched.ok) {
      expect(fetched.data?.user.username).toBe('thawyezaw');
    }

    const signedOut = await client.signOut();
    expect(signedOut.ok).toBe(true);
  });

  it('short-circuits getServerSession when session cookie is missing and forwards cookie when present', async () => {
    const sampleSession = buildSampleSession({ role: 'admin', roles: ['admin', 'student'] });
    let networkCalls = 0;
    let forwardedCookie: string | null = null;

    const mockFetch: typeof fetch = async (_input, init) => {
      networkCalls += 1;
      forwardedCookie = new Headers(init?.headers).get('cookie');
      return new Response(JSON.stringify({ ok: true, data: sampleSession }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // No better-auth cookie -> zero network requests
    const guestResult = await getServerSession('ants_theme=dark', {
      baseUrl: 'http://localhost:8787',
      fetchImpl: mockFetch,
    });
    expect(guestResult).toBeNull();
    expect(networkCalls).toBe(0);

    // Cookie present via Next.js cookieStore-like object -> verifies against API
    const cookieStore = {
      get: (name: string) =>
        name === 'better-auth.session_token' ? { value: 'tok_raw.sig' } : undefined,
      getAll: () => [{ name: 'better-auth.session_token', value: 'tok_raw.sig' }],
    };

    const authedResult = await getServerSession(cookieStore, {
      baseUrl: 'http://localhost:8787',
      fetchImpl: mockFetch,
    });
    expect(networkCalls).toBe(1);
    expect(forwardedCookie).toBe('better-auth.session_token=tok_raw.sig');
    expect(authedResult?.user.role).toBe('admin');

    const verdict = evaluateServerRouteAccess(authedResult, {
      app: 'org',
      pathname: '/admin',
      currentHostname: 'the-ants.org',
    });
    expect(verdict.allowed).toBe(true);
    expect(verdict.capabilities.isAdmin).toBe(true);
  });
});

describe('@ants/auth-client — Roles, Access Matrix, Hooks & AuthGuard SSR [THAW-1.7]', () => {
  it('computes union capabilities and evaluates all 6 rows of the Access Matrix', () => {
    const contributorSession = buildSampleSession({
      role: 'tutor',
      roles: ['tutor', 'contributor', 'student'],
    });
    const caps = computeRoleCapabilities(contributorSession.user);
    expect(caps.isAuthenticated).toBe(true);
    expect(caps.isTutor).toBe(true);
    expect(caps.isContributor).toBe(true);
    expect(caps.isMainContributor).toBe(false);
    expect(caps.isAdmin).toBe(false);
    expect(caps.highestRole).toBe('contributor');
    expect(caps.meetsMinRole('tutor')).toBe(true);
    expect(caps.meetsMinRole('main_contributor')).toBe(false);

    // Access Matrix checks
    expect(getEcosystemRouteRequirement('org', '/calculator').requireAuth).toBe(false);
    expect(getEcosystemRouteRequirement('flow', '/pomodoro').requireAuth).toBe(false);
    expect(getEcosystemRouteRequirement('flow', '/timetable').previewOnlyForGuests).toBe(true);
    expect(getEcosystemRouteRequirement('flow', '/settings').requireAuth).toBe(true);
    expect(getEcosystemRouteRequirement('study', '/calculator').requireAuth).toBe(false);
    expect(getEcosystemRouteRequirement('study', '/past-papers').requireAuth).toBe(true);

    // Guest visiting org/admin gets bounced to Flow SSO login
    const adminGuestVerdict = evaluateRouteAccess({
      status: 'unauthenticated',
      user: null,
      app: 'org',
      pathname: '/admin',
      currentHostname: 'the-ants.org',
    });
    expect(adminGuestVerdict.status).toBe('unauthenticated');
    expect(adminGuestVerdict.loginUrl).toBe(
      'https://flow.the-ants.org/login?redirect=https%3A%2F%2Fthe-ants.org%2Fadmin'
    );

    // Contributor allowed on /cms, forbidden on /admin (requires main_contributor | admin)
    expect(
      evaluateRouteAccess({
        status: 'authenticated',
        user: contributorSession.user,
        app: 'org',
        pathname: '/cms',
      }).allowed
    ).toBe(true);

    const adminForbidden = evaluateRouteAccess({
      status: 'authenticated',
      user: contributorSession.user,
      app: 'org',
      pathname: '/admin',
    });
    expect(adminForbidden.status).toBe('forbidden');
    expect(adminForbidden.reason).toBe('missing-role');
  });

  it('renders AuthProvider, useSession, useRole, and AuthGuard cleanly across states during SSR', () => {
    function SessionAndRoleProbe() {
      const { status, user } = useSession();
      const { isContributor, isAdmin, highestRole } = useRole();
      return React.createElement(
        'div',
        { 'data-testid': 'probe' },
        `${status}|${user?.username ?? 'guest'}|contrib=${String(isContributor)}|admin=${String(isAdmin)}|highest=${highestRole ?? 'none'}`
      );
    }

    // 1. Authenticated contributor via initialSession
    const contribSession = buildSampleSession({
      role: 'contributor',
      roles: ['contributor', 'student'],
    });

    const contribHtml = renderToStaticMarkup(
      React.createElement(
        AuthProvider,
        { initialSession: contribSession, skipInitialFetch: true },
        React.createElement(
          AuthGuard,
          {
            app: 'org',
            pathname: '/cms',
            forbiddenFallback: React.createElement('span', null, 'DENIED_CMS'),
          },
          React.createElement(SessionAndRoleProbe)
        ),
        React.createElement(
          AuthGuard,
          {
            app: 'org',
            pathname: '/admin',
            forbiddenFallback: React.createElement('span', null, 'DENIED_ADMIN'),
          },
          React.createElement('span', null, 'ADMIN_SECRET')
        )
      )
    );

    expect(contribHtml).toContain('authenticated|thawyezaw|contrib=true|admin=false|highest=contributor');
    expect(contribHtml).toContain('DENIED_ADMIN');
    expect(contribHtml).not.toContain('ADMIN_SECRET');

    // 2. Guest unauthenticated state renders unauthenticatedFallback
    const guestHtml = renderToStaticMarkup(
      React.createElement(
        AuthProvider,
        { initialSession: null, skipInitialFetch: true },
        React.createElement(
          AuthGuard,
          {
            app: 'study',
            pathname: '/past-papers',
            unauthenticatedFallback: React.createElement('span', null, 'LOGIN_REQUIRED'),
          },
          React.createElement('span', null, 'STUDY_CONTENT')
        )
      )
    );
    expect(guestHtml).toContain('LOGIN_REQUIRED');
    expect(guestHtml).not.toContain('STUDY_CONTENT');
  });
});
