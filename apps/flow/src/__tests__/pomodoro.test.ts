import { describe, expect, it } from 'vitest';
import { FlowShellView } from '../components/layout/views/FlowShellView';
import { FloatingMiniTimerView } from '../components/pomodoro/views/FloatingMiniTimerView';
import { FocusModeView } from '../components/pomodoro/views/FocusModeView';
import { PomodoroSettingsView } from '../components/pomodoro/views/PomodoroSettingsView';
import { PomodoroStatsView } from '../components/pomodoro/views/PomodoroStatsView';
import { PomodoroView } from '../components/pomodoro/views/PomodoroView';
import { ShortcutsModalView } from '../components/pomodoro/views/ShortcutsModalView';
import { TaskListView } from '../components/pomodoro/views/TaskListView';
import {
  TimerRingView,
  getEscapementSecondStep,
  parseClockSeconds,
} from '../components/pomodoro/views/TimerRingView';
import {
  AMBIENT_SOUNDS,
  FOCUS_SCENES,
  getAmbientSound,
  getFocusScene,
} from '../lib/pomodoro/ambient';
import {
  DEFAULT_POMODORO_SETTINGS,
  abandonInterval,
  advancePhase,
  applySettings,
  createInitialTimer,
  finishInterval,
  formatClock,
  getProgress,
  getRemainingMs,
  pauseTimer,
  resetTimer,
  startTimer,
} from '../lib/pomodoro/engine';
import {
  getDailyBuckets,
  getHourlyDistribution,
  getSummary,
  getTaskBreakdown,
  getWeeklyBuckets,
} from '../lib/pomodoro/stats';
import { playClockTick, playClockTickSample } from '../lib/pomodoro/sound';
import {
  APPEARANCE_BOOTSTRAP_SCRIPT,
  registerPomodoroServiceWorker,
  resolveThemeMode,
  unregisterDevServiceWorkers,
} from '../lib/pomodoro/browser';
import {
  loadPomodoroState,
  sanitizeSettings,
  savePomodoroState,
} from '../lib/pomodoro/storage';
import {
  MOCK_POMODORO_TASKS,
  POMODORO_KEYBOARD_SHORTCUTS,
  createMockPomodoroState,
} from '../mocks/pomodoro.mock';

