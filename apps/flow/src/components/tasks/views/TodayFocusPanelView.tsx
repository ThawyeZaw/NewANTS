'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  CalendarPlus,
  Check,
  Play,
  Plus,
  Star,
} from 'lucide-react';
import { Badge, cn } from '@ants/ui';
import {
  buildPomodoroHandoffUrl,
  formatDurationCompact,
  formatFullDateLabel,
  type TaskPriority,
} from '../../../lib/timetable/engine';
import {
  TASK_PRIORITIES,
  computeTodayFocusSummary,
  getSubtaskProgress,
  getTodayFocusTasks,
  type PlannerTask,
} from '../../../lib/tasks/engine';
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_CHECKBOX_CLASSES,
  PRIORITY_CHECKED_CLASSES,
} from './taskStyles';

export interface TodayFocusPanelViewProps {
  selectedDate: string;
  tasks: PlannerTask[];
  timetableFocusMinutes?: number;
  timetableReminderCount?: number;
  telegramConnected?: boolean;
  telegramHandle?: string;
  onQuickAddFocusTask: (title: string, priority: TaskPriority) => void;
  onToggleTask: (taskId: string) => void;
  onToggleTodayFocus: (taskId: string) => void;
  onScheduleTask: (task: PlannerTask) => void;
}

