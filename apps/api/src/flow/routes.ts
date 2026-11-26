import { Hono } from 'hono';
import {
  FlowPomodoroSessionCreateInputSchema,
  FlowPomodoroSettingsDtoSchema,
  FlowTaskUpsertInputSchema,
  FlowTasksSyncInputSchema,
  FlowTimetableBlockUpsertInputSchema,
} from '@ants/shared-types';
import {
  jsonApiError,
  parseJsonBody,
  requireAuthenticatedSession,
  type ApiRouteContext,
} from '../http/context';
import type { ApiBindings } from '../types';
import {
  FlowServiceError,
  deleteFlowTask,
  deleteFlowTimetableBlock,
  listFlowTasks,
  loadFlowPomodoroState,
  loadFlowTimetableBootstrap,
  recordFlowPomodoroSession,
  saveFlowPomodoroSettings,
  syncFlowTasks,
  upsertFlowTask,
  upsertFlowTimetableBlock,
} from './service';

function handleFlowError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof FlowServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected Flow API error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Hono router implementing `/api/flow/*` authenticated productivity endpoints (`[THAW-3.1]`–`[THAW-3.3]`):
 * Pomodoro settings & XP sessions, Task Planner CRUD/sync, and Smart Timetable + Telegram Cron queue.
 */
export function createFlowRouter(): Hono<{ Bindings: ApiBindings }> {
  const flow = new Hono<{ Bindings: ApiBindings }>();

  flow.get('/pomodoro', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await loadFlowPomodoroState(auth.db, auth.session.user.id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.put('/pomodoro/settings', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = FlowPomodoroSettingsDtoSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid Pomodoro settings payload.',
        parsed.error.flatten()
      );
    }

    try {
      const settings = await saveFlowPomodoroSettings(
        auth.db,
        auth.session.user.id,
        parsed.data
      );
      return c.json({ ok: true as const, data: settings }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.post('/pomodoro/sessions', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = FlowPomodoroSessionCreateInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid Pomodoro session payload.',
        parsed.error.flatten()
      );
    }

    try {
      const result = await recordFlowPomodoroSession(
        auth.db,
        auth.session.user.id,
        parsed.data
      );
      return c.json(
        {
          ok: true as const,
          data: {
            ...result.session,
            xpAwarded: result.xpAwarded,
          },
        },
        201
      );
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.get('/tasks', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await listFlowTasks(auth.db, auth.session.user.id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.put('/tasks/sync', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = FlowTasksSyncInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid task sync payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await syncFlowTasks(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.post('/tasks', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = FlowTaskUpsertInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid task payload.',
        parsed.error.flatten()
      );
    }

    try {
      const task = await upsertFlowTask(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data: task }, 201);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.put('/tasks/:id', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = FlowTaskUpsertInputSchema.safeParse({
      ...(rawBody && typeof rawBody === 'object' ? rawBody : {}),
      id,
    });
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid task update payload.',
        parsed.error.flatten()
      );
    }

    try {
      const task = await upsertFlowTask(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data: task }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.delete('/tasks/:id', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    try {
      const data = await deleteFlowTask(auth.db, auth.session.user.id, id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.get('/timetable', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await loadFlowTimetableBootstrap(auth.db, auth.session.user.id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.post('/timetable/blocks', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = FlowTimetableBlockUpsertInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid timetable block payload.',
        parsed.error.flatten()
      );
    }

    try {
      const block = await upsertFlowTimetableBlock(
        auth.db,
        auth.session.user.id,
        parsed.data
      );
      return c.json({ ok: true as const, data: block }, 201);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.put('/timetable/blocks/:id', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = FlowTimetableBlockUpsertInputSchema.safeParse({
      ...(rawBody && typeof rawBody === 'object' ? rawBody : {}),
      id,
    });
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid timetable block update payload.',
        parsed.error.flatten()
      );
    }

    try {
      const block = await upsertFlowTimetableBlock(
        auth.db,
        auth.session.user.id,
        parsed.data
      );
      return c.json({ ok: true as const, data: block }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  flow.delete('/timetable/blocks/:id', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param('id')?.trim() ?? '';
    try {
      const data = await deleteFlowTimetableBlock(auth.db, auth.session.user.id, id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleFlowError(c, err);
    }
  });

  return flow;
}
