'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarCheck,
  Check,
  Clock,
  Eraser,
  Globe,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  ACCOUNT_WEEKDAYS,
  TUTOR_SLOT_HOURS,
  applyTutorSchedulePreset,
  buildTelegramInquiryUrl,
  cloneTutorSchedule,
  formatSlotHourLabel,
  formatSlotRangeLabel,
  paintTutorSlotRect,
  summarizeTutorSchedule,
  type AvailabilityStatus,
  type TutorScheduleMap,
  type TutorSchedulePresetId,
  type WeekdayKey,
} from '../lib/account';
import { Button } from '../primitives/Button';
import { cn } from '../utils/cn';

export interface TutorSlotPainterViewProps {
  /** Weekly Sun–Sat availability matrix (`available` | `flexible` | `unavailable`) */
  schedule: TutorScheduleMap;
  /** `'edit'` enables brush click-and-drag painting; `'preview'` enables slot selection for student inquiries */
  mode?: 'edit' | 'preview';
  /** Display name used when composing Telegram booking inquiries in preview mode */
  tutorName?: string;
  /** Public Telegram handle used when composing inquiry links in preview mode */
  tutorTelegramUsername?: string;
  /** Tutor timezone caption (e.g. `Asia/Yangon (UTC+06:30)`) */
  timezoneLabel?: string;
  /** Callback invoked on every painted cell, drag stroke, or preset apply in edit mode */
  onChange?: (next: TutorScheduleMap) => void;
  /** Optional callback when a visitor picks an open slot in preview mode */
  onSelectPreviewSlot?: (slot: {
    day: WeekdayKey;
    hour: number;
    status: AvailabilityStatus;
    rangeLabel: string;
  }) => void;
  className?: string;
}

const BRUSH_OPTIONS: {
  id: AvailabilityStatus;
  label: string;
  hint: string;
  chipClass: string;
  activeClass: string;
}[] = [
  {
    id: 'available',
    label: 'Available',
    hint: 'Open 1:1 slots',
    chipClass: 'border-success-border bg-success-tint text-on-success-tint',
    activeClass: 'border-success bg-success-tint text-on-success-tint ring-2 ring-ring',
  },
  {
    id: 'flexible',
    label: 'Flexible',
    hint: 'On request',
    chipClass: 'border-primary-tint-border bg-primary-tint text-on-primary-tint',
    activeClass: 'border-primary bg-primary-tint text-on-primary-tint ring-2 ring-ring',
  },
  {
    id: 'unavailable',
    label: 'Erase',
    hint: 'Clear slot',
    chipClass: 'border-border bg-surface-inset text-foreground-muted',
    activeClass: 'border-foreground-muted bg-surface-inset text-foreground ring-2 ring-ring',
  },
];

const PRESET_ACTIONS: { id: TutorSchedulePresetId; label: string }[] = [
  { id: 'balanced-mentor', label: 'Balanced' },
  { id: 'weekday-evenings', label: 'Evenings' },
  { id: 'weekend-intensive', label: 'Weekends' },
  { id: 'clear', label: 'Clear all' },
];

interface GridCoords {
  dayIdx: number;
  hourIdx: number;
}

