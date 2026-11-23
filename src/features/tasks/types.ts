export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskAssignmentType = 'self' | 'individual' | 'team';

export type TaskLifecycleStatus = 'active' | 'cancelled';

export type TaskAssignmentStatus =
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'changes_requested'
  | 'done'
  | 'cancelled';

export interface TaskAssignmentItem {
  id: string;
  status: TaskAssignmentStatus;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
  };
}

export interface TaskCommentItem {
  id: string;
  authorName: string;
  authorRole?: string;
  kind: 'comment' | 'suggestion' | 'review_request';
  body: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  assignmentType: TaskAssignmentType;
  requiresReview: boolean;
  status: TaskLifecycleStatus;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  creator?: {
    id: string;
    displayName: string;
    email?: string;
  } | null;
  progress: {
    done: number;
    total: number;
  };
  assignments?: TaskAssignmentItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  assignmentType: TaskAssignmentType;
  assigneeId?: string;
  teamId?: string;
  requiresReview?: boolean;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  requiresReview?: boolean;
}

export interface ListTasksParams {
  status?: TaskLifecycleStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  teamId?: string;
  departmentId?: string;
  createdBy?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: 'true' | 'false';
  sort?: 'dueDate' | 'priority' | 'createdAt';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CompanyOverviewMetrics {
  activeEmployees: number;
  attendanceRatePercent: number;
  openTasksCount: number;
  overdueTasksCount: number;
  completionRatePercent: number;
  totalDepartments: number;
  departmentsWithHead: number;
  pendingReviewsCount: number;
}

