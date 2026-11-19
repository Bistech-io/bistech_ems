import { describe, expect, it } from 'vitest';
import {
  authMeDataSchema,
  authMeResponseSchema,
  errorEnvelopeSchema,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  refreshResponseSchema,
} from '../src/index';

const VALID_AUTH_ME_DATA = {
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'admin',
    email: 'admin@example.com',
    name: 'Super Admin',
    accountStatus: 'active' as const,
  },
  employeeId: '550e8400-e29b-41d4-a716-446655440001',
  roles: ['super_admin' as const],
  permissions: {
    'user.read': 'org' as const,
    'role.manage': 'org' as const,
    'dashboard.read': 'org' as const,
  },
  csrfToken: 'csrf-token-123',
};

describe('@ems/contracts auth schemas', () => {
  it('accepts valid login request with and without organizationSlug', () => {
    expect(
      loginRequestSchema.parse({
        username: 'admin',
        password: 'DevPassword123!',
      }),
    ).toEqual({
      username: 'admin',
      password: 'DevPassword123!',
    });

    expect(
      loginRequestSchema.parse({
        username: 'admin',
        password: 'DevPassword123!',
        organizationSlug: 'bistech',
      }),
    ).toEqual({
      username: 'admin',
      password: 'DevPassword123!',
      organizationSlug: 'bistech',
    });
  });

  it('rejects invalid login requests and unknown fields', () => {
    expect(() =>
      loginRequestSchema.parse({
        username: 'ab',
        password: 'secret',
      }),
    ).toThrow();

    expect(() =>
      loginRequestSchema.parse({
        username: 'admin',
        password: '',
      }),
    ).toThrow();

    expect(() =>
      loginRequestSchema.parse({
        username: 'admin',
        password: 'secret',
        extraField: true,
      }),
    ).toThrow();
  });

  it('accepts valid auth/me, login, refresh, and logout envelopes', () => {
    expect(authMeDataSchema.parse(VALID_AUTH_ME_DATA)).toEqual(VALID_AUTH_ME_DATA);

    const successPayload = {
      success: true as const,
      message: 'Authenticated',
      data: VALID_AUTH_ME_DATA,
      meta: null,
    };

    expect(authMeResponseSchema.parse(successPayload)).toEqual(successPayload);
    expect(loginResponseSchema.parse(successPayload)).toEqual(successPayload);
    expect(refreshResponseSchema.parse(successPayload)).toEqual(successPayload);

    const logoutPayload = {
      success: true as const,
      message: 'Logged out',
      data: null,
      meta: null,
    };
    expect(logoutResponseSchema.parse(logoutPayload)).toEqual(logoutPayload);
  });

  it('rejects invalid roles, invalid permission keys, or missing csrfToken', () => {
    expect(() =>
      authMeDataSchema.parse({
        ...VALID_AUTH_ME_DATA,
        roles: ['unknown_role'],
      }),
    ).toThrow();

    expect(() =>
      authMeDataSchema.parse({
        ...VALID_AUTH_ME_DATA,
        permissions: { 'invalid.perm': 'org' },
      }),
    ).toThrow();

    expect(() =>
      authMeDataSchema.parse({
        ...VALID_AUTH_ME_DATA,
        csrfToken: '',
      }),
    ).toThrow();
  });

  it('accepts valid error envelopes and rejects unknown error codes', () => {
    const validError = {
      success: false as const,
      error: {
        code: 'VALIDATION_ERROR' as const,
        message: 'Validation failed',
        details: [{ field: 'email', message: 'Invalid email format' }],
      },
      requestId: 'req-123',
    };

    expect(errorEnvelopeSchema.parse(validError)).toEqual(validError);

    expect(() =>
      errorEnvelopeSchema.parse({
        ...validError,
        error: { ...validError.error, code: 'SOME_UNKNOWN_CODE' },
      }),
    ).toThrow();
  });
});
