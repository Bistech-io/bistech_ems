import { http, HttpResponse } from 'msw';
import {
  authMeResponseSchema,
  ERROR_CODE_HTTP_STATUS,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  type AuthMeData,
} from '@ems/contracts';
import {
  buildAuthMePayload,
  buildErrorEnvelope,
  DEV_PASSWORD,
  MOCK_ACCOUNTS,
  resolveAccountForEmail,
} from './scenarios';

interface MockSessionState {
  authenticated: boolean;
  sessionData: AuthMeData | null;
  csrfToken: string;
  shouldExpireNextMe: boolean;
  shouldFailRefresh: boolean;
}

const state: MockSessionState = {
  authenticated: false,
  sessionData: null,
  csrfToken: 'mock-csrf-initial',
  shouldExpireNextMe: false,
  shouldFailRefresh: false,
};

function setMockSessionCookie(active: boolean) {
  if (typeof document === 'undefined') return;
  if (active) {
    document.cookie = 'ems_access=mock-session; path=/; SameSite=Lax';
  } else {
    document.cookie = 'ems_access=; path=/; Max-Age=0; SameSite=Lax';
  }
}

export function resetMockSessionState() {
  state.authenticated = false;
  state.sessionData = null;
  state.csrfToken = 'mock-csrf-initial';
  state.shouldExpireNextMe = false;
  state.shouldFailRefresh = false;
  setMockSessionCookie(false);
}

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsedReq = loginRequestSchema.safeParse(body);

    if (!parsedReq.success) {
      return HttpResponse.json(
        buildErrorEnvelope('VALIDATION_ERROR', 'Invalid request payload', [
          { field: 'email', message: 'Enter a valid email address' },
        ]),
        { status: ERROR_CODE_HTTP_STATUS.VALIDATION_ERROR },
      );
    }

    const { email, password } = parsedReq.data;
    const normalized = email.toLowerCase();

    if (normalized === MOCK_ACCOUNTS.locked) {
      return HttpResponse.json(
        buildErrorEnvelope('ACCOUNT_LOCKED', 'Account locked'),
        { status: ERROR_CODE_HTTP_STATUS.ACCOUNT_LOCKED },
      );
    }

    if (normalized === MOCK_ACCOUNTS.rateLimited) {
      return HttpResponse.json(
        buildErrorEnvelope('RATE_LIMITED', 'Too many login attempts'),
        {
          status: ERROR_CODE_HTTP_STATUS.RATE_LIMITED,
          headers: { 'Retry-After': '60' },
        },
      );
    }

    if (normalized === MOCK_ACCOUNTS.validationError) {
      return HttpResponse.json(
        buildErrorEnvelope('VALIDATION_ERROR', 'Validation error', [
          { field: 'email', message: 'This email domain is not allowed for this workspace' },
        ]),
        { status: ERROR_CODE_HTTP_STATUS.VALIDATION_ERROR },
      );
    }

    if (password !== DEV_PASSWORD) {
      return HttpResponse.json(
        buildErrorEnvelope('INVALID_CREDENTIALS', 'Invalid email or password'),
        { status: ERROR_CODE_HTTP_STATUS.INVALID_CREDENTIALS },
      );
    }

    const account = resolveAccountForEmail(normalized);
    const nextCsrf = `mock-csrf-${Date.now()}`;
    const sessionData = buildAuthMePayload(normalized, account.name, account.roles, nextCsrf);

    state.authenticated = true;
    state.csrfToken = nextCsrf;
    state.sessionData = sessionData;
    state.shouldExpireNextMe =
      normalized === MOCK_ACCOUNTS.expiredRefreshOk || normalized === MOCK_ACCOUNTS.refreshFail;
    state.shouldFailRefresh = normalized === MOCK_ACCOUNTS.refreshFail;

    setMockSessionCookie(true);

    const payload = loginResponseSchema.parse({
      success: true,
      message: 'Signed in successfully',
      data: sessionData,
      meta: null,
    });

    return HttpResponse.json(payload, { status: 200 });
  }),

  http.get('/api/v1/auth/me', () => {
    if (!state.authenticated || !state.sessionData) {
      return HttpResponse.json(
        buildErrorEnvelope('UNAUTHENTICATED', 'Authentication required'),
        { status: ERROR_CODE_HTTP_STATUS.UNAUTHENTICATED },
      );
    }

    if (state.shouldExpireNextMe) {
      state.shouldExpireNextMe = false;
      return HttpResponse.json(
        buildErrorEnvelope('TOKEN_EXPIRED', 'Access token expired'),
        { status: ERROR_CODE_HTTP_STATUS.TOKEN_EXPIRED },
      );
    }

    const payload = authMeResponseSchema.parse({
      success: true,
      message: 'Session loaded',
      data: state.sessionData,
      meta: null,
    });

    return HttpResponse.json(payload, { status: 200 });
  }),

  http.post('/api/v1/auth/refresh', ({ request }) => {
    const csrfHeader = request.headers.get('X-CSRF-Token');
    if (!state.authenticated || !state.sessionData || state.shouldFailRefresh) {
      resetMockSessionState();
      return HttpResponse.json(
        buildErrorEnvelope('UNAUTHENTICATED', 'Refresh token invalid or expired'),
        { status: ERROR_CODE_HTTP_STATUS.UNAUTHENTICATED },
      );
    }

    if (!csrfHeader || csrfHeader !== state.csrfToken) {
      return HttpResponse.json(
        buildErrorEnvelope('CSRF_FAILED', 'CSRF token mismatch'),
        { status: ERROR_CODE_HTTP_STATUS.CSRF_FAILED },
      );
    }

    const nextCsrf = `mock-csrf-refreshed-${Date.now()}`;
    state.csrfToken = nextCsrf;
    state.sessionData = {
      ...state.sessionData,
      csrfToken: nextCsrf,
    };

    const payload = refreshResponseSchema.parse({
      success: true,
      message: 'Session refreshed',
      data: state.sessionData,
      meta: null,
    });

    return HttpResponse.json(payload, { status: 200 });
  }),

  http.post('/api/v1/auth/logout', ({ request }) => {
    const csrfHeader = request.headers.get('X-CSRF-Token');
    if (state.authenticated && (!csrfHeader || csrfHeader !== state.csrfToken)) {
      return HttpResponse.json(
        buildErrorEnvelope('CSRF_FAILED', 'CSRF token mismatch'),
        { status: ERROR_CODE_HTTP_STATUS.CSRF_FAILED },
      );
    }

    resetMockSessionState();

    const payload = logoutResponseSchema.parse({
      success: true,
      message: 'Signed out',
      data: null,
      meta: null,
    });

    return HttpResponse.json(payload, { status: 200 });
  }),
];
