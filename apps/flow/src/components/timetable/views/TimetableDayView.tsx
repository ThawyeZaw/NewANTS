'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check, Clock, Lock, Moon, Play, Plus } from 'lucide-react';
import { Button, cn } from '@ants/ui';
import {
  buildPomodoroHandoffUrl,
  categorySupportsPomodoro,
  formatDurationCompact,
  formatFullDateLabel,
  formatMinutes12h,
  formatMinutes24h,
  getBlocksForDate,
  getCategoryLabel,
  getTelegramTriggerMinutes,
  type TimetableBlock,
} from '../../../lib/timetable/engine';
import {
  CATEGORY_BLOCK_CLASSES,
  CATEGORY_DOT_CLASSES,
  PRIORITY_BADGE_CLASSES,
} from './timetableStyles';

export interface TimetableDayViewProps {
  date: string;
  todayIso: string;
  blocks: TimetableBlock[];
  onQuickAddSlot: (date: string, startMinutes: number) => void;
  onEditBlock: (block: TimetableBlock) => void;
  onToggleBlockComplete: (blockId: string) => void;
  onOpenReminder: (block: TimetableBlock) => void;
}

export function TimetableDayView({
  date,
  todayIso,
  blocks,
  onQuickAddSlot,
  onEditBlock,
  onToggleBlockComplete,
  onOpenReminder,
}: TimetableDayViewProps) {
  const dayBlocks = useMemo(() => getBlocksForDate(blocks, date), [blocks, date]);

  // Group contiguous overnight sleep summary when both 00:00–06:00 and evening sleep exist
  const sleepMinutes = dayBlocks
    .filter((b) => b.category === 'sleep')
    .reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-inset/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-foreground">
            {formatFullDateLabel(date)}
            {date === todayIso ? ' · Today' : ''}
          </h2>
          <span className="rounded-full border border-border bg-surface-card px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-foreground-muted">
            {dayBlocks.length} blocks · {formatDurationCompact(sleepMinutes)} sleep
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() => onQuickAddSlot(date, 9 * 60)}
        >
          Add time block
        </Button>
      </div>

      {dayBlocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <Clock className="h-8 w-8 text-foreground-subtle" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-foreground">No time blocks scheduled yet</p>
          <p className="mt-1 max-w-sm text-xs text-foreground-muted">
            Click below to block your focus sprints, buffers, or commitments for {formatFullDateLabel(date)}.
          </p>
          <Button
            size="sm"
            className="mt-4"
            leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => onQuickAddSlot(date, 6 * 60 + 15)}
          >
            Schedule first block
          </Button>
        </div>
      ) : (
        <ol className="divide-y divide-border-subtle">
          {dayBlocks.map((block) => {
            const duration = block.endMinutes - block.startMinutes;
            const isBuffer = block.category === 'buffer';
            const isSleep = block.category === 'sleep';
            const canPomodoro = categorySupportsPomodoro(block.category);
            const tgTime = getTelegramTriggerMinutes(block);

            return (
              <li
                key={`${block.id}-${date}`}
                className={cn(
                  'group flex flex-col gap-2.5 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:gap-4 sm:px-5',
                  isBuffer ? 'bg-surface-inset/40' : 'hover:bg-surface-inset/45'
                )}
              >
                {/* Monospace Timestamp Column */}
                <div className="flex shrink-0 items-center justify-between gap-2 sm:w-44 sm:justify-start">
                  <div className="font-mono text-xs font-semibold tabular-nums text-foreground">
                    <span>{formatMinutes12h(block.startMinutes)}</span>
                    <span className="mx-1 text-foreground-subtle">–</span>
                    <span className="text-foreground-muted">{formatMinutes12h(block.endMinutes)}</span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-foreground-subtle sm:hidden">
                    {formatDurationCompact(duration)}
                  </span>
                </div>

                {/* Main Block Card Content */}
                <div
                  className={cn(
                    'flex min-w-0 flex-1 items-start justify-between gap-3 rounded-lg border px-3 py-2 transition-colors',
                    CATEGORY_BLOCK_CLASSES[block.category],
                    block.completed && 'opacity-65'
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    {!isSleep && !isBuffer ? (
                      <button
                        type="button"
                        onClick={() => onToggleBlockComplete(block.id)}
                        aria-label={
                          block.completed
                            ? `Mark "${block.title}" incomplete`
                            : `Mark "${block.title}" complete`
                        }
                        className={cn(
                          'mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          block.completed
                            ? 'border-success bg-success text-on-success'
                            : 'border-border-hover bg-surface-card text-transparent hover:border-primary hover:text-primary'
                        )}
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                      </button>
                    ) : (
                      <span
                        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', CATEGORY_DOT_CLASSES[block.category])}
                        aria-hidden="true"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => onEditBlock(block)}
                      className="min-w-0 flex-1 text-left focus-visible:outline-none"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            'text-sm font-semibold text-foreground',
                            block.completed && 'line-through'
                          )}
                        >
                          {block.title}
                        </span>
                        {block.priority && (
                          <span
                            className={cn(
                              'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none',
                              PRIORITY_BADGE_CLASSES[block.priority]
                            )}
                          >
                            {block.priority}
                          </span>
                        )}
                        <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold text-foreground-muted">
                          {getCategoryLabel(block.category)}
                        </span>
                        {block.locked && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-foreground-subtle">
                            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                            Fixed
                          </span>
                        )}
                        {isSleep && (
                          <Moon className="h-3 w-3 text-foreground-subtle" aria-hidden="true" />
                        )}
                      </div>
                      {(block.notes || block.telegramReminder.enabled) && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
                          {block.notes && <span>{block.notes}</span>}
                          {block.telegramReminder.enabled && (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums text-primary">
                              <Bell className="h-3 w-3" aria-hidden="true" />
                              Telegram ping {formatMinutes12h(tgTime)}
                            </span>
                          )}
                        </p>
                      )}
                    </button>
                  </div>

                  {/* Right Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mr-1 hidden font-mono text-[11px] tabular-nums opacity-75 sm:inline">
                      {formatDurationCompact(duration)} ({formatMinutes24h(block.startMinutes)})
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenReminder(block)}
                      aria-label={`Configure Telegram reminder for ${block.title}`}
                      title={
                        block.telegramReminder.enabled
                          ? `Telegram reminder at ${formatMinutes12h(tgTime)}`
                          : 'Enable Telegram reminder'
                      }
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        block.telegramReminder.enabled
                          ? 'text-primary'
                          : 'text-foreground-subtle hover:text-foreground'
                      )}
                    >
                      {block.telegramReminder.enabled ? (
                        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                    {canPomodoro && (
                      <Link
                        href={buildPomodoroHandoffUrl({
                          title: block.title,
                          pomodoros: block.pomodorosPlanned ?? 2,
                        })}
                        aria-label={`Launch Pomodoro for ${block.title}`}
                        title="Start in Pomodoro Studio"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-primary-tint-border bg-background/80 px-2 text-[11px] font-semibold text-on-primary-tint transition-colors hover:border-primary hover:bg-primary-tint"
                      >
                        <Play className="h-3 w-3" aria-hidden="true" />
                        <span className="hidden md:inline">Focus</span>
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

