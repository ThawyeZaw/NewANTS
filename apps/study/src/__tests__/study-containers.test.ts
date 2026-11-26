import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@ants/auth-client';
import type {
  StudyCatalogResponseDto,
  StudyCountdownsResponseDto,
  StudyDashboardResponseDto,
  StudyLeaderboardResponseDto,
  StudyPastPapersResponseDto,
  StudyTopicsResponseDto,
} from '@ants/shared-types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

import { StudyCurriculumContainer } from '../components/curriculum/containers/StudyCurriculumContainer';
import { StudyTopicTrackerContainer } from '../components/curriculum/containers/StudyTopicTrackerContainer';
import { StudyPastPapersContainer } from '../components/papers/containers/StudyPastPapersContainer';
import { StudyCountdownContainer } from '../components/countdown/containers/StudyCountdownContainer';
import { StudyDashboardContainer } from '../components/dashboard/containers/StudyDashboardContainer';
import { StudyLeaderboardContainer } from '../components/leaderboard/containers/StudyLeaderboardContainer';
import {
  ALL_STUDY_STATIC_SUBJECT_IDS,
  mapCatalogDtoToCurriculumState,
  mapCountdownsResponseToViewProps,
  mapDashboardDtoToViewProps,
  mapLeaderboardDtoToViewProps,
  mapPastPapersDtoToViewProps,
  mapTopicsDtoToViewProps,
} from '../lib/study-api';

