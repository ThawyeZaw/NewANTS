/**
 * Study Past Paper Tracker Engine & Persistence (`[ZYY-4.4]`).
 *
 * Pure TypeScript module with zero React, Next.js, or database dependencies.
 * Handles Variant × Exam Series matrix derivation, raw mark -> grade & UMS/PUM boundary lookups,
 * timed vs untimed attempts, best/latest cell aggregation, XP rewards (`+25 XP` first clear,
 * `+15 XP` personal-best improvement), trend calculation, and defensive localStorage persistence
 * (`ants-study-papers-v1`) ready for `[THAW-4.3]` D1 wiring.
 */

import type { CurriculumBoardId, CurriculumSubjectItem } from './curriculum';

export const STUDY_PAPERS_STORAGE_KEY = 'ants-study-papers-v1';
export const PAPER_FIRST_LOG_XP = 25;
export const PAPER_PB_IMPROVEMENT_XP = 15;

export type PastPaperSeriesId =
  | 'mj-2025'
  | 'jan-fm-2025'
  | 'on-2024'
  | 'mj-2024'
  | 'jan-fm-2024'
  | 'on-2023';

export type PaperVariantGroup = 'all' | 'v1' | 'v2' | 'v3' | 'main' | 'regional';
export type PaperAttemptFilter = 'all' | 'logged' | 'unlogged';
export type PaperCellDisplayMode = 'best' | 'latest';
export type PastPaperLayoutMode = 'matrix' | 'cards';

export interface PastPaperSeriesMeta {
  id: PastPaperSeriesId;
  chronologicalIndex: number;
  edexcelLabel: string;
  edexcelShort: string;
  cambridgeLabel: string;
  cambridgeShort: string;
  sessionKind: 'summer' | 'winter' | 'autumn';
}

export interface PaperGradeCutoffs {
  /** Keyed by grade string: 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' or '9'..'4' */
  thresholds: Record<string, number>;
}

export interface PastPaperRowDefinition {
  id: string;
  subjectId: string;
  boardId: CurriculumBoardId;
  /** Matches Curriculum unit code for modular filtering (`WMA11`, `WPH11`, `0580/42`, `4MA1/2H`) */
  unitCode: string;
  /** Display paper code (`WMA11`, `0580/21`, `0580/42`, `4MA1/1HR`) */
  paperCode: string;
  shortLabel: string;
  title: string;
  variantGroup: Exclude<PaperVariantGroup, 'all'>;
  variantBadge: string;
  maxRaw: number;
  maxUms?: number;
  durationMinutes: number;
  isModularUms: boolean;
  gradingScale: 'A*-U' | '9-1';
  /** Some Cambridge sessions (e.g. Feb/Mar) only sit Variant 2 */
  availableSeriesIds?: PastPaperSeriesId[];
  /** Per-series raw mark grade thresholds */
  seriesBoundaries: Record<PastPaperSeriesId, PaperGradeCutoffs>;
}

export interface PastPaperAttempt {
  id: string;
  subjectId: string;
  rowId: string;
  paperCode: string;
  seriesId: PastPaperSeriesId;
  rawScore: number;
  maxRaw: number;
  percentage: number;
  derivedGrade: string;
  derivedUmsOrPum: number;
  umsOrPumLabel: 'UMS' | 'PUM';
  timed: boolean;
  durationMinutes: number;
  loggedAtIso: string;
  dateLabel: string;
  weakTopics: string[];
  notes: string;
}

export interface StudyPapersPersistedState {
  version: 1;
  attempts: PastPaperAttempt[];
  cellDisplayMode: PaperCellDisplayMode;
  xpAwardedCellKeys: string[];
  pbImprovedCount: number;
  earnedPaperXp: number;
}

export interface BoundaryRulerStop {
  grade: string;
  minRaw: number;
  umsOrPum: number;
}

export interface DerivedPaperScoreResult {
  rawScore: number;
  maxRaw: number;
  percentage: number;
  grade: string;
  umsOrPum: number;
  umsOrPumLabel: 'UMS' | 'PUM';
  isTopGrade: boolean;
  isPassing: boolean;
  nextGradeStop: {
    grade: string;
    minRaw: number;
    marksNeeded: number;
  } | null;
  topGradeStop: {
    grade: string;
    minRaw: number;
    margin: number;
  } | null;
  rulerStops: BoundaryRulerStop[];
}

