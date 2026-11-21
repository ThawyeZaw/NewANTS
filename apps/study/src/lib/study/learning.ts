/**
 * Study Learning Tools — Pure TypeScript Engine & Defensive Persistence (`[ZYY-4.6]`).
 *
 * Covers three interactive learning modules with zero React, Next.js, or database dependencies
 * so Thaw can reuse the domain math and contracts directly when wiring `[THAW-4.6]`:
 *   1. Markdown Study Notes (safe AST block parser, inline emphasis/code tokens, checklist toggle, search/filter CRUD)
 *   2. SM-2 Spaced-Repetition Flashcards (interval scheduler, Again/Hard/Good/Easy preview, deck/card CRUD)
 *   3. Topical Quizzes (MCQ + tolerance-aware short-answer grading, timed/practice mode, attempt history & mistake retry)
 */

import type { StudyBoardPresetId } from './dashboard';

export const STUDY_LEARNING_STORAGE_KEY = 'ants-study-learning-v1';
export const STUDY_LEARNING_CHANGE_EVENT = 'ants-study-learning-change';

export const NOTE_SAVE_XP = 10;
export const FLASHCARD_CARD_XP = 3;
export const FLASHCARD_DECK_XP = 15;
export const QUIZ_COMPLETE_XP = 20;

export type LearningBoardFilter = 'all' | StudyBoardPresetId;

// ---------------------------------------------------------------------------
// 1. Markdown Study Notes Types & Safe Parser
// ---------------------------------------------------------------------------

export interface MarkdownInlineToken {
  type: 'text' | 'bold' | 'code';
  text: string;
}

export interface MarkdownChecklistEntry {
  text: string;
  checked: boolean;
}

export type MarkdownBlock =
  | { type: 'h1'; id: string; text: string }
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3'; id: string; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; lines: string[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'checklist'; items: MarkdownChecklistEntry[] }
  | { type: 'hr' };

export interface StudyNoteHeading {
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

export interface StudyNoteItem {
  id: string;
  boardId: StudyBoardPresetId;
  subjectCode: string;
  topicCode: string;
  title: string;
  authorName: string;
  isPinned: boolean;
  isOfficial: boolean;
  tags: string[];
  updatedLabel: string;
  readMinutes: number;
  contentMarkdown: string;
  linkedDeckId?: string;
  linkedQuizId?: string;
}

// ---------------------------------------------------------------------------
// 2. Spaced-Repetition Flashcards (SM-2) Types
// ---------------------------------------------------------------------------

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardDeckItem {
  id: string;
  boardId: StudyBoardPresetId;
  subjectCode: string;
  topicCode: string;
  title: string;
  description: string;
  createdBy: string;
}

export interface FlashcardCardItem {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint?: string;
  formulaOrExample?: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  /** 0 = due now; positive integer = days until next scheduled review */
  dueAtOffsetDays: number;
  lastRating?: FlashcardRating;
  totalReviews: number;
}

export interface FlashcardDeckStats {
  total: number;
  dueNow: number;
  learning: number;
  mastered: number;
  masteryPercent: number;
}

export interface Sm2ScheduleResult {
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  dueAtOffsetDays: number;
  intervalLabel: string;
}

// ---------------------------------------------------------------------------
// 3. Topical Quizzes Types
// ---------------------------------------------------------------------------

export type QuizQuestionType = 'mcq' | 'short_answer';
export type QuizDifficulty = 'foundation' | 'standard' | 'stretch';
export type QuizRunMode = 'practice' | 'timed';

export interface QuizQuestionItem {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  topicCode: string;
  marks: number;
  options?: string[];
  correctIndex?: number;
  acceptedAnswers?: string[];
  numericTarget?: {
    value: number;
    tolerance: number;
    unit?: string;
  };
  formulaHint?: string;
  explanation: string;
}

export interface StudyQuizItem {
  id: string;
  boardId: StudyBoardPresetId;
  subjectCode: string;
  title: string;
  topicLabel: string;
  difficulty: QuizDifficulty;
  durationMinutes: number;
  questions: QuizQuestionItem[];
}

export interface QuizAttemptRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  subjectCode: string;
  completedAtLabel: string;
  score: number;
  maxScore: number;
  percent: number;
  xpEarned: number;
  mode: QuizRunMode;
  incorrectQuestionIds: string[];
}

