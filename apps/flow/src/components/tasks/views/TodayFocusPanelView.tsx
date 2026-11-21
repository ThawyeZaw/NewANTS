'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  CalendarPlus,
  Check,
  ChevronDown,
  Flame,
  Play,
  Plus,
  Star,
  X,
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
  /** Optional close handler when displayed inside a mobile slide-over sheet */
  onClose?: () => void;
  className?: string;
}

function FocusProgressRing({ percent, complete }: { percent: number; complete: boolean }) {
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex h-13 w-13 shrink-0 items-center justify-center">
      <svg viewBox="0 0 52 52" className="h-13 w-13 -rotate-90" aria-hidden="true">
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          strokeWidth="4.5"
          className="stroke-border"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset,stroke] duration-300',
            complete ? 'stroke-success' : 'stroke-primary'
          )}
        />
      </svg>
      <span className="absolute font-mono text-[11px] font-bold tabular-nums text-foreground">
        {clamped}%
      </span>
    </div>
  );
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
  onClose,
  className,
}: TodayFocusPanelViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('P1');
  const [footerOpen, setFooterOpen] = useState(false);

  // Derive Today Focus list using deterministic P1 -> P4 ordering (open tasks before done)
  const focusTasks = useMemo(() => getTodayFocusTasks(tasks, selectedDate), [tasks, selectedDate]);
  const summary = useMemo(() => computeTodayFocusSummary(focusTasks), [focusTasks]);

  const visibleFocusTasks = useMemo(() => {
    if (priorityFilter === 'ALL') return focusTasks;
    return focusTasks.filter((t) => t.priority === priorityFilter);
  }, [focusTasks, priorityFilter]);

  const upNextTask = useMemo(
    () => visibleFocusTasks.find((t) => !t.done) ?? null,
    [visibleFocusTasks]
  );

  const queueTasks = useMemo(
    () => (upNextTask ? visibleFocusTasks.filter((t) => t.id !== upNextTask.id) : visibleFocusTasks),
    [visibleFocusTasks, upNextTask]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    onQuickAddFocusTask(trimmed, quickPriority);
    setQuickTitle('');
  };

  const allDoneToday = focusTasks.length > 0 && summary.openCount === 0;

  return (
    <aside
      aria-label="Today Focus Panel"
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]',
        className
      )}
    >
      {/* Calm Sprint HUD Header */}
      <div className="shrink-0 border-b border-border px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">Today Focus</h2>
            <span className="rounded-md bg-surface-inset px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-foreground-muted">
              {formatFullDateLabel(selectedDate)}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Today Focus"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Radial Completion Ring + Conversational Momentum */}
        <div className="mt-3 flex items-center gap-3.5">
          <FocusProgressRing percent={summary.percent} complete={allDoneToday} />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              <span className="font-mono tabular-nums">
                {summary.doneCount}/{summary.totalCount}
              </span>{' '}
              <span className="font-normal text-foreground-muted">tasks completed</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tabular-nums text-foreground-muted">
              <span>{formatDurationCompact(summary.plannedMinutes)} left</span>
              <span aria-hidden="true">·</span>
              <span className="text-on-primary-tint font-semibold">{summary.plannedPomodoros}×25m</span>
              {summary.p1OpenCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-destructive">{summary.p1OpenCount} P1</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Spotlight Next-Up Card */}
        {upNextTask ? (
          <div className="mt-3.5 rounded-xl border border-primary-tint-border bg-primary-tint/45 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-on-primary-tint">
                <Flame className="h-3 w-3 text-primary" aria-hidden="true" />
                Up next
              </span>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none',
                    PRIORITY_BADGE_CLASSES[upNextTask.priority]
                  )}
                >
                  {upNextTask.priority}
                </span>
                <button
                  type="button"
                  aria-pressed={upNextTask.inTodayFocus}
                  onClick={() => onToggleTodayFocus(upNextTask.id)}
                  title={upNextTask.inTodayFocus ? 'Unpin from Today Focus' : 'Pin to Today Focus'}
                  aria-label={
                    upNextTask.inTodayFocus
                      ? `Unpin "${upNextTask.title}" from Today Focus`
                      : `Pin "${upNextTask.title}" to Today Focus`
                  }
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    upNextTask.inTodayFocus
                      ? 'text-primary hover:bg-surface-card/70'
                      : 'text-foreground-muted hover:bg-surface-card/70 hover:text-foreground'
                  )}
                >
                  <Star className={cn('h-3 w-3', upNextTask.inTodayFocus && 'fill-current')} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="mt-1.5 flex items-start gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={upNextTask.done}
                aria-label={`Complete "${upNextTask.title}"`}
                onClick={() => onToggleTask(upNextTask.id)}
                className={cn(
                  'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] bg-surface-card transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  PRIORITY_CHECKBOX_CLASSES[upNextTask.priority]
                )}
              >
                <Check className="h-2.5 w-2.5 opacity-0 hover:opacity-50" strokeWidth={3} aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground">
                  {upNextTask.title}
                </p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-foreground-muted">
                  {formatDurationCompact(upNextTask.estimatedMinutes)}
                  {typeof upNextTask.pomodorosPlanned === 'number' && upNextTask.pomodorosPlanned > 0
                    ? ` · ${upNextTask.pomodorosPlanned}×25m`
                    : ''}
                  {upNextTask.tags[0] ? ` · #${upNextTask.tags[0]}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-1.5">
              {typeof upNextTask.pomodorosPlanned === 'number' && upNextTask.pomodorosPlanned > 0 ? (
                <Link
                  href={buildPomodoroHandoffUrl({
                    title: upNextTask.title,
                    pomodoros: upNextTask.pomodorosPlanned,
                  })}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Play className="h-3 w-3" aria-hidden="true" />
                  <span>Start Focus</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleTask(upNextTask.id)}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Mark done</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onScheduleTask(upNextTask)}
                title="Schedule onto timetable"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarPlus className="h-3.5 w-3.5 text-foreground-muted" aria-hidden="true" />
                <span>Block</span>
              </button>
            </div>
          </div>
        ) : allDoneToday ? (
          <div className="mt-3.5 rounded-xl border border-success-border bg-success-tint px-3 py-2.5 text-xs font-semibold text-on-success-tint">
            All pinned focus goals finished today — great momentum.
          </div>
        ) : null}
      </div>

      {/* Scrollable Queue & Quick Pin */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div
            className="inline-flex items-center rounded-lg bg-surface-inset p-0.5"
            role="group"
            aria-label="Filter Today Focus by priority"
          >
            {(['ALL', ...TASK_PRIORITIES] as const).map((p) => {
              const active = priorityFilter === p;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    'rounded-md px-2 py-1 font-mono text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                      : 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  {p === 'ALL' ? 'All' : p}
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-foreground-muted">
            {summary.openCount} open
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-2.5 flex items-center gap-1.5">
          <select
            aria-label="Today focus task priority"
            value={quickPriority}
            onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
            className="h-9 rounded-lg border border-border bg-surface-inset px-1.5 font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring sm:h-8"
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
            placeholder="Pin a focus goal..."
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-inset/40 px-2.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-ring sm:h-8"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            aria-label="Pin task to Today Focus"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 sm:h-8 sm:w-8"
          >
            <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          </button>
        </form>

        {/* Remaining Queue */}
        {visibleFocusTasks.length === 0 ? (
          <p className="py-7 text-center text-xs text-foreground-muted">
            No {priorityFilter === 'ALL' ? '' : `${priorityFilter} `}tasks pinned for today. Star any card to add it here.
          </p>
        ) : queueTasks.length > 0 ? (
          <ul className="mt-3 divide-y divide-border-subtle">
            {queueTasks.map((task) => {
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
                      'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-4 sm:w-4',
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
                    <p
                      className={cn(
                        'line-clamp-2 text-xs font-medium leading-snug text-foreground',
                        task.done && 'text-foreground-muted line-through'
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px] tabular-nums text-foreground-muted">
                      <span
                        className={cn(
                          'rounded border px-1 py-0.5 font-bold leading-none',
                          PRIORITY_BADGE_CLASSES[task.priority]
                        )}
                      >
                        {task.priority}
                      </span>
                      <span>{formatDurationCompact(task.estimatedMinutes)}</span>
                      {subProgress.total > 0 && (
                        <span>
                          · {subProgress.completed}/{subProgress.total} steps
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity lg:opacity-75 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                    {!task.done && canPomodoro && (
                      <Link
                        href={buildPomodoroHandoffUrl({
                          title: task.title,
                          pomodoros: task.pomodorosPlanned,
                        })}
                        aria-label={`Start Pomodoro for "${task.title}"`}
                        title="Start in Pomodoro"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-on-primary-tint transition-colors hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Play className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    )}
                    {!task.done && (
                      <button
                        type="button"
                        onClick={() => onScheduleTask(task)}
                        aria-label={`Schedule "${task.title}" on timetable`}
                        title="Schedule onto timetable"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-pressed={task.inTodayFocus}
                      onClick={() => onToggleTodayFocus(task.id)}
                      title={task.inTodayFocus ? 'Unpin from Today Focus' : 'Pin to Today Focus'}
                      aria-label={
                        task.inTodayFocus
                          ? `Unpin "${task.title}" from Today Focus`
                          : `Pin "${task.title}" to Today Focus`
                      }
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        task.inTodayFocus
                          ? 'text-primary hover:bg-primary-tint'
                          : 'text-foreground-muted hover:bg-surface-inset hover:text-foreground'
                      )}
                    >
                      <Star className={cn('h-3 w-3', task.inTodayFocus && 'fill-current')} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {/* Collapsible Timetable & Telegram Status Bar */}
      <div className="shrink-0 border-t border-border bg-surface-inset/45 text-xs">
        <button
          type="button"
          aria-expanded={footerOpen}
          onClick={() => setFooterOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-surface-inset/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 truncate text-foreground-muted">
            Timetable{' '}
            <strong className="font-mono tabular-nums text-foreground">
              {formatDurationCompact(timetableFocusMinutes)}
            </strong>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {telegramConnected ? (
              <Badge variant="verified" dot>
                {telegramHandle}
              </Badge>
            ) : (
              <Badge variant="editorial" dot>
                Not linked
              </Badge>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 text-foreground-muted transition-transform', footerOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </span>
        </button>

        <div
          className="ants-accordion"
          data-open={footerOpen ? 'true' : 'false'}
          aria-hidden={!footerOpen}
        >
          <div className="ants-accordion-inner">
            <div className="space-y-2 border-t border-border-subtle px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-foreground-muted">
                  <Bell className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span className="font-mono tabular-nums text-foreground">{timetableReminderCount}</span>
                  <span>Telegram pings</span>
                </div>
                {!telegramConnected && (
                  <Link
                    href="/settings#telegram"
                    tabIndex={footerOpen ? undefined : -1}
                    className="text-[11px] font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Connect
                  </Link>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground-muted">Daily 24h blocks synced</span>
                <Link
                  href="/timetable"
                  tabIndex={footerOpen ? undefined : -1}
                  className="inline-flex items-center gap-1 rounded font-semibold text-on-primary-tint hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>Open Timetable</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
