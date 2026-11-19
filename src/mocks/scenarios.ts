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
export const DEV_DEMO_PASSWORD = 'verysecurepass';

export const MOCK_ACCOUNTS = {
  devDemo: 'devdemo',
  admin: 'admin',
  hr: 'hr.manager',
  deptHead: 'dept.head',
  employee: 'employee',
  locked: 'locked',
  rateLimited: 'ratelimited',
  validationError: 'validation',
  expiredRefreshOk: 'expired',
  refreshFail: 'refreshfail',
} as const;

export function buildAuthMePayload(
  username: string,
  name: string,
  roles: RoleName[],
  csrfToken: string,
): AuthMeData {
  return authMeDataSchema.parse({
    user: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      username,
      email: `${username}@bistech.io`,
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

export function resolveAccountForUsername(username: string): {
  name: string;
  roles: RoleName[];
} {
  switch (username.toLowerCase()) {
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
