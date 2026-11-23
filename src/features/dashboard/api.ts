import { z } from 'zod';
import { successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';

const taskStatusCountsSchema = z.object({
  todo: z.number().default(0),
  inProgress: z.number().default(0),
  inReview: z.number().default(0),
  changesRequested: z.number().default(0),
  done: z.number().default(0),
});

const employeeTaskItemSchema = z.object({
  assignmentId: z.string(),
  taskId: z.string(),
  title: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignmentType: z.enum(['self', 'individual', 'team']),
  status: z.enum(['todo', 'in_progress', 'in_review', 'changes_requested', 'done']),
  dueDate: z.string().nullable().optional().default(null),
  isOverdue: z.boolean().default(false),
  isDueSoon: z.boolean().default(false),
  teamName: z.string().nullable().optional().default(null),
  departmentName: z.string().default(''),
});

const employeeDashboardSchema = z.object({
  employee: z.object({
    id: z.string(),
    employeeCode: z.string(),
    fullName: z.string(),
    workEmail: z.string(),
    department: z.string(),
    designation: z.string(),
    teams: z.array(z.string()).default([]),
    timezone: z.string().default('Asia/Dhaka'),
    workStart: z.string().default('09:00'),
    graceMinutes: z.number().default(15),
    workEnd: z.string().default('18:00'),
  }),
  todayAttendance: z.object({
    workDate: z.string(),
    status: z.enum(['present', 'late', 'absent', 'not_checked_in']),
    checkInAt: z.string().nullable().optional().default(null),
    lateMinutes: z.number().default(0),
    source: z.enum(['web', 'hr_correction']).nullable().optional().default(null),
  }),
  monthlyAttendance: z.object({
    presentDays: z.number().default(0),
    lateDays: z.number().default(0),
    absentDays: z.number().default(0),
    expectedWorkingDays: z.number().default(0),
    attendanceRatePercent: z.number().default(0),
  }),
  tasks: z.object({
    countsByStatus: taskStatusCountsSchema,
    openCount: z.number().default(0),
    overdueCount: z.number().default(0),
    dueSoonCount: z.number().default(0),
    completionRatePercent: z.number().default(0),
    items: z.array(employeeTaskItemSchema).default([]),
  }),
  openFeedbackCount: z.number().default(0),
  recentNotifications: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        body: z.string().nullable().optional().default(null),
        readAt: z.string().nullable().optional().default(null),
        createdAt: z.string(),
      }),
    )
    .default([]),
});

const hrDashboardSchema = z.object({
  timezone: z.string().default('Asia/Dhaka'),
  workStart: z.string().default('09:00'),
  graceMinutes: z.number().default(15),
  workEnd: z.string().default('18:00'),
  workforce: z.object({
    activeEmployees: z.number().default(0),
    inactiveEmployees: z.number().default(0),
    joinersThisMonth: z.number().default(0),
    departmentSummary: z
      .array(
        z.object({
          departmentId: z.string(),
          departmentName: z.string(),
          activeCount: z.number(),
        }),
      )
      .default([]),
  }),
  todayAttendance: z.object({
    workDate: z.string(),
    isWorkingDay: z.boolean().default(true),
    presentCount: z.number().default(0),
    lateCount: z.number().default(0),
    notCheckedInCount: z.number().default(0),
    absentCount: z.number().default(0),
    attendanceRatePercent: z.number().default(0),
  }),
  monthlyAttendance: z.object({
    presentDays: z.number().default(0),
    lateDays: z.number().default(0),
    absentDays: z.number().default(0),
    expectedWorkingDays: z.number().default(0),
    attendanceRatePercent: z.number().default(0),
  }),
  tasks: z.object({
    countsByStatus: taskStatusCountsSchema,
    openCount: z.number().default(0),
    overdueCount: z.number().default(0),
    dueSoonCount: z.number().default(0),
    completionRatePercent: z.number().default(0),
  }),
  openFeedbackCount: z.number().default(0),
  recentJoiners: z
    .array(
      z.object({
        id: z.string(),
        employeeCode: z.string(),
        fullName: z.string(),
        departmentName: z.string(),
        designationTitle: z.string(),
        joiningDate: z.string(),
      }),
    )
    .default([]),
  recentAuditLogs: z
    .array(
      z.object({
        id: z.string(),
        action: z.string(),
        entityType: z.string(),
        entityId: z.string().nullable().optional().default(null),
        actorName: z.string().nullable().optional().default(null),
        createdAt: z.string(),
      }),
    )
    .default([]),
});

const companyDashboardSchema = hrDashboardSchema.extend({
  governance: z.object({
    activeTeamsCount: z.number().default(0),
    totalDepartments: z.number().default(0),
    departmentsWithHead: z.number().default(0),
    pendingReviewsCount: z.number().default(0),
  }),
  feedbackBreakdown: z.object({
    openTotal: z.number().default(0),
    issues: z.number().default(0),
    suggestions: z.number().default(0),
  }),
});

export const summaryDashboardDataSchema = z.object({
  primaryRole: z.enum(['super_admin', 'hr_manager', 'department_head', 'employee']),
  availableViews: z.array(z.enum(['company', 'hr', 'team', 'me'])).default([]),
  company: companyDashboardSchema.nullable().optional().default(null),
  hr: hrDashboardSchema.nullable().optional().default(null),
  me: employeeDashboardSchema.nullable().optional().default(null),
});

export type SummaryDashboardData = z.infer<typeof summaryDashboardDataSchema>;

const summaryDashboardResponseSchema = successEnvelopeSchema(summaryDashboardDataSchema);

export async function fetchDashboardSummary(): Promise<SummaryDashboardData> {
  const res = await apiRequest('/dashboard/summary', {
    method: 'GET',
    schema: summaryDashboardResponseSchema,
  });
  return res.data;
}
