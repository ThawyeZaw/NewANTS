import {
  ApiErrorResponseSchema,
  AuthSessionBundleSchema,
  AuthSignInEmailInputSchema,
  AuthSignUpInputSchema,
  type AuthSessionBundle,
  type AuthSignInEmailInput,
  type AuthSignUpInput,
} from '@ants/shared-types';
import { fetchWithRetry } from './fetch-retry';
import { resolveApiBaseUrl } from './redirects';

export const ANTS_AUTH_CLIENT_EVENT = 'ants-auth-session-change';

export interface AuthApiError {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

export type AuthApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthApiError };

export interface AuthClientConfig {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface GetSessionRequestOptions {
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export interface AntsAuthClient {
  getBaseUrl: () => string;
  getSession: (options?: GetSessionRequestOptions) => Promise<AuthApiResult<AuthSessionBundle | null>>;
  signInWithEmail: (input: AuthSignInEmailInput) => Promise<AuthApiResult<AuthSessionBundle>>;
  signUpWithEmail: (input: AuthSignUpInput) => Promise<AuthApiResult<AuthSessionBundle>>;
  signOut: () => Promise<AuthApiResult<{ signedOut: true }>>;
}

function broadcastAuthSessionEvent(session: AuthSessionBundle | null): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  try {
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent(ANTS_AUTH_CLIENT_EVENT, { detail: session }));
    }
  } catch {
    // Ignore environments without CustomEvent constructor
  }
}

function parseErrorPayload(rawJson: unknown, status: number): AuthApiError {
  const parsedErr = ApiErrorResponseSchema.safeParse(rawJson);
  if (parsedErr.success) {
    return {
      code: parsedErr.data.error.code,
      message: parsedErr.data.error.message,
      status,
      details: parsedErr.data.error.details,
    };
  }
  return {
    code: status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED',
    message: `Authentication request failed with status ${status}.`,
    status,
  };
}

/**
 * Creates a typed HTTP client targeting `@ants/api` (`/api/auth/*`) with
 * `credentials: 'include'` for cross-subdomain `.the-ants.org` / `localhost` SSO.
 */
export function createAuthClient(config: AuthClientConfig = {}): AntsAuthClient {
  const getBaseUrl = () => resolveApiBaseUrl(config.baseUrl);
  const runFetch = (input: RequestInfo | URL, init?: RequestInit): ReturnType<typeof fetch> =>
    fetchWithRetry(input, init, { fetchImpl: config.fetchImpl });

  async function requestJson(
    path: string,
    init: RequestInit
  ): Promise<{ ok: true; status: number; json: unknown } | { ok: false; error: AuthApiError }> {
    const url = `${getBaseUrl()}${path}`;
    try {
      const response = await runFetch(url, {
        ...init,
        credentials: 'include',
      });

      let rawJson: unknown = null;
      try {
        rawJson = await response.json();
      } catch {
        rawJson = null;
      }

      if (!response.ok) {
        return {
          ok: false,
          error: parseErrorPayload(rawJson, response.status),
        };
      }

      return {
        ok: true,
        status: response.status,
        json: rawJson,
      };
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Unable to reach @ants/api.';
      return {
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
          status: 0,
        },
      };
    }
  }

  return {
    getBaseUrl,

    async getSession(options = {}) {
      const res = await requestJson('/api/auth/get-session', {
        method: 'GET',
        headers: options.headers,
        signal: options.signal,
        cache: 'no-store',
      });

      if (!res.ok) {
        return res;
      }

      const envelope = res.json as { ok?: boolean; data?: unknown } | null;
      if (!envelope || envelope.data === null || envelope.data === undefined) {
        return { ok: true, data: null };
      }

      const parsedBundle = AuthSessionBundleSchema.safeParse(envelope.data);
      if (!parsedBundle.success) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SESSION_PAYLOAD',
            message: 'Session response from @ants/api did not match AuthSessionBundleSchema.',
            status: res.status,
            details: parsedBundle.error.flatten(),
          },
        };
      }

      return { ok: true, data: parsedBundle.data };
    },

    async signInWithEmail(input) {
      const validated = AuthSignInEmailInputSchema.safeParse(input);
      if (!validated.success) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validated.error.issues[0]?.message ?? 'Enter a valid email and password.',
            status: 400,
            details: validated.error.flatten(),
          },
        };
      }

      const res = await requestJson('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated.data),
      });

      if (!res.ok) {
        return res;
      }

      const envelope = res.json as { data?: unknown } | null;
      const parsedBundle = AuthSessionBundleSchema.safeParse(envelope?.data);
      if (!parsedBundle.success) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SESSION_PAYLOAD',
            message: 'Sign-in response did not match AuthSessionBundleSchema.',
            status: res.status,
            details: parsedBundle.error.flatten(),
          },
        };
      }

      broadcastAuthSessionEvent(parsedBundle.data);
      return { ok: true, data: parsedBundle.data };
    },

    async signUpWithEmail(input) {
      const validated = AuthSignUpInputSchema.safeParse(input);
      if (!validated.success) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validated.error.issues[0]?.message ?? 'Invalid sign-up details.',
            status: 400,
            details: validated.error.flatten(),
          },
        };
      }

      const res = await requestJson('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated.data),
      });

      if (!res.ok) {
        return res;
      }

      const envelope = res.json as { data?: unknown } | null;
      const parsedBundle = AuthSessionBundleSchema.safeParse(envelope?.data);
      if (!parsedBundle.success) {
        return {
          ok: false,
          error: {
            code: 'INVALID_SESSION_PAYLOAD',
            message: 'Sign-up response did not match AuthSessionBundleSchema.',
            status: res.status,
            details: parsedBundle.error.flatten(),
          },
        };
      }

      broadcastAuthSessionEvent(parsedBundle.data);
      return { ok: true, data: parsedBundle.data };
    },

    async signOut() {
      const res = await requestJson('/api/auth/sign-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (!res.ok) {
        return res;
      }

      broadcastAuthSessionEvent(null);
      return { ok: true, data: { signedOut: true as const } };
    },
  };
}

export const authClient = createAuthClient();
