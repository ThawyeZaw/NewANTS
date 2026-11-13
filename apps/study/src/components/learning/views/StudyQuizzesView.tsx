'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  HelpCircle,
  Lightbulb,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Timer,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  MOCK_AUTHENTICATED_USER,
  cn,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  evaluateQuizSubmission,
  loadStudyLearningState,
  recordQuizAttemptInState,
  saveStudyLearningState,
  type LearningBoardFilter,
  type QuizAttemptRecord,
  type QuizQuestionItem,
  type QuizRunMode,
  type StudyLearningPersistedState,
  type StudyQuizItem,
} from '../../../lib/study/learning';
import {
  createDefaultStudyLearningState,
  MOCK_STUDY_QUIZZES,
} from '../../../mocks/study-learning.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';

export interface StudyQuizzesViewProps {
  user?: MockUserProfile | null;
  quizzes?: StudyQuizItem[];
  initialState?: StudyLearningPersistedState;
  initialQuizId?: string;
  flowUrl?: string;
  orgUrl?: string;
  /** Controlled callback for `[THAW-4.6]` full-stack integration */
  onCompleteQuiz?: (attempt: QuizAttemptRecord) => void;
}

type QuizPhase = 'catalog' | 'running' | 'results';

const BOARD_FILTERS: { id: LearningBoardFilter; label: string }[] = [
  { id: 'all', label: 'All Boards' },
  { id: 'edexcel-ial', label: 'Edexcel IAL' },
  { id: 'cambridge-igcse', label: 'Cambridge IGCSE' },
];

