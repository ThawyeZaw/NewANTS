import { describe, expect, it } from 'vitest';
import { BlockEditorModalView } from '../components/timetable/views/BlockEditorModalView';
import { SmartTimetableView } from '../components/timetable/views/SmartTimetableView';
import { TelegramReminderModalView } from '../components/timetable/views/TelegramReminderModalView';
import { TimetableDayView } from '../components/timetable/views/TimetableDayView';
import { TimetableMonthView } from '../components/timetable/views/TimetableMonthView';
import { TimetableWeekGridView } from '../components/timetable/views/TimetableWeekGridView';
import { TodayFocusRailView } from '../components/timetable/views/TodayFocusRailView';
import {
  buildPomodoroHandoffUrl,
  computeDayAllocations,
  findNextOpenSlotMinutes,
  formatMinutes12h,
  formatMinutes24h,
  getBlocksForDate,
  getMonthGridDates,
  getTelegramTriggerMinutes,
  getWeekDates,
  moveBlockToSlot,
  resizeBlockDuration,
  snapMinutes,
} from '../lib/timetable/engine';
import {
  loadTimetableState,
  sanitizeTimetableState,
  saveTimetableState,
} from '../lib/timetable/storage';
import {
  DEFAULT_TIMETABLE_REFERENCE_DATE,
  MOCK_SYNCED_EXAMS,
  createCoachingBlocks,
  createPresetTimetableState,
} from '../mocks/timetable.mock';

