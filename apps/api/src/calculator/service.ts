import type { D1Database } from '@cloudflare/workers-types';
import {
  EDEXCEL_IAL_FM_CORE_UNITS,
  EDEXCEL_IAL_NO_OCT_NOV_UNITS,
  calculateEdexcelMathsSuite,
  calculateRouteGrade,
  calculateSubjectGrade,
  getGradeOrder,
  isDirectUmsOnlySubject,
  isOctNovSeriesId,
  summarizeThresholdsToLegacyCutoffs,
  supportsDirectUms,
  type EdexcelMathsSuiteResult,
  type EngineAStarRule,
  type EngineGradeThreshold,
  type SubjectCalculationResult,
} from '@ants/calculator/engine';
import {
  and,
  asc,
  createDb,
  curriculums,
  desc,
  eq,
  gradeEntries,
  inArray,
  nowIso,
  paperGradeBoundaries,
  pastPapers,
  subjectGradeBoundaries,
  subjects,
} from '@ants/db';
import {
  CALCULATOR_BOARD_IDS,
  CURRICULUM_BOARD_IDS,
  CalculatorAStarRuleSchema,
  CalculatorBoundarySourceSchema,
  CalculatorModeSchema,
  CalculatorPaperLevelSchema,
  EDEXCEL_MATHS_UNIT_CODES,
  toCalculatorBoardId,
  toCurriculumBoardId,
  type CalculatorAStarRule,
  type CalculatorBoardDto,
  type CalculatorBoardId,
  type CalculatorBoundarySource,
  type CalculatorCalculateInput,
  type CalculatorMode,
  type CalculatorPaperDto,
  type CalculatorPaperLevel,
  type CalculatorRouteOption,
  type CalculatorSavedSnapshotDto,
  type CalculatorSeriesDto,
  type CalculatorSubjectDto,
  type CurriculumBoardId,
  type EdexcelMathsCashInCode,
  type EdexcelMathsSuiteCalculateInput,
  type EdexcelMathsUnitCode,
  type GradeCalculationSnapshot,
} from '@ants/shared-types';

export class CalculatorServiceError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 500 | 503;
  readonly code: string;

  constructor(
    status: 400 | 401 | 403 | 404 | 500 | 503,
    code: string,
    message: string
  ) {
    super(message);
    this.name = 'CalculatorServiceError';
    this.status = status;
    this.code = code;
  }
}

export interface CalculatorCatalogData {
  boards: CalculatorBoardDto[];
  seriesOptions: CalculatorSeriesDto[];
  subjects: CalculatorSubjectDto[];
  source: 'd1';
}

export interface CalculatorComputeResponse extends SubjectCalculationResult {
  subjectId: string;
  boardId: CalculatorBoardId;
  subjectCode: string;
  subjectTitle: string;
  seriesId: string;
}

export interface CalculatorMathsSuiteResponse extends EdexcelMathsSuiteResult {
  subjectId: string;
  boardId: CalculatorBoardId;
}

interface StoredPaperMeta {
  order?: number;
  defaultRaw?: number;
  level?: string;
  seriesMaxRaw?: Record<string, number>;
}

interface StoredRouteMeta {
  id: string;
  label: string;
  awardLevel: 'IGCSE' | 'AS' | 'AL' | 'IAL';
  cashInCode?: string;
  tier?: 'Extended' | 'Core' | 'Higher' | 'Foundation';
  variant?: 'V1' | 'V2' | 'V3' | 'Standard' | 'R';
  pathwayLabel?: string;
  paperIds: string[];
  paperWeights?: Record<string, number>;
  maxTotalScore: number;
  isModularUms: boolean;
  gradingScale: 'A*-U' | '9-1';
  allowedGrades?: string[];
  aStarRule?: CalculatorAStarRule;
  availableSeriesIds?: string[];
}

interface StoredQualificationData {
  levelLabel?: string;
  isModularUms?: boolean;
  displayOrder?: number;
  calculatorMode?: string;
  asAwardCode?: string;
  aLevelAwardCode?: string;
  boundarySource?: string;
  defaultRouteId?: string;
  aStarRule?: CalculatorAStarRule;
  paperMeta?: Record<string, StoredPaperMeta>;
  routesMeta?: StoredRouteMeta[];
}

function seriesSortKey(seriesId: string): number {
  const parts = seriesId.split('-');
  const yr = Number(parts[parts.length - 1]) || 0;
  const tag = parts[0] ?? '';
  const seasonOrder =
    tag === 'on' ? 4 : tag === 'mj' ? 3 : tag === 'fm' ? 2 : tag === 'jan' ? 1 : 0;
  return yr * 10 + seasonOrder;
}

