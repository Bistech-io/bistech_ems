/**
 * API contract client for Super Admin HR & Department Head governance.
 * Matches FSD.md section 4 endpoints under the global `/api/v1` prefix.
 */

import type { RoleName } from '@/lib/auth/permissions';

const API_BASE = '/api/v1';

export const LEADERSHIP_ENDPOINTS = {
  users: `${API_BASE}/users`,
  userRoles: (userId: string) => `${API_BASE}/users/${userId}/roles`,
  departments: `${API_BASE}/departments`,
  departmentHead: (departmentId: string) => `${API_BASE}/departments/${departmentId}/head`,
  auditLogs: `${API_BASE}/audit-logs`,
} as const;

export interface UpdateUserRolesPayload {
  roles: RoleName[];
}

export interface AssignDepartmentHeadPayload {
  employeeId: string | null;
}

/**
 * Replaces the target user's role set (Super Admin only; audited, cannot target self).
 */
export async function updateUserRoles(
  userId: string,
  payload: UpdateUserRolesPayload,
  csrfToken?: string,
): Promise<Response> {
  return fetch(LEADERSHIP_ENDPOINTS.userRoles(userId), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Assigns or clears a Department Head (syncs Dept Head role transactionally on server).
 */
export async function assignDepartmentHead(
  departmentId: string,
  payload: AssignDepartmentHeadPayload,
  csrfToken?: string,
): Promise<Response> {
  return fetch(LEADERSHIP_ENDPOINTS.departmentHead(departmentId), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });
}
