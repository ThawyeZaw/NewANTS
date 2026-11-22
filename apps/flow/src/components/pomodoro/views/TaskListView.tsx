'use client';

import React, { useState } from 'react';
import { Check, Minus, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { cn } from '@ants/ui';
import type { PomodoroTask } from '../../../lib/pomodoro/engine';
import { MOCK_POMODORO_TASKS } from '../../../mocks/pomodoro.mock';

export interface TaskListViewProps {
  tasks?: PomodoroTask[];
  activeTaskId?: string | null;
  /** e.g. `{ pomodorosLeft: 5, finishLabel: '14:35' }` */
  finishEstimate?: { pomodorosLeft: number; finishLabel: string } | null;
  /** DOM id of the quick-add input (used by the `N` keyboard shortcut) */
  newTaskInputId?: string;
  onAddTask?: (title: string, estimatedPomodoros: number) => void;
  /** 1-click Add & start timer immediately (Ctrl+Enter or Focus button) */
  onAddAndStartTask?: (title: string, estimatedPomodoros: number) => void;
  onToggleTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onSelectTask?: (taskId: string | null) => void;
  /** 1-click start/pause focus on a specific task row */
  onStartTask?: (taskId: string) => void;
  onChangeEstimate?: (taskId: string, delta: number) => void;
  onClearCompleted?: () => void;
  /** Whether the timer is currently running (for live row indicator) */
  timerRunning?: boolean;
  className?: string;
}

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30';

export function TaskListView({
  tasks = MOCK_POMODORO_TASKS,
  activeTaskId = MOCK_POMODORO_TASKS[0]?.id ?? null,
  finishEstimate = null,
  newTaskInputId = 'flow-new-task',
  onAddTask,
  onAddAndStartTask,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
  onStartTask,
  onChangeEstimate,
  onClearCompleted,
  timerRunning = false,
  className,
}: TaskListViewProps) {
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(1);

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);
  const activeTask = openTasks.find((t) => t.id === activeTaskId) ?? null;
  const remainingOpenTasks = activeTask
    ? openTasks.filter((t) => t.id !== activeTask.id)
    : openTasks;

  // Parse shorthand like "Physics ~3" or "Essay #2"
  const parseShorthand = (raw: string): { cleanTitle: string; parsedEstimate: number } => {
    let cleanTitle = raw.trim();
    let parsedEstimate = estimate;
    const match = cleanTitle.match(/(?:~|#|\bep:)(\d{1,2})$/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 20) {
        parsedEstimate = num;
        cleanTitle = cleanTitle.slice(0, match.index).trim();
      }
    }
    return { cleanTitle: cleanTitle || raw.trim(), parsedEstimate };
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const { cleanTitle, parsedEstimate } = parseShorthand(title);
    if (!cleanTitle) return;
    onAddTask?.(cleanTitle, parsedEstimate);
    setTitle('');
    setEstimate(1);
  };

  const handleAddAndFocus = () => {
    const { cleanTitle, parsedEstimate } = parseShorthand(title);
    if (!cleanTitle) return;
    if (onAddAndStartTask) {
      onAddAndStartTask(cleanTitle, parsedEstimate);
    } else {
      onAddTask?.(cleanTitle, parsedEstimate);
    }
    setTitle('');
    setEstimate(1);
  };

  const renderTask = (task: PomodoroTask) => {
    const isActive = task.id === activeTaskId && !task.done;
    return (
      <li
        key={task.id}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors',
          isActive
            ? 'rounded-xl border border-primary-tint-border/90 bg-primary-tint/40 shadow-xs'
            : 'hover:bg-surface-inset/60'
        )}
      >
        <button
          type="button"
          onClick={() => onToggleTask?.(task.id)}
          aria-label={task.done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            task.done
              ? 'border-success bg-success text-on-success'
              : 'border-border-hover text-transparent hover:border-primary hover:text-primary'
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onSelectTask?.(isActive ? null : task.id)}
          disabled={task.done}
          aria-pressed={isActive}
          title={task.done ? undefined : isActive ? 'Stop tracking this task' : 'Track sessions for this task'}
          className="min-w-0 flex-1 text-left focus-visible:outline-none disabled:cursor-default"
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'block truncate text-sm',
                task.done ? 'text-foreground-muted line-through' : 'text-foreground',
                isActive && 'font-semibold text-foreground'
              )}
            >
              {task.title}
            </span>
            {isActive && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-solid px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary">
                <span className={cn('h-1.5 w-1.5 rounded-full bg-white', timerRunning && 'animate-pulse')} />
                {timerRunning ? 'Focusing' : 'Active'}
              </span>
            )}
          </div>
        </button>

        <span
          className={cn(
            'shrink-0 font-mono text-xs tabular-nums',
            isActive ? 'font-semibold text-primary' : 'text-foreground-muted'
          )}
          aria-label={`${task.completedPomodoros} of ${task.estimatedPomodoros} sessions`}
        >
          {task.completedPomodoros}/{task.estimatedPomodoros}
        </span>

        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-50 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {!task.done && (
            <>
              {/* 1-Click Direct Focus Action */}
              <button
                type="button"
                onClick={() => onStartTask?.(task.id)}
                title={
                  isActive && timerRunning
                    ? 'Pause session (Space)'
                    : `Start focus session for "${task.title}" (1-click)`
                }
                aria-label={
                  isActive && timerRunning
                    ? `Pause session for "${task.title}"`
                    : `Start session for "${task.title}"`
                }
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && timerRunning
                    ? 'bg-primary-solid text-on-primary shadow-xs'
                    : 'text-primary hover:bg-primary-tint/60 hover:text-primary-solid'
                )}
              >
                {isActive && timerRunning ? (
                  <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onChangeEstimate?.(task.id, -1)}
                disabled={task.estimatedPomodoros <= 1}
                aria-label="One session fewer"
                className={iconButton}
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onChangeEstimate?.(task.id, 1)}
                disabled={task.estimatedPomodoros >= 20}
                aria-label="One session more"
                className={iconButton}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onDeleteTask?.(task.id)}
            aria-label={`Delete "${task.title}"`}
            className={cn(iconButton, 'hover:bg-destructive-tint hover:text-destructive')}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </li>
    );
  };

  return (
    <section aria-labelledby="flow-tasks-heading" className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="flow-tasks-heading" className="text-base font-semibold text-foreground">
          Tasks
        </h2>
        {finishEstimate && (
          <p className="text-xs text-foreground-muted">
            {finishEstimate.pomodorosLeft} sessions left · done by{' '}
            <span className="font-mono tabular-nums text-foreground">{finishEstimate.finishLabel}</span>
          </p>
        )}
      </div>

      {/* Quick Add Form with Shorthand + Instant Add & Focus */}
      <form onSubmit={handleSubmit} className="mb-3 flex items-center gap-2">
        <label htmlFor={newTaskInputId} className="sr-only">
          New task
        </label>
        <input
          id={newTaskInputId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey || e.shiftKey) && e.key === 'Enter') {
              e.preventDefault();
              handleAddAndFocus();
            }
          }}
          maxLength={140}
          placeholder="Add a task"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div
          className="flex h-10 items-center rounded-lg border border-border bg-surface-card"
          title="Estimated sessions"
        >
          <button
            type="button"
            onClick={() => setEstimate((e) => Math.max(1, e - 1))}
            aria-label="Fewer sessions"
            className="inline-flex h-full w-8 items-center justify-center text-foreground-muted hover:text-foreground focus-visible:outline-none"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span
            className="w-5 text-center font-mono text-sm tabular-nums text-foreground"
            aria-label={`${estimate} sessions`}
          >
            {estimate}
          </span>
          <button
            type="button"
            onClick={() => setEstimate((e) => Math.min(20, e + 1))}
            aria-label="More sessions"
            className="inline-flex h-full w-8 items-center justify-center text-foreground-muted hover:text-foreground focus-visible:outline-none"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!title.trim()}
          title="Add task (Enter)"
          className="h-10 rounded-lg bg-surface-inset px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={handleAddAndFocus}
          disabled={!title.trim()}
          title="Add and immediately start timer (Ctrl+Enter)"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
          <span className="hidden sm:inline">Focus</span>
        </button>
      </form>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
          <p className="text-sm font-medium text-foreground">No tasks in focus queue</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Add a quick task above or press <kbd className="rounded bg-surface-inset px-1 font-mono">N</kbd> to start
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ul className="-mx-1 flex flex-col gap-1.5">
            {activeTask && renderTask(activeTask)}
            {remainingOpenTasks.map(renderTask)}
            {doneTasks.map(renderTask)}
          </ul>
        </div>
      )}

      {doneTasks.length > 0 && (
        <button
          type="button"
          onClick={onClearCompleted}
          className="mt-3 text-xs text-foreground-muted hover:text-foreground focus-visible:outline-none"
        >
          Clear {doneTasks.length} completed
        </button>
      )}
    </section>
  );
}
