import { Hono } from 'hono';
import {
  AdminOrgActivityUpsertInputSchema,
  AdminOrgArticleUpsertInputSchema,
  AdminOrgSettingsUpdateInputSchema,
  AdminOrgTeamMemberUpsertInputSchema,
  AdminUserRolesUpdateInputSchema,
  hasAdminAccess,
  hasMainContributorAccess,
} from '@ants/shared-types';
import {
  jsonApiError,
  parseJsonBody,
  requireAuthenticatedSession,
  type ApiRouteContext,
} from '../http/context';
import type { ApiBindings } from '../types';
import {
  AdminServiceError,
  deleteAdminOrgActivity,
  deleteAdminOrgArticle,
  deleteAdminOrgTeamMember,
  listAdminUsersFromD1,
  loadAdminBootstrapFromD1,
  updateAdminOrgSettings,
  updateAdminUserRoles,
  upsertAdminOrgActivity,
  upsertAdminOrgArticle,
  upsertAdminOrgTeamMember,
} from './service';

function handleAdminError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof AdminServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected admin API error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

async function requireContentAdmin(c: ApiRouteContext) {
  const auth = await requireAuthenticatedSession(c);
  if (auth instanceof Response) return auth;
  if (!hasMainContributorAccess(auth.session.user.roles)) {
    return jsonApiError(
      c,
      403,
      'FORBIDDEN',
      'Only main contributors and platform admins can access Organization Admin CMS content.'
    );
  }
  return auth;
}

async function requireStrictAdmin(c: ApiRouteContext) {
  const auth = await requireAuthenticatedSession(c);
  if (auth instanceof Response) return auth;
  if (!hasAdminAccess(auth.session.user.roles)) {
    return jsonApiError(
      c,
      403,
      'FORBIDDEN',
      'Only platform admins can manage organization settings or user roles.'
    );
  }
  return auth;
}

/**
 * Hono router implementing `/api/admin/*` CMS & RBAC endpoints (`[THAW-2.3]`).
 */
export function createAdminRouter(): Hono<{ Bindings: ApiBindings }> {
  const admin = new Hono<{ Bindings: ApiBindings }>();

  admin.get('/bootstrap', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await loadAdminBootstrapFromD1(auth.db, auth.session.user.roles);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.put('/settings', async (c) => {
    const auth = await requireStrictAdmin(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminOrgSettingsUpdateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid organization settings payload.',
        parsed.error.flatten()
      );
    }

    try {
      const settings = await updateAdminOrgSettings(
        auth.db,
        auth.session.user.id,
        parsed.data
      );
      return c.json({ ok: true as const, data: settings }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.post('/team', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminOrgTeamMemberUpsertInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid team member payload.',
        parsed.error.flatten()
      );
    }

    try {
      const member = await upsertAdminOrgTeamMember(auth.db, parsed.data);
      return c.json({ ok: true as const, data: member }, 201);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.put('/team/:id', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminOrgTeamMemberUpsertInputSchema.safeParse({
      ...(rawBody && typeof rawBody === 'object' ? rawBody : {}),
      id,
    });
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid team member update payload.',
        parsed.error.flatten()
      );
    }

    try {
      const member = await upsertAdminOrgTeamMember(auth.db, parsed.data);
      return c.json({ ok: true as const, data: member }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.delete('/team/:id', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    try {
      const data = await deleteAdminOrgTeamMember(auth.db, id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.post('/activities', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminOrgActivityUpsertInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid activity payload.',
        parsed.error.flatten()
      );
    }

    try {
      const activity = await upsertAdminOrgActivity(auth.db, parsed.data);
      return c.json({ ok: true as const, data: activity }, 201);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.put('/activities/:id', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminOrgActivityUpsertInputSchema.safeParse({
      ...(rawBody && typeof rawBody === 'object' ? rawBody : {}),
      id,
    });
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid activity update payload.',
        parsed.error.flatten()
      );
    }

    try {
      const activity = await upsertAdminOrgActivity(auth.db, parsed.data);
      return c.json({ ok: true as const, data: activity }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.delete('/activities/:id', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    try {
      const data = await deleteAdminOrgActivity(auth.db, id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.post('/articles', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminOrgArticleUpsertInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid article payload.',
        parsed.error.flatten()
      );
    }

    try {
      const article = await upsertAdminOrgArticle(auth.db, parsed.data);
      return c.json({ ok: true as const, data: article }, 201);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.put('/articles/:id', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminOrgArticleUpsertInputSchema.safeParse({
      ...(rawBody && typeof rawBody === 'object' ? rawBody : {}),
      id,
    });
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid article update payload.',
        parsed.error.flatten()
      );
    }

    try {
      const article = await upsertAdminOrgArticle(auth.db, parsed.data);
      return c.json({ ok: true as const, data: article }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.delete('/articles/:id', async (c) => {
    const auth = await requireContentAdmin(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    try {
      const data = await deleteAdminOrgArticle(auth.db, id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.get('/users', async (c) => {
    const auth = await requireStrictAdmin(c);
    if (auth instanceof Response) return auth;
    try {
      const users = await listAdminUsersFromD1(auth.db);
      return c.json({ ok: true as const, data: users }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  admin.patch('/users/:userId/roles', async (c) => {
    const auth = await requireStrictAdmin(c);
    if (auth instanceof Response) return auth;
    const targetUserId = c.req.param('userId')?.trim() ?? '';
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = AdminUserRolesUpdateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid user role update payload.',
        parsed.error.flatten()
      );
    }

    try {
      const updatedUser = await updateAdminUserRoles(
        auth.db,
        auth.session.user.id,
        targetUserId,
        parsed.data
      );
      return c.json({ ok: true as const, data: updatedUser }, 200);
    } catch (err) {
      return handleAdminError(c, err);
    }
  });

  return admin;
}
