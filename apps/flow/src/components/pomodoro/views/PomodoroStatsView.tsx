'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@ants/ui';
import { PHASE_LABELS, formatDuration, type PomodoroSessionRecord } from '../../../lib/pomodoro/engine';
import { getDailyBuckets, getSummary, getWeeklyBuckets } from '../../../lib/pomodoro/stats';
import { createMockPomodoroHistory } from '../../../mocks/pomodoro.mock';

export type StatsRange = 'daily' | 'weekly';

export interface PomodoroStatsViewProps {
  history?: PomodoroSessionRecord[];
  dailyGoal?: number;
  workMinutes?: number;
  /** Epoch ms used as "today" (pass a ticking value so charts roll over at midnight) */
  now?: number;
  onClearHistory?: () => void;
  className?: string;
}

interface BarDatum {
  key: string;
  label: string;
  value: number;
  title: string;
  highlight: boolean;
}

function BarChart({ data, goal }: { data: BarDatum[]; goal?: number }) {
  const max = Math.max(1, goal ?? 0, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);
  const goalPct = goal ? (goal / max) * 100 : null;

  return (
    <figure>
      <div className="relative flex h-48 items-end gap-2 sm:gap-3" role="img" aria-label="Focus time chart">
        {goalPct !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground-subtle/60"
            style={{ bottom: `${goalPct}%` }}
            aria-hidden="true"
          />
        )}
        {data.map((d) => (
          <div key={d.key} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              title={d.title}
              className={cn(
                'w-full rounded-t-[4px] transition-[height] duration-500 ease-out',
                d.value === 0 ? 'bg-border' : d.highlight ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/60'
              )}
              style={{ height: d.value === 0 ? '2px' : `${Math.max((d.value / max) * 100, 2)}%` }}
            />
          </div>
        ))}
        {!hasData && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-foreground-muted">
            Finish a focus session to start your chart.
          </p>
        )}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3" aria-hidden="true">
        {data.map((d) => (
          <span
            key={d.key}
            className={cn('flex-1 truncate text-center text-xs', d.highlight ? 'font-semibold text-foreground' : 'text-foreground-subtle')}
          >
            {d.label}
          </span>
        ))}
      </div>
      {goal !== undefined && (
        <figcaption className="mt-3 text-xs text-foreground-muted">
          Dashed line: daily goal ({formatDuration(goal)})
        </figcaption>
      )}
    </figure>
  );
}

