export interface FetchWithRetryOptions {
  /** Maximum number of retry attempts after the initial try (default: 2). */
  maxRetries?: number;
  /** Backoff delays in ms before each retry (default: [250, 600]). */
  retryDelaysMs?: readonly number[];
  /** Custom fetch implementation for testing. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_RETRY_DELAYS_MS = [250, 600] as const;
const RETRYABLE_HTTP_STATUSES = new Set([502, 503, 504]);

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

function isIdempotentMethod(method?: string): boolean {
  const normalized = (method ?? 'GET').trim().toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD';
}

function sleepWithAbort(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Executes `fetch` with bounded retry backoff for idempotent `GET`/`HEAD` requests
 * when transient network errors or `502`/`503`/`504` gateway responses occur.
 * Honors `init.signal` so unmounted components cancel immediately.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    throw new Error('No fetch implementation available in this runtime.');
  }

  if (!isIdempotentMethod(init?.method)) {
    return fetchFn(input, init);
  }

  const maxRetries = Math.max(0, options.maxRetries ?? 2);
  const delays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn(input, init);
      if (!RETRYABLE_HTTP_STATUSES.has(response.status) || attempt === maxRetries) {
        return response;
      }
    } catch (err) {
      if (isAbortError(err) || init?.signal?.aborted || attempt === maxRetries) {
        throw err;
      }
    }

    const delayMs = delays[attempt] ?? delays[delays.length - 1] ?? 600;
    await sleepWithAbort(delayMs, init?.signal);
  }

  return fetchFn(input, init);
}
