'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Lock, Moon, Play, Plus } from 'lucide-react';
import { cn } from '@ants/ui';
import {
  buildPomodoroHandoffUrl,
  categorySupportsPomodoro,
  formatDayNumber,
  formatDurationCompact,
  formatMinutes24h,
  formatShortWeekday,
  getBlocksForDate,
  snapMinutes,
  type TimetableBlock,
} from '../../../lib/timetable/engine';
import { CATEGORY_BLOCK_CLASSES, PRIORITY_BADGE_CLASSES } from './timetableStyles';

export interface TimetableWeekGridViewProps {
  weekDates: string[];
  todayIso: string;
  selectedDate: string;
  blocks: TimetableBlock[];
  showOvernightHours?: boolean;
  nowMinutes?: number;
  onSelectDate: (iso: string) => void;
  onQuickAddSlot: (date: string, startMinutes: number) => void;
  onEditBlock: (block: TimetableBlock) => void;
  onOpenReminder: (block: TimetableBlock) => void;
  onMoveBlock: (blockId: string, nextDate: string, nextStartMinutes: number) => void;
  onResizeBlock: (blockId: string, nextEndMinutes: number) => void;
  onToggleOvernight?: () => void;
  onSwitchToDay?: () => void;
}

const HOUR_HEIGHT = 72;

interface DragSession {
  mode: 'move' | 'resize';
  block: TimetableBlock;
  sourceDate: string;
  startClientX: number;
  startClientY: number;
  activated: boolean;
  previewDate: string;
  previewStart: number;
  previewEnd: number;
}

