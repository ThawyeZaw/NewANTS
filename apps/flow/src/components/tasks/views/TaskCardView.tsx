'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Flag,
  Play,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@ants/ui';
import {
  buildPomodoroHandoffUrl,
  formatDurationCompact,
  type TaskPriority,
} from '../../../lib/timetable/engine';
import {
  PRIORITY_LABELS,
  TASK_PRIORITIES,
  formatDueDateChip,
  getSubtaskProgress,
  type PlannerTask,
} from '../../../lib/tasks/engine';
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_CARD_CLASSES,
  PRIORITY_CHECKBOX_CLASSES,
  PRIORITY_CHECKED_CLASSES,
} from './taskStyles';

export interface TaskCardViewProps {
  task: PlannerTask;
  todayIso: string;
  activeTags: string[];
  onToggleTask: (taskId: string) => void;
  onChangePriority: (taskId: string, priority: TaskPriority) => void;
  onToggleTodayFocus: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onToggleTagFilter: (tag: string) => void;
  onScheduleTask: (task: PlannerTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export function TaskCardView({
  task,
  todayIso,
  activeTags,
  onToggleTask,
  onChangePriority,
  onToggleTodayFocus,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onToggleTagFilter,
  onScheduleTask,
  onDeleteTask,
}: TaskCardViewProps) {
  // Expand subtasks automatically on open tasks that already carry checklist items
  const [subtasksExpanded, setSubtasksExpanded] = useState(
    () => task.subtasks.length > 0 && !task.done
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const progress = getSubtaskProgress(task);
  const dueChip = formatDueDateChip(task.dueDate, todayIso);
  const supportsPomodoro = typeof task.pomodorosPlanned === 'number' && task.pomodorosPlanned > 0;

  const handleAddSubtaskSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    onAddSubtask(task.id, trimmed);
    setNewSubtaskTitle('');
    setSubtasksExpanded(true);
  };

  const handleCyclePriority = () => {
    const idx = TASK_PRIORITIES.indexOf(task.priority);
    const next = TASK_PRIORITIES[(idx + 1) % TASK_PRIORITIES.length] ?? 'P1';
    onChangePriority(task.id, next);
  };

  return (
    <article
      aria-label={`${task.priority} task: ${task.title}`}
      className={cn(
        'group rounded-xl border p-4 transition-colors',
        task.done
          ? 'border-border bg-surface-inset/50'
          : PRIORITY_CARD_CLASSES[task.priority]
      )}
    >
      {/* Top Row: Priority Completion Ring + Title + Priority Selector + Focus Pin */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Mark "${task.title}" undone` : `Complete "${task.title}"`}
          onClick={() => onToggleTask(task.id)}
          className={cn(
            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            task.done
              ? PRIORITY_CHECKED_CLASSES[task.priority]
              : PRIORITY_CHECKBOX_CLASSES[task.priority]
          )}
        >
          <Check
            className={cn('h-3 w-3 transition-opacity', task.done ? 'opacity-100' : 'opacity-0 group-hover:opacity-45')}
            strokeWidth={3}
            aria-hidden="true"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                'min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground',
                task.done && 'text-foreground-muted line-through'
              )}
            >
              {task.title}
            </h3>

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Clickable P1–P4 Priority Pill (cycles P1 -> P2 -> P3 -> P4) */}
              <button
                type="button"
                onClick={handleCyclePriority}
                title={`Priority ${task.priority} (${PRIORITY_LABELS[task.priority]}) — click to cycle`}
                aria-label={`Priority ${task.priority}, click to cycle`}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold leading-4 transition-opacity hover:opacity-85',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  PRIORITY_BADGE_CLASSES[task.priority]
                )}
              >
                <Flag className="h-2.5 w-2.5" aria-hidden="true" />
                {task.priority}
              </button>

              {/* Today Focus Pin Toggle */}
              <button
                type="button"
                aria-pressed={task.inTodayFocus}
                onClick={() => onToggleTodayFocus(task.id)}
                title={task.inTodayFocus ? 'Pinned to Today Focus' : 'Pin to Today Focus'}
                aria-label={task.inTodayFocus ? 'Remove from Today Focus' : 'Pin to Today Focus'}
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  task.inTodayFocus
                    ? 'border-primary-tint-border bg-primary-tint text-primary'
                    : 'border-transparent text-foreground-subtle hover:border-border hover:bg-surface-inset hover:text-foreground'
                )}
              >
                <Star
                  className={cn('h-3.5 w-3.5', task.inTodayFocus && 'fill-current')}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {task.notes && (
            <p className="mt-1 line-clamp-2 max-w-[68ch] text-xs leading-relaxed text-foreground-muted">
              {task.notes}
            </p>
          )}

          {/* Metadata, Tags & Action Row */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {dueChip && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums',
                    dueChip.tone === 'danger'
                      ? 'border-destructive-border bg-destructive-tint text-on-destructive-tint'
                      : dueChip.tone === 'primary'
                        ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-inset text-foreground-muted'
                  )}
                >
                  <Calendar className="h-2.5 w-2.5" aria-hidden="true" />
                  {dueChip.label}
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-inset/70 px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums text-foreground-muted">
                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                {formatDurationCompact(task.estimatedMinutes)}
                {supportsPomodoro && ` · ${task.pomodorosPlanned}×25m`}
              </span>

              {task.scheduledSlotLabel && (
                <Link
                  href="/timetable"
                  className="inline-flex items-center gap-1 rounded-md border border-success-border bg-success-tint px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-on-success-tint transition-opacity hover:opacity-85"
                >
                  {task.scheduledSlotLabel}
                </Link>
              )}

              {task.tags.map((tag) => {
                const isActive = activeTags.some((t) => t.toLowerCase() === tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleTagFilter(tag)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-primary bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-inset/60 text-foreground-muted hover:border-border-hover hover:text-foreground'
                    )}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-expanded={subtasksExpanded}
                onClick={() => setSubtasksExpanded((prev) => !prev)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-card px-1.5 sm:px-2 text-[11px] font-semibold text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {subtasksExpanded ? (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                )}
                <span>Subtasks</span>
                {progress.total > 0 && (
                  <span className="font-mono text-[10px] tabular-nums text-foreground">
                    {progress.completed}/{progress.total}
                  </span>
                )}
              </button>

              {!task.done && (
                <button
                  type="button"
                  onClick={() => onScheduleTask(task)}
                  title="Schedule onto Smart Timetable"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-card px-1.5 sm:px-2 text-[11px] font-semibold text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CalendarPlus className="h-3 w-3" aria-hidden="true" />
                  <span>Schedule</span>
                </button>
              )}

              {!task.done && supportsPomodoro && (
                <Link
                  href={buildPomodoroHandoffUrl({
                    title: task.title,
                    pomodoros: task.pomodorosPlanned,
                  })}
                  title="Launch in Pomodoro timer"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-tint-border bg-primary-tint px-1.5 sm:px-2 text-[11px] font-semibold text-on-primary-tint transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Play className="h-3 w-3" aria-hidden="true" />
                  <span>Focus</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                aria-label={`Delete "${task.title}"`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground-subtle transition-colors hover:bg-destructive-tint hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Inline Subtasks Checklist (flat divider region inside the task card, zero nested cards) */}
          {subtasksExpanded && (
            <div className="mt-3 border-t border-border-subtle pt-2.5">
              {progress.total > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-inset">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-semibold tabular-nums text-foreground-muted">
                    {progress.completed}/{progress.total} ({progress.percent}%)
                  </span>
                </div>
              )}

              {task.subtasks.length > 0 && (
                <ul className="space-y-1">
                  {task.subtasks.map((sub) => (
                    <li
                      key={sub.id}
                      className="group/sub flex items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-surface-inset/70"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={sub.done}
                        aria-label={sub.done ? `Mark subtask "${sub.title}" undone` : `Complete subtask "${sub.title}"`}
                        onClick={() => onToggleSubtask(task.id, sub.id)}
                        className={cn(
                          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          sub.done
                            ? 'border-success bg-success text-on-success'
                            : 'border-border-hover bg-surface-card text-transparent hover:border-primary'
                        )}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                      </button>

                      <span
                        onClick={() => onToggleSubtask(task.id, sub.id)}
                        className={cn(
                          'min-w-0 flex-1 cursor-pointer select-none leading-snug',
                          sub.done ? 'text-foreground-muted line-through' : 'text-foreground'
                        )}
                      >
                        {sub.title}
                      </span>

                      <button
                        type="button"
                        onClick={() => onDeleteSubtask(task.id, sub.id)}
                        aria-label={`Remove subtask "${sub.title}"`}
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground-muted opacity-100 transition-opacity hover:bg-destructive-tint hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:opacity-0 sm:group-hover/sub:opacity-100 sm:group-focus-within/sub:opacity-100"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Inline Add Subtask Row */}
              <form onSubmit={handleAddSubtaskSubmit} className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Add subtask step..."
                  aria-label={`Add subtask to "${task.title}"`}
                  className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface-inset/50 px-2.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:bg-surface-card focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  aria-label="Add subtask"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface-card px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  <span>Step</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