export interface StudyLearningPersistedState {
  version: 1;
  notes: StudyNoteItem[];
  decks: FlashcardDeckItem[];
  cards: FlashcardCardItem[];
  quizAttempts: QuizAttemptRecord[];
  awardedNoteIds: string[];
  awardedDeckIds: string[];
  earnedLearningXp: number;
  cardsReviewedToday: number;
}

// ---------------------------------------------------------------------------
// Markdown Helpers (Pure & XSS-Safe)
// ---------------------------------------------------------------------------

export function slugifyHeadingId(text: string): string {
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  return clean || 'section';
}

export function estimateNoteReadMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function parseInlineMarkdownTokens(input: string): MarkdownInlineToken[] {
  const tokens: MarkdownInlineToken[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ type: 'bold', text: raw.slice(2, -2) });
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', text: raw.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', text: raw });
    }
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', text: input.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', text: input }];
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // Fenced code or formula block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'formula';
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i += 1;
      }
      if (i < lines.length && (lines[i] ?? '').trim().startsWith('```')) {
        i += 1;
      }
      blocks.push({ type: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4).trim();
      blocks.push({ type: 'h3', id: slugifyHeadingId(text), text });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3).trim();
      blocks.push({ type: 'h2', id: slugifyHeadingId(text), text });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      const text = trimmed.slice(2).trim();
      blocks.push({ type: 'h1', id: slugifyHeadingId(text), text });
      i += 1;
      continue;
    }

    // Callout / blockquote
    if (trimmed.startsWith('> ')) {
      const calloutLines: string[] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('> ')) {
        calloutLines.push((lines[i] ?? '').trim().slice(2));
        i += 1;
      }
      blocks.push({ type: 'callout', lines: calloutLines });
      continue;
    }

    // Checklist (- [ ] or - [x])
    if (/^-\s+\[[ xX]\]\s+/.test(trimmed)) {
      const items: MarkdownChecklistEntry[] = [];
      while (i < lines.length && /^-\s+\[[ xX]\]\s+/.test((lines[i] ?? '').trim())) {
        const current = (lines[i] ?? '').trim();
        const checked = /^-\s+\[[xX]\]\s+/.test(current);
        const text = current.replace(/^-\s+\[[ xX]\]\s+/, '').trim();
        items.push({ text, checked });
        i += 1;
      }
      blocks.push({ type: 'checklist', items });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (
        i < lines.length &&
        /^[-*]\s+/.test((lines[i] ?? '').trim()) &&
        !/^-\s+\[[ xX]\]\s+/.test((lines[i] ?? '').trim())
      ) {
        items.push((lines[i] ?? '').trim().replace(/^[-*]\s+/, '').trim());
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^\d+\.\s+/, '').trim());
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph until blank line or structural delimiter
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = (lines[i] ?? '').trim();
      if (
        !cur ||
        cur === '---' ||
        cur === '***' ||
        cur.startsWith('```') ||
        cur.startsWith('# ') ||
        cur.startsWith('## ') ||
        cur.startsWith('### ') ||
        cur.startsWith('> ') ||
        /^[-*]\s+/.test(cur) ||
        /^\d+\.\s+/.test(cur)
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }
    blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

export function extractNoteHeadings(markdown: string): StudyNoteHeading[] {
  const blocks = parseMarkdownBlocks(markdown);
  const headings: StudyNoteHeading[] = [];
  for (const block of blocks) {
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      headings.push({
        id: block.id,
        level: block.type === 'h1' ? 1 : block.type === 'h2' ? 2 : 3,
        text: block.text,
      });
    }
  }
  return headings;
}

/** Toggles `- [ ] item` <-> `- [x] item` matching a given label inside Markdown. */
export function toggleChecklistItemInMarkdown(markdown: string, targetText: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let toggled = false;
  const nextLines = lines.map((line) => {
    if (toggled) return line;
    const match = /^(\s*-\s+\[)([ xX])(\]\s+)(.+)$/.exec(line);
    if (!match) return line;
    const label = (match[4] ?? '').trim();
    if (label !== targetText.trim()) return line;
    toggled = true;
    const nextMark = match[2] === 'x' || match[2] === 'X' ? ' ' : 'x';
    return `${match[1]}${nextMark}${match[3]}${match[4]}`;
  });
  return nextLines.join('\n');
}