function parseJsonValue<T>(raw: unknown, fallback: T): T {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

function inferSeriesTag(seriesId: string, label: string): string {
  if (seriesId.startsWith('mj-') || /may|june/i.test(label)) return 'Summer';
  if (seriesId.startsWith('jan-') || seriesId.startsWith('fm-') || /jan|feb|mar/i.test(label)) {
    return 'Winter';
  }
  if (seriesId.startsWith('on-') || /oct|nov/i.test(label)) return 'Autumn';
  return 'Session';
}

function normalizeBoardFilter(rawBoardId?: string): CurriculumBoardId | null {
  const trimmed = rawBoardId?.trim();
  if (!trimmed) return null;

  const isKnownCalculator = (CALCULATOR_BOARD_IDS as readonly string[]).includes(trimmed);
  const isKnownCurriculum = (CURRICULUM_BOARD_IDS as readonly string[]).includes(trimmed);
  if (!isKnownCalculator && !isKnownCurriculum) {
    throw new CalculatorServiceError(
      400,
      'INVALID_BOARD_ID',
      `Unknown exam board '${trimmed}'. Expected one of: ${CALCULATOR_BOARD_IDS.join(', ')}.`
    );
  }
  return toCurriculumBoardId(trimmed as CalculatorBoardId | CurriculumBoardId);
}

function resolvePaperLevel(
  metaLevel: string | undefined,
  variantGroup: string
): CalculatorPaperLevel | undefined {
  const candidate = (metaLevel ?? variantGroup).toUpperCase();
  const parsed = CalculatorPaperLevelSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function sortThresholdsDescending(
  thresholdsMap: Record<string, number>,
  gradingScale: 'A*-U' | '9-1',
  allowedGrades?: readonly string[]
): EngineGradeThreshold[] {
  const hasFG = 'F' in thresholdsMap || 'G' in thresholdsMap;
  const order = getGradeOrder(gradingScale, { includeFG: hasFG, allowedGrades });
  const allowedSet = allowedGrades && allowedGrades.length > 0 ? new Set(allowedGrades) : null;
  return Object.entries(thresholdsMap)
    .filter(
      ([grade, score]) =>
        (!allowedSet || allowedSet.has(grade)) &&
        typeof score === 'number' &&
        Number.isFinite(score)
    )
    .map(([grade, minScore]) => ({ grade, minScore }))
    .sort((a, b) => {
      if (b.minScore !== a.minScore) return b.minScore - a.minScore;
      const idxA = order.indexOf(a.grade);
      const idxB = order.indexOf(b.grade);
      const rankA = idxA === -1 ? order.length + 1 : idxA;
      const rankB = idxB === -1 ? order.length + 1 : idxB;
      return rankA - rankB;
    });
}

async function fetchPaperBoundariesChunked(
  db: ReturnType<typeof createDb>,
  paperIds: string[]
) {
  if (paperIds.length === 0) return [];
  const rows: Array<typeof paperGradeBoundaries.$inferSelect> = [];
  const CHUNK_SIZE = 40;
  for (let i = 0; i < paperIds.length; i += CHUNK_SIZE) {
    const chunk = paperIds.slice(i, i + CHUNK_SIZE);
    const batchRows = await db
      .select()
      .from(paperGradeBoundaries)
      .where(inArray(paperGradeBoundaries.pastPaperId, chunk));
    rows.push(...batchRows);
  }
  return rows;
}

function parseSeriesVariantKey(rawSeriesId: string): { seriesId: string; variant?: string } {
  const idx = rawSeriesId.indexOf(':');
  if (idx === -1) return { seriesId: rawSeriesId };
  const seriesId = rawSeriesId.slice(0, idx);
  const variant = rawSeriesId.slice(idx + 1).trim();
  return variant ? { seriesId, variant } : { seriesId };
}

function buildSubjectDtos(params: {
  subjectRows: Array<typeof subjects.$inferSelect>;
  curriculumById: Map<string, typeof curriculums.$inferSelect>;
  paperRows: Array<typeof pastPapers.$inferSelect>;
  subjectBoundaryRows: Array<typeof subjectGradeBoundaries.$inferSelect>;
  paperBoundaryRows: Array<typeof paperGradeBoundaries.$inferSelect>;
  seriesFilter?: string;
}): { subjects: CalculatorSubjectDto[]; seriesMap: Map<string, CalculatorSeriesDto> } {
  const {
    subjectRows,
    curriculumById,
    paperRows,
    subjectBoundaryRows,
    paperBoundaryRows,
    seriesFilter,
  } = params;

  const papersBySubjectId = new Map<string, Array<typeof pastPapers.$inferSelect>>();
  for (const paper of paperRows) {
    const list = papersBySubjectId.get(paper.subjectId) ?? [];
    list.push(paper);
    papersBySubjectId.set(paper.subjectId, list);
  }

  const subjectBoundariesBySubjectId = new Map<
    string,
    Array<typeof subjectGradeBoundaries.$inferSelect>
  >();
  for (const row of subjectBoundaryRows) {
    if (seriesFilter && row.seriesId !== seriesFilter) continue;
    const list = subjectBoundariesBySubjectId.get(row.subjectId) ?? [];
    list.push(row);
    subjectBoundariesBySubjectId.set(row.subjectId, list);
  }

  const paperBoundariesByPaperId = new Map<
    string,
    Array<typeof paperGradeBoundaries.$inferSelect>
  >();
  for (const row of paperBoundaryRows) {
    const { seriesId } = parseSeriesVariantKey(row.seriesId);
    if (seriesFilter && seriesId !== seriesFilter) continue;
    const list = paperBoundariesByPaperId.get(row.pastPaperId) ?? [];
    list.push(row);
    paperBoundariesByPaperId.set(row.pastPaperId, list);
  }

  const seriesMap = new Map<string, CalculatorSeriesDto>();
  const enrichedSubjects: Array<{ order: number; dto: CalculatorSubjectDto }> = [];

  for (const subj of subjectRows) {
    const curr = curriculumById.get(subj.curriculumId);
    if (!curr) continue;

    const qualData = parseJsonValue<StoredQualificationData>(subj.qualificationDataJson, {});
    const boardId = toCalculatorBoardId(curr.code as CurriculumBoardId);
    const isModularUms = Boolean(qualData.isModularUms ?? subj.totalUms !== null);
    const levelLabel = qualData.levelLabel || subj.summary || `${subj.totalRawMarks} Marks`;
    const displayOrder = typeof qualData.displayOrder === 'number' ? qualData.displayOrder : 999;

    const parsedMode = qualData.calculatorMode
      ? CalculatorModeSchema.safeParse(qualData.calculatorMode)
      : null;
    const calculatorMode: CalculatorMode | undefined =
      parsedMode && parsedMode.success ? parsedMode.data : undefined;

    const parsedSource = qualData.boundarySource
      ? CalculatorBoundarySourceSchema.safeParse(qualData.boundarySource)
      : null;
    const boundarySource: CalculatorBoundarySource | undefined =
      parsedSource && parsedSource.success ? parsedSource.data : undefined;

    const parsedAStar = qualData.aStarRule
      ? CalculatorAStarRuleSchema.safeParse(qualData.aStarRule)
      : null;
    const aStarRule: EngineAStarRule | undefined =
      parsedAStar && parsedAStar.success ? parsedAStar.data : undefined;

    const subjBoundaryRows = subjectBoundariesBySubjectId.get(subj.id) ?? [];
    const boundsByCashIn = new Map<string, Record<string, EngineGradeThreshold[]>>();
    const flatSeriesBoundaries: Record<string, EngineGradeThreshold[]> = {};

    for (const sgb of subjBoundaryRows) {
      const thresholdsMap = parseJsonValue<Record<string, number>>(sgb.thresholdsJson, {});
      const cashInKey = sgb.cashInCode?.trim() || '__default__';
      const existing = boundsByCashIn.get(cashInKey) ?? {};

      const routeMetaMatch = qualData.routesMeta?.find((r) => r.id === cashInKey);
      const sorted = sortThresholdsDescending(
        thresholdsMap,
        routeMetaMatch?.gradingScale ?? subj.gradingScale,
        routeMetaMatch?.allowedGrades
      );
      existing[sgb.seriesId] = sorted;
      boundsByCashIn.set(cashInKey, existing);

      if (!flatSeriesBoundaries[sgb.seriesId]) {
        flatSeriesBoundaries[sgb.seriesId] = sorted;
      }

      if (!seriesMap.has(sgb.seriesId)) {
        seriesMap.set(sgb.seriesId, {
          id: sgb.seriesId,
          label: sgb.seriesLabel,
          tag: inferSeriesTag(sgb.seriesId, sgb.seriesLabel),
        });
      }
    }

    const routes: CalculatorRouteOption[] | undefined =
      qualData.routesMeta && qualData.routesMeta.length > 0
        ? qualData.routesMeta
            .map((meta) => {
              const matched =
                boundsByCashIn.get(meta.id) ??
                (qualData.routesMeta!.length === 1 ? boundsByCashIn.get('__default__') : undefined) ??
                {};
              const availIds =
                meta.availableSeriesIds && !seriesFilter
                  ? meta.availableSeriesIds.filter((id) => Boolean(matched[id]))
                  : Object.keys(matched).sort((a, b) => seriesSortKey(b) - seriesSortKey(a));
              const parsedRouteAStar = meta.aStarRule
                ? CalculatorAStarRuleSchema.safeParse(meta.aStarRule)
                : null;
              return {
                id: meta.id,
                label: meta.label,
                awardLevel: meta.awardLevel,
                ...(meta.cashInCode ? { cashInCode: meta.cashInCode } : {}),
                ...(meta.tier ? { tier: meta.tier } : {}),
                ...(meta.variant ? { variant: meta.variant } : {}),
                ...(meta.pathwayLabel ? { pathwayLabel: meta.pathwayLabel } : {}),
                paperIds: meta.paperIds,
                ...(meta.paperWeights ? { paperWeights: meta.paperWeights } : {}),
                maxTotalScore: meta.maxTotalScore,
                isModularUms: meta.isModularUms,
                gradingScale: meta.gradingScale,
                ...(meta.allowedGrades ? { allowedGrades: meta.allowedGrades } : {}),
                ...(parsedRouteAStar && parsedRouteAStar.success
                  ? { aStarRule: parsedRouteAStar.data }
                  : {}),
                availableSeriesIds: availIds,
                seriesBoundaries: matched,
              };
            })
            .filter((r) => !seriesFilter || Object.keys(r.seriesBoundaries).length > 0)
        : undefined;

    if (seriesFilter) {
      const hasAnyRouteBounds =
        routes !== undefined ? routes.length > 0 : Object.keys(flatSeriesBoundaries).length > 0;
      if (!hasAnyRouteBounds) continue;
    }

    const defaultRoute =
      (qualData.defaultRouteId && routes
        ? routes.find((r) => r.id === qualData.defaultRouteId)
        : undefined) ?? routes?.[0];

    const seriesBoundaries =
      defaultRoute && Object.keys(defaultRoute.seriesBoundaries).length > 0
        ? defaultRoute.seriesBoundaries
        : flatSeriesBoundaries;

    const paperMeta = qualData.paperMeta ?? {};
    const subjPapers = [...(papersBySubjectId.get(subj.id) ?? [])].sort((a, b) => {
      const orderA = paperMeta[a.id]?.order ?? 999;
      const orderB = paperMeta[b.id]?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.paperCode.localeCompare(b.paperCode);
    });

    if (subjPapers.length === 0) continue;

    const paperDtos: CalculatorPaperDto[] = subjPapers.map((p) => {
      const meta = paperMeta[p.id];
      const pBounds = paperBoundariesByPaperId.get(p.id) ?? [];
      const seriesThresholds: Record<string, Record<string, number>> = {};
      const seriesThresholdsByVariant: Record<
        string,
        Record<string, Record<string, number>>
      > = {};
      const seriesMaxRaw: Record<string, number> = { ...(meta?.seriesMaxRaw ?? {}) };
      const seriesPaperCutoffs: Record<
        string,
        { passC: number; gradeA: number; topGrade: number }
      > = {};

      for (const pb of pBounds) {
        const { seriesId, variant } = parseSeriesVariantKey(pb.seriesId);
        const thresholds = parseJsonValue<Record<string, number>>(pb.thresholdsJson, {});
        if (pb.maxRaw > 0 && pb.maxRaw !== p.maxRaw && seriesMaxRaw[seriesId] === undefined) {
          seriesMaxRaw[seriesId] = pb.maxRaw;
        }
        if (variant) {
          seriesThresholdsByVariant[variant] ??= {};
          seriesThresholdsByVariant[variant][seriesId] = thresholds;
          // Prefer V2 or Standard for default flat lookup, fallback to first seen
          if (!seriesThresholds[seriesId] || variant === 'V2' || variant === 'Standard') {
            seriesThresholds[seriesId] = thresholds;
          }
        } else {
          seriesThresholds[seriesId] = thresholds;
        }
      }

      for (const [sId, thresh] of Object.entries(seriesThresholds)) {
        const effMax = seriesMaxRaw[sId] ?? p.maxRaw;
        seriesPaperCutoffs[sId] = summarizeThresholdsToLegacyCutoffs(
          thresh,
          subj.gradingScale,
          effMax
        );
      }

      const defaultRaw =
        typeof meta?.defaultRaw === 'number'
          ? Math.max(0, Math.min(p.maxRaw, meta.defaultRaw))
          : Math.round(p.maxRaw * 0.8);

      const level = resolvePaperLevel(meta?.level, p.variantGroup);
      const parsedAvail = parseJsonValue<string[]>(p.availableSeriesJson, []);
      const availableSeriesIds =
        parsedAvail.length > 0
          ? parsedAvail
          : Object.keys(seriesThresholds).sort((a, b) => seriesSortKey(b) - seriesSortKey(a));

      return {
        id: p.id,
        code: p.paperCode,
        unitCode: p.unitCode,
        title: p.title,
        maxRaw: p.maxRaw,
        ...(Object.keys(seriesMaxRaw).length > 0 ? { seriesMaxRaw } : {}),
        ...(p.maxUms !== null ? { maxUms: p.maxUms } : {}),
        weightLabel: p.variantBadge,
        defaultRaw,
        ...(level ? { level } : {}),
        ...(availableSeriesIds.length > 0 ? { availableSeriesIds } : {}),
        seriesPaperCutoffs,
        seriesThresholds,
        ...(Object.keys(seriesThresholdsByVariant).length > 0
          ? { seriesThresholdsByVariant }
          : {}),
      };
    });

    enrichedSubjects.push({
      order: displayOrder,
      dto: {
        id: subj.id,
        boardId,
        code: subj.code,
        title: subj.title,
        levelLabel,
        gradingScale: subj.gradingScale,
        isModularUms,
        maxTotalRaw: subj.totalRawMarks,
        ...(subj.totalUms !== null ? { maxTotalUms: subj.totalUms } : {}),
        ...(calculatorMode ? { calculatorMode } : {}),
        ...(qualData.asAwardCode ? { asAwardCode: qualData.asAwardCode } : {}),
        ...(qualData.aLevelAwardCode ? { aLevelAwardCode: qualData.aLevelAwardCode } : {}),
        ...(boundarySource ? { boundarySource } : {}),
        ...(qualData.defaultRouteId ? { defaultRouteId: qualData.defaultRouteId } : {}),
        ...(aStarRule ? { aStarRule } : {}),
        papers: paperDtos,
        ...(routes && routes.length > 0 ? { routes } : {}),
        seriesBoundaries,
      },
    });
  }

  enrichedSubjects.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.dto.title.localeCompare(b.dto.title);
  });

  return {
    subjects: enrichedSubjects.map((item) => item.dto),
    seriesMap,
  };
}

