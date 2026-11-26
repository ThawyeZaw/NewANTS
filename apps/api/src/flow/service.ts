import type { D1Database } from '@cloudflare/workers-types';
import {
  and,
  asc,
  createDb,
  desc,
  eq,
  examCountdowns,
  notificationQueue,
  nowIso,
  pomodoroSessions,
  pomodoroUserSettings,
  profiles,
  tasks,
  timetableEvents,
  userStreaks,
  userXpLedger,
  type AntsDatabase,
} from '@ants/db';
import {
  type FlowPomodoroSessionCreateInput,
  type FlowPomodoroSessionDto,
  type FlowPomodoroSettingsDto,
  type FlowPomodoroStateDto,
  type FlowSyncedExamDto,
  type FlowTaskDto,
  type FlowTaskUpsertInput,
  type FlowTasksListDto,
  type FlowTasksSyncInput,
  type FlowTimetableBlockDto,
  type FlowTimetableBlockUpsertInput,
  type FlowTimetableBootstrapDto,
} from '@ants/shared-types';
import { generateEntityId } from '../auth/crypto';

const POMODORO_WORK_XP = 15;

export class FlowServiceError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 500;
  readonly code: string;

  constructor(
    status: 400 | 401 | 403 | 404 | 500,
    code: string,
    message: string
  ) {
    super(message);
    this.name = 'FlowServiceError';
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_POMODORO_SETTINGS: FlowPomodoroSettingsDto = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  dailyGoal: 8,
  notificationsEnabled: true,
  soundEnabled: true,
  soundVolume: 0.7,
  tickingEnabled: true,
  tickingVolume: 0.35,
  ambientScene: 'none',
  ambientSound: 'off',
  appearanceMode: 'light',
  appearanceAccent: 'amber',
  appearanceFont: 'jakarta',
};

function mapSettingsRow(
  row: typeof pomodoroUserSettings.$inferSelect | undefined
): FlowPomodoroSettingsDto {
  if (!row) return { ...DEFAULT_POMODORO_SETTINGS };
  return {
    workMinutes: row.workMinutes,
    shortBreakMinutes: row.shortBreakMinutes,
    longBreakMinutes: row.longBreakMinutes,
    longBreakInterval: row.longBreakInterval,
    autoStartBreaks: Boolean(row.autoStartBreaks),
    autoStartWork: Boolean(row.autoStartWork),
    dailyGoal: row.dailyGoal,
    notificationsEnabled: Boolean(row.notificationsEnabled),
    soundEnabled: Boolean(row.soundEnabled),
    soundVolume: row.soundVolume,
    tickingEnabled: Boolean(row.tickingEnabled),
    tickingVolume: row.tickingVolume,
    ambientScene: row.ambientScene,
    ambientSound: row.ambientSound,
    appearanceMode:
      row.appearanceMode === 'dark' || row.appearanceMode === 'system'
        ? row.appearanceMode
        : 'light',
    appearanceAccent: row.appearanceAccent,
    appearanceFont: row.appearanceFont,
  };
}

function mapSessionRow(
  row: typeof pomodoroSessions.$inferSelect
): FlowPomodoroSessionDto {
  return {
    id: row.id,
    phase: row.phase,
    startedAtIso: row.startedAtIso,
    endedAtIso: row.endedAtIso ?? null,
    durationSeconds: row.durationSeconds,
    completed: Boolean(row.completed),
    taskId: row.taskId ?? null,
    taskTitle: row.taskTitle ?? null,
    xpAwarded: row.xpAwarded,
    createdAt: row.createdAt,
  };
}

