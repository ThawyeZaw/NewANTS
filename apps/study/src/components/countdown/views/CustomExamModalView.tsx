'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { Button, Checkbox, Input, Modal, cn } from '@ants/ui';
import {
  createCustomCountdownEntry,
  validateCustomCountdownInput,
  type ExamColorTag,
  type ExamCountdownEntry,
} from '../../../lib/study/countdown-leaderboard';
import type { StudyBoardPresetId } from '../../../lib/study/dashboard';

export interface CustomExamModalViewProps {
  open: boolean;
  editingEntry?: ExamCountdownEntry | null;
  initialPinned?: boolean;
  initialSyncedToFlow?: boolean;
  defaultBoardId?: StudyBoardPresetId;
  onClose: () => void;
  onSave: (
    entry: ExamCountdownEntry,
    flags: { pinned: boolean; syncedToFlow: boolean }
  ) => void;
  onDelete?: (examId: string) => void;
}

const COLOR_TAG_OPTIONS: { id: ExamColorTag; label: string; dotClass: string }[] = [
  { id: 'amber', label: 'Amber', dotClass: 'bg-amber-500' },
  { id: 'rose', label: 'Urgent Rose', dotClass: 'bg-rose-500' },
  { id: 'indigo', label: 'Mock Indigo', dotClass: 'bg-indigo-500' },
  { id: 'emerald', label: 'Science Green', dotClass: 'bg-emerald-500' },
  { id: 'slate', label: 'Neutral Slate', dotClass: 'bg-slate-500' },
];

