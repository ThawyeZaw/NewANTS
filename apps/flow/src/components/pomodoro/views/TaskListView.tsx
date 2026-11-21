'use client';

import React, { useState } from 'react';
import { Check, Minus, Plus, Trash2 } from 'lucide-react';
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
  onToggleTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onSelectTask?: (taskId: string | null) => void;
  onChangeEstimate?: (taskId: string, delta: number) => void;
  onClearCompleted?: () => void;
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
  onToggleTask,
  onDeleteTask,
  onSelectTask,
  onChangeEstimate,
  onClearCompleted,
  className,
}: TaskListViewProps) {
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(1);

  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTask?.(trimmed, estimate);
    setTitle('');
    setEstimate(1);
  };

  const renderTask = (task: PomodoroTask) => {
    const isActive = task.id === activeTaskId && !task.done;
    return (
      <li
        key={task.id}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
          isActive ? 'bg-primary-tint' : 'hover:bg-surface-inset'
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
          <span
            className={cn(
              'block truncate text-sm',
              task.done ? 'text-foreground-muted line-through' : 'text-foreground',
              isActive && 'font-semibold'
            )}
          >
            {task.title}
          </span>
        </button>

        <span
          className="shrink-0 font-mono text-xs tabular-nums text-foreground-muted"
          aria-label={`${task.completedPomodoros} of ${task.estimatedPomodoros} sessions`}
        >
          {task.completedPomodoros}/{task.estimatedPomodoros}
        </span>

        <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {!task.done && (
            <>
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

      <form onSubmit={handleSubmit} className="mb-2 flex items-center gap-2">
        <label htmlFor={newTaskInputId} className="sr-only">
          New task
        </label>
        <input
          id={newTaskInputId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="Add a task"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex h-10 items-center rounded-lg border border-border bg-surface-card" title="Estimated sessions">
          <button
            type="button"
            onClick={() => setEstimate((e) => Math.max(1, e - 1))}
            aria-label="Fewer sessions"
            className="inline-flex h-full w-8 items-center justify-center text-foreground-muted hover:text-foreground"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span className="w-5 text-center font-mono text-sm tabular-nums text-foreground" aria-label={`${estimate} sessions`}>
            {estimate}
          </span>
          <button
            type="button"
            onClick={() => setEstimate((e) => Math.min(20, e + 1))}
            aria-label="More sessions"
            className="inline-flex h-full w-8 items-center justify-center text-foreground-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <button
          type="submit"
          disabled={!title.trim()}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="px-2 py-6 text-sm text-foreground-muted">
          No tasks yet. Add one and pick it before you start, so each session counts toward it.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {openTasks.map(renderTask)}
          {doneTasks.map(renderTask)}
        </ul>
      )}

      {doneTasks.length > 0 && (
        <button
          type="button"
          onClick={onClearCompleted}
          className="mt-3 text-xs text-foreground-muted hover:text-foreground"
        >
          Clear {doneTasks.length} completed
        </button>
      )}
    </section>
  );
}