/**
 * Loads the complete public Grade Calculator catalog strictly from Cloudflare D1.
 * Rejects with `503 CATALOG_NOT_SEEDED` if D1 has not been seeded yet (no mock fallback).
 */
export async function loadCalculatorCatalogFromD1(
  d1: D1Database,
  filters?: { boardId?: string; seriesId?: string }
): Promise<CalculatorCatalogData> {
  const db = createDb(d1);
  const targetCurriculumCode = normalizeBoardFilter(filters?.boardId);
  const seriesFilter = filters?.seriesId?.trim() || undefined;

  const allCurriculums = await db
    .select()
    .from(curriculums)
    .where(eq(curriculums.isActive, true))
    .orderBy(asc(curriculums.displayOrder));

  const allSubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.isActive, true));

  if (allCurriculums.length === 0 || allSubjects.length === 0) {
    throw new CalculatorServiceError(
      503,
      'CATALOG_NOT_SEEDED',
      'Calculator boundary catalog is not seeded in D1. Run pnpm db:migrate:local.'
    );
  }

  const filteredCurriculums = targetCurriculumCode
    ? allCurriculums.filter((c) => c.code === targetCurriculumCode)
    : allCurriculums;

  const curriculumById = new Map(filteredCurriculums.map((c) => [c.id, c]));
  const filteredSubjects = allSubjects.filter((s) => curriculumById.has(s.curriculumId));
  const subjectIds = filteredSubjects.map((s) => s.id);

  const boards: CalculatorBoardDto[] = filteredCurriculums.map((c) => ({
    id: toCalculatorBoardId(c.code as CurriculumBoardId),
    shortName: c.shortLabel,
    fullName: c.label,
    scaleBadge: c.summary,
  }));

  if (subjectIds.length === 0) {
    return {
      boards,
      seriesOptions: [],
      subjects: [],
      source: 'd1',
    };
  }

  // Avoid D1 100-bound-parameter limit: unfiltered catalog uses direct scans; filtered uses small chunking
  let paperRows: Array<typeof pastPapers.$inferSelect>;
  let subjectBoundaryRows: Array<typeof subjectGradeBoundaries.$inferSelect>;
  let paperBoundaryRows: Array<typeof paperGradeBoundaries.$inferSelect>;

  if (!targetCurriculumCode) {
    paperRows = await db.select().from(pastPapers);
    subjectBoundaryRows = await db.select().from(subjectGradeBoundaries);
    paperBoundaryRows = await db.select().from(paperGradeBoundaries);
  } else {
    paperRows = [];
    subjectBoundaryRows = [];
    for (let i = 0; i < subjectIds.length; i += 40) {
      const chunk = subjectIds.slice(i, i + 40);
      paperRows.push(
        ...(await db.select().from(pastPapers).where(inArray(pastPapers.subjectId, chunk)))
      );
      subjectBoundaryRows.push(
        ...(await db
          .select()
          .from(subjectGradeBoundaries)
          .where(inArray(subjectGradeBoundaries.subjectId, chunk)))
      );
    }
    paperBoundaryRows = await fetchPaperBoundariesChunked(
      db,
      paperRows.map((p) => p.id)
    );
  }

  const built = buildSubjectDtos({
    subjectRows: filteredSubjects,
    curriculumById,
    paperRows,
    subjectBoundaryRows,
    paperBoundaryRows,
    seriesFilter,
  });

  const seriesOptions = Array.from(built.seriesMap.values()).sort(
    (a, b) => seriesSortKey(b.id) - seriesSortKey(a.id)
  );

  return {
    boards,
    seriesOptions,
    subjects: built.subjects,
    source: 'd1',
  };
}

