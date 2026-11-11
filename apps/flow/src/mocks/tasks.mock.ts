/**
 * Flow Task Planner (`/tasks`) — realistic mock presets aligned with Flow Timetable
 * (`workday-coaching` & `scholar-ial`) so `/tasks` is immediately interactive standalone.
 */
import { addDaysIso } from '../lib/timetable/engine';
import type { PlannerTask, TaskPresetId, TasksPersistedState } from '../lib/tasks/engine';

export const DEFAULT_TASKS_REFERENCE_DATE = '2026-11-11';

export function createCoachingPlannerTasks(
  referenceDate: string = DEFAULT_TASKS_REFERENCE_DATE
): PlannerTask[] {
  const tomorrow = addDaysIso(referenceDate, 1);
  const friday = addDaysIso(referenceDate, 2);
  const saturday = addDaysIso(referenceDate, 3);

  return [
    {
      id: 'ft_side_hustle',
      title: 'Side hustle deep work — ship landing page copy & pricing',
      notes: 'Focus on hero clarity and two-tier pricing breakdown before morning commute.',
      priority: 'P1',
      dueDate: referenceDate,
      tags: ['Side Hustle', 'Deep Work'],
      estimatedMinutes: 50,
      pomodorosPlanned: 2,
      pomodorosDone: 0,
      inTodayFocus: true,
      done: false,
      linkedBlockId: 'blk_side_hustle_pomo',
      scheduledSlotLabel: 'Today · 06:15',
      createdAt: `${referenceDate}T06:00:00.000Z`,
      subtasks: [
        { id: 'sub_sh_1', title: 'Draft outcome-led hero headline & subcopy', done: true },
        { id: 'sub_sh_2', title: 'Finalize Starter vs Studio tier matrix', done: false },
        { id: 'sub_sh_3', title: 'Smoke-check mobile responsive spacing', done: false },
      ],
    },
    {
      id: 'ft_kids_pickup',
      title: 'Kids pickup at 5:30 PM & family dinner prep',
      notes: 'Leave office desk cleanly at 4:55 PM; phones away from 6:30 PM.',
      priority: 'P1',
      dueDate: referenceDate,
      tags: ['Family'],
      estimatedMinutes: 90,
      inTodayFocus: true,
      done: false,
      linkedBlockId: 'blk_kids_pickup',
      scheduledSlotLabel: 'Today · 17:30',
      createdAt: `${referenceDate}T06:05:00.000Z`,
      subtasks: [
        { id: 'sub_fam_1', title: 'Confirm school pickup gate & after-school bag', done: true },
        { id: 'sub_fam_2', title: 'Prep veggies & set table before 6:30 PM', done: false },
      ],
    },
    {
      id: 'ft_q4_roadmap',
      title: 'Review Q4 API migration milestones with engineering team',
      notes: 'Prepare Drizzle D1 schema checklist and Cloudflare Cron retry limits.',
      priority: 'P2',
      dueDate: tomorrow,
      tags: ['Work', 'Deep Work'],
      estimatedMinutes: 45,
      pomodorosPlanned: 2,
      pomodorosDone: 0,
      inTodayFocus: false,
      done: false,
      createdAt: `${referenceDate}T07:15:00.000Z`,
      subtasks: [
        { id: 'sub_q4_1', title: 'Audit D1 index coverage on tasks table', done: false },
        { id: 'sub_q4_2', title: 'Share rollout risks in morning standup', done: false },
      ],
    },
    {
      id: 'ft_gym',
      title: '1-hour gym session (upper body + zone 2 cardio)',
      priority: 'P2',
      dueDate: referenceDate,
      tags: ['Health'],
      estimatedMinutes: 60,
      inTodayFocus: true,
      done: false,
      linkedBlockId: 'blk_gym',
      scheduledSlotLabel: 'Today · 19:45',
      createdAt: `${referenceDate}T06:10:00.000Z`,
      subtasks: [
        { id: 'sub_gym_1', title: '10m mobility warm-up', done: false },
        { id: 'sub_gym_2', title: '4 × 8 incline press + rows', done: false },
        { id: 'sub_gym_3', title: '20m zone-2 incline walk', done: false },
      ],
    },
    {
      id: 'ft_reading',
      title: '30-minute evening reading (2 chapters)',
      priority: 'P3',
      dueDate: referenceDate,
      tags: ['Reading'],
      estimatedMinutes: 30,
      pomodorosPlanned: 1,
      pomodorosDone: 0,
      inTodayFocus: true,
      done: false,
      linkedBlockId: 'blk_reading',
      scheduledSlotLabel: 'Today · 21:45',
      createdAt: `${referenceDate}T06:20:00.000Z`,
      subtasks: [
        { id: 'sub_rd_1', title: 'Highlight 3 actionable notes for Saturday review', done: false },
      ],
    },
    {
      id: 'ft_tax_receipts',
      title: 'Archive October hardware & cloud invoices',
      priority: 'P3',
      dueDate: friday,
      tags: ['Admin', 'Side Hustle'],
      estimatedMinutes: 25,
      pomodorosPlanned: 1,
      pomodorosDone: 0,
      inTodayFocus: false,
      done: false,
      createdAt: `${referenceDate}T08:00:00.000Z`,
      subtasks: [],
    },
    {
      id: 'ft_inbox',
      title: 'Clear personal inbox & confirm weekend groceries',
      priority: 'P4',
      dueDate: saturday,
      tags: ['Admin', 'Family'],
      estimatedMinutes: 15,
      inTodayFocus: false,
      done: false,
      createdAt: `${referenceDate}T08:20:00.000Z`,
      subtasks: [
        { id: 'sub_inb_1', title: 'Order coffee beans & oat milk', done: false },
        { id: 'sub_inb_2', title: 'Reply to dentist confirmation SMS', done: true },
      ],
    },
    {
      id: 'ft_morning_plan_done',
      title: 'Confirm P1–P4 priorities & Telegram bot check-in',
      priority: 'P2',
      dueDate: referenceDate,
      tags: ['Admin'],
      estimatedMinutes: 15,
      inTodayFocus: true,
      done: true,
      createdAt: `${referenceDate}T05:55:00.000Z`,
      subtasks: [
        { id: 'sub_mp_1', title: 'Verify 5-min cron alerts active', done: true },
      ],
    },
  ];
}