export function filterStudyNotes(
  notes: StudyNoteItem[],
  opts: {
    boardFilter: LearningBoardFilter;
    search: string;
    pinnedOnly?: boolean;
    subjectCode?: string;
  }
): StudyNoteItem[] {
  const q = opts.search.trim().toLowerCase();
  const filtered = notes.filter((note) => {
    if (opts.boardFilter !== 'all' && note.boardId !== opts.boardFilter) return false;
    if (opts.pinnedOnly && !note.isPinned) return false;
    if (opts.subjectCode && opts.subjectCode !== 'all' && note.subjectCode !== opts.subjectCode) {
      return false;
    }
    if (q) {
      const hay =
        `${note.title} ${note.subjectCode} ${note.topicCode} ${note.tags.join(' ')} ${note.contentMarkdown}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function createBlankStudyNote(
  boardId: StudyBoardPresetId,
  subjectCode?: string,
  idSeed = Date.now()
): StudyNoteItem {
  const resolvedSubject =
    subjectCode && subjectCode !== 'all'
      ? subjectCode
      : boardId === 'edexcel-ial'
        ? 'WMA12'
        : '0580';
  const defaultBody = [
    `## Key Concepts (${resolvedSubject})`,
    '',
    'Summarise core definitions, standard forms, and examiner keywords here.',
    '',
    '```formula',
    'Write a key equation or identity',
    '```',
    '',
    '> Examiner Tip: State units clearly and show intermediate substitution before rounding.',
    '',
    '### Revision Checklist',
    '- [ ] Review worked example from class notes',
    '- [ ] Complete 2 timed past-paper questions on this topic',
  ].join('\n');

  return {
    id: `note_custom_${idSeed}`,
    boardId,
    subjectCode: resolvedSubject,
    topicCode: `${resolvedSubject}.1`,
    title: 'Untitled Study Note',
    authorName: 'You',
    isPinned: false,
    isOfficial: false,
    tags: [resolvedSubject.toLowerCase(), 'revision'],
    updatedLabel: 'Just now',
    readMinutes: estimateNoteReadMinutes(defaultBody),
    contentMarkdown: defaultBody,
  };
}

export function upsertStudyNoteInState(
  state: StudyLearningPersistedState,
  note: StudyNoteItem
): { nextState: StudyLearningPersistedState; xpAwarded: number } {
  const cleanNote: StudyNoteItem = {
    ...note,
    title: note.title.trim() || 'Untitled Study Note',
    subjectCode: note.subjectCode.trim().toUpperCase() || 'WMA12',
    topicCode: note.topicCode.trim().toUpperCase() || 'TOPIC',
    readMinutes: estimateNoteReadMinutes(note.contentMarkdown),
    updatedLabel: 'Updated now',
  };

  const exists = state.notes.some((item) => item.id === cleanNote.id);
  const nextNotes = exists
    ? state.notes.map((item) => (item.id === cleanNote.id ? cleanNote : item))
    : [cleanNote, ...state.notes];

  const alreadyAwarded = state.awardedNoteIds.includes(cleanNote.id);
  const xpAwarded = !alreadyAwarded && !cleanNote.isOfficial ? NOTE_SAVE_XP : 0;

  return {
    nextState: {
      ...state,
      notes: nextNotes,
      awardedNoteIds:
        xpAwarded > 0 ? [...state.awardedNoteIds, cleanNote.id] : state.awardedNoteIds,
      earnedLearningXp: state.earnedLearningXp + xpAwarded,
    },
    xpAwarded,
  };
}

export function deleteStudyNoteInState(
  state: StudyLearningPersistedState,
  noteId: string
): StudyLearningPersistedState {
  return {
    ...state,
    notes: state.notes.filter((note) => note.id !== noteId),
  };
}

export function toggleNotePinnedInState(
  state: StudyLearningPersistedState,
  noteId: string
): StudyLearningPersistedState {
  return {
    ...state,
    notes: state.notes.map((note) =>
      note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
    ),
  };
}

// ---------------------------------------------------------------------------
// Spaced-Repetition Flashcard Engine (SM-2)
// ---------------------------------------------------------------------------

export function formatSrsIntervalLabel(intervalDays: number): string {
  if (intervalDays <= 0) return '10m';
  if (intervalDays === 1) return '1d';
  if (intervalDays < 30) return `${intervalDays}d`;
  const months = Math.round(intervalDays / 30);
  return `${months}mo`;
}

/**
 * Pure SM-2 spaced-repetition calculation matching standard `Again / Hard / Good / Easy` intervals.
 */
export function computeSm2Schedule(
  card: Pick<FlashcardCardItem, 'intervalDays' | 'easeFactor' | 'repetitions' | 'lapses'>,
  rating: FlashcardRating
): Sm2ScheduleResult {
  const ease = Math.max(1.3, card.easeFactor || 2.5);
  const prevInterval = Math.max(0, card.intervalDays || 0);
  const prevReps = Math.max(0, card.repetitions || 0);

  if (rating === 'again') {
    return {
      intervalDays: 0,
      easeFactor: Math.max(1.3, Number((ease - 0.2).toFixed(2))),
      repetitions: 0,
      lapses: card.lapses + 1,
      dueAtOffsetDays: 0,
      intervalLabel: '10m',
    };
  }

  let nextInterval: number;
  const nextReps = prevReps + 1;
  let nextEase = ease;

  if (rating === 'hard') {
    nextInterval = prevReps === 0 ? 1 : Math.max(1, Math.round(prevInterval * 1.2));
    nextEase = Math.max(1.3, Number((ease - 0.15).toFixed(2)));
  } else if (rating === 'good') {
    if (prevReps === 0) {
      nextInterval = 1;
    } else if (prevReps === 1) {
      nextInterval = 4;
    } else {
      nextInterval = Math.max(prevInterval + 1, Math.round(prevInterval * ease));
    }
  } else {
    // easy
    if (prevReps === 0) {
      nextInterval = 4;
    } else if (prevReps === 1) {
      nextInterval = 7;
    } else {
      nextInterval = Math.max(prevInterval + 2, Math.round(prevInterval * ease * 1.3));
    }
    nextEase = Math.min(3.0, Number((ease + 0.15).toFixed(2)));
  }

  return {
    intervalDays: nextInterval,
    easeFactor: nextEase,
    repetitions: nextReps,
    lapses: card.lapses,
    dueAtOffsetDays: nextInterval,
    intervalLabel: formatSrsIntervalLabel(nextInterval),
  };
}

export function previewFlashcardIntervals(
  card: Pick<FlashcardCardItem, 'intervalDays' | 'easeFactor' | 'repetitions' | 'lapses'>
): Record<FlashcardRating, string> {
  return {
    again: computeSm2Schedule(card, 'again').intervalLabel,
    hard: computeSm2Schedule(card, 'hard').intervalLabel,
    good: computeSm2Schedule(card, 'good').intervalLabel,
    easy: computeSm2Schedule(card, 'easy').intervalLabel,
  };
}

export function getDeckMasteryStats(
  cards: FlashcardCardItem[],
  deckId: string
): FlashcardDeckStats {
  const deckCards = cards.filter((c) => c.deckId === deckId);
  const total = deckCards.length;
  const dueNow = deckCards.filter((c) => c.dueAtOffsetDays <= 0).length;
  const mastered = deckCards.filter((c) => c.intervalDays >= 4 && c.dueAtOffsetDays > 0).length;
  const learning = Math.max(0, total - mastered);
  const masteryPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return { total, dueNow, learning, mastered, masteryPercent };
}

export function getQueueForDeck(
  cards: FlashcardCardItem[],
  deckId: string,
  includeAllForCram: boolean
): FlashcardCardItem[] {
  const deckCards = cards.filter((c) => c.deckId === deckId);
  const filtered = includeAllForCram
    ? deckCards
    : deckCards.filter((c) => c.dueAtOffsetDays <= 0);
  return [...filtered].sort((a, b) => a.dueAtOffsetDays - b.dueAtOffsetDays);
}

export function reviewCardInState(
  state: StudyLearningPersistedState,
  cardId: string,
  rating: FlashcardRating
): {
  nextState: StudyLearningPersistedState;
  schedule: Sm2ScheduleResult | null;
  xpAwarded: number;
} {
  const target = state.cards.find((c) => c.id === cardId);
  if (!target) {
    return { nextState: state, schedule: null, xpAwarded: 0 };
  }

  const schedule = computeSm2Schedule(target, rating);
  const updatedCard: FlashcardCardItem = {
    ...target,
    intervalDays: schedule.intervalDays,
    easeFactor: schedule.easeFactor,
    repetitions: schedule.repetitions,
    lapses: schedule.lapses,
    dueAtOffsetDays: schedule.dueAtOffsetDays,
    lastRating: rating,
    totalReviews: target.totalReviews + 1,
  };

  const nextCards = state.cards.map((c) => (c.id === cardId ? updatedCard : c));
  const deckStatsAfter = getDeckMasteryStats(nextCards, target.deckId);
  const deckClearedBonus =
    deckStatsAfter.dueNow === 0 && !state.awardedDeckIds.includes(target.deckId)
      ? FLASHCARD_DECK_XP
      : 0;
  const xpAwarded = (rating === 'again' ? 1 : FLASHCARD_CARD_XP) + deckClearedBonus;

  return {
    nextState: {
      ...state,
      cards: nextCards,
      awardedDeckIds:
        deckClearedBonus > 0 ? [...state.awardedDeckIds, target.deckId] : state.awardedDeckIds,
      earnedLearningXp: state.earnedLearningXp + xpAwarded,
      cardsReviewedToday: state.cardsReviewedToday + 1,
    },
    schedule,
    xpAwarded,
  };
}

export function upsertFlashcardInState(
  state: StudyLearningPersistedState,
  card: FlashcardCardItem
): StudyLearningPersistedState {
  const exists = state.cards.some((c) => c.id === card.id);
  return {
    ...state,
    cards: exists ? state.cards.map((c) => (c.id === card.id ? card : c)) : [...state.cards, card],
  };
}

export function deleteFlashcardInState(
  state: StudyLearningPersistedState,
  cardId: string
): StudyLearningPersistedState {
  return {
    ...state,
    cards: state.cards.filter((c) => c.id !== cardId),
  };
}

export function createCustomDeckInState(
  state: StudyLearningPersistedState,
  input: {
    boardId: StudyBoardPresetId;
    subjectCode: string;
    topicCode: string;
    title: string;
    description: string;
  },
  idSeed = Date.now()
): { nextState: StudyLearningPersistedState; deckId: string } {
  const deckId = `deck_custom_${idSeed}`;
  const cleanSubject = input.subjectCode.trim().toUpperCase() || 'WMA12';
  const newDeck: FlashcardDeckItem = {
    id: deckId,
    boardId: input.boardId,
    subjectCode: cleanSubject,
    topicCode: input.topicCode.trim().toUpperCase() || `${cleanSubject}.1`,
    title: input.title.trim() || `${cleanSubject} Custom Recall Deck`,
    description: input.description.trim() || 'Student-authored active recall flashcards.',
    createdBy: 'You',
  };

  return {
    deckId,
    nextState: {
      ...state,
      decks: [newDeck, ...state.decks],
    },
  };
}

// ---------------------------------------------------------------------------
// Topical Quizzes Engine
// ---------------------------------------------------------------------------

function normalizeShortAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/−/g, '-')
    .replace(/×/g, '*');
}

