import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUDY_NAV_ITEMS } from '../components/layout/views/StudyShellView';
import { StudyFlashcardsView } from '../components/learning/views/StudyFlashcardsView';
import { StudyNotesView } from '../components/learning/views/StudyNotesView';
import { StudyQuizzesView } from '../components/learning/views/StudyQuizzesView';
import {
  computeSm2Schedule,
  createBlankStudyNote,
  deleteStudyNoteInState,
  evaluateQuizSubmission,
  filterStudyNotes,
  getDeckMasteryStats,
  gradeQuizQuestion,
  NOTE_SAVE_XP,
  parseInlineMarkdownTokens,
  parseMarkdownBlocks,
  previewFlashcardIntervals,
  recordQuizAttemptInState,
  reviewCardInState,
  sanitizeStudyLearningState,
  toggleChecklistItemInMarkdown,
  toggleNotePinnedInState,
  upsertStudyNoteInState,
} from '../lib/study/learning';
import {
  createDefaultStudyLearningState,
  MOCK_STUDY_QUIZZES,
} from '../mocks/study-learning.mock';

describe('@ants/study [ZYY-4.6] Notes, Flashcards & Quizzes', () => {
  it('activates /notes, /flashcards, and /quizzes in StudyShellView navigation', () => {
    for (const routeId of ['notes', 'flashcards', 'quizzes'] as const) {
      const navItem = DEFAULT_STUDY_NAV_ITEMS.find((item) => item.id === routeId);
      expect(navItem?.available).toBe(true);
    }
  });

  it('parses Markdown blocks cleanly, resolves inline tokens, and toggles checklists', () => {
    const sample = [
      '# Circle Theorems',
      '',
      'Angle at **centre** is twice angle at `circumference`.',
      '',
      '```formula',
      'a + c = 180',
      '```',
      '',
      '> Examiner Tip: State cyclic quadrilateral explicitly.',
      '',
      '- [ ] Memorise proof 1',
      '- [x] Practice Paper 42',
    ].join('\n');

    const blocks = parseMarkdownBlocks(sample);
    expect(blocks.map((b) => b.type)).toEqual([
      'h1',
      'paragraph',
      'code',
      'callout',
      'checklist',
    ]);

    const inline = parseInlineMarkdownTokens('Angle at **centre** equals `2θ`.');
    expect(inline).toEqual([
      { type: 'text', text: 'Angle at ' },
      { type: 'bold', text: 'centre' },
      { type: 'text', text: ' equals ' },
      { type: 'code', text: '2θ' },
      { type: 'text', text: '.' },
    ]);

    const toggled = toggleChecklistItemInMarkdown(sample, 'Memorise proof 1');
    expect(toggled).toContain('- [x] Memorise proof 1');
  });

  it('supports Notes CRUD, search filtering, pinning, and idempotent custom note XP', () => {
    let state = createDefaultStudyLearningState();
    const initialCount = state.notes.length;

    const custom = createBlankStudyNote('edexcel-ial', 'WCH12', 42);
    custom.title = 'Organic Synthesis Map';
    const created = upsertStudyNoteInState(state, custom);
    state = created.nextState;
    expect(created.xpAwarded).toBe(NOTE_SAVE_XP);
    expect(state.notes.length).toBe(initialCount + 1);

    // Updating the same note does not double-award creation XP
    const resaved = upsertStudyNoteInState(state, { ...custom, title: 'Updated Synthesis Map' });
    state = resaved.nextState;
    expect(resaved.xpAwarded).toBe(0);

    state = toggleNotePinnedInState(state, custom.id);
    const pinnedOnly = filterStudyNotes(state.notes, {
      boardFilter: 'edexcel-ial',
      search: 'synthesis',
      pinnedOnly: true,
    });
    expect(pinnedOnly).toHaveLength(1);
    expect(pinnedOnly[0]?.title).toBe('Updated Synthesis Map');

    state = deleteStudyNoteInState(state, custom.id);
    expect(state.notes.length).toBe(initialCount);
  });

  it('computes SM-2 flashcard intervals accurately and clears deck queue with XP reward', () => {
    const baseCard = {
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
    };

    const preview = previewFlashcardIntervals(baseCard);
    expect(preview).toEqual({
      again: '10m',
      hard: '1d',
      good: '1d',
      easy: '4d',
    });

    const step1 = computeSm2Schedule(baseCard, 'good');
    const step2 = computeSm2Schedule(step1, 'good');
    expect(step2.intervalDays).toBe(4);
    expect(step2.intervalLabel).toBe('4d');

    const lapse = computeSm2Schedule(step2, 'again');
    expect(lapse.dueAtOffsetDays).toBe(0);
    expect(lapse.lapses).toBe(1);
    expect(lapse.intervalLabel).toBe('10m');

    let state = createDefaultStudyLearningState();
    const firstDue = state.cards.find(
      (c) => c.deckId === 'deck_wma12_p2' && c.dueAtOffsetDays <= 0
    );
    expect(firstDue).toBeDefined();
    if (firstDue) {
      const beforeStats = getDeckMasteryStats(state.cards, 'deck_wma12_p2');
      const res = reviewCardInState(state, firstDue.id, 'easy');
      state = res.nextState;
      const afterStats = getDeckMasteryStats(state.cards, 'deck_wma12_p2');
      expect(afterStats.dueNow).toBe(beforeStats.dueNow - 1);
      expect(res.xpAwarded).toBeGreaterThanOrEqual(3);
    }
  });

  it('grades MCQ and tolerance-aware short answers and sanitizes corrupt snapshots', () => {
    const quiz = MOCK_STUDY_QUIZZES[0]!;
    const numericQuestion = quiz.questions[1]!;

    expect(gradeQuizQuestion(numericQuestion, '15').correct).toBe(true);
    expect(gradeQuizQuestion(numericQuestion, '14').correct).toBe(false);

    const evaluation = evaluateQuizSubmission(
      quiz,
      {
        q_wma12_1: 1,
        q_wma12_2: '15',
        q_wma12_3: 0, // intentionally wrong
        q_wma12_4: '17',
      },
      'timed'
    );
    expect(evaluation.score).toBe(6);
    expect(evaluation.maxScore).toBe(8);
    expect(evaluation.percent).toBe(75);
    expect(evaluation.incorrectQuestionIds).toEqual(['q_wma12_3']);

    const state = recordQuizAttemptInState(createDefaultStudyLearningState(), {
      id: 'att_test',
      quizId: quiz.id,
      quizTitle: quiz.title,
      subjectCode: quiz.subjectCode,
      completedAtLabel: 'Now',
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      percent: evaluation.percent,
      xpEarned: evaluation.xpEarned,
      mode: 'timed',
      incorrectQuestionIds: evaluation.incorrectQuestionIds,
    });
    expect(state.earnedLearningXp).toBe(evaluation.xpEarned);

    const fallback = createDefaultStudyLearningState();
    expect(sanitizeStudyLearningState(null, fallback)).toEqual(fallback);
    const sanitized = sanitizeStudyLearningState(
      { notes: 'invalid', earnedLearningXp: 999999 },
      fallback
    );
    expect(sanitized.notes).toEqual(fallback.notes);
    expect(sanitized.earnedLearningXp).toBe(5000);
  });

  it('renders StudyNotesView, StudyFlashcardsView, and StudyQuizzesView cleanly via SSR', () => {
    const notesHtml = renderToStaticMarkup(React.createElement(StudyNotesView));
    const cardsHtml = renderToStaticMarkup(React.createElement(StudyFlashcardsView));
    const quizzesHtml = renderToStaticMarkup(React.createElement(StudyQuizzesView));

    expect(notesHtml).toContain('Syllabus Markdown Notes');
    expect(cardsHtml).toContain('Active Recall Flashcards');
    expect(quizzesHtml).toContain('Topical Quizzes &amp; Mark-Scheme Drills');
  });
});

