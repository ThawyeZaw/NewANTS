'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ANTS_AUTH_SESSION_EVENT,
  Badge,
  Button,
  MOCK_AUTHENTICATED_USER,
  cn,
  loadAuthSession,
  useSlidingIndicator,
  type MockUserProfile,
} from '@ants/ui';
import {
  Award,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Flame,
  GraduationCap,
  RefreshCw,
  Search,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  computeScholarLeaderboard,
  loadLeaderboardPrefs,
  saveLeaderboardPrefs,
  type LeaderboardBoardFilter,
  type LeaderboardTimeframe,
  type ScholarLeaderboardEntry,
  type StudyBadgeItem,
  type StudyLeaderboardPrefsState,
} from '../../../lib/study/countdown-leaderboard';
import { loadStudyDashboardState } from '../../../lib/study/dashboard';
import { loadStudyLearningState } from '../../../lib/study/learning';
import { loadStudyPapersState } from '../../../lib/study/papers';
import {
  createDefaultLeaderboardPrefs,
  MOCK_LEADERBOARD_SCHOLARS,
  MOCK_STUDY_BADGES,
} from '../../../mocks/study-countdown-leaderboard.mock';
import { createDefaultStudyDashboardState } from '../../../mocks/study-dashboard.mock';
import { createDefaultStudyLearningState } from '../../../mocks/study-learning.mock';
import { createDefaultStudyPapersState } from '../../../mocks/study-papers.mock';
import { StudyShellView } from '../../layout/views/StudyShellView';

export interface StudyLeaderboardViewProps {
  user?: MockUserProfile | null;
  scholars?: ScholarLeaderboardEntry[];
  badges?: StudyBadgeItem[];
  initialPrefs?: StudyLeaderboardPrefsState;
  flowUrl?: string;
  orgUrl?: string;
  /** Controlled callbacks for `[THAW-4.5]` full-stack integration */
  onToggleVisibility?: (visible: boolean) => void;
  onTimeframeChange?: (timeframe: LeaderboardTimeframe) => void;
  onBoardFilterChange?: (board: LeaderboardBoardFilter) => void;
}

const TIMEFRAME_TABS: { id: LeaderboardTimeframe; label: string }[] = [
  { id: 'weekly', label: 'Weekly Sprint' },
  { id: 'all_time', label: 'All-Time XP' },
];

const BOARD_FILTERS: { id: LeaderboardBoardFilter; label: string }[] = [
  { id: 'all', label: 'All Cohorts' },
  { id: 'edexcel-ial', label: 'Edexcel IAL' },
  { id: 'cambridge-igcse', label: 'Cambridge IGCSE' },
];

function renderBadgeIcon(category: StudyBadgeItem['category']) {
  if (category === 'streak') return <Flame className="h-4 w-4 text-primary" aria-hidden="true" />;
  if (category === 'papers') {
    return <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />;
  }
  if (category === 'sync') {
    return <RefreshCw className="h-4 w-4 text-primary" aria-hidden="true" />;
  }
  return <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />;
}