export function gradeQuizQuestion(
  question: QuizQuestionItem,
  rawAnswer: number | string | undefined
): {
  answered: boolean;
  correct: boolean;
  expectedDisplay: string;
} {
  if (question.type === 'mcq') {
    const correctIdx = question.correctIndex ?? 0;
    const expectedDisplay = question.options?.[correctIdx] ?? 'Option';
    if (typeof rawAnswer !== 'number') {
      return { answered: false, correct: false, expectedDisplay };
    }
    return {
      answered: true,
      correct: rawAnswer === correctIdx,
      expectedDisplay,
    };
  }

  // short_answer
  const expectedDisplay = question.numericTarget
    ? `${question.numericTarget.value}${question.numericTarget.unit ? ` ${question.numericTarget.unit}` : ''}`
    : (question.acceptedAnswers?.[0] ?? '');

  if (typeof rawAnswer !== 'string' || !rawAnswer.trim()) {
    return { answered: false, correct: false, expectedDisplay };
  }

  if (question.numericTarget) {
    const numericCandidate = Number(rawAnswer.replace(/[^\d.+-]/g, ''));
    if (Number.isFinite(numericCandidate)) {
      const withinTolerance =
        Math.abs(numericCandidate - question.numericTarget.value) <=
        question.numericTarget.tolerance;
      if (withinTolerance) {
        return { answered: true, correct: true, expectedDisplay };
      }
    }
  }

  const normalizedUser = normalizeShortAnswer(rawAnswer);
  const accepted = (question.acceptedAnswers ?? []).some(
    (ans) => normalizeShortAnswer(ans) === normalizedUser
  );

  return {
    answered: true,
    correct: accepted,
    expectedDisplay,
  };
}

