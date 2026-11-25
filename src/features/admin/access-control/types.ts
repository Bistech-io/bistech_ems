import type { PermissionKey, ScopeLevel } from '@/lib/auth/permissions';

export type PermissionCategory =
  | 'Users & Access'
  | 'Organization & Structure'
  | 'Employees'
  | 'Attendance'
  | 'Tasks & Teams'
  | 'Dashboards & Feedback';

export interface PermissionCatalogItem {
  id?: string;
  key: PermissionKey;
  label: string;
  description: string;
  category: PermissionCategory;
  defaultScope: ScopeLevel;
}

export interface RolePermissionGrant {
  key: string;
  description?: string;
  scope: ScopeLevel;
}

export interface AccessControlRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  userCount: number;
  permissions: RolePermissionGrant[];
  createdAt?: string;
}

export interface CreateCustomRolePayload {
  name: string;
  displayName?: string;
  description?: string;
  permissions: Array<{
    key: string;
    scope: ScopeLevel;
  }>;
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  'Users & Access',
  'Organization & Structure',
  'Employees',
  'Attendance',
  'Tasks & Teams',
  'Dashboards & Feedback',
];

export const SCOPE_LABELS: Record<ScopeLevel, string> = {
  own: 'Own',
  team: 'Team',
  department: 'Department',
  managed: 'Managed',
  org: 'Organization',
};

/**
 * Complete catalog of all 32 permissions seeded in `permissions.generated.sql` (Prisma `permissions` table).
 */
