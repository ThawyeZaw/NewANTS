import { Hono } from 'hono';
import {
  CalculatorCalculateInputSchema,
  EdexcelMathsSuiteCalculateInputSchema,
  GradeCalculationSnapshotSchema,
} from '@ants/shared-types';
import {
  getD1Binding,
  jsonApiError,
  parseJsonBody,
  requireAuthenticatedSession,
  type ApiRouteContext,
} from '../http/context';
import type { ApiBindings } from '../types';
import {
  CalculatorServiceError,
  calculateEdexcelMathsSuiteFromD1,
  calculateFromD1,
  deleteUserGradeSnapshot,
  listUserGradeSnapshots,
  loadCalculatorCatalogFromD1,
  loadCalculatorSubjectByIdFromD1,
  saveUserGradeSnapshot,
} from './service';

function handleCalculatorError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof CalculatorServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected calculator API error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Hono router implementing `/api/calculator/*` public D1 catalog & calculation endpoints
 * plus authenticated `grade_entries` snapshot persistence routes.
 */
export function createCalculatorRouter(): Hono<{ Bindings: ApiBindings }> {
  const calculator = new Hono<{ Bindings: ApiBindings }>();

  calculator.get('/catalog', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    try {
      const boardId = c.req.query('boardId');
      const seriesId = c.req.query('seriesId');
      const data = await loadCalculatorCatalogFromD1(db, { boardId, seriesId });
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json(
        {
          ok: true as const,
          data,
        },
        200
      );
    } catch (err) {
      return handleCalculatorError(c, err);
    }
  });

  calculator.get('/subjects/:subjectId', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    const subjectId = c.req.param('subjectId')?.trim() ?? '';
    if (!subjectId) {
      return jsonApiError(c, 400, 'INVALID_SUBJECT_ID', 'Subject id is required.');
    }

    try {
      const data = await loadCalculatorSubjectByIdFromD1(db, subjectId);
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return c.json(
        {
          ok: true as const,
          data,
        },
        200
      );
    } catch (err) {
      return handleCalculatorError(c, err);
    }
  });

  calculator.post('/calculate', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = CalculatorCalculateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? 'Invalid calculation request payload.';
      return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
    }

    try {
      const data = await calculateFromD1(db, parsed.data);
      return c.json(
        {
          ok: true as const,
          data,
        },
        200
      );
    } catch (err) {
      return handleCalculatorError(c, err);
    }
  });

  calculator.post('/calculate-maths-suite', async (c) => {
    const db = getD1Binding(c);
    if (db instanceof Response) return db;

    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = EdexcelMathsSuiteCalculateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg =
        parsed.error.issues[0]?.message ?? 'Invalid Edexcel Maths Suite request payload.';
      return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
    }

    try {
      const data = await calculateEdexcelMathsSuiteFromD1(db, parsed.data);
      return c.json(
        {
          ok: true as const,
          data,
        },
        200
      );
    } catch (err) {
      return handleCalculatorError(c, err);
    }
  });

  calculator.get('/snapshots', async (c) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    const rawLimit = c.req.query('limit');
    const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 25;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 25;

    try {
      const data = await listUserGradeSnapshots(authResult.db, authResult.session.user.id, limit);
      return c.json(
        {
          ok: true as const,
          data,
        },
        200
      );
    } catch (err) {
      return handleCalculatorError(c, err);
    }
  });

  calculator.post('/snapshots', async (c) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = GradeCalculationSnapshotSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstMsg = parsed.error.issues[0]?.message ?? 'Invalid grade snapshot payload.';
      return jsonApiError(c, 400, 'VALIDATION_ERROR', firstMsg, parsed.error.flatten());
    }

    try {
      const saved = await saveUserGradeSnapshot(
        authResult.db,
        authResult.session.user.id,
        parsed.data
      );
      return c.json(
        {
          ok: true as const,
          data: saved,
        },
        201
      );
    } catch (err) {
      return handleCalculatorError(c, err);
    }
  });

  calculator.delete('/snapshots/:id', async (c) => {
    const authResult = await requireAuthenticatedSession(c);
    if (authResult instanceof Response) return authResult;

    const snapshotId = c.req.param('id')?.trim() ?? '';
    if (!snapshotId) {
      return jsonApiError(c, 400, 'INVALID_SNAPSHOT_ID', 'Snapshot id is required.');
    }

    try {
      const deleted = await deleteUserGradeSnapshot(
        authResult.db,
        authResult.session.user.id,
        snapshotId
      );
      if (!deleted) {
        return jsonApiError(
          c,
          404,
          'SNAPSHOT_NOT_FOUND',
          `Grade snapshot '${snapshotId}' was not found.`
        );
      }

      return c.json(
        {
          ok: true as const,
          data: {
            deletedId: snapshotId,
          },
        },
        200
      );
    } catch (err) {
      return handleCalculatorError(c, err);
    }
  });

  return calculator;
}
