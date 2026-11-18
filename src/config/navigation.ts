import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Clock,
  FileCheck2,
  IdCard,
  Kanban,
  LayoutGrid,
  ListTodo,
  LockKeyhole,
  MessageSquareHeart,
  Network,
  ShieldCheck,
  UserCircle,
  UserCog,
  UsersRound,
  Briefcase,
} from 'lucide-react';
import {
  can,
  hasAnyRole,
  type PermissionKey,
  type RoleName,
  type ScopeLevel,
  type UserAuthContext,
} from '@/lib/auth/permissions';

export interface NavSubItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  minScope?: ScopeLevel;
  allowedRoles?: RoleName[];
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Optional notification dot or count badge */
  badge?: string | number;
  hasDot?: boolean;
  /** RBAC guard: item is shown when permission (+ minScope) or allowedRoles passes */
  permission?: PermissionKey;
  minScope?: ScopeLevel;
  allowedRoles?: RoleName[];
  /** Optional nested routes shown when sidebar is expanded */
  children?: NavSubItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Primary navigation schema covering every authenticated route in `(app)`.
 * Designed for RBAC filtering via `getFilteredNavigation(user)`.
 */
export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
        permission: 'dashboard.read',
        minScope: 'own',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'attendance',
        label: 'Attendance',
        href: '/attendance',
        icon: Clock,
        hasDot: true,
        permission: 'attendance.self',
        minScope: 'own',
        children: [
          {
            id: 'attendance-me',
            label: 'My Attendance',
            href: '/attendance',
            icon: Clock,
            permission: 'attendance.self',
            minScope: 'own',
          },
          {
            id: 'attendance-team',
            label: 'Team Attendance',
            href: '/attendance/team',
            icon: CalendarCheck,
            permission: 'attendance.read',
            minScope: 'managed',
          },
          {
            id: 'attendance-manage',
            label: 'Manage & Corrections',
            href: '/attendance/manage',
            icon: ClipboardCheck,
            permission: 'attendance.correct',
            minScope: 'org',
          },
        ],
      },
      {
        id: 'tasks',
        label: 'Tasks & Review',
        href: '/tasks/me',
        icon: CheckSquare,
        hasDot: true,
        permission: 'task.read',
        minScope: 'own',
        children: [
          {
            id: 'tasks-me',
            label: 'My Assignments',
            href: '/tasks/me',
            icon: CheckSquare,
            permission: 'task.work',
            minScope: 'own',
          },
          {
            id: 'tasks-all',
            label: 'All Tasks',
            href: '/tasks',
            icon: ListTodo,
            permission: 'task.read',
            minScope: 'own',
          },
          {
            id: 'tasks-board',
            label: 'Task Boards',
            href: '/tasks/board',
            icon: Kanban,
            permission: 'task.board.team',
            minScope: 'team',
          },
          {
            id: 'tasks-review',
            label: 'Review Queue',
            href: '/tasks/review',
            icon: FileCheck2,
            permission: 'task.review',
            minScope: 'managed',
          },
        ],
      },
      {
        id: 'teams',
        label: 'Teams',
        href: '/teams',
        icon: UsersRound,
        permission: 'team.read',
        minScope: 'team',
      },
      {
        id: 'feedback',
        label: 'Feedback',
        href: '/feedback',
        icon: MessageSquareHeart,
        permission: 'feedback.read',
        minScope: 'own',
      },
    ],
  },
  {
    id: 'organization',
    label: 'People & Org',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        href: '/employees',
        icon: IdCard,
        permission: 'employee.read',
        minScope: 'managed',
      },
      {
        id: 'org-structure',
        label: 'Organization',
        href: '/organization/departments',
        icon: Building2,
        permission: 'org.structure.read',
        minScope: 'org',
        children: [
          {
            id: 'org-departments',
            label: 'Departments',
            href: '/organization/departments',
            icon: Network,
            permission: 'org.structure.read',
            minScope: 'org',
          },
          {
            id: 'org-designations',
            label: 'Designations',
            href: '/organization/designations',
            icon: Briefcase,
            permission: 'org.structure.read',
            minScope: 'org',
          },
          {
            id: 'org-holidays',
            label: 'Holidays',
            href: '/organization/holidays',
            icon: CalendarDays,
            permission: 'org.structure.read',
            minScope: 'org',
          },
          {
            id: 'org-settings',
            label: 'Org Settings',
            href: '/organization/settings',
            icon: Building2,
            permission: 'org.settings.manage',
            minScope: 'org',
          },
        ],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'admin-users',
        label: 'Users & Roles',
        href: '/admin/users',
        icon: UserCog,
        permission: 'user.read',
        minScope: 'org',
      },
      {
        id: 'admin-audit',
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: ShieldCheck,
        permission: 'audit.read',
        minScope: 'org',
      },
    ],
  },
];

/**
 * Utility items pinned to the bottom of the sidebar (implicit for all authenticated users).
 */
export const ACCOUNT_NAV_ITEMS: NavItem[] = [
  {
    id: 'account-profile',
    label: 'My Profile',
    href: '/account/profile',
    icon: UserCircle,
  },
  {
    id: 'account-security',
    label: 'Security',
    href: '/account/security',
    icon: LockKeyhole,
  },
];

function isAuthorized(
  user: UserAuthContext | null | undefined,
  rule: { permission?: PermissionKey; minScope?: ScopeLevel; allowedRoles?: RoleName[] },
): boolean {
  if (!user) return false;
  if (rule.allowedRoles && !hasAnyRole(user, rule.allowedRoles)) {
    return false;
  }
  if (rule.permission && !can(user, rule.permission, rule.minScope ?? 'own')) {
    return false;
  }
  return true;
}

/**
 * Returns only the navigation groups, items, and sub-items permitted for the active user's RBAC context.
 */
export function getFilteredNavigation(user: UserAuthContext | null | undefined): NavGroup[] {
  return NAVIGATION_GROUPS.map((group) => {
    const visibleItems = group.items
      .filter((item) => isAuthorized(user, item))
      .map((item) => {
        if (!item.children) return item;
        const visibleChildren = item.children.filter((child) => isAuthorized(user, child));
        return {
          ...item,
          children: visibleChildren.length > 0 ? visibleChildren : undefined,
        };
      });

    return {
      ...group,
      items: visibleItems,
    };
  }).filter((group) => group.items.length > 0);
}