/**
 * Loads a single Grade Calculator subject DTO (with full routes & paper thresholds) from D1.
 */
export async function loadCalculatorSubjectByIdFromD1(
  d1: D1Database,
  subjectId: string
): Promise<CalculatorSubjectDto> {
  const db = createDb(d1);

  const [subjectRow] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.isActive, true)))
    .limit(1);

  if (!subjectRow) {
    throw new CalculatorServiceError(
      404,
      'SUBJECT_NOT_FOUND',
      `Calculator subject '${subjectId}' was not found in D1.`
    );
  }

  const [curriculumRow] = await db
    .select()
    .from(curriculums)
    .where(eq(curriculums.id, subjectRow.curriculumId))
    .limit(1);

  if (!curriculumRow) {
    throw new CalculatorServiceError(
      503,
      'CATALOG_NOT_SEEDED',
      'Curriculum metadata for this subject is missing in D1.'
    );
  }

  const paperRows = await db
    .select()
    .from(pastPapers)
    .where(eq(pastPapers.subjectId, subjectRow.id));
  const subjectBoundaryRows = await db
    .select()
    .from(subjectGradeBoundaries)
    .where(eq(subjectGradeBoundaries.subjectId, subjectRow.id));
  const paperBoundaryRows = await fetchPaperBoundariesChunked(
    db,
    paperRows.map((p) => p.id)
  );

  const built = buildSubjectDtos({
    subjectRows: [subjectRow],
    curriculumById: new Map([[curriculumRow.id, curriculumRow]]),
    paperRows,
    subjectBoundaryRows,
    paperBoundaryRows,
  });

  const subjectDto = built.subjects[0];
  if (!subjectDto) {
    throw new CalculatorServiceError(
      404,
      'SUBJECT_NOT_FOUND',
      `No papers found for subject '${subjectId}' in D1.`
    );
  }
  return subjectDto;
}

