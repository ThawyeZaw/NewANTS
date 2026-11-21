import { describe, expect, it } from 'vitest';
import {
  computeSubjectTopicStats,
  cycleTopicConfidenceStatus,
  deriveTopicStatus,
  filterSyllabusTopics,
  resolveSubjectIdFromParam,
  sanitizeStudyTopicsState,
  saveTopicNote,
  setTopicConfidenceStatus,
  toggleSubtopicCompletion,
  TOPIC_MASTERY_XP,
} from '../lib/study/topics';
import { MOCK_CURRICULUM_SUBJECTS } from '../mocks/study-curriculum.mock';
import {
  createDefaultStudyTopicsState,
  MOCK_SYLLABUS_TOPICS,
} from '../mocks/study-topics.mock';

describe('Study Syllabus Topic Tracker Engine ([ZYY-4.3])', () => {
  it('resolves dashboard aliases, syllabus codes, and canonical subject IDs', () => {
    expect(resolveSubjectIdFromParam('sub_wma11_set', MOCK_CURRICULUM_SUBJECTS)).toBe(
      'ial-maths-suite'
    );
    expect(resolveSubjectIdFromParam('WMA11-SET', MOCK_CURRICULUM_SUBJECTS)).toBe(
      'ial-maths-suite'
    );
    expect(resolveSubjectIdFromParam('0580', MOCK_CURRICULUM_SUBJECTS)).toBe(
      'igcse-maths-0580'
    );
    expect(resolveSubjectIdFromParam('9709', MOCK_CURRICULUM_SUBJECTS)).toBe(
      'cie-maths-9709'
    );
  });

  it('derives topic confidence status from subtopic completion and manual overrides', () => {
    const topic = MOCK_SYLLABUS_TOPICS.find((t) => t.id === 'topic-wma12-6')!;
    expect(topic.subtopics).toHaveLength(3);

    expect(deriveTopicStatus(topic, [])).toBe('not_started');
    expect(deriveTopicStatus(topic, ['sub-wma12-6a'])).toBe('in_progress');
    expect(
      deriveTopicStatus(topic, [
        'sub-wma12-6a',
        'sub-wma12-6b',
        'sub-wma12-6c',
      ])
    ).toBe('mastered');

    // Manual override takes precedence
    expect(
      deriveTopicStatus(topic, ['sub-wma12-6a'], {
        'topic-wma12-6': 'mastered',
      })
    ).toBe('mastered');
  });

  it('toggles subtopic completion and awards mastery XP when all subtopics are checked', () => {
    const initial = createDefaultStudyTopicsState();
    const topic = MOCK_SYLLABUS_TOPICS.find((t) => t.id === 'topic-wma12-6')!;

    // Initially 2/3 subtopics are completed (sub-wma12-6c is unchecked)
    expect(deriveTopicStatus(topic, initial.completedSubtopicIds)).toBe(
      'in_progress'
    );
    expect(initial.xpAwardedTopicIds).not.toContain('topic-wma12-6');

    // Check the 3rd subtopic -> topic becomes mastered and earns XP
    const afterAllChecked = toggleSubtopicCompletion(
      initial,
      topic,
      'sub-wma12-6c'
    );
    expect(deriveTopicStatus(topic, afterAllChecked.completedSubtopicIds)).toBe(
      'mastered'
    );
    expect(afterAllChecked.xpAwardedTopicIds).toContain('topic-wma12-6');
  });

  it('sets explicit confidence status and syncs subtopic checkboxes', () => {
    const initial = createDefaultStudyTopicsState();
    const topic = MOCK_SYLLABUS_TOPICS.find((t) => t.id === 'topic-wst01-6')!;

    // Initially not_started (0/3 subtopics)
    const masteredState = setTopicConfidenceStatus(initial, topic, 'mastered');
    expect(
      topic.subtopics.every((s) =>
        masteredState.completedSubtopicIds.includes(s.id)
      )
    ).toBe(true);
    expect(masteredState.xpAwardedTopicIds).toContain(topic.id);

    const resetState = setTopicConfidenceStatus(
      masteredState,
      topic,
      'not_started'
    );
    expect(
      topic.subtopics.some((s) =>
        resetState.completedSubtopicIds.includes(s.id)
      )
    ).toBe(false);

    expect(cycleTopicConfidenceStatus('not_started')).toBe('in_progress');
    expect(cycleTopicConfidenceStatus('in_progress')).toBe('mastered');
    expect(cycleTopicConfidenceStatus('mastered')).toBe('not_started');
  });

  it('saves and clears personal revision notes', () => {
    const initial = createDefaultStudyTopicsState();
    const withNote = saveTopicNote(
      initial,
      'topic-wst01-6',
      'Always draw a bell curve sketch before standardising Z.'
    );
    expect(withNote.notesByTopicId['topic-wst01-6']).toContain('bell curve');

    const cleared = saveTopicNote(withNote, 'topic-wst01-6', '   ');
    expect(cleared.notesByTopicId['topic-wst01-6']).toBeUndefined();
  });

  it('filters topics by unit code, cash-in unit subset, status, difficulty, and search query', () => {
    const state = createDefaultStudyTopicsState();

    const wma11Only = filterSyllabusTopics(MOCK_SYLLABUS_TOPICS, state, {
      subjectId: 'ial-maths-suite',
      unitCode: 'WMA11',
    });
    expect(wma11Only.length).toBeGreaterThanOrEqual(3);
    expect(wma11Only.every((t) => t.unitCode === 'WMA11')).toBe(true);

    const stretchOnly = filterSyllabusTopics(MOCK_SYLLABUS_TOPICS, state, {
      subjectId: 'ial-maths-suite',
      difficulty: 'stretch',
    });
    expect(stretchOnly.every((t) => t.difficulty === 'stretch')).toBe(true);

    const searchTrapezium = filterSyllabusTopics(MOCK_SYLLABUS_TOPICS, state, {
      subjectId: 'ial-maths-suite',
      searchQuery: 'trapezium',
    });
    expect(searchTrapezium).toHaveLength(1);
    expect(searchTrapezium[0]?.code).toBe('WMA12.6');
  });

  it('computes subject topic mastery stats and sanitizes persisted state safely', () => {
    const fallback = createDefaultStudyTopicsState();
    const stats = computeSubjectTopicStats(
      MOCK_SYLLABUS_TOPICS,
      fallback,
      'ial-maths-suite'
    );
    expect(stats.totalTopics).toBeGreaterThanOrEqual(10);
    expect(stats.masteredCount).toBeGreaterThanOrEqual(4);
    expect(stats.earnedTopicXp).toBe(
      fallback.xpAwardedTopicIds.length * TOPIC_MASTERY_XP
    );

    const sanitized = sanitizeStudyTopicsState(
      {
        completedSubtopicIds: ['sub-wma11-1a', 999],
        statusOverrideByTopicId: {
          'topic-wma11-1': 'mastered',
          'bad-topic': 'invalid_status',
        },
        notesByTopicId: {
          'topic-wma11-1': 'Custom note',
        },
      },
      fallback
    );
    expect(sanitized.completedSubtopicIds).toEqual(['sub-wma11-1a']);
    expect(sanitized.statusOverrideByTopicId['topic-wma11-1']).toBe('mastered');
    expect(sanitized.statusOverrideByTopicId['bad-topic']).toBeUndefined();
    expect(sanitized.notesByTopicId['topic-wma11-1']).toBe('Custom note');
  });
});