function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatShortDate(iso: string, now: Date): string {
  const d = new Date(iso);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function PomodoroStatsView({
  history,
  dailyGoal = 8,
  workMinutes = 25,
  now,
  onClearHistory,
  className,
}: PomodoroStatsViewProps) {
  const [range, setRange] = useState<StatsRange>('daily');
  const [confirmClear, setConfirmClear] = useState(false);
  const nowDate = useMemo(() => new Date(now ?? Date.now()), [now]);
  const records = useMemo(() => history ?? createMockPomodoroHistory(nowDate), [history, nowDate]);
  // Heavy aggregations only need to rerun when history changes or the calendar day rolls over.
  const dayKey = nowDate.toDateString();

  const summary = useMemo(() => getSummary(records, nowDate, dailyGoal), [records, dailyGoal, dayKey]);

  const chartData: BarDatum[] = useMemo(() => {
    if (range === 'weekly') {
      return getWeeklyBuckets(records, 8, nowDate).map((w) => ({
        key: w.weekStartKey,
        label: w.label,
        value: w.focusMinutes,
        title: `Week of ${w.label}: ${formatDuration(w.focusMinutes)}, ${w.pomodoros} sessions`,
        highlight: w.isCurrent,
      }));
    }
    return getDailyBuckets(records, 7, nowDate).map((d) => ({
      key: d.dateKey,
      label: d.label,
      value: d.focusMinutes,
      title: `${d.fullLabel}: ${formatDuration(d.focusMinutes)}, ${d.pomodoros} sessions`,
      highlight: d.isToday,
    }));
  }, [records, range, dayKey]);

  const recent = useMemo(() => [...records].slice(-6).reverse(), [records]);

  return (
    <div className={cn('mx-auto max-w-2xl space-y-12', className)}>
      {/* Summary */}
      <section aria-labelledby="stats-summary-heading">
        <h2 id="stats-summary-heading" className="sr-only">
          Summary
        </h2>
        <dl className="grid grid-cols-3 divide-x divide-border">
          <div className="pr-4">
            <dt className="text-sm text-foreground-muted">Today</dt>
            <dd className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">
              {summary.todayPomodoros}
              <span className="text-lg text-foreground-subtle">/{dailyGoal}</span>
            </dd>
            <dd className="mt-0.5 text-xs text-foreground-muted">{formatDuration(summary.todayFocusMinutes)} focused</dd>
          </div>
          <div className="px-4">
            <dt className="text-sm text-foreground-muted">This week</dt>
            <dd className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">
              {formatDuration(summary.weekFocusMinutes)}
            </dd>
            <dd className="mt-0.5 text-xs text-foreground-muted">{summary.weekPomodoros} sessions</dd>
          </div>
          <div className="pl-4">
            <dt className="text-sm text-foreground-muted">Streak</dt>
            <dd className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-[-0.03em] text-foreground">
              {summary.currentStreak}
              <span className="text-lg text-foreground-subtle"> {summary.currentStreak === 1 ? 'day' : 'days'}</span>
            </dd>
            <dd className="mt-0.5 text-xs text-foreground-muted">Best {summary.bestStreak}</dd>
          </div>
        </dl>
      </section>

      {/* Chart */}
      <section aria-labelledby="stats-chart-heading">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="stats-chart-heading" className="text-base font-semibold text-foreground">
            Focus time
          </h2>
          <div role="tablist" aria-label="Chart range" className="inline-flex rounded-lg bg-surface-inset p-0.5">
            {(['daily', 'weekly'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={range === id}
                onClick={() => setRange(id)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-semibold capitalize transition-colors',
                  range === id ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]' : 'text-foreground-muted hover:text-foreground'
                )}
              >
                {id === 'daily' ? 'Last 7 days' : 'Last 8 weeks'}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={chartData} goal={range === 'daily' ? dailyGoal * workMinutes : undefined} />
      </section>

      {/* Recent sessions */}
      <section aria-labelledby="stats-recent-heading">
        <h2 id="stats-recent-heading" className="mb-3 text-base font-semibold text-foreground">
          Recent sessions
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-foreground-muted">Your finished sessions will show up here.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-4 py-3 text-sm">
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    r.phase !== 'work' ? 'bg-success' : r.completed ? 'bg-primary' : 'bg-border-hover'
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {r.phase === 'work' ? r.taskTitle ?? 'Focus' : PHASE_LABELS[r.phase]}
                  {!r.completed && <span className="text-foreground-muted"> (stopped early)</span>}
                </span>
                <span className="hidden shrink-0 text-foreground-muted sm:inline">
                  {formatShortDate(r.startedAt, nowDate)}, {formatTimeOfDay(r.startedAt)}
                </span>
                <span className="w-14 shrink-0 text-right font-mono tabular-nums text-foreground">
                  {formatDuration(r.durationSeconds / 60)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {onClearHistory && records.length > 0 && (
          <div className="mt-4 text-xs">
            {confirmClear ? (
              <span className="flex items-center gap-3">
                <span className="text-foreground-muted">Delete all session history on this device?</span>
                <button
                  type="button"
                  className="font-semibold text-destructive hover:underline"
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                >
                  Delete
                </button>
                <button type="button" className="font-semibold text-foreground-muted hover:text-foreground" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} className="text-foreground-muted hover:text-destructive">
                Clear history
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