export interface CellAggregationResult {
  attempts: PastPaperAttempt[];
  displayAttempt: PastPaperAttempt | null;
  bestAttempt: PastPaperAttempt | null;
  latestAttempt: PastPaperAttempt | null;
  attemptCount: number;
}

export interface SubjectPastPaperStats {
  totalAvailableCells: number;
  completedCells: number;
  coveragePercent: number;
  totalAttempts: number;
  averagePercent: number;
  averageUmsOrPum: number;
  umsOrPumLabel: 'UMS' | 'PUM';
  bestGrade: string | null;
  timedAttemptsCount: number;
  topGradeCellsCount: number;
}

export interface GlobalEnrolledPaperSummary {
  totalLoggedCells: number;
  totalAttempts: number;
  subjectsWithLogsCount: number;
  averagePercent: number;
  timedPercent: number;
}

export interface SeriesTrendPoint {
  seriesId: PastPaperSeriesId;
  shortLabel: string;
  fullLabel: string;
  averagePercent: number | null;
  averageUmsOrPum: number | null;
  loggedCount: number;
}

const A_LEVEL_ORDER = ['A*', 'A', 'B', 'C', 'D', 'E'] as const;
const NINE_TO_ONE_ORDER = ['9', '8', '7', '6', '5', '4'] as const;

const UMS_ANCHOR_PERCENT_BY_GRADE: Record<string, number> = {
  'A*': 90,
  A: 80,
  B: 70,
  C: 60,
  D: 50,
  E: 40,
  '9': 90,
  '8': 80,
  '7': 70,
  '6': 60,
  '5': 50,
  '4': 40,
};

export function getCellStorageKey(rowId: string, seriesId: PastPaperSeriesId): string {
  return `${rowId}::${seriesId}`;
}

export function getGradeOrderForScale(gradingScale: 'A*-U' | '9-1'): readonly string[] {
  return gradingScale === '9-1' ? NINE_TO_ONE_ORDER : A_LEVEL_ORDER;
}

export function getSeriesLabelForBoard(
  series: PastPaperSeriesMeta,
  boardId: CurriculumBoardId,
  short = false
): string {
  const isCambridge = boardId === 'cambridge-igcse' || boardId === 'cambridge-alevel';
  if (isCambridge) {
    return short ? series.cambridgeShort : series.cambridgeLabel;
  }
  return short ? series.edexcelShort : series.edexcelLabel;
}

export function isRowAvailableInSeries(
  row: PastPaperRowDefinition,
  seriesId: PastPaperSeriesId
): boolean {
  if (!row.availableSeriesIds || row.availableSeriesIds.length === 0) {
    return true;
  }
  return row.availableSeriesIds.includes(seriesId);
}

/**
 * Derives grade (`A*`–`U` or `9`–`1`), UMS (for modular Edexcel IAL) or PUM (0–100 standardized
 * scale for linear boards), percentage, and distance to adjacent grade boundaries.
 */