describe('@ants/flow [ZYY-3.1] Pomodoro Timer Studio & App Shell', () => {
  it('exports all presentational views and mock fixtures', () => {
    expect(FlowShellView).toBeDefined();
    expect(PomodoroView).toBeDefined();
    expect(TimerRingView).toBeDefined();
    expect(TaskListView).toBeDefined();
    expect(PomodoroStatsView).toBeDefined();
    expect(PomodoroSettingsView).toBeDefined();
    expect(FocusModeView).toBeDefined();
    expect(FloatingMiniTimerView).toBeDefined();
    expect(ShortcutsModalView).toBeDefined();
    expect(MOCK_POMODORO_TASKS.length).toBeGreaterThanOrEqual(3);
    expect(POMODORO_KEYBOARD_SHORTCUTS.length).toBeGreaterThanOrEqual(8);
  });

  it('defaults to 25min work, 5min short break, and 15min long break', () => {
    expect(DEFAULT_POMODORO_SETTINGS.workMinutes).toBe(25);
    expect(DEFAULT_POMODORO_SETTINGS.shortBreakMinutes).toBe(5);
    expect(DEFAULT_POMODORO_SETTINGS.longBreakMinutes).toBe(15);
    expect(DEFAULT_POMODORO_SETTINGS.longBreakInterval).toBe(4);
  });

  it('runs, pauses, resets, and advances through short and long break cycles accurately', () => {
    const t0 = 1_700_000_000_000;
    const initial = createInitialTimer(DEFAULT_POMODORO_SETTINGS);
    expect(formatClock(initial.remainingMs)).toBe('25:00');

    const running = startTimer(initial, t0);
    expect(running.status).toBe('running');
    expect(getRemainingMs(running, t0 + 10 * 60_000)).toBe(15 * 60_000);
    expect(getProgress(running, DEFAULT_POMODORO_SETTINGS, t0 + 12.5 * 60_000)).toBeCloseTo(0.5, 4);

    const paused = pauseTimer(running, t0 + 5 * 60_000);
    expect(paused.status).toBe('paused');
    expect(paused.remainingMs).toBe(20 * 60_000);

    const reset = resetTimer(paused, DEFAULT_POMODORO_SETTINGS);
    expect(reset.status).toBe('idle');
    expect(reset.remainingMs).toBe(25 * 60_000);

    // 4th completed work session transitions into a 15-minute longBreak
    const fourthWork = { ...running, cycleCount: 3 };
    const afterFourth = advancePhase(fourthWork, DEFAULT_POMODORO_SETTINGS, t0 + 25 * 60_000, true);
    expect(afterFourth.timer.phase).toBe('longBreak');
    expect(afterFourth.timer.remainingMs).toBe(15 * 60_000);
  });

  it('credits completed pomodoros to the active task and logs session history', () => {
    const base = createMockPomodoroState(new Date('2026-11-10T10:00:00.000Z'));
    const startMs = Date.parse('2026-11-10T10:00:00.000Z');
    const endMs = startMs + 25 * 60_000;
    const runningState = {
      ...base,
      timer: startTimer(base.timer, startMs),
    };

    const result = finishInterval(runningState, endMs, true, endMs);
    expect(result.record).not.toBeNull();
    expect(result.record?.completed).toBe(true);
    expect(result.record?.taskId).toBe(base.activeTaskId);

    const updatedTask = result.state.tasks.find((t) => t.id === base.activeTaskId);
    const originalTask = base.tasks.find((t) => t.id === base.activeTaskId);
    expect(updatedTask?.completedPomodoros).toBe((originalTask?.completedPomodoros ?? 0) + 1);
  });

  it('aggregates daily, weekly, hourly, and task productivity statistics', () => {
    const now = new Date('2026-11-10T18:00:00.000Z');
    const mockState = createMockPomodoroState(now);
    const daily = getDailyBuckets(mockState.history, 7, now);
    const weekly = getWeeklyBuckets(mockState.history, 12, now);
    const hourly = getHourlyDistribution(mockState.history, 30, now);
    const tasks = getTaskBreakdown(mockState.history, 30, now);
    const summary = getSummary(mockState.history, now, 8);

    expect(daily).toHaveLength(7);
    expect(weekly).toHaveLength(12);
    expect(hourly).toHaveLength(24);
    expect(tasks.length).toBeGreaterThan(0);
    expect(summary.totalPomodoros).toBeGreaterThan(10);
  });

  it('sanitizes and persists state to a localStorage-compatible store', () => {
    const memory = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, val: string) => {
        memory.set(key, val);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };

    const sanitized = sanitizeSettings({
      workMinutes: 999,
      shortBreakMinutes: -5,
      focus: { miniTimer: false },
      ambient: { scene: 'rainy-study', sound: 'rain', volume: 2 },
    });
    expect(sanitized.workMinutes).toBe(120);
    expect(sanitized.shortBreakMinutes).toBe(1);
    expect(sanitized.focus.miniTimer).toBe(false);
    expect(sanitized.ambient.scene).toBe('rainy-study');
    expect(sanitized.ambient.sound).toBe('rain');
    expect(sanitized.ambient.volume).toBe(1);

    const initial = createMockPomodoroState(new Date('2026-11-10T12:00:00.000Z'));
    expect(savePomodoroState(initial, 'test-key', fakeStorage)).toBe(true);
    const loaded = loadPomodoroState('test-key', fakeStorage);
    expect(loaded?.tasks.length).toBe(initial.tasks.length);
    expect(loaded?.settings.workMinutes).toBe(25);
    expect(loaded?.settings.focus.miniTimer).toBe(true);
  });

  it('logs abandoned intervals only when >= 60s elapsed and updates idle timers on settings change', () => {
    const base = createMockPomodoroState(new Date('2026-11-10T10:00:00.000Z'));
    const updatedIdle = applySettings(base, { ...base.settings, workMinutes: 40 });
    expect(updatedIdle.timer.remainingMs).toBe(40 * 60_000);

    const t0 = Date.parse('2026-11-10T10:00:00.000Z');
    const running = { ...base, timer: startTimer(base.timer, t0) };

    const shortReset = abandonInterval(running, t0 + 30_000);
    expect(shortReset.record).toBeNull();
    expect(shortReset.state.timer.status).toBe('idle');

    const longReset = abandonInterval(running, t0 + 120_000);
    expect(longReset.record).not.toBeNull();
    expect(longReset.record?.completed).toBe(false);
    expect(longReset.record?.durationSeconds).toBe(120);
  });

  it('exposes focus background scenes and ambient soundscapes with safe fallbacks', () => {
    expect(FOCUS_SCENES).toHaveLength(5);
    expect(AMBIENT_SOUNDS).toHaveLength(6);
    expect(getFocusScene('rainy-study').imageSrc).toBe('/scenes/rainy-study.jpg');
    expect(getFocusScene('none').imageSrc).toBeNull();
    expect(getAmbientSound('fireplace').label).toBe('Fireplace');
  });

  it('computes 60-step mechanical escapement ticks cleanly from remainingMs or clock text', () => {
    expect(parseClockSeconds('25:00')).toBe(1500);
    expect(parseClockSeconds('1:05:12')).toBe(3912);
    expect(parseClockSeconds('invalid')).toBe(0);

    // 25:00 -> step 0 (12 o'clock), 24:59 -> step 1 (1s clockwise), 24:01 -> step 59, 24:00 -> step 0
    expect(getEscapementSecondStep(1_500_000, '25:00')).toBe(0);
    expect(getEscapementSecondStep(1_499_000, '24:59')).toBe(1);
    expect(getEscapementSecondStep(1_441_000, '24:01')).toBe(59);
    expect(getEscapementSecondStep(1_440_000, '24:00')).toBe(0);
    // Fallback parsing when remainingMs is omitted
    expect(getEscapementSecondStep(undefined, '24:45')).toBe(15);
  });

  it('defaults clock ticking settings, sanitizes legacy/out-of-range values, and stays SSR-safe', () => {
    expect(DEFAULT_POMODORO_SETTINGS.sound.ticking).toBe(true);
    expect(DEFAULT_POMODORO_SETTINGS.sound.tickingVolume).toBe(0.35);

    const legacy = sanitizeSettings({
      sound: { enabled: true, volume: 0.8, workEndSound: 'bell', breakEndSound: 'chime' },
    });
    expect(legacy.sound.ticking).toBe(true);
    expect(legacy.sound.tickingVolume).toBe(0.35);

    const clampedLow = sanitizeSettings({
      sound: { ticking: false, tickingVolume: -0.5 },
    });
    expect(clampedLow.sound.ticking).toBe(false);
    expect(clampedLow.sound.tickingVolume).toBe(0);

    const clampedHigh = sanitizeSettings({
      sound: { ticking: true, tickingVolume: 4 },
    });
    expect(clampedHigh.sound.ticking).toBe(true);
    expect(clampedHigh.sound.tickingVolume).toBe(1);

    expect(() => playClockTick('tick', 0.35)).not.toThrow();
    expect(() => playClockTick('tock', 0.35)).not.toThrow();
    expect(() => playClockTick('tick', 0)).not.toThrow();
    expect(() => playClockTickSample(0.35)).not.toThrow();
  });

  it('defaults appearance mode to light and normalizes legacy system mode to light so section switches never flip to dark mode', async () => {
    expect(DEFAULT_POMODORO_SETTINGS.appearance.mode).toBe('light');
    expect(sanitizeSettings({ appearance: { mode: 'system' } }).appearance.mode).toBe('light');
    expect(sanitizeSettings({ appearance: { mode: 'light' } }).appearance.mode).toBe('light');
    expect(sanitizeSettings({ appearance: { mode: 'dark' } }).appearance.mode).toBe('dark');
    expect(resolveThemeMode('light')).toBe('light');
    expect(resolveThemeMode('system')).toBe('light');
    expect(resolveThemeMode('dark')).toBe('dark');
    expect(() => new Function(APPEARANCE_BOOTSTRAP_SCRIPT)).not.toThrow();
    expect(APPEARANCE_BOOTSTRAP_SCRIPT).toContain('ants_theme');
    expect(APPEARANCE_BOOTSTRAP_SCRIPT).toContain('.the-ants.org');
    expect(() => registerPomodoroServiceWorker()).not.toThrow();
    await expect(unregisterDevServiceWorkers()).resolves.toBeUndefined();
  });
});