export function createScholarPlannerTasks(
  referenceDate: string = DEFAULT_TASKS_REFERENCE_DATE
): PlannerTask[] {
  const tomorrow = addDaysIso(referenceDate, 1);
  const friday = addDaysIso(referenceDate, 2);

  return [
    {
      id: 'st_wma11',
      title: 'WMA11 — Finish Jan 2024 Differentiation Q6–Q10',
      notes: 'Show every chain-rule intermediate step and verify stationary point nature.',
      priority: 'P1',
      dueDate: referenceDate,
      tags: ['WMA11', 'Past Paper'],
      estimatedMinutes: 75,
      pomodorosPlanned: 3,
      pomodorosDone: 1,
      inTodayFocus: true,
      done: false,
      linkedBlockId: 'sch_wma11_drill',
      scheduledSlotLabel: 'Today · 07:00',
      createdAt: `${referenceDate}T06:30:00.000Z`,
      subtasks: [
        { id: 'sub_w11_1', title: 'Q6–Q7 Implicit & tangent normal proof', done: true },
        { id: 'sub_w11_2', title: 'Q8–Q9 Optimization & second derivative check', done: false },
        { id: 'sub_w11_3', title: 'Mark against official Edexcel scheme & log UMS', done: false },
      ],
    },
    {
      id: 'st_9702',
      title: '9702/22 — Superposition & stationary waves flashcards',
      priority: 'P1',
      dueDate: referenceDate,
      tags: ['9702', 'Revision'],
      estimatedMinutes: 50,
      pomodorosPlanned: 2,
      pomodorosDone: 0,
      inTodayFocus: true,
      done: false,
      linkedBlockId: 'sch_9702',
      scheduledSlotLabel: 'Today · 15:00',
      createdAt: `${referenceDate}T06:45:00.000Z`,
      subtasks: [
        { id: 'sub_ph_1', title: 'Review node vs antinode phase difference cards', done: false },
        { id: 'sub_ph_2', title: 'Solve 3 double-slit fringe spacing numericals', done: false },
      ],
    },
    {
      id: 'st_0580',
      title: '0580/42 — Circle theorems error log',
      priority: 'P2',
      dueDate: tomorrow,
      tags: ['0580', 'Past Paper'],
      estimatedMinutes: 25,
      pomodorosPlanned: 1,
      pomodorosDone: 0,
      inTodayFocus: true,
      done: false,
      createdAt: `${referenceDate}T07:20:00.000Z`,
      subtasks: [
        { id: 'sub_0580_1', title: 'Re-work alternate segment theorem proofs', done: false },
      ],
    },
    {
      id: 'st_mock_prep',
      title: 'Print formula booklet & time full WMA12 mock paper',
      priority: 'P2',
      dueDate: friday,
      tags: ['WMA12', 'Past Paper'],
      estimatedMinutes: 90,
      pomodorosPlanned: 3,
      pomodorosDone: 0,
      inTodayFocus: false,
      done: false,
      createdAt: `${referenceDate}T08:10:00.000Z`,
      subtasks: [],
    },
    {
      id: 'st_organize',
      title: 'Update Study Past Paper Tracker UMS sheet',
      priority: 'P4',
      dueDate: referenceDate,
      tags: ['Study'],
      estimatedMinutes: 15,
      inTodayFocus: true,
      done: false,
      createdAt: `${referenceDate}T08:30:00.000Z`,
      subtasks: [],
    },
  ];
}

export function createPresetTasksState(
  presetId: TaskPresetId = 'workday-coaching',
  referenceDate: string = DEFAULT_TASKS_REFERENCE_DATE
): TasksPersistedState {
  return {
    version: 1,
    presetId,
    selectedDate: referenceDate,
    tasks:
      presetId === 'scholar-ial'
        ? createScholarPlannerTasks(referenceDate)
        : createCoachingPlannerTasks(referenceDate),
  };
}
