import { z } from 'zod';
import { successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';

export const employeeProfileSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  workEmail: z.string(),
  department: z.object({
    id: z.string(),
    name: z.string(),
  }),
  designation: z.object({
    id: z.string(),
    title: z.string(),
  }),
  employmentStatus: z.string(),
  joiningDate: z.string().nullable().optional().default(null),
  organizationName: z.string().nullable().optional().default(null),
  timezone: z.string().nullable().optional().default(null),
  workStart: z.string().nullable().optional().default(null),
  workEnd: z.string().nullable().optional().default(null),
  graceMinutes: z.number().nullable().optional().default(null),
  dateOfBirth: z.string().nullable(),
  personalEmail: z.string().nullable(),
  personalPhone: z.string().nullable(),
  addressLine: z.string().nullable(),
  city: z.string().nullable(),
  countryCode: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  emergencyContactRelation: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export type EmployeeProfileData = z.infer<typeof employeeProfileSchema>;

const employeeProfileResponseSchema = successEnvelopeSchema(employeeProfileSchema);

export interface UpdateMyProfilePayload {
  dateOfBirth?: string | null;
  personalEmail?: string | null;
  personalPhone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  countryCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
}

export async function fetchMyProfile(): Promise<EmployeeProfileData> {
  const res = await apiRequest('/employees/me/profile', {
    method: 'GET',
    schema: employeeProfileResponseSchema,
  });
  return res.data;
}

export async function updateMyProfile(
  payload: UpdateMyProfilePayload,
): Promise<EmployeeProfileData> {
  const res = await apiRequest('/employees/me/profile', {
    method: 'PATCH',
    body: payload,
    schema: employeeProfileResponseSchema,
  });
  return res.data;
}