function mapTaskRow(row: typeof tasks.$inferSelect): FlowTaskDto {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    priority: row.priority,
    dueDateIso: row.dueDateIso ?? null,
    tags: [...(row.tagsJson ?? [])],
    estimatedMinutes: row.estimatedMinutes,
    pomodorosPlanned: row.pomodorosPlanned,
    pomodorosDone: row.pomodorosDone,
    inTodayFocus: Boolean(row.inTodayFocus),
    done: Boolean(row.done),
    subtasks: [...(row.subtasksJson ?? [])],
    linkedBlockId: row.linkedBlockId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function coerceLeadMinutes(val: number): 0 | 5 | 10 | 15 | 30 {
  if (val === 0 || val === 5 || val === 10 || val === 15 || val === 30) {
    return val;
  }
  return 10;
}

function mapTimetableRow(
  row: typeof timetableEvents.$inferSelect
): FlowTimetableBlockDto {
  return {
    id: row.id,
    title: row.title,
    dateIso: row.dateIso,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    category: row.category,
    ...(row.priority ? { priority: row.priority } : {}),
    pomodorosPlanned: row.pomodorosPlanned,
    pomodorosDone: row.pomodorosDone,
    recurrence: row.recurrence,
    telegramEnabled: Boolean(row.telegramEnabled),
    telegramLeadMinutes: coerceLeadMinutes(row.telegramLeadMinutes),
    ...(row.telegramNote ? { telegramNote: row.telegramNote } : {}),
    notes: row.notes,
    completed: Boolean(row.completed),
    locked: Boolean(row.locked),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function computeScheduledReminderIso(
  dateIso: string,
  startMinutes: number,
  leadMinutes: number
): string {
  const [yStr, mStr, dStr] = dateIso.split('-');
  const year = Number(yStr) || 2026;
  const month = (Number(mStr) || 1) - 1;
  const day = Number(dStr) || 1;
  const baseMs = Date.UTC(year, month, day, 0, 0, 0, 0);
  const triggerMs = baseMs + (startMinutes - leadMinutes) * 60_000;
  return new Date(triggerMs).toISOString();
}

function formatMinutesLabel(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

async function syncTimetableReminderQueue(
  db: AntsDatabase,
  userId: string,
  block: FlowTimetableBlockDto
): Promise<void> {
  const timestamp = nowIso();
  await db
    .update(notificationQueue)
    .set({
      status: 'cancelled',
      updatedAt: timestamp,
    })
    .where(
      and(
        eq(notificationQueue.userId, userId),
        eq(notificationQueue.sourceType, 'timetable_block'),
        eq(notificationQueue.sourceId, block.id),
        eq(notificationQueue.status, 'pending')
      )
    );

  if (!block.telegramEnabled || block.completed) {
    return;
  }

  const scheduledForIso = computeScheduledReminderIso(
    block.dateIso,
    block.startMinutes,
    block.telegramLeadMinutes
  );

  const timeRange = `${formatMinutesLabel(block.startMinutes)}–${formatMinutesLabel(
    block.endMinutes
  )}`;
  const body = block.telegramNote?.trim()
    ? `${block.dateIso} ${timeRange} · ${block.telegramNote.trim()}`
    : `Scheduled block starts in ${block.telegramLeadMinutes}m (${block.dateIso} ${timeRange}).`;

  await db.insert(notificationQueue).values({
    id: generateEntityId('nq'),
    userId,
    channel: 'telegram',
    sourceType: 'timetable_block',
    sourceId: block.id,
    payloadJson: {
      title: `Upcoming: ${block.title}`,
      body,
      deepLinkUrl: '/timetable',
      dateIso: block.dateIso,
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      leadMinutes: block.telegramLeadMinutes,
    },
    scheduledForIso,
    status: 'pending',
    attempts: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

// ============================================================================
// [THAW-3.1] Pomodoro Engine & Persistence
// ============================================================================

export async function loadFlowPomodoroState(
  d1: D1Database,
  userId: string
): Promise<FlowPomodoroStateDto> {
  const db = createDb(d1);
  const [settingsRows, sessionRows, profileRows] = await Promise.all([
    db
      .select()
      .from(pomodoroUserSettings)
      .where(eq(pomodoroUserSettings.userId, userId))
      .limit(1),
    db
      .select()
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.userId, userId))
      .orderBy(desc(pomodoroSessions.startedAtIso))
      .limit(100),
    db
      .select({ xp: profiles.xp, streakDays: profiles.streakDays })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
  ]);

  return {
    settings: mapSettingsRow(settingsRows[0]),
    sessions: sessionRows.map(mapSessionRow),
    userXp: profileRows[0]?.xp ?? 0,
    streakDays: profileRows[0]?.streakDays ?? 0,
  };
}

export async function saveFlowPomodoroSettings(
  d1: D1Database,
  userId: string,
  input: FlowPomodoroSettingsDto
): Promise<FlowPomodoroSettingsDto> {
  const db = createDb(d1);
  const timestamp = nowIso();
  const existing = await db
    .select({ id: pomodoroUserSettings.id })
    .from(pomodoroUserSettings)
    .where(eq(pomodoroUserSettings.userId, userId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(pomodoroUserSettings)
      .set({
        ...input,
        updatedAt: timestamp,
      })
      .where(eq(pomodoroUserSettings.id, existing[0].id));
  } else {
    await db.insert(pomodoroUserSettings).values({
      id: generateEntityId('pms'),
      userId,
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  const saved = await db
    .select()
    .from(pomodoroUserSettings)
    .where(eq(pomodoroUserSettings.userId, userId))
    .limit(1);

  return mapSettingsRow(saved[0]);
}

function getUtcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getYesterdayUtcString(todayStr: string): string {
  const d = new Date(`${todayStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function recordFlowPomodoroSession(
  d1: D1Database,
  userId: string,
  input: FlowPomodoroSessionCreateInput
): Promise<{
  session: FlowPomodoroSessionDto;
  xpAwarded: number;
  userXp: number;
  streakDays: number;
}> {
  const db = createDb(d1);
  const sessionId = input.id?.trim() || generateEntityId('psn');
  const timestamp = nowIso();

  const existing = await db
    .select()
    .from(pomodoroSessions)
    .where(
      and(eq(pomodoroSessions.id, sessionId), eq(pomodoroSessions.userId, userId))
    )
    .limit(1);

  if (existing[0]) {
    const profileRow = await db
      .select({ xp: profiles.xp, streakDays: profiles.streakDays })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return {
      session: mapSessionRow(existing[0]),
      xpAwarded: 0,
      userXp: profileRow[0]?.xp ?? 0,
      streakDays: profileRow[0]?.streakDays ?? 0,
    };
  }

  let validTaskId: string | null = null;
  if (input.taskId) {
    const ownedTask = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId)))
      .limit(1);
    if (ownedTask[0]) {
      validTaskId = ownedTask[0].id;
    }
  }

  const shouldAwardXp = input.phase === 'work' && input.completed;
  const xpAwarded = shouldAwardXp ? POMODORO_WORK_XP : 0;

  await db.insert(pomodoroSessions).values({
    id: sessionId,
    userId,
    taskId: validTaskId,
    phase: input.phase,
    taskTitle: input.taskTitle ?? null,
    startedAtIso: input.startedAtIso,
    endedAtIso: input.endedAtIso ?? timestamp,
    durationSeconds: input.durationSeconds,
    completed: input.completed,
    xpAwarded,
    createdAt: timestamp,
  });

  if (shouldAwardXp) {
    const existingLedger = await db
      .select({ id: userXpLedger.id })
      .from(userXpLedger)
      .where(
        and(
          eq(userXpLedger.userId, userId),
          eq(userXpLedger.sourceType, 'pomodoro'),
          eq(userXpLedger.sourceId, sessionId)
        )
      )
      .limit(1);

    if (existingLedger.length === 0) {
      await db.insert(userXpLedger).values({
        id: generateEntityId('xpl'),
        userId,
        sourceType: 'pomodoro',
        sourceId: sessionId,
        idempotencyKey: `pomodoro:${userId}:${sessionId}`,
        xpAmount: POMODORO_WORK_XP,
        summary: input.taskTitle
          ? `Completed Pomodoro: ${input.taskTitle}`
          : 'Completed Flow Pomodoro session',
        createdAt: timestamp,
      });

      const [profileRows, streakRows] = await Promise.all([
        db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
        db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1),
      ]);

      const todayStr = getUtcDateString();
      const yesterdayStr = getYesterdayUtcString(todayStr);
      const streakRow = streakRows[0];
      let nextStreak = 1;

      if (streakRow) {
        if (streakRow.lastActiveDateIso === todayStr) {
          nextStreak = Math.max(1, streakRow.currentStreakDays);
        } else if (streakRow.lastActiveDateIso === yesterdayStr) {
          nextStreak = streakRow.currentStreakDays + 1;
        }
        await db
          .update(userStreaks)
          .set({
            currentStreakDays: nextStreak,
            longestStreakDays: Math.max(streakRow.longestStreakDays, nextStreak),
            lastActiveDateIso: todayStr,
            updatedAt: timestamp,
          })
          .where(eq(userStreaks.id, streakRow.id));
      } else {
        await db.insert(userStreaks).values({
          id: generateEntityId('stk'),
          userId,
          currentStreakDays: 1,
          longestStreakDays: 1,
          lastActiveDateIso: todayStr,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      const profileRow = profileRows[0];
      if (profileRow) {
        const addedHours = Math.round((input.durationSeconds / 3600) * 100) / 100;
        await db
          .update(profiles)
          .set({
            xp: profileRow.xp + POMODORO_WORK_XP,
            streakDays: nextStreak,
            completedSessions: profileRow.completedSessions + 1,
            focusHoursThisMonth:
              Math.round((profileRow.focusHoursThisMonth + addedHours) * 100) / 100,
            updatedAt: timestamp,
          })
          .where(eq(profiles.id, profileRow.id));
      }
    }
  }

  const [savedSessionRows, updatedProfileRows] = await Promise.all([
    db
      .select()
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.id, sessionId))
      .limit(1),
    db
      .select({ xp: profiles.xp, streakDays: profiles.streakDays })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
  ]);

  return {
    session: mapSessionRow(savedSessionRows[0]!),
    xpAwarded,
    userXp: updatedProfileRows[0]?.xp ?? 0,
    streakDays: updatedProfileRows[0]?.streakDays ?? 0,
  };
}

// ============================================================================
// [THAW-3.2] Task Planner Persistence
// ============================================================================

export async function listFlowTasks(
  d1: D1Database,
  userId: string
): Promise<FlowTasksListDto> {
  const db = createDb(d1);
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(asc(tasks.done), asc(tasks.priority), desc(tasks.createdAt));

  return {
    tasks: rows.map(mapTaskRow),
  };
}

export async function upsertFlowTask(
  d1: D1Database,
  userId: string,
  input: FlowTaskUpsertInput
): Promise<FlowTaskDto> {
  const db = createDb(d1);
  const timestamp = nowIso();
  const id = input.id?.trim() || generateEntityId('tsk');

  let validLinkedBlockId: string | null = null;
  if (input.linkedBlockId) {
    const ownedBlock = await db
      .select({ id: timetableEvents.id })
      .from(timetableEvents)
      .where(
        and(
          eq(timetableEvents.id, input.linkedBlockId),
          eq(timetableEvents.userId, userId)
        )
      )
      .limit(1);
    if (ownedBlock[0]) {
      validLinkedBlockId = ownedBlock[0].id;
    }
  }

  const existing = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1);

  if (existing[0] && existing[0].userId !== userId) {
    throw new FlowServiceError(
      403,
      'FORBIDDEN',
      'You cannot modify another user task.'
    );
  }

  const values = {
    title: input.title,
    notes: input.notes ?? '',
    priority: input.priority ?? 'P3',
    dueDateIso: input.dueDateIso ?? null,
    tagsJson: input.tags ?? [],
    estimatedMinutes: input.estimatedMinutes ?? 25,
    pomodorosPlanned: input.pomodorosPlanned ?? 1,
    pomodorosDone: input.pomodorosDone ?? 0,
    inTodayFocus: input.inTodayFocus ?? false,
    done: input.done ?? false,
    subtasksJson: input.subtasks ?? [],
    linkedBlockId: validLinkedBlockId,
    updatedAt: timestamp,
  };

  if (existing[0]) {
    await db.update(tasks).set(values).where(eq(tasks.id, id));
  } else {
    await db.insert(tasks).values({
      id,
      userId,
      ...values,
      createdAt: input.createdAt?.trim() || timestamp,
    });
  }

  if (validLinkedBlockId) {
    await db
      .update(timetableEvents)
      .set({
        completed: values.done,
        updatedAt: timestamp,
      })
      .where(
        and(
          eq(timetableEvents.id, validLinkedBlockId),
          eq(timetableEvents.userId, userId)
        )
      );
  }

  const saved = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return mapTaskRow(saved[0]!);
}

export async function deleteFlowTask(
  d1: D1Database,
  userId: string,
  taskId: string
): Promise<{ deletedId: string }> {
  const db = createDb(d1);
  const existing = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    throw new FlowServiceError(404, 'TASK_NOT_FOUND', 'Task was not found.');
  }

  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  return { deletedId: taskId };
}

export async function syncFlowTasks(
  d1: D1Database,
  userId: string,
  input: FlowTasksSyncInput
): Promise<FlowTasksListDto> {
  const db = createDb(d1);
  const existingRows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  const incomingIds = new Set(
    input.tasks.map((t) => t.id?.trim()).filter((id): id is string => Boolean(id))
  );

  for (const row of existingRows) {
    if (!incomingIds.has(row.id)) {
      await db
        .delete(tasks)
        .where(and(eq(tasks.id, row.id), eq(tasks.userId, userId)));
    }
  }

  for (const item of input.tasks) {
    await upsertFlowTask(d1, userId, item);
  }

  return listFlowTasks(d1, userId);
}

// ============================================================================
// [THAW-3.3] Smart Timetable, Exam Countdown Sync & Telegram Queue
// ============================================================================

function computeDaysLeftUtc(examDateIso: string, now = new Date()): number {
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const targetMs = Date.parse(`${examDateIso.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(targetMs)) return 0;
  return Math.round((targetMs - todayUtc) / 86_400_000);
}

export async function loadFlowTimetableBootstrap(
  d1: D1Database,
  userId: string
): Promise<FlowTimetableBootstrapDto> {
  const db = createDb(d1);
  const [blockRows, examRows, profileRows] = await Promise.all([
    db
      .select()
      .from(timetableEvents)
      .where(eq(timetableEvents.userId, userId))
      .orderBy(asc(timetableEvents.dateIso), asc(timetableEvents.startMinutes)),
    db
      .select()
      .from(examCountdowns)
      .where(eq(examCountdowns.userId, userId))
      .orderBy(asc(examCountdowns.examDateIso)),
    db
      .select({
        telegramStatus: profiles.telegramStatus,
        telegramHandle: profiles.telegramHandle,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
  ]);

  const exams: FlowSyncedExamDto[] = examRows.map((row) => {
    const daysLeft = computeDaysLeftUtc(row.examDateIso);
    const tone: FlowSyncedExamDto['tone'] =
      daysLeft <= 14 ? 'danger' : daysLeft <= 45 ? 'primary' : 'success';
    const boardLabel =
      row.boardId === 'edexcel-ial'
        ? 'Edexcel IAL'
        : row.boardId === 'cambridge-igcse'
          ? 'Cambridge IGCSE'
          : row.boardId === 'cambridge-alevel'
            ? 'Cambridge A-Level'
            : 'Edexcel IGCSE';
    return {
      id: row.id,
      board: boardLabel,
      code: row.paperCode,
      title: row.title,
      examDate: row.examDateIso.slice(0, 10),
      daysLeft,
      tone,
      ...(row.targetGrade ? { targetGrade: row.targetGrade } : {}),
    };
  });

  const profileRow = profileRows[0];
  const telegramConnected =
    profileRow?.telegramStatus === 'connected' ||
    profileRow?.telegramStatus === 'linked';

  return {
    blocks: blockRows.map(mapTimetableRow),
    exams,
    telegramConnected,
    telegramHandle: profileRow?.telegramHandle ?? '',
  };
}

export async function upsertFlowTimetableBlock(
  d1: D1Database,
  userId: string,
  input: FlowTimetableBlockUpsertInput
): Promise<FlowTimetableBlockDto> {
  if (input.endMinutes <= input.startMinutes) {
    throw new FlowServiceError(
      400,
      'INVALID_TIME_RANGE',
      'Block end time must be after start time.'
    );
  }

  const db = createDb(d1);
  const timestamp = nowIso();
  const id = input.id?.trim() || generateEntityId('blk');

  const existing = await db
    .select()
    .from(timetableEvents)
    .where(eq(timetableEvents.id, id))
    .limit(1);

  if (existing[0] && existing[0].userId !== userId) {
    throw new FlowServiceError(
      403,
      'FORBIDDEN',
      'You cannot modify another user timetable block.'
    );
  }

  const values = {
    title: input.title,
    dateIso: input.dateIso,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    category: input.category,
    priority: input.priority ?? null,
    pomodorosPlanned: input.pomodorosPlanned ?? 0,
    pomodorosDone: input.pomodorosDone ?? 0,
    recurrence: input.recurrence ?? 'none',
    telegramEnabled: input.telegramEnabled ?? false,
    telegramLeadMinutes: input.telegramLeadMinutes ?? 10,
    telegramNote: input.telegramNote ?? null,
    notes: input.notes ?? '',
    completed: input.completed ?? false,
    locked: input.locked ?? false,
    updatedAt: timestamp,
  };

  if (existing[0]) {
    await db
      .update(timetableEvents)
      .set(values)
      .where(and(eq(timetableEvents.id, id), eq(timetableEvents.userId, userId)));
  } else {
    await db.insert(timetableEvents).values({
      id,
      userId,
      ...values,
      createdAt: timestamp,
    });
  }

  const savedRows = await db
    .select()
    .from(timetableEvents)
    .where(and(eq(timetableEvents.id, id), eq(timetableEvents.userId, userId)))
    .limit(1);

  const savedBlock = mapTimetableRow(savedRows[0]!);
  await syncTimetableReminderQueue(db, userId, savedBlock);
  return savedBlock;
}

export async function deleteFlowTimetableBlock(
  d1: D1Database,
  userId: string,
  blockId: string
): Promise<{ deletedId: string }> {
  const db = createDb(d1);
  const existing = await db
    .select({ id: timetableEvents.id })
    .from(timetableEvents)
    .where(and(eq(timetableEvents.id, blockId), eq(timetableEvents.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    throw new FlowServiceError(
      404,
      'TIMETABLE_BLOCK_NOT_FOUND',
      'Timetable block was not found.'
    );
  }

  const timestamp = nowIso();
  await Promise.all([
    db
      .update(notificationQueue)
      .set({ status: 'cancelled', updatedAt: timestamp })
      .where(
        and(
          eq(notificationQueue.userId, userId),
          eq(notificationQueue.sourceType, 'timetable_block'),
          eq(notificationQueue.sourceId, blockId),
          eq(notificationQueue.status, 'pending')
        )
      ),
    db
      .delete(timetableEvents)
      .where(
        and(eq(timetableEvents.id, blockId), eq(timetableEvents.userId, userId))
      ),
  ]);

  return { deletedId: blockId };
}