export const PERMISSION_CATALOG: PermissionCatalogItem[] = [
  // Users & Access
  {
    key: 'user.read',
    label: 'Read Users',
    description: 'Read users and their profile details',
    category: 'Users & Access',
    defaultScope: 'org',
  },
  {
    key: 'user.manage',
    label: 'Manage Users',
    description: 'Manage users, invites, and account statuses',
    category: 'Users & Access',
    defaultScope: 'org',
  },
  {
    key: 'role.manage',
    label: 'Manage Roles',
    description: 'Assign and manage user roles',
    category: 'Users & Access',
    defaultScope: 'org',
  },
  {
    key: 'audit.read',
    label: 'Read Audit Logs',
    description: 'Read system audit logs',
    category: 'Users & Access',
    defaultScope: 'org',
  },

  // Organization & Structure
  {
    key: 'org.settings.manage',
    label: 'Organization Settings',
    description: 'Manage organization settings and configuration',
    category: 'Organization & Structure',
    defaultScope: 'org',
  },
  {
    key: 'org.structure.read',
    label: 'Read Org Structure',
    description: 'Read organization structure including departments and designations',
    category: 'Organization & Structure',
    defaultScope: 'org',
  },
  {
    key: 'org.structure.manage',
    label: 'Manage Org Structure',
    description: 'Manage departments, designations, and holidays',
    category: 'Organization & Structure',
    defaultScope: 'org',
  },
  {
    key: 'department.head.assign',
    label: 'Assign Department Heads',
    description: 'Assign or change department heads',
    category: 'Organization & Structure',
    defaultScope: 'org',
  },

  // Employees
  {
    key: 'employee.read',
    label: 'Read Employees',
    description: 'Read employee directory and public profile information',
    category: 'Employees',
    defaultScope: 'org',
  },
  {
    key: 'employee.read.sensitive',
    label: 'Read Sensitive Profile',
    description: 'Read sensitive employee profile details',
    category: 'Employees',
    defaultScope: 'org',
  },
  {
    key: 'employee.create',
    label: 'Create Employees',
    description: 'Create and onboard new employees',
    category: 'Employees',
    defaultScope: 'org',
  },
  {
    key: 'employee.update',
    label: 'Update Employees',
    description: 'Update employee records',
    category: 'Employees',
    defaultScope: 'org',
  },
  {
    key: 'employee.status.manage',
    label: 'Manage Employee Status',
    description: 'Deactivate or reactivate employees',
    category: 'Employees',
    defaultScope: 'org',
  },
  {
    key: 'employee.history.read',
    label: 'Read Employment History',
    description: 'Read employee employment history',
    category: 'Employees',
    defaultScope: 'org',
  },

  // Attendance
  {
    key: 'attendance.self',
    label: 'Own Attendance',
    description: 'Check in and view own attendance records',
    category: 'Attendance',
    defaultScope: 'own',
  },
  {
    key: 'attendance.read',
    label: 'Read Attendance',
    description: 'Read attendance records within allowed scope',
    category: 'Attendance',
    defaultScope: 'org',
  },
  {
    key: 'attendance.correct',
    label: 'Correct Attendance',
    description: 'Submit HR attendance corrections',
    category: 'Attendance',
    defaultScope: 'org',
  },

  // Tasks & Teams
  {
    key: 'task.create.self',
    label: 'Create Self Tasks',
    description: 'Create personal tasks assigned to oneself',
    category: 'Tasks & Teams',
    defaultScope: 'own',
  },
  {
    key: 'task.assign',
    label: 'Assign Tasks',
    description: 'Assign tasks to individuals or teams',
    category: 'Tasks & Teams',
    defaultScope: 'managed',
  },
  {
    key: 'task.read',
    label: 'Read Tasks',
    description: 'Read tasks within allowed scope',
    category: 'Tasks & Teams',
    defaultScope: 'managed',
  },
  {
    key: 'task.board.team',
    label: 'Team Task Board',
    description: 'View team task board',
    category: 'Tasks & Teams',
    defaultScope: 'team',
  },
  {
    key: 'task.board.department',
    label: 'Department Task Board',
    description: 'View department task board',
    category: 'Tasks & Teams',
    defaultScope: 'department',
  },
  {
    key: 'task.work',
    label: 'Work on Tasks',
    description: 'Work on, submit, and transition assigned tasks',
    category: 'Tasks & Teams',
    defaultScope: 'own',
  },
  {
    key: 'task.comment',
    label: 'Comment on Tasks',
    description: 'Comment on tasks within allowed scope',
    category: 'Tasks & Teams',
    defaultScope: 'managed',
  },
  {
    key: 'task.review',
    label: 'Review Tasks',
    description: 'Review task submissions (approve / request changes)',
    category: 'Tasks & Teams',
    defaultScope: 'managed',
  },
  {
    key: 'task.manage',
    label: 'Manage Tasks',
    description: 'Manage and cancel tasks',
    category: 'Tasks & Teams',
    defaultScope: 'managed',
  },
  {
    key: 'team.read',
    label: 'Read Teams',
    description: 'Read team information and members',
    category: 'Tasks & Teams',
    defaultScope: 'team',
  },
  {
    key: 'team.manage',
    label: 'Manage Teams',
    description: 'Create and manage teams and member assignments',
    category: 'Tasks & Teams',
    defaultScope: 'managed',
  },

  // Dashboards & Feedback
  {
    key: 'dashboard.read',
    label: 'Access Dashboards',
    description: 'Access dashboards within allowed scope',
    category: 'Dashboards & Feedback',
    defaultScope: 'org',
  },
  {
    key: 'feedback.submit',
    label: 'Submit Feedback',
    description: 'Submit feedback, suggestions, or issues',
    category: 'Dashboards & Feedback',
    defaultScope: 'own',
  },
  {
    key: 'feedback.read',
    label: 'Read Feedback',
    description: 'Read feedback within allowed scope',
    category: 'Dashboards & Feedback',
    defaultScope: 'org',
  },
  {
    key: 'feedback.manage',
    label: 'Manage Feedback',
    description: 'Triage and resolve feedback items',
    category: 'Dashboards & Feedback',
    defaultScope: 'org',
  },
];

export const PERMISSION_CATALOG_BY_KEY: Record<string, PermissionCatalogItem> =
  Object.fromEntries(PERMISSION_CATALOG.map((item) => [item.key, item]));

export const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin:
    'Full organization-wide administrative control across users, roles, structure, attendance, tasks, and settings.',
  hr_manager:
    'Manages employee lifecycle, directory, attendance records, corrections, and organization structure.',
  dept_head:
    'Leads assigned departments and teams, manages task assignments, reviews submissions, and tracks team attendance.',
  department_head:
    'Leads assigned departments and teams, manages task assignments, reviews submissions, and tracks team attendance.',
  employee:
    'Standard workforce access for daily check-in, own attendance, assigned tasks, team boards, and feedback.',
};

export function formatRoleDisplayName(roleName: string): string {
  if (roleName === 'super_admin') return 'Super Admin';
  if (roleName === 'hr_manager') return 'HR Manager';
  if (roleName === 'dept_head' || roleName === 'department_head') return 'Department Head';
  if (roleName === 'employee') return 'Employee';

  return roleName
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function slugifyRoleName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export function userHasRole(userRoles: string[], roleName: string): boolean {
  if (roleName === 'dept_head' || roleName === 'department_head') {
    return userRoles.includes('dept_head') || userRoles.includes('department_head');
  }
  return userRoles.includes(roleName);
}