export function StudyLeaderboardView({
  user = MOCK_AUTHENTICATED_USER,
  scholars = MOCK_LEADERBOARD_SCHOLARS,
  badges = MOCK_STUDY_BADGES,
  initialPrefs,
  flowUrl = 'http://localhost:3002/timetable',
  orgUrl = 'http://localhost:3000',
  onToggleVisibility,
  onTimeframeChange,
  onBoardFilterChange,
}: StudyLeaderboardViewProps) {
  const defaultPrefs = useMemo(
    () => initialPrefs ?? createDefaultLeaderboardPrefs(),
    [initialPrefs]
  );

  const [prefs, setPrefs] = useState<StudyLeaderboardPrefsState>(defaultPrefs);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUser, setActiveUser] = useState<MockUserProfile | null>(user);
  const [bonusXpDelta, setBonusXpDelta] = useState<number>(0);

  const timeframeTabsRef = useRef<HTMLDivElement>(null);
  const boardTabsRef = useRef<HTMLDivElement>(null);

  const {
    rect: timeframeRect,
    ready: timeframeReady,
    animate: timeframeAnimate,
  } = useSlidingIndicator(timeframeTabsRef, prefs.timeframe, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const timeframeIndicatorReady = timeframeReady && timeframeRect.visible;

  const {
    rect: boardRect,
    ready: boardReady,
    animate: boardAnimate,
  } = useSlidingIndicator(boardTabsRef, prefs.boardFilter, {
    activeSelector: '[role="tab"][aria-selected="true"]',
  });
  const boardIndicatorReady = boardReady && boardRect.visible;

  useEffect(() => {
    setPrefs(loadLeaderboardPrefs(defaultPrefs));

    const syncLiveStats = () => {
      const sso = loadAuthSession();
      if (sso.status === 'authenticated' && sso.user) {
        setActiveUser(sso.user);
      } else {
        setActiveUser(user);
      }
      const dash = loadStudyDashboardState(createDefaultStudyDashboardState());
      const papers = loadStudyPapersState(createDefaultStudyPapersState());
      const learning = loadStudyLearningState(createDefaultStudyLearningState());
      setBonusXpDelta(dash.xpBonus + papers.earnedPaperXp + learning.earnedLearningXp);
    };

    syncLiveStats();
    window.addEventListener(ANTS_AUTH_SESSION_EVENT, syncLiveStats);
    return () => window.removeEventListener(ANTS_AUTH_SESSION_EVENT, syncLiveStats);
  }, [defaultPrefs, user]);

  const effectiveUser = activeUser ?? MOCK_AUTHENTICATED_USER;
  const baseUserXp = effectiveUser.xp ?? 2450;
  const liveCurrentUserXp = baseUserXp + bonusXpDelta;

  const { ranked, currentUserEntry, xpToNextRank } = useMemo(
    () =>
      computeScholarLeaderboard(scholars, {
        timeframe: prefs.timeframe,
        boardFilter: prefs.boardFilter,
        search: searchQuery,
        currentUserUsername: effectiveUser.username,
        currentUserName: effectiveUser.name,
        liveCurrentUserXp,
        currentUserXpDelta: bonusXpDelta,
        currentUserStreak: effectiveUser.streakDays,
        visibleOnLeaderboard: prefs.visibleOnLeaderboard,
      }),
    [
      scholars,
      prefs.timeframe,
      prefs.boardFilter,
      prefs.visibleOnLeaderboard,
      searchQuery,
      effectiveUser.username,
      effectiveUser.name,
      effectiveUser.streakDays,
      liveCurrentUserXp,
      bonusXpDelta,
    ]
  );

  const topThree = useMemo(() => {
    if (searchQuery.trim()) return [];
    return ranked.slice(0, 3);
  }, [ranked, searchQuery]);

  const updatePrefs = (updater: (prev: StudyLeaderboardPrefsState) => StudyLeaderboardPrefsState) => {
    setPrefs((prev) => {
      const next = updater(prev);
      saveLeaderboardPrefs(next);
      return next;
    });
  };

  const flowOrigin = flowUrl.replace(/\/timetable.*$/, '');
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <StudyShellView
      activeRoute="leaderboard"
      user={user}
      flowUrl={flowUrl}
      orgUrl={orgUrl}
      headerActions={
        <button
          type="button"
          onClick={() => {
            const nextVisible = !prefs.visibleOnLeaderboard;
            updatePrefs((prev) => ({ ...prev, visibleOnLeaderboard: nextVisible }));
            onToggleVisibility?.(nextVisible);
          }}
          aria-pressed={prefs.visibleOnLeaderboard}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors',
            prefs.visibleOnLeaderboard
              ? 'border-border bg-surface-card text-foreground hover:border-border-hover'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          )}
        >
          {prefs.visibleOnLeaderboard ? (
            <Eye className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {prefs.visibleOnLeaderboard ? 'Visible on Board' : 'Private Study Mode'}
          </span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
              Scholar Leaderboard
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Earn Study XP cleanly through topic mastery (+10 XP), daily check-ins (+15 XP),
              and timed past papers (+25 XP). Rankings are strictly opt-in.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/past-papers"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset"
            >
              <Zap className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Log Past Paper (+25 XP)</span>
            </Link>
          </div>
        </header>

        {/* Active Scholar Standing Telemetry Strip */}
        <section
          aria-label="Your current leaderboard standing"
          className="rounded-xl border border-border bg-surface-card p-5 shadow-[var(--shadow-tier-1)]"
        >
          {prefs.visibleOnLeaderboard && currentUserEntry ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-border">
              <div className="sm:pr-4">
                <div className="text-xs font-medium text-foreground-muted">Current Standing</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-primary tabular-nums">
                    #{currentUserEntry.rank}
                  </span>
                  <span className="text-xs font-medium text-foreground-muted">
                    @{currentUserEntry.username}
                  </span>
                </div>
              </div>

              <div className="sm:px-4">
                <div className="text-xs font-medium text-foreground-muted">
                  {prefs.timeframe === 'weekly' ? 'Weekly Sprint XP' : 'Total Academic XP'}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-foreground tabular-nums">
                  {currentUserEntry.displayXp.toLocaleString()} XP
                </div>
              </div>

              <div className="sm:px-4">
                <div className="text-xs font-medium text-foreground-muted">Active Streak</div>
                <div className="mt-1 inline-flex items-baseline gap-1.5 font-mono text-2xl font-bold text-foreground tabular-nums">
                  <span>{currentUserEntry.streakDays}d</span>
                  <Flame className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
              </div>

              <div className="sm:pl-4">
                <div className="text-xs font-medium text-foreground-muted">Next Rank Gap</div>
                <div className="mt-1 font-mono text-lg font-bold text-foreground tabular-nums">
                  {xpToNextRank !== null ? `+${xpToNextRank} XP` : 'Top Ranked #1'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-bold text-foreground">
                  Private Study Mode is enabled
                </div>
                <p className="text-xs text-foreground-muted">
                  Your profile is hidden from peer rankings while your XP ({liveCurrentUserXp.toLocaleString()} XP)
                  and milestone badges stay saved privately.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => {
                  updatePrefs((prev) => ({ ...prev, visibleOnLeaderboard: true }));
                  onToggleVisibility?.(true);
                }}
              >
                Rejoin Public Board
              </Button>
            </div>
          )}
        </section>

        {/* Top 3 Academic Podium */}
        {topThree.length > 0 && (
          <section aria-label="Top three scholars">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topThree.map((scholar, index) => (
                <article
                  key={scholar.id}
                  style={{ '--stagger-index': index } as React.CSSProperties}
                  className={cn(
                    'ants-stagger-item ants-card-interactive flex flex-col justify-between rounded-xl border p-4 shadow-[var(--shadow-tier-1)]',
                    scholar.isCurrentUser
                      ? 'border-primary-tint-border bg-primary-tint/40'
                      : 'border-border bg-surface-card'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold',
                          scholar.rank === 1
                            ? 'bg-primary-solid text-on-primary'
                            : 'border border-border bg-surface-inset text-foreground'
                        )}
                      >
                        <Trophy className="h-3 w-3" aria-hidden="true" />
                        <span>#{scholar.rank}</span>
                      </span>
                      <Badge variant="editorial">
                        {scholar.boardLabel}
                      </Badge>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`${flowOrigin}/@${scholar.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-bold text-foreground hover:text-primary hover:underline"
                        >
                          {scholar.name}
                        </a>
                        {scholar.isCurrentUser && (
                          <Badge variant="subject">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-foreground-muted">
                        @{scholar.username} · {scholar.cohortLabel}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
                    <div>
                      <div className="font-mono text-xl font-bold text-foreground tabular-nums">
                        {scholar.displayXp.toLocaleString()} XP
                      </div>
                      <div className="font-mono text-[11px] text-foreground-muted tabular-nums">
                        {scholar.avgUmsOrGradeLabel}
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-foreground-muted tabular-nums">
                      <div>{scholar.streakDays}d streak</div>
                      <div>{scholar.papersLogged} papers</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-card p-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              ref={timeframeTabsRef}
              role="tablist"
              aria-label="Leaderboard timeframe"
              data-gliding-ready={timeframeIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex items-center gap-1 rounded-lg border border-border bg-surface-inset p-1"
            >
              <span
                aria-hidden="true"
                data-animate={timeframeAnimate ? 'true' : 'false'}
                className="ants-glide-indicator rounded-md bg-surface-card shadow-xs"
                style={{
                  transform: `translate3d(${timeframeRect.x}px, ${timeframeRect.y}px, 0)`,
                  width: `${timeframeRect.width}px`,
                  height: `${timeframeRect.height}px`,
                  opacity: timeframeIndicatorReady ? 1 : 0,
                }}
              />
              {TIMEFRAME_TABS.map((tab) => {
                const active = prefs.timeframe === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => {
                      updatePrefs((prev) => ({ ...prev, timeframe: tab.id }));
                      onTimeframeChange?.(tab.id);
                    }}
                    className={cn(
                      'ants-glide-item relative z-10 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-surface-card text-foreground'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div
              ref={boardTabsRef}
              role="tablist"
              aria-label="Filter scholars by exam board"
              data-gliding-ready={boardIndicatorReady ? 'true' : 'false'}
              className="ants-glide-host relative inline-flex items-center gap-1 rounded-lg border border-border bg-surface-inset p-1"
            >
              <span
                aria-hidden="true"
                data-animate={boardAnimate ? 'true' : 'false'}
                className="ants-glide-indicator rounded-md bg-surface-card shadow-xs"
                style={{
                  transform: `translate3d(${boardRect.x}px, ${boardRect.y}px, 0)`,
                  width: `${boardRect.width}px`,
                  height: `${boardRect.height}px`,
                  opacity: boardIndicatorReady ? 1 : 0,
                }}
              />
              {BOARD_FILTERS.map((board) => {
                const active = prefs.boardFilter === board.id;
                return (
                  <button
                    key={board.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-active={active ? 'true' : 'false'}
                    onClick={() => {
                      updatePrefs((prev) => ({ ...prev, boardFilter: board.id }));
                      onBoardFilterChange?.(board.id);
                    }}
                    className={cn(
                      'ants-glide-item relative z-10 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      active
                        ? 'bg-surface-card text-foreground'
                        : 'text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {board.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative w-full lg:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find scholar or @username..."
              aria-label="Search scholars"
              className="h-9 w-full rounded-lg border border-border bg-surface-inset pl-8 pr-3 text-xs text-foreground placeholder:text-foreground-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Scholar Rankings Table */}
        <section
          aria-label="Scholar XP rankings table"
          className="overflow-hidden rounded-xl border border-border bg-surface-card shadow-[var(--shadow-tier-1)]"
        >
          {ranked.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-inset/70 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                    <th scope="col" className="px-4 py-3 w-16">
                      Rank
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Scholar
                    </th>
                    <th scope="col" className="hidden sm:table-cell px-4 py-3">
                      Board / Cohort
                    </th>
                    <th scope="col" className="hidden md:table-cell px-4 py-3 text-right">
                      Topics
                    </th>
                    <th scope="col" className="hidden md:table-cell px-4 py-3 text-right">
                      Papers
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Streak
                    </th>
                    <th scope="col" className="hidden lg:table-cell px-4 py-3 text-right">
                      Avg Score
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      {prefs.timeframe === 'weekly' ? 'Weekly XP' : 'Total XP'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ranked.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors',
                        row.isCurrentUser
                          ? 'bg-primary-tint/55 font-medium'
                          : 'hover:bg-surface-inset/50'
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-foreground tabular-nums">
                        #{row.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`${flowOrigin}/@${row.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {row.name}
                          </a>
                          {row.isCurrentUser && (
                            <Badge variant="subject">
                              You
                            </Badge>
                          )}
                          {row.isTutor && (
                            <Badge variant="editorial">
                              Tutor
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-foreground-muted">
                          @{row.username}
                          <span className="sm:hidden"> · {row.boardLabel}</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-xs text-foreground-muted">
                        <div className="font-medium text-foreground">{row.boardLabel}</div>
                        <div className="font-mono text-[11px]">{row.cohortLabel}</div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right font-mono text-xs text-foreground tabular-nums">
                        {row.topicsMastered}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right font-mono text-xs text-foreground tabular-nums">
                        {row.papersLogged}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-foreground tabular-nums">
                        {row.streakDays}d
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-right font-mono text-xs text-foreground-muted tabular-nums">
                        {row.avgUmsOrGradeLabel}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-foreground tabular-nums">
                        {row.displayXp.toLocaleString()} XP
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-foreground">No matching scholars found</p>
              <p className="mt-1 text-xs text-foreground-muted">
                Clear the search box or switch cohorts to view all participating scholars.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSearchQuery('');
                  updatePrefs((prev) => ({ ...prev, boardFilter: 'all' }));
                }}
              >
                Show All Cohorts
              </Button>
            </div>
          )}
        </section>

        {/* Academic Milestone Badges Shelf */}
        <section aria-label="Academic milestone badges" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Milestone Badges
              </h2>
              <p className="text-xs text-foreground-muted">
                Verified achievements synced to your Study XP ledger ({earnedCount} of{' '}
                {badges.length} unlocked).
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground-muted tabular-nums">
              <Award className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>
                {earnedCount}/{badges.length}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  'flex flex-col justify-between rounded-xl border p-4 transition-colors',
                  badge.earned
                    ? 'border-border bg-surface-card shadow-[var(--shadow-tier-1)]'
                    : 'border-dashed border-border bg-surface-inset/50 opacity-85'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-inset">
                      {renderBadgeIcon(badge.category)}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{badge.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5 font-mono text-[11px]">
                  <span className="text-foreground-muted">{badge.criteriaLabel}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-semibold',
                      badge.earned ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground-subtle'
                    )}
                  >
                    {badge.earned && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>
                      {badge.earned ? badge.earnedDateLabel ?? 'Unlocked' : `+${badge.xpReward} XP`}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </StudyShellView>
  );
}
