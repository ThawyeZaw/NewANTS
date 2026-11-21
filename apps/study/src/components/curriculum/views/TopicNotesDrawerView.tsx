'use client';

import React, { useEffect } from 'react';
import {
  BookOpen,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge, Button, cn } from '@ants/ui';
import {
  TOPIC_MASTERY_XP,
  type SyllabusTopicItem,
  type TopicConfidenceStatus,
} from '../../../lib/study/topics';

export interface TopicNotesDrawerViewProps {
  topic: SyllabusTopicItem | null;
  open: boolean;
  status: TopicConfidenceStatus;
  completedSubtopicIds: readonly string[];
  noteText: string;
  flowPomodoroUrl?: string;
  onClose: () => void;
  onToggleSubtopic: (topic: SyllabusTopicItem, subtopicId: string) => void;
  onChangeStatus: (topic: SyllabusTopicItem, nextStatus: TopicConfidenceStatus) => void;
  onChangeNote: (topicId: string, noteText: string) => void;
}

const CONFIDENCE_OPTIONS: Array<{
  id: TopicConfidenceStatus;
  label: string;
}> = [
  { id: 'not_started', label: 'Not Started' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'mastered', label: `Mastered (+${TOPIC_MASTERY_XP} XP)` },
];

export function TopicNotesDrawerView({
  topic,
  open,
  status,
  completedSubtopicIds,
  noteText,
  flowPomodoroUrl = 'http://localhost:3002/pomodoro',
  onClose,
  onToggleSubtopic,
  onChangeStatus,
  onChangeNote,
}: TopicNotesDrawerViewProps) {
  useEffect(() => {
    if (!open || !topic) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, topic, onClose]);

  if (!open || !topic) return null;

  const completedSet = new Set(completedSubtopicIds);
  const doneCount = topic.subtopics.filter((s) => completedSet.has(s.id)).length;
  const pomodorosCount = Math.max(1, Math.round(topic.estimatedMinutes / 25));
  const deepLinkHref = `${flowPomodoroUrl}?task=${encodeURIComponent(
    `${topic.code}: ${topic.title}`
  )}&pomodoros=${pomodorosCount}`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Topic notes and checklist for ${topic.code} ${topic.title}`}
    >
      <div
        className="ants-modal-backdrop-in fixed inset-0 bg-black/55 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="ants-drawer-right-in relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border-hover bg-surface-elevated text-foreground shadow-[var(--shadow-tier-3)]">
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint border border-primary-tint-border">
                {topic.code}
              </span>
              <span className="font-mono text-xs text-foreground-muted">
                {topic.unitLabel}
              </span>
              <Badge
                variant={
                  topic.difficulty === 'stretch'
                    ? 'deadline'
                    : topic.difficulty === 'standard'
                      ? 'active-filter'
                      : 'editorial'
                }
              >
                {topic.difficulty}
              </Badge>
            </div>
            <h2 className="text-base font-bold text-foreground leading-snug">
              {topic.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close topic notes drawer"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-foreground-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Confidence Status Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Confidence &amp; Mastery Status
              </h3>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-foreground-muted">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>~{topic.estimatedMinutes} min revision</span>
              </span>
            </div>

            <div
              role="group"
              aria-label="Topic confidence status"
              className="grid grid-cols-3 gap-2"
            >
              {CONFIDENCE_OPTIONS.map((opt) => {
                const active = status === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-drawer-status-btn={opt.id}
                    aria-pressed={active}
                    onClick={() => onChangeStatus(topic, opt.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active && opt.id === 'mastered'
                        ? 'border-success-border bg-success-tint text-on-success-tint'
                        : active && opt.id === 'in_progress'
                          ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                          : active
                            ? 'border-border-hover bg-surface-inset text-foreground'
                            : 'border-border bg-background text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Subtopic Specification Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Specification Subtopics Checklist
              </h3>
              <span className="font-mono text-xs tabular-nums text-foreground-muted">
                {doneCount}/{topic.subtopics.length} completed
              </span>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {topic.subtopics.map((sub) => {
                const checked = completedSet.has(sub.id);
                return (
                  <label
                    key={sub.id}
                    className="flex cursor-pointer items-start gap-3 py-2.5 text-xs transition-colors hover:bg-surface-inset/50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSubtopic(topic, sub.id)}
                      className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--primary)]"
                    />
                    <span className="font-mono font-bold text-foreground-muted shrink-0">
                      {sub.code}
                    </span>
                    <span
                      className={cn(
                        'leading-snug',
                        checked
                          ? 'line-through text-foreground-muted'
                          : 'font-medium text-foreground'
                      )}
                    >
                      {sub.title}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Key Formulas & Examiner Pitfalls */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Key Formulas &amp; Common Examiner Pitfalls
              </h3>
            </div>

            <ul className="divide-y divide-border-subtle border-y border-border py-1 text-xs text-foreground-muted">
              {topic.keyFormulasAndPitfalls.map((item, idx) => (
                <li key={idx} className="py-2 leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Personal Topic Revision Notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Personal Revision Notes &amp; Past Paper Reminders
                </h3>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-foreground-muted">
                Auto-saved · {noteText.length} chars
              </span>
            </div>

            <textarea
              rows={5}
              value={noteText}
              data-testid="topic-notes-textarea"
              onChange={(e) => onChangeNote(topic.id, e.target.value)}
              placeholder="Write key derivations, mark-scheme phrasing, or past paper question references (e.g. Jan 2025 WMA12 Q8)..."
              className="w-full rounded-lg border border-border bg-background p-3 text-xs leading-relaxed text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Drawer Footer with Flow Pomodoro Handoff */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-inset px-6 py-3.5">
          <a
            href={deepLinkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-primary-tint hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>
              Practice in Flow Pomodoro ({pomodorosCount} × 25m)
            </span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>

          <Button variant="primary" size="sm" onClick={onClose}>
            Done &amp; Save Notes
          </Button>
        </div>
      </aside>
    </div>
  );
}

