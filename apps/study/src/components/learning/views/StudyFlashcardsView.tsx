'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  HelpCircle,
  Keyboard,
  Layers,
  Lightbulb,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  MOCK_AUTHENTICATED_USER,
  Modal,
  cn,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  createCustomDeckInState,
  deleteFlashcardInState,
  getDeckMasteryStats,
  getQueueForDeck,
  loadStudyLearningState,
  previewFlashcardIntervals,
  reviewCardInState,
  saveStudyLearningState,
  upsertFlashcardInState,
  type FlashcardCardItem,
  type FlashcardDeckItem,
  type FlashcardRating,
  type LearningBoardFilter,
  type StudyLearningPersistedState,
} from '../../../lib/study/learning';
import type { StudyBoardPresetId } from '../../../lib/study/dashboard';
import { createDefaultStudyLearningState } from '../../../mocks/study-learning.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';

export interface StudyFlashcardsViewProps {
  user?: MockUserProfile | null;
  initialState?: StudyLearningPersistedState;
  initialDeckId?: string;
  flowUrl?: string;
  orgUrl?: string;
  /** Controlled callbacks for `[THAW-4.6]` full-stack wiring */
  onRateCard?: (cardId: string, rating: FlashcardRating) => void;
  onSaveCard?: (card: FlashcardCardItem) => void;
  onCreateDeck?: (deck: FlashcardDeckItem) => void;
}

const BOARD_FILTERS: { id: LearningBoardFilter; label: string }[] = [
  { id: 'all', label: 'All Boards' },
  { id: 'edexcel-ial', label: 'Edexcel IAL' },
  { id: 'cambridge-igcse', label: 'Cambridge IGCSE' },
];

