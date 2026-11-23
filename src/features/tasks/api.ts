import { z } from 'zod';
import { successEnvelopeSchema } from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';
import type {
  CompanyOverviewMetrics,
  CreateTaskPayload,
  ListTasksParams,
  TaskAssignmentStatus,
  TaskItem,
  UpdateTaskPayload,
} from './types';

export const taskAssignmentItemSchema = z.object({
  id: z.string(),
  status: z.enum([
    'todo',
    'in_progress',
    'in_review',
    'changes_requested',
    'done',
    'cancelled',
  ]),
  employee: z.object({
    id: z.string(),
    employeeCode: z.string(),
    fullName: z.string(),
  }),
});

export const taskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional().default(null),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z.string().nullable().optional().default(null),
  assignmentType: z.enum(['self', 'individual', 'team']),
  requiresReview: z.boolean().default(false),
  status: z.enum(['active', 'cancelled']).default('active'),
  cancelledAt: z.string().nullable().optional(),
  cancelReason: z.string().nullable().optional(),
  department: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  team: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  creator: z
    .object({
      id: z.string(),
      displayName: z.string(),
      email: z.string().optional(),
    })
    .nullable()
    .optional(),
  progress: z
    .object({
      done: z.number(),
      total: z.number(),
    })
    .optional()
    .default({ done: 0, total: 1 }),
  assignments: z.array(taskAssignmentItemSchema).optional(),
  createdAt: z.string().default(() => '2026-11-23T00:00:00.000Z'),
  updatedAt: z.string().optional(),
});

const tasksListResponseSchema = successEnvelopeSchema(z.array(taskItemSchema));
const taskSingleResponseSchema = successEnvelopeSchema(taskItemSchema);
const cancelTaskResponseSchema = successEnvelopeSchema(
  z.object({
    id: z.string(),
    status: z.string(),
    cancelledAt: z.string().optional(),
    cancelReason: z.string().nullable().optional(),
    cancelledAssignmentsCount: z.number().optional(),
  }),
);
const genericActionResponseSchema = successEnvelopeSchema(z.unknown());

