'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Clock, Send } from 'lucide-react';
import { Badge, Button, Modal, cn } from '@ants/ui';
import {
  REMINDER_LEAD_OPTIONS,
  formatMinutes12h,
  formatMinutes24h,
  getTelegramTriggerMinutes,
  type ReminderLeadMinutes,
  type TimetableBlock,
} from '../../../lib/timetable/engine';

export interface TelegramReminderModalViewProps {
  open: boolean;
  block: TimetableBlock | null;
  telegramConnected?: boolean;
  telegramHandle?: string;
  onClose: () => void;
  onSave: (
    blockId: string,
    config: { enabled: boolean; leadMinutes: ReminderLeadMinutes; note?: string }
  ) => void;
}

export function TelegramReminderModalView({
  open,
  block,
  telegramConnected = false,
  telegramHandle = '',
  onClose,
  onSave,
}: TelegramReminderModalViewProps) {
  const [enabled, setEnabled] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState<ReminderLeadMinutes>(5);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!block) return;
    setEnabled(block.telegramReminder.enabled);
    setLeadMinutes(block.telegramReminder.leadMinutes);
    setNote(block.telegramReminder.note ?? '');
  }, [block]);

  if (!block) return null;

  const previewBlock: TimetableBlock = {
    ...block,
    telegramReminder: { enabled, leadMinutes, note: note.trim() || undefined },
  };
  const cronMinutes = getTelegramTriggerMinutes(previewBlock);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(block.id, {
      enabled,
      leadMinutes,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Telegram Reminder"
      description={`Configure 5-min Cron alert for "${block.title}".`}
      headerBadge={
        <Badge variant={telegramConnected ? 'verified' : 'editorial'} dot>
          {telegramConnected ? telegramHandle : 'Bot unlinked'}
        </Badge>
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} leftIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}>
            Save reminder
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!telegramConnected && (
          <div className="rounded-xl border border-border bg-surface-inset/75 px-3.5 py-2.5 text-xs leading-relaxed text-foreground-muted">
            Telegram isn&apos;t linked yet. You can arm reminder offsets below and link{' '}
            <span className="font-mono text-foreground">@TheANTsFlowBot</span> during onboarding or in{' '}
            <Link
              href="/settings#telegram"
              onClick={onClose}
              className="font-semibold text-on-primary-tint hover:underline"
            >
              Account Settings
            </Link>
            .
          </div>
        )}
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-surface-card px-4 py-3 transition-colors hover:border-border-hover">
          <span className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg border',
                enabled
                  ? 'border-primary-tint-border bg-primary-tint text-primary'
                  : 'border-border bg-surface-inset text-foreground-muted'
              )}
            >
              {enabled ? <Bell className="h-4 w-4" aria-hidden="true" /> : <BellOff className="h-4 w-4" aria-hidden="true" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">Send Telegram alert</span>
              <span className="block text-xs text-foreground-muted">
                Queued via 5-minute Worker Cron
              </span>
            </span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              role="switch"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-border-hover transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface-card shadow-[var(--shadow-tier-1)] transition-transform peer-checked:translate-x-5" />
          </span>
        </label>

        <div className={cn('space-y-4 transition-opacity', !enabled && 'pointer-events-none opacity-45')}>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-foreground-muted">
              Trigger lead time
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REMINDER_LEAD_OPTIONS.map((opt) => {
                const selected = leadMinutes === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLeadMinutes(opt.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-card text-foreground-muted hover:border-border-hover hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="tg-reminder-note" className="mb-1.5 block text-xs font-semibold text-foreground-muted">
              Custom reminder note (optional)
            </label>
            <input
              id="tg-reminder-note"
              type="text"
              maxLength={160}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Keys in bag, start Pomodoro 1/2"
              className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="rounded-xl border border-border bg-surface-inset p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2 text-foreground-muted">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                Scheduled Telegram ping
              </span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {formatMinutes12h(cronMinutes)} ({formatMinutes24h(cronMinutes)})
              </span>
            </div>
            <p className="mt-2 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs leading-relaxed text-foreground">
              <span className="font-semibold text-primary">@TheANTsFlowBot:</span>{' '}
              {block.title} starts at{' '}
              <span className="font-mono tabular-nums">{formatMinutes12h(block.startMinutes)}</span>
              {note.trim() ? ` — ${note.trim()}` : '.'}
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
