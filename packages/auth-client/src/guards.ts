import {
  CONTRIBUTOR_ROLES,
  MAIN_CONTRIBUTOR_ROLES,
  ROLE_HIERARCHY_WEIGHT,
  hasAdminAccess,
  hasAnyRole as sharedHasAnyRole,
  hasContributorAccess,
  hasMainContributorAccess,
  hasRole as sharedHasRole,
  isEducatorRole,
  normalizeUserRoles,
  type AuthUserDto,
  type EcosystemAppId,
  type UserRole,
} from '@ants/shared-types';
import { buildCrossSubdomainLoginUrl, type ResolveAppOriginOptions } from './redirects';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface RoleCapabilities {
  roles: UserRole[];
  primaryRole: UserRole | null;
  highestRole: UserRole | null;
  isAuthenticated: boolean;
  isStudent: boolean;
  isTutor: boolean;
  isTeacher: boolean;
  isEducator: boolean;
  isContributor: boolean;
  isMainContributor: boolean;
  isAdmin: boolean;
  hasRole: (target: UserRole) => boolean;
  hasAnyRole: (allowed: readonly UserRole[]) => boolean;
  hasAllRoles: (required: readonly UserRole[]) => boolean;
  meetsMinRole: (minRole: UserRole) => boolean;
}

export interface EcosystemRouteRequirement {
  app: EcosystemAppId;
  pathname: string;
  requireAuth: boolean;
  allowedRoles?: readonly UserRole[];
  previewOnlyForGuests: boolean;
  guestAccess: 'public' | 'guest-usable' | 'prototype-preview' | 'login-gate' | 'sso-auth';
}

export interface EvaluateRouteAccessOptions extends ResolveAppOriginOptions {
  status: SessionStatus;
  user: AuthUserDto | null;
  app?: EcosystemAppId;
  pathname?: string;
  requireAuth?: boolean;
  allowedRoles?: readonly UserRole[];
  minRole?: UserRole;
  authApp?: 'flow' | 'study';
  relativeLoginIfSameApp?: boolean;
}

export type RouteAccessStatus = 'loading' | 'allowed' | 'unauthenticated' | 'forbidden';

export interface RouteAccessVerdict {
  status: RouteAccessStatus;
  allowed: boolean;
  reason: 'loading' | 'ok' | 'unauthenticated' | 'missing-role' | 'insufficient-role-weight';
  capabilities: RoleCapabilities;
  previewOnly: boolean;
  loginUrl: string | null;
  missingRoles?: UserRole[];
  requiredMinRole?: UserRole;
}

function resolveHighestRole(roles: readonly UserRole[]): UserRole | null {
  let highest: UserRole | null = null;
  let maxWeight = -1;
  for (const role of roles) {
    const weight = ROLE_HIERARCHY_WEIGHT[role];
    if (weight > maxWeight) {
      maxWeight = weight;
      highest = role;
    }
  }
  return highest;
}

/**
 * Computes union permissions across all roles assigned to an ANTs user.
 */
export function computeRoleCapabilities(
  userOrRoles: AuthUserDto | readonly UserRole[] | null | undefined
): RoleCapabilities {
  if (!userOrRoles) {
    return {
      roles: [],
      primaryRole: null,
      highestRole: null,
      isAuthenticated: false,
      isStudent: false,
      isTutor: false,
      isTeacher: false,
      isEducator: false,
      isContributor: false,
      isMainContributor: false,
      isAdmin: false,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false,
      meetsMinRole: () => false,
    };
  }

  const roles = Array.isArray(userOrRoles)
    ? normalizeUserRoles(userOrRoles[0] ?? 'student', userOrRoles)
    : normalizeUserRoles((userOrRoles as AuthUserDto).role, (userOrRoles as AuthUserDto).roles);

  const primaryRole = Array.isArray(userOrRoles)
    ? (roles[0] ?? null)
    : (userOrRoles as AuthUserDto).role;
  const highestRole = resolveHighestRole(roles);
  const maxWeight = highestRole ? ROLE_HIERARCHY_WEIGHT[highestRole] : 0;

  return {
    roles,
    primaryRole,
    highestRole,
    isAuthenticated: true,
    isStudent: sharedHasRole(roles, 'student'),
    isTutor: sharedHasRole(roles, 'tutor'),
    isTeacher: sharedHasRole(roles, 'teacher'),
    isEducator: isEducatorRole(roles),
    isContributor: hasContributorAccess(roles),
    isMainContributor: hasMainContributorAccess(roles),
    isAdmin: hasAdminAccess(roles),
    hasRole: (target) => sharedHasRole(roles, target),
    hasAnyRole: (allowed) => sharedHasAnyRole(roles, allowed),
    hasAllRoles: (required) => required.every((role) => sharedHasRole(roles, role)),
    meetsMinRole: (minRole) => maxWeight >= ROLE_HIERARCHY_WEIGHT[minRole],
  };
}

