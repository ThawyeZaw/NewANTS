'use client';

import React from 'react';
import { Clock, Plus } from 'lucide-react';
import { cn } from '@ants/ui';
import {
  getCellAttempts,
  getGradeTone,
  getSeriesLabelForBoard,
  isRowAvailableInSeries,
  type PaperCellDisplayMode,
  type PastPaperAttempt,
  type PastPaperRowDefinition,
  type PastPaperSeriesId,
  type PastPaperSeriesMeta,
} from '../../../lib/study/papers';
import type { CurriculumBoardId } from '../../../lib/study/curriculum';

export interface PastPaperMatrixViewProps {
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

export function PastPaperMatrixView({
  rows,
  seriesList,
  attempts,
  boardId,
  displayMode,
  onSelectCell,
}: PastPaperMatrixViewProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="past-paper-excel-matrix"
      className="overflow-hidden rounded-lg border border-border bg-surface-card shadow-[var(--shadow-tier-1)]"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-inset/70">
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[215px] border-r border-border bg-surface-inset px-4 py-3 font-bold uppercase tracking-wider text-foreground"
              >
                <span>Paper / Variant</span>
                <span className="mt-0.5 block font-mono text-[10px] font-medium normal-case tracking-normal text-foreground-muted">
                  Click any cell to log or review attempts
                </span>
              </th>

              {seriesList.map((series) => (
                <th
                  key={series.id}
                  scope="col"
                  className="min-w-[106px] border-r border-border px-2.5 py-3 text-center font-mono font-bold text-foreground"
                >
                  <span>{getSeriesLabelForBoard(series, boardId, true)}</span>
                  <span className="mt-0.5 block text-[10px] font-normal text-foreground-muted">
                    {series.sessionKind === 'summer'
                      ? 'Summer'
                      : series.sessionKind === 'winter'
                        ? 'Winter'
                        : 'Autumn'}
                  </span>
                </th>
              ))}

              <th
                scope="col"
                className="min-w-[96px] px-3 py-3 text-center font-mono font-bold text-foreground"
              >
                <span>Row Avg</span>
                <span className="mt-0.5 block text-[10px] font-normal text-foreground-muted">
                  {displayMode === 'best' ? 'Best mode' : 'Latest'}
                </span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              let rowPctSum = 0;
              let rowLoggedCount = 0;

              return (
                <tr
                  key={row.id}
                  data-matrix-row={row.id}
                  className="group transition-colors hover:bg-surface-inset/35"
                >
                  {/* Sticky Paper / Variant Identity Cell */}
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-border bg-surface-card px-4 py-2.5 text-left align-middle font-normal transition-colors group-hover:bg-surface-inset/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded border border-primary-tint-border bg-primary-tint px-1.5 py-0.5 font-mono text-[11px] font-bold text-on-primary-tint">
                        {row.paperCode}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-foreground-muted">
                        {row.maxRaw}m
                        {row.maxUms ? ` · ${row.maxUms} UMS` : ''}
                      </span>
                    </div>
                    <p className="mt-1 truncate max-w-[200px] text-xs font-semibold text-foreground">
                      {row.shortLabel} — {row.title}
                    </p>
                    <p className="font-mono text-[10px] text-foreground-muted">
                      {row.variantBadge} · {row.durationMinutes} min
                    </p>
                  </th>

                  {/* Chronological Exam Series Cells */}
                  {seriesList.map((series) => {
                    const available = isRowAvailableInSeries(row, series.id);
                    if (!available) {
                      return (
                        <td
                          key={series.id}
                          className="border-r border-border bg-surface-inset/30 px-2 py-2.5 text-center align-middle"
                          title="Not sat in this regional zone session (Feb/Mar is Variant 2 only)"
                        >
                          <span className="font-mono text-[10px] text-foreground-subtle">
                            N/A
                          </span>
                        </td>
                      );
                    }

                    const agg = getCellAttempts(
                      attempts,
                      row.id,
                      series.id,
                      displayMode
                    );

                    if (agg.displayAttempt) {
                      rowPctSum += agg.displayAttempt.percentage;
                      rowLoggedCount += 1;
                      const tone = getGradeTone(agg.displayAttempt.derivedGrade);

                      return (
                        <td
                          key={series.id}
                          className="border-r border-border p-1.5 text-center align-middle"
                        >
                          <button
                            type="button"
                            data-matrix-cell={`${row.id}::${series.id}`}
                            onClick={() => onSelectCell(row, series)}
                            aria-label={`${row.paperCode} ${getSeriesLabelForBoard(series, boardId)} scored ${agg.displayAttempt.rawScore} out of ${row.maxRaw}, grade ${agg.displayAttempt.derivedGrade}`}
                            className="flex w-full flex-col items-center gap-1 rounded-md border border-transparent px-1.5 py-1.5 transition-colors hover:border-border-hover hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  'rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none',
                                  GRADE_STYLE[tone]
                                )}
                              >
                                {agg.displayAttempt.derivedGrade}
                              </span>
                              <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                                {agg.displayAttempt.rawScore}
                                <span className="font-normal text-foreground-muted">
                                  /{row.maxRaw}
                                </span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums text-foreground-muted">
                              <span>
                                {agg.displayAttempt.umsOrPumLabel === 'UMS'
                                  ? `${agg.displayAttempt.derivedUmsOrPum} UMS`
                                  : `${agg.displayAttempt.percentage}%`}
                              </span>
                              {agg.displayAttempt.timed && (
                                <Clock
                                  className="h-2.5 w-2.5 text-primary"
                                  aria-label="Timed attempt"
                                />
                              )}
                              {agg.attemptCount > 1 && (
                                <span className="rounded bg-surface-inset px-1 font-bold text-foreground">
                                  ×{agg.attemptCount}
                                </span>
                              )}
                            </div>
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={series.id}
                        className="border-r border-border p-1.5 text-center align-middle"
                      >
                        <button
                          type="button"
                          data-matrix-cell={`${row.id}::${series.id}`}
                          onClick={() => onSelectCell(row, series)}
                          aria-label={`Log score for ${row.paperCode} ${getSeriesLabelForBoard(series, boardId)}`}
                          className="group/cell flex h-12 w-full items-center justify-center rounded-md border border-dashed border-transparent text-foreground-subtle transition-colors hover:border-border-hover hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="font-mono text-xs group-hover/cell:hidden">
                            —
                          </span>
                          <span className="hidden items-center gap-1 font-mono text-[11px] font-semibold text-on-primary-tint group-hover/cell:inline-flex">
                            <Plus className="h-3 w-3" aria-hidden="true" />
                            <span>Log</span>
                          </span>
                        </button>
                      </td>
                    );
                  })}

                  {/* Row Summary Average Cell */}
                  <td className="px-3 py-2.5 text-center align-middle font-mono tabular-nums">
                    {rowLoggedCount > 0 ? (
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          {Math.round(rowPctSum / rowLoggedCount)}%
                        </span>
                        <span className="block text-[10px] text-foreground-muted">
                          {rowLoggedCount} sat
                        </span>
                      </div>
                    ) : (
                      <span className="text-foreground-subtle">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Column Summary Footer Row */}
          <tfoot>
            <tr className="border-t border-border bg-surface-inset/60 font-mono text-[11px] tabular-nums">
              <th
                scope="row"
                className="sticky left-0 z-10 border-r border-border bg-surface-inset px-4 py-2.5 text-left font-bold uppercase tracking-wider text-foreground-muted"
              >
                Series Average
              </th>
              {seriesList.map((series: { id: PastPaperSeriesId }) => {
                let sumPct = 0;
                let count = 0;
                for (const row of rows) {
                  if (!isRowAvailableInSeries(row, series.id)) continue;
                  const agg = getCellAttempts(
                    attempts,
                    row.id,
                    series.id,
                    displayMode
                  );
                  if (agg.displayAttempt) {
                    sumPct += agg.displayAttempt.percentage;
                    count += 1;
                  }
                }
                return (
                  <td
                    key={series.id}
                    className="border-r border-border px-2 py-2.5 text-center font-semibold text-foreground"
                  >
                    {count > 0 ? (
                      <span>
                        {Math.round(sumPct / count)}%{' '}
                        <span className="font-normal text-foreground-muted">
                          ({count})
                        </span>
                      </span>
                    ) : (
                      <span className="text-foreground-subtle">—</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2.5 text-center font-bold text-foreground-muted">
                All
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