function formatTimerClock(secondsTotal: number): string {
  const safe = Math.max(0, Math.floor(secondsTotal));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function StudyQuizzesView({
  user = MOCK_AUTHENTICATED_USER,
  quizzes = MOCK_STUDY_QUIZZES,
  initialState,
  initialQuizId,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onCompleteQuiz,
}: StudyQuizzesViewProps) {
  const defaultState = useMemo(
    () => initialState ?? createDefaultStudyLearningState(),
    [initialState]
  );

  const [learningState, setLearningState] = useState<StudyLearningPersistedState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [boardFilter, setBoardFilter] = useState<LearningBoardFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [preferredMode, setPreferredMode] = useState<QuizRunMode>('practice');

  // Active quiz session state
  const [phase, setPhase] = useState<QuizPhase>('catalog');
  const [activeQuizId, setActiveQuizId] = useState<string>(initialQuizId ?? quizzes[0]?.id ?? '');
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestionItem[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [lastResult, setLastResult] = useState<ReturnType<typeof evaluateQuizSubmission> | null>(
    null
  );

  const boardTabsRef = useRef<HTMLDivElement>(null);
  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, boardFilter, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });

  useEffect(() => {
    setLearningState(loadStudyLearningState(defaultState));
    const urlQuizId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('quiz')
        : null;
    const requestedId = initialQuizId ?? urlQuizId;
    if (requestedId && quizzes.some((q) => q.id === requestedId)) {
      setActiveQuizId(requestedId);
    }
    setHydrated(true);
  }, [defaultState, initialQuizId, quizzes]);

  useEffect(() => {
    if (!hydrated) return;
    saveStudyLearningState(learningState);
  }, [hydrated, learningState]);

  const activeQuiz = useMemo(
    () => quizzes.find((q) => q.id === activeQuizId) ?? quizzes[0] ?? null,
    [quizzes, activeQuizId]
  );

  const filteredQuizzes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return quizzes.filter((quiz) => {
      if (boardFilter !== 'all' && quiz.boardId !== boardFilter) return false;
      if (q) {
        const hay = `${quiz.title} ${quiz.subjectCode} ${quiz.topicLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [quizzes, boardFilter, searchQuery]);

  const startQuiz = useCallback(
    (quiz: StudyQuizItem, mode: QuizRunMode, subsetIds?: string[]) => {
      const subset =
        subsetIds && subsetIds.length > 0
          ? quiz.questions.filter((q) => subsetIds.includes(q.id))
          : quiz.questions;
      setActiveQuizId(quiz.id);
      setPreferredMode(mode);
      setActiveQuestions(subset);
      setQuestionIndex(0);
      setAnswers({});
      setFlaggedIds([]);
      setRevealedHints({});
      setSecondsLeft(quiz.durationMinutes * 60);
      setLastResult(null);
      setPhase('running');
    },
    []
  );

  // Auto-open quiz if deep-linked via ?quiz=id
  useEffect(() => {
    if (!initialQuizId) return;
    const found = quizzes.find((q) => q.id === initialQuizId);
    if (found) {
      setActiveQuizId(found.id);
    }
  }, [initialQuizId, quizzes]);

  const submitActiveQuiz = useCallback(() => {
    if (!activeQuiz) return;
    const evaluation = evaluateQuizSubmission(
      activeQuiz,
      answers,
      preferredMode,
      activeQuestions
    );
    const attempt: QuizAttemptRecord = {
      id: `att_${Date.now()}`,
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      subjectCode: activeQuiz.subjectCode,
      completedAtLabel: 'Just now',
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      percent: evaluation.percent,
      xpEarned: evaluation.xpEarned,
      mode: preferredMode,
      incorrectQuestionIds: evaluation.incorrectQuestionIds,
    };
    setLearningState((prev) => recordQuizAttemptInState(prev, attempt));
    setLastResult(evaluation);
    setPhase('results');
    onCompleteQuiz?.(attempt);
  }, [activeQuestions, activeQuiz, answers, onCompleteQuiz, preferredMode]);

  // Countdown tick when in timed running phase
  useEffect(() => {
    if (phase !== 'running' || preferredMode !== 'timed') return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, preferredMode]);

  useEffect(() => {
    if (phase === 'running' && preferredMode === 'timed' && secondsLeft === 0) {
      submitActiveQuiz();
    }
  }, [phase, preferredMode, secondsLeft, submitActiveQuiz]);

  const currentQuestion = activeQuestions[questionIndex] ?? null;

  // Keyboard shortcuts 1-4 for MCQ options during running phase
  useEffect(() => {
    if (phase !== 'running' || !currentQuestion || currentQuestion.type !== 'mcq') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const idx = Number(event.key) - 1;
      if (idx >= 0 && idx < (currentQuestion.options?.length ?? 0)) {
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: idx }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, currentQuestion]);

  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
  };

  const flowPomodoroBase = flowUrl.replace(/\/timetable$/, '/pomodoro');

  return (
    <StudyShellView activeRoute="quizzes" user={user} flowUrl={flowUrl} orgUrl={orgUrl}>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="editorial">Topical Assessment</Badge>
              <span className="font-mono text-xs tabular-nums text-foreground-subtle">
                {quizzes.length} drills · {learningState.quizAttempts.length} attempts · +
                {learningState.earnedLearningXp} XP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Topical Quizzes & Mark-Scheme Drills
            </h1>
            <p className="max-w-2xl text-sm text-foreground-muted">
              Test conceptual precision and numeric accuracy under Practice or Timed conditions with
              instant worked mark-scheme explanations and mistake retries.
            </p>
          </div>

          {phase !== 'catalog' && (
            <Button variant="secondary" size="sm" onClick={() => setPhase('catalog')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>All Quizzes</span>
            </Button>
          )}
        </header>

        {/* PHASE 1: CATALOG */}
        {phase === 'catalog' && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  ref={boardTabsRef}
                  role="tablist"
                  aria-label="Filter quizzes by exam board"
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

                {/* Practice vs Timed Mode Toggle */}
                <div className="inline-flex rounded-lg border border-border bg-surface-inset p-1">
                  <button
                    type="button"
                    onClick={() => setPreferredMode('practice')}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                      preferredMode === 'practice'
                        ? 'bg-surface-card text-foreground shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    Untimed Practice
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredMode('timed')}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                      preferredMode === 'timed'
                        ? 'bg-surface-card text-primary shadow-xs'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    <span>Timed (+5 XP Bonus)</span>
                  </button>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-subtle"
                  aria-hidden="true"
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by code or topic…"
                  aria-label="Search quizzes"
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>

            {/* Quiz Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredQuizzes.map((quiz) => {
                const totalMarks = quiz.questions.reduce((acc, q) => acc + q.marks, 0);
                const latestAttempt = learningState.quizAttempts.find((a) => a.quizId === quiz.id);
                const highlighted = initialQuizId === quiz.id;
                return (
                  <article
                    key={quiz.id}
                    className={cn(
                      'ants-card-interactive flex flex-col justify-between rounded-xl border bg-surface-card p-5',
                      highlighted ? 'border-primary ring-1 ring-primary/30' : 'border-border'
                    )}
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="subject">{quiz.subjectCode}</Badge>
                          <span className="font-mono text-[11px] uppercase text-foreground-subtle">
                            {quiz.difficulty}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-foreground-muted tabular-nums">
                          {quiz.questions.length} Qs · {totalMarks} marks · {quiz.durationMinutes}m
                        </span>
                      </div>

                      <h2 className="text-base sm:text-lg font-bold leading-snug text-foreground">
                        {quiz.title}
                      </h2>
                      <p className="text-xs text-foreground-muted">{quiz.topicLabel}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-3.5">
                      <div className="text-xs text-foreground-muted">
                        {latestAttempt ? (
                          <span className="font-mono tabular-nums">
                            Last: <strong className="text-foreground">{latestAttempt.percent}%</strong>{' '}
                            ({latestAttempt.score}/{latestAttempt.maxScore})
                          </span>
                        ) : (
                          <span>Not attempted yet</span>
                        )}
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => startQuiz(quiz, preferredMode)}
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {preferredMode === 'timed' ? 'Start Timed' : 'Start Practice'}
                        </span>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Recent Attempt Ledger */}
            {learningState.quizAttempts.length > 0 && (
              <section
                aria-label="Recent quiz attempts"
                className="rounded-xl border border-border bg-surface-card p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Recent Attempts</h3>
                  <Link
                    href="/leaderboard"
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View Leaderboard XP →
                  </Link>
                </div>
                <div className="divide-y divide-border-subtle">
                  {learningState.quizAttempts.slice(0, 5).map((attempt) => (
                    <div
                      key={attempt.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="mr-2 font-mono font-semibold text-primary">
                          {attempt.subjectCode}
                        </span>
                        <span className="font-medium text-foreground">{attempt.quizTitle}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span className="text-foreground-subtle">{attempt.completedAtLabel}</span>
                        <span className="font-bold text-foreground">
                          {attempt.score}/{attempt.maxScore} ({attempt.percent}%)
                        </span>
                        <span className="rounded bg-primary-tint px-1.5 py-0.5 text-[11px] font-semibold text-on-primary-tint">
                          +{attempt.xpEarned} XP
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* PHASE 2: ACTIVE QUIZ RUNNER */}
        {phase === 'running' && activeQuiz && currentQuestion && (
          <section
            aria-label="Quiz runner"
            className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-border bg-surface-card p-5 sm:p-7"
          >
            {/* Runner Top Telemetry */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="subject">{activeQuiz.subjectCode}</Badge>
                  <span className="font-mono text-xs text-foreground-subtle tabular-nums">
                    Question {questionIndex + 1} of {activeQuestions.length} ·{' '}
                    {currentQuestion.marks} marks
                  </span>
                </div>
                <h2 className="mt-1 text-base sm:text-lg font-bold text-foreground">
                  {activeQuiz.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {preferredMode === 'timed' && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums',
                      secondsLeft <= 60
                        ? 'border-danger/40 bg-danger-tint/40 text-danger'
                        : 'border-border bg-surface-inset text-foreground'
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatTimerClock(secondsLeft)}</span>
                  </span>
                )}
                <Button variant="primary" size="sm" onClick={submitActiveQuiz}>
                  <span>Submit Quiz</span>
                </Button>
              </div>
            </div>

            {/* Question Stepper Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {activeQuestions.map((q, idx) => {
                const answered = answers[q.id] !== undefined && String(answers[q.id]).trim() !== '';
                const flagged = flaggedIds.includes(q.id);
                const current = idx === questionIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQuestionIndex(idx)}
                    className={cn(
                      'inline-flex h-8 min-w-[2.25rem] items-center justify-center gap-1 rounded-lg border px-2 font-mono text-xs font-semibold tabular-nums transition-colors',
                      current
                        ? 'border-primary bg-primary text-on-primary'
                        : answered
                          ? 'border-primary/40 bg-primary-tint/55 text-on-primary-tint'
                          : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
                    )}
                  >
                    <span>{idx + 1}</span>
                    {flagged && <Flag className="h-3 w-3 text-warning" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            {/* Active Question Card */}
            <div className="space-y-4 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
                    {currentQuestion.topicCode} ·{' '}
                    {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Numeric / Short Answer'}
                  </span>
                  <p className="text-base sm:text-lg font-semibold leading-relaxed text-foreground">
                    {currentQuestion.prompt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFlagQuestion(currentQuestion.id)}
                  aria-label="Flag question for review"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shrink-0 transition-colors',
                    flaggedIds.includes(currentQuestion.id)
                      ? 'border-warning/50 bg-warning-tint/60 text-foreground'
                      : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
                  )}
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{flaggedIds.includes(currentQuestion.id) ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              {currentQuestion.type === 'mcq' && currentQuestion.options ? (
                <div className="space-y-2.5">
                  {currentQuestion.options.map((option, optIdx) => {
                    const selected = answers[currentQuestion.id] === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optIdx }))
                        }
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected
                            ? 'border-primary bg-primary-tint/55 font-semibold text-foreground'
                            : 'border-border bg-surface-inset/35 text-foreground-muted hover:border-border-hover hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold',
                            selected
                              ? 'bg-primary text-on-primary'
                              : 'border border-border bg-surface-card text-foreground-muted'
                          )}
                        >
                          {letter}
                        </span>
                        <span className="leading-snug">{option}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-foreground-muted">
                    Enter your calculated numeric or algebraic value
                    {currentQuestion.numericTarget?.unit
                      ? ` (${currentQuestion.numericTarget.unit})`
                      : ''}
                    :
                  </label>
                  <div className="flex items-center gap-2 max-w-sm">
                    <Input
                      value={
                        typeof answers[currentQuestion.id] === 'string'
                          ? (answers[currentQuestion.id] as string)
                          : ''
                      }
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [currentQuestion.id]: e.target.value,
                        }))
                      }
                      placeholder="Type final answer…"
                      className="font-mono text-sm tabular-nums"
                    />
                    {currentQuestion.numericTarget?.unit && (
                      <span className="rounded-lg border border-border bg-surface-inset px-3 py-2 font-mono text-xs font-semibold text-foreground-muted">
                        {currentQuestion.numericTarget.unit}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {currentQuestion.formulaHint && (
                <div className="pt-1">
                  {revealedHints[currentQuestion.id] ? (
                    <div className="flex items-center gap-2 rounded-lg border border-primary-tint-border bg-primary-tint/45 px-3 py-2 font-mono text-xs text-on-primary-tint">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span>Formula Hint: {currentQuestion.formulaHint}</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRevealedHints((prev) => ({ ...prev, [currentQuestion.id]: true }))
                      }
                    >
                      <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Show Formula Hint</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Prev / Next Footer */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={questionIndex === 0}
                onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Previous</span>
              </Button>

              {questionIndex < activeQuestions.length - 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    setQuestionIndex((i) => Math.min(activeQuestions.length - 1, i + 1))
                  }
                >
                  <span>Next Question</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={submitActiveQuiz}>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Finish & Grade</span>
                </Button>
              )}
            </div>
          </section>
        )}

        {/* PHASE 3: RESULTS & MARK-SCHEME REVIEW */}
        {phase === 'results' && activeQuiz && lastResult && (
          <section aria-label="Quiz results and review" className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-2xl border border-border bg-surface-card p-6 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.06em] text-primary">
                      Quiz Graded · {activeQuiz.subjectCode}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground">{activeQuiz.title}</h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-border bg-surface-inset px-4 py-2 text-center">
                    <div className="font-mono text-2xl font-extrabold text-foreground tabular-nums">
                      {lastResult.percent}%
                    </div>
                    <div className="font-mono text-[11px] text-foreground-muted tabular-nums">
                      {lastResult.score}/{lastResult.maxScore} marks
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary-tint-border bg-primary-tint px-4 py-2 text-center text-on-primary-tint">
                    <div className="inline-flex items-center gap-1 font-mono text-lg font-extrabold tabular-nums">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      +{lastResult.xpEarned} XP
                    </div>
                    <div className="text-[11px] font-medium">Synced to Study</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
                {lastResult.incorrectQuestionIds.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      startQuiz(activeQuiz, 'practice', lastResult.incorrectQuestionIds)
                    }
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      Retry Mistakes ({lastResult.incorrectQuestionIds.length})
                    </span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => startQuiz(activeQuiz, preferredMode)}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retake Full Quiz</span>
                </Button>
                <a
                  href={`${flowPomodoroBase}?task=${encodeURIComponent(`Review ${activeQuiz.subjectCode} mistakes`)}&pomodoros=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-inset/50 px-3 text-xs font-semibold text-foreground-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Send Weak Topic to Flow Pomodoro</span>
                </a>
              </div>
            </div>

            {/* Question-by-Question Mark-Scheme Breakdown */}
            <div className="space-y-3">
              {activeQuestions.map((question, idx) => {
                const verdict = lastResult.resultsByQuestionId[question.id];
                const userRaw = answers[question.id];
                const userDisplay =
                  question.type === 'mcq'
                    ? typeof userRaw === 'number'
                      ? question.options?.[userRaw] ?? 'No option selected'
                      : 'Unanswered'
                    : typeof userRaw === 'string' && userRaw.trim()
                      ? userRaw.trim()
                      : 'Unanswered';

                return (
                  <article
                    key={question.id}
                    className={cn(
                      'rounded-xl border bg-surface-card p-4 sm:p-5 space-y-2.5',
                      verdict?.correct ? 'border-success/35' : 'border-danger/35'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-mono text-[11px] font-semibold text-foreground-subtle">
                          Q{idx + 1} · {question.topicCode} · {question.marks} marks
                        </span>
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {question.prompt}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold shrink-0',
                          verdict?.correct
                            ? 'bg-success-tint text-success'
                            : verdict?.answered
                              ? 'bg-danger-tint text-danger'
                              : 'bg-surface-inset text-foreground-subtle'
                        )}
                      >
                        {verdict?.correct ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            <span>Incorrect</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-lg bg-surface-inset/55 p-3 text-xs sm:grid-cols-2">
                      <div>
                        <span className="font-semibold text-foreground-subtle">Your Answer: </span>
                        <span className="font-mono text-foreground">{userDisplay}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground-subtle">Mark Scheme: </span>
                        <span className="font-mono font-semibold text-success">
                          {verdict?.expectedDisplay}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-primary-tint-border bg-primary-tint/35 px-3 py-2 text-xs text-foreground">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <p className="leading-relaxed">{question.explanation}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </StudyShellView>
  );
}
