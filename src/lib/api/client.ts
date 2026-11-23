import { z } from 'zod';
import {
  errorEnvelopeSchema,
  refreshResponseSchema,
  type AuthMeData,
} from '@ems/contracts';
import { clearCsrfToken, getCsrfToken, setCsrfToken } from './csrf';
import { ApiError } from './errors';

const API_PREFIX = '/api/v1';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface ApiRequestOptions<TDataSchema extends z.ZodTypeAny> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema: TDataSchema;
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<AuthMeData> | null = null;
let onUnauthenticatedCallback: (() => void) | null = null;

/**
 * Registers a callback invoked when session refresh fails with UNAUTHENTICATED.
 */
export function setOnUnauthenticated(callback: (() => void) | null): void {
  onUnauthenticatedCallback = callback;
}

function buildUrl(path: string): string {
  if (path.startsWith(API_PREFIX)) return path;
  return `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('BAD_REQUEST', response.status, [], 'invalid-json');
  }
}

async function performRefresh(): Promise<AuthMeData> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const headers = new Headers({
        'Content-Type': 'application/json',
      });
      const token = getCsrfToken();
      if (token) {
        headers.set('X-CSRF-Token', token);
      }

      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers,
      });

      const raw = await parseJsonSafe(response);

      if (!response.ok) {
        const parsedError = errorEnvelopeSchema.safeParse(raw);
        const code = parsedError.success ? parsedError.data.error.code : 'UNAUTHENTICATED';
        const requestId = parsedError.success ? parsedError.data.requestId : 'unknown';
        clearCsrfToken();
        if (code === 'UNAUTHENTICATED' || response.status === 401) {
          onUnauthenticatedCallback?.();
        }
        throw new ApiError(code, response.status, [], requestId);
      }

      const parsed = refreshResponseSchema.safeParse(raw);
      if (!parsed.success) {
        clearCsrfToken();
        throw new ApiError('INTERNAL_ERROR', 500, [], 'schema-mismatch');
      }

      setCsrfToken(parsed.data.data.csrfToken);
      return parsed.data.data;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Browser API client.
 * - Same-origin `/api/v1/*` with `credentials: 'include'`
 * - Attaches `X-CSRF-Token` on state-changing requests
 * - Single-flight refresh on `TOKEN_EXPIRED` + single retry
 * - Validates every response against `@ems/contracts` schemas
 */
export async function apiRequest<TDataSchema extends z.ZodTypeAny>(
  path: string,
  options: ApiRequestOptions<TDataSchema>,
  hasRetried = false,
): Promise<z.infer<TDataSchema>> {
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (STATE_CHANGING_METHODS.has(method)) {
    const token = getCsrfToken();
    if (token) {
      headers.set('X-CSRF-Token', token);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      credentials: 'include',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('SERVICE_UNAVAILABLE', 503, [], 'network-error');
  }

  const raw = await parseJsonSafe(response);

  if (!response.ok) {
    const parsedError = errorEnvelopeSchema.safeParse(raw);
    if (!parsedError.success) {
      throw new ApiError(
        response.status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        response.status,
        [],
        'invalid-error-envelope',
      );
    }

    const { error, requestId } = parsedError.data;

    if (
      error.code === 'TOKEN_EXPIRED' &&
      !options.skipAuthRefresh &&
      !hasRetried
    ) {
      await performRefresh();
      return apiRequest(path, options, true);
    }

    if (error.code === 'UNAUTHENTICATED') {
      clearCsrfToken();
      onUnauthenticatedCallback?.();
    }

    throw new ApiError(error.code, response.status, error.details ?? [], requestId, error.message);
  }

  const parsedSuccess = options.schema.safeParse(raw);
  if (!parsedSuccess.success) {
    throw new ApiError('INTERNAL_ERROR', response.status, [], 'invalid-success-envelope');
  }

  return parsedSuccess.data;
}
