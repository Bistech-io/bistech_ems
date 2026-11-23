/**
 * API client for Super Admin HR & Department Head governance.
 * Connects to /api/v1/departments, /api/v1/users, and /api/v1/roles.
 */

import { z } from 'zod';
import { apiRequest } from '@/lib/api/client';
import { successEnvelopeSchema } from '@ems/contracts';

// Schema for Department items returned from GET /departments
export const departmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  headEmployeeId: z.string().nullable().optional(),
  activeEmployeeCount: z.number().int().nonnegative().optional().default(0),
  headEmployee: z
    .object({
      id: z.string(),
      name: z.string(),
      employeeCode: z.string(),
    })
    .nullable()
    .optional(),
});
export type DepartmentItem = z.infer<typeof departmentItemSchema>;

// Schema for System Role items returned from GET /roles
export const roleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});
export type RoleItem = z.infer<typeof roleItemSchema>;

// Schema for User items returned from GET /users
export const userItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  roles: z.array(z.string()),
  employee: z
    .object({
      id: z.string(),
      employeeCode: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      employmentStatus: z.string(),
      designation: z
        .object({
          id: z.string(),
          title: z.string(),
        })
        .nullable()
        .optional(),
      department: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});
export type UserItem = z.infer<typeof userItemSchema>;

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
}

export interface AssignDepartmentHeadPayload {
  employeeId: string | null;
}

export interface UpdateUserRolesPayload {
  roles: string[];
}

const departmentsListEnvelope = successEnvelopeSchema(z.array(departmentItemSchema));
const departmentSingleEnvelope = successEnvelopeSchema(departmentItemSchema);
const rolesListEnvelope = successEnvelopeSchema(z.array(roleItemSchema));
const usersListEnvelope = successEnvelopeSchema(z.array(userItemSchema));
const userRolesEnvelope = successEnvelopeSchema(
  z.object({
    userId: z.string(),
    roles: z.array(z.string()),
  }),
);
const voidEnvelope = successEnvelopeSchema(z.null());

/**
 * Fetch all departments with active employee counts and assigned heads.
 */
export async function fetchDepartments(): Promise<DepartmentItem[]> {
  const res = await apiRequest('/departments', {
    method: 'GET',
    schema: departmentsListEnvelope,
  });
  return res.data;
}

/**
 * Create a new department.
 */
export async function createDepartment(payload: CreateDepartmentPayload): Promise<DepartmentItem> {
  const res = await apiRequest('/departments', {
    method: 'POST',
    body: payload,
    schema: departmentSingleEnvelope,
  });
  return res.data;
}

/**
 * Update an existing department name and description.
 */
export async function updateDepartment(
  id: string,
  payload: UpdateDepartmentPayload,
): Promise<DepartmentItem> {
  const res = await apiRequest(`/departments/${id}`, {
    method: 'PATCH',
    body: payload,
    schema: departmentSingleEnvelope,
  });
  return res.data;
}

/**
 * Archive a department (must have 0 active employees).
 */
export async function deleteDepartment(id: string): Promise<void> {
  await apiRequest(`/departments/${id}`, {
    method: 'DELETE',
    schema: voidEnvelope,
  });
}

/**
 * Assign or clear a department head.
 */
export async function assignDepartmentHead(
  departmentId: string,
  payload: AssignDepartmentHeadPayload,
): Promise<DepartmentItem> {
  const res = await apiRequest(`/departments/${departmentId}/head`, {
    method: 'PUT',
    body: payload,
    schema: departmentSingleEnvelope,
  });
  return res.data;
}

/**
 * Fetch all organization roles.
 */
export async function fetchRoles(): Promise<RoleItem[]> {
  const res = await apiRequest('/roles', {
    method: 'GET',
    schema: rolesListEnvelope,
  });
  return res.data;
}

/**
 * Fetch users with their role assignments and employee records.
 */
export async function fetchUsers(params?: {
  role?: string;
  search?: string;
}): Promise<UserItem[]> {
  const q = new URLSearchParams();
  q.set('limit', '100');
  if (params?.role) q.set('role', params.role);
  if (params?.search) q.set('search', params.search);

  const res = await apiRequest(`/users?${q.toString()}`, {
    method: 'GET',
    schema: usersListEnvelope,
  });
  return res.data;
}

/**
 * Update a user's role assignments (Super Admin only).
 */
export async function updateUserRoles(
  userId: string,
  payload: UpdateUserRolesPayload,
): Promise<{ userId: string; roles: string[] }> {
  const res = await apiRequest(`/users/${userId}/roles`, {
    method: 'PUT',
    body: payload,
    schema: userRolesEnvelope,
  });
  return res.data;
}
