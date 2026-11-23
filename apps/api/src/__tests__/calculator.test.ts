import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';
import {
  ApiErrorResponseSchema,
  AuthSessionBundleSchema,
  CalculatorCatalogResponseSchema,
  CalculatorSavedSnapshotDtoSchema,
  CalculatorSubjectDtoSchema,
} from '@ants/shared-types';
import { BETTER_AUTH_SESSION_COOKIE_NAME } from '../auth/cookies';
import { createApiApp, type ApiBindings } from '../index';

function normalizeSqliteParam(value: unknown): SQLInputValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') {
    return value;
  }
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (ArrayBuffer.isView(value)) return value as NodeJS.ArrayBufferView;
  return JSON.stringify(value);
}

interface BoundStatement {
  runSync: () => Record<string, unknown>[];
  allSync: () => Record<string, unknown>[];
  returnsRows: () => boolean;
}

function resolveMigrationPath(filename: string): string {
  const candidates = [
    path.resolve(process.cwd(), `../../packages/db/migrations/${filename}`),
    path.resolve(process.cwd(), `packages/db/migrations/${filename}`),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`Could not locate packages/db migration '${filename}'.`);
  }
  return found;
}

function createInMemoryD1Database(options?: { seedCatalog?: boolean }): {
  d1: D1Database;
  sqlite: DatabaseSync;
} {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const files = ['0000_romantic_marvex.sql'];
  if (options?.seedCatalog) {
    files.push(
      '0001_seed_calculator_catalog.sql',
      '0002_seed_full_calculator_catalog.sql',
      '0003_remove_ial_fm_oct_nov.sql',
      '0004_clean_calculator_board_labels.sql'
    );
  }

  for (const filename of files) {
    const sqlText = fs.readFileSync(resolveMigrationPath(filename), 'utf8');
    for (const chunk of sqlText.split('--> statement-breakpoint')) {
      const stmtSql = chunk.trim();
      if (stmtSql) {
        sqlite.exec(stmtSql);
      }
    }
  }

  const createStatement = (sqlText: string, boundParams: SQLInputValue[] = []) => {
    const returnsRows = () =>
      /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sqlText) || /\bRETURNING\b/i.test(sqlText);

    const runSync = (): Record<string, unknown>[] => {
      const prepared = sqlite.prepare(sqlText);
      if (returnsRows()) {
        return prepared.all(...boundParams) as Record<string, unknown>[];
      }
      prepared.run(...boundParams);
      return [];
    };

    const allSync = (): Record<string, unknown>[] => {
      const prepared = sqlite.prepare(sqlText);
      if (returnsRows()) {
        return prepared.all(...boundParams) as Record<string, unknown>[];
      }
      prepared.run(...boundParams);
      return [];
    };

    const rawSync = (): unknown[][] => {
      const prepared = sqlite.prepare(sqlText);
      if (returnsRows()) {
        prepared.setReturnArrays(true);
        return prepared.all(...boundParams) as unknown as unknown[][];
      }
      prepared.run(...boundParams);
      return [];
    };

    return {
      _internal: { runSync, allSync, returnsRows } satisfies BoundStatement,
      bind(...params: unknown[]) {
        return createStatement(sqlText, params.map(normalizeSqliteParam));
      },
      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const firstRow = allSync()[0];
        if (!firstRow) return null;
        if (colName) {
          return (firstRow[colName] as T | undefined) ?? null;
        }
        return firstRow as T;
      },
      async run() {
        const results = runSync();
        return {
          success: true as const,
          results,
          meta: {
            duration: 0,
            size_after: 0,
            rows_read: results.length,
            rows_written: returnsRows() ? 0 : 1,
            last_row_id: 0,
            changed_db: !returnsRows(),
            changes: returnsRows() ? 0 : 1,
          },
        };
      },
      async all<T = Record<string, unknown>>() {
        const results = allSync() as T[];
        return {
          success: true as const,
          results,
          meta: {
            duration: 0,
            size_after: 0,
            rows_read: results.length,
            rows_written: 0,
            last_row_id: 0,
            changed_db: false,
            changes: 0,
          },
        };
      },
      async raw() {
        return rawSync();
      },
    };
  };

  const d1 = {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch(statements: Array<{ _internal?: BoundStatement }>) {
      sqlite.exec('BEGIN IMMEDIATE;');
      try {
        const out = statements.map((stmt) => {
          const results = stmt._internal ? stmt._internal.allSync() : [];
          return {
            success: true as const,
            results,
            meta: {
              duration: 0,
              size_after: 0,
              rows_read: results.length,
              rows_written: 1,
              last_row_id: 0,
              changed_db: true,
              changes: 1,
            },
          };
        });
        sqlite.exec('COMMIT;');
        return out;
      } catch (err) {
        sqlite.exec('ROLLBACK;');
        throw err;
      }
    },
    async exec(query: string) {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
    async dump() {
      return new ArrayBuffer(0);
    },
  } as unknown as D1Database;

  return { d1, sqlite };
}

