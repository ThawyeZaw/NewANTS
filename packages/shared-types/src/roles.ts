import { z } from 'zod';

/**
 * Canonical multi-role permission hierarchy across The ANTs ecosystem.
 * Accounts carry a primary `role` and a union `roles` JSON array in D1.
 */
export const USER_ROLES = [
  'student',
  'tutor',
  'teacher',
  'contributor',
  'main_contributor',
  'admin',
] as const;

export const UserRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const EDUCATOR_ROLES = ['tutor', 'teacher'] as const satisfies readonly UserRole[];
export const CONTRIBUTOR_ROLES = [
  'contributor',
  'main_contributor',
  'admin',
] as const satisfies readonly UserRole[];
export const MAIN_CONTRIBUTOR_ROLES = [
  'main_contributor',
  'admin',
] as const satisfies readonly UserRole[];
export const ADMIN_ROLES = ['admin'] as const satisfies readonly UserRole[];

export const ROLE_HIERARCHY_WEIGHT: Record<UserRole, number> = {
  student: 10,
  tutor: 20,
  teacher: 20,
  contributor: 30,
  main_contributor: 40,
  admin: 50,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  tutor: 'Tutor',
  teacher: 'Teacher',
  contributor: 'Contributor',
  main_contributor: 'Main Contributor',
  admin: 'Admin',
};

/**
 * Normalizes a primary role + roles array into a deduplicated array
 * always containing at least `'student'` (unless an explicit primary role
 * replaces it first, while keeping `'student'` baseline union capability).
 */
export function normalizeUserRoles(
  primaryRole?: UserRole | null,
  rolesList?: readonly UserRole[] | null
): UserRole[] {
  const ordered: UserRole[] = [];
  const pushUnique = (role: UserRole | null | undefined) => {
    if (role && !ordered.includes(role)) {
      ordered.push(role);
    }
  };

  pushUnique(primaryRole);
  if (rolesList) {
    for (const r of rolesList) {
      pushUnique(r);
    }
  }
  pushUnique('student');

  return ordered;
}

/**
 * Safely parses a D1 JSON string `roles` column (e.g. `'["student","tutor"]'`)
 * into validated `UserRole[]`, never throwing on malformed or null DB values.
 */
export function parseRolesJson(
  raw: string | null | undefined,
  fallbackRole: UserRole = 'student'
): UserRole[] {
  if (!raw || raw.trim().length === 0) {
    return normalizeUserRoles(fallbackRole, null);
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    const validated = z.array(UserRoleSchema).safeParse(parsed);
    if (validated.success && validated.data.length > 0) {
      return normalizeUserRoles(fallbackRole, validated.data);
    }
  } catch {
    // Fall back safely when raw JSON is corrupt
  }

  return normalizeUserRoles(fallbackRole, null);
}

/**
 * Serializes normalized `UserRole[]` for persistence into D1 text columns.
 */
export function serializeRolesJson(roles: readonly UserRole[]): string {
  const normalized = normalizeUserRoles(roles[0] ?? 'student', roles);
  return JSON.stringify(normalized);
}

export function hasRole(userRoles: readonly UserRole[], target: UserRole): boolean {
  return userRoles.includes(target);
}

export function hasAnyRole(
  userRoles: readonly UserRole[],
  allowed: readonly UserRole[]
): boolean {
  return allowed.some((role) => userRoles.includes(role));
}

export function isEducatorRole(userRoles: readonly UserRole[]): boolean {
  return hasAnyRole(userRoles, EDUCATOR_ROLES);
}

export function hasContributorAccess(userRoles: readonly UserRole[]): boolean {
  return hasAnyRole(userRoles, CONTRIBUTOR_ROLES);
}

export function hasMainContributorAccess(userRoles: readonly UserRole[]): boolean {
  return hasAnyRole(userRoles, MAIN_CONTRIBUTOR_ROLES);
}

export function hasAdminAccess(userRoles: readonly UserRole[]): boolean {
  return hasAnyRole(userRoles, ADMIN_ROLES);
}