export function evaluateQuizSubmission(
  quiz: StudyQuizItem,
  answers: Record<string, number | string>,
  mode: QuizRunMode,
  questionSubset?: QuizQuestionItem[]
): {
  score: number;
  maxScore: number;
  percent: number;
  xpEarned: number;
  incorrectQuestionIds: string[];
  resultsByQuestionId: Record<string, { answered: boolean; correct: boolean; expectedDisplay: string }>;
} {
  const questions = questionSubset && questionSubset.length > 0 ? questionSubset : quiz.questions;
  let score = 0;
  let maxScore = 0;
  const incorrectQuestionIds: string[] = [];
  const resultsByQuestionId: Record<
    string,
    { answered: boolean; correct: boolean; expectedDisplay: string }
  > = {};

  for (const question of questions) {
    maxScore += question.marks;
    const verdict = gradeQuizQuestion(question, answers[question.id]);
    resultsByQuestionId[question.id] = verdict;
    if (verdict.correct) {
      score += question.marks;
    } else {
      incorrectQuestionIds.push(question.id);
    }
  }

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const xpEarned = percent >= 50 ? QUIZ_COMPLETE_XP : Math.round(QUIZ_COMPLETE_XP / 2);

  return {
    score,
    maxScore,
    percent,
    xpEarned: mode === 'timed' && percent >= 80 ? xpEarned + 5 : xpEarned,
    incorrectQuestionIds,
    resultsByQuestionId,
  };
}

