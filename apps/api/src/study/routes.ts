import { Hono } from 'hono';
import {
  StudyCheckInSubjectInputSchema,
  StudyLeaderboardVisibilityInputSchema,
  StudyLogPastPaperAttemptInputSchema,
  StudySaveCountdownInputSchema,
  StudyToggleEnrollmentInputSchema,
  StudyUpdateBoardInputSchema,
  StudyUpdateCountdownFlagsInputSchema,
  StudyUpdateMathsSuiteInputSchema,
  StudyUpdateTargetGradeInputSchema,
  StudyUpsertTopicProgressInputSchema,
} from '@ants/shared-types';
import {
  jsonApiError,
  parseJsonBody,
  requireAuthenticatedSession,
  type ApiRouteContext,
} from '../http/context';
import type { ApiBindings } from '../types';
import {
  StudyServiceError,
  deleteStudyCountdown,
  deleteStudyPastPaperAttempt,
  getStudyCatalog,
  getStudyCountdownsState,
  getStudyDashboardState,
  getStudyLeaderboard,
  getStudyPastPapersState,
  getStudyTopicsState,
  logStudyPastPaperAttempt,
  saveStudyCountdown,
  toggleStudySubjectCheckIn,
  toggleStudySubjectEnrollment,
  updateStudyActiveBoard,
  updateStudyCountdownFlags,
  updateStudyLeaderboardVisibility,
  updateStudyMathsSuite,
  updateStudySubjectTargetGrade,
  upsertStudyTopicProgress,
} from './service';

function handleStudyError(c: ApiRouteContext, err: unknown): Response {
  if (err instanceof StudyServiceError) {
    return jsonApiError(c, err.status, err.code, err.message);
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Unexpected Study API error.';
  return jsonApiError(c, 500, 'INTERNAL_SERVER_ERROR', message);
}

/**
 * Hono router implementing strictly authenticated `/api/study/*` endpoints
 * across Curriculum/WMA11-SET (`[THAW-4.1]`), Topic Tracker (`[THAW-4.2]`),
 * Past Papers (`[THAW-4.3]`), Exam Countdown (`[THAW-4.4]`), and Dashboard/Leaderboard (`[THAW-4.5]`).
 */
export function createStudyRouter(): Hono<{ Bindings: ApiBindings }> {
  const study = new Hono<{ Bindings: ApiBindings }>();

  // [THAW-4.1] Curriculum Catalog & WMA11-SET
  study.get('/catalog', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await getStudyCatalog(auth.db, auth.session.user.id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.put('/board', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyUpdateBoardInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid board selection.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await updateStudyActiveBoard(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.put('/enrollments', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyToggleEnrollmentInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid enrollment payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await toggleStudySubjectEnrollment(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.put('/target-grade', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyUpdateTargetGradeInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid target grade payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await updateStudySubjectTargetGrade(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.put('/maths-suite', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyUpdateMathsSuiteInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid WMA11-SET unit selection payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await updateStudyMathsSuite(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  // [THAW-4.2] Syllabus Topic Tracker
  study.get('/topics', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const subjectId = c.req.query('subjectId');
      const data = await getStudyTopicsState(auth.db, auth.session.user.id, subjectId);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.put('/topics/:topicId/progress', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyUpsertTopicProgressInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid topic progress payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await upsertStudyTopicProgress(
        auth.db,
        auth.session.user.id,
        c.req.param('topicId'),
        parsed.data
      );
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  // [THAW-4.3] Past Paper Tracker
  study.get('/past-papers', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const subjectId = c.req.query('subjectId');
      const data = await getStudyPastPapersState(auth.db, auth.session.user.id, subjectId);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.post('/past-papers/attempts', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyLogPastPaperAttemptInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid past paper attempt payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await logStudyPastPaperAttempt(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 201);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.delete('/past-papers/attempts/:attemptId', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await deleteStudyPastPaperAttempt(
        auth.db,
        auth.session.user.id,
        c.req.param('attemptId')
      );
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  // [THAW-4.4] Exam Countdown
  study.get('/countdowns', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await getStudyCountdownsState(auth.db, auth.session.user.id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.post('/countdowns', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudySaveCountdownInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid exam countdown payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await saveStudyCountdown(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 201);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.put('/countdowns/:id', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const id = c.req.param('id');
    const fullParsed = StudySaveCountdownInputSchema.safeParse({ ...(rawBody as object), id });
    if (fullParsed.success) {
      try {
        const data = await saveStudyCountdown(auth.db, auth.session.user.id, fullParsed.data);
        return c.json({ ok: true as const, data }, 200);
      } catch (err) {
        return handleStudyError(c, err);
      }
    }

    const flagParsed = StudyUpdateCountdownFlagsInputSchema.safeParse(rawBody);
    if (!flagParsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        flagParsed.error.issues[0]?.message ?? 'Invalid countdown update payload.',
        flagParsed.error.flatten()
      );
    }

    try {
      const data = await updateStudyCountdownFlags(auth.db, auth.session.user.id, id, flagParsed.data);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.delete('/countdowns/:id', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await deleteStudyCountdown(auth.db, auth.session.user.id, c.req.param('id'));
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  // [THAW-4.5] Dashboard & Leaderboard
  study.get('/dashboard', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await getStudyDashboardState(auth.db, auth.session.user.id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.post('/dashboard/check-in', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyCheckInSubjectInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid check-in payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await toggleStudySubjectCheckIn(auth.db, auth.session.user.id, parsed.data);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.get('/leaderboard', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    try {
      const data = await getStudyLeaderboard(auth.db, auth.session.user.id);
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  study.put('/leaderboard/visibility', async (c) => {
    const auth = await requireAuthenticatedSession(c);
    if (auth instanceof Response) return auth;
    const rawBody = await parseJsonBody(c);
    if (rawBody instanceof Response) return rawBody;

    const parsed = StudyLeaderboardVisibilityInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonApiError(
        c,
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid visibility payload.',
        parsed.error.flatten()
      );
    }

    try {
      const data = await updateStudyLeaderboardVisibility(
        auth.db,
        auth.session.user.id,
        parsed.data.visibleOnLeaderboard
      );
      return c.json({ ok: true as const, data }, 200);
    } catch (err) {
      return handleStudyError(c, err);
    }
  });

  return study;
}
