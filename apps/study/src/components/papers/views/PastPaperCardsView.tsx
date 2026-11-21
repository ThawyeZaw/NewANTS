'use client';

import React from 'react';
import { Clock, FileText, Plus } from 'lucide-react';
import { cn } from '@ants/ui';
import {
  getCellAttempts,
  getGradeTone,
  getSeriesLabelForBoard,
  isRowAvailableInSeries,
  type PaperCellDisplayMode,
  type PastPaperAttempt,
  type PastPaperRowDefinition,
  type PastPaperSeriesMeta,
} from '../../../lib/study/papers';
import type { CurriculumBoardId } from '../../../lib/study/curriculum';

export interface PastPaperCardsViewProps {
  rows: readonly PastPaperRowDefinition[];
  seriesList: readonly PastPaperSeriesMeta[];
  attempts: readonly PastPaperAttempt[];
  boardId: CurriculumBoardId;
  displayMode: PaperCellDisplayMode;
  onSelectCell: (row: PastPaperRowDefinition, series: PastPaperSeriesMeta) => void;
}

const GRADE_STYLE: Record<ReturnType<typeof getGradeTone>, string> = {
  top: 'border-success-border bg-success-tint text-on-success-tint',
  strong: 'border-primary-tint-border bg-primary-tint text-on-primary-tint',
  pass: 'border-border-hover bg-surface-inset text-foreground',
  needs_work: 'border-danger-border bg-danger-tint text-on-danger-tint',
};

export function PastPaperCardsView({
  rows,
  seriesList,
  attempts,
  boardId,
  displayMode,
  onSelectCell,
}: PastPaperCardsViewProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="past-paper-cards-grid"
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {rows.map((row, idx) => {
        const availableSeries = seriesList.filter((s) =>
          isRowAvailableInSeries(row, s.id)
        );
        const cellAggs = availableSeries.map((series) => ({
          series,
          agg: getCellAttempts(attempts, row.id, series.id, displayMode),
        }));
        const loggedCells = cellAggs.filter((c) => c.agg.displayAttempt !== null);
        const avgPct =
          loggedCells.length > 0
            ? Math.round(
                loggedCells.reduce(
                  (acc, c) => acc + (c.agg.displayAttempt?.percentage ?? 0),
                  0
                ) / loggedCells.length
              )
            : null;
        const latestNoteAttempt = [...attempts]
          .filter((a) => a.rowId === row.id && (a.notes.trim() || a.weakTopics.length > 0))
          .sort((a, b) => b.loggedAtIso.localeCompare(a.loggedAtIso))[0];

        return (
          <article
            key={row.id}
            data-paper-card={row.id}
            style={{ '--stagger-index': Math.min(idx, 8) } as React.CSSProperties}
            className="ants-stagger-item ants-card-interactive flex flex-col justify-between rounded-lg border border-border bg-surface-card p-5 shadow-[var(--shadow-tier-1)] space-y-4"
          >
            {/* Card Header */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-primary-tint-border bg-primary-tint px-2 py-0.5 font-mono text-xs font-bold text-on-primary-tint">
                    {row.paperCode}
                  </span>
                  <span className="rounded border border-border bg-surface-inset px-2 py-0.5 font-mono text-[11px] font-medium text-foreground-muted">
                    {row.variantBadge}
                  </span>
                </div>

                <span className="font-mono text-xs font-semibold tabular-nums text-foreground-muted">
                  {row.maxRaw} marks · {row.durationMinutes} min
                  {row.maxUms ? ` · ${row.maxUms} UMS` : ''}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {row.shortLabel}: {row.title}
                </h3>
                {avgPct !== null && (
                  <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-foreground">
                    Avg {avgPct}% ({loggedCells.length}/{availableSeries.length})
                  </span>
                )}
              </div>
            </div>

            {/* Exam Series Interactive Pills */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cellAggs.map(({ series, agg }) => {
                const label = getSeriesLabelForBoard(series, boardId, true);
                if (agg.displayAttempt) {
                  const tone = getGradeTone(agg.displayAttempt.derivedGrade);
                  return (
                    <button
                      key={series.id}
                      type="button"
                      data-card-cell={`${row.id}::${series.id}`}
                      onClick={() => onSelectCell(row, series)}
                      className="flex flex-col items-start gap-1 rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:border-border-hover hover:bg-surface-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-bold text-foreground-muted">
                          {label}
                        </span>
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none',
                            GRADE_STYLE[tone]
                          )}
                        >
                          {agg.displayAttempt.derivedGrade}
                        </span>
                      </div>
                      <div className="flex w-full items-baseline justify-between gap-1 font-mono tabular-nums">
                        <span className="text-xs font-bold text-foreground">
                          {agg.displayAttempt.rawScore}/{row.maxRaw}
                        </span>
                        <span className="text-[10px] text-foreground-muted">
                          {agg.displayAttempt.umsOrPumLabel === 'UMS'
                            ? `${agg.displayAttempt.derivedUmsOrPum} UMS`
                            : `${agg.displayAttempt.percentage}%`}
                        </span>
                      </div>
                    </button>
                  );
                }

                return (
                  <button
                    key={series.id}
                    type="button"
                    data-card-cell={`${row.id}::${series.id}`}
                    onClick={() => onSelectCell(row, series)}
                    className="flex flex-col items-start justify-between gap-1 rounded-md border border-dashed border-border bg-background/50 p-2.5 text-left text-foreground-muted transition-colors hover:border-border-hover hover:bg-surface-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-mono text-[11px] font-semibold">
                      {label}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-on-primary-tint">
                      <Plus className="h-3 w-3" aria-hidden="true" />
                      <span>Log score</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Latest Reflection / Weak Topics Preview + Quick Log CTA */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3 text-xs">
              {latestNoteAttempt ? (
                <div className="min-w-0 flex-1 space-y-1">
                  {latestNoteAttempt.notes && (
                    <p className="flex items-center gap-1.5 truncate text-foreground-muted">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="truncate">{latestNoteAttempt.notes}</span>
                    </p>
                  )}
                  {latestNoteAttempt.weakTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {latestNoteAttempt.weakTopics.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-border bg-surface-inset px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>No reflection logged yet</span>
                </span>
              )}

              <button
                type="button"
                onClick={() =>
                  onSelectCell(row, availableSeries[0] ?? seriesList[0]!)
                }
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-primary-tint-border bg-primary-tint px-2.5 text-xs font-semibold text-on-primary-tint transition-colors hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Log Attempt</span>
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