export function derivePaperResult(
  rawScoreInput: number,
  row: PastPaperRowDefinition,
  seriesId: PastPaperSeriesId
): DerivedPaperScoreResult {
  const safeRaw = Number.isFinite(rawScoreInput) ? Math.round(rawScoreInput) : 0;
  const rawScore = Math.max(0, Math.min(row.maxRaw, safeRaw));
  const percentage = row.maxRaw > 0 ? Math.round((rawScore / row.maxRaw) * 100) : 0;

  const cutoffs = row.seriesBoundaries[seriesId]?.thresholds ?? {};
  const orderedGrades = getGradeOrderForScale(row.gradingScale);
  const rulerStops: BoundaryRulerStop[] = orderedGrades
    .filter((grade) => typeof cutoffs[grade] === 'number')
    .map((grade) => {
      const minRaw = cutoffs[grade]!;
      const targetScale = row.isModularUms && row.maxUms ? row.maxUms : 100;
      const pctAnchor = UMS_ANCHOR_PERCENT_BY_GRADE[grade] ?? 40;
      return {
        grade,
        minRaw,
        umsOrPum: Math.round((pctAnchor / 100) * targetScale),
      };
    });

  let derivedGrade = 'U';
  for (const stop of rulerStops) {
    if (rawScore >= stop.minRaw) {
      derivedGrade = stop.grade;
      break;
    }
  }

  // Piecewise linear UMS / PUM interpolation across official threshold stops
  const targetScale = row.isModularUms && row.maxUms ? row.maxUms : 100;
  const umsOrPumLabel: 'UMS' | 'PUM' = row.isModularUms ? 'UMS' : 'PUM';

  let normalizedMetric = 0;
  if (rulerStops.length === 0 || row.maxRaw <= 0) {
    normalizedMetric = Math.round((rawScore / Math.max(1, row.maxRaw)) * targetScale);
  } else {
    const topStop = rulerStops[0]!;
    const bottomStop = rulerStops[rulerStops.length - 1]!;

    if (rawScore >= topStop.minRaw) {
      const topAnchor = topStop.umsOrPum;
      const span = Math.max(1, row.maxRaw - topStop.minRaw);
      const frac = Math.min(1, (rawScore - topStop.minRaw) / span);
      normalizedMetric = Math.round(topAnchor + frac * (targetScale - topAnchor));
    } else if (rawScore < bottomStop.minRaw) {
      const frac = rawScore / Math.max(1, bottomStop.minRaw);
      normalizedMetric = Math.round(frac * bottomStop.umsOrPum);
    } else {
      normalizedMetric = bottomStop.umsOrPum;
      for (let i = 0; i < rulerStops.length - 1; i += 1) {
        const upper = rulerStops[i]!;
        const lower = rulerStops[i + 1]!;
        if (rawScore >= lower.minRaw && rawScore < upper.minRaw) {
          const span = Math.max(1, upper.minRaw - lower.minRaw);
          const frac = (rawScore - lower.minRaw) / span;
          normalizedMetric = Math.round(
            lower.umsOrPum + frac * (upper.umsOrPum - lower.umsOrPum)
          );
          break;
        }
      }
    }
  }

  const umsOrPum = Math.max(0, Math.min(targetScale, normalizedMetric));
  const topStop = rulerStops[0] ?? null;

  let nextGradeStop: DerivedPaperScoreResult['nextGradeStop'] = null;
  for (let i = rulerStops.length - 1; i >= 0; i -= 1) {
    const stop = rulerStops[i]!;
    if (stop.minRaw > rawScore) {
      nextGradeStop = {
        grade: stop.grade,
        minRaw: stop.minRaw,
        marksNeeded: stop.minRaw - rawScore,
      };
      break;
    }
  }

  const passGrade = row.gradingScale === '9-1' ? '4' : 'C';
  const passIndex = orderedGrades.indexOf(passGrade);
  const derivedIndex = orderedGrades.indexOf(derivedGrade);
  const isPassing = derivedIndex !== -1 && (passIndex === -1 || derivedIndex <= passIndex);
  const isTopGrade = topStop !== null && derivedGrade === topStop.grade;

  return {
    rawScore,
    maxRaw: row.maxRaw,
    percentage,
    grade: derivedGrade,
    umsOrPum,
    umsOrPumLabel,
    isTopGrade,
    isPassing,
    nextGradeStop,
    topGradeStop: topStop
      ? {
          grade: topStop.grade,
          minRaw: topStop.minRaw,
          margin: rawScore - topStop.minRaw,
        }
      : null,
    rulerStops,
  };
}

/**
 * Ranks grade strings from highest (`A*` / `9`) to lowest (`U`) for comparison.
 */
export function compareGrades(
  a: string,
  b: string,
  gradingScale: 'A*-U' | '9-1'
): number {
  const order = [...getGradeOrderForScale(gradingScale), 'U'];
  const idxA = order.indexOf(a);
  const idxB = order.indexOf(b);
  const normA = idxA === -1 ? 999 : idxA;
  const normB = idxB === -1 ? 999 : idxB;
  return normA - normB;
}

export function getGradeTone(grade: string): 'top' | 'strong' | 'pass' | 'needs_work' {
  if (grade === 'A*' || grade === '9' || grade === '8') return 'top';
  if (grade === 'A' || grade === '7') return 'strong';
  if (grade === 'B' || grade === 'C' || grade === '6' || grade === '5' || grade === '4') {
    return 'pass';
  }
  return 'needs_work';
}

