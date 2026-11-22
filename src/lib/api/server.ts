import { cookies } from 'next/headers';
import { z } from 'zod';
import { errorEnvelopeSchema } from '@ems/contracts';
import { getServerEnv } from '@/lib/env';
import { ApiError } from './errors';

const API_PREFIX = '/api/v1';

/**
 * Server-only API helper for Server Components.
 * Forwards incoming request cookies to `API_INTERNAL_URL` and validates responses with Zod.
 */
export async function serverApiRequest<TDataSchema extends z.ZodTypeAny>(
  path: string,
  schema: TDataSchema,
  init?: { method?: 'GET' | 'POST'; body?: unknown },
): Promise<z.infer<TDataSchema>> {
  const { API_INTERNAL_URL } = getServerEnv();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const normalizedPath = path.startsWith(API_PREFIX)
    ? path
    : `${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;

  const url = `${API_INTERNAL_URL.replace(/\/$/, '')}${normalizedPath}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new ApiError('SERVICE_UNAVAILABLE', 503, [], 'server-fetch-failed');
  }

  let raw: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      raw = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError('BAD_REQUEST', response.status, [], 'invalid-json');
    }
  }

  if (!response.ok) {
    const parsedError = errorEnvelopeSchema.safeParse(raw);
    if (!parsedError.success) {
      throw new ApiError('INTERNAL_ERROR', response.status, [], 'invalid-error-envelope');
    }
    const { error, requestId } = parsedError.data;
    throw new ApiError(error.code, response.status, error.details ?? [], requestId);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('INTERNAL_ERROR', response.status, [], 'invalid-success-envelope');
  }

  return parsed.data;
}
