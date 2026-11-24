import { z } from 'zod';
import { successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';
import type { OrganizationShiftSettings } from './types';

export const attendanceRecordDtoSchema = z.object({
  id: z.string().nullable(),
  workDate: z.string(),
  checkInAt: z.string().nullable(),
  status: z.enum(['present', 'late', 'absent']),
  source: z.enum(['web', 'hr_correction']).nullable(),
  lateMinutes: z.number(),
  note: z.string().nullable(),
  isDerived: z.boolean(),
});

export type AttendanceRecordDto = z.infer<typeof attendanceRecordDtoSchema>;

export const todayAttendanceDtoSchema = z.object({
  workDate: z.string(),
  status: z.enum(['present', 'late', 'absent', 'not_checked_in']),
  checkInAt: z.string().nullable(),
  lateMinutes: z.number(),
  source: z.enum(['web', 'hr_correction']).nullable(),
});

export const monthlySummaryDtoSchema = z.object({
  presentDays: z.number(),
  lateDays: z.number(),
  absentDays: z.number(),
  expectedWorkingDays: z.number(),
  attendanceRatePercent: z.number(),
});

export const attendanceBoardDataSchema = z.object({
  timezone: z.string(),
  workStart: z.string(),
  graceMinutes: z.number(),
  workEnd: z.string(),
  from: z.string(),
  to: z.string(),
  today: todayAttendanceDtoSchema,
  summary: monthlySummaryDtoSchema,
  records: z.array(attendanceRecordDtoSchema),
});

export type AttendanceBoardData = z.infer<typeof attendanceBoardDataSchema>;

export const attendanceBoardResponseSchema = successEnvelopeSchema(attendanceBoardDataSchema);
export const checkInResponseSchema = successEnvelopeSchema(attendanceRecordDtoSchema);

export const organizationSettingsDataSchema = z.object({
  timezone: z.string().default('Asia/Dhaka'),
  workStart: z.string().default('09:00'),
  workEnd: z.string().default('18:00'),
  graceMinutes: z.number().default(15),
});

export const organizationSettingsResponseSchema = successEnvelopeSchema(
  organizationSettingsDataSchema,
);

export async function fetchMyAttendanceBoard(params?: {
  from?: string;
  to?: string;
}): Promise<AttendanceBoardData> {
  const search = new URLSearchParams();
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  const qs = search.toString();
  const path = qs ? `/attendance/me?${qs}` : '/attendance/me';

  const res = await apiRequest(path, {
    method: 'GET',
    schema: attendanceBoardResponseSchema,
  });
  return res.data;
}

export async function fetchMyFirstCheckInDate(): Promise<string | null> {
  const board = await fetchMyAttendanceBoard({
    from: '2020-01-01',
  });

  let earliest: string | null = null;
  for (const record of board.records) {
    if (
      !record.isDerived &&
      (record.status === 'present' || record.status === 'late' || Boolean(record.checkInAt))
    ) {
      if (!earliest || record.workDate < earliest) {
        earliest = record.workDate;
      }
    }
  }

  if (
    board.today.status === 'present' ||
    board.today.status === 'late' ||
    Boolean(board.today.checkInAt)
  ) {
    if (!earliest || board.today.workDate < earliest) {
      earliest = board.today.workDate;
    }
  }

  return earliest;
}

export async function queryHasUserEverCheckedIn(): Promise<boolean> {
  const firstDate = await fetchMyFirstCheckInDate();
  return firstDate !== null;
}


export async function postCheckIn(note?: string): Promise<AttendanceRecordDto> {
  const res = await apiRequest('/attendance/check-in', {
    method: 'POST',
    body: note ? { note } : {},
    schema: checkInResponseSchema,
  });
  return res.data;
}

export const orgAttendanceListItemSchema = z.object({
  id: z.string().nullable().optional(),
  workDate: z.string(),
  checkInAt: z.string().nullable().optional(),
  status: z.enum(['present', 'late', 'absent']),
  source: z.enum(['web', 'hr_correction']).nullable().optional(),
  lateMinutes: z.number().default(0),
  note: z.string().nullable().optional(),
  isDerived: z.boolean().default(false),
  employee: z
    .object({
      id: z.string(),
      employeeCode: z.string(),
      fullName: z.string(),
      department: z.object({ id: z.string(), name: z.string() }),
      designation: z.object({ id: z.string(), title: z.string() }),
    })
    .optional(),
  employeeId: z.string().optional(),
});

export type OrgAttendanceListItem = z.infer<typeof orgAttendanceListItemSchema>;
const orgAttendanceRangeResponseSchema = successEnvelopeSchema(
  z.array(orgAttendanceListItemSchema),
);

export async function fetchOrgAttendanceRange(params: {
  from: string;
  to: string;
  employeeId?: string;
  departmentId?: string;
  status?: 'present' | 'late' | 'absent';
  limit?: number;
}): Promise<OrgAttendanceListItem[]> {
  const search = new URLSearchParams();
  search.set('from', params.from);
  search.set('to', params.to);
  if (params.employeeId) search.set('employeeId', params.employeeId);
  if (params.departmentId) search.set('departmentId', params.departmentId);
  if (params.status) search.set('status', params.status);
  search.set('limit', String(params.limit ?? 100));

  const res = await apiRequest(`/attendance?${search.toString()}`, {
    method: 'GET',
    schema: orgAttendanceRangeResponseSchema,
  });
  return res.data;
}

export async function fetchEmployeeFirstCheckInDate(
  employeeId: string,
  to: string,
): Promise<string | null> {
  const [presentList, lateList] = await Promise.all([
    fetchOrgAttendanceRange({
      employeeId,
      from: '2020-01-01',
      to,
      status: 'present',
      limit: 100,
    }).catch(() => [] as OrgAttendanceListItem[]),
    fetchOrgAttendanceRange({
      employeeId,
      from: '2020-01-01',
      to,
      status: 'late',
      limit: 100,
    }).catch(() => [] as OrgAttendanceListItem[]),
  ]);

  let earliest: string | null = null;
  for (const rec of [...presentList, ...lateList]) {
    if (!rec.isDerived && (rec.status === 'present' || rec.status === 'late' || Boolean(rec.checkInAt))) {
      if (!earliest || rec.workDate < earliest) {
        earliest = rec.workDate;
      }
    }
  }
  return earliest;
}

export async function fetchOrgFirstCheckInDates(
  to: string,
): Promise<Record<string, string>> {
  const [presentList, lateList] = await Promise.all([
    fetchOrgAttendanceRange({
      from: '2020-01-01',
      to,
      status: 'present',
      limit: 100,
    }).catch(() => [] as OrgAttendanceListItem[]),
    fetchOrgAttendanceRange({
      from: '2020-01-01',
      to,
      status: 'late',
      limit: 100,
    }).catch(() => [] as OrgAttendanceListItem[]),
  ]);

  const earliestByEmployee: Record<string, string> = {};
  for (const rec of [...presentList, ...lateList]) {
    const empId = rec.employee?.id ?? rec.employeeId;
    if (!empId) continue;
    if (!rec.isDerived && (rec.status === 'present' || rec.status === 'late' || Boolean(rec.checkInAt))) {
      const current = earliestByEmployee[empId];
      if (!current || rec.workDate < current) {
        earliestByEmployee[empId] = rec.workDate;
      }
    }
  }
  return earliestByEmployee;
}

export async function fetchOrganizationSettings(): Promise<OrganizationShiftSettings> {
  const res = await apiRequest('/organization/settings', {
    method: 'GET',
    schema: organizationSettingsResponseSchema,
  });
  return res.data;
}

export async function patchOrganizationSettings(
  payload: Partial<OrganizationShiftSettings>,
): Promise<OrganizationShiftSettings> {
  const res = await apiRequest('/organization/settings', {
    method: 'PATCH',
    body: payload,
    schema: organizationSettingsResponseSchema,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ems:shift-updated', { detail: res.data }));
  }
  return res.data;
}
