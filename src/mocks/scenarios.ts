import {
  authMeDataSchema,
  errorEnvelopeSchema,
  type AuthMeData,
  type ErrorCode,
  type FieldError,
  type RoleName,
} from '@ems/contracts';
import { resolvePermissionsForRoles } from '@/lib/auth/permissions';

export type MockScenarioId =
  | 'default'
  | 'expired-once-refresh-ok'
  | 'refresh-fails';

export const DEV_PASSWORD = 'DevPassword123!';

export const MOCK_ACCOUNTS = {
  admin: 'admin@example.com',
  hr: 'hr@example.com',
  deptHead: 'head@example.com',
  employee: 'employee@example.com',
  locked: 'locked@example.com',
  rateLimited: 'ratelimited@example.com',
  validationError: 'validation@example.com',
  expiredRefreshOk: 'expired@example.com',
  refreshFail: 'refreshfail@example.com',
} as const;

export function buildAuthMePayload(
  email: string,
  name: string,
  roles: RoleName[],
  csrfToken: string,
): AuthMeData {
  return authMeDataSchema.parse({
    user: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      email,
      name,
      accountStatus: 'active',
    },
    employeeId: '550e8400-e29b-41d4-a716-446655440099',
    roles,
    permissions: resolvePermissionsForRoles(roles),
    csrfToken,
  });
}

export function buildErrorEnvelope(
  code: ErrorCode,
  message: string,
  details?: FieldError[],
) {
  return errorEnvelopeSchema.parse({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    requestId: `mock-req-${Date.now()}`,
  });
}

export function resolveAccountForEmail(email: string): {
  name: string;
  roles: RoleName[];
} {
  switch (email.toLowerCase()) {
    case MOCK_ACCOUNTS.hr:
      return { name: 'Nadia Rahman (HR)', roles: ['hr_manager'] };
    case MOCK_ACCOUNTS.deptHead:
      return { name: 'Farhan Ahmed (Head)', roles: ['dept_head'] };
    case MOCK_ACCOUNTS.employee:
      return { name: 'Mehedi Alam', roles: ['employee'] };
    default:
      return { name: 'Super Admin', roles: ['super_admin'] };
  }
}
