'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CalendarPlus, Check, Play, Plus, Trash2 } from 'lucide-react';
import { Badge, cn } from '@ants/ui';
import {
  PRIORITY_ORDER,
  buildPomodoroHandoffUrl,
  formatDurationCompact,
  formatFullDateLabel,
  type DayAllocationSummary,
  type TaskPriority,
  type TodayFocusTask,
} from '../../../lib/timetable/engine';
import { PRIORITY_BADGE_CLASSES } from './timetableStyles';

export interface TodayFocusRailViewProps {
  selectedDate: string;
  allocations: DayAllocationSummary;
  tasks: TodayFocusTask[];
  telegramConnected: boolean;
  telegramHandle: string;
  onAddTask: (title: string, priority: TaskPriority) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onScheduleTask: (task: TodayFocusTask) => void;
}

const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3', 'P4'];

export function TodayFocusRailView({
  selectedDate,
  allocations,
  tasks,
  telegramConnected,
  telegramHandle,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onScheduleTask,
}: TodayFocusRailViewProps) {
  const [filter, setFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('P1');

  const sortedTasks = useMemo(() => {
    const filtered = filter === 'ALL' ? tasks : tasks.filter((t) => t.priority === filter);
    return [...filtered].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
  }, [tasks, filter]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAddTask(trimmed, newPriority);
    setNewTitle('');
  };

  return (
    <aside
      aria-label="Today focus planner"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-card xl:sticky xl:top-20"
    >
      {/* Daily 24h Allocation Summary */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">Today&apos;s Focus Budget</h2>
          <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground-muted">
            {formatFullDateLabel(selectedDate)}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <div className="flex items-baseline justify-between border-b border-border-subtle pb-1.5">
            <dt className="text-foreground-muted">Deep &amp; Reading</dt>
            <dd className="font-mono font-semibold tabular-nums text-primary">
              {formatDurationCompact(allocations.focusMinutes)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-border-subtle pb-1.5">
            <dt className="text-foreground-muted">Commitments</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">
              {formatDurationCompact(allocations.commitmentMinutes)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-border-subtle pb-1.5">
            <dt className="text-foreground-muted">Gym &amp; Meals</dt>
            <dd className="font-mono font-semibold tabular-nums text-success">
              {formatDurationCompact(allocations.healthAndMealsMinutes)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-border-subtle pb-1.5">
            <dt className="text-foreground-muted">Buffers</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">
              {formatDurationCompact(allocations.bufferMinutes)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-foreground-muted">Sleep</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground-muted">
              {formatDurationCompact(allocations.sleepMinutes)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-foreground-muted">Pomodoros</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">
              {allocations.plannedPomodoros}×25m
            </dd>
          </div>
        </dl>
      </div>

      {/* P1–P4 Task Planner */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">P1–P4 Priorities</h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] tabular-nums text-foreground-muted">
              {tasks.filter((t) => !t.done).length} open
            </span>
            <Link
              href="/tasks"
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Planner →
            </Link>
          </div>
        </div>

        {/* Priority Filter Pills */}
        <div className="mt-2.5 flex items-center gap-1" role="group" aria-label="Filter tasks by priority">
          {(['ALL', ...PRIORITIES] as const).map((p) => {
            const active = filter === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(p)}
                className={cn(
                  'rounded-md border px-2 py-1 font-mono text-[11px] font-bold transition-colors',
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

        {/* Quick Add Form */}
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-1.5">
          <select
            aria-label="New task priority"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
            className="h-9 rounded-lg border border-border bg-surface-inset px-2 font-mono text-xs font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={140}
            placeholder="Add priority goal..."
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-card px-2.5 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            aria-label="Add task"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>

        {/* Task List */}
        {sortedTasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-foreground-muted">
            No {filter === 'ALL' ? '' : `${filter} `}tasks remaining.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle">
            {sortedTasks.map((task) => (
              <li key={task.id} className="group flex items-start gap-2.5 py-2.5">
                <button
                  type="button"
                  onClick={() => onToggleTask(task.id)}
                  aria-label={task.done ? `Mark "${task.title}" undone` : `Mark "${task.title}" done`}
                  className={cn(
                    'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    task.done
                      ? 'border-success bg-success text-on-success'
                      : 'border-border-hover bg-surface-card text-transparent hover:border-primary'
                  )}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'text-xs font-medium leading-snug text-foreground',
                        task.done && 'text-foreground-muted line-through'
                      )}
                    >
                      {task.title}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none',
                        PRIORITY_BADGE_CLASSES[task.priority]
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-[10px] tabular-nums text-foreground-muted">
                      <span>{formatDurationCompact(task.estimatedMinutes)}</span>
                      {typeof task.pomodorosPlanned === 'number' && task.pomodorosPlanned > 0 && (
                        <>
                          <span>·</span>
                          <span>{task.pomodorosPlanned}×25m</span>
                        </>
                      )}
                      {task.tag && (
                        <span className="rounded bg-surface-inset px-1.5 py-0.5 font-sans font-semibold">
                          {task.tag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onScheduleTask(task)}
                        title="Schedule onto timetable"
                        className="inline-flex h-6 items-center gap-1 rounded border border-border px-1.5 text-[10px] font-semibold text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground"
                      >
                        <CalendarPlus className="h-3 w-3" aria-hidden="true" />
                        Block
                      </button>
                      {typeof task.pomodorosPlanned === 'number' && task.pomodorosPlanned > 0 && (
                        <Link
                          href={buildPomodoroHandoffUrl({
                            title: task.title,
                            pomodoros: task.pomodorosPlanned,
                          })}
                          title="Start in Pomodoro"
                          className="inline-flex h-6 items-center gap-1 rounded border border-primary-tint-border bg-primary-tint px-1.5 text-[10px] font-semibold text-on-primary-tint transition-colors hover:border-primary"
                        >
                          <Play className="h-2.5 w-2.5" aria-hidden="true" />
                          Focus
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        aria-label={`Delete "${task.title}"`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-foreground-subtle opacity-100 transition-opacity hover:bg-destructive-tint hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Telegram Cron Status Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-inset/45 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="font-semibold text-foreground">
            {allocations.reminderCount} Telegram pings
          </span>
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
    </aside>
  );
}