/**
 * Evaluates raw paper marks or direct UMS scores against authoritative D1 boundaries
 * using `@ants/calculator/engine`.
 */
export async function calculateFromD1(
  d1: D1Database,
  input: CalculatorCalculateInput
): Promise<CalculatorComputeResponse> {
  const subjectDto = await loadCalculatorSubjectByIdFromD1(d1, input.subjectId);
  const inputMode = input.inputMode === 'ums' ? 'ums' : 'raw';

  if (inputMode === 'ums' && !supportsDirectUms(subjectDto)) {
    throw new CalculatorServiceError(
      400,
      'INVALID_INPUT_MODE',
      `Direct UMS input is only supported for Pearson Edexcel IAL and Edexcel IGCSE subjects ('${subjectDto.code}' is Cambridge).`
    );
  }

  if (inputMode === 'raw' && isDirectUmsOnlySubject(subjectDto)) {
    throw new CalculatorServiceError(
      400,
      'DIRECT_UMS_ONLY',
      `Official raw mark boundaries are not yet stored for '${subjectDto.code}'. Enter Direct UMS instead (or convert raw marks via Pearson's official UMS converter).`
    );
  }

  let result: SubjectCalculationResult;
  let effectiveSeriesId = input.seriesId?.trim() || '';

  if (subjectDto.routes && subjectDto.routes.length > 0) {
    const requestedRouteId = input.routeId?.trim();
    const activeRoute = requestedRouteId
      ? subjectDto.routes.find(
          (r) =>
            r.id === requestedRouteId ||
            r.cashInCode?.toUpperCase() === requestedRouteId.toUpperCase()
        )
      : (subjectDto.defaultRouteId
          ? subjectDto.routes.find((r) => r.id === subjectDto.defaultRouteId)
          : undefined) ?? subjectDto.routes[0];

    if (!activeRoute) {
      throw new CalculatorServiceError(
        404,
        'ROUTE_NOT_FOUND',
        `Route '${requestedRouteId}' is not available for '${subjectDto.code}'.`
      );
    }

    if (inputMode === 'ums') {
      effectiveSeriesId =
        effectiveSeriesId && activeRoute.seriesBoundaries[effectiveSeriesId]
          ? effectiveSeriesId
          : (Object.keys(activeRoute.seriesBoundaries)[0] ?? 'direct-ums');
    } else {
      if (!effectiveSeriesId) {
        throw new CalculatorServiceError(
          400,
          'SERIES_REQUIRED',
          `An exam series is required when calculating from raw marks for '${subjectDto.code}'.`
        );
      }
      const routeBounds = activeRoute.seriesBoundaries[effectiveSeriesId];
      if (!routeBounds || routeBounds.length === 0) {
        throw new CalculatorServiceError(
          404,
          'SERIES_NOT_FOUND',
          `Exam series '${effectiveSeriesId}' is not available for '${subjectDto.code}' (${activeRoute.label}).`
        );
      }
    }

    result = calculateRouteGrade(
      subjectDto,
      activeRoute,
      effectiveSeriesId,
      input.rawMarksByPaper ?? {},
      input.perPaperSeriesById,
      {
        inputMode,
        umsMarksByPaper: input.umsMarksByPaper,
      }
    );
  } else {
    if (inputMode === 'ums') {
      effectiveSeriesId =
        effectiveSeriesId && subjectDto.seriesBoundaries[effectiveSeriesId]
          ? effectiveSeriesId
          : (Object.keys(subjectDto.seriesBoundaries)[0] ?? 'direct-ums');
    } else {
      if (!effectiveSeriesId) {
        throw new CalculatorServiceError(
          400,
          'SERIES_REQUIRED',
          `An exam series is required when calculating from raw marks for '${subjectDto.code}'.`
        );
      }
      const seriesBounds = subjectDto.seriesBoundaries[effectiveSeriesId];
      if (!seriesBounds || seriesBounds.length === 0) {
        throw new CalculatorServiceError(
          404,
          'SERIES_NOT_FOUND',
          `Exam series '${effectiveSeriesId}' is not available for '${subjectDto.code}'.`
        );
      }
    }
    result = calculateSubjectGrade(
      subjectDto,
      effectiveSeriesId,
      input.rawMarksByPaper ?? {},
      input.perPaperSeriesById,
      {
        inputMode,
        umsMarksByPaper: input.umsMarksByPaper,
      }
    );
  }

  return {
    subjectId: subjectDto.id,
    boardId: subjectDto.boardId,
    subjectCode: subjectDto.code,
    subjectTitle: subjectDto.title,
    seriesId: inputMode === 'ums' ? 'direct-ums' : effectiveSeriesId,
    ...result,
  };
}

