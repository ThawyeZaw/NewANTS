'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Clock,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge, Button, Modal, cn } from '@ants/ui';
import {
  derivePaperResult,
  getCellAttempts,
  getGradeTone,
  getSeriesLabelForBoard,
  PAPER_FIRST_LOG_XP,
  PAPER_PB_IMPROVEMENT_XP,
  type LogPaperAttemptInput,
  type PastPaperAttempt,
  type PastPaperRowDefinition,
  type PastPaperSeriesMeta,
} from '../../../lib/study/papers';
import type { CurriculumBoardId } from '../../../lib/study/curriculum';
import { WEAK_TOPIC_PRESETS_BY_BOARD } from '../../../mocks/study-papers.mock';

export interface PaperScoreModalViewProps {
  open: boolean;
  row: PastPaperRowDefinition | null;
  series: PastPaperSeriesMeta | null;
  boardId: CurriculumBoardId;
  subjectTitle: string;
  attempts: readonly PastPaperAttempt[];
  onClose: () => void;
  onSaveAttempt: (
    row: PastPaperRowDefinition,
    series: PastPaperSeriesMeta,
    input: LogPaperAttemptInput
  ) => void;
  onDeleteAttempt: (attemptId: string) => void;
}

const GRADE_PILL_STYLE: Record<ReturnType<typeof getGradeTone>, string> = {
  top: 'border-success-border bg-success-tint text-on-success-tint',
  strong: 'border-primary-tint-border bg-primary-tint text-on-primary-tint',
  pass: 'border-border-hover bg-surface-inset text-foreground',
  needs_work: 'border-danger-border bg-danger-tint text-on-danger-tint',
};