export function TutorSlotPainterView({
  schedule,
  mode = 'edit',
  tutorName = 'The ANTs Tutor',
  tutorTelegramUsername = '',
  timezoneLabel = 'Asia/Yangon (UTC+06:30)',
  onChange,
  onSelectPreviewSlot,
  className,
}: TutorSlotPainterViewProps) {
  const [activeBrush, setActiveBrush] = useState<AvailabilityStatus>('available');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [selectedPreviewCell, setSelectedPreviewCell] = useState<{
    day: WeekdayKey;
    hour: number;
    status: AvailabilityStatus;
  } | null>(null);

  // Refs preserve synchronous drag-stroke coordinates and baseline snapshot so rapid
  // pointer movement across multiple Sun–Sat cells paints deterministically without tear.
  const isPaintingRef = useRef(false);
  const strokeAnchorRef = useRef<GridCoords | null>(null);
  const strokeBaselineRef = useRef<TutorScheduleMap | null>(null);
  const lastTargetKeyRef = useRef<string | null>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);

  const [dragPreviewText, setDragPreviewText] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPreviewCell(null);
  }, [tutorTelegramUsername, mode]);

  const summary = useMemo(() => summarizeTutorSchedule(schedule), [schedule]);

  const endPaintStroke = useCallback(() => {
    if (!isPaintingRef.current) return;
    isPaintingRef.current = false;
    strokeAnchorRef.current = null;
    strokeBaselineRef.current = null;
    lastTargetKeyRef.current = null;
    setDragPreviewText(null);
  }, []);

  useEffect(() => {
    if (mode !== 'edit') return;
    window.addEventListener('pointerup', endPaintStroke);
    window.addEventListener('pointercancel', endPaintStroke);
    return () => {
      window.removeEventListener('pointerup', endPaintStroke);
      window.removeEventListener('pointercancel', endPaintStroke);
    };
  }, [endPaintStroke, mode]);

  /**
   * Starts a rectangular brush stroke at `(dayIdx, hourIdx)` using the active brush.
   * Snapshotting `schedule` at pointerdown allows reversing drag direction mid-stroke
   * without leaving stale accidental marks outside the final bounding box.
   */
  const handleCellPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    dayIdx: number,
    hourIdx: number
  ) => {
    if (mode !== 'edit' || !onChange) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;

    event.preventDefault();
    const baseline = cloneTutorSchedule(schedule);
    const anchor: GridCoords = { dayIdx, hourIdx };

    isPaintingRef.current = true;
    strokeAnchorRef.current = anchor;
    strokeBaselineRef.current = baseline;
    lastTargetKeyRef.current = `${dayIdx}-${hourIdx}`;

    const dayKey = ACCOUNT_WEEKDAYS[dayIdx];
    const hourVal = TUTOR_SLOT_HOURS[hourIdx];
    if (dayKey && hourVal !== undefined) {
      setDragPreviewText(`${dayKey} ${formatSlotHourLabel(hourVal, timeFormat)}`);
    }

    onChange(paintTutorSlotRect(baseline, anchor, anchor, activeBrush));
  };

  /** Continues the active brush stroke across any entered or hit-tested Sun–Sat slot cell. */
  const applyStrokeToCell = (dayIdx: number, hourIdx: number) => {
    if (
      mode !== 'edit' ||
      !onChange ||
      !isPaintingRef.current ||
      !strokeAnchorRef.current ||
      !strokeBaselineRef.current
    ) {
      return;
    }

    const key = `${dayIdx}-${hourIdx}`;
    if (lastTargetKeyRef.current === key) return;
    lastTargetKeyRef.current = key;

    const from = strokeAnchorRef.current;
    const to: GridCoords = { dayIdx, hourIdx };
    const fromDay = ACCOUNT_WEEKDAYS[from.dayIdx];
    const toDay = ACCOUNT_WEEKDAYS[to.dayIdx];
    const fromHour = TUTOR_SLOT_HOURS[Math.min(from.hourIdx, to.hourIdx)];
    const toHour = TUTOR_SLOT_HOURS[Math.max(from.hourIdx, to.hourIdx)];

    if (fromDay && toDay && fromHour !== undefined && toHour !== undefined) {
      setDragPreviewText(
        from.dayIdx === to.dayIdx && from.hourIdx === to.hourIdx
          ? `${fromDay} ${formatSlotHourLabel(fromHour, timeFormat)}`
          : `${fromDay}–${toDay} · ${formatSlotHourLabel(fromHour, timeFormat)}–${formatSlotHourLabel(toHour + 1, timeFormat)}`
      );
    }

    onChange(paintTutorSlotRect(strokeBaselineRef.current, from, to, activeBrush));
  };

  /** Handles both desktop pointer hover and mobile touch dragging via coordinate hit-testing. */
  const handleGridPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'edit' || !isPaintingRef.current || typeof document === 'undefined') return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const cellEl = hit?.closest<HTMLElement>('[data-slot-cell]');
    const raw = cellEl?.dataset.slotCell;
    if (!raw) return;
    const [dStr, hStr] = raw.split('-');
    const dayIdx = Number(dStr);
    const hourIdx = Number(hStr);
    if (Number.isInteger(dayIdx) && Number.isInteger(hourIdx)) {
      applyStrokeToCell(dayIdx, hourIdx);
    }
  };

  /** Supports arrow-key roving navigation and Space/Enter single-cell painting. */
  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    dayIdx: number,
    hourIdx: number,
    day: WeekdayKey,
    hour: number,
    status: AvailabilityStatus
  ) => {
    let nextDay = dayIdx;
    let nextHour = hourIdx;

    if (event.key === 'ArrowRight') nextDay = Math.min(ACCOUNT_WEEKDAYS.length - 1, dayIdx + 1);
    else if (event.key === 'ArrowLeft') nextDay = Math.max(0, dayIdx - 1);
    else if (event.key === 'ArrowDown') nextHour = Math.min(TUTOR_SLOT_HOURS.length - 1, hourIdx + 1);
    else if (event.key === 'ArrowUp') nextHour = Math.max(0, hourIdx - 1);
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (mode === 'edit' && onChange) {
        onChange(
          paintTutorSlotRect(schedule, { dayIdx, hourIdx }, { dayIdx, hourIdx }, activeBrush)
        );
      } else if (mode === 'preview' && status !== 'unavailable') {
        handlePreviewSelect(day, hour, status);
      }
      return;
    } else {
      return;
    }

    event.preventDefault();
    const target = gridBodyRef.current?.querySelector<HTMLButtonElement>(
      `[data-slot-cell="${nextDay}-${nextHour}"]`
    );
    target?.focus();
  };

  const handlePreviewSelect = (day: WeekdayKey, hour: number, status: AvailabilityStatus) => {
    if (status === 'unavailable') return;
    setSelectedPreviewCell({ day, hour, status });
    onSelectPreviewSlot?.({
      day,
      hour,
      status,
      rangeLabel: formatSlotRangeLabel(day, hour, timeFormat),
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar: Brush Palette + Quick Presets + 12h/24h Toggle */}
      <div className="flex flex-col gap-3 border-b border-border-subtle pb-3 lg:flex-row lg:items-center lg:justify-between">
        {mode === 'edit' ? (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Availability brush mode">
            <span className="mr-1 text-xs font-semibold text-foreground-muted">Brush:</span>
            {BRUSH_OPTIONS.map((brush) => {
              const selected = activeBrush === brush.id;
              return (
                <button
                  key={brush.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveBrush(brush.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? brush.activeClass
                      : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
                  )}
                >
                  {brush.id === 'available' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  {brush.id === 'flexible' && <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
                  {brush.id === 'unavailable' && <Eraser className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{brush.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-on-success-tint">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-success-border bg-success-tint">
                <Check className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
              Available
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-on-primary-tint">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-primary-tint-border bg-primary-tint">
                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
              Flexible (on request)
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <span className="h-4 w-4 rounded border border-border bg-surface-inset" aria-hidden="true" />
              Unavailable
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {mode === 'edit' && onChange && (
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Schedule presets">
              {PRESET_ACTIONS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange(applyTutorSchedulePreset(preset.id))}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-surface-card px-2 text-[11px] font-semibold text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {preset.id === 'clear' && <RotateCcw className="h-3 w-3" aria-hidden="true" />}
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* 12h / 24h Format Switch */}
          <div
            role="group"
            aria-label="Time label format"
            className="inline-flex rounded-lg border border-border bg-surface-inset p-0.5 text-[11px]"
          >
            {(['24h', '12h'] as const).map((fmt) => {
              const active = timeFormat === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTimeFormat(fmt)}
                  className={cn(
                    'rounded-md px-2 py-1 font-mono font-semibold uppercase transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-surface-card text-foreground shadow-[var(--shadow-tier-1)]'
                      : 'text-foreground-muted hover:text-foreground'
                  )}
                >
                  {fmt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Responsive Sun–Sat Slot Matrix */}
      <div className="overflow-x-auto rounded-xl bg-surface-inset/50">
        <div
          ref={gridBodyRef}
          role="grid"
          aria-label="Weekly Sun to Sat tutor availability grid"
          onPointerMove={handleGridPointerMove}
          className={cn('min-w-[300px] select-none p-2 sm:p-2.5', mode === 'edit' && 'touch-none')}
        >
          {/* Header Row: Hour gutter + Sun..Sat columns */}
          <div role="row" className="grid grid-cols-[54px_repeat(7,minmax(0,1fr))] gap-1 pb-1.5 sm:grid-cols-[68px_repeat(7,minmax(0,1fr))]">
            <div
              role="columnheader"
              className="flex items-center justify-end pr-1.5 font-mono text-[10px] font-semibold text-foreground-muted sm:pr-2"
            >
              Hour
            </div>
            {ACCOUNT_WEEKDAYS.map((day) => (
              <div
                key={day}
                role="columnheader"
                className="py-1 text-center font-mono text-[11px] font-bold text-foreground sm:text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Hourly Rows (08:00–21:00) */}
          <div className="space-y-1">
            {TUTOR_SLOT_HOURS.map((hour, hourIdx) => (
              <div
                key={hour}
                role="row"
                className="grid grid-cols-[54px_repeat(7,minmax(0,1fr))] items-center gap-1 sm:grid-cols-[68px_repeat(7,minmax(0,1fr))]"
              >
                <div
                  role="rowheader"
                  className="whitespace-nowrap pr-1.5 text-right font-mono text-[10px] font-medium tabular-nums text-foreground-muted sm:pr-2 sm:text-[11px]"
                >
                  {formatSlotHourLabel(hour, timeFormat)}
                </div>

                {ACCOUNT_WEEKDAYS.map((day, dayIdx) => {
                  const status: AvailabilityStatus = schedule[day]?.[hour] ?? 'unavailable';
                  const isPreviewSelected =
                    mode === 'preview' &&
                    selectedPreviewCell?.day === day &&
                    selectedPreviewCell?.hour === hour;
                  const interactive = mode === 'edit' || status !== 'unavailable';

                  return (
                    <button
                      key={`${day}-${hour}`}
                      type="button"
                      role="gridcell"
                      data-slot-cell={`${dayIdx}-${hourIdx}`}
                      disabled={mode === 'preview' && status === 'unavailable'}
                      aria-label={`${formatSlotRangeLabel(day, hour, timeFormat)}: ${status}`}
                      aria-pressed={
                        mode === 'preview' ? isPreviewSelected : status !== 'unavailable'
                      }
                      title={`${formatSlotRangeLabel(day, hour, timeFormat)} · ${status}`}
                      onPointerDown={(e) => handleCellPointerDown(e, dayIdx, hourIdx)}
                      onPointerEnter={() => applyStrokeToCell(dayIdx, hourIdx)}
                      onClick={() => {
                        if (mode === 'preview' && status !== 'unavailable') {
                          handlePreviewSelect(day, hour, status);
                        }
                      }}
                      onKeyDown={(e) => handleCellKeyDown(e, dayIdx, hourIdx, day, hour, status)}
                      className={cn(
                        'flex h-8 items-center justify-center rounded-md border text-[11px] font-semibold transition-colors sm:h-9',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        interactive ? 'cursor-pointer' : 'cursor-default',
                        status === 'available' &&
                          'border-success-border bg-success-tint text-on-success-tint hover:border-success',
                        status === 'flexible' &&
                          'border-primary-tint-border bg-primary-tint text-on-primary-tint hover:border-primary',
                        status === 'unavailable' &&
                          'border-border bg-surface-card text-foreground-muted hover:border-border-hover',
                        isPreviewSelected && 'ring-2 ring-primary'
                      )}
                    >
                      {status === 'available' && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
                      {status === 'flexible' && <Clock className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Schedule Totals + Drag Feedback / Student Inquiry Action */}
      <div className="flex flex-col gap-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground-muted">
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-foreground">
            <CalendarCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            {summary.availableHours}h available
          </span>
          <span className="font-mono tabular-nums text-on-primary-tint">
            · {summary.flexibleHours}h flexible
          </span>
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3 w-3" aria-hidden="true" />
            {timezoneLabel}
          </span>
        </div>

        {mode === 'edit' ? (
          dragPreviewText ? (
            <span className="font-mono text-[11px] tabular-nums text-on-primary-tint">
              Painting: {dragPreviewText}
            </span>
          ) : (
            <span className="text-xs text-foreground-muted">
              Click &amp; drag across slots to paint availability
            </span>
          )
        ) : selectedPreviewCell ? (
          tutorTelegramUsername.trim() ? (
            <a
              href={buildTelegramInquiryUrl(
                tutorTelegramUsername,
                tutorName,
                formatSlotRangeLabel(selectedPreviewCell.day, selectedPreviewCell.hour, timeFormat)
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-tint-border bg-primary-tint px-3 py-1.5 text-xs font-semibold text-on-primary-tint transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Inquire {formatSlotRangeLabel(selectedPreviewCell.day, selectedPreviewCell.hour, timeFormat)}
              </span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-inset px-3 py-1.5 text-xs font-medium text-foreground-muted">
              Selected {formatSlotRangeLabel(selectedPreviewCell.day, selectedPreviewCell.hour, timeFormat)}
            </span>
          )
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Pick the earliest available or flexible slot when clicking quick-inquire
              for (const day of ACCOUNT_WEEKDAYS) {
                for (const h of TUTOR_SLOT_HOURS) {
                  const s = schedule[day]?.[h];
                  if (s === 'available' || s === 'flexible') {
                    handlePreviewSelect(day, h, s);
                    return;
                  }
                }
              }
            }}
            disabled={summary.availableHours + summary.flexibleHours === 0}
          >
            Select any open slot to inquire
          </Button>
        )}
      </div>
    </div>
  );
}