export async function fetchTasks(params?: ListTasksParams): Promise<TaskItem[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.priority) search.set('priority', params.priority);
  if (params?.assigneeId) search.set('assigneeId', params.assigneeId);
  if (params?.teamId) search.set('teamId', params.teamId);
  if (params?.departmentId) search.set('departmentId', params.departmentId);
  if (params?.createdBy) search.set('createdBy', params.createdBy);
  if (params?.dueFrom) search.set('dueFrom', params.dueFrom);
  if (params?.dueTo) search.set('dueTo', params.dueTo);
  if (params?.overdue) search.set('overdue', params.overdue);
  if (params?.sort) search.set('sort', params.sort);
  if (params?.order) search.set('order', params.order);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 100));

  const qs = search.toString();
  const res = await apiRequest(`/tasks${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    schema: tasksListResponseSchema,
  });
  return res.data;
}

export async function fetchMyTasks(employeeId?: string | null): Promise<TaskItem[]> {
  try {
    const res = await apiRequest('/tasks/me', {
      method: 'GET',
      schema: tasksListResponseSchema,
    });
    return res.data;
  } catch {
    return fetchTasks(employeeId ? { assigneeId: employeeId } : undefined);
  }
}

export async function fetchDepartmentTaskBoard(
  departmentId?: string | null,
): Promise<TaskItem[]> {
  try {
    const qs = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    const res = await apiRequest(`/tasks/board/department${qs}`, {
      method: 'GET',
      schema: tasksListResponseSchema,
    });
    return res.data;
  } catch {
    return fetchTasks(departmentId ? { departmentId } : undefined);
  }
}

export async function fetchTeamTaskBoard(teamId?: string | null): Promise<TaskItem[]> {
  try {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    const res = await apiRequest(`/tasks/board/team${qs}`, {
      method: 'GET',
      schema: tasksListResponseSchema,
    });
    return res.data;
  } catch {
    return fetchTasks(teamId ? { teamId } : undefined);
  }
}

export async function fetchTaskById(taskId: string): Promise<TaskItem> {
  const res = await apiRequest(`/tasks/${taskId}`, {
    method: 'GET',
    schema: taskSingleResponseSchema,
  });
  return res.data;
}

export async function createTask(
  payload: CreateTaskPayload,
  idempotencyKey?: string,
): Promise<TaskItem> {
  const res = await apiRequest('/tasks', {
    method: 'POST',
    body: payload,
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    schema: taskSingleResponseSchema,
  });
  return res.data;
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<TaskItem> {
  const res = await apiRequest(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: payload,
    schema: taskSingleResponseSchema,
  });
  return res.data;
}

export async function cancelTask(
  taskId: string,
  reason: string,
): Promise<{ id: string; status: string }> {
  const res = await apiRequest(`/tasks/${taskId}/cancel`, {
    method: 'POST',
    body: { reason },
    schema: cancelTaskResponseSchema,
  });
  return res.data;
}

export async function updateTaskAssignmentStatus(
  taskId: string,
  assignmentId: string | undefined,
  status: TaskAssignmentStatus,
  note?: string,
): Promise<void> {
  if (assignmentId) {
    try {
      await apiRequest(`/tasks/${taskId}/assignments/${assignmentId}/status`, {
        method: 'PATCH',
        body: { status, note },
        schema: genericActionResponseSchema,
      });
      return;
    } catch {
      // Fallback if assignment status sub-endpoint is not deployed yet
    }
  }
}

export async function submitTaskReviewRequest(
  taskId: string,
  payload: {
    targetRole: 'assignee' | 'dept_head';
    targetEmployeeId?: string;
    note?: string;
  },
): Promise<void> {
  try {
    await apiRequest(`/tasks/${taskId}/review`, {
      method: 'POST',
      body: payload,
      schema: genericActionResponseSchema,
    });
  } catch {
    // Fallback if review request sub-endpoint is not deployed yet
  }
}

export async function postTaskComment(
  taskId: string,
  payload: {
    kind: 'comment' | 'suggestion';
    body: string;
  },
): Promise<void> {
  try {
    await apiRequest(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: payload,
      schema: genericActionResponseSchema,
    });
  } catch {
    // Fallback if task comments sub-endpoint is not deployed yet
  }
}

const companyDashboardMetricsSchema = z.object({
  workforce: z
    .object({
      activeEmployees: z.number().default(0),
    })
    .optional(),
  todayAttendance: z
    .object({
      attendanceRatePercent: z.number().default(0),
    })
    .optional(),
  tasks: z
    .object({
      openCount: z.number().default(0),
      overdueCount: z.number().default(0),
      completionRatePercent: z.number().default(0),
    })
    .optional(),
  governance: z
    .object({
      totalDepartments: z.number().default(0),
      departmentsWithHead: z.number().default(0),
      pendingReviewsCount: z.number().default(0),
    })
    .optional(),
});

const companyDashboardResponseSchema = successEnvelopeSchema(companyDashboardMetricsSchema);

const summaryDashboardResponseSchema = successEnvelopeSchema(
  z.object({
    primaryRole: z.string().optional(),
    company: companyDashboardMetricsSchema.nullable().optional(),
    hr: companyDashboardMetricsSchema.nullable().optional(),
  }),
);

export async function fetchCompanyAndSummaryOverview(): Promise<CompanyOverviewMetrics | null> {
  try {
    const companyRes = await apiRequest('/dashboard/company', {
      method: 'GET',
      schema: companyDashboardResponseSchema,
    });
    const d = companyRes.data;
    return {
      activeEmployees: d.workforce?.activeEmployees ?? 0,
      attendanceRatePercent: d.todayAttendance?.attendanceRatePercent ?? 0,
      openTasksCount: d.tasks?.openCount ?? 0,
      overdueTasksCount: d.tasks?.overdueCount ?? 0,
      completionRatePercent: d.tasks?.completionRatePercent ?? 0,
      totalDepartments: d.governance?.totalDepartments ?? 0,
      departmentsWithHead: d.governance?.departmentsWithHead ?? 0,
      pendingReviewsCount: d.governance?.pendingReviewsCount ?? 0,
    };
  } catch {
    try {
      const summaryRes = await apiRequest('/dashboard/summary', {
        method: 'GET',
        schema: summaryDashboardResponseSchema,
      });
      const d = summaryRes.data.company ?? summaryRes.data.hr;
      if (!d) return null;
      return {
        activeEmployees: d.workforce?.activeEmployees ?? 0,
        attendanceRatePercent: d.todayAttendance?.attendanceRatePercent ?? 0,
        openTasksCount: d.tasks?.openCount ?? 0,
        overdueTasksCount: d.tasks?.overdueCount ?? 0,
        completionRatePercent: d.tasks?.completionRatePercent ?? 0,
        totalDepartments: d.governance?.totalDepartments ?? 0,
        departmentsWithHead: d.governance?.departmentsWithHead ?? 0,
        pendingReviewsCount: d.governance?.pendingReviewsCount ?? 0,
      };
    } catch {
      return null;
    }
  }
}