export function PaperScoreModalView({
  open,
  row,
  series,
  boardId,
  subjectTitle,
  attempts,
  onClose,
  onSaveAttempt,
  onDeleteAttempt,
}: PaperScoreModalViewProps) {
  const [rawScore, setRawScore] = useState<number>(0);
  const [timed, setTimed] = useState<boolean>(true);
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const cellAgg = useMemo(() => {
    if (!row || !series) return null;
    return getCellAttempts(attempts, row.id, series.id, 'latest');
  }, [attempts, row, series]);

  useEffect(() => {
    if (!open || !row || !series) return;
    const latest = cellAgg?.latestAttempt;
    const aStop =
      row.seriesBoundaries[series.id]?.thresholds['A*'] ??
      row.seriesBoundaries[series.id]?.thresholds['9'] ??
      Math.round(row.maxRaw * 0.8);

    setRawScore(latest ? latest.rawScore : aStop);
    setTimed(latest ? latest.timed : true);
    setDurationMinutes(latest ? latest.durationMinutes : row.durationMinutes);
    setWeakTopics([]);
    setCustomTagInput('');
    setNotes('');
  }, [open, row, series, cellAgg?.latestAttempt]);

  const liveResult = useMemo(() => {
    if (!row || !series) return null;
    return derivePaperResult(rawScore, row, series.id);
  }, [rawScore, row, series]);

  if (!open || !row || !series || !liveResult) {
    return null;
  }

  const seriesLabel = getSeriesLabelForBoard(series, boardId, false);
  const presetWeakTopics =
    WEAK_TOPIC_PRESETS_BY_BOARD[boardId] ?? WEAK_TOPIC_PRESETS_BY_BOARD['edexcel-ial']!;

  const isFirstLog = (cellAgg?.attemptCount ?? 0) === 0;
  const bestPriorRaw = cellAgg?.bestAttempt?.rawScore ?? -1;
  const isNewPb = !isFirstLog && liveResult.rawScore > bestPriorRaw;
  const xpPreview = isFirstLog
    ? `+${PAPER_FIRST_LOG_XP} XP · First Sit`
    : isNewPb
      ? `+${PAPER_PB_IMPROVEMENT_XP} XP · New Personal Best`
      : 'Practice Log Saved';

  const handleToggleTag = (tag: string) => {
    setWeakTopics((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (!weakTopics.includes(trimmed)) {
      setWeakTopics((prev) => [...prev, trimmed].slice(0, 6));
    }
    setCustomTagInput('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSaveAttempt(row, series, {
      rawScore: liveResult.rawScore,
      timed,
      durationMinutes,
      weakTopics,
      notes,
    });
    onClose();
  };

  const topPresetStop = liveResult.rulerStops[0];
  const aOrSevenPresetStop = liveResult.rulerStops.find(
    (s) => s.grade === 'A' || s.grade === '7'
  );
  const passPresetStop = liveResult.rulerStops.find(
    (s) => s.grade === 'C' || s.grade === '5'
  );

  const liveTone = getGradeTone(liveResult.grade);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-primary-tint-border bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint">
            {row.paperCode}
          </span>
          <span>{seriesLabel}</span>
        </span>
      }
      description={`${subjectTitle} · ${row.title} (${row.maxRaw} marks${
        row.maxUms ? ` · ${row.maxUms} UMS` : ''
      })`}
      headerBadge={
        <Badge
          variant={isFirstLog || isNewPb ? 'verified' : 'editorial'}
          mono
        >
          {xpPreview}
        </Badge>
      }
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="paper-score-form"
            variant="primary"
            size="sm"
            data-testid="save-paper-attempt-btn"
          >
            Save Score ({liveResult.rawScore}/{row.maxRaw} · {liveResult.grade})
          </Button>
        </>
      }
    >
      <form
        id="paper-score-form"
        onSubmit={handleSubmit}
        className="max-h-[65vh] overflow-y-auto pr-1 space-y-5"
      >
        {/* 1. Raw Score Input + Live Grade / UMS Derivation Card */}
        <div className="rounded-xl border border-border bg-background p-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <label
                htmlFor="paper-raw-score-input"
                className="block text-xs font-bold uppercase tracking-wider text-foreground"
              >
                Raw Marks Achieved
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="paper-raw-score-input"
                  data-testid="paper-raw-score-input"
                  type="number"
                  min={0}
                  max={row.maxRaw}
                  value={rawScore}
                  onChange={(e) => {
                    const num = Number(e.target.value);
                    setRawScore(
                      Number.isNaN(num) ? 0 : Math.max(0, Math.min(row.maxRaw, num))
                    );
                  }}
                  className="h-11 w-28 rounded-lg border border-border bg-surface-card px-3 font-mono text-xl font-extrabold tabular-nums text-foreground focus:border-primary focus:outline-none"
                />
                <span className="font-mono text-base font-semibold text-foreground-muted">
                  / {row.maxRaw}
                </span>

                {/* Boundary Preset Shortcuts */}
                <div className="hidden sm:flex items-center gap-1 pl-2">
                  {topPresetStop && (
                    <button
                      type="button"
                      onClick={() => setRawScore(topPresetStop.minRaw)}
                      className="rounded border border-border bg-surface-card px-2 py-1 font-mono text-[11px] font-semibold text-foreground-muted hover:text-foreground"
                    >
                      {topPresetStop.grade} ({topPresetStop.minRaw})
                    </button>
                  )}
                  {aOrSevenPresetStop && (
                    <button
                      type="button"
                      onClick={() => setRawScore(aOrSevenPresetStop.minRaw)}
                      className="rounded border border-border bg-surface-card px-2 py-1 font-mono text-[11px] font-semibold text-foreground-muted hover:text-foreground"
                    >
                      {aOrSevenPresetStop.grade} ({aOrSevenPresetStop.minRaw})
                    </button>
                  )}
                  {passPresetStop && (
                    <button
                      type="button"
                      onClick={() => setRawScore(passPresetStop.minRaw)}
                      className="rounded border border-border bg-surface-card px-2 py-1 font-mono text-[11px] font-semibold text-foreground-muted hover:text-foreground"
                    >
                      {passPresetStop.grade} ({passPresetStop.minRaw})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Instant Derived Grade & UMS / PUM Readout */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-card px-4 py-2.5">
              <div className="text-right font-mono tabular-nums">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Derived Output
                </span>
                <span
                  data-testid="modal-derived-ums"
                  className="text-sm font-bold text-foreground"
                >
                  {liveResult.umsOrPum} {liveResult.umsOrPumLabel} ·{' '}
                  {liveResult.percentage}%
                </span>
              </div>
              <span
                data-testid="modal-derived-grade"
                className={cn(
                  'inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-lg border px-2.5 font-mono text-xl font-extrabold',
                  GRADE_PILL_STYLE[liveTone]
                )}
              >
                {liveResult.grade}
              </span>
            </div>
          </div>

          <input
            type="range"
            aria-label="Raw score slider"
            min={0}
            max={row.maxRaw}
            value={liveResult.rawScore}
            onChange={(e) => setRawScore(Number(e.target.value))}
            className="w-full accent-[var(--primary)] cursor-pointer"
          />

          {/* Historical Boundary Ruler & Margin Feedback */}
          <div className="space-y-2 border-t border-border-subtle pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {liveResult.nextGradeStop ? (
                  <span>
                    <span className="font-mono font-bold text-on-primary-tint">
                      {liveResult.nextGradeStop.marksNeeded} mark
                      {liveResult.nextGradeStop.marksNeeded === 1 ? '' : 's'}
                    </span>{' '}
                    away from Grade {liveResult.nextGradeStop.grade} (cutoff{' '}
                    <span className="font-mono">
                      {liveResult.nextGradeStop.minRaw}/{row.maxRaw}
                    </span>
                    )
                  </span>
                ) : (
                  <span className="text-on-success-tint">
                    Top grade boundary cleared (+
                    {liveResult.topGradeStop?.margin ?? 0} above{' '}
                    {liveResult.topGradeStop?.minRaw}/{row.maxRaw})
                  </span>
                )}
              </span>

              <span className="font-mono text-[11px] text-foreground-muted">
                {seriesLabel} Thresholds
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {liveResult.rulerStops.map((stop) => {
                const met = liveResult.rawScore >= stop.minRaw;
                return (
                  <div
                    key={stop.grade}
                    className={cn(
                      'rounded border px-2 py-1 text-center font-mono text-[11px] tabular-nums transition-colors',
                      met
                        ? 'border-success-border bg-success-tint/60 text-on-success-tint font-bold'
                        : 'border-border bg-surface-card text-foreground-muted'
                    )}
                  >
                    <span className="block">{stop.grade}</span>
                    <span className="text-[10px] opacity-85">
                      {stop.minRaw}m
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Exam Simulation Timing & Duration */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Sitting Conditions
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={timed}
                onClick={() => setTimed(true)}
                className={cn(
                  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors',
                  timed
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                )}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Timed Exam</span>
              </button>
              <button
                type="button"
                aria-pressed={!timed}
                onClick={() => setTimed(false)}
                className={cn(
                  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors',
                  !timed
                    ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                    : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                )}
              >
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Untimed Drill</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="paper-duration-input"
              className="block text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Time Taken (Official: {row.durationMinutes} min)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="paper-duration-input"
                type="number"
                min={1}
                max={360}
                value={durationMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDurationMinutes(
                    Number.isNaN(val) ? row.durationMinutes : Math.max(1, Math.min(360, val))
                  );
                }}
                className="h-9 w-24 rounded-md border border-border bg-surface-card px-2.5 font-mono text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
              />
              <span className="font-mono text-xs text-foreground-muted">minutes</span>
            </div>
          </div>
        </div>

        {/* 3. Weak Topic Tags & Error Log Reflection */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-foreground">
              Mistake Pattern &amp; Weak Topics
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetWeakTopics.map((tag) => {
                const selected = weakTopics.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                      selected
                        ? 'border-primary-tint-border bg-primary-tint text-on-primary-tint'
                        : 'border-border bg-surface-card text-foreground-muted hover:text-foreground'
                    )}
                  >
                    {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="Add custom weak topic tag (e.g. Integration Q8)..."
                aria-label="Custom weak topic tag"
                className="h-8 flex-1 rounded-md border border-border bg-surface-card px-2.5 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface-card px-2.5 text-xs font-semibold text-foreground hover:border-border-hover"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add Tag</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="paper-reflection-notes"
              className="block text-xs font-bold uppercase tracking-wider text-foreground"
            >
              Post-Paper Reflection &amp; Mark-Scheme Takeaways
            </label>
            <textarea
              id="paper-reflection-notes"
              data-testid="paper-reflection-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Which questions lost marks, and what examiner method point should be revised before the next sit?"
              className="w-full rounded-lg border border-border bg-surface-card p-2.5 text-xs leading-relaxed text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Attempt History for this Cell */}
        {cellAgg && cellAgg.attempts.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Logged Attempt History ({cellAgg.attempts.length})
              </h3>
              {cellAgg.bestAttempt && (
                <span className="font-mono text-[11px] font-semibold text-on-success-tint">
                  Personal Best: {cellAgg.bestAttempt.rawScore}/{row.maxRaw} (
                  {cellAgg.bestAttempt.derivedGrade})
                </span>
              )}
            </div>

            <div className="divide-y divide-border rounded-lg border border-border bg-background">
              {[...cellAgg.attempts].reverse().map((attempt) => {
                const tone = getGradeTone(attempt.derivedGrade);
                const isBest =
                  cellAgg.bestAttempt && cellAgg.bestAttempt.id === attempt.id;
                return (
                  <div
                    key={attempt.id}
                    data-attempt-history-item={attempt.id}
                    className="flex flex-wrap items-start justify-between gap-2 p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold',
                            GRADE_PILL_STYLE[tone]
                          )}
                        >
                          {attempt.derivedGrade}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-foreground">
                          {attempt.rawScore}/{attempt.maxRaw} ({attempt.percentage}%)
                        </span>
                        <span className="font-mono text-[11px] text-foreground-muted">
                          {attempt.derivedUmsOrPum} {attempt.umsOrPumLabel}
                        </span>
                        {isBest && (
                          <span className="rounded bg-success-tint px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-success-tint">
                            PB
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-foreground-muted">
                          {attempt.dateLabel} ·{' '}
                          {attempt.timed
                            ? `Timed (${attempt.durationMinutes}m)`
                            : `Untimed (${attempt.durationMinutes}m)`}
                        </span>
                      </div>

                      {attempt.notes && (
                        <p className="text-foreground-muted leading-snug">
                          {attempt.notes}
                        </p>
                      )}
                      {attempt.weakTopics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {attempt.weakTopics.map((tag) => (
                            <span
                              key={tag}
                              className="rounded border border-border bg-surface-card px-1.5 py-0.5 text-[10px] text-foreground-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteAttempt(attempt.id)}
                      aria-label={`Delete attempt ${attempt.rawScore}/${attempt.maxRaw}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border text-foreground-muted transition-colors hover:border-danger-border hover:bg-danger-tint hover:text-on-danger-tint"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

