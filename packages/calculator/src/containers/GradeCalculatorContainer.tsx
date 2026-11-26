'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookmarkCheck, RefreshCw, Trash2 } from 'lucide-react';
import {
  buildCrossSubdomainLoginUrl,
  createAuthClient,
  fetchWithRetry,
  isLocalHostname,
  resolveApiBaseUrl,
  useSession,
} from '@ants/auth-client';
import {
  ApiErrorResponseSchema,
  CalculatorCatalogResponseSchema,
  CalculatorSavedSnapshotDtoSchema,
  type CalculatorSavedSnapshotDto,
} from '@ants/shared-types';
import {
  AntMascot,
  AppSwitcher,
  BrandHeaderBadge,
  Button,
  ThemeToggle,
  cn,
  emitMiloCheer,
  type EcosystemAppId,
} from '@ants/ui';
import type { EngineSubjectInput } from '../engine/calculator-engine';
import type {
  ExamBoardId,
  ExamBoardOption,
} from '../mocks/calculator.mock';
import {
  GradeCalculatorView,
  type CalculatorSaveFeedback,
  type CalculatorSeriesOption,
  type GradeCalculationSnapshot,
} from '../views/GradeCalculatorView';

export interface GradeCalculatorContainerProps {
  /** Which app is mounting the calculator ('org' on the-ants.org/calculator or 'study' on study.the-ants.org/calculator) */
  hostApp?: EcosystemAppId;
  /** Hide top navigation bar when embedded inside another app shell */
  hideHeader?: boolean;
  /** Optional explicit API base URL override */
  apiBaseUrl?: string;
  /** Initial selected board */
  defaultBoardId?: ExamBoardId;
  /** Initial selected subject id */
  defaultSubjectId?: string;
  /** Initial selected exam series */
  defaultSeriesId?: string;
  /** Optional fetch implementation for tests */
  fetchImpl?: typeof fetch;
}

type CatalogLoadState =
  | { status: 'loading' }
  | { status: 'error'; code: string; message: string }
  | {
      status: 'ready';
      boards: ExamBoardOption[];
      seriesOptions: CalculatorSeriesOption[];
      subjects: EngineSubjectInput[];
    };

function formatSnapshotDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10);
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function GradeCalculatorContainer({
  hostApp = 'org',
  hideHeader = false,
  apiBaseUrl,
  defaultBoardId = 'edexcel-ial',
  defaultSubjectId = 'edexcel-ial-maths',
  defaultSeriesId = 'mj-2025',
  fetchImpl,
}: GradeCalculatorContainerProps) {
  const resolvedApiBase = useMemo(() => resolveApiBaseUrl(apiBaseUrl), [apiBaseUrl]);
  const hasCustomSessionConfig = Boolean(apiBaseUrl || fetchImpl);
  const customAuthClient = useMemo(
    () => (hasCustomSessionConfig ? createAuthClient({ baseUrl: resolvedApiBase, fetchImpl }) : undefined),
    [hasCustomSessionConfig, resolvedApiBase, fetchImpl]
  );

  const {
    session,
    setSession,
  } = useSession(
    customAuthClient
      ? { apiBaseUrl: resolvedApiBase, client: customAuthClient }
      : undefined
  );

  const runFetch = useCallback(
    (...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
      const impl = fetchImpl ?? globalThis.fetch;
      return impl(...args);
    },
    [fetchImpl]
  );

  const [reloadNonce, setReloadNonce] = useState(0);
  const [useLocalUrls, setUseLocalUrls] = useState(false);
  const [catalogState, setCatalogState] = useState<CatalogLoadState>({ status: 'loading' });
  const [snapshots, setSnapshots] = useState<CalculatorSavedSnapshotDto[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<CalculatorSaveFeedback | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUseLocalUrls(isLocalHostname(window.location.hostname));
    }
  }, []);

  const fetchUserSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    try {
      const res = await fetchWithRetry(
        `${resolvedApiBase}/api/calculator/snapshots`,
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        },
        { fetchImpl }
      );
      if (!res.ok) {
        if (res.status === 401) {
          setSession(null);
          setSnapshots([]);
        }
        return;
      }
      const rawJson = (await res.json()) as { ok?: boolean; data?: unknown };
      if (rawJson?.ok && Array.isArray(rawJson.data)) {
        const parsedList: CalculatorSavedSnapshotDto[] = [];
        for (const item of rawJson.data) {
          const parsed = CalculatorSavedSnapshotDtoSchema.safeParse(item);
          if (parsed.success) {
            parsedList.push(parsed.data);
          }
        }
        setSnapshots(parsedList);
      }
    } catch {
      // Keep existing snapshot list untouched if network temporarily drops
    } finally {
      setSnapshotsLoading(false);
    }
  }, [resolvedApiBase, fetchImpl, setSession]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadInitial() {
      setCatalogState({ status: 'loading' });
      try {
        const catalogRes = await fetchWithRetry(
          `${resolvedApiBase}/api/calculator/catalog`,
          {
            method: 'GET',
            cache: reloadNonce > 0 ? 'no-cache' : 'default',
            signal: controller.signal,
          },
          { fetchImpl }
        );
        const rawJson: unknown = await catalogRes.json().catch(() => null);
        if (!active) return;

        if (!catalogRes.ok) {
          const parsedErr = ApiErrorResponseSchema.safeParse(rawJson);
          setCatalogState({
            status: 'error',
            code: parsedErr.success ? parsedErr.data.error.code : 'CATALOG_LOAD_FAILED',
            message: parsedErr.success
              ? parsedErr.data.error.message
              : `Unable to load grade boundaries from @ants/api (HTTP ${catalogRes.status}).`,
          });
          return;
        }

        const parsedCatalog = CalculatorCatalogResponseSchema.safeParse(rawJson);
        if (!parsedCatalog.success || parsedCatalog.data.data.subjects.length === 0) {
          setCatalogState({
            status: 'error',
            code: 'CATALOG_NOT_SEEDED',
            message:
              'Grade calculator boundaries are not yet populated in D1. Run pnpm db:migrate:local and retry.',
          });
          return;
        }

        const { boards, seriesOptions, subjects } = parsedCatalog.data.data;
        setCatalogState({
          status: 'ready',
          boards,
          seriesOptions,
          subjects,
        });
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        const rawMessage =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to reach @ants/api for live grade boundaries.';
        const isLocal =
          resolvedApiBase.includes('localhost') || resolvedApiBase.includes('127.0.0.1');
        const message = isLocal
          ? `${rawMessage} — Start the local API worker with \`pnpm dev:api\` (${resolvedApiBase}) and click Retry.`
          : rawMessage;
        setCatalogState({
          status: 'error',
          code: 'NETWORK_ERROR',
          message,
        });
      }
    }

    void loadInitial();

    return () => {
      active = false;
      controller.abort();
    };
  }, [resolvedApiBase, fetchImpl, reloadNonce]);

  const sessionUserId = session?.user?.id ?? null;

  useEffect(() => {
    if (!sessionUserId) {
      setSnapshots([]);
      return;
    }
    void fetchUserSnapshots();
  }, [sessionUserId, fetchUserSnapshots]);

  const handleSaveSnapshot = useCallback(
    async (snapshot: GradeCalculationSnapshot) => {
      setSaveFeedback(null);

      if (!session) {
        const loginHref = buildCrossSubdomainLoginUrl({
          fromApp: hostApp,
          authApp: 'study',
          targetPath: '/calculator',
          relativeIfSameApp: hostApp === 'study',
        });
        setSaveFeedback({
          tone: 'info',
          message: 'Sign in on Study to save calculations to your Study Tracker.',
          actionLabel: 'Sign in on Study',
          actionHref: loginHref,
        });
        return;
      }

      setIsSaving(true);
      try {
        const res = await runFetch(`${resolvedApiBase}/api/calculator/snapshots`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
        });
        const rawJson: unknown = await res.json().catch(() => null);

        if (res.status === 401) {
          setSession(null);
          setSnapshots([]);
          const loginHref = buildCrossSubdomainLoginUrl({
            fromApp: hostApp,
            authApp: 'study',
            targetPath: '/calculator',
            relativeIfSameApp: hostApp === 'study',
          });
          setSaveFeedback({
            tone: 'info',
            message: 'Your session expired. Sign in on Study to save to your tracker.',
            actionLabel: 'Sign in on Study',
            actionHref: loginHref,
          });
          return;
        }

        if (!res.ok) {
          const parsedErr = ApiErrorResponseSchema.safeParse(rawJson);
          setSaveFeedback({
            tone: 'error',
            message: parsedErr.success
              ? parsedErr.data.error.message
              : `Could not save snapshot (HTTP ${res.status}).`,
          });
          return;
        }

        const envelope = rawJson as { data?: unknown } | null;
        const parsedSaved = CalculatorSavedSnapshotDtoSchema.safeParse(envelope?.data);
        if (!parsedSaved.success) {
          setSaveFeedback({
            tone: 'error',
            message: 'Snapshot saved, but response format was unexpected.',
          });
          return;
        }

        const saved = parsedSaved.data;
        setSnapshots((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);

        const isTop =
          saved.finalGrade === 'A*' ||
          saved.finalGrade === '9' ||
          saved.finalGrade === 'A' ||
          saved.finalGrade === '8';

        emitMiloCheer({
          mood: isTop ? 'celebrating' : 'happy',
          propVariant: 'pencil',
          badge: `Grade ${saved.finalGrade}`,
          message: `Saved ${saved.subjectCode} (${saved.finalGrade}) to your Study Tracker!`,
        });

        setSaveFeedback({
          tone: 'success',
          message: `Saved ${saved.subjectTitle} (${
            saved.seriesId === 'direct-ums' ? 'Direct UMS' : saved.seriesId
          }) — Grade ${saved.finalGrade}`,
        });
      } catch (err) {
        setSaveFeedback({
          tone: 'error',
          message:
            err instanceof Error && err.message
              ? err.message
              : 'Network error while saving calculation.',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [session, hostApp, resolvedApiBase, runFetch, setSession]
  );

  const handleDeleteSnapshot = useCallback(
    async (snapshotId: string) => {
      setDeletingId(snapshotId);
      try {
        const res = await runFetch(
          `${resolvedApiBase}/api/calculator/snapshots/${encodeURIComponent(snapshotId)}`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );
        if (res.ok) {
          setSnapshots((prev) => prev.filter((item) => item.id !== snapshotId));
        }
      } finally {
        setDeletingId(null);
      }
    },
    [resolvedApiBase, runFetch]
  );

  const seriesLabelById = useMemo(() => {
    const map = new Map<string, string>();
    if (catalogState.status === 'ready') {
      for (const s of catalogState.seriesOptions) {
        map.set(s.id, s.label);
      }
    }
    return map;
  }, [catalogState]);

  if (catalogState.status !== 'ready') {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {!hideHeader && (
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
              <BrandHeaderBadge
                app={hostApp}
                productHref="/"
                showEndorsement={hostApp !== 'org'}
              />
              <div className="flex items-center gap-2.5">
                <a
                  href="/"
                  className="rounded-lg px-2 py-1 text-xs font-medium text-foreground-muted hover:text-foreground"
                >
                  Home
                </a>
                <ThemeToggle />
                <AppSwitcher currentApp={hostApp} useLocalUrls={useLocalUrls} />
              </div>
            </div>
          </header>
        )}

        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {catalogState.status === 'loading' ? (
            <div
              className="space-y-8 animate-pulse"
              aria-busy="true"
              aria-label="Loading grade boundaries from D1"
            >
              <div className="space-y-3 border-b border-border pb-8">
                <div className="h-9 w-56 rounded-xl bg-surface-card" />
                <div className="h-5 w-96 max-w-full rounded-lg bg-surface-card" />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-12">
                <div className="h-16 rounded-xl bg-surface-card sm:col-span-8" />
                <div className="h-16 rounded-xl bg-surface-card sm:col-span-4" />
              </div>
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                <div className="h-80 rounded-2xl bg-surface-card lg:col-span-7" />
                <div className="h-80 rounded-2xl bg-surface-card lg:col-span-5" />
              </div>
            </div>
          ) : (
            <div
              role="alert"
              className="mx-auto max-w-xl rounded-2xl border border-border bg-surface-card p-6 sm:p-8 space-y-4 shadow-[var(--shadow-tier-1)]"
            >
              <div className="flex items-start gap-4">
                <AntMascot
                  size={56}
                  mood="curious"
                  app={hostApp === 'study' ? 'study' : 'org'}
                  propVariant="magnifier"
                  ariaLabel=""
                  className="shrink-0"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-danger">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <h1 className="text-base font-bold text-foreground">
                      Grade Boundaries Unavailable
                    </h1>
                  </div>
                  <p className="text-sm text-foreground-muted leading-relaxed">
                    {catalogState.message}
                  </p>
                  <p className="font-mono text-xs text-foreground-muted">
                    Code: {catalogState.code}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  onClick={() => setReloadNonce((n) => n + 1)}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  const resolvedDefaultSeriesId =
    catalogState.status === 'ready' &&
    !catalogState.seriesOptions.some((s) => s.id === defaultSeriesId)
      ? (catalogState.seriesOptions[0]?.id ?? defaultSeriesId)
      : defaultSeriesId;

  return (
    <div>
      <GradeCalculatorView
        hostApp={hostApp}
        hideHeader={hideHeader}
        boards={catalogState.boards}
        seriesOptions={catalogState.seriesOptions}
        subjects={catalogState.subjects}
        defaultBoardId={defaultBoardId}
        defaultSubjectId={defaultSubjectId}
        defaultSeriesId={resolvedDefaultSeriesId}
        onSaveSnapshot={handleSaveSnapshot}
        saveFeedback={saveFeedback}
        isSaving={isSaving}
      />

      {session && (snapshotsLoading || snapshots.length > 0) && (
        <section
          aria-label="Saved grade snapshots"
          className="mx-auto max-w-5xl px-4 pb-16 sm:px-6"
        >
          <div className="rounded-2xl border border-border bg-surface-card p-5 sm:p-6 space-y-4 shadow-[var(--shadow-tier-1)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Saved Snapshots
                </h2>
              </div>
              <span className="font-mono text-xs text-foreground-muted">
                {snapshots.length} saved
              </span>
            </div>

            {snapshotsLoading && snapshots.length === 0 ? (
              <div className="h-14 rounded-xl bg-surface-inset animate-pulse" />
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-background/60">
                {snapshots.map((item) => {
                  const seriesLabel =
                    item.seriesId === 'direct-ums'
                      ? 'Direct UMS'
                      : (seriesLabelById.get(item.seriesId) ?? item.seriesId);
                  const scoreSummary =
                    item.totalUms !== null && item.maxTotalUms !== null
                      ? `${item.totalUms} / ${item.maxTotalUms} UMS`
                      : `${item.totalRaw} / ${item.maxTotalRaw} marks`;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-extrabold',
                            item.finalGrade === 'A*' || item.finalGrade === '9'
                              ? 'bg-primary text-on-primary'
                              : 'border border-border bg-surface-inset text-foreground'
                          )}
                        >
                          {item.finalGrade}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-semibold text-primary shrink-0">
                              {item.subjectCode}
                            </span>
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.subjectTitle}
                            </p>
                          </div>
                          <p className="truncate text-xs text-foreground-muted">
                            {seriesLabel} ·{' '}
                            <span className="font-mono tabular-nums">{scoreSummary}</span> (
                            {Math.round(item.percentage)}%) · {formatSnapshotDate(item.createdAt)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={`Delete snapshot for ${item.subjectTitle}`}
                        disabled={deletingId === item.id}
                        onClick={() => void handleDeleteSnapshot(item.id)}
                        className="rounded-lg p-1.5 text-foreground-muted hover:bg-surface-inset hover:text-danger transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
