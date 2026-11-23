'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check, Clock, Lock, Moon, Play, Plus } from 'lucide-react';
import { Button, cn } from '@ants/ui';
import {
  buildPomodoroHandoffUrl,
  categorySupportsPomodoro,
  computeDayAllocations,
  filterVisibleTimelineBlocks,
  formatDurationCompact,
  formatFullDateLabel,
  formatMinutes12h,
  formatMinutes24h,
  getBlocksForDate,
  getCategoryLabel,
  getTelegramTriggerMinutes,
  layoutOverlappingBlocks,
  snapMinutes,
  summarizeOvernightSleep,
  type TimetableBlock,
} from '../../../lib/timetable/engine';
import {
  CATEGORY_BLOCK_CLASSES,
  CATEGORY_PILL_CLASSES,
  PRIORITY_BADGE_CLASSES,
} from './timetableStyles';

export interface TimetableDayViewProps {
  date: string;
  todayIso: string;
  blocks: TimetableBlock[];
  showOvernightHours?: boolean;
  nowMinutes?: number;
  hourHeight?: number;
  onQuickAddSlot: (date: string, startMinutes: number, endMinutes?: number) => void;
  onEditBlock: (block: TimetableBlock) => void;
  onToggleBlockComplete: (blockId: string) => void;
  onOpenReminder: (block: TimetableBlock) => void;
  onToggleOvernight?: () => void;
  onMoveBlock?: (blockId: string, nextDate: string, nextStartMinutes: number) => void;
  onResizeBlock?: (blockId: string, nextEndMinutes: number) => void;
  onWheelZoom?: (deltaPx: number) => void;
}

type DayDragSession =
  | {
      mode: 'move' | 'resize';
      block: TimetableBlock;
      startClientY: number;
      activated: boolean;
      previewStart: number;
      previewEnd: number;
    }
  | {
      mode: 'create';
      anchorMinutes: number;
      startClientY: number;
      activated: boolean;
      previewStart: number;
      previewEnd: number;
    };