function normalizePathname(rawPath: string): string {
  const withoutQuery = (rawPath.split('?')[0] ?? '/').split('#')[0] ?? '/';
  const cleaned = withoutQuery.trim().replace(/\/+$/, '');
  return (cleaned || '/').toLowerCase();
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Resolves the canonical Guest vs. Authenticated Access Matrix rule (`spec.md` §4)
 * for any ecosystem app + pathname pair.
 */
export function getEcosystemRouteRequirement(
  app: EcosystemAppId,
  rawPathname: string
): EcosystemRouteRequirement {
  const pathname = normalizePathname(rawPathname);

  if (app === 'org') {
    if (matchesPrefix(pathname, '/admin')) {
      return {
        app,
        pathname,
        requireAuth: true,
        allowedRoles: MAIN_CONTRIBUTOR_ROLES,
        previewOnlyForGuests: false,
        guestAccess: 'login-gate',
      };
    }
    if (matchesPrefix(pathname, '/cms')) {
      return {
        app,
        pathname,
        requireAuth: true,
        allowedRoles: CONTRIBUTOR_ROLES,
        previewOnlyForGuests: false,
        guestAccess: 'login-gate',
      };
    }
    if (matchesPrefix(pathname, '/calculator')) {
      return {
        app,
        pathname,
        requireAuth: false,
        previewOnlyForGuests: false,
        guestAccess: 'guest-usable',
      };
    }
    return {
      app,
      pathname,
      requireAuth: false,
      previewOnlyForGuests: false,
      guestAccess: 'public',
    };
  }

  if (app === 'flow') {
    if (matchesPrefix(pathname, '/pomodoro')) {
      return {
        app,
        pathname,
        requireAuth: false,
        previewOnlyForGuests: false,
        guestAccess: 'guest-usable',
      };
    }
    if (matchesPrefix(pathname, '/login') || matchesPrefix(pathname, '/signup')) {
      return {
        app,
        pathname,
        requireAuth: false,
        previewOnlyForGuests: false,
        guestAccess: 'sso-auth',
      };
    }
    if (pathname.startsWith('/@')) {
      return {
        app,
        pathname,
        requireAuth: false,
        previewOnlyForGuests: false,
        guestAccess: 'public',
      };
    }
    if (matchesPrefix(pathname, '/settings')) {
      return {
        app,
        pathname,
        requireAuth: true,
        previewOnlyForGuests: false,
        guestAccess: 'login-gate',
      };
    }
    if (
      pathname === '/' ||
      matchesPrefix(pathname, '/timetable') ||
      matchesPrefix(pathname, '/tasks')
    ) {
      return {
        app,
        pathname,
        requireAuth: false,
        previewOnlyForGuests: true,
        guestAccess: 'prototype-preview',
      };
    }
    return {
      app,
      pathname,
      requireAuth: true,
      previewOnlyForGuests: false,
      guestAccess: 'login-gate',
    };
  }

  // `study`
  if (matchesPrefix(pathname, '/calculator')) {
    return {
      app,
      pathname,
      requireAuth: false,
      previewOnlyForGuests: false,
      guestAccess: 'guest-usable',
    };
  }
  if (matchesPrefix(pathname, '/login') || matchesPrefix(pathname, '/signup')) {
    return {
      app,
      pathname,
      requireAuth: false,
      previewOnlyForGuests: false,
      guestAccess: 'sso-auth',
    };
  }
  if (matchesPrefix(pathname, '/studio')) {
    return {
      app,
      pathname,
      requireAuth: true,
      allowedRoles: CONTRIBUTOR_ROLES,
      previewOnlyForGuests: false,
      guestAccess: 'login-gate',
    };
  }
  return {
    app,
    pathname,
    requireAuth: true,
    previewOnlyForGuests: false,
    guestAccess: 'login-gate',
  };
}

/**
 * Evaluates session status, role authorization, and cross-subdomain SSO login redirects.
 */
export function evaluateRouteAccess(options: EvaluateRouteAccessOptions): RouteAccessVerdict {
  const requirement =
    options.app && options.pathname
      ? getEcosystemRouteRequirement(options.app, options.pathname)
      : null;

  const effectiveAllowedRoles = options.allowedRoles ?? requirement?.allowedRoles;
  const effectiveRequireAuth =
    options.requireAuth ??
    (requirement?.requireAuth || Boolean(effectiveAllowedRoles?.length) || Boolean(options.minRole));

  const capabilities = computeRoleCapabilities(
    options.status === 'authenticated' ? options.user : null
  );

  if (options.status === 'loading') {
    return {
      status: 'loading',
      allowed: false,
      reason: 'loading',
      capabilities,
      previewOnly: false,
      loginUrl: null,
    };
  }

  if (!effectiveRequireAuth) {
    return {
      status: 'allowed',
      allowed: true,
      reason: 'ok',
      capabilities,
      previewOnly: Boolean(requirement?.previewOnlyForGuests && !capabilities.isAuthenticated),
      loginUrl: null,
    };
  }

  if (!capabilities.isAuthenticated) {
    const loginUrl = buildCrossSubdomainLoginUrl({
      fromApp: options.app ?? 'flow',
      targetPath: options.pathname ?? '/',
      authApp: options.authApp,
      relativeIfSameApp: options.relativeLoginIfSameApp,
      currentHostname: options.currentHostname,
      envOverrides: options.envOverrides,
    });
    return {
      status: 'unauthenticated',
      allowed: false,
      reason: 'unauthenticated',
      capabilities,
      previewOnly: false,
      loginUrl,
    };
  }

  if (effectiveAllowedRoles && effectiveAllowedRoles.length > 0) {
    if (!capabilities.hasAnyRole(effectiveAllowedRoles)) {
      return {
        status: 'forbidden',
        allowed: false,
        reason: 'missing-role',
        capabilities,
        previewOnly: false,
        loginUrl: null,
        missingRoles: [...effectiveAllowedRoles],
      };
    }
  }

  if (options.minRole && !capabilities.meetsMinRole(options.minRole)) {
    return {
      status: 'forbidden',
      allowed: false,
      reason: 'insufficient-role-weight',
      capabilities,
      previewOnly: false,
      loginUrl: null,
      requiredMinRole: options.minRole,
    };
  }

  return {
    status: 'allowed',
    allowed: true,
    reason: 'ok',
    capabilities,
    previewOnly: false,
    loginUrl: null,
  };
}
