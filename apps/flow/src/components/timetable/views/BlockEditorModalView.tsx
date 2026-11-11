'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, Play, Trash2 } from 'lucide-react';
import { Button, Modal, cn } from '@ants/ui';
import {
  BLOCK_CATEGORIES,
  REMINDER_LEAD_OPTIONS,
  buildPomodoroHandoffUrl,
  categorySupportsPomodoro,
  createTimetableId,
  formatMinutes12h,
  type BlockCategory,
  type RecurrenceRule,
  type ReminderLeadMinutes,
  type TaskPriority,
  type TimetableBlock,
} from '../../../lib/timetable/engine';
import { CATEGORY_DOT_CLASSES, PRIORITY_BADGE_CLASSES } from './timetableStyles';

export interface BlockEditorDraft {
  mode: 'create' | 'edit';
  block?: TimetableBlock;
  defaultDate: string;
  defaultStartMinutes: number;
  defaultEndMinutes: number;
  defaultTitle?: string;
  defaultCategory?: BlockCategory;
  defaultPriority?: TaskPriority;
  defaultPomodoros?: number;
}

export interface BlockEditorModalViewProps {
  open: boolean;
  draft: BlockEditorDraft | null;
  onClose: () => void;
  onSave: (block: TimetableBlock, isNew: boolean) => void;
  onDelete?: (blockId: string) => void;
}

const TIME_OPTIONS = Array.from({ length: 97 }, (_, idx) => idx * 15);
const PRIORITIES: TaskPriority[] = ['P1', 'P2', 'P3', 'P4'];
const RECURRENCE_OPTIONS: { id: RecurrenceRule; label: string }[] = [
  { id: 'none', label: 'One-off' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'daily', label: 'Every day' },
  { id: 'weekly', label: 'Weekly' },
];