/**
 * Evaluates simultaneous Pearson Edexcel IAL Mathematics + Further Mathematics
 * unit selections against authoritative D1 boundaries or Direct UMS inputs.
 */
export async function calculateEdexcelMathsSuiteFromD1(
  d1: D1Database,
  input: EdexcelMathsSuiteCalculateInput
): Promise<CalculatorMathsSuiteResponse> {
  const inputMode = input.inputMode === 'ums' ? 'ums' : 'raw';
  const defaultSeriesId = input.defaultSeriesId?.trim() || 'mj-2025';

  if (inputMode === 'raw') {
    for (const unitCode of input.selectedUnitCodes) {
      if (!EDEXCEL_IAL_NO_OCT_NOV_UNITS.includes(unitCode)) continue;
      const unitSeries = input.seriesByUnit?.[unitCode];
      if (unitSeries && isOctNovSeriesId(unitSeries)) {
        throw new CalculatorServiceError(
          400,
          'INVALID_SERIES_FOR_FURTHER_MATHS',
          `Edexcel IAL unit '${unitCode}' is only examined in January and May/June (not Oct/Nov).`
        );
      }
      if (!unitSeries && EDEXCEL_IAL_FM_CORE_UNITS.includes(unitCode) && isOctNovSeriesId(defaultSeriesId)) {
        throw new CalculatorServiceError(
          400,
          'INVALID_SERIES_FOR_FURTHER_MATHS',
          `Edexcel IAL Further Mathematics unit '${unitCode}' is not examined in Oct/Nov.`
        );
      }
    }
  }

  const suiteSubject = await loadCalculatorSubjectByIdFromD1(d1, 'edexcel-ial-maths');

  const suiteResult = calculateEdexcelMathsSuite({
    suiteSubject,
    selectedUnitCodes: input.selectedUnitCodes,
    inputMode,
    rawMarksByUnit: input.rawMarksByUnit ?? {},
    umsMarksByUnit: input.umsMarksByUnit,
    seriesByUnit: input.seriesByUnit,
    defaultSeriesId,
    awardMode: input.awardMode,
  });

  return {
    subjectId: suiteSubject.id,
    boardId: suiteSubject.boardId,
    ...suiteResult,
  };
}

