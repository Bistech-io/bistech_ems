/**
 * RBAC types, permission keys, scope hierarchy, and client-side visibility helpers.
 * Mirrors the 32 permissions and 4 roles defined in FSD.md section 1.
 * Note: Client-side checks control UI/navigation visibility only; the backend enforces all rules.
 */

export type RoleName = 'super_admin' | 'hr_manager' | 'dept_head' | 'employee';

export type ScopeLevel = 'own' | 'team' | 'department' | 'managed' | 'org';

export type PermissionKey =
  | 'user.read'
  | 'user.manage'
  | 'role.manage'
  | 'audit.read'
  | 'org.settings.manage'
  | 'employee.read'
  | 'employee.read.sensitive'
  | 'employee.create'
  | 'employee.update'
  | 'employee.status.manage'
  | 'employee.history.read'
  | 'org.structure.read'
  | 'org.structure.manage'
  | 'department.head.assign'
  | 'attendance.self'
  | 'attendance.read'
  | 'attendance.correct'
  | 'task.create.self'
  | 'task.assign'
  | 'task.read'
  | 'task.board.team'
  | 'task.board.department'
  | 'task.work'
  | 'task.comment'
  | 'task.review'
  | 'task.manage'
  | 'team.read'
  | 'team.manage'
  | 'dashboard.read'
  | 'feedback.submit'
  | 'feedback.read'
  | 'feedback.manage';

export type PermissionGrantMap = Partial<Record<PermissionKey, ScopeLevel>>;

export interface UserAuthContext {
  userId: string;
  employeeId?: string;
  name: string;
  email: string;
  roleTitle?: string;
  roles: RoleName[];
  permissions: PermissionGrantMap;
}

const SCOPE_ORDER: Record<ScopeLevel, number> = {
  own: 1,
  team: 2,
  department: 3,
  managed: 4,
  org: 5,
};

export const ROLE_LABELS: Record<RoleName, string> = {
  super_admin: 'Super Admin',
  hr_manager: 'HR Manager',
  dept_head: 'Dept Head',
  employee: 'Employee',
};

/**
 * Default permission matrices per role from FSD.md section 1.
 * Used as fallback or for role-preview mode before /auth/me is connected.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<RoleName, PermissionGrantMap> = {
  super_admin: {
    'user.read': 'org',
    'user.manage': 'org',
    'role.manage': 'org',
    'audit.read': 'org',
    'org.settings.manage': 'org',
    'employee.read': 'org',
    'employee.read.sensitive': 'org',
    'employee.create': 'org',
    'employee.update': 'org',
    'employee.status.manage': 'org',
    'employee.history.read': 'org',
    'org.structure.read': 'org',
    'org.structure.manage': 'org',
    'department.head.assign': 'org',
    'attendance.self': 'own',
    'attendance.read': 'org',
    'attendance.correct': 'org',
    'task.create.self': 'own',
    'task.assign': 'org',
    'task.read': 'org',
    'task.board.team': 'org',
    'task.board.department': 'org',
    'task.work': 'own',
    'task.comment': 'org',
    'task.review': 'org',
    'task.manage': 'org',
    'team.read': 'org',
    'team.manage': 'org',
    'dashboard.read': 'org',
    'feedback.submit': 'own',
    'feedback.read': 'org',
    'feedback.manage': 'org',
  },
  hr_manager: {
    'employee.read': 'org',
    'employee.read.sensitive': 'org',
    'employee.create': 'org',
    'employee.update': 'org',
    'employee.status.manage': 'org',
    'employee.history.read': 'org',
    'org.structure.read': 'org',
    'org.structure.manage': 'org',
    'attendance.self': 'own',
    'attendance.read': 'org',
    'attendance.correct': 'org',
    'task.create.self': 'own',
    'task.read': 'own',
    'task.board.team': 'team',
    'task.board.department': 'department',
    'task.work': 'own',
    'task.comment': 'own',
    'team.read': 'team',
    'dashboard.read': 'org',
    'feedback.submit': 'own',
    'feedback.read': 'own',
  },
  dept_head: {
    'employee.read': 'managed',
    'org.structure.read': 'org',
    'attendance.self': 'own',
    'attendance.read': 'managed',
    'task.create.self': 'own',
    'task.assign': 'managed',
    'task.read': 'managed',
    'task.board.team': 'managed',
    'task.board.department': 'managed',
    'task.work': 'own',
    'task.comment': 'managed',
    'task.review': 'managed',
    'task.manage': 'managed',
    'team.read': 'managed',
    'team.manage': 'managed',
    'dashboard.read': 'managed',
    'feedback.submit': 'own',
    'feedback.read': 'own',
  },
  employee: {
    'employee.read': 'own',
    'employee.read.sensitive': 'own',
    'org.structure.read': 'org',
    'attendance.self': 'own',
    'attendance.read': 'own',
    'task.create.self': 'own',
    'task.read': 'own',
    'task.board.team': 'team',
    'task.board.department': 'department',
    'task.work': 'own',
    'task.comment': 'own',
    'team.read': 'team',
    'dashboard.read': 'own',
    'feedback.submit': 'own',
    'feedback.read': 'own',
  },
};

/**
 * Resolves the additive union of permissions across one or more roles.
 */
export function resolvePermissionsForRoles(roles: RoleName[]): PermissionGrantMap {
  const merged: PermissionGrantMap = {};

  for (const role of roles) {
    const grants = ROLE_DEFAULT_PERMISSIONS[role];
    if (!grants) continue;

    for (const [key, scope] of Object.entries(grants) as [PermissionKey, ScopeLevel][]) {
      const existing = merged[key];
      if (!existing || SCOPE_ORDER[scope] > SCOPE_ORDER[existing]) {
        merged[key] = scope;
      }
    }
  }

  return merged;
}

/**
 * Checks whether the current user has the required permission at or above minScope.
 */
export function can(
  auth: Pick<UserAuthContext, 'permissions'> | null | undefined,
  permission: PermissionKey,
  minScope: ScopeLevel = 'own',
): boolean {
  if (!auth?.permissions) return false;
  const granted = auth.permissions[permission];
  if (!granted) return false;
  return SCOPE_ORDER[granted] >= SCOPE_ORDER[minScope];
}

/**
 * Checks whether the user holds at least one of the specified roles.
 */
export function hasAnyRole(
  auth: Pick<UserAuthContext, 'roles'> | null | undefined,
  allowedRoles: RoleName[],
): boolean {
  if (!auth?.roles?.length) return false;
  return allowedRoles.some((role) => auth.roles.includes(role));
}
