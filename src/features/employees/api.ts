import { z } from 'zod';
import { successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';
import type {
  CreateEmployeePayload,
  DepartmentOption,
  DesignationOption,
  EmployeeItem,
  EmploymentStatus,
} from './types';

export const departmentOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  activeEmployeeCount: z.number().optional(),
});

export const designationOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  activeEmployeeCount: z.number().optional(),
});

export const employeeItemSchema = z.object({
  id: z.string(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  workEmail: z.string(),
  phone: z.string().nullable(),
  department: z.object({
    id: z.string(),
    name: z.string(),
  }),
  designation: z.object({
    id: z.string(),
    title: z.string(),
  }),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']),
  employmentStatus: z.enum(['active', 'inactive', 'suspended']),
  joiningDate: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    displayName: z.string(),
    email: z.string(),
    accountStatus: z.string(),
    roles: z.array(z.string()),
  }),
});

export const orgAttendanceItemSchema = z
  .object({
    employeeId: z.string().optional(),
    employee: z
      .object({
        id: z.string(),
      })
      .optional(),
    workDate: z.string(),
    status: z.enum(['present', 'late', 'absent']),
    checkInAt: z.string().nullable().optional(),
  })
  .transform((val) => ({
    employeeId: val.employeeId ?? val.employee?.id ?? '',
    workDate: val.workDate,
    status: val.status,
    checkInAt: val.checkInAt,
  }));

export type OrgAttendanceItem = z.infer<typeof orgAttendanceItemSchema>;

const employeesListResponseSchema = successEnvelopeSchema(z.array(employeeItemSchema));
const employeeSingleResponseSchema = successEnvelopeSchema(employeeItemSchema);
const departmentsResponseSchema = successEnvelopeSchema(z.array(departmentOptionSchema));
const designationsResponseSchema = successEnvelopeSchema(z.array(designationOptionSchema));
const designationSingleResponseSchema = successEnvelopeSchema(designationOptionSchema);
const orgAttendanceListResponseSchema = successEnvelopeSchema(z.array(orgAttendanceItemSchema));

export async function fetchEmployees(params?: {
  departmentId?: string;
  status?: EmploymentStatus | '';
  search?: string;
}): Promise<EmployeeItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.departmentId) searchParams.set('departmentId', params.departmentId);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  searchParams.set('limit', '100');

  const qs = searchParams.toString();
  const res = await apiRequest(`/employees${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    schema: employeesListResponseSchema,
  });
  return res.data;
}

export async function fetchDepartments(): Promise<DepartmentOption[]> {
  const res = await apiRequest('/departments', {
    method: 'GET',
    schema: departmentsResponseSchema,
  });
  return res.data;
}

export async function fetchDesignations(): Promise<DesignationOption[]> {
  const res = await apiRequest('/designations', {
    method: 'GET',
    schema: designationsResponseSchema,
  });
  return res.data;
}

export async function createDesignation(title: string): Promise<DesignationOption> {
  const res = await apiRequest('/designations', {
    method: 'POST',
    body: { title },
    schema: designationSingleResponseSchema,
  });
  return res.data;
}

export async function fetchTodayOrgAttendance(workDate: string): Promise<OrgAttendanceItem[]> {
  const res = await apiRequest(`/attendance?from=${workDate}&to=${workDate}&limit=100`, {
    method: 'GET',
    schema: orgAttendanceListResponseSchema,
  });
  return res.data;
}

export async function createEmployee(
  payload: CreateEmployeePayload,
  idempotencyKey: string,
): Promise<EmployeeItem> {
  const res = await apiRequest('/employees', {
    method: 'POST',
    body: payload,
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    schema: employeeSingleResponseSchema,
  });
  return res.data;
}

export async function updateEmployeeDesignation(
  employeeId: string,
  payload: {
    designationId?: string;
    designationTitle?: string;
    departmentId?: string;
    reason?: string;
  },
): Promise<EmployeeItem> {
  const res = await apiRequest(`/employees/${employeeId}`, {
    method: 'PATCH',
    body: payload,
    schema: employeeSingleResponseSchema,
  });
  return res.data;
}