export function TodayFocusPanelView({
  selectedDate,
  tasks,
  timetableFocusMinutes = 0,
  timetableReminderCount = 0,
  telegramConnected = false,
  telegramHandle = '',
  onQuickAddFocusTask,
  onToggleTask,
  onToggleTodayFocus,
  onScheduleTask,
}: TodayFocusPanelViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('P1');

  // Always derive the Today Focus list via the pure priority comparator (P1 -> P4, open first)
  const focusTasks = useMemo(() => getTodayFocusTasks(tasks, selectedDate), [tasks, selectedDate]);
  const summary = useMemo(() => computeTodayFocusSummary(focusTasks), [focusTasks]);

  const visibleFocusTasks = useMemo(() => {
    if (priorityFilter === 'ALL') return focusTasks;
    return focusTasks.filter((t) => t.priority === priorityFilter);
  }, [focusTasks, priorityFilter]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    onQuickAddFocusTask(trimmed, quickPriority);
    setQuickTitle('');
  };

  return (
    <aside
      aria-label="Today Focus Panel"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card xl:sticky xl:top-20"
    >
      {/* Header & Daily Progress */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">Today Focus</h2>
          <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground-muted">
            {formatFullDateLabel(selectedDate)}
          </span>
        </div>

        {/* 6px Progress Track */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-foreground-muted">Daily execution</span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {summary.doneCount}/{summary.totalCount} done · {summary.percent}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${summary.percent}%` }}
            />
          </div>
        </div>

        {/* Tabular Focus Metrics */}
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3 text-xs">
          <div>
            <dt className="text-[11px] text-foreground-muted">Remaining</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">
              {formatDurationCompact(summary.plannedMinutes)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-foreground-muted">Pomodoros</dt>
            <dd className="font-mono font-semibold tabular-nums text-on-primary-tint">
              {summary.plannedPomodoros}×25m
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-foreground-muted">P1 Urgent</dt>
            <dd className="font-mono font-semibold tabular-nums text-destructive">
              {summary.p1OpenCount} open
            </dd>
          </div>
        </dl>
      </div>

      {/* Priority Filter & Quick Pin Add */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-foreground-muted">Pinned &amp; Due Today</span>
          <span className="font-mono text-[11px] tabular-nums text-foreground-muted">
            {summary.openCount} open
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1" role="group" aria-label="Filter Today Focus by priority">
          {(['ALL', ...TASK_PRIORITIES] as const).map((p) => {
            const active = priorityFilter === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => setPriorityFilter(p)}
                className={cn(
                  'rounded-md border px-2 py-1 font-mono text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-inset/50 text-foreground-muted hover:text-foreground'
                )}
              >
                {p === 'ALL' ? 'All' : p}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="mt-2.5 flex items-center gap-1.5">
          <select
            aria-label="Today focus task priority"
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
            className="h-8 rounded-lg border border-border bg-surface-inset px-1.5 font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            maxLength={140}
            placeholder="Pin focus item for today..."
            className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-surface-card px-2.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            aria-label="Pin task to Today Focus"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </form>

        {/* Focus Queue */}
        {visibleFocusTasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-foreground-muted">
            No {priorityFilter === 'ALL' ? '' : `${priorityFilter} `}tasks pinned for today. Star any task card to add it here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle">
            {visibleFocusTasks.map((task) => {
              const subProgress = getSubtaskProgress(task);
              const canPomodoro = typeof task.pomodorosPlanned === 'number' && task.pomodorosPlanned > 0;
              return (
                <li key={task.id} className="group flex items-start gap-2.5 py-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.done}
                    aria-label={task.done ? `Mark "${task.title}" undone` : `Complete "${task.title}"`}
                    onClick={() => onToggleTask(task.id)}
                    className={cn(
                      'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border-[1.5px] transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      task.done
                        ? PRIORITY_CHECKED_CLASSES[task.priority]
                        : PRIORITY_CHECKBOX_CLASSES[task.priority]
                    )}
                  >
                    <Check
                      className={cn('h-2.5 w-2.5', task.done ? 'opacity-100' : 'opacity-0 group-hover:opacity-45')}
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'min-w-0 flex-1 text-xs font-medium leading-snug text-foreground',
                          task.done && 'text-foreground-muted line-through'
                        )}
                      >
                        {task.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none',
                            PRIORITY_BADGE_CLASSES[task.priority]
                          )}
                        >
                          {task.priority}
                        </span>
                        <button
                          type="button"
                          aria-pressed={task.inTodayFocus}
                          onClick={() => onToggleTodayFocus(task.id)}
                          title={
                            task.inTodayFocus
                              ? 'Pinned to Today Focus — click to unpin'
                              : 'Due today — click to pin to Today Focus'
                          }
                          aria-label={
                            task.inTodayFocus
                              ? `Unpin "${task.title}" from Today Focus`
                              : `Pin "${task.title}" to Today Focus`
                          }
                          className={cn(
                            'inline-flex h-5 w-5 items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            task.inTodayFocus
                              ? 'text-primary hover:bg-primary-tint'
                              : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                          )}
                        >
                          <Star
                            className={cn('h-3 w-3', task.inTodayFocus && 'fill-current')}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[10px] tabular-nums text-foreground-muted">
                        <span>{formatDurationCompact(task.estimatedMinutes)}</span>
                        {subProgress.total > 0 && (
                          <>
                            <span>·</span>
                            <span>
                              {subProgress.completed}/{subProgress.total} steps
                            </span>
                          </>
                        )}
                        {task.tags[0] && (
                          <span className="rounded bg-surface-inset px-1.5 py-0.5 font-sans font-semibold text-foreground-muted">
                            {task.tags[0]}
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {!task.done && (
                          <button
                            type="button"
                            onClick={() => onScheduleTask(task)}
                            title="Schedule onto timetable"
                            className="inline-flex h-6 items-center gap-1 rounded border border-border px-1.5 text-[10px] font-semibold text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <CalendarPlus className="h-3 w-3" aria-hidden="true" />
                            <span>Block</span>
                          </button>
                        )}
                        {!task.done && canPomodoro && (
                          <Link
                            href={buildPomodoroHandoffUrl({
                              title: task.title,
                              pomodoros: task.pomodorosPlanned,
                            })}
                            title="Start in Pomodoro"
                            className="inline-flex h-6 items-center gap-1 rounded border border-primary-tint-border bg-primary-tint px-1.5 text-[10px] font-semibold text-on-primary-tint transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Play className="h-2.5 w-2.5" aria-hidden="true" />
                            <span>Focus</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Synced Timetable & Telegram Bridge Footer */}
      <div className="space-y-2 border-t border-border bg-surface-inset/45 px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground-muted">
            Timetable focus:{' '}
            <strong className="font-mono tabular-nums text-foreground">
              {formatDurationCompact(timetableFocusMinutes)}
            </strong>
          </span>
          <Link
            href="/timetable"
            className="inline-flex items-center gap-1 rounded font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Timetable</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-foreground-muted">
            <Bell className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="font-mono tabular-nums text-foreground">{timetableReminderCount}</span>
            <span>Telegram pings</span>
          </div>
          {telegramConnected ? (
            <Badge variant="verified" dot>
              {telegramHandle}
            </Badge>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="editorial" dot>
                Not linked
              </Badge>
              <Link
                href="/settings#telegram"
                className="text-[11px] font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Connect
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

