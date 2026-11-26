import { describe, expect, it } from 'vitest';
import type {
  AccountProfileDto,
  FlowPomodoroStateDto,
  FlowTaskDto,
  FlowTimetableBootstrapDto,
} from '@ants/shared-types';
import {
  buildTasksStateFromDtos,
  buildTimetableStateFromBootstrap,
  mapAccountDtoToSharedProfile,
  mapPomodoroDtoToPersisted,
  mapSharedProfileToUpdateInput,
  mapSyncedExams,
} from '../lib/flow-api';

describe('@ants/flow [THAW-3.1]–[THAW-3.4] D1 API Mappers', () => {
  it('maps FlowPomodoroStateDto & tasks into PomodoroPersistedState', () => {
    const dto: FlowPomodoroStateDto = {
      settings: {
        workMinutes: 30,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartBreaks: true,
        autoStartWork: false,
        dailyGoal: 6,
        notificationsEnabled: true,
        soundEnabled: true,
        soundVolume: 0.8,
        tickingEnabled: true,
        tickingVolume: 0.4,
        ambientScene: 'quiet-library',
        ambientSound: 'rain',
        appearanceMode: 'dark',
        appearanceAccent: 'amber',
        appearanceFont: 'jakarta',
      },
      sessions: [
        {
          id: 'ps_1',
          phase: 'work',
          startedAtIso: '2026-11-25T09:00:00.000Z',
          endedAtIso: '2026-11-25T09:30:00.000Z',
          durationSeconds: 1800,
          completed: true,
          taskId: 't_1',
          taskTitle: 'WMA11 Mock',
          xpAwarded: 15,
          createdAt: '2026-11-25T09:30:00.000Z',
        },
      ],
      userXp: 45,
      streakDays: 3,
    };

    const tasks: FlowTaskDto[] = [
      {
        id: 't_1',
        title: 'WMA11 Mock',
        notes: 'Finish Paper 1',
        priority: 'P1',
        dueDateIso: '2026-11-25',
        tags: ['WMA11'],
        estimatedMinutes: 60,
        pomodorosPlanned: 2,
        pomodorosDone: 1,
        inTodayFocus: true,
        done: false,
        subtasks: [{ id: 's_1', title: 'Q1–Q5', done: true }],
        linkedBlockId: 'blk_1',
        createdAt: '2026-11-25T08:00:00.000Z',
        updatedAt: '2026-11-25T08:00:00.000Z',
      },
    ];

    const state = mapPomodoroDtoToPersisted(dto, tasks);
    expect(state.settings.workMinutes).toBe(30);
    expect(state.settings.appearance.mode).toBe('dark');
    expect(state.history).toHaveLength(1);
    expect(state.tasks[0]?.title).toBe('WMA11 Mock');

    const plannerState = buildTasksStateFromDtos(tasks, '2026-11-25');
    expect(plannerState.tasks[0]?.linkedBlockId).toBe('blk_1');
  });

  it('maps Timetable bootstrap & exam countdowns cleanly', () => {
    const boot: FlowTimetableBootstrapDto = {
      blocks: [
        {
          id: 'blk_1',
          title: 'Deep Focus Maths',
          dateIso: '2026-11-25',
          startMinutes: 540,
          endMinutes: 600,
          category: 'study',
          priority: 'P1',
          pomodorosPlanned: 2,
          pomodorosDone: 0,
          recurrence: 'none',
          telegramEnabled: true,
          telegramLeadMinutes: 10,
          telegramNote: 'Start timer',
          notes: 'Focus',
          completed: false,
          locked: false,
          createdAt: '2026-11-25T00:00:00.000Z',
          updatedAt: '2026-11-25T00:00:00.000Z',
        },
      ],
      exams: [
        {
          id: 'ex_1',
          board: 'Edexcel IAL',
          code: 'WMA11',
          title: 'Pure Maths 1',
          examDate: '2026-12-10',
          daysLeft: 15,
          tone: 'primary',
          targetGrade: 'A*',
        },
      ],
      telegramConnected: true,
      telegramHandle: '@thorin',
    };

    const timetable = buildTimetableStateFromBootstrap(boot, '2026-11-25', []);
    expect(timetable.telegramConnected).toBe(true);
    expect(timetable.blocks[0]?.telegramReminder.leadMinutes).toBe(10);
    expect(mapSyncedExams(boot)[0]?.code).toBe('WMA11');
  });

  it('normalizes Telegram "linked" status to "connected" on SharedUserProfileData', () => {
    const dto: AccountProfileDto = {
      id: 'prof_1',
      userId: 'usr_1',
      name: 'Zay Lynn Htet',
      username: 'zaylynnhtet',
      email: 'zay@the-ants.org',
      headline: 'UI Lead',
      bio: 'Designs Study & Flow',
      institution: 'The ANTs',
      curriculumLabel: 'Edexcel IAL',
      timezone: 'Asia/Yangon (UTC+06:30)',
      preferredApp: 'study',
      memberSince: 'Nov 2024',
      role: 'tutor',
      roles: ['student', 'tutor'],
      xp: 120,
      streakDays: 5,
      focusHoursThisMonth: 14.5,
      completedSessions: 29,
      hourlyRateLabel: '30,000 MMK / hr',
      tutorTelegramUsername: '@zay_tutor',
      curriculums: ['Edexcel IAL'],
      taughtSubjects: ['9702 Physics'],
      featuredOnOrg: true,
      tutorSchedule: { Sat: { '10': 'available' } },
      portfolioItems: [],
      certifications: [],
      telegram: {
        status: 'linked',
        handle: '@zay_tg',
        chatId: '123456',
        botUsername: 'TheANTsFlowBot',
        verificationCode: null,
        codeExpiresAt: null,
        linkedAt: '2026-11-20T00:00:00.000Z',
        startCommand: null,
        deepLinkUrl: null,
        preferences: {
          blockReminders: true,
          defaultLeadMinutes: 10,
          dailyMorningDigest: true,
          digestTime: '07:00',
          examCountdownAlerts: true,
          tutorInquiryAlerts: true,
        },
      },
      visibility: {
        showStatsStreak: true,
        showPortfolioProjects: true,
        showCertifications: true,
        showTutorSchedule: true,
        showTelegramInquiry: true,
      },
    };

    const shared = mapAccountDtoToSharedProfile(dto);
    expect(shared.telegram.status).toBe('connected');
    expect(shared.tutorSchedule.Sat[10]).toBe('available');

    const update = mapSharedProfileToUpdateInput(shared);
    expect(update.tutorSchedule?.Sat?.['10']).toBe('available');
  });
});
