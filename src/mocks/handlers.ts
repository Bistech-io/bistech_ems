import { http, HttpResponse } from 'msw';
import {
  authMeResponseSchema,
  ERROR_CODE_HTTP_STATUS,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  type AuthMeData,
} from '@ems/contracts';
import {
  buildAuthMePayload,
  buildErrorEnvelope,
  DEV_DEMO_PASSWORD,
  DEV_PASSWORD,
  MOCK_ACCOUNTS,
  resolveAccountForUsername,
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
          { field: 'username', message: 'Enter a valid username' },
        ]),
        { status: ERROR_CODE_HTTP_STATUS.VALIDATION_ERROR },
      );
    }

    const { username, password } = parsedReq.data;
    const normalized = username.toLowerCase();

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
          { field: 'username', message: 'This username is not allowed for this workspace' },
        ]),
        { status: ERROR_CODE_HTTP_STATUS.VALIDATION_ERROR },
      );
    }

    const expectedPassword =
      normalized === MOCK_ACCOUNTS.devDemo ? DEV_DEMO_PASSWORD : DEV_PASSWORD;

    if (password !== expectedPassword) {
      return HttpResponse.json(
        buildErrorEnvelope('INVALID_CREDENTIALS', 'Invalid username or password'),
        { status: ERROR_CODE_HTTP_STATUS.INVALID_CREDENTIALS },
      );
    }

    const account = resolveAccountForUsername(normalized);
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

  http.post('/api/v1/auth/reset-password', async ({ request }) => {
    const body = await request.json().catch(() => null);
    const parsedReq = resetPasswordRequestSchema.safeParse(body);

    if (!parsedReq.success) {
      return HttpResponse.json(
        buildErrorEnvelope('VALIDATION_ERROR', 'Password must be 12 to 128 characters', [
          { field: 'newPassword', message: 'Password must be 12 to 128 characters' },
        ]),
        { status: ERROR_CODE_HTTP_STATUS.VALIDATION_ERROR },
      );
    }

    const payload = resetPasswordResponseSchema.parse({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
      data: null,
      meta: null,
    });

    return HttpResponse.json(payload, { status: 200 });
  }),

  http.get('/api/v1/organization/settings', () => {
    return HttpResponse.json({
      success: true,
      message: 'Organization settings retrieved',
      data: {
        timezone: 'Asia/Dhaka',
        workStart: '09:30',
        workEnd: '18:00',
        graceMinutes: 15,
        weekendDays: [5, 6],
        name: 'BisTech',
        slug: 'bistech',
      },
      meta: null,
    });
  }),
];