describe('@ants/flow [ZYY-3.3] Smart Timetable Views & Helpers', () => {
  it('exports all presentational Smart Timetable views and mock fixtures', () => {
    expect(SmartTimetableView).toBeDefined();
    expect(TimetableWeekGridView).toBeDefined();
    expect(TimetableDayView).toBeDefined();
    expect(TimetableMonthView).toBeDefined();
    expect(TodayFocusRailView).toBeDefined();
    expect(BlockEditorModalView).toBeDefined();
    expect(TelegramReminderModalView).toBeDefined();
    expect(MOCK_SYNCED_EXAMS).toHaveLength(3);
  });

  it('covers a full 24-hour 1440-minute coaching weekday with zero gaps or overlaps', () => {
    const blocks = createCoachingBlocks(DEFAULT_TIMETABLE_REFERENCE_DATE);
    const wednesdayBlocks = getBlocksForDate(blocks, '2026-11-11');

    expect(wednesdayBlocks.length).toBeGreaterThanOrEqual(18);
    expect(wednesdayBlocks[0]?.startMinutes).toBe(0);
    expect(wednesdayBlocks[wednesdayBlocks.length - 1]?.endMinutes).toBe(1440);

    for (let i = 1; i < wednesdayBlocks.length; i += 1) {
      const prev = wednesdayBlocks[i - 1]!;
      const curr = wednesdayBlocks[i]!;
      expect(curr.startMinutes).toBe(prev.endMinutes);
    }

    const summary = computeDayAllocations(wednesdayBlocks);
    expect(summary.totalMinutes).toBe(1440);
    expect(summary.sleepMinutes).toBe(450); // 7h 30m (22:30–06:00)
    expect(summary.bufferMinutes).toBeGreaterThanOrEqual(90);
    expect(summary.reminderCount).toBeGreaterThanOrEqual(8);
    expect(summary.plannedPomodoros).toBeGreaterThanOrEqual(3);
  });

  it('expands weekday vs daily vs one-off blocks accurately across the week and month grid', () => {
    const state = createPresetTimetableState('workday-coaching', '2026-11-11');
    const week = getWeekDates('2026-11-11', 1);
    expect(week).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);

    const saturdayBlocks = getBlocksForDate(state.blocks, '2026-11-14');
    // Weekday 9-5 work must NOT leak onto Saturday
    expect(saturdayBlocks.some((b) => b.id === 'blk_work_am')).toBe(false);
    // Daily reading + weekend sprint DO appear on Saturday
    expect(saturdayBlocks.some((b) => b.id === 'blk_reading')).toBe(true);
    expect(saturdayBlocks.some((b) => b.id === 'blk_sat_side_hustle')).toBe(true);

    const monthCells = getMonthGridDates('2026-11-11', 1);
    expect(monthCells).toHaveLength(42);
  });

  it('snaps dragged and resized blocks to 15-minute increments within 24h bounds', () => {
    const [first] = createCoachingBlocks(DEFAULT_TIMETABLE_REFERENCE_DATE);
    const target = {
      ...first!,
      startMinutes: 375,
      endMinutes: 430, // 55m
    };

    expect(snapMinutes(382, 15)).toBe(375);
    const moved = moveBlockToSlot(target, '2026-11-12', 410);
    expect(moved.date).toBe('2026-11-12');
    expect(moved.startMinutes).toBe(405);
    expect(moved.endMinutes).toBe(460);

    const resized = resizeBlockDuration(target, 502);
    expect(resized.endMinutes).toBe(495);

    const minClamped = resizeBlockDuration(target, 300);
    expect(minClamped.endMinutes).toBe(390); // 375 + 15
  });

  it('computes 5-minute cron Telegram trigger timestamps and Pomodoro deep-link URLs', () => {
    const blocks = createCoachingBlocks(DEFAULT_TIMETABLE_REFERENCE_DATE);
    const sideHustle = blocks.find((b) => b.id === 'blk_side_hustle_pomo')!;
    const triggerMin = getTelegramTriggerMinutes(sideHustle);
    expect(formatMinutes24h(triggerMin)).toBe('06:10');
    expect(formatMinutes12h(triggerMin)).toBe('6:10 AM');

    const url = buildPomodoroHandoffUrl({
      title: sideHustle.title,
      pomodoros: sideHustle.pomodorosPlanned,
    });
    expect(url).toContain('/pomodoro?');
    expect(url).toContain('pomodoros=2');
    expect(url).toContain('Side+Hustle+Deep+Work');
  });

  it('sanitizes and persists timetable state to localStorage-compatible stores', () => {
    const memory = new Map<string, string>();
    const fakeStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
    };

    const preset = createPresetTimetableState('scholar-ial', '2026-11-11');
    expect(preset.telegramConnected).toBe(false);
    expect(preset.telegramHandle).toBe('');
    expect(saveTimetableState(preset, 'tt-test', fakeStorage)).toBe(true);
    const loaded = loadTimetableState('tt-test', fakeStorage);
    expect(loaded?.presetId).toBe('scholar-ial');
    expect(loaded?.showOvernightHours).toBe(false);
    expect(loaded?.telegramConnected).toBe(false);
    expect(loaded?.telegramHandle).toBe('');
    expect(loaded?.blocks.length).toBe(preset.blocks.length);

    // Payload missing telegram flags never auto-links
    const sanitizedLegacy = sanitizeTimetableState({ blocks: preset.blocks });
    expect(sanitizedLegacy?.telegramConnected).toBe(false);
    expect(sanitizedLegacy?.telegramHandle).toBe('');

    expect(sanitizeTimetableState({ blocks: [] })).toBeNull();
  });

  it('keeps non-focus coaching tasks free of Pomodoro estimates and finds open 15m slots', () => {
    const coaching = createPresetTimetableState('workday-coaching', DEFAULT_TIMETABLE_REFERENCE_DATE);
    const gymTask = coaching.focusTasks.find((t) => t.id === 'ft_gym');
    const hustleTask = coaching.focusTasks.find((t) => t.id === 'ft_side_hustle');
    expect(gymTask?.pomodorosPlanned).toBeUndefined();
    expect(hustleTask?.pomodorosPlanned).toBe(2);

    const wedBlocks = getBlocksForDate(coaching.blocks, '2026-11-11').filter((b) => b.endMinutes <= 19 * 60 + 45);
    const open = findNextOpenSlotMinutes(wedBlocks, 45, 6 * 60 + 15);
    expect(open).toBe(19 * 60 + 45);
  });
});

