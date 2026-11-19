import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { z } from 'zod';
import { authMeResponseSchema, successEnvelopeSchema } from '@ems/contracts';
import { apiRequest, setOnUnauthenticated } from '@/lib/api/client';
import { clearCsrfToken, getCsrfToken, setCsrfToken } from '@/lib/api/csrf';
import { ApiError } from '@/lib/api/errors';
import { buildAuthMePayload, buildErrorEnvelope } from '@/mocks/scenarios';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  clearCsrfToken();
  setOnUnauthenticated(null);
});
afterAll(() => server.close());

describe('apiRequest browser client', () => {
  it('attaches X-CSRF-Token on state-changing requests and omits it on GET', async () => {
    setCsrfToken('csrf-abc');
    const seenMethods: Array<{ method: string; csrf: string | null }> = [];

    server.use(
      http.get('/api/v1/ping', ({ request }) => {
        seenMethods.push({ method: 'GET', csrf: request.headers.get('X-CSRF-Token') });
        return HttpResponse.json({
          success: true,
          message: 'ok',
          data: { ok: true },
          meta: null,
        });
      }),
      http.post('/api/v1/ping', ({ request }) => {
        seenMethods.push({ method: 'POST', csrf: request.headers.get('X-CSRF-Token') });
        return HttpResponse.json({
          success: true,
          message: 'ok',
          data: { ok: true },
          meta: null,
        });
      }),
    );

    const schema = successEnvelopeSchema(z.object({ ok: z.boolean() }).strict());
    await apiRequest('/ping', { method: 'GET', schema });
    await apiRequest('/ping', { method: 'POST', body: {}, schema });

    expect(seenMethods).toEqual([
      { method: 'GET', csrf: null },
      { method: 'POST', csrf: 'csrf-abc' },
    ]);
  });

  it('performs single-flight refresh on concurrent TOKEN_EXPIRED responses and retries once', async () => {
    setCsrfToken('csrf-old');
    let meCalls = 0;
    let refreshCalls = 0;

    server.use(
      http.get('/api/v1/auth/me', () => {
        meCalls += 1;
        if (meCalls <= 2) {
          return HttpResponse.json(
            buildErrorEnvelope('TOKEN_EXPIRED', 'Token expired'),
            { status: 401 },
          );
        }
        return HttpResponse.json({
          success: true,
          message: 'ok',
          data: buildAuthMePayload('admin', 'Admin', ['super_admin'], 'csrf-new'),
          meta: null,
        });
      }),
      http.post('/api/v1/auth/refresh', ({ request }) => {
        refreshCalls += 1;
        expect(request.headers.get('X-CSRF-Token')).toBe('csrf-old');
        return HttpResponse.json({
          success: true,
          message: 'refreshed',
          data: buildAuthMePayload('admin', 'Admin', ['super_admin'], 'csrf-new'),
          meta: null,
        });
      }),
    );

    const [res1, res2] = await Promise.all([
      apiRequest('/auth/me', { schema: authMeResponseSchema }),
      apiRequest('/auth/me', { schema: authMeResponseSchema }),
    ]);

    expect(refreshCalls).toBe(1);
    expect(meCalls).toBe(4);
    expect(res1.data.csrfToken).toBe('csrf-new');
    expect(res2.data.csrfToken).toBe('csrf-new');
    expect(getCsrfToken()).toBe('csrf-new');
  });

  it('throws ApiError INTERNAL_ERROR when response fails schema validation', async () => {
    server.use(
      http.get('/api/v1/auth/me', () => {
        return HttpResponse.json({
          success: true,
          message: 'bad',
          data: { unexpected: true },
          meta: null,
        });
      }),
    );

    await expect(
      apiRequest('/auth/me', { schema: authMeResponseSchema }),
    ).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    } satisfies Partial<ApiError>);
  });

  it('clears CSRF token and notifies callback when refresh returns UNAUTHENTICATED', async () => {
    setCsrfToken('csrf-stale');
    const onUnauth = vi.fn();
    setOnUnauthenticated(onUnauth);

    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(buildErrorEnvelope('TOKEN_EXPIRED', 'Expired'), { status: 401 }),
      ),
      http.post('/api/v1/auth/refresh', () =>
        HttpResponse.json(buildErrorEnvelope('UNAUTHENTICATED', 'Session revoked'), { status: 401 }),
      ),
    );

    await expect(
      apiRequest('/auth/me', { schema: authMeResponseSchema }),
    ).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });

    expect(getCsrfToken()).toBeNull();
    expect(onUnauth).toHaveBeenCalledTimes(1);
  });
});