function getSetCookies(headers: Headers): string[] {
  const headerWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headerWithGetSetCookie.getSetCookie === 'function') {
    return headerWithGetSetCookie.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

async function signUpTestUser(
  api: ReturnType<typeof createApiApp>,
  env: ApiBindings,
  input: { name: string; email: string; username: string }
) {
  const res = await api.request(
    'http://localhost:8787/api/auth/sign-up/email',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: 'StrongPassword123!',
        username: input.username,
        academicTrack: 'ial',
      }),
    },
    env
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { data: unknown };
  const bundle = AuthSessionBundleSchema.parse(body.data);
  const setCookies = getSetCookies(res.headers);
  const authCookie = setCookies
    .find((line) => line.startsWith(`${BETTER_AUTH_SESSION_COOKIE_NAME}=`))
    ?.split(';')[0]
    ?.trim();
  expect(authCookie).toBeDefined();
  return { bundle, cookieHeader: authCookie ?? '' };
}

describe('@ants/api — Calculator D1 Catalog, Routes & Maths Suite [THAW-2.1]', () => {
  it('returns 503 CATALOG_NOT_SEEDED when D1 has no seeded curriculums/subjects (strict D1-only)', async () => {
    const { d1 } = createInMemoryD1Database({ seedCatalog: false });
    const api = createApiApp();
    const env: ApiBindings = { DB: d1, COOKIE_DOMAIN: 'localhost' };

    const res = await api.request('http://localhost:8787/api/calculator/catalog', {}, env);
    expect(res.status).toBe(503);
    const parsedErr = ApiErrorResponseSchema.parse(await res.json());
    expect(parsedErr.error.code).toBe('CATALOG_NOT_SEEDED');
  });

  it('serves full 49-entry (50-subject) seeded D1 catalog across 4 boards and 2022–2026 series', async () => {
    const { d1 } = createInMemoryD1Database({ seedCatalog: true });
    const api = createApiApp();
    const env: ApiBindings = { DB: d1, COOKIE_DOMAIN: 'localhost' };

    const res = await api.request('http://localhost:8787/api/calculator/catalog', {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('max-age=60');
    const catalog = CalculatorCatalogResponseSchema.parse(await res.json());
    expect(catalog.data.source).toBe('d1');
    expect(catalog.data.boards).toHaveLength(4);
    for (const board of catalog.data.boards) {
      expect(board.scaleBadge).not.toMatch(/UMS|PUM|Linear/i);
    }
    expect(catalog.data.seriesOptions.length).toBeGreaterThanOrEqual(10);
    expect(catalog.data.subjects).toHaveLength(49);

    const countByBoard = new Map<string, number>();
    for (const s of catalog.data.subjects) {
      countByBoard.set(s.boardId, (countByBoard.get(s.boardId) ?? 0) + 1);
    }
    expect(countByBoard.get('caie-igcse')).toBe(12);
    expect(countByBoard.get('edexcel-igcse')).toBe(14);
    expect(countByBoard.get('caie-alevel')).toBe(12);
    expect(countByBoard.get('edexcel-ial')).toBe(11);

    // Accepts both `cambridge-alevel` and `caie-alevel` board query aliases
    const caieRes = await api.request(
      'http://localhost:8787/api/calculator/catalog?boardId=cambridge-alevel',
      {},
      env
    );
    expect(caieRes.status).toBe(200);
    const caieCatalog = CalculatorCatalogResponseSchema.parse(await caieRes.json());
    expect(caieCatalog.data.boards.map((b) => b.id)).toEqual(['caie-alevel']);
    expect(caieCatalog.data.subjects).toHaveLength(12);

    const caieIgcseRes = await api.request(
      'http://localhost:8787/api/calculator/catalog?boardId=caie-igcse',
      {},
      env
    );
    expect(caieIgcseRes.status).toBe(200);
    expect(CalculatorCatalogResponseSchema.parse(await caieIgcseRes.json()).data.subjects).toHaveLength(12);

    const badBoardRes = await api.request(
      'http://localhost:8787/api/calculator/catalog?boardId=invalid-board',
      {},
      env
    );
    expect(badBoardRes.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(await badBoardRes.json()).error.code).toBe(
      'INVALID_BOARD_ID'
    );

    // Single subject detail endpoint returns all 14 units for edexcel-ial-maths
    const mathsDetailRes = await api.request(
      'http://localhost:8787/api/calculator/subjects/edexcel-ial-maths',
      {},
      env
    );
    expect(mathsDetailRes.status).toBe(200);
    const mathsDetailBody = (await mathsDetailRes.json()) as { ok: boolean; data: unknown };
    const mathsDto = CalculatorSubjectDtoSchema.parse(mathsDetailBody.data);
    expect(mathsDto.calculatorMode).toBe('edexcel_maths_suite');
    expect(mathsDto.papers).toHaveLength(14);
    expect(mathsDto.routes?.map((r) => r.cashInCode)).toEqual(['YMA01', 'XMA01', 'YFM01', 'XFM01']);
    const yfmRoute = mathsDto.routes?.find((r) => r.cashInCode === 'YFM01');
    const xfmRoute = mathsDto.routes?.find((r) => r.cashInCode === 'XFM01');
    expect(yfmRoute?.availableSeriesIds?.some((s) => s.startsWith('on-'))).toBe(false);
    expect(xfmRoute?.availableSeriesIds?.some((s) => s.startsWith('on-'))).toBe(false);
  });

  it('computes route-aware syllabus grades across weighted CAIE IGCSE, Foundation 9-1 & IAL awards', async () => {
    const { d1 } = createInMemoryD1Database({ seedCatalog: true });
    const api = createApiApp();
    const env: ApiBindings = { DB: d1, COOKIE_DOMAIN: 'localhost' };

    // 1. CAIE IGCSE Physics 0625 Core V2 ATP caps at Grade C even with full raw marks (40, 80, 40)
    const physCoreRes = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'caie-igcse-physics-0625',
          routeId: 'core-v2-p6',
          seriesId: 'mj-2025',
          rawMarksByPaper: {
            '0625-p1': 40,
            '0625-p3': 80,
            '0625-p6': 40,
          },
        }),
      },
      env
    );
    expect(physCoreRes.status).toBe(200);
    const physCore = (await physCoreRes.json()) as {
      data: { finalGrade: string; metricScore: number; metricMax: number };
    };
    expect(physCore.data.metricScore).toBe(200);
    expect(physCore.data.metricMax).toBe(200);
    expect(physCore.data.finalGrade).toBe('C');

    // 2. Edexcel IGCSE 4MA1 Foundation (remapped 5..1 scale) caps at Grade 5
    const fnd4ma1Res = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-igcse-maths-a-4ma1',
          routeId: 'foundation-std',
          seriesId: 'mj-2026',
          rawMarksByPaper: {
            '4ma1-1f': 95,
            '4ma1-2f': 95,
          },
        }),
      },
      env
    );
    expect(fnd4ma1Res.status).toBe(200);
    const fnd4ma1 = (await fnd4ma1Res.json()) as {
      data: { finalGrade: string; boundaries: Array<{ grade: string }> };
    };
    expect(fnd4ma1.data.finalGrade).toBe('5');
    expect(fnd4ma1.data.boundaries.map((b) => b.grade)).toEqual(['5', '4', '3', '2', '1']);

    // 3. Edexcel IAL Physics AS (XPH11) caps at Grade A with 300/300 UMS, while YPH11 awards A*
    const asPhysRes = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-physics',
          routeId: 'XPH11',
          seriesId: 'mj-2025',
          rawMarksByPaper: { WPH11: 80, WPH12: 80, WPH13: 50 },
        }),
      },
      env
    );
    expect(asPhysRes.status).toBe(200);
    const asPhys = (await asPhysRes.json()) as {
      data: { finalGrade: string; totalUms: number; maxTotalUms: number };
    };
    expect(asPhys.data.totalUms).toBe(300);
    expect(asPhys.data.maxTotalUms).toBe(300);
    expect(asPhys.data.finalGrade).toBe('A');

    // 4. Edexcel IGCSE Direct UMS mode (4MA1 Higher -> Grade 9, Foundation -> capped at 5)
    const igcseUmsRes = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-igcse-maths-a-4ma1',
          routeId: 'higher-std',
          inputMode: 'ums',
          umsMarksByPaper: { '4ma1-1h': 95, '4ma1-2h': 90 },
        }),
      },
      env
    );
    expect(igcseUmsRes.status).toBe(200);
    const igcseUms = (await igcseUmsRes.json()) as {
      data: { seriesId: string; metricUnit: string; totalUms: number; finalGrade: string };
    };
    expect(igcseUms.data.seriesId).toBe('direct-ums');
    expect(igcseUms.data.metricUnit).toBe('UMS');
    expect(igcseUms.data.totalUms).toBe(185);
    expect(igcseUms.data.finalGrade).toBe('9');

    // 5. Edexcel IAL Computer Science (representative boundaries) rejects raw marks with 400 DIRECT_UMS_ONLY and accepts Direct UMS
    const csRawRes = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-cs',
          seriesId: 'mj-2025',
          inputMode: 'raw',
          rawMarksByPaper: { WCP01: 60 },
        }),
      },
      env
    );
    expect(csRawRes.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(await csRawRes.json()).error.code).toBe('DIRECT_UMS_ONLY');

    const csUmsRes = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-cs',
          inputMode: 'ums',
          umsMarksByPaper: { WCP01: 92, WCP02: 90, WCP03: 94, WCP04: 91 },
        }),
      },
      env
    );
    expect(csUmsRes.status).toBe(200);
  });

  it('computes simultaneous Edexcel IAL Maths & Further Maths via POST /api/calculator/calculate-maths-suite', async () => {
    const { d1 } = createInMemoryD1Database({ seedCatalog: true });
    const api = createApiApp();
    const env: ApiBindings = { DB: d1, COOKIE_DOMAIN: 'localhost' };

    const res = await api.request(
      'http://localhost:8787/api/calculator/calculate-maths-suite',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedUnitCodes: [
            'WMA11', 'WMA12', 'WMA13', 'WMA14',
            'WFM01', 'WFM02', 'WFM03',
            'WME01', 'WME02', 'WST01', 'WST02', 'WDM11',
          ],
          rawMarksByUnit: {
            WMA11: 70, WMA12: 70, WMA13: 68, WMA14: 68,
            WFM01: 68, WFM02: 70, WFM03: 70,
            WME01: 68, WME02: 68, WST01: 68, WST02: 70, WDM11: 68,
          },
          seriesByUnit: { WMA11: 'jan-2025' },
          defaultSeriesId: 'mj-2025',
        }),
      },
      env
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      data: {
        resolvedMode: string;
        mathsAward: { cashInCode: string; finalGrade: string; totalUms: number };
        furtherMathsAward: { cashInCode: string; finalGrade: string; totalUms: number };
        unusedUnitCodes: string[];
      };
    };
    expect(body.ok).toBe(true);
    expect(body.data.resolvedMode).toBe('YMA01+YFM01');
    expect(body.data.mathsAward.cashInCode).toBe('YMA01');
    expect(body.data.mathsAward.finalGrade).toBe('A*');
    expect(body.data.furtherMathsAward.cashInCode).toBe('YFM01');
    expect(body.data.furtherMathsAward.finalGrade).toBe('A*');
    expect(body.data.unusedUnitCodes).toEqual([]);

    // Oct/Nov rejected for Edexcel IAL Further Mathematics in raw mode (both /calculate & /calculate-maths-suite)
    const fmOctNovRoute = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-maths',
          routeId: 'YFM01',
          seriesId: 'on-2025',
          rawMarksByPaper: { WFM01: 68 },
        }),
      },
      env
    );
    expect(fmOctNovRoute.status).toBe(404);

    const fmOctNovSuite = await api.request(
      'http://localhost:8787/api/calculator/calculate-maths-suite',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedUnitCodes: ['WFM01', 'WFM02', 'WME02'],
          rawMarksByUnit: { WFM01: 65, WFM02: 65, WME02: 65 },
          defaultSeriesId: 'on-2025',
        }),
      },
      env
    );
    expect(fmOctNovSuite.status).toBe(400);
    expect(ApiErrorResponseSchema.parse(await fmOctNovSuite.json()).error.code).toBe(
      'INVALID_SERIES_FOR_FURTHER_MATHS'
    );

    // Direct UMS mode succeeds on both /calculate (Physics YPH11) & /calculate-maths-suite (12u)
    const directPhysRes = await api.request(
      'http://localhost:8787/api/calculator/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'edexcel-ial-physics',
          routeId: 'YPH11',
          inputMode: 'ums',
          umsMarksByPaper: {
            WPH11: 112, WPH12: 110, WPH13: 55,
            WPH14: 110, WPH15: 112, WPH16: 54,
          },
        }),
      },
      env
    );
    expect(directPhysRes.status).toBe(200);
    const directPhys = (await directPhysRes.json()) as {
      data: { finalGrade: string; totalUms: number; inputMode: string };
    };
    expect(directPhys.data.inputMode).toBe('ums');
    expect(directPhys.data.totalUms).toBe(553);
    expect(directPhys.data.finalGrade).toBe('A*');

    const directSuiteRes = await api.request(
      'http://localhost:8787/api/calculator/calculate-maths-suite',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedUnitCodes: [
            'WMA11', 'WMA12', 'WMA13', 'WMA14',
            'WFM01', 'WFM02', 'WFM03',
            'WME01', 'WME02', 'WST01', 'WST02', 'WDM11',
          ],
          inputMode: 'ums',
          umsMarksByUnit: {
            WMA11: 95, WMA12: 92, WMA13: 94, WMA14: 96,
            WFM01: 90, WFM02: 95, WFM03: 91,
            WME01: 88, WME02: 92, WST01: 86, WST02: 94, WDM11: 85,
          },
        }),
      },
      env
    );
    expect(directSuiteRes.status).toBe(200);
    const directSuite = (await directSuiteRes.json()) as {
      data: {
        inputMode: string;
        mathsAward: { finalGrade: string; totalUms: number };
        furtherMathsAward: { finalGrade: string; totalUms: number };
      };
    };
    expect(directSuite.data.inputMode).toBe('ums');
    expect(directSuite.data.mathsAward.finalGrade).toBe('A*');
    expect(directSuite.data.furtherMathsAward.finalGrade).toBe('A*');
  });

  it('requires auth for /snapshots and persists, lists, and enforces ownership on D1 grade_entries', async () => {
    const { d1 } = createInMemoryD1Database({ seedCatalog: true });
    const api = createApiApp();
    const env: ApiBindings = {
      DB: d1,
      COOKIE_DOMAIN: 'localhost',
      BETTER_AUTH_SECRET: 'calculator-test-secret-0123456789',
    };

    // Guest access rejected with 401
    const guestGet = await api.request('http://localhost:8787/api/calculator/snapshots', {}, env);
    expect(guestGet.status).toBe(401);

    const guestPost = await api.request(
      'http://localhost:8787/api/calculator/snapshots',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      env
    );
    expect(guestPost.status).toBe(401);

    const userOne = await signUpTestUser(api, env, {
      name: 'Alice Scholar',
      email: 'alice@the-ants.org',
      username: 'alicescholar',
    });
    const userTwo = await signUpTestUser(api, env, {
      name: 'Bob Scholar',
      email: 'bob@the-ants.org',
      username: 'bobscholar',
    });

    // Save YFM01 Maths Suite snapshot as User One (server recomputes authoritative grade from D1 boundaries)
    const saveRes = await api.request(
      'http://localhost:8787/api/calculator/snapshots',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userOne.cookieHeader,
        },
        body: JSON.stringify({
          boardId: 'edexcel-ial',
          subjectId: 'edexcel-ial-maths',
          subjectCode: 'YFM01',
          subjectTitle: 'International A-Level Further Mathematics',
          seriesId: 'mj-2025',
          routeId: 'YFM01',
          rawMarksByPaper: {
            WFM01: 68,
            WFM02: 70,
            WFM03: 70,
            WME02: 70,
            WST02: 68,
            WDM11: 68,
          },
          totalRaw: 414,
          maxTotalRaw: 450,
          totalUms: 560,
          maxTotalUms: 600,
          percentage: 93,
          finalGrade: 'U', // Client-tampered grade should be overridden by D1 engine
        }),
      },
      env
    );
    expect(saveRes.status).toBe(201);
    const saved = CalculatorSavedSnapshotDtoSchema.parse(
      ((await saveRes.json()) as { data: unknown }).data
    );
    expect(saved.userId).toBe(userOne.bundle.user.id);
    expect(saved.subjectCode).toBe('YFM01');
    expect(saved.finalGrade).toBe('A*');
    expect(saved.totalUms).toBeGreaterThanOrEqual(480);

    // Save second snapshot (Cambridge IGCSE 0580 Extended V2) and verify newest-first ordering
    const saveSecondRes = await api.request(
      'http://localhost:8787/api/calculator/snapshots',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userOne.cookieHeader,
        },
        body: JSON.stringify({
          boardId: 'caie-igcse',
          subjectId: 'caie-igcse-maths-0580',
          subjectCode: '0580',
          subjectTitle: 'Mathematics',
          seriesId: 'mj-2025',
          routeId: 'ext-v2',
          rawMarksByPaper: {
            'Paper 2': 92,
            'Paper 4': 94,
          },
          totalRaw: 186,
          maxTotalRaw: 200,
          percentage: 93,
          finalGrade: 'A*',
        }),
      },
      env
    );
    expect(saveSecondRes.status).toBe(201);
    const savedSecond = CalculatorSavedSnapshotDtoSchema.parse(
      ((await saveSecondRes.json()) as { data: unknown }).data
    );

    const listRes = await api.request(
      'http://localhost:8787/api/calculator/snapshots',
      { headers: { Cookie: userOne.cookieHeader } },
      env
    );
    expect(listRes.status).toBe(200);
    const listData = ((await listRes.json()) as { data: unknown[] }).data.map((item) =>
      CalculatorSavedSnapshotDtoSchema.parse(item)
    );
    expect(listData).toHaveLength(2);
    expect(listData[0]?.id).toBe(savedSecond.id);

    // User Two cannot delete User One's snapshot (404)
    const crossDelete = await api.request(
      `http://localhost:8787/api/calculator/snapshots/${saved.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: userTwo.cookieHeader },
      },
      env
    );
    expect(crossDelete.status).toBe(404);

    // User One can delete own snapshot (200)
    const ownerDelete = await api.request(
      `http://localhost:8787/api/calculator/snapshots/${saved.id}`,
      {
        method: 'DELETE',
        headers: { Cookie: userOne.cookieHeader },
      },
      env
    );
    expect(ownerDelete.status).toBe(200);

    const afterDeleteList = await api.request(
      'http://localhost:8787/api/calculator/snapshots',
      { headers: { Cookie: userOne.cookieHeader } },
      env
    );
    const remaining = ((await afterDeleteList.json()) as { data: unknown[] }).data;
    expect(remaining).toHaveLength(1);

    // Save Direct UMS snapshot for Edexcel IAL Physics YPH11
    const directUmsSaveRes = await api.request(
      'http://localhost:8787/api/calculator/snapshots',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userOne.cookieHeader,
        },
        body: JSON.stringify({
          boardId: 'edexcel-ial',
          subjectId: 'edexcel-ial-physics',
          subjectCode: 'YPH11',
          subjectTitle: 'Physics',
          seriesId: 'direct-ums',
          routeId: 'YPH11',
          inputMode: 'ums',
          rawMarksByPaper: {},
          umsMarksByPaper: {
            WPH11: 112, WPH12: 110, WPH13: 55,
            WPH14: 110, WPH15: 112, WPH16: 54,
          },
          totalRaw: 0,
          maxTotalRaw: 440,
          totalUms: 553,
          maxTotalUms: 600,
          percentage: 92,
          finalGrade: 'U',
        }),
      },
      env
    );
    expect(directUmsSaveRes.status).toBe(201);
    const savedUms = CalculatorSavedSnapshotDtoSchema.parse(
      ((await directUmsSaveRes.json()) as { data: unknown }).data
    );
    expect(savedUms.seriesId).toBe('direct-ums');
    expect(savedUms.totalUms).toBe(553);
    expect(savedUms.finalGrade).toBe('A*');

    // Save Edexcel IGCSE Direct UMS snapshot for 4MA1 Higher (185/200 UMS -> Grade 9)
    const igcseUmsSaveRes = await api.request(
      'http://localhost:8787/api/calculator/snapshots',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: userOne.cookieHeader,
        },
        body: JSON.stringify({
          boardId: 'edexcel-igcse',
          subjectId: 'edexcel-igcse-maths-a-4ma1',
          subjectCode: '4MA1',
          subjectTitle: 'Mathematics A',
          seriesId: 'direct-ums',
          routeId: 'higher-std',
          inputMode: 'ums',
          rawMarksByPaper: {},
          umsMarksByPaper: { '4ma1-1h': 95, '4ma1-2h': 90 },
          totalRaw: 0,
          maxTotalRaw: 200,
          totalUms: 185,
          maxTotalUms: 200,
          percentage: 93,
          finalGrade: 'U',
        }),
      },
      env
    );
    expect(igcseUmsSaveRes.status).toBe(201);
    const savedIgcseUms = CalculatorSavedSnapshotDtoSchema.parse(
      ((await igcseUmsSaveRes.json()) as { data: unknown }).data
    );
    expect(savedIgcseUms.seriesId).toBe('direct-ums');
    expect(savedIgcseUms.totalUms).toBe(185);
    expect(savedIgcseUms.finalGrade).toBe('9');
  });
});
