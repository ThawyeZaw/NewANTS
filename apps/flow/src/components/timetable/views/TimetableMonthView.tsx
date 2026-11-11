'use client';

import React, { useMemo } from 'react';
import { Bell, Calendar } from 'lucide-react';
import { cn } from '@ants/ui';
import {
  formatDayNumber,
  formatDurationCompact,
  formatMonthHeading,
  getBlocksForDate,
  getMonthGridDates,
  type SyncedExamCountdown,
  type TimetableBlock,
} from '../../../lib/timetable/engine';
import { CATEGORY_DOT_CLASSES } from './timetableStyles';

export interface TimetableMonthViewProps {
  anchorDate: string;
  todayIso: string;
  selectedDate: string;
  blocks: TimetableBlock[];
  exams: SyncedExamCountdown[];
  showExams: boolean;
  onSelectDay: (iso: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function TimetableMonthView({
  anchorDate,
  todayIso,
  selectedDate,
  blocks,
  exams,
  showExams,
  onSelectDay,
}: TimetableMonthViewProps) {
  const cells = useMemo(() => getMonthGridDates(anchorDate, 1), [anchorDate]);

  const examsByDate = useMemo(() => {
    const map = new Map<string, SyncedExamCountdown[]>();
    if (!showExams) return map;
    for (const ex of exams) {
      const list = map.get(ex.examDate) ?? [];
      list.push(ex);
      map.set(ex.examDate, list);
    }
    return map;
  }, [exams, showExams]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card">
      <div className="flex items-center justify-between border-b border-border bg-surface-inset/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-foreground">{formatMonthHeading(anchorDate)}</h2>
        </div>
        <span className="text-xs text-foreground-muted">
          Click any day to open its 24h timeline
        </span>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-inset/35">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="border-r border-border py-2 text-center text-xs font-semibold text-foreground-muted last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map(({ iso, inMonth }) => {
          const dayBlocks = getBlocksForDate(blocks, iso).filter(
            (b) => b.category !== 'sleep' && b.category !== 'buffer'
          );
          const focusMinutes = dayBlocks
            .filter((b) => b.category === 'deep-work' || b.category === 'study' || b.category === 'reading')
            .reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);
          const reminderCount = dayBlocks.filter((b) => b.telegramReminder.enabled).length;
          const dayExams = examsByDate.get(iso) ?? [];
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={cn(
                'flex min-h-[104px] flex-col items-stretch justify-between border-b border-r border-border p-2 text-left transition-colors last:border-r-0',
                'hover:bg-surface-inset/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                !inMonth && 'bg-surface-inset/30 opacity-55',
                isSelected && 'bg-primary-tint/[0.12]'
              )}
            >
              <div className="flex items-center justify-between gap-1">
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
                {reminderCount > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums text-foreground-muted"
                    title={`${reminderCount} Telegram reminders`}
                  >
                    <Bell className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                    {reminderCount}
                  </span>
                )}
              </div>

              <div className="mt-1.5 space-y-1">
                {dayExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="truncate rounded border border-destructive-border bg-destructive-tint px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-destructive-tint"
                  >
                    {ex.code} Exam
                  </div>
                ))}
                {(() => {
                  const maxVisibleBlocks = dayExams.length > 0 ? 1 : 2;
                  const visibleBlocks = dayBlocks.slice(0, maxVisibleBlocks);
                  const hiddenCount = dayBlocks.length - visibleBlocks.length;
                  return (
                    <>
                      {visibleBlocks.map((b) => (
                        <div
                          key={`${b.id}-${iso}`}
                          className="flex items-center gap-1 truncate rounded border border-border bg-surface-elevated/70 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                        >
                          <span
                            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', CATEGORY_DOT_CLASSES[b.category])}
                            aria-hidden="true"
                          />
                          <span className="truncate">{b.title}</span>
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <p className="px-1 font-mono text-[10px] tabular-nums text-foreground-subtle">
                          +{hiddenCount} more
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="mt-1.5 flex items-center justify-between border-t border-border-subtle pt-1 font-mono text-[10px] tabular-nums text-foreground-muted">
                <span>{dayBlocks.length} blocks</span>
                {focusMinutes > 0 && (
                  <span className="text-primary">{formatDurationCompact(focusMinutes)}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