function mapGradeEntryToDto(
  row: typeof gradeEntries.$inferSelect
): CalculatorSavedSnapshotDto {
  const rawMarks = parseJsonValue<Record<string, number>>(row.rawMarksJson, {});
  return {
    id: row.id,
    userId: row.userId ?? null,
    subjectId: row.subjectId ?? null,
    boardId: row.boardId as CalculatorBoardId | CurriculumBoardId,
    subjectCode: row.subjectCode,
    subjectTitle: row.subjectTitle,
    seriesId: row.seriesId,
    rawMarksByPaper: rawMarks,
    totalRaw: row.totalRaw,
    maxTotalRaw: row.maxTotalRaw,
    totalUms: row.totalUms ?? null,
    maxTotalUms: row.maxTotalUms ?? null,
    percentage: row.percentage,
    finalGrade: row.finalGrade,
    createdAt: row.createdAt,
  };
}

export async function listUserGradeSnapshots(
  d1: D1Database,
  userId: string,
  limit = 25
): Promise<CalculatorSavedSnapshotDto[]> {
  const db = createDb(d1);
  const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
  const rows = await db
    .select()
    .from(gradeEntries)
    .where(eq(gradeEntries.userId, userId))
    .orderBy(desc(gradeEntries.createdAt))
    .limit(safeLimit);

  return rows.map(mapGradeEntryToDto);
}

/**
 * Recomputes authoritative scores against D1 boundaries and persists a saved
 * grade snapshot to `grade_entries` for the authenticated user.
 */
