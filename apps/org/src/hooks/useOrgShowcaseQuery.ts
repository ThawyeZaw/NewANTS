'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OrgApiError, detectUseLocalUrls } from '../lib/org-api';

export type OrgShowcaseQueryStatus = 'loading' | 'ready' | 'not_found' | 'error';

export interface OrgShowcaseQueryState<T> {
  status: OrgShowcaseQueryStatus;
  data: T | null;
  error: { code: string; message: string } | null;
  useLocalUrls: boolean;
  reload: () => void;
}

/**
 * Shared client query hook for `apps/org` Smart Containers (`*Container.tsx`).
 * Manages AbortController cancellation, stale-request guarding, 404 distinction,
 * and client hostname local/prod URL detection.
 */
export function useOrgShowcaseQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[] = []
): OrgShowcaseQueryState<T> {
  const [status, setStatus] = useState<OrgShowcaseQueryStatus>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [useLocalUrls, setUseLocalUrls] = useState<boolean>(true);
  const [reloadTick, setReloadTick] = useState<number>(0);
  const requestIdRef = useRef<number>(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    setUseLocalUrls(detectUseLocalUrls());
  }, []);

  const reload = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setStatus('loading');
    setError(null);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setData(result);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;

        if (err instanceof OrgApiError && err.status === 404) {
          setData(null);
          setError({ code: err.code, message: err.message });
          setStatus('not_found');
          return;
        }

        const code = err instanceof OrgApiError ? err.code : 'LOAD_FAILED';
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to load showcase data from The ANTs API.';
        setData(null);
        setError({ code, message });
        setStatus('error');
      });

    return () => {
      controller.abort();
    };
  }, [reloadTick, ...deps]);

  return { status, data, error, useLocalUrls, reload };
}
