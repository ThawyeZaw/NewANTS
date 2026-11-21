import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  computeLiveCountdownParts,
  computeScholarLeaderboard,
  createCustomCountdownEntry,
  deleteCustomCountdownState,
  filterAndSortCountdowns,
  formatCountdownClock,
  mergeCountdownEntries,
  sanitizeLeaderboardPrefs,
  sanitizeStudyCountdownsState,
  syncCustomExamDashboardFlags,
  upsertCustomCountdownState,
  validateCustomCountdownInput,
} from '../lib/study/countdown-leaderboard';
import {
  createDefaultLeaderboardPrefs,
  createDefaultStudyCountdownsState,
  DEFAULT_COUNTDOWN_NOW_MS,
  MOCK_LEADERBOARD_SCHOLARS,
  MOCK_STUDY_COUNTDOWN_ENTRIES,
} from '../mocks/study-countdown-leaderboard.mock';
import { createDefaultStudyDashboardState } from '../mocks/study-dashboard.mock';
import { CustomExamModalView } from '../components/countdown/views/CustomExamModalView';
import { StudyCountdownView } from '../components/countdown/views/StudyCountdownView';
import { StudyLeaderboardView } from '../components/leaderboard/views/StudyLeaderboardView';

describe('[ZYY-4.5] Exam Countdown & Scholar Leaderboard', () => {
  it('computes deterministic DD:HH:MM:SS live countdown parts and urgency bands', () => {
    // Reference: 2026-11-11 08:00:00Z
    // Target: WMA11 2026-11-23 09:00:00Z => 12 days, 1 hour, 0 min, 0 sec
    const parts = computeLiveCountdownParts('2026-11-23', DEFAULT_COUNTDOWN_NOW_MS, '09:00');
    expect(parts.isPast).toBe(false);
    expect(parts.days).toBe(12);
    expect(parts.hours).toBe(1);
    expect(parts.minutes).toBe(0);
    expect(parts.seconds).toBe(0);
    expect(parts.urgency).toBe('urgent');
    expect(formatCountdownClock(parts)).toBe('12d 01h 00m 00s');

    // Steady exam (>28 days away): 2026-12-20 09:00:00Z => 39 days, 1 hour
    const steady = computeLiveCountdownParts('2026-12-20', DEFAULT_COUNTDOWN_NOW_MS, '09:00');
    expect(steady.days).toBe(39);
    expect(steady.urgency).toBe('steady');

    // Past exam clamps cleanly to zero
    const past = computeLiveCountdownParts('2026-11-01', DEFAULT_COUNTDOWN_NOW_MS, '09:00');
    expect(past.isPast).toBe(true);
    expect(formatCountdownClock(past)).toBe('00d 00h 00m 00s');
  });

  it('validates, creates, persists, filters, and deletes custom/mock exams with Flow sync flags', () => {
    const invalid = validateCustomCountdownInput({
      boardId: 'edexcel-ial',
      paperCode: '',
      title: 'A',
      examDateIso: 'invalid',
      targetGrade: 'A*',
      category: 'mock',
    });
    expect(invalid.valid).toBe(false);

    const mockExam = createCustomCountdownEntry(
      {
        boardId: 'edexcel-ial',
        paperCode: 'wph12-m1',
        title: 'Waves & Quantum Mechanics Timed Mock',
        examDateIso: '2026-11-16',
        examTime24h: '15:00',
        targetGrade: 'A*',
        category: 'mock',
        colorTag: 'indigo',
        venueOrNotes: 'Room B · 1h 30m',
        pinned: true,
        syncedToFlow: true,
      },
      101
    );

    expect(mockExam.paperCode).toBe('WPH12-M1');
    expect(mockExam.isMock).toBe(true);
    expect(mockExam.examDateLabel).toBe('16 Nov 2026');

    const baseState = createDefaultStudyCountdownsState();
    const updatedState = upsertCustomCountdownState(baseState, mockExam);
    const sanitized = sanitizeStudyCountdownsState(
      JSON.parse(JSON.stringify(updatedState)),
      baseState
    );
    expect(sanitized.customCountdowns).toHaveLength(1);
    expect(sanitized.customCountdowns[0]?.paperCode).toBe('WPH12-M1');

    const dashState = syncCustomExamDashboardFlags(
      createDefaultStudyDashboardState(),
      mockExam.id,
      true,
      true
    );
    expect(dashState.pinnedExamIds).toContain(mockExam.id);
    expect(dashState.flowSyncedExamIds).toContain(mockExam.id);

    const merged = mergeCountdownEntries(MOCK_STUDY_COUNTDOWN_ENTRIES, sanitized);
    const mockOnly = filterAndSortCountdowns(merged, {
      boardFilter: 'edexcel-ial',
      kindFilter: 'mock_custom',
      search: 'wph12',
      pinnedIds: dashState.pinnedExamIds,
      flowSyncedIds: dashState.flowSyncedExamIds,
      referenceNowMs: DEFAULT_COUNTDOWN_NOW_MS,
    });
    expect(mockOnly.map((e) => e.paperCode)).toEqual(['WPH12-M1']);

    const afterDelete = deleteCustomCountdownState(sanitized, mockExam.id);
    expect(afterDelete.customCountdowns).toHaveLength(0);
    expect(afterDelete.deletedCustomIds).toContain(mockExam.id);
  });

  it('recomputes Scholar Leaderboard ranks from live XP and respects opt-in privacy mode', () => {
    // With default XP (2450), @zaylynnhtet ranks behind Khine Zar (3180) and Thaw Ye Zaw (2890)
    const defaultBoard = computeScholarLeaderboard(MOCK_LEADERBOARD_SCHOLARS, {
      timeframe: 'all_time',
      boardFilter: 'all',
      currentUserUsername: 'zaylynnhtet',
      visibleOnLeaderboard: true,
    });
    expect(defaultBoard.currentUserEntry?.rank).toBe(3);
    expect(defaultBoard.xpToNextRank).toBe(441);

    // After earning +900 XP in Past Papers & Topic Tracker, @zaylynnhtet jumps to #1
    const boosted = computeScholarLeaderboard(MOCK_LEADERBOARD_SCHOLARS, {
      timeframe: 'all_time',
      boardFilter: 'all',
      currentUserUsername: 'zaylynnhtet',
      liveCurrentUserXp: 3350,
      currentUserXpDelta: 900,
      visibleOnLeaderboard: true,
    });
    expect(boosted.currentUserEntry?.rank).toBe(1);
    expect(boosted.xpToNextRank).toBeNull();

    // Newly signed up user appears cleanly on the board
    const freshSignup = computeScholarLeaderboard(MOCK_LEADERBOARD_SCHOLARS, {
      timeframe: 'weekly',
      boardFilter: 'cambridge-igcse',
      currentUserUsername: 'maythu_igcse',
      currentUserName: 'May Thu',
      liveCurrentUserXp: 250,
      visibleOnLeaderboard: true,
    });
    expect(freshSignup.currentUserEntry?.username).toBe('maythu_igcse');
    expect(freshSignup.ranked.every((r) => r.boardId === 'cambridge-igcse')).toBe(true);

    // Private Study Mode hides the active scholar from peer rankings
    const privateMode = computeScholarLeaderboard(MOCK_LEADERBOARD_SCHOLARS, {
      timeframe: 'weekly',
      boardFilter: 'all',
      currentUserUsername: 'zaylynnhtet',
      visibleOnLeaderboard: false,
    });
    expect(privateMode.currentUserEntry).toBeNull();
    expect(privateMode.ranked.some((r) => r.username === 'zaylynnhtet')).toBe(false);

    const prefs = sanitizeLeaderboardPrefs(
      { timeframe: 'all_time', boardFilter: 'edexcel-ial', visibleOnLeaderboard: false },
      createDefaultLeaderboardPrefs()
    );
    expect(prefs.timeframe).toBe('all_time');
    expect(prefs.boardFilter).toBe('edexcel-ial');
    expect(prefs.visibleOnLeaderboard).toBe(false);
  });

  it('renders StudyCountdownView, CustomExamModalView, and StudyLeaderboardView cleanly in SSR', () => {
    const countdownHtml = renderToStaticMarkup(React.createElement(StudyCountdownView));
    expect(countdownHtml).toContain('Exam Countdown');
    expect(countdownHtml).toContain('WMA11');
    expect(countdownHtml).toContain('12d 01h 00m 00s');
    expect(countdownHtml).toContain('View on Flow Timetable');

    const modalHtml = renderToStaticMarkup(
      React.createElement(CustomExamModalView, {
        open: true,
        onClose: () => {},
        onSave: () => {},
      })
    );
    expect(modalHtml).toContain('Add Custom or Mock Exam');
    expect(modalHtml).toContain('Timed Mock Paper');

    const leaderboardHtml = renderToStaticMarkup(React.createElement(StudyLeaderboardView));
    expect(leaderboardHtml).toContain('Scholar Leaderboard');
    expect(leaderboardHtml).toContain('@zaylynnhtet');
    expect(leaderboardHtml).toContain('Milestone Badges');
    expect(leaderboardHtml).toContain('90+ UMS Distinction');
  });
});