export function CustomExamModalView({
  open,
  editingEntry = null,
  initialPinned = true,
  initialSyncedToFlow = true,
  defaultBoardId = 'edexcel-ial',
  onClose,
  onSave,
  onDelete,
}: CustomExamModalViewProps) {
  const [boardId, setBoardId] = useState<StudyBoardPresetId>(defaultBoardId);
  const [category, setCategory] = useState<'mock' | 'custom'>('mock');
  const [paperCode, setPaperCode] = useState('');
  const [title, setTitle] = useState('');
  const [examDateIso, setExamDateIso] = useState('2026-11-28');
  const [examTime24h, setExamTime24h] = useState('09:00');
  const [targetGrade, setTargetGrade] = useState('A*');
  const [colorTag, setColorTag] = useState<ExamColorTag>('indigo');
  const [venueOrNotes, setVenueOrNotes] = useState('');
  const [pinned, setPinned] = useState(initialPinned);
  const [syncedToFlow, setSyncedToFlow] = useState(initialSyncedToFlow);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    if (editingEntry) {
      setBoardId(editingEntry.boardId);
      setCategory(editingEntry.isMock ? 'mock' : 'custom');
      setPaperCode(editingEntry.paperCode);
      setTitle(editingEntry.title);
      setExamDateIso(editingEntry.examDateIso);
      setExamTime24h(editingEntry.examTime24h || '09:00');
      setTargetGrade(editingEntry.targetGrade);
      setColorTag(editingEntry.colorTag);
      setVenueOrNotes(editingEntry.venueOrNotes ?? '');
      setPinned(initialPinned);
      setSyncedToFlow(initialSyncedToFlow);
    } else {
      setBoardId(defaultBoardId);
      setCategory('mock');
      setPaperCode('');
      setTitle('');
      setExamDateIso('2026-11-28');
      setExamTime24h('09:00');
      setTargetGrade('A*');
      setColorTag('indigo');
      setVenueOrNotes('');
      setPinned(true);
      setSyncedToFlow(true);
    }
  }, [open, editingEntry, initialPinned, initialSyncedToFlow, defaultBoardId]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const draftInput = {
      id: editingEntry?.id,
      boardId,
      paperCode,
      title,
      examDateIso,
      examTime24h,
      targetGrade,
      category,
      colorTag,
      venueOrNotes,
      pinned,
      syncedToFlow,
    };

    const validation = validateCustomCountdownInput(draftInput);
    if (!validation.valid) {
      setErrorMessage(validation.error ?? 'Check your exam details.');
      return;
    }

    const entry = createCustomCountdownEntry(draftInput);
    onSave(entry, { pinned, syncedToFlow });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editingEntry ? `Edit ${editingEntry.paperCode}` : 'Add Custom or Mock Exam'}
      description="Create a timed mock sitting, school assessment, or personalized exam countdown synced with Dashboard and Flow."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Switcher */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                id: 'mock',
                label: 'Timed Mock Paper',
                hint: 'Desk simulation & target score',
              },
              {
                id: 'custom',
                label: 'Custom / School Exam',
                hint: 'Personal deadline or oral date',
              },
            ] as const
          ).map((option) => {
            const active = category === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setCategory(option.id);
                  if (!editingEntry) {
                    setColorTag(option.id === 'mock' ? 'indigo' : 'amber');
                  }
                }}
                className={cn(
                  'rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-card text-foreground hover:border-border-hover'
                )}
              >
                <div className="text-xs font-bold">{option.label}</div>
                <div className="mt-0.5 text-[11px] text-foreground-muted">{option.hint}</div>
              </button>
            );
          })}
        </div>

        {/* Board & Paper Code */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="custom-exam-board"
              className="mb-1.5 block text-xs font-semibold text-foreground"
            >
              Exam Board Track
            </label>
            <select
              id="custom-exam-board"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value as StudyBoardPresetId)}
              className="h-10 w-full rounded-lg border border-border bg-surface-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="edexcel-ial">Pearson Edexcel IAL</option>
              <option value="cambridge-igcse">Cambridge IGCSE</option>
            </select>
          </div>

          <Input
            id="custom-exam-code"
            label="Paper / Unit Code"
            placeholder="e.g. WMA12-M2 or 0580/42"
            value={paperCode}
            onChange={(e) => setPaperCode(e.target.value)}
            maxLength={20}
            required
          />
        </div>

        {/* Title */}
        <Input
          id="custom-exam-title"
          label="Exam or Mock Title"
          placeholder="e.g. Pure Maths 2 Full Timed Mock Sitting"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={96}
          required
        />

        {/* Date, Session Time & Target Grade */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            id="custom-exam-date"
            type="date"
            label="Exam Date"
            value={examDateIso}
            onChange={(e) => setExamDateIso(e.target.value)}
            leftIcon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />}
            required
          />
          <Input
            id="custom-exam-time"
            type="time"
            label="Start Time"
            value={examTime24h}
            onChange={(e) => setExamTime24h(e.target.value)}
            leftIcon={<Clock className="h-3.5 w-3.5" aria-hidden="true" />}
          />
          <Input
            id="custom-exam-target"
            label="Target Grade / UMS"
            placeholder="e.g. A* or 90+"
            value={targetGrade}
            onChange={(e) => setTargetGrade(e.target.value)}
            maxLength={10}
          />
        </div>

        {/* Notes / Venue */}
        <Input
          id="custom-exam-notes"
          label="Session Notes or Exam Hall (Optional)"
          placeholder="e.g. 1h 30m strict timer · Self-marked with Oct 2024 MS"
          value={venueOrNotes}
          onChange={(e) => setVenueOrNotes(e.target.value)}
          maxLength={140}
        />

        {/* Color Tag Selector */}
        <div>
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Tag className="h-3.5 w-3.5 text-foreground-muted" aria-hidden="true" />
            <span>Accent Color Tag</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_TAG_OPTIONS.map((tag) => {
              const selected = colorTag === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setColorTag(tag.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    selected
                      ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                      : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', tag.dotClass)} aria-hidden="true" />
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pin & Flow Sync Checkboxes */}
        <div className="space-y-2 border-t border-border pt-3">
          <Checkbox
            checked={pinned}
            onCheckedChange={setPinned}
            label="Pin countdown to Study Dashboard"
          />
          <Checkbox
            checked={syncedToFlow}
            onCheckedChange={setSyncedToFlow}
            label={
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Sync exam milestone onto Flow Smart Timetable</span>
              </span>
            }
          />
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          {editingEntry && editingEntry.isCustom && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => {
                onDelete(editingEntry.id);
                onClose();
              }}
            >
              Delete Mock
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingEntry ? 'Save Changes' : 'Create Countdown'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