export function StudyFlashcardsView({
  user = MOCK_AUTHENTICATED_USER,
  initialState,
  initialDeckId,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onRateCard,
  onSaveCard,
  onCreateDeck,
}: StudyFlashcardsViewProps) {
  const defaultState = useMemo(
    () => initialState ?? createDefaultStudyLearningState(),
    [initialState]
  );

  const [learningState, setLearningState] = useState<StudyLearningPersistedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [boardFilter, setBoardFilter] = useState<LearningBoardFilter>('all');
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    initialDeckId ?? defaultState.decks[0]?.id ?? ''
  );
  const [cramMode, setCramMode] = useState(false);
  const [cramCursor, setCramCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cardsListOpen, setCardsListOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Add Card Modal state
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newHint, setNewHint] = useState('');
  const [newFormula, setNewFormula] = useState('');

  // New Deck Modal state
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [deckBoard, setDeckBoard] = useState<StudyBoardPresetId>('edexcel-ial');
  const [deckSubject, setDeckSubject] = useState('WMA12');
  const [deckTopic, setDeckTopic] = useState('WMA12.4');
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');

  const boardTabsRef = useRef<HTMLDivElement>(null);
  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, boardFilter, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });

  useEffect(() => {
    const loaded = loadStudyLearningState(defaultState);
    setLearningState(loaded);
    const urlDeckId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('deck')
        : null;
    const requestedId = initialDeckId ?? urlDeckId;
    if (requestedId && loaded.decks.some((d) => d.id === requestedId)) {
      setSelectedDeckId(requestedId);
    } else if (loaded.decks[0]) {
      setSelectedDeckId(loaded.decks[0].id);
    }
    setHydrated(true);
  }, [defaultState, initialDeckId]);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyLearningState(learningState);
  }, [hydrated, learningState]);

  const visibleDecks = useMemo(() => {
    return learningState.decks.filter(
      (deck) => boardFilter === 'all' || deck.boardId === boardFilter
    );
  }, [learningState.decks, boardFilter]);

  const activeDeck = useMemo(() => {
    return (
      learningState.decks.find((d) => d.id === selectedDeckId) ??
      visibleDecks[0] ??
      learningState.decks[0] ??
      null
    );
  }, [learningState.decks, selectedDeckId, visibleDecks]);

  const deckCards = useMemo(() => {
    if (!activeDeck) return [];
    return learningState.cards.filter((c) => c.deckId === activeDeck.id);
  }, [learningState.cards, activeDeck]);

  const activeStats = useMemo(() => {
    if (!activeDeck) {
      return { total: 0, dueNow: 0, learning: 0, mastered: 0, masteryPercent: 0 };
    }
    return getDeckMasteryStats(learningState.cards, activeDeck.id);
  }, [learningState.cards, activeDeck]);

  const queue = useMemo(() => {
    if (!activeDeck) return [];
    return getQueueForDeck(learningState.cards, activeDeck.id, cramMode);
  }, [learningState.cards, activeDeck, cramMode]);

  const activeCard = cramMode
    ? queue[cramCursor % Math.max(1, queue.length)] ?? null
    : queue[0] ?? null;

  const intervalPreviews = useMemo(
    () => (activeCard ? previewFlashcardIntervals(activeCard) : null),
    [activeCard]
  );

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setFlipped(false);
    setShowHint(false);
    setCramCursor(0);
    setFeedbackBanner(null);
  };

  const handleRateCard = useCallback(
    (rating: FlashcardRating) => {
      if (!activeCard) return;
      const { nextState, schedule, xpAwarded } = reviewCardInState(
        learningState,
        activeCard.id,
        rating
      );
      setLearningState(nextState);
      setFlipped(false);
      setShowHint(false);
      if (cramMode) {
        setCramCursor((prev) => prev + 1);
      }
      if (schedule) {
        setFeedbackBanner(
          `Scheduled next review in ${schedule.intervalLabel} (+${xpAwarded} XP).`
        );
      }
      onRateCard?.(activeCard.id, rating);
    },
    [activeCard, cramMode, learningState, onRateCard]
  );

  // Keyboard shortcuts: Space flips card, 1-4 rates card when flipped
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (addCardOpen || newDeckOpen || !activeCard) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        setFlipped((f) => !f);
        return;
      }

      if (!flipped) return;
      if (event.key === '1') handleRateCard('again');
      else if (event.key === '2') handleRateCard('hard');
      else if (event.key === '3') handleRateCard('good');
      else if (event.key === '4') handleRateCard('easy');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCard, addCardOpen, flipped, handleRateCard, newDeckOpen]);

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !newFront.trim() || !newBack.trim()) return;

    const created: FlashcardCardItem = {
      id: `card_custom_${Date.now()}`,
      deckId: activeDeck.id,
      front: newFront.trim(),
      back: newBack.trim(),
      hint: newHint.trim() || undefined,
      formulaOrExample: newFormula.trim() || undefined,
      intervalDays: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueAtOffsetDays: 0,
      totalReviews: 0,
    };

    setLearningState((prev) => upsertFlashcardInState(prev, created));
    setNewFront('');
    setNewBack('');
    setNewHint('');
    setNewFormula('');
    setAddCardOpen(false);
    setFeedbackBanner(`Added flashcard to ${activeDeck.subjectCode} queue.`);
    onSaveCard?.(created);
  };

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckTitle.trim()) return;
    const { nextState, deckId } = createCustomDeckInState(learningState, {
      boardId: deckBoard,
      subjectCode: deckSubject,
      topicCode: deckTopic,
      title: deckTitle,
      description: deckDescription,
    });
    setLearningState(nextState);
    setSelectedDeckId(deckId);
    setBoardFilter('all');
    setNewDeckOpen(false);
    setDeckTitle('');
    setDeckDescription('');
    setCramMode(false);
    setFlipped(false);
    setFeedbackBanner('Created new deck. Add cards to start your SRS queue.');
    const created = nextState.decks.find((d) => d.id === deckId);
    if (created) onCreateDeck?.(created);
  };

  const totalDueAllDecks = learningState.cards.filter((c) => c.dueAtOffsetDays <= 0).length;

  return (
    <StudyShellView activeRoute="flashcards" user={user} flowUrl={flowUrl} orgUrl={orgUrl}>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Active Recall Flashcards
            </h1>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums text-foreground-muted">
              <span className="font-semibold text-primary">{totalDueAllDecks} due now</span>
              <span>·</span>
              <span>{learningState.cardsReviewedToday} reviewed today</span>
              <span>·</span>
              <span className="font-semibold text-amber-500">+{learningState.earnedLearningXp} XP</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => setNewDeckOpen(true)}
            >
              New Deck
            </Button>
            {activeDeck && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => setAddCardOpen(true)}
              >
                Add Card
              </Button>
            )}
          </div>
        </header>

        {/* Board Filter + Cram Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div
            ref={boardTabsRef}
            role="tablist"
            aria-label="Filter flashcard decks by board"
            data-gliding-ready={boardReady && boardRect.visible ? 'true' : 'false'}
            className="ants-glide-host relative inline-flex rounded-lg border border-border bg-surface-inset p-1"
          >
            <span
              aria-hidden="true"
              data-animate={boardAnimate ? 'true' : 'false'}
              className="ants-glide-indicator z-0 rounded-md bg-primary shadow-xs"
              style={{
                transform: `translate3d(${boardRect.x}px, ${boardRect.y}px, 0)`,
                width: `${boardRect.width}px`,
                height: `${boardRect.height}px`,
                opacity: boardReady && boardRect.visible ? 1 : 0,
              }}
            />
            {BOARD_FILTERS.map((item) => {
              const active = boardFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setBoardFilter(item.id)}
                  className={cn(
                    'ants-glide-item relative z-10 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                    active
                      ? 'bg-primary text-on-primary'
                      : 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setCramMode((prev) => !prev);
              setCramCursor(0);
              setFlipped(false);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
              cramMode
                ? 'border-primary bg-primary-tint text-on-primary-tint'
                : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{cramMode ? 'Cram All Active' : 'Due Queue Only'}</span>
          </button>
        </div>

        {/* Sleek Horizontal Deck Selector Strip */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {visibleDecks.map((deck) => {
            const stats = getDeckMasteryStats(learningState.cards, deck.id);
            const selected = activeDeck?.id === deck.id;
            return (
              <button
                key={deck.id}
                type="button"
                onClick={() => handleSelectDeck(deck.id)}
                className={cn(
                  'group relative shrink-0 flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none',
                  selected
                    ? 'border-primary bg-primary-tint/60 text-foreground ring-1 ring-primary/40 shadow-xs'
                    : 'border-border bg-surface-card hover:border-border-hover hover:bg-surface-inset/50 text-foreground-muted'
                )}
              >
                <span
                  className={cn(
                    'font-mono text-xs font-bold rounded-md px-2 py-1 shrink-0',
                    selected
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-inset text-primary'
                  )}
                >
                  {deck.subjectCode}
                </span>
                <div className="min-w-0 max-w-[240px]">
                  <p className="truncate text-xs font-bold text-foreground">
                    {deck.title}
                  </p>
                  <p className="font-mono text-[10px] text-foreground-muted tabular-nums">
                    {stats.total} cards · {stats.masteryPercent}% mastered
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
                    stats.dueNow > 0
                      ? selected
                        ? 'bg-primary text-on-primary'
                        : 'bg-primary-tint text-on-primary-tint'
                      : 'bg-surface-inset text-success'
                  )}
                >
                  {stats.dueNow > 0 ? `${stats.dueNow} due` : 'Caught up'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hero 3D Flashcard Stage */}
        {activeDeck && (
          <section
            aria-label="Flashcard review stage"
            className="rounded-2xl border border-border bg-surface-card p-4 sm:p-6 space-y-5"
          >
            {/* Stage Header */}
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex items-center gap-2.5 flex-1">
                <Badge variant="subject" className="shrink-0">
                  {activeDeck.topicCode}
                </Badge>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                    {activeDeck.title}
                  </h2>
                  <p className="font-mono text-xs text-foreground-muted tabular-nums">
                    {cramMode ? 'Cram Mode' : `${activeStats.dueNow} due`} · {activeStats.mastered}/{activeStats.total} mastered
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground-subtle bg-surface-inset px-2.5 py-1.5 rounded-lg border border-border-subtle">
                  <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Space flip · 1–4 rate</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Layers className="h-3.5 w-3.5" aria-hidden="true" />}
                  rightIcon={
                    cardsListOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    )
                  }
                  onClick={() => setCardsListOpen((prev) => !prev)}
                  className="h-8 text-xs text-foreground-muted hover:text-foreground"
                >
                  Cards ({deckCards.length})
                </Button>
              </div>
            </div>

            {/* Session Progress Bar */}
            {activeCard && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px] text-foreground-muted tabular-nums">
                  <span>
                    {cramMode
                      ? `Card ${(cramCursor % Math.max(1, queue.length)) + 1} of ${queue.length}`
                      : `Card ${Math.max(1, activeStats.total - queue.length + 1)} of ${activeStats.total}`}
                  </span>
                  <span>
                    {cramMode
                      ? `${Math.round((((cramCursor % Math.max(1, queue.length)) + 1) / Math.max(1, queue.length)) * 100)}%`
                      : `${Math.round(((activeStats.total - queue.length) / Math.max(1, activeStats.total)) * 100)}% reviewed`}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${
                        cramMode
                          ? Math.min(100, Math.round((((cramCursor % Math.max(1, queue.length)) + 1) / Math.max(1, queue.length)) * 100))
                          : Math.min(100, Math.round(((activeStats.total - queue.length) / Math.max(1, activeStats.total)) * 100))
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {feedbackBanner && (
              <div
                role="status"
                className="flex items-center justify-between rounded-lg border border-primary-tint-border bg-primary-tint/45 px-3.5 py-2 text-xs font-medium text-on-primary-tint animate-in fade-in"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{feedbackBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackBanner(null)}
                  className="text-[11px] font-semibold text-primary hover:underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {activeCard && intervalPreviews ? (
              <div className="mx-auto max-w-2xl space-y-6 pt-1">
                {/* 3D Perspective Card */}
                <div className="[perspective:1200px]">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={
                      flipped
                        ? 'Flashcard answer face, press to show question'
                        : 'Flashcard question face, press to reveal answer'
                    }
                    onClick={() => setFlipped((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setFlipped((prev) => !prev);
                      }
                    }}
                    className={cn(
                      'relative min-h-[320px] sm:min-h-[360px] w-full cursor-pointer rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none shadow-[var(--shadow-tier-2)]',
                      flipped && '[transform:rotateY(180deg)]'
                    )}
                  >
                    {/* Front Face (Question) */}
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-border-hover/80 bg-surface-elevated p-6 sm:p-8 [backface-visibility:hidden]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Question
                        </span>
                        {activeCard.hint && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowHint((prev) => !prev);
                            }}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                              showHint
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                : 'bg-surface-inset text-foreground-muted hover:text-foreground hover:bg-surface-card border border-border'
                            )}
                          >
                            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
                          </button>
                        )}
                      </div>

                      <div className="my-auto py-4 text-center space-y-4">
                        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-snug tracking-tight text-foreground max-w-xl mx-auto">
                          {activeCard.front}
                        </p>
                        {showHint && activeCard.hint && (
                          <div className="mx-auto max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-500 text-left animate-in fade-in zoom-in-95">
                            <span className="font-bold">Hint: </span>
                            {activeCard.hint}
                          </div>
                        )}
                      </div>

                      <div className="text-center text-xs font-medium text-foreground-muted/60">
                        Press Space or tap card to show answer
                      </div>
                    </div>

                    {/* Back Face (Answer + Formula) */}
                    <div className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-primary/50 bg-surface-elevated p-6 sm:p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-success">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          Answer
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-foreground-muted/60">
                          <RotateCcw className="h-3 w-3" />
                          <span>Flip</span>
                        </span>
                      </div>

                      <div className="my-auto py-3 space-y-4 text-center">
                        <p className="text-lg sm:text-xl font-bold leading-relaxed text-foreground max-w-xl mx-auto">
                          {activeCard.back}
                        </p>
                        {activeCard.formulaOrExample && (
                          <div className="mx-auto max-w-lg rounded-xl border border-primary/25 bg-surface-inset px-5 py-3 font-mono text-sm sm:text-base font-semibold text-primary tracking-wide text-center">
                            {activeCard.formulaOrExample}
                          </div>
                        )}
                      </div>

                      <div className="text-center text-xs font-medium text-foreground-muted/60">
                        Rate your recall below to schedule next review
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls Under Card */}
                {!flipped ? (
                  <div className="flex justify-center">
                    <Button
                      variant="primary"
                      size="lg"
                      leftIcon={<Eye className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => setFlipped(true)}
                      className="h-12 min-w-[220px] text-sm font-bold shadow-xs"
                    >
                      <span>Show Answer</span>
                      <span className="ml-2 font-mono text-[11px] rounded bg-white/20 dark:bg-black/25 px-1.5 py-0.5">
                        Space
                      </span>
                    </Button>
                  </div>
                ) : (
                  <div
                    role="group"
                    aria-label="SM-2 spaced repetition rating"
                    className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                  >
                    <button
                      type="button"
                      onClick={() => handleRateCard('again')}
                      className="group relative flex flex-col items-center justify-between rounded-xl border border-danger/35 bg-danger-tint/40 p-3 text-center transition-all hover:bg-danger-tint hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-danger">Again</span>
                        <span className="font-mono text-[10px] rounded bg-danger/10 px-1 py-0.2 text-danger font-semibold">
                          1
                        </span>
                      </div>
                      <span className="mt-1 font-mono text-xs font-bold text-danger tabular-nums">
                        {intervalPreviews.again}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRateCard('hard')}
                      className="group relative flex flex-col items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-center transition-all hover:bg-amber-500/20 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-500">Hard</span>
                        <span className="font-mono text-[10px] rounded bg-amber-500/15 px-1 py-0.2 text-amber-500 font-semibold">
                          2
                        </span>
                      </div>
                      <span className="mt-1 font-mono text-xs font-bold text-amber-500 tabular-nums">
                        {intervalPreviews.hard}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRateCard('good')}
                      className="group relative flex flex-col items-center justify-between rounded-xl border border-primary/50 bg-primary-tint/60 p-3 text-center transition-all hover:bg-primary-tint hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-on-primary-tint">Good</span>
                        <span className="font-mono text-[10px] rounded bg-primary/20 px-1 py-0.2 text-on-primary-tint font-semibold">
                          3
                        </span>
                      </div>
                      <span className="mt-1 font-mono text-xs font-bold text-on-primary-tint tabular-nums">
                        {intervalPreviews.good}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRateCard('easy')}
                      className="group relative flex flex-col items-center justify-between rounded-xl border border-success/40 bg-success-tint/40 p-3 text-center transition-all hover:bg-success-tint hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-success">Easy</span>
                        <span className="font-mono text-[10px] rounded bg-success/15 px-1 py-0.2 text-success font-semibold">
                          4
                        </span>
                      </div>
                      <span className="mt-1 font-mono text-xs font-bold text-success tabular-nums">
                        {intervalPreviews.easy}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-border bg-surface-inset/35 p-8 text-center space-y-3">
                <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
                <h3 className="text-base font-bold text-foreground">
                  {activeStats.total === 0
                    ? 'This deck has no cards yet'
                    : 'All due flashcards cleared!'}
                </h3>
                <p className="text-xs leading-relaxed text-foreground-muted">
                  {activeStats.total === 0
                    ? 'Add your first question and answer card to start your spaced repetition queue.'
                    : `Every card in ${activeDeck.subjectCode} is scheduled ahead. Rehearse ahead of time with Cram Mode or drill with a topic quiz.`}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {activeStats.total > 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Layers className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => {
                        setCramMode(true);
                        setCramCursor(0);
                        setFlipped(false);
                      }}
                    >
                      Cram All ({activeStats.total})
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={() => setAddCardOpen(true)}
                  >
                    Add Card
                  </Button>
                  <Link
                    href="/quizzes"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-card px-3 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Topic Quizzes →</span>
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Deck Card Browser (Collapsible) */}
        {activeDeck && cardsListOpen && (
          <section
            aria-label="Cards in active deck"
            className="rounded-xl border border-border bg-surface-card p-4 sm:p-5 space-y-3 animate-in fade-in"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Deck Cards ({deckCards.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => setAddCardOpen(true)}
              >
                Add Card
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {deckCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle bg-surface-inset/35 p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-foreground leading-snug">
                      {card.front}
                    </p>
                    <p className="text-xs text-foreground-muted leading-snug">{card.back}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 font-mono text-[10px] text-foreground-subtle tabular-nums">
                      <span>
                        {card.dueAtOffsetDays <= 0
                          ? 'Due now'
                          : `Due in ${card.dueAtOffsetDays}d`}
                      </span>
                      <span>·</span>
                      <span>Ease {card.easeFactor.toFixed(2)}</span>
                      {card.lastRating && (
                        <>
                          <span>·</span>
                          <span>Last: {card.lastRating}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete card: ${card.front}`}
                    onClick={() =>
                      setLearningState((prev) => deleteFlashcardInState(prev, card.id))
                    }
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-subtle transition-colors hover:bg-danger-tint hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Add Card Modal */}
      <Modal
        open={addCardOpen}
        onClose={() => setAddCardOpen(false)}
        title="Add Flashcard"
        description={activeDeck ? `Adding to ${activeDeck.title}` : undefined}
      >
        <form onSubmit={handleCreateCard} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Front Prompt *
            </label>
            <Input
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              placeholder="e.g. State the Remainder Theorem for f(x) divided by (ax − b)"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Back Answer *
            </label>
            <textarea
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              placeholder="Exact mark-scheme definition or derivation..."
              rows={3}
              required
              className="w-full rounded-lg border border-border bg-surface-card p-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Optional Hint
              </label>
              <Input
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                placeholder="Memory cue..."
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Formula / Example
              </label>
              <Input
                value={newFormula}
                onChange={(e) => setNewFormula(e.target.value)}
                placeholder="f(b/a) = Remainder"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddCardOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add to Queue
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Deck Modal */}
      <Modal
        open={newDeckOpen}
        onClose={() => setNewDeckOpen(false)}
        title="Create Flashcard Deck"
        description="Build a focused active recall deck for any IAL or IGCSE topic."
      >
        <form onSubmit={handleCreateDeck} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Exam Board
              </label>
              <select
                value={deckBoard}
                onChange={(e) => setDeckBoard(e.target.value as StudyBoardPresetId)}
                className="h-9 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="edexcel-ial">Edexcel IAL</option>
                <option value="cambridge-igcse">Cambridge IGCSE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground">
                Subject Code
              </label>
              <Input
                value={deckSubject}
                onChange={(e) => setDeckSubject(e.target.value)}
                placeholder="WMA12 or 0580"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Deck Title *
            </label>
            <Input
              value={deckTitle}
              onChange={(e) => setDeckTitle(e.target.value)}
              placeholder="e.g. WCH12 — Organic Mechanisms & Reagents"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">
              Topic Code & Description
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                value={deckTopic}
                onChange={(e) => setDeckTopic(e.target.value)}
                placeholder="WCH12.4"
                className="font-mono text-xs"
              />
              <div className="sm:col-span-2">
                <Input
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="Conditions, catalysts & colour changes"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setNewDeckOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Deck
            </Button>
          </div>
        </form>
      </Modal>
    </StudyShellView>
  );
}