export function recordQuizAttemptInState(
  state: StudyLearningPersistedState,
  attempt: QuizAttemptRecord
): StudyLearningPersistedState {
  return {
    ...state,
    quizAttempts: [attempt, ...state.quizAttempts].slice(0, 20),
    earnedLearningXp: state.earnedLearningXp + attempt.xpEarned,
  };
}

// ---------------------------------------------------------------------------
// Defensive Storage & Sanitization
// ---------------------------------------------------------------------------

export function sanitizeStudyLearningState(
  raw: unknown,
  fallback: StudyLearningPersistedState
): StudyLearningPersistedState {
  if (!raw || typeof raw !== 'object') return fallback;
  const candidate = raw as Partial<StudyLearningPersistedState>;

  const notes: StudyNoteItem[] = Array.isArray(candidate.notes)
    ? candidate.notes
        .filter((n): n is StudyNoteItem => {
          return (
            Boolean(n) &&
            typeof n === 'object' &&
            typeof n.id === 'string' &&
            typeof n.title === 'string' &&
            typeof n.contentMarkdown === 'string' &&
            (n.boardId === 'edexcel-ial' || n.boardId === 'cambridge-igcse')
          );
        })
        .map((n) => ({
          ...n,
          subjectCode: typeof n.subjectCode === 'string' ? n.subjectCode : 'WMA12',
          topicCode: typeof n.topicCode === 'string' ? n.topicCode : 'TOPIC',
          authorName: typeof n.authorName === 'string' ? n.authorName : 'ANTs Team',
          isPinned: Boolean(n.isPinned),
          isOfficial: Boolean(n.isOfficial),
          tags: Array.isArray(n.tags)
            ? n.tags.filter((t): t is string => typeof t === 'string')
            : [],
          updatedLabel: typeof n.updatedLabel === 'string' ? n.updatedLabel : 'Saved',
          readMinutes:
            typeof n.readMinutes === 'number' && Number.isFinite(n.readMinutes)
              ? Math.max(1, n.readMinutes)
              : estimateNoteReadMinutes(n.contentMarkdown),
        }))
    : fallback.notes;

  const decks: FlashcardDeckItem[] = Array.isArray(candidate.decks)
    ? candidate.decks.filter((d): d is FlashcardDeckItem => {
        return (
          Boolean(d) &&
          typeof d === 'object' &&
          typeof d.id === 'string' &&
          typeof d.title === 'string' &&
          (d.boardId === 'edexcel-ial' || d.boardId === 'cambridge-igcse')
        );
      })
    : fallback.decks;

  const cards: FlashcardCardItem[] = Array.isArray(candidate.cards)
    ? candidate.cards
        .filter((c): c is FlashcardCardItem => {
          return (
            Boolean(c) &&
            typeof c === 'object' &&
            typeof c.id === 'string' &&
            typeof c.deckId === 'string' &&
            typeof c.front === 'string' &&
            typeof c.back === 'string'
          );
        })
        .map((c) => ({
          ...c,
          intervalDays:
            typeof c.intervalDays === 'number' && Number.isFinite(c.intervalDays)
              ? Math.max(0, c.intervalDays)
              : 0,
          easeFactor:
            typeof c.easeFactor === 'number' && Number.isFinite(c.easeFactor)
              ? Math.max(1.3, c.easeFactor)
              : 2.5,
          repetitions:
            typeof c.repetitions === 'number' && Number.isFinite(c.repetitions)
              ? Math.max(0, c.repetitions)
              : 0,
          lapses:
            typeof c.lapses === 'number' && Number.isFinite(c.lapses) ? Math.max(0, c.lapses) : 0,
          dueAtOffsetDays:
            typeof c.dueAtOffsetDays === 'number' && Number.isFinite(c.dueAtOffsetDays)
              ? Math.max(0, c.dueAtOffsetDays)
              : 0,
          totalReviews:
            typeof c.totalReviews === 'number' && Number.isFinite(c.totalReviews)
              ? Math.max(0, c.totalReviews)
              : 0,
        }))
    : fallback.cards;

  const quizAttempts: QuizAttemptRecord[] = Array.isArray(candidate.quizAttempts)
    ? candidate.quizAttempts.filter((a): a is QuizAttemptRecord => {
        return (
          Boolean(a) &&
          typeof a === 'object' &&
          typeof a.id === 'string' &&
          typeof a.quizId === 'string' &&
          typeof a.percent === 'number'
        );
      })
    : fallback.quizAttempts;

  return {
    version: 1,
    notes,
    decks,
    cards,
    quizAttempts,
    awardedNoteIds: Array.isArray(candidate.awardedNoteIds)
      ? candidate.awardedNoteIds.filter((id): id is string => typeof id === 'string')
      : fallback.awardedNoteIds,
    awardedDeckIds: Array.isArray(candidate.awardedDeckIds)
      ? candidate.awardedDeckIds.filter((id): id is string => typeof id === 'string')
      : fallback.awardedDeckIds,
    earnedLearningXp:
      typeof candidate.earnedLearningXp === 'number' &&
      Number.isFinite(candidate.earnedLearningXp)
        ? Math.max(0, Math.min(5000, candidate.earnedLearningXp))
        : fallback.earnedLearningXp,
    cardsReviewedToday:
      typeof candidate.cardsReviewedToday === 'number' &&
      Number.isFinite(candidate.cardsReviewedToday)
        ? Math.max(0, Math.min(500, candidate.cardsReviewedToday))
        : fallback.cardsReviewedToday,
  };
}

export function loadStudyLearningState(
  fallback: StudyLearningPersistedState
): StudyLearningPersistedState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_LEARNING_STORAGE_KEY);
    if (!raw) return fallback;
    return sanitizeStudyLearningState(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveStudyLearningState(state: StudyLearningPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDY_LEARNING_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(STUDY_LEARNING_CHANGE_EVENT));
  } catch {
    // Ignore private browsing / storage quota restrictions.
  }
}

export function resetStudyLearningState(
  fallback: StudyLearningPersistedState
): StudyLearningPersistedState {
  saveStudyLearningState(fallback);
  return fallback;
}
