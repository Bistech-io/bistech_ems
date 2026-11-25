import type {
  AuthMeData,
  PermissionGrantMap,
  PermissionKey,
  RoleName,
  ScopeLevel,
  SystemRoleName,
} from '@ems/contracts';

export type {
  AuthMeData,
  PermissionGrantMap,
  PermissionKey,
  RoleName,
  ScopeLevel,
  SystemRoleName,
};

export interface UserAuthContext {
  userId: string;
  employeeId?: string | null;
  username?: string;
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

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_manager: 'HR Manager',
  dept_head: 'Dept Head',
  employee: 'Employee',
};

const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 4,
  hr_manager: 3,
  dept_head: 2,
  employee: 1,
};

const SYSTEM_ROLE_SET = new Set([
  'super_admin',
  'hr_manager',
  'dept_head',
  'department_head',
  'employee',
]);

export function isCustomRoleName(role: string): boolean {
  return !SYSTEM_ROLE_SET.has(role.trim().toLowerCase());
}

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  const normalized = normalizeRoleName(role) ?? role.trim().toLowerCase();
  if (ROLE_LABELS[normalized]) {
    return ROLE_LABELS[normalized];
  }
  return normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeRoleName(role: string): RoleName | null {
  const trimmed = role.trim().toLowerCase();
  if (!trimmed) return null;
  if (trimmed === 'department_head' || trimmed === 'dept_head') return 'dept_head';
  return trimmed;
}

/**
 * Picks the highest-privilege role from an unsorted roles array
 * (super_admin > hr_manager > dept_head > custom roles > employee).
 */
export function resolvePrimaryRole(
  roles: readonly (RoleName | string)[] | null | undefined,
): RoleName | null {
  if (!roles || roles.length === 0) return null;

  let best: RoleName | null = null;
  let bestScore = -1;

  for (const rawRole of roles) {
    const normalized = normalizeRoleName(rawRole);
    if (!normalized) continue;
    const score = ROLE_PRIORITY[normalized] ?? 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = normalized;
    }
  }

  return best;
}

/**
 * Default permission matrices per role from FSD.md section 1.
 * Used for role-preview mode in development until GET /auth/me is connected.
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

export function authMeToUserContext(authMe: AuthMeData): UserAuthContext {
  const normalizedRoles = Array.from(
    new Set(
      authMe.roles
        .map((r) => normalizeRoleName(r))
        .filter((r): r is RoleName => r !== null),
    ),
  );
  const primaryRole = resolvePrimaryRole(normalizedRoles) ?? 'employee';

  return {
    userId: authMe.user.id,
    employeeId: authMe.employeeId,
    username: authMe.user.username,
    name: authMe.user.name,
    email: authMe.user.email ?? authMe.user.username,
    roleTitle: getRoleLabel(primaryRole),
    roles: normalizedRoles.length > 0 ? normalizedRoles : authMe.roles,
    permissions: authMe.permissions,
  };
}

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
  auth: { permissions?: PermissionGrantMap } | null | undefined,
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
  auth: { roles?: RoleName[] } | null | undefined,
  allowedRoles: RoleName[],
): boolean {
  if (!auth?.roles?.length) return false;
  return allowedRoles.some((role) => auth.roles?.includes(role));
}

export interface AccessRule {
  permission?: PermissionKey;
  minScope?: ScopeLevel;
  allowedRoles?: RoleName[];
}

/**
 * Evaluates navigation and route access for both built-in system roles and custom roles.
 * Custom-role holders gain access to any permission-gated view when their granted
 * permission meets `minScope`.
 */
export function isAuthorizedForRule(
  auth: { roles?: RoleName[]; permissions?: PermissionGrantMap } | null | undefined,
  rule: AccessRule,
): boolean {
  if (!auth) return false;

  if (rule.permission && !can(auth, rule.permission, rule.minScope ?? 'own')) {
    return false;
  }

  if (rule.allowedRoles && !hasAnyRole(auth, rule.allowedRoles)) {
    const holdsCustomRole = Boolean(auth.roles?.some((r) => isCustomRoleName(r)));
    if (!(holdsCustomRole && Boolean(rule.permission))) {
      return false;
    }
  }

  return true;
}
