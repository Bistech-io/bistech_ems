import { describe, expect, it } from 'vitest';
import { authMeDataSchema } from '@ems/contracts';
import {
  can,
  getRoleLabel,
  hasAnyRole,
  isAuthorizedForRule,
  resolvePermissionsForRoles,
  resolvePrimaryRole,
} from '@/lib/auth/permissions';

describe('permissions.can()', () => {
  it('returns false for null or empty auth context', () => {
    expect(can(null, 'employee.read')).toBe(false);
    expect(can(undefined, 'employee.read')).toBe(false);
    expect(can({ permissions: {} }, 'employee.read')).toBe(false);
  });

  it('enforces scope ordering own < team < department < managed < org', () => {
    const deptHead = { permissions: resolvePermissionsForRoles(['dept_head']) };

    expect(can(deptHead, 'employee.read', 'own')).toBe(true);
    expect(can(deptHead, 'employee.read', 'team')).toBe(true);
    expect(can(deptHead, 'employee.read', 'department')).toBe(true);
    expect(can(deptHead, 'employee.read', 'managed')).toBe(true);
    expect(can(deptHead, 'employee.read', 'org')).toBe(false);

    expect(can(deptHead, 'role.manage', 'own')).toBe(false);
  });

  it('grants org-wide permissions to super_admin and merges additive roles', () => {
    const merged = { permissions: resolvePermissionsForRoles(['employee', 'hr_manager']) };
    expect(can(merged, 'employee.create', 'org')).toBe(true);
    expect(can(merged, 'attendance.correct', 'org')).toBe(true);
    expect(can(merged, 'role.manage', 'org')).toBe(false);

    expect(hasAnyRole({ roles: ['employee', 'hr_manager'] }, ['hr_manager'])).toBe(true);
    expect(hasAnyRole({ roles: ['employee'] }, ['super_admin'])).toBe(false);
  });

  it('resolves highest-privilege primary role regardless of role array order', () => {
    expect(resolvePrimaryRole(['employee', 'dept_head'])).toBe('dept_head');
    expect(resolvePrimaryRole(['employee', 'hr_manager'])).toBe('hr_manager');
    expect(resolvePrimaryRole(['employee', 'dept_head', 'super_admin'])).toBe('super_admin');
    expect(resolvePrimaryRole(['department_head' as never])).toBe('dept_head');
    expect(resolvePrimaryRole(['employee', 'finance_auditor'])).toBe('finance_auditor');
    expect(resolvePrimaryRole([])).toBeNull();
  });

  it('formats labels and evaluates permission-driven rules for custom roles', () => {
    expect(getRoleLabel('finance_auditor')).toBe('Finance Auditor');
    expect(getRoleLabel('dept_head')).toBe('Dept Head');

    const customAuditor = {
      roles: ['employee', 'finance_auditor'],
      permissions: {
        'attendance.read': 'org' as const,
        'audit.read': 'org' as const,
      },
    };

    expect(
      isAuthorizedForRule(customAuditor, {
        allowedRoles: ['super_admin', 'hr_manager'],
        permission: 'attendance.read',
        minScope: 'org',
      }),
    ).toBe(true);

    expect(
      isAuthorizedForRule(customAuditor, {
        allowedRoles: ['super_admin'],
        permission: 'role.manage',
        minScope: 'org',
      }),
    ).toBe(false);

    // Validates @ems/contracts accepts custom role names in AuthMe payload
    const parsed = authMeDataSchema.parse({
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        username: 'auditor1',
        email: 'auditor@bistech.io',
        name: 'Audit User',
        accountStatus: 'active',
      },
      employeeId: null,
      roles: ['employee', 'finance_auditor'],
      permissions: { 'attendance.read': 'org', 'audit.read': 'org' },
      csrfToken: 'csrf-token-1',
    });
    expect(parsed.roles).toContain('finance_auditor');
  });
});
