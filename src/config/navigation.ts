import type { LucideIcon } from 'lucide-react';
import { Clock, Crown, IdCard, LayoutGrid, UserCircle } from 'lucide-react';
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
  badge?: string | number;
  hasDot?: boolean;
  permission?: PermissionKey;
  minScope?: ScopeLevel;
  allowedRoles?: RoleName[];
  children?: NavSubItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Active navigation items — strictly limited to implemented routes.
 * Add new entries here only when their corresponding page is implemented.
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
        permission: 'attendance.self',
        minScope: 'own',
      },
      {
        id: 'employees',
        label: 'Employees',
        href: '/employees',
        icon: IdCard,
        permission: 'employee.read',
        minScope: 'managed',
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    items: [
      {
        id: 'admin-leadership',
        label: 'HR & Dept Heads',
        href: '/admin/leadership',
        icon: Crown,
        permission: 'role.manage',
        minScope: 'org',
        allowedRoles: ['super_admin'],
      },
    ],
  },
];

/**
 * Bottom utility navigation items pinned directly above the Sign Out button.
 */
export const ACCOUNT_NAV_ITEMS: NavItem[] = [
  {
    id: 'account-profile',
    label: 'My Profile',
    href: '/account/profile',
    icon: UserCircle,
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
 * Returns only the navigation groups, items, and sub-items permitted for the authenticated user's RBAC context.
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