export function getCellAttempts(
  attempts: readonly PastPaperAttempt[],
  rowId: string,
  seriesId: PastPaperSeriesId,
  displayMode: PaperCellDisplayMode = 'best'
): CellAggregationResult {
  const matching = attempts
    .filter((a) => a.rowId === rowId && a.seriesId === seriesId)
    .sort((a, b) => a.loggedAtIso.localeCompare(b.loggedAtIso));

  if (matching.length === 0) {
    return {
      attempts: [],
      displayAttempt: null,
      bestAttempt: null,
      latestAttempt: null,
      attemptCount: 0,
    };
  }

  let bestAttempt = matching[0]!;
  for (const item of matching) {
    if (
      item.rawScore > bestAttempt.rawScore ||
      (item.rawScore === bestAttempt.rawScore &&
        item.loggedAtIso > bestAttempt.loggedAtIso)
    ) {
      bestAttempt = item;
    }
  }

  const latestAttempt = matching[matching.length - 1]!;
  const displayAttempt = displayMode === 'latest' ? latestAttempt : bestAttempt;

  return {
    attempts: matching,
    displayAttempt,
    bestAttempt,
    latestAttempt,
    attemptCount: matching.length,
  };
}

export interface LogPaperAttemptInput {
  rawScore: number;
  timed: boolean;
  durationMinutes: number;
  weakTopics?: string[];
  notes?: string;
  loggedAtIso?: string;
  dateLabel?: string;
}

export interface LogPaperAttemptOutcome {
  nextState: StudyPapersPersistedState;
  createdAttempt: PastPaperAttempt;
  xpEarned: number;
  xpReason: 'first_clear' | 'personal_best' | 'practice_logged';
}

