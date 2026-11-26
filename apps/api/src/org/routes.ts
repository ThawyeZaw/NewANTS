import { Hono } from 'hono';
import { getD1Binding, jsonApiError, type ApiRouteContext } from '../http/context';
import type { ApiBindings } from '../types';
import {
  OrgServiceError,
  loadOrgActivitiesFromD1,
  loadOrgActivityBySlugFromD1,
  loadOrgArticleBySlugFromD1,
  loadOrgArticlesFromD1,
  loadOrgHomeFromD1,
  loadOrgTeamFromD1,
  loadOrgTeamMemberByUsernameFromD1,
} from './service';

function handleOrgError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof OrgServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected organization API error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Hono router implementing public D1-backed showcase endpoints for `the-ants.org` (`[THAW-2.2]`):
 * `GET /home`, `GET /team`, `GET /team/:username`, `GET /activities`, `GET /activities/:slug`,
 * `GET /articles`, and `GET /articles/:slug`.
 */
export function createOrgRouter(): Hono<{ Bindings: ApiBindings }> {
  const org = new Hono<{ Bindings: ApiBindings }>();

  org.get('/home', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const data = await loadOrgHomeFromD1(db);
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleOrgError(c, err);
    }
  });

  org.get('/team', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const data = await loadOrgTeamFromD1(db, {
        role: c.req.query('role'),
        board: c.req.query('board'),
        q: c.req.query('q'),
      });
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleOrgError(c, err);
    }
  });

  org.get('/team/:username', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const username = c.req.param('username') ?? '';
      const data = await loadOrgTeamMemberByUsernameFromD1(db, username);
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleOrgError(c, err);
    }
  });

  org.get('/activities', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const data = await loadOrgActivitiesFromD1(db, {
        category: c.req.query('category'),
      });
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleOrgError(c, err);
    }
  });

  org.get('/activities/:slug', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const slug = c.req.param('slug') ?? '';
      const data = await loadOrgActivityBySlugFromD1(db, slug);
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleOrgError(c, err);
    }
  });

  org.get('/articles', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const data = await loadOrgArticlesFromD1(db, {
        category: c.req.query('category'),
      });
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleOrgError(c, err);
    }
  });

  org.get('/articles/:slug', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const slug = c.req.param('slug') ?? '';
      const data = await loadOrgArticleBySlugFromD1(db, slug);
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleOrgError(c, err);
    }
  });

  return org;
}
