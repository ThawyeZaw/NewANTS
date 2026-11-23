'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarPlus,
  Check,
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
  className?: string;
  style?: React.CSSProperties;
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
  className,
  style,
}: TaskCardViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const progress = getSubtaskProgress(task);
  const dueChip = formatDueDateChip(task.dueDate, todayIso);
  const supportsPomodoro =
    typeof task.pomodorosPlanned === 'number' && task.pomodorosPlanned > 0;

  const handleAddSubtaskSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    onAddSubtask(task.id, trimmed);
    setNewSubtaskTitle('');
  };

  const handleCyclePriority = () => {
    const idx = TASK_PRIORITIES.indexOf(task.priority);
    const next = TASK_PRIORITIES[(idx + 1) % TASK_PRIORITIES.length] ?? 'P1';
    onChangePriority(task.id, next);
  };

  return (
    <article
      aria-label={`${task.priority} task: ${task.title}`}
      style={style}
      className={cn(
        'group transition-colors',
        task.done ? 'bg-surface-inset/35' : 'hover:bg-surface-inset/45',
        className
      )}
    >
      {/* Compact TickTick Single-Line Row */}
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.done}
          aria-label={task.done ? `Mark "${task.title}" undone` : `Complete "${task.title}"`}
          onClick={() => onToggleTask(task.id)}
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            task.done
              ? PRIORITY_CHECKED_CLASSES[task.priority]
              : PRIORITY_CHECKBOX_CLASSES[task.priority]
          )}
        >
          <Check
            className={cn(
              'h-3 w-3 transition-opacity',
              task.done ? 'opacity-100' : 'opacity-0 group-hover:opacity-45'
            )}
            strokeWidth={3}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-none"
        >
          <span
            className={cn(
              'min-w-0 truncate text-sm font-medium',
              task.done ? 'text-foreground-muted line-through' : 'text-foreground'
            )}
          >
            {task.title}
          </span>
          {progress.total > 0 && (
            <span className="shrink-0 font-mono text-[10px] font-medium tabular-nums text-foreground-subtle">
              {progress.completed}/{progress.total}
            </span>
          )}
        </button>

        {/* Quiet Schedule / Due Indicator + Hover Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {task.scheduledSlotLabel ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-foreground-muted">
              <Calendar className="h-3 w-3 text-success" aria-hidden="true" />
              <span className="hidden sm:inline">{task.scheduledSlotLabel}</span>
              <span className="sm:hidden">
                {task.scheduledSlotLabel.split('·')[1]?.trim() ?? task.scheduledSlotLabel}
              </span>
            </span>
          ) : (
            dueChip && (
              <span
                className={cn(
                  'font-mono text-[11px] font-medium tabular-nums',
                  dueChip.tone === 'danger'
                    ? 'text-destructive'
                    : dueChip.tone === 'primary'
                      ? 'text-primary'
                      : 'text-foreground-muted'
                )}
              >
                {dueChip.label}
              </span>
            )
          )}

          <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {!task.done && supportsPomodoro && (
              <Link
                href={buildPomodoroHandoffUrl({
                  title: task.title,
                  pomodoros: task.pomodorosPlanned,
                })}
                title="Start in Pomodoro"
                aria-label={`Start Pomodoro for "${task.title}"`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
            {!task.done && (
              <button
                type="button"
                onClick={() => onScheduleTask(task)}
                title={task.linkedBlockId ? 'Edit timetable slot' : 'Schedule on Timetable'}
                aria-label={`Schedule "${task.title}" on Timetable`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDeleteTask(task.id)}
              title="Delete task"
              aria-label={`Delete "${task.title}"`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-subtle transition-colors hover:bg-destructive-tint hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Inline Expanded Details (Notes, Priority, Tags, Schedule, Subtasks) */}
      {expanded && (
        <div className="space-y-2.5 border-t border-border-subtle/80 bg-surface-inset/25 px-3.5 pb-3 pt-2.5 pl-11">
          {task.notes && (
            <p className="max-w-[68ch] text-xs leading-relaxed text-foreground-muted">
              {task.notes}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleCyclePriority}
              title={`Priority ${task.priority} (${PRIORITY_LABELS[task.priority]}) — click to cycle`}
              aria-label={`Priority ${task.priority}, click to cycle`}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold transition-opacity hover:opacity-85',
                PRIORITY_BADGE_CLASSES[task.priority]
              )}
            >
              <Flag className="h-2.5 w-2.5" aria-hidden="true" />
              {task.priority}
            </button>

            <button
              type="button"
              aria-pressed={task.inTodayFocus}
              onClick={() => onToggleTodayFocus(task.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                task.inTodayFocus
                  ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                  : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
              )}
            >
              <Star
                className={cn('h-2.5 w-2.5', task.inTodayFocus && 'fill-current')}
                aria-hidden="true"
              />
              Today
            </button>

            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-surface-card px-2 py-0.5 font-mono text-[11px] tabular-nums text-foreground-muted">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              {formatDurationCompact(task.estimatedMinutes)}
              {supportsPomodoro && ` · ${task.pomodorosPlanned}×25m`}
            </span>

            {task.tags.map((tag) => {
              const isActive = activeTags.some(
                (t) => t.toLowerCase() === tag.toLowerCase()
              );
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onToggleTagFilter(tag)}
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                    isActive
                      ? 'border-primary bg-primary-tint font-semibold text-on-primary-tint'
                      : 'border-border/60 bg-surface-card text-foreground-muted hover:text-foreground'
                  )}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          {/* Subtasks List + Inline Add */}
          <div className="space-y-1.5 pt-0.5">
            {task.subtasks.length > 0 && (
              <ul className="space-y-1">
                {task.subtasks.map((sub) => (
                  <li
                    key={sub.id}
                    className="group/sub flex items-center gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-surface-inset/60"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={sub.done}
                      aria-label={
                        sub.done
                          ? `Mark subtask "${sub.title}" undone`
                          : `Complete subtask "${sub.title}"`
                      }
                      onClick={() => onToggleSubtask(task.id, sub.id)}
                      className={cn(
                        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
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
                        'min-w-0 flex-1 cursor-pointer select-none',
                        sub.done ? 'text-foreground-muted line-through' : 'text-foreground'
                      )}
                    >
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteSubtask(task.id, sub.id)}
                      aria-label={`Remove subtask "${sub.title}"`}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-foreground-muted opacity-100 transition-opacity hover:bg-destructive-tint hover:text-destructive sm:opacity-0 sm:group-hover/sub:opacity-100"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddSubtaskSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                maxLength={120}
                placeholder="Add step..."
                aria-label={`Add subtask to "${task.title}"`}
                className="h-7 min-w-0 flex-1 rounded-md border border-border bg-surface-card px-2.5 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                aria-label="Add subtask"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-card px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-surface-inset disabled:opacity-40"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                Step
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