export function logPaperAttempt(
  state: StudyPapersPersistedState,
  row: PastPaperRowDefinition,
  seriesId: PastPaperSeriesId,
  input: LogPaperAttemptInput
): LogPaperAttemptOutcome {
  const derived = derivePaperResult(input.rawScore, row, seriesId);
  const cellKey = getCellStorageKey(row.id, seriesId);
  const priorCell = getCellAttempts(state.attempts, row.id, seriesId, 'best');

  const safeDuration = Number.isFinite(input.durationMinutes)
    ? Math.max(1, Math.min(360, Math.round(input.durationMinutes)))
    : row.durationMinutes;

  const cleanTags = Array.from(
    new Set(
      (input.weakTopics ?? [])
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  ).slice(0, 6);

  const isoNow = input.loggedAtIso ?? new Date().toISOString();
  const dateLabel = input.dateLabel ?? formatAttemptDateLabel(isoNow);

  const createdAttempt: PastPaperAttempt = {
    id: `att_${row.id}_${seriesId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subjectId: row.subjectId,
    rowId: row.id,
    paperCode: row.paperCode,
    seriesId,
    rawScore: derived.rawScore,
    maxRaw: row.maxRaw,
    percentage: derived.percentage,
    derivedGrade: derived.grade,
    derivedUmsOrPum: derived.umsOrPum,
    umsOrPumLabel: derived.umsOrPumLabel,
    timed: Boolean(input.timed),
    durationMinutes: safeDuration,
    loggedAtIso: isoNow,
    dateLabel,
    weakTopics: cleanTags,
    notes: (input.notes ?? '').trim(),
  };

  let xpEarned = 0;
  let xpReason: LogPaperAttemptOutcome['xpReason'] = 'practice_logged';
  let nextAwardedKeys = state.xpAwardedCellKeys;
  let nextPbCount = state.pbImprovedCount;

  if (!state.xpAwardedCellKeys.includes(cellKey)) {
    xpEarned = PAPER_FIRST_LOG_XP;
    xpReason = 'first_clear';
    nextAwardedKeys = [...state.xpAwardedCellKeys, cellKey];
  } else if (priorCell.bestAttempt && derived.rawScore > priorCell.bestAttempt.rawScore) {
    xpEarned = PAPER_PB_IMPROVEMENT_XP;
    xpReason = 'personal_best';
    nextPbCount += 1;
  }

  const nextState: StudyPapersPersistedState = {
    ...state,
    attempts: [...state.attempts, createdAttempt],
    xpAwardedCellKeys: nextAwardedKeys,
    pbImprovedCount: nextPbCount,
    earnedPaperXp: state.earnedPaperXp + xpEarned,
  };

  return {
    nextState,
    createdAttempt,
    xpEarned,
    xpReason,
  };
}

export function deletePaperAttempt(
  state: StudyPapersPersistedState,
  attemptId: string
): StudyPapersPersistedState {
  return {
    ...state,
    attempts: state.attempts.filter((a) => a.id !== attemptId),
  };
}

export function setCellDisplayMode(
  state: StudyPapersPersistedState,
  mode: PaperCellDisplayMode
): StudyPapersPersistedState {
  return {
    ...state,
    cellDisplayMode: mode,
  };
}

export function filterPastPaperRows(
  rows: readonly PastPaperRowDefinition[],
  attempts: readonly PastPaperAttempt[],
  seriesList: readonly PastPaperSeriesMeta[],
  options: {
    subjectId: string;
    allowedUnitCodes?: readonly string[];
    unitFilter?: string;
    variantFilter?: PaperVariantGroup;
    attemptFilter?: PaperAttemptFilter;
    searchQuery?: string;
  }
): PastPaperRowDefinition[] {
  const {
    subjectId,
    allowedUnitCodes,
    unitFilter = 'all',
    variantFilter = 'all',
    attemptFilter = 'all',
    searchQuery = '',
  } = options;

  const allowedSet =
    allowedUnitCodes && allowedUnitCodes.length > 0
      ? new Set(allowedUnitCodes)
      : null;
  const q = searchQuery.trim().toLowerCase();

  return rows.filter((row) => {
    if (row.subjectId !== subjectId) return false;
    if (allowedSet && !allowedSet.has(row.unitCode)) return false;
    if (unitFilter !== 'all' && row.unitCode !== unitFilter) return false;
    if (variantFilter !== 'all' && row.variantGroup !== variantFilter) return false;

    const rowAttempts = attempts.filter((a) => a.rowId === row.id);
    if (attemptFilter === 'logged' && rowAttempts.length === 0) return false;
    if (
      attemptFilter === 'unlogged' &&
      seriesList.every(
        (s) =>
          !isRowAvailableInSeries(row, s.id) ||
          rowAttempts.some((a) => a.seriesId === s.id)
      )
    ) {
      return false;
    }

    if (!q) return true;

    const noteHit = rowAttempts.some(
      (a) =>
        a.notes.toLowerCase().includes(q) ||
        a.weakTopics.some((t) => t.toLowerCase().includes(q)) ||
        a.derivedGrade.toLowerCase() === q
    );

    return (
      row.paperCode.toLowerCase().includes(q) ||
      row.shortLabel.toLowerCase().includes(q) ||
      row.unitCode.toLowerCase().includes(q) ||
      row.title.toLowerCase().includes(q) ||
      row.variantBadge.toLowerCase().includes(q) ||
      noteHit
    );
  });
}

export function computeSubjectPaperStats(
  rows: readonly PastPaperRowDefinition[],
  seriesList: readonly PastPaperSeriesMeta[],
  attempts: readonly PastPaperAttempt[],
  subjectId: string,
  displayMode: PaperCellDisplayMode = 'best',
  allowedUnitCodes?: readonly string[]
): SubjectPastPaperStats {
  const allowedSet =
    allowedUnitCodes && allowedUnitCodes.length > 0
      ? new Set(allowedUnitCodes)
      : null;

  const subjectRows = rows.filter(
    (r) => r.subjectId === subjectId && (!allowedSet || allowedSet.has(r.unitCode))
  );

  let totalAvailableCells = 0;
  let completedCells = 0;
  let totalAttempts = 0;
  let pctSum = 0;
  let umsOrPumSum = 0;
  let topGradeCellsCount = 0;
  let bestGrade: string | null = null;
  const umsOrPumLabel: 'UMS' | 'PUM' =
    subjectRows[0]?.isModularUms ? 'UMS' : 'PUM';
  const gradingScale = subjectRows[0]?.gradingScale ?? 'A*-U';

  for (const row of subjectRows) {
    for (const s of seriesList) {
      if (!isRowAvailableInSeries(row, s.id)) continue;
      totalAvailableCells += 1;
      const cell = getCellAttempts(attempts, row.id, s.id, displayMode);
      totalAttempts += cell.attemptCount;
      if (cell.displayAttempt) {
        completedCells += 1;
        pctSum += cell.displayAttempt.percentage;
        umsOrPumSum += cell.displayAttempt.derivedUmsOrPum;

        const g = cell.displayAttempt.derivedGrade;
        if (g === 'A*' || g === '9') {
          topGradeCellsCount += 1;
        }
        if (bestGrade === null || compareGrades(g, bestGrade, gradingScale) < 0) {
          bestGrade = g;
        }
      }
    }
  }

  const rowIdSet = new Set(subjectRows.map((r) => r.id));
  const timedAttemptsCount = attempts.filter(
    (a) => rowIdSet.has(a.rowId) && a.timed
  ).length;

  return {
    totalAvailableCells,
    completedCells,
    coveragePercent:
      totalAvailableCells === 0
        ? 0
        : Math.round((completedCells / totalAvailableCells) * 100),
    totalAttempts,
    averagePercent: completedCells === 0 ? 0 : Math.round(pctSum / completedCells),
    averageUmsOrPum:
      completedCells === 0 ? 0 : Math.round(umsOrPumSum / completedCells),
    umsOrPumLabel,
    bestGrade,
    timedAttemptsCount,
    topGradeCellsCount,
  };
}

export function computeAllEnrolledPaperSummary(
  subjects: readonly CurriculumSubjectItem[],
  enrolledSubjectIds: readonly string[],
  attempts: readonly PastPaperAttempt[]
): GlobalEnrolledPaperSummary {
  const enrolledSet = new Set(enrolledSubjectIds);
  const relevantSubjects = subjects.filter((s) => enrolledSet.has(s.id));
  const relevantSubjectIds = new Set(relevantSubjects.map((s) => s.id));
  const relevantAttempts = attempts.filter((a) => relevantSubjectIds.has(a.subjectId));

  const uniqueCells = new Set<string>();
  const subjectsWithLogs = new Set<string>();
  let pctSum = 0;
  let timedCount = 0;

  for (const a of relevantAttempts) {
    uniqueCells.add(getCellStorageKey(a.rowId, a.seriesId));
    subjectsWithLogs.add(a.subjectId);
    pctSum += a.percentage;
    if (a.timed) timedCount += 1;
  }

  return {
    totalLoggedCells: uniqueCells.size,
    totalAttempts: relevantAttempts.length,
    subjectsWithLogsCount: subjectsWithLogs.size,
    averagePercent:
      relevantAttempts.length === 0
        ? 0
        : Math.round(pctSum / relevantAttempts.length),
    timedPercent:
      relevantAttempts.length === 0
        ? 0
        : Math.round((timedCount / relevantAttempts.length) * 100),
  };
}

export function computeSeriesTrendPoints(
  seriesList: readonly PastPaperSeriesMeta[],
  rows: readonly PastPaperRowDefinition[],
  attempts: readonly PastPaperAttempt[],
  subjectId: string,
  boardId: CurriculumBoardId,
  displayMode: PaperCellDisplayMode = 'best'
): SeriesTrendPoint[] {
  const subjectRows = rows.filter((r) => r.subjectId === subjectId);
  // Sort oldest -> newest so sparkline flows naturally left-to-right in time
  const chronological = [...seriesList].sort(
    (a, b) => a.chronologicalIndex - b.chronologicalIndex
  );

  return chronological.map((series) => {
    let sumPct = 0;
    let sumUms = 0;
    let loggedCount = 0;

    for (const row of subjectRows) {
      if (!isRowAvailableInSeries(row, series.id)) continue;
      const cell = getCellAttempts(attempts, row.id, series.id, displayMode);
      if (cell.displayAttempt) {
        sumPct += cell.displayAttempt.percentage;
        sumUms += cell.displayAttempt.derivedUmsOrPum;
        loggedCount += 1;
      }
    }

    return {
      seriesId: series.id,
      shortLabel: getSeriesLabelForBoard(series, boardId, true),
      fullLabel: getSeriesLabelForBoard(series, boardId, false),
      averagePercent: loggedCount === 0 ? null : Math.round(sumPct / loggedCount),
      averageUmsOrPum: loggedCount === 0 ? null : Math.round(sumUms / loggedCount),
      loggedCount,
    };
  });
}

function formatAttemptDateLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Today';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = String(parsed.getUTCDate()).padStart(2, '0');
  const m = months[parsed.getUTCMonth()] ?? 'Nov';
  return `${d} ${m}`;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const VALID_SERIES_SET = new Set<PastPaperSeriesId>([
  'mj-2025',
  'jan-fm-2025',
  'on-2024',
  'mj-2024',
  'jan-fm-2024',
  'on-2023',
]);

export function sanitizeStudyPapersState(
  raw: unknown,
  fallback: StudyPapersPersistedState
): StudyPapersPersistedState {
  if (!isObjectRecord(raw)) return fallback;

  const cellDisplayMode: PaperCellDisplayMode =
    raw.cellDisplayMode === 'latest' || raw.cellDisplayMode === 'best'
      ? raw.cellDisplayMode
      : fallback.cellDisplayMode;

  let attempts = fallback.attempts;
  if (Array.isArray(raw.attempts)) {
    const validAttempts: PastPaperAttempt[] = [];
    for (const item of raw.attempts) {
      if (!isObjectRecord(item)) continue;
      if (
        typeof item.id !== 'string' ||
        typeof item.subjectId !== 'string' ||
        typeof item.rowId !== 'string' ||
        typeof item.paperCode !== 'string' ||
        !VALID_SERIES_SET.has(item.seriesId as PastPaperSeriesId) ||
        typeof item.rawScore !== 'number' ||
        !Number.isFinite(item.rawScore) ||
        typeof item.maxRaw !== 'number' ||
        !Number.isFinite(item.maxRaw) ||
        item.maxRaw <= 0 ||
        typeof item.derivedGrade !== 'string'
      ) {
        continue;
      }

      const safeRaw = Math.max(0, Math.min(item.maxRaw, Math.round(item.rawScore)));
      const safePct =
        typeof item.percentage === 'number' && Number.isFinite(item.percentage)
          ? Math.max(0, Math.min(100, Math.round(item.percentage)))
          : Math.round((safeRaw / item.maxRaw) * 100);

      validAttempts.push({
        id: item.id,
        subjectId: item.subjectId,
        rowId: item.rowId,
        paperCode: item.paperCode,
        seriesId: item.seriesId as PastPaperSeriesId,
        rawScore: safeRaw,
        maxRaw: item.maxRaw,
        percentage: safePct,
        derivedGrade: item.derivedGrade,
        derivedUmsOrPum:
          typeof item.derivedUmsOrPum === 'number' && Number.isFinite(item.derivedUmsOrPum)
            ? Math.max(0, Math.round(item.derivedUmsOrPum))
            : safePct,
        umsOrPumLabel: item.umsOrPumLabel === 'UMS' ? 'UMS' : 'PUM',
        timed: typeof item.timed === 'boolean' ? item.timed : true,
        durationMinutes:
          typeof item.durationMinutes === 'number' && Number.isFinite(item.durationMinutes)
            ? Math.max(1, Math.min(360, Math.round(item.durationMinutes)))
            : 90,
        loggedAtIso:
          typeof item.loggedAtIso === 'string' && item.loggedAtIso
            ? item.loggedAtIso
            : '2026-11-10T10:00:00.000Z',
        dateLabel:
          typeof item.dateLabel === 'string' && item.dateLabel ? item.dateLabel : '10 Nov',
        weakTopics: Array.isArray(item.weakTopics)
          ? item.weakTopics.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          : [],
        notes: typeof item.notes === 'string' ? item.notes : '',
      });
    }
    attempts = validAttempts;
  }

  const xpAwardedCellKeys = Array.isArray(raw.xpAwardedCellKeys)
    ? Array.from(
        new Set(raw.xpAwardedCellKeys.filter((k): k is string => typeof k === 'string'))
      )
    : fallback.xpAwardedCellKeys;

  const pbImprovedCount =
    typeof raw.pbImprovedCount === 'number' && Number.isFinite(raw.pbImprovedCount)
      ? Math.max(0, Math.round(raw.pbImprovedCount))
      : fallback.pbImprovedCount;

  const earnedPaperXp =
    typeof raw.earnedPaperXp === 'number' && Number.isFinite(raw.earnedPaperXp)
      ? Math.max(0, Math.round(raw.earnedPaperXp))
      : fallback.earnedPaperXp;

  return {
    version: 1,
    attempts,
    cellDisplayMode,
    xpAwardedCellKeys,
    pbImprovedCount,
    earnedPaperXp,
  };
}

export function loadStudyPapersState(
  fallback: StudyPapersPersistedState
): StudyPapersPersistedState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STUDY_PAPERS_STORAGE_KEY);
    if (!raw) return fallback;
    return sanitizeStudyPapersState(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveStudyPapersState(state: StudyPapersPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDY_PAPERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

