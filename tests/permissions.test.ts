import { describe, expect, it } from 'vitest';
import { can, hasAnyRole, resolvePermissionsForRoles } from '@/lib/auth/permissions';

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
});