export function BlockEditorModalView({
  open,
  draft,
  onClose,
  onSave,
  onDelete,
}: BlockEditorModalViewProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-11-11');
  const [startMinutes, setStartMinutes] = useState(540);
  const [endMinutes, setEndMinutes] = useState(600);
  const [category, setCategory] = useState<BlockCategory>('deep-work');
  const [priority, setPriority] = useState<TaskPriority | undefined>('P1');
  const [pomodorosPlanned, setPomodorosPlanned] = useState(2);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('none');
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState<ReminderLeadMinutes>(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!draft) return;
    if (draft.mode === 'edit' && draft.block) {
      const b = draft.block;
      setTitle(b.title);
      setDate(b.date);
      setStartMinutes(b.startMinutes);
      setEndMinutes(b.endMinutes);
      setCategory(b.category);
      setPriority(b.priority);
      setPomodorosPlanned(b.pomodorosPlanned ?? 2);
      setRecurrence(b.recurrence);
      setTelegramEnabled(b.telegramReminder.enabled);
      setLeadMinutes(b.telegramReminder.leadMinutes);
      setNotes(b.notes ?? '');
      return;
    }
    setTitle(draft.defaultTitle ?? '');
    setDate(draft.defaultDate);
    setStartMinutes(draft.defaultStartMinutes);
    setEndMinutes(Math.max(draft.defaultStartMinutes + 15, draft.defaultEndMinutes));
    setCategory(draft.defaultCategory ?? 'deep-work');
    setPriority(draft.defaultPriority ?? 'P1');
    setPomodorosPlanned(draft.defaultPomodoros ?? 2);
    setRecurrence('none');
    setTelegramEnabled(true);
    setLeadMinutes(5);
    setNotes('');
  }, [draft]);

  const supportsPomodoro = categorySupportsPomodoro(category);

  const endTimeOptions = useMemo(
    () => TIME_OPTIONS.filter((m) => m > startMinutes),
    [startMinutes]
  );

  if (!draft) return null;

  const isEdit = draft.mode === 'edit' && Boolean(draft.block);
  const handoffHref = buildPomodoroHandoffUrl({
    title: title.trim() || draft.block?.title || 'Focus block',
    pomodoros: pomodorosPlanned,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const existing = draft.block;
    const saved: TimetableBlock = {
      id: existing?.id ?? createTimetableId('blk'),
      title: cleanTitle.slice(0, 140),
      date,
      startMinutes,
      endMinutes: Math.max(startMinutes + 15, endMinutes),
      category,
      priority,
      pomodorosPlanned: supportsPomodoro ? pomodorosPlanned : undefined,
      pomodorosDone: existing?.pomodorosDone ?? 0,
      recurrence,
      telegramReminder: {
        enabled: telegramEnabled,
        leadMinutes,
        note: existing?.telegramReminder.note,
      },
      notes: notes.trim() || undefined,
      completed: existing?.completed ?? false,
      locked: existing?.locked ?? false,
    };
    onSave(saved, !isEdit);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Time Block' : 'Schedule Time Block'}
      description="Changes snap to 15-minute slots and persist locally."
      size="lg"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isEdit && draft.block && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive-tint hover:text-destructive"
                leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => {
                  onDelete(draft.block!.id);
                  onClose();
                }}
              >
                Delete
              </Button>
            )}
            {supportsPomodoro && (
              <Link
                href={handoffHref}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-tint-border bg-primary-tint px-3 text-xs font-semibold text-on-primary-tint transition-colors hover:border-primary"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Start in Pomodoro
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={!title.trim()} onClick={handleSubmit}>
              {isEdit ? 'Save changes' : 'Add to timetable'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
        <div>
          <label htmlFor="blk-title" className="mb-1.5 block text-xs font-semibold text-foreground-muted">
            Block title
          </label>
          <input
            id="blk-title"
            type="text"
            autoFocus
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Side Hustle Deep Work (2 × 25m Pomodoros)"
            className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr_1fr]">
          <div>
            <label htmlFor="blk-date" className="mb-1.5 block text-xs font-semibold text-foreground-muted">
              Date
            </label>
            <input
              id="blk-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface-card px-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="blk-start" className="mb-1.5 block text-xs font-semibold text-foreground-muted">
              Start
            </label>
            <select
              id="blk-start"
              value={startMinutes}
              onChange={(e) => {
                const nextStart = Number(e.target.value);
                setStartMinutes(nextStart);
                if (endMinutes <= nextStart) {
                  setEndMinutes(Math.min(1440, nextStart + 30));
                }
              }}
              className="h-10 w-full rounded-lg border border-border bg-surface-card px-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {TIME_OPTIONS.slice(0, -1).map((m) => (
                <option key={m} value={m}>
                  {formatMinutes12h(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="blk-end" className="mb-1.5 block text-xs font-semibold text-foreground-muted">
              End
            </label>
            <select
              id="blk-end"
              value={endMinutes}
              onChange={(e) => setEndMinutes(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-border bg-surface-card px-2.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {endTimeOptions.map((m) => (
                <option key={m} value={m}>
                  {formatMinutes12h(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold text-foreground-muted">Category</legend>
          <div className="flex flex-wrap gap-1.5">
            {BLOCK_CATEGORIES.map((cat) => {
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary-tint text-on-primary-tint'
                      : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
                  )}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', CATEGORY_DOT_CLASSES[cat.id])} aria-hidden="true" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-3">
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-foreground-muted">Priority</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITIES.map((p) => {
                const active = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPriority(active ? undefined : p)}
                    className={cn(
                      'rounded-lg border py-1.5 font-mono text-xs font-bold transition-colors',
                      active
                        ? PRIORITY_BADGE_CLASSES[p]
                        : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-foreground-muted">Recurrence</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={recurrence === opt.id}
                  onClick={() => setRecurrence(opt.id)}
                  className={cn(
                    'whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    recurrence === opt.id
                      ? 'border-primary bg-primary-tint text-on-primary-tint'
                      : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {supportsPomodoro && (
            <div>
              <label htmlFor="blk-pomo" className="mb-1.5 block text-xs font-semibold text-foreground-muted">
                Linked Pomodoros (25m)
              </label>
              <input
                id="blk-pomo"
                type="number"
                min={1}
                max={16}
                value={pomodorosPlanned}
                onChange={(e) => setPomodorosPlanned(Math.max(1, Math.min(16, Number(e.target.value) || 1)))}
                className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div className={cn(!supportsPomodoro && 'sm:col-span-2')}>
            <span className="mb-1.5 block text-xs font-semibold text-foreground-muted">Telegram Reminder</span>
            <div className="flex h-10 items-center gap-2">
              <button
                type="button"
                aria-pressed={telegramEnabled}
                onClick={() => setTelegramEnabled((v) => !v)}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors',
                  telegramEnabled
                    ? 'border-primary bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-card text-foreground-muted'
                )}
              >
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                {telegramEnabled ? 'On' : 'Off'}
              </button>
              {telegramEnabled && (
                <select
                  aria-label="Telegram reminder lead time"
                  value={leadMinutes}
                  onChange={(e) => setLeadMinutes(Number(e.target.value) as ReminderLeadMinutes)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-card px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {REMINDER_LEAD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="blk-notes" className="mb-1.5 block text-xs font-semibold text-foreground-muted">
            Notes
          </label>
          <textarea
            id="blk-notes"
            rows={2}
            maxLength={400}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context, checklist, or transition reminder..."
            className="w-full rounded-lg border border-border bg-surface-card p-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </form>
    </Modal>
  );
}
