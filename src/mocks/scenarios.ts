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

export const DEV_PASSWORD = 'Password123!';

export const MOCK_ACCOUNTS = {
  admin: 'admin',
  hr: 'hr',
  deptHead: 'head',
  employee: 'employee',
  locked: 'locked',
  rateLimited: 'ratelimited',
  validationError: 'validation',
  expiredRefreshOk: 'expired',
  refreshFail: 'refreshfail',
} as const;

export function buildAuthMePayload(
  email: string,
  name: string,
  roles: RoleName[],
  csrfToken: string,
  username?: string,
): AuthMeData {
  return authMeDataSchema.parse({
    user: {
      id: '550e8400-e29b-41d4-a716-446655440010',
      username: username ?? email.split('@')[0] ?? 'admin',
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

export function resolveAccountForEmail(identifier: string): {
  name: string;
  roles: RoleName[];
  username: string;
  email: string;
} {
  const norm = identifier.toLowerCase();
  if (norm === 'hr' || norm === 'hr@example.com') {
    return { name: 'Nadia Rahman (HR)', roles: ['hr_manager'], username: 'hr', email: 'hr@example.com' };
  }
  if (norm === 'head' || norm === 'depthead' || norm === 'head@example.com') {
    return { name: 'Farhan Ahmed (Head)', roles: ['dept_head'], username: 'head', email: 'head@example.com' };
  }
  if (norm === 'employee' || norm === 'employee@example.com') {
    return { name: 'Mehedi Alam', roles: ['employee'], username: 'employee', email: 'employee@example.com' };
  }
  const u = norm.includes('@') ? norm.split('@')[0] : norm;
  const e = norm.includes('@') ? norm : `${norm}@example.com`;
  return { name: 'Super Admin', roles: ['super_admin'], username: u, email: e };
}
