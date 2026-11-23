import { z } from 'zod';
import { successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';

export const orgUserItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  accountStatus: z.string(),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  roles: z.array(z.string()),
  employee: z
    .object({
      id: z.string(),
      employeeCode: z.string(),
      employmentStatus: z.enum(['active', 'inactive', 'suspended']).optional(),
      department: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
      designation: z
        .object({
          id: z.string(),
          title: z.string(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

export type OrgUserItem = z.infer<typeof orgUserItemSchema>;

export const orgRoleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  isSystem: z.boolean().optional(),
  _count: z
    .object({
      userRoles: z.number(),
    })
    .optional(),
});

export type OrgRoleItem = z.infer<typeof orgRoleItemSchema>;

export const updatedUserRolesSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  accountStatus: z.string(),
  roles: z.array(z.string()),
});

export type UpdatedUserRoles = z.infer<typeof updatedUserRolesSchema>;

export const leadershipDepartmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  headEmployeeId: z.string().nullable().optional(),
  headEmployee: z
    .object({
      id: z.string(),
      name: z.string(),
      employeeCode: z.string(),
    })
    .nullable()
    .optional(),
  activeEmployeeCount: z.number().optional(),
});

export type LeadershipDepartmentItem = z.infer<typeof leadershipDepartmentItemSchema>;

const usersListResponseSchema = successEnvelopeSchema(z.array(orgUserItemSchema));
const rolesListResponseSchema = successEnvelopeSchema(z.array(orgRoleItemSchema));
const updateUserRolesResponseSchema = successEnvelopeSchema(updatedUserRolesSchema);
const departmentsListResponseSchema = successEnvelopeSchema(
  z.array(leadershipDepartmentItemSchema),
);
const departmentSingleResponseSchema = successEnvelopeSchema(leadershipDepartmentItemSchema);
const assignDepartmentHeadResponseSchema = successEnvelopeSchema(z.unknown());

export async function fetchOrgUsers(params?: {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<OrgUserItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set('role', params.role);
  if (params?.search) searchParams.set('search', params.search);
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 100));

  const qs = searchParams.toString();
  const res = await apiRequest(`/users${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    schema: usersListResponseSchema,
  });
  return res.data;
}

export async function fetchOrgRoles(): Promise<OrgRoleItem[]> {
  const res = await apiRequest('/roles', {
    method: 'GET',
    schema: rolesListResponseSchema,
  });
  return res.data;
}

export async function putUserRoles(
  userId: string,
  roles: string[],
): Promise<UpdatedUserRoles> {
  const res = await apiRequest(`/users/${userId}/roles`, {
    method: 'PUT',
    body: { roles },
    schema: updateUserRolesResponseSchema,
  });
  return res.data;
}

export async function fetchLeadershipDepartments(): Promise<LeadershipDepartmentItem[]> {
  const res = await apiRequest('/departments', {
    method: 'GET',
    schema: departmentsListResponseSchema,
  });
  return res.data;
}

export async function putDepartmentHead(
  departmentId: string,
  employeeId: string | null,
): Promise<void> {
  await apiRequest(`/departments/${departmentId}/head`, {
    method: 'PUT',
    body: { employeeId },
    schema: assignDepartmentHeadResponseSchema,
  });
}

export async function createLeadershipDepartment(payload: {
  name: string;
  description?: string;
}): Promise<LeadershipDepartmentItem> {
  const res = await apiRequest('/departments', {
    method: 'POST',
    body: payload,
    schema: departmentSingleResponseSchema,
  });
  return res.data;
}