describe('@ants/study Stage T4 Containers & Mappers ([THAW-4.1]–[THAW-4.5])', () => {
  it('renders unauthenticated WorkspaceAuthGateView across all 6 Study containers with zero API fetches', () => {
    const containers = [
      StudyDashboardContainer,
      StudyCurriculumContainer,
      StudyTopicTrackerContainer,
      StudyPastPapersContainer,
      StudyCountdownContainer,
      StudyLeaderboardContainer,
    ];

    for (const Container of containers) {
      const html = renderToStaticMarkup(
        React.createElement(
          AuthProvider,
          { skipInitialFetch: true },
          React.createElement(Container)
        )
      );
      expect(html).toContain('.the-ants.org SSO');
      expect(html).toContain('Synced Flow');
    }

    expect(ALL_STUDY_STATIC_SUBJECT_IDS).toContain('edexcel-ial-maths');
    expect(ALL_STUDY_STATIC_SUBJECT_IDS).toContain('ial-maths-suite');
  });

  it('maps D1 Study API DTOs cleanly into Stage Z4 View props', () => {
    const catalogDto: StudyCatalogResponseDto = {
      boards: [
        {
          id: 'edexcel-ial',
          label: 'Pearson Edexcel IAL',
          shortLabel: 'Edexcel IAL',
          qualificationLevel: 'IAL',
          gradingScaleLabel: 'A*-U',
          summary: 'Modular',
        },
      ],
      subjects: [
        {
          id: 'edexcel-ial-maths',
          code: 'YMA01 / YFM01',
          boardId: 'edexcel-ial',
          boardLabel: 'Edexcel IAL',
          title: 'Mathematics & Further Mathematics',
          faculty: 'Mathematics',
          subjectType: 'modular_maths_suite',
          gradingScale: 'A*-U',
          totalUms: 600,
          totalRawMarks: 450,
          topicCount: 48,
          paperCount: 14,
          examSessionWindow: 'Jan · May/June · Oct',
          summary: '14 units',
          defaultEnrolled: false,
          defaultTargetGrade: 'A*',
          units: [],
          sampleTopics: [],
        },
      ],
      activeBoard: 'edexcel-ial',
      enrolledSubjectIds: ['edexcel-ial-maths'],
      targetGradeBySubjectId: { 'edexcel-ial-maths': 'A*' },
      mathsSuite: {
        activeCashIn: 'YMA01',
        enrolledCashIns: ['YMA01'],
        unitsByCashIn: {
          XMA01: ['WMA11', 'WMA12', 'WME01'],
          YMA01: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
          XFM01: ['WFM01', 'WFM02', 'WME02'],
          YFM01: ['WFM01', 'WFM02', 'WFM03', 'WME02', 'WME03', 'WST02'],
        },
      },
    };
    const currState = mapCatalogDtoToCurriculumState(catalogDto);
    expect(currState.enrolledSubjectIds).toEqual(['edexcel-ial-maths']);
    expect(currState.activeMathsCashIn).toBe('YMA01');

    const topicsDto: StudyTopicsResponseDto = {
      subjects: catalogDto.subjects,
      topics: [
        {
          id: 't1',
          subjectId: 'edexcel-ial-maths',
          unitCode: 'WMA11',
          unitLabel: 'P1',
          code: 'WMA11.1',
          title: 'Quadratics',
          difficulty: 'foundation',
          estimatedMinutes: 45,
          keyFormulasAndPitfalls: ['b^2 - 4ac'],
          defaultStatus: 'mastered',
          subtopics: [
            { id: 't1-s1', code: '1.1', title: 'Discriminant', defaultCompleted: true },
          ],
        },
      ],
      selectedSubjectId: 'edexcel-ial-maths',
      completedSubtopicIds: ['t1-s1'],
      statusOverrideByTopicId: { t1: 'mastered' },
      notesByTopicId: { t1: 'Check sign flips' },
      xpAwardedTopicIds: ['t1'],
      activeMathsCashIn: 'YMA01',
      activeMathsUnits: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
      totalXp: 10,
      streakDays: 1,
    };
    const topicView = mapTopicsDtoToViewProps(topicsDto);
    expect(topicView.topics).toHaveLength(1);
    expect(topicView.initialState.notesByTopicId.t1).toBe('Check sign flips');

    const papersDto: StudyPastPapersResponseDto = {
      subjects: catalogDto.subjects,
      seriesList: [
        {
          id: 'mj-2025',
          chronologicalIndex: 10,
          edexcelLabel: 'May/June 2025',
          edexcelShort: 'MJ 25',
          cambridgeLabel: 'May/June 2025',
          cambridgeShort: 'MJ 25',
          sessionKind: 'summer',
        },
      ],
      rows: [],
      attempts: [],
      selectedSubjectId: 'edexcel-ial-maths',
      enrolledSubjectIds: ['edexcel-ial-maths'],
      activeMathsCashIn: 'YMA01',
      activeMathsUnits: ['WMA11', 'WMA12', 'WMA13', 'WMA14', 'WME01', 'WST01'],
      earnedPaperXp: 25,
      totalXp: 35,
      streakDays: 1,
    };
    const papersView = mapPastPapersDtoToViewProps(papersDto);
    expect(papersView.initialState.earnedPaperXp).toBe(25);

    const countdownsDto: StudyCountdownsResponseDto = {
      countdowns: [
        {
          id: 'exc_1',
          boardId: 'edexcel-ial',
          boardLabel: 'Edexcel IAL',
          paperCode: 'WMA11',
          title: 'Pure 1',
          examDateIso: '2026-11-23',
          examDateLabel: '23 Nov 2026',
          examTime24h: '09:00',
          targetGrade: 'A*',
          category: 'official',
          isCustom: false,
          isMock: false,
          colorTag: 'amber',
          pinned: true,
          syncedToFlow: true,
        },
      ],
      pinnedExamIds: ['exc_1'],
      flowSyncedExamIds: ['exc_1'],
      enrolledBoards: ['edexcel-ial'],
    };
    const countdownView = mapCountdownsResponseToViewProps(countdownsDto);
    expect(countdownView.baseExams[0]?.paperCode).toBe('WMA11');

    const dashDto: StudyDashboardResponseDto = {
      activeBoard: 'edexcel-ial',
      totalXp: 50,
      streakDays: 2,
      longestStreakDays: 2,
      subjectsByBoard: {
        'edexcel-ial': [],
        'cambridge-igcse': [],
        'cambridge-alevel': [],
        'edexcel-igcse': [],
      },
      countdowns: countdownsDto.countdowns,
      recentActivity: [],
      reviewedSubjectIdsByBoard: {
        'edexcel-ial': [],
        'cambridge-igcse': [],
        'cambridge-alevel': [],
        'edexcel-igcse': [],
      },
      pinnedExamIds: ['exc_1'],
      flowSyncedExamIds: ['exc_1'],
      mathsSuiteSummary: 'Cash-in YMA01 · 6/14 units',
    };
    const dashView = mapDashboardDtoToViewProps(dashDto);
    expect(dashView.boardTabs).toHaveLength(4);
    expect(dashView.countdowns).toHaveLength(1);

    const lbDto: StudyLeaderboardResponseDto = {
      visibleOnLeaderboard: true,
      currentUserXp: 50,
      currentUserStreak: 2,
      scholars: [],
      badges: [],
    };
    const lbView = mapLeaderboardDtoToViewProps(lbDto);
    expect(lbView.visibleOnLeaderboard).toBe(true);
  });
});