export function TimetableDayView({
  date,
  todayIso,
  blocks,
  showOvernightHours = false,
  nowMinutes = 14 * 60 + 23,
  hourHeight = 72,
  onQuickAddSlot,
  onEditBlock,
  onToggleBlockComplete,
  onOpenReminder,
  onToggleOvernight,
  onMoveBlock,
  onResizeBlock,
  onWheelZoom,
}: TimetableDayViewProps) {
  const HOUR_HEIGHT = hourHeight;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DayDragSession | null>(null);
  const dragRef = useRef<DayDragSession | null>(null);
  const lastPointerUpRef = useRef(0);

  const visibleStartHour = showOvernightHours ? 0 : 6;
  const visibleEndHour = 24;
  const hours = useMemo(
    () =>
      Array.from(
        { length: visibleEndHour - visibleStartHour },
        (_, i) => visibleStartHour + i
      ),
    [visibleStartHour, visibleEndHour]
  );
  const totalHeight = hours.length * HOUR_HEIGHT;

  const dayBlocks = useMemo(() => getBlocksForDate(blocks, date), [blocks, date]);
  const allocations = useMemo(() => computeDayAllocations(dayBlocks), [dayBlocks]);
  const visibleBlocks = useMemo(
    () => filterVisibleTimelineBlocks(dayBlocks, showOvernightHours),
    [dayBlocks, showOvernightHours]
  );
  const positioned = useMemo(
    () => layoutOverlappingBlocks(visibleBlocks, visibleStartHour * 60, 1440),
    [visibleBlocks, visibleStartHour]
  );
  const sleepSummary = useMemo(() => summarizeOvernightSleep(dayBlocks), [dayBlocks]);

  const scheduledMinutes = useMemo(
    () =>
      dayBlocks.reduce(
        (sum, b) => sum + Math.max(0, b.endMinutes - b.startMinutes),
        0
      ),
    [dayBlocks]
  );
  const openMinutes = Math.max(0, 1440 - scheduledMinutes);

  // Ctrl/Cmd + Scroll vertical zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !onWheelZoom) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      onWheelZoom(event.deltaY < 0 ? 8 : -8);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onWheelZoom]);

  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const dy = event.clientY - current.startClientY;
      const threshold = current.mode === 'create' ? 6 : 5;
      const activated = current.activated || Math.abs(dy) >= threshold;
      if (!activated) return;

      const deltaMinutes = snapMinutes((dy / HOUR_HEIGHT) * 60 + 720, 15) - 720;

      if (current.mode === 'move') {
        const duration = Math.max(
          15,
          current.block.endMinutes - current.block.startMinutes
        );
        const nextStart = Math.max(
          visibleStartHour * 60,
          Math.min(1440 - duration, current.block.startMinutes + deltaMinutes)
        );
        const next: DayDragSession = {
          ...current,
          activated: true,
          previewStart: nextStart,
          previewEnd: nextStart + duration,
        };
        dragRef.current = next;
        setDrag(next);
      } else if (current.mode === 'resize') {
        const nextEnd = Math.max(
          current.block.startMinutes + 15,
          Math.min(1440, current.block.endMinutes + deltaMinutes)
        );
        const next: DayDragSession = {
          ...current,
          activated: true,
          previewEnd: nextEnd,
        };
        dragRef.current = next;
        setDrag(next);
      } else if (current.mode === 'create') {
        const targetMin = Math.max(
          visibleStartHour * 60,
          Math.min(1440, current.anchorMinutes + deltaMinutes)
        );
        const nextStart =
          targetMin >= current.anchorMinutes ? current.anchorMinutes : targetMin;
        const nextEnd = Math.min(
          1440,
          Math.max(
            nextStart + 15,
            targetMin >= current.anchorMinutes ? targetMin : current.anchorMinutes
          )
        );
        const next: DayDragSession = {
          ...current,
          activated: true,
          previewStart: nextStart,
          previewEnd: nextEnd,
        };
        dragRef.current = next;
        setDrag(next);
      }
    };

    const handleUp = () => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!current) return;
      lastPointerUpRef.current = Date.now();

      if (current.mode === 'create') {
        if (!current.activated) {
          onQuickAddSlot(date, Math.min(1410, current.anchorMinutes));
        } else {
          onQuickAddSlot(date, current.previewStart, current.previewEnd);
        }
        return;
      }

      if (!current.activated) {
        onEditBlock(current.block);
        return;
      }
      if (current.mode === 'move') {
        onMoveBlock?.(current.block.id, date, current.previewStart);
      } else {
        onResizeBlock?.(current.block.id, current.previewEnd);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [
    drag !== null,
    HOUR_HEIGHT,
    visibleStartHour,
    date,
    onEditBlock,
    onMoveBlock,
    onQuickAddSlot,
    onResizeBlock,
  ]);

  const startBlockDrag = (
    event: React.PointerEvent,
    mode: 'move' | 'resize',
    block: TimetableBlock
  ) => {
    if (event.button !== 0) return;
    if (mode === 'move' && !onMoveBlock) return;
    if (mode === 'resize' && !onResizeBlock) return;
    event.stopPropagation();
    const session: DayDragSession = {
      mode,
      block,
      startClientY: event.clientY,
      activated: false,
      previewStart: block.startMinutes,
      previewEnd: block.endMinutes,
    };
    dragRef.current = session;
    setDrag(session);
  };

  const startCreateDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const rawMin = visibleStartHour * 60 + (offsetY / HOUR_HEIGHT) * 60;
    const anchor = Math.min(
      1425,
      Math.max(visibleStartHour * 60, snapMinutes(rawMin, 15))
    );
    const session: DayDragSession = {
      mode: 'create',
      anchorMinutes: anchor,
      startClientY: event.clientY,
      activated: false,
      previewStart: anchor,
      previewEnd: Math.min(1440, anchor + 30),
    };
    dragRef.current = session;
    setDrag(session);
  };

  const toTopPx = (minutes: number) =>
    ((minutes - visibleStartHour * 60) / 60) * HOUR_HEIGHT;

  const isToday = date === todayIso;

  return (
    <div className="overflow-clip rounded-xl border border-border bg-surface-card">
      {/* Minimal Day Overview Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-inset/50 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold text-foreground">
            {formatFullDateLabel(date)}
            {isToday ? ' · Today' : ''}
          </h2>
          <span className="rounded-full border border-border bg-surface-card px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-foreground-muted">
            {dayBlocks.length} blocks · {formatDurationCompact(allocations.focusMinutes)} focus ·{' '}
            {openMinutes > 0
              ? `${formatDurationCompact(openMinutes)} open`
              : `${formatDurationCompact(allocations.sleepMinutes)} rest`}
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

      {/* Grouped overnight sleep strip */}
      {!showOvernightHours && (
        <div className="grid grid-cols-[64px_1fr] items-center border-b border-border bg-surface-inset/45 text-xs text-foreground-muted">
          <span className="border-r border-border py-2 text-center font-mono text-[11px] tabular-nums text-foreground-subtle">
            00–06
          </span>
          <div className="flex items-center justify-between gap-2 px-3 py-1.5">
            <span className="inline-flex items-center gap-2 font-medium text-foreground-muted">
              <Moon className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />
              <span>Overnight sleep grouped · {sleepSummary}</span>
            </span>
            {onToggleOvernight && (
              <button
                type="button"
                onClick={onToggleOvernight}
                className="rounded px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-tint"
              >
                Expand 00–06h
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full-width Proportional Day Timeline */}
      <div ref={scrollRef}>
        <div
          className="grid grid-cols-[64px_1fr]"
          style={{ height: `${totalHeight}px` }}
        >
          {/* Left Hourly Mono Ruler */}
          <div className="relative select-none border-r border-border bg-surface-inset/25">
            {hours.map((h) => (
              <div
                key={h}
                className="relative border-b border-border-subtle pr-2.5 text-right"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <span
                  className={cn(
                    'relative font-mono text-[11px] font-medium tabular-nums text-foreground-subtle',
                    h === visibleStartHour ? 'top-0.5' : '-top-2'
                  )}
                >
                  {`${String(h).padStart(2, '0')}:00`}
                </span>
              </div>
            ))}

            {isToday &&
              nowMinutes >= visibleStartHour * 60 &&
              nowMinutes <= 1440 && (
                <div
                  aria-hidden="true"
                  style={{ top: `${toTopPx(nowMinutes)}px` }}
                  className="pointer-events-none absolute right-1.5 z-20 -translate-y-1/2 rounded bg-primary px-1 py-0.5 font-mono text-[10px] font-bold leading-none tabular-nums text-on-primary"
                >
                  {formatMinutes24h(nowMinutes)}
                </div>
              )}
          </div>

          {/* Interactive Day Column */}
          <div
            className="relative"
            style={{ height: `${totalHeight}px` }}
            onPointerDown={startCreateDrag}
            onClick={(event) => {
              if (dragRef.current?.activated) return;
              if (Date.now() - lastPointerUpRef.current < 250) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const offsetY = event.clientY - rect.top;
              const rawMin = visibleStartHour * 60 + (offsetY / HOUR_HEIGHT) * 60;
              const snapped = Math.min(
                1410,
                Math.max(visibleStartHour * 60, snapMinutes(rawMin, 15))
              );
              onQuickAddSlot(date, snapped);
            }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="group relative border-b border-border-subtle"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {HOUR_HEIGHT >= 44 && (
                  <div className="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded border border-dashed border-border-hover/70 py-0.5 text-[11px] font-medium text-foreground-subtle group-hover:flex">
                    <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                    Click or drag to schedule
                  </div>
                )}
              </div>
            ))}

            {/* Current Time Line */}
            {isToday &&
              nowMinutes >= visibleStartHour * 60 &&
              nowMinutes <= 1440 && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                  style={{ top: `${toTopPx(nowMinutes)}px` }}
                >
                  <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="h-[1.5px] flex-1 bg-primary" />
                </div>
              )}

            {/* Empty Day Guidance Overlay (non-blocking) */}
            {dayBlocks.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
                <div className="pointer-events-auto flex max-w-sm flex-col items-center rounded-xl border border-border bg-surface-card/95 px-6 py-6 text-center shadow-[var(--shadow-tier-2)] backdrop-blur-sm">
                  <Clock className="h-7 w-7 text-foreground-subtle" aria-hidden="true" />
                  <p className="mt-2.5 text-sm font-semibold text-foreground">
                    No time blocks scheduled yet
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    Click or drag anywhere on the timeline, or add your first focus block below.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3.5"
                    leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAddSlot(date, 6 * 60 + 15);
                    }}
                  >
                    Schedule first block
                  </Button>
                </div>
              </div>
            )}

            {/* Side-by-Side Scheduled Blocks */}
            {positioned.map(
              ({ block, displayStart: baseStart, displayEnd: baseEnd, colIndex, colCount }) => {
                const isBeingMoved =
                  drag?.activated &&
                  drag.mode === 'move' &&
                  drag.block.id === block.id;
                const isBeingResized =
                  drag?.activated &&
                  drag.mode === 'resize' &&
                  drag.block.id === block.id;

                const displayStart = baseStart;
                const displayEnd = isBeingResized
                  ? Math.max(displayStart + 15, drag.previewEnd)
                  : baseEnd;
                const top = toTopPx(displayStart);
                const height = Math.max(18, toTopPx(displayEnd) - top);
                const ultraCompact = height < 24;
                const compact = height < 42;
                const isSleep = block.category === 'sleep';
                const isBuffer = block.category === 'buffer';
                const canPomodoro = categorySupportsPomodoro(block.category);
                const duration = displayEnd - displayStart;
                const tgTime = getTelegramTriggerMinutes(block);

                return (
                  <div
                    key={`${block.id}-${date}`}
                    role="button"
                    tabIndex={0}
                    title={`${block.title} · ${formatMinutes12h(displayStart)}–${formatMinutes12h(displayEnd)}`}
                    aria-label={`${block.title}, ${formatMinutes12h(block.startMinutes)} to ${formatMinutes12h(block.endMinutes)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!onMoveBlock) {
                        onEditBlock(block);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onEditBlock(block);
                      }
                    }}
                    onPointerDown={(e) => startBlockDrag(e, 'move', block)}
                    style={{
                      top: `${top + 1}px`,
                      height: `${height - 2}px`,
                      left: `calc(${(colIndex / colCount) * 100}% + 8px)`,
                      width: `calc(${100 / colCount}% - 16px)`,
                    }}
                    className={cn(
                      'group/blk absolute z-10 flex select-none items-start justify-between gap-2 overflow-hidden rounded-lg border text-left transition-colors',
                      ultraCompact
                        ? 'items-center px-2.5 py-0'
                        : compact
                          ? 'items-center px-3 py-1'
                          : 'px-3.5 py-2',
                      onMoveBlock
                        ? 'cursor-grab active:cursor-grabbing'
                        : 'cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      CATEGORY_BLOCK_CLASSES[block.category],
                      isBeingMoved && 'opacity-35',
                      block.completed && 'opacity-60'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      {!isSleep && !isBuffer && !ultraCompact && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleBlockComplete(block.id);
                          }}
                          aria-label={
                            block.completed
                              ? `Mark "${block.title}" incomplete`
                              : `Mark "${block.title}" complete`
                          }
                          className={cn(
                            'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            block.completed
                              ? 'border-success bg-success text-on-success'
                              : 'border-border-hover bg-surface-card text-transparent hover:border-primary hover:text-primary'
                          )}
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                        </button>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              'truncate font-semibold leading-tight',
                              ultraCompact ? 'text-[11px]' : 'text-xs sm:text-sm',
                              block.completed && 'line-through'
                            )}
                          >
                            {block.title}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums opacity-85">
                            {formatMinutes12h(displayStart)}–{formatMinutes12h(displayEnd)}
                          </span>
                          {!compact && (
                            <>
                              <span className="hidden font-mono text-[10px] tabular-nums opacity-70 sm:inline">
                                ({formatDurationCompact(duration)})
                              </span>
                              <span
                                className={cn(
                                  'rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none',
                                  CATEGORY_PILL_CLASSES[block.category]
                                )}
                              >
                                {getCategoryLabel(block.category)}
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
                              {block.locked && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium opacity-70">
                                  <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                                  Fixed
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {height >= 72 && (block.notes || block.telegramReminder.enabled) && (
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 truncate text-xs opacity-80">
                            {block.notes && <span className="truncate">{block.notes}</span>}
                            {block.telegramReminder.enabled && (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums text-primary">
                                <Bell className="h-3 w-3" aria-hidden="true" />
                                Telegram ping {formatMinutes12h(tgTime)}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {!ultraCompact && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenReminder(block);
                          }}
                          aria-label={`Configure Telegram reminder for ${block.title}`}
                          title={
                            block.telegramReminder.enabled
                              ? `Telegram reminder at ${formatMinutes12h(tgTime)}`
                              : 'Enable Telegram reminder'
                          }
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Launch Pomodoro for ${block.title}`}
                            title="Start in Pomodoro Studio"
                            className="inline-flex h-6 items-center gap-1 rounded-md border border-primary-tint-border bg-background/80 px-2 text-[11px] font-semibold text-on-primary-tint transition-colors hover:border-primary hover:bg-primary-tint"
                          >
                            <Play className="h-3 w-3" aria-hidden="true" />
                            <span className="hidden sm:inline">Focus</span>
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Bottom Resize Handle */}
                    {onResizeBlock && (
                      <div
                        aria-hidden="true"
                        onPointerDown={(e) => startBlockDrag(e, 'resize', block)}
                        className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 transition-opacity hover:bg-primary/40 group-hover/blk:opacity-100"
                      />
                    )}
                  </div>
                );
              }
            )}

            {/* Move Drag Ghost Preview */}
            {drag?.activated && drag.mode === 'move' && (
              <div
                aria-hidden="true"
                style={{
                  top: `${toTopPx(drag.previewStart) + 1}px`,
                  height: `${Math.max(18, toTopPx(drag.previewEnd) - toTopPx(drag.previewStart)) - 2}px`,
                }}
                className="pointer-events-none absolute inset-x-2 z-30 flex items-center justify-between rounded-lg border border-primary bg-primary-tint/90 px-3 py-1 text-on-primary-tint shadow-[var(--shadow-tier-2)]"
              >
                <span className="truncate text-xs font-bold">{drag.block.title}</span>
                <span className="font-mono text-[11px] tabular-nums">
                  {formatMinutes12h(drag.previewStart)}–{formatMinutes12h(drag.previewEnd)} (
                  {formatDurationCompact(drag.previewEnd - drag.previewStart)})
                </span>
              </div>
            )}

            {/* Drag-to-Create Preview */}
            {drag?.activated && drag.mode === 'create' && (
              <div
                aria-hidden="true"
                style={{
                  top: `${toTopPx(drag.previewStart) + 1}px`,
                  height: `${Math.max(18, toTopPx(drag.previewEnd) - toTopPx(drag.previewStart)) - 2}px`,
                }}
                className="pointer-events-none absolute inset-x-2 z-30 flex items-center justify-between rounded-lg border-2 border-dashed border-primary bg-primary-tint/85 px-3 py-1 text-on-primary-tint shadow-[var(--shadow-tier-2)]"
              >
                <span className="truncate text-xs font-bold">New time block</span>
                <span className="font-mono text-[11px] font-semibold tabular-nums">
                  {formatMinutes12h(drag.previewStart)}–{formatMinutes12h(drag.previewEnd)} (
                  {formatDurationCompact(drag.previewEnd - drag.previewStart)})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