export async function saveUserGradeSnapshot(
  d1: D1Database,
  userId: string,
  input: GradeCalculationSnapshot
): Promise<CalculatorSavedSnapshotDto> {
  const inputMode = input.inputMode === 'ums' ? 'ums' : 'raw';
  const mathCashIns = new Set<string>(['XMA01', 'YMA01', 'XFM01', 'YFM01']);
  const requestedCashIn =
    input.routeId && mathCashIns.has(input.routeId.toUpperCase())
      ? (input.routeId.toUpperCase() as EdexcelMathsCashInCode)
      : mathCashIns.has(input.subjectCode.toUpperCase())
        ? (input.subjectCode.toUpperCase() as EdexcelMathsCashInCode)
        : null;

  let subjectId = input.subjectId;
  let boardId: CalculatorBoardId | CurriculumBoardId = input.boardId;
  let subjectCode = input.subjectCode;
  let subjectTitle = input.subjectTitle;
  let seriesId = input.seriesId;
  const normalizedRawMarks: Record<string, number> = {};
  let totalRaw = 0;
  let maxTotalRaw = 100;
  let totalUms: number | null = null;
  let maxTotalUms: number | null = null;
  let percentage = 0;
  let finalGrade = 'U';

  const sourceMarks =
    inputMode === 'ums' ? (input.umsMarksByPaper ?? input.rawMarksByPaper) : input.rawMarksByPaper;

  if (input.subjectId === 'edexcel-ial-maths' && requestedCashIn) {
    const unitCodes = Object.keys(sourceMarks)
      .map((k) => k.toUpperCase())
      .filter((k): k is EdexcelMathsUnitCode =>
        (EDEXCEL_MATHS_UNIT_CODES as readonly string[]).includes(k)
      );

    if (unitCodes.length >= 3) {
      const suiteRes = await calculateEdexcelMathsSuiteFromD1(d1, {
        selectedUnitCodes: unitCodes,
        inputMode,
        rawMarksByUnit: inputMode === 'raw' ? sourceMarks : {},
        umsMarksByUnit: inputMode === 'ums' ? sourceMarks : undefined,
        seriesByUnit: input.perPaperSeriesById,
        defaultSeriesId: input.seriesId,
        awardMode: requestedCashIn,
      });

      const award =
        requestedCashIn === 'XMA01' || requestedCashIn === 'YMA01'
          ? suiteRes.mathsAward
          : suiteRes.furtherMathsAward;

      if (award) {
        subjectId = suiteRes.subjectId;
        boardId = suiteRes.boardId;
        subjectCode = award.cashInCode;
        subjectTitle = award.title;
        seriesId = inputMode === 'ums' ? 'direct-ums' : input.seriesId;
        for (const u of suiteRes.unitResults) {
          if (u.assignedAward === award.cashInCode) {
            normalizedRawMarks[u.unitCode] = inputMode === 'ums' ? u.ums : u.raw;
          }
        }
        totalRaw = inputMode === 'ums' ? 0 : award.totalRaw;
        maxTotalRaw = award.maxTotalRaw;
        totalUms = award.totalUms;
        maxTotalUms = award.maxTotalUms;
        percentage = award.percentage;
        finalGrade = award.finalGrade;
      }
    }
  }

  if (Object.keys(normalizedRawMarks).length === 0) {
    const computed = await calculateFromD1(d1, {
      subjectId: input.subjectId,
      seriesId: input.seriesId,
      routeId: input.routeId,
      inputMode,
      perPaperSeriesById: input.perPaperSeriesById,
      rawMarksByPaper: input.rawMarksByPaper,
      umsMarksByPaper: input.umsMarksByPaper,
    });

    for (const item of computed.paperResults) {
      normalizedRawMarks[item.paper.code] = inputMode === 'ums' ? item.ums : item.raw;
    }

    const isModularUms = computed.metricUnit === 'UMS';
    subjectId = computed.subjectId;
    boardId = computed.boardId;
    subjectCode = computed.subjectCode;
    subjectTitle = computed.routeLabel
      ? `${computed.subjectTitle} (${computed.routeLabel})`
      : computed.subjectTitle;
    seriesId = computed.seriesId;
    totalRaw = computed.totalRaw;
    maxTotalRaw = computed.maxTotalRaw;
    totalUms = isModularUms ? computed.totalUms : null;
    maxTotalUms = isModularUms ? computed.maxTotalUms : null;
    percentage = computed.percentage;
    finalGrade = computed.finalGrade;
  }

  const id = `grd_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const createdAt = nowIso();
  const db = createDb(d1);

  await db.insert(gradeEntries).values({
    id,
    userId,
    subjectId,
    boardId,
    subjectCode,
    subjectTitle,
    seriesId,
    rawMarksJson: normalizedRawMarks,
    totalRaw,
    maxTotalRaw,
    totalUms,
    maxTotalUms,
    percentage,
    finalGrade,
    createdAt,
  });

  return {
    id,
    userId,
    subjectId,
    boardId,
    subjectCode,
    subjectTitle,
    seriesId,
    rawMarksByPaper: normalizedRawMarks,
    totalRaw,
    maxTotalRaw,
    totalUms,
    maxTotalUms,
    percentage,
    finalGrade,
    createdAt,
  };
}

export async function deleteUserGradeSnapshot(
  d1: D1Database,
  userId: string,
  snapshotId: string
): Promise<boolean> {
  const db = createDb(d1);
  const [existing] = await db
    .select({ id: gradeEntries.id })
    .from(gradeEntries)
    .where(and(eq(gradeEntries.id, snapshotId), eq(gradeEntries.userId, userId)))
    .limit(1);

  if (!existing) {
    return false;
  }

  await db
    .delete(gradeEntries)
    .where(and(eq(gradeEntries.id, snapshotId), eq(gradeEntries.userId, userId)));
  return true;
}