export function TimetableWeekGridView({
  weekDates,
  todayIso,
  selectedDate,
  blocks,
  showOvernightHours = false,
  nowMinutes = 14 * 60 + 23,
  onSelectDate,
  onQuickAddSlot,
  onEditBlock,
  onOpenReminder,
  onMoveBlock,
  onResizeBlock,
  onToggleOvernight,
  onSwitchToDay,
}: TimetableWeekGridViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const columnsRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragSession | null>(null);
  const dragRef = useRef<DragSession | null>(null);

  const visibleStartHour = showOvernightHours ? 0 : 6;
  const visibleEndHour = 24;
  const hours = useMemo(
    () => Array.from({ length: visibleEndHour - visibleStartHour }, (_, i) => visibleStartHour + i),
    [visibleStartHour, visibleEndHour]
  );
  const totalHeight = hours.length * HOUR_HEIGHT;

  // Scroll 05:30 into view on initial mount when full 24h grid is active
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !showOvernightHours) return;
    el.scrollTop = 5.5 * HOUR_HEIGHT;
  }, [showOvernightHours]);

  useEffect(() => {
    if (!drag) return;

    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const dx = event.clientX - current.startClientX;
      const dy = event.clientY - current.startClientY;
      const activated = current.activated || Math.hypot(dx, dy) >= 5;
      if (!activated) return;

      const deltaMinutes = snapMinutes((dy / HOUR_HEIGHT) * 60 + 720, 15) - 720;
      if (current.mode === 'move') {
        const duration = Math.max(15, current.block.endMinutes - current.block.startMinutes);
        const nextStart = Math.max(
          visibleStartHour * 60,
          Math.min(1440 - duration, current.block.startMinutes + deltaMinutes)
        );
        let nextDate = current.previewDate;
        const colsEl = columnsRef.current;
        if (colsEl) {
          const rect = colsEl.getBoundingClientRect();
          const colW = rect.width / Math.max(1, weekDates.length);
          const colIdx = Math.max(
            0,
            Math.min(weekDates.length - 1, Math.floor((event.clientX - rect.left) / colW))
          );
          nextDate = weekDates[colIdx] ?? current.sourceDate;
        }
        const next: DragSession = {
          ...current,
          activated: true,
          previewDate: nextDate,
          previewStart: nextStart,
          previewEnd: nextStart + duration,
        };
        dragRef.current = next;
        setDrag(next);
      } else {
        const nextEnd = Math.max(
          current.block.startMinutes + 15,
          Math.min(1440, current.block.endMinutes + deltaMinutes)
        );
        const next: DragSession = {
          ...current,
          activated: true,
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
      if (!current.activated) {
        onEditBlock(current.block);
        return;
      }
      if (current.mode === 'move') {
        onMoveBlock(current.block.id, current.previewDate, current.previewStart);
      } else {
        onResizeBlock(current.block.id, current.previewEnd);
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
  }, [drag !== null, visibleStartHour, weekDates, onEditBlock, onMoveBlock, onResizeBlock]);

  const startDrag = (
    event: React.PointerEvent,
    mode: 'move' | 'resize',
    block: TimetableBlock,
    sourceDate: string
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const session: DragSession = {
      mode,
      block,
      sourceDate,
      startClientX: event.clientX,
      startClientY: event.clientY,
      activated: false,
      previewDate: sourceDate,
      previewStart: block.startMinutes,
      previewEnd: block.endMinutes,
    };
    dragRef.current = session;
    setDrag(session);
  };

  const toTopPx = (minutes: number) =>
    ((minutes - visibleStartHour * 60) / 60) * HOUR_HEIGHT;

  const blocksByDay = useMemo(
    () =>
      weekDates.map((iso) => ({
        iso,
        items: getBlocksForDate(blocks, iso),
      })),
    [weekDates, blocks]
  );

  const weekHasToday = weekDates.includes(todayIso);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      {/* Mobile swipe affordance so narrower viewports see Thu–Sun are scrollable or one tap away */}
      {(onSwitchToDay || !showOvernightHours) && (
        <div className="flex items-center justify-between border-b border-border bg-surface-inset/45 px-3 py-1.5 text-[11px] text-foreground-muted sm:hidden">
          <span>Swipe grid for Thu–Sun</span>
          {onSwitchToDay && (
            <button
              type="button"
              onClick={onSwitchToDay}
              className="font-semibold text-primary hover:underline"
            >
              Day timeline →
            </button>
          )}
        </div>
      )}

      {/* Horizontal wrapper keeps all 7 day columns crisp at 140px+ even on 390px screens */}
      <div className="overflow-x-auto">
        <div className="min-w-[1040px]">
          {/* Sticky Week Day Header */}
          <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-border bg-surface-inset/60">
            <div className="flex items-center justify-center border-r border-border px-1 py-2.5 font-mono text-[11px] font-semibold text-foreground-subtle">
              {showOvernightHours ? '24H' : '06–24'}
            </div>
            {weekDates.map((iso) => {
              const isToday = iso === todayIso;
              const isSelected = iso === selectedDate;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDate(iso)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 border-r border-border px-2 py-2.5 text-xs transition-colors last:border-r-0',
                    'hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isSelected && 'bg-surface-card'
                  )}
                >
                  <span
                    className={cn(
                      'font-semibold',
                      isToday ? 'text-primary' : 'text-foreground-muted'
                    )}
                  >
                    {formatShortWeekday(iso)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums',
                      isToday
                        ? 'bg-primary text-on-primary'
                        : isSelected
                          ? 'bg-primary-tint text-on-primary-tint'
                          : 'text-foreground'
                    )}
                  >
                    {formatDayNumber(iso)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grouped overnight sleep summary strip when 00:00–06:00 is collapsed */}
          {!showOvernightHours && (
            <div className="grid grid-cols-[60px_1fr] items-center border-b border-border bg-surface-inset/45 text-xs text-foreground-muted">
              <span className="border-r border-border py-2 text-center font-mono text-[11px] tabular-nums text-foreground-subtle">
                00–06
              </span>
              <div className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="inline-flex items-center gap-2 font-medium text-foreground-muted">
                  <Moon className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />
                  <span>Overnight sleep grouped · 10:30 PM – 6:00 AM (7h 30m rest)</span>
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

          {/* Vertical Day Grid (natural full-day height so evening blocks are never clipped) */}
          <div ref={scrollRef}>
            <div className="grid grid-cols-[60px_1fr]" style={{ height: `${totalHeight}px` }}>
              {/* Hourly Mono Ruler + inline live time pill */}
              <div className="relative border-r border-border bg-surface-inset/25 select-none">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="relative border-b border-border-subtle pr-2 text-right"
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

                {weekHasToday && nowMinutes >= visibleStartHour * 60 && nowMinutes <= 1440 && (
                  <div
                    aria-hidden="true"
                    style={{ top: `${toTopPx(nowMinutes)}px` }}
                    className="pointer-events-none absolute right-1 z-20 -translate-y-1/2 rounded bg-primary px-1 py-0.5 font-mono text-[10px] font-bold leading-none tabular-nums text-on-primary"
                  >
                    {formatMinutes24h(nowMinutes)}
                  </div>
                )}
              </div>

              {/* 7 Day Columns */}
              <div ref={columnsRef} className="relative grid grid-cols-7">
                {blocksByDay.map(({ iso, items }) => {
                  const isToday = iso === todayIso;
                  const isSelected = iso === selectedDate;
                  return (
                    <div
                      key={iso}
                      className={cn(
                        'relative border-r border-border last:border-r-0',
                        isSelected && 'bg-primary-tint/[0.08]'
                      )}
                      style={{ height: `${totalHeight}px` }}
                      onClick={(event) => {
                        if (dragRef.current?.activated) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        const offsetY = event.clientY - rect.top;
                        const rawMin = visibleStartHour * 60 + (offsetY / HOUR_HEIGHT) * 60;
                        const snapped = Math.min(1410, Math.max(visibleStartHour * 60, snapMinutes(rawMin, 15)));
                        onQuickAddSlot(iso, snapped);
                      }}
                    >
                      {/* Hour lines + subtle hover slot affordance */}
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="group relative border-b border-border-subtle"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        >
                          <div className="pointer-events-none absolute inset-x-1 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded border border-dashed border-border-hover/70 py-0.5 text-[10px] font-medium text-foreground-subtle group-hover:flex">
                            <Plus className="mr-0.5 h-2.5 w-2.5" aria-hidden="true" />
                            Add
                          </div>
                        </div>
                      ))}

                      {/* Current Time Indicator */}
                      {isToday && nowMinutes >= visibleStartHour * 60 && nowMinutes <= 1440 && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                          style={{ top: `${toTopPx(nowMinutes)}px` }}
                        >
                          <span className="-ml-1 h-2 w-2 rounded-full bg-primary" />
                          <span className="h-[1.5px] flex-1 bg-primary" />
                        </div>
                      )}

                      {/* Scheduled Blocks */}
                      {items.map((block) => {
                        const clampedStart = Math.max(visibleStartHour * 60, block.startMinutes);
                        const clampedEnd = Math.min(1440, block.endMinutes);
                        if (clampedEnd <= clampedStart) return null;

                        const isBeingMoved =
                          drag?.activated && drag.mode === 'move' && drag.block.id === block.id;
                        const isBeingResized =
                          drag?.activated && drag.mode === 'resize' && drag.block.id === block.id;

                        const displayStart = isBeingResized ? drag.previewStart : clampedStart;
                        const displayEnd = isBeingResized ? drag.previewEnd : clampedEnd;
                        const top = toTopPx(displayStart);
                        const height = Math.max(18, toTopPx(displayEnd) - top);
                        const compact = height < 34;
                        const veryShort = height < 24;
                        const canPomodoro = categorySupportsPomodoro(block.category);

                        return (
                          <div
                            key={`${block.id}-${iso}`}
                            role="button"
                            tabIndex={0}
                            aria-label={`${block.title}, ${formatMinutes24h(block.startMinutes)} to ${formatMinutes24h(block.endMinutes)}`}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onEditBlock(block);
                              }
                            }}
                            onPointerDown={(e) => startDrag(e, 'move', block, iso)}
                            style={{ top: `${top + 1}px`, height: `${height - 2}px` }}
                            className={cn(
                              'group/blk absolute inset-x-1 z-10 flex select-none flex-col overflow-hidden rounded-md border px-1.5 text-left transition-colors',
                              veryShort ? 'justify-center py-0' : 'justify-between py-1',
                              'cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              CATEGORY_BLOCK_CLASSES[block.category],
                              isBeingMoved && 'opacity-35',
                              block.completed && 'opacity-60'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-1.5">
                                <span
                                  className={cn(
                                    'min-w-0 truncate font-semibold leading-tight',
                                    veryShort ? 'text-[10px]' : 'text-[11px]',
                                    block.completed && 'line-through'
                                  )}
                                >
                                  {block.title}
                                </span>
                                <span className="flex shrink-0 items-center gap-0.5">
                                  {block.telegramReminder.enabled && veryShort && (
                                    <Bell className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                                  )}
                                  {block.locked && !veryShort && (
                                    <Lock className="h-2.5 w-2.5 opacity-60" aria-hidden="true" />
                                  )}
                                </span>
                              </div>

                              {!compact && (
                                <div className="mt-0.5 flex flex-nowrap items-center gap-1 overflow-hidden">
                                  <span className="truncate font-mono text-[10px] tabular-nums opacity-80">
                                    {formatMinutes24h(displayStart)}–{formatMinutes24h(displayEnd)}
                                  </span>
                                  {block.priority && (
                                    <span
                                      className={cn(
                                        'shrink-0 rounded border px-1 font-mono text-[9px] font-bold leading-3.5',
                                        PRIORITY_BADGE_CLASSES[block.priority]
                                      )}
                                    >
                                      {block.priority}
                                    </span>
                                  )}
                                </div>
                              )}

                              {height >= 100 && block.notes && (
                                <p className="mt-1.5 line-clamp-2 text-[10px] leading-snug opacity-75">
                                  {block.notes}
                                </p>
                              )}
                            </div>

                            {/* Actions (Telegram Bell + Pomodoro Play always visible on focus blocks) */}
                            {!veryShort && (
                              <div className="flex items-center justify-between gap-1">
                                {block.pomodorosPlanned && height >= 48 ? (
                                  <span className="truncate font-mono text-[10px] tabular-nums opacity-80">
                                    {block.pomodorosDone ? `${block.pomodorosDone}/${block.pomodorosPlanned}` : block.pomodorosPlanned}×25m
                                  </span>
                                ) : (
                                  <span />
                                )}
                                <div className="flex shrink-0 items-center gap-0.5">
                                  <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenReminder(block);
                                    }}
                                    aria-label={`Telegram reminder for ${block.title}`}
                                    title="Telegram reminder"
                                    className={cn(
                                      'items-center justify-center rounded transition-colors hover:bg-background/70',
                                      block.telegramReminder.enabled
                                        ? 'inline-flex h-5 w-5 text-primary opacity-90'
                                        : 'hidden h-5 w-5 sm:inline-flex sm:opacity-0 sm:group-hover/blk:opacity-100 sm:group-focus-within/blk:opacity-100'
                                    )}
                                  >
                                    <Bell className="h-3 w-3" aria-hidden="true" />
                                  </button>
                                  {canPomodoro && (
                                    <Link
                                      href={buildPomodoroHandoffUrl({
                                        title: block.title,
                                        pomodoros: block.pomodorosPlanned ?? 2,
                                      })}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`Start Pomodoro for ${block.title}`}
                                      title="Start in Pomodoro"
                                      className="inline-flex h-5 w-5 items-center justify-center rounded opacity-85 transition-colors hover:bg-background/70 hover:text-primary"
                                    >
                                      <Play className="h-3 w-3" aria-hidden="true" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Bottom Resize Handle */}
                            <div
                              aria-hidden="true"
                              onPointerDown={(e) => startDrag(e, 'resize', block, iso)}
                              className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 transition-opacity hover:bg-primary/40 group-hover/blk:opacity-100"
                            />
                          </div>
                        );
                      })}

                      {/* Drag Ghost Preview in Target Column */}
                      {drag?.activated && drag.mode === 'move' && drag.previewDate === iso && (
                        <div
                          aria-hidden="true"
                          style={{
                            top: `${toTopPx(drag.previewStart) + 1}px`,
                            height: `${Math.max(18, toTopPx(drag.previewEnd) - toTopPx(drag.previewStart)) - 2}px`,
                          }}
                          className="pointer-events-none absolute inset-x-1 z-30 flex flex-col justify-between rounded-md border border-primary bg-primary-tint/90 px-1.5 py-1 text-on-primary-tint shadow-[var(--shadow-tier-2)]"
                        >
                          <span className="truncate text-[11px] font-bold">{drag.block.title}</span>
                          <span className="font-mono text-[10px] tabular-nums">
                            {formatMinutes24h(drag.previewStart)}–{formatMinutes24h(drag.previewEnd)} (
                            {formatDurationCompact(drag.previewEnd - drag.previewStart)})
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
