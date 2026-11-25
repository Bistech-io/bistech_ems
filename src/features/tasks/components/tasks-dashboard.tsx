'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CheckSquare,
  Clock,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { fetchDepartments, fetchEmployees } from '@/features/employees/api';
import type { DepartmentOption, EmployeeItem } from '@/features/employees/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import {
  fetchCompanyAndSummaryOverview,
  fetchDepartmentTaskBoard,
  fetchMyTasks,
  fetchTasks,
  fetchTeamTaskBoard,
} from '../api';
import type {
  CompanyOverviewMetrics,
  TaskAssignmentStatus,
  TaskCommentItem,
  TaskItem,
  TaskPriority,
} from '../types';
import { CreateTaskModal } from './create-task-modal';
import {
  ASSIGNMENT_STATUS_STYLES,
  TASK_PRIORITY_STYLES,
  TaskDetailDrawer,
} from './task-detail-drawer';

const EASE = [0.22, 1, 0.36, 1] as const;

type TaskViewTab =
  | 'current'
  | 'me'
  | 'team_dept'
  | 'dept_assign'
  | 'dept_team'
  | 'admin_full';

export function TasksDashboard() {
  const { user, session, activeRole } = useAuth();
  const currentUserId = session?.user.id ?? user?.userId ?? '';
  const currentEmployeeId = session?.employeeId ?? null;
  const currentUserName = session?.user.name ?? user?.name ?? 'Team Member';

  const isSuperAdmin = activeRole === 'super_admin';
  const isHrManager = activeRole === 'hr_manager';
  const isDeptHead = activeRole === 'dept_head';

  const canAssignOthers = isSuperAdmin || isDeptHead || isHrManager;
  const canManageAll = isSuperAdmin || isDeptHead;

  const [activeTab, setActiveTab] = useState<TaskViewTab>('current');
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [myTasks, setMyTasks] = useState<TaskItem[]>([]);
  const [departmentBoardTasks, setDepartmentBoardTasks] = useState<TaskItem[]>([]);
  const [teamBoardTasks, setTeamBoardTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [companyOverview, setCompanyOverview] = useState<CompanyOverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [statusFilter, setStatusFilter] = useState<TaskAssignmentStatus | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Status & comments map per task ID so user can update status and post comments/suggestions live
  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, TaskAssignmentStatus>>({});
  const [taskCommentsMap, setTaskCommentsMap] = useState<Record<string, TaskCommentItem[]>>({});
  const [taskAssigneeOverrideMap, setTaskAssigneeOverrideMap] = useState<
    Record<string, EmployeeItem>
  >({});

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchTasks({ limit: 100 }).catch(() => [] as TaskItem[]),
      fetchMyTasks(currentEmployeeId).catch(() => [] as TaskItem[]),
      fetchDepartmentTaskBoard().catch(() => [] as TaskItem[]),
      fetchTeamTaskBoard().catch(() => [] as TaskItem[]),
      fetchEmployees().catch(() => [] as EmployeeItem[]),
      fetchDepartments().catch(() => [] as DepartmentOption[]),
      isSuperAdmin || isHrManager
        ? fetchCompanyAndSummaryOverview(isSuperAdmin).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([tasksList, myList, deptList, teamList, empList, deptOpts, overview]) => {
        if (cancelled) return;
        setAllTasks(tasksList);
        setMyTasks(myList.length > 0 ? myList : tasksList);
        setDepartmentBoardTasks(deptList.length > 0 ? deptList : tasksList);
        setTeamBoardTasks(teamList.length > 0 ? teamList : tasksList);
        setEmployees(empList);
        setDepartments(deptOpts);
        setCompanyOverview(overview);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentEmployeeId, isSuperAdmin, isHrManager]);

  const deriveTaskStatus = useCallback(
    (task: TaskItem): TaskAssignmentStatus => {
      const override = taskStatusMap[task.id];
      if (override) return override;

      if (task.status === 'cancelled') return 'cancelled';
      if (task.assignments && task.assignments.length > 0) {
        const own = currentEmployeeId
          ? task.assignments.find((a) => a.employee.id === currentEmployeeId)
          : null;
        if (own) return own.status;
        return task.assignments[0].status;
      }

      if (task.progress.total > 0 && task.progress.done >= task.progress.total) {
        return 'done';
      }
      if (task.progress.done > 0) {
        return 'in_progress';
      }
      return 'todo';
    },
    [taskStatusMap, currentEmployeeId],
  );

  const availableTabs = useMemo(() => {
    const tabs: { id: TaskViewTab; label: string }[] = [
      { id: 'current', label: 'Current Task Dashboard' },
      { id: 'me', label: 'My Tasks' },
      { id: 'team_dept', label: 'My Team & Department' },
    ];

    if (isDeptHead || isSuperAdmin) {
      tabs.push(
        { id: 'dept_assign', label: 'Task Assign' },
        { id: 'dept_team', label: 'Team Task Dashboard' },
      );
    }

    if (isSuperAdmin) {
      tabs.push({ id: 'admin_full', label: 'Full Task Dashboard' });
    }

    return tabs;
  }, [isDeptHead, isSuperAdmin]);

  const sourceTasksForTab = useMemo(() => {
    switch (activeTab) {
      case 'me':
        return myTasks.filter((t) => {
          if (!currentEmployeeId && !currentUserId) return true;
          if (t.creator?.id === currentUserId) return true;
          if (t.assignments?.some((a) => a.employee.id === currentEmployeeId)) return true;
          return t.assignmentType === 'self';
        });
      case 'team_dept':
        return departmentBoardTasks.filter((t) => t.status === 'active');
      case 'dept_assign':
        return allTasks.filter((t) => {
          const hasOverride = Boolean(taskAssigneeOverrideMap[t.id]);
          const unassigned =
            !hasOverride &&
            (t.assignmentType === 'self' ||
              !t.assignments ||
              t.assignments.length === 0 ||
              deriveTaskStatus(t) === 'todo');
          return unassigned;
        });
      case 'dept_team':
        return teamBoardTasks;
      case 'current':
        // Current Task Dashboard (default for everyone): all active/ongoing tasks across departments
        return allTasks.filter((t) => {
          const st = deriveTaskStatus(t);
          return t.status === 'active' && st !== 'cancelled';
        });
      case 'admin_full':
      default:
        return allTasks;
    }
  }, [
    activeTab,
    allTasks,
    myTasks,
    departmentBoardTasks,
    teamBoardTasks,
    currentEmployeeId,
    currentUserId,
    taskAssigneeOverrideMap,
    deriveTaskStatus,
  ]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sourceTasksForTab.filter((task) => {
      if (priorityFilter && task.priority !== priorityFilter) return false;
      const st = deriveTaskStatus(task);
      if (statusFilter && st !== statusFilter) return false;
      if (departmentFilter && task.department?.id !== departmentFilter) return false;

      if (!q) return true;
      const creatorName = task.creator?.displayName ?? '';
      const deptName = task.department?.name ?? '';
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description ?? '').toLowerCase().includes(q) ||
        creatorName.toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q)
      );
    });
  }, [
    sourceTasksForTab,
    priorityFilter,
    statusFilter,
    departmentFilter,
    searchQuery,
    deriveTaskStatus,
  ]);

  const metrics = useMemo(() => {
    const total = allTasks.length;
    const ongoing = allTasks.filter((t) => {
      const st = deriveTaskStatus(t);
      return t.status === 'active' && (st === 'todo' || st === 'in_progress');
    }).length;
    const inReview = allTasks.filter((t) => deriveTaskStatus(t) === 'in_review').length;
    const completed = allTasks.filter((t) => deriveTaskStatus(t) === 'done').length;

    return { total, ongoing, inReview, completed };
  }, [allTasks, deriveTaskStatus]);

  function handleTaskCreated(created: TaskItem) {
    const enriched: TaskItem = {
      ...created,
      creator: created.creator ?? {
        id: currentUserId || 'current-user',
        displayName: currentUserName,
      },
    };
    setAllTasks((prev) => [enriched, ...prev]);
    setMyTasks((prev) => [enriched, ...prev]);
    setDepartmentBoardTasks((prev) => [enriched, ...prev]);
    setTeamBoardTasks((prev) => [enriched, ...prev]);
  }

  function handleStatusChanged(taskId: string, nextStatus: TaskAssignmentStatus) {
    setTaskStatusMap((prev) => ({
      ...prev,
      [taskId]: nextStatus,
    }));

    const updateProgress = (list: TaskItem[]) =>
      list.map((t) => {
        if (t.id !== taskId) return t;
        const total = Math.max(1, t.progress.total);
        const done = nextStatus === 'done' ? total : 0;
        return {
          ...t,
          progress: { done, total },
        };
      });

    setAllTasks(updateProgress);
    setMyTasks(updateProgress);
    setDepartmentBoardTasks(updateProgress);
    setTeamBoardTasks(updateProgress);
  }

  function handleTaskUpdated(updated: TaskItem) {
    const apply = (list: TaskItem[]) =>
      list.map((t) => (t.id === updated.id ? { ...t, ...updated } : t));
    setAllTasks(apply);
    setMyTasks(apply);
    setDepartmentBoardTasks(apply);
    setTeamBoardTasks(apply);
    setSelectedTask((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  }

  function handleTaskCancelled(taskId: string, reason: string) {
    setTaskStatusMap((prev) => ({
      ...prev,
      [taskId]: 'cancelled',
    }));

    const apply = (list: TaskItem[]) =>
      list.map((t) =>
        t.id === taskId
          ? { ...t, status: 'cancelled' as const, cancelReason: reason }
          : t,
      );

    setAllTasks(apply);
    setMyTasks(apply);
    setDepartmentBoardTasks(apply);
    setTeamBoardTasks(apply);
    setSelectedTask((prev) =>
      prev && prev.id === taskId
        ? { ...prev, status: 'cancelled', cancelReason: reason }
        : prev,
    );
  }

  function handleTaskAssignedToEmployee(taskId: string, employee: EmployeeItem) {
    setTaskAssigneeOverrideMap((prev) => ({
      ...prev,
      [taskId]: employee,
    }));

    const apply = (list: TaskItem[]) =>
      list.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assignmentType: 'individual' as const,
              department: employee.department,
              assignments: [
                {
                  id: `asg-${employee.id}`,
                  status: deriveTaskStatus(t),
                  employee: {
                    id: employee.id,
                    employeeCode: employee.employeeCode,
                    fullName: employee.fullName,
                  },
                },
              ],
            }
          : t,
      );

    setAllTasks(apply);
    setDepartmentBoardTasks(apply);
    setTeamBoardTasks(apply);
  }

  function handleCommentAdded(taskId: string, item: TaskCommentItem) {
    setTaskCommentsMap((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] ?? []), item],
    }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Top Header with Task Creation Button on Top Right */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            {activeTab === 'admin_full'
              ? 'Full Task Dashboard'
              : activeTab === 'dept_team'
                ? 'Team Task Dashboard'
                : activeTab === 'dept_assign'
                  ? 'Task Assign Dashboard'
                  : 'Current Task Dashboard'}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </button>
      </header>

      {/* KPI Strip (Includes Company / Summary Overview metrics for Super Admin & HR) */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Total Tasks</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {metrics.total}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Ongoing Tasks</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#38BDF8]/15 text-[#38BDF8]">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {companyOverview?.openTasksCount || metrics.ongoing}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Pending Review</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {companyOverview?.pendingReviewsCount || metrics.inReview}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Completed</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {metrics.completed}
          </p>
        </div>
      </section>

      {/* Role-Aware Workspace View Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Task dashboard views"
          className="inline-flex flex-wrap gap-1 rounded-2xl border border-[#23302B] bg-[#131A17] p-1"
        >
          {availableTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative rounded-xl px-3.5 py-2 text-xs font-medium transition-colors',
                  selected ? 'text-[#F0F5F2]' : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="tasks-view-tab-pill"
                    transition={{ duration: 0.2, ease: EASE }}
                    className="absolute inset-0 rounded-xl bg-[#2E8B57]/90 shadow-sm"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
            aria-label="Filter by priority"
            className="h-10 rounded-2xl border border-[#23302B] bg-[#131A17] px-3 text-xs font-medium text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TaskAssignmentStatus | '')
            }
            aria-label="Filter by status"
            className="h-10 rounded-2xl border border-[#23302B] bg-[#131A17] px-3 text-xs font-medium text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
          >
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {(isSuperAdmin || isHrManager || isDeptHead) && departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Filter by department"
              className="h-10 rounded-2xl border border-[#23302B] bg-[#131A17] px-3 text-xs font-medium text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Tasks Table */}
      <section className="overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#6E8078]">
            No tasks found in this view. Click &ldquo;Create Task&rdquo; to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-[#23302B] bg-[#0B0F0E]/40 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                  <th className="w-[30%] px-6 py-4">Task</th>
                  <th className="w-[18%] px-6 py-4">Assigned By</th>
                  <th className="w-[18%] px-6 py-4">
                    {activeTab === 'dept_assign' ? 'Assign To' : 'Department / Scope'}
                  </th>
                  <th className="w-28 px-6 py-4">Priority</th>
                  <th className="w-28 px-6 py-4">Due Date</th>
                  <th className="w-40 px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23302B]/60">
                {filteredTasks.map((task) => {
                  const status = deriveTaskStatus(task);
                  const statusStyle = ASSIGNMENT_STATUS_STYLES[status];
                  const priorityStyle = TASK_PRIORITY_STYLES[task.priority];
                  const assignedOverride = taskAssigneeOverrideMap[task.id];
                  const firstAssignee =
                    assignedOverride?.fullName ??
                    task.assignments?.[0]?.employee.fullName ??
                    null;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="cursor-pointer transition-colors hover:bg-[#1A2420]/75"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#23302B] bg-[#1A2420] text-[#4CAF7D]">
                            <CheckSquare className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[#F0F5F2]">
                              {task.title}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-[#6E8078]">
                              <span className="capitalize">{task.assignmentType}</span>
                              {firstAssignee && <span>· {firstAssignee}</span>}
                              {task.requiresReview && (
                                <span className="inline-flex items-center gap-0.5 text-[#4CAF7D]">
                                  · <ShieldCheck className="h-3 w-3" /> Review
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="truncate px-6 py-4 text-xs text-[#A3B3AC]">
                        {task.creator?.displayName ?? 'Leadership'}
                      </td>

                      <td
                        className="px-6 py-4 text-xs text-[#A3B3AC]"
                        onClick={(e) => {
                          if (activeTab === 'dept_assign' && canAssignOthers) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {activeTab === 'dept_assign' && canAssignOthers ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 shrink-0 text-[#4CAF7D]" />
                            <select
                              value={assignedOverride?.id ?? ''}
                              onChange={(e) => {
                                const emp = employees.find((x) => x.id === e.target.value);
                                if (emp) {
                                  handleTaskAssignedToEmployee(task.id, emp);
                                }
                              }}
                              aria-label={`Assign ${task.title}`}
                              className="h-8 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-2 text-xs text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                            >
                              <option value="">Assign employee...</option>
                              {employees
                                .filter((emp) => emp.employmentStatus === 'active')
                                .map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.fullName} ({emp.employeeCode})
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 truncate">
                            {task.team ? (
                              <>
                                <Users className="h-3.5 w-3.5 shrink-0 text-[#4CAF7D]" />
                                <span className="truncate">{task.team.name}</span>
                              </>
                            ) : (
                              <>
                                <Building2 className="h-3.5 w-3.5 shrink-0 text-[#4CAF7D]" />
                                <span className="truncate">
                                  {task.department?.name ?? 'Organization'}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                            priorityStyle.badge,
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', priorityStyle.dot)} />
                          {priorityStyle.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-[#A3B3AC]">
                        {task.dueDate ?? '—'}
                      </td>

                      <td
                        className="px-6 py-4 text-right"
                        onClick={(e) => {
                          if (activeTab === 'admin_full' && isSuperAdmin) {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {activeTab === 'admin_full' && isSuperAdmin ? (
                          <select
                            value={status}
                            onChange={(e) =>
                              handleStatusChanged(
                                task.id,
                                e.target.value as TaskAssignmentStatus,
                              )
                            }
                            aria-label={`Change status for ${task.title}`}
                            className={cn(
                              'cursor-pointer rounded-full border px-3 py-1 text-[11px] font-semibold outline-none',
                              statusStyle.badge,
                            )}
                          >
                            <option value="todo" className="bg-[#131A17] text-[#F0F5F2]">
                              To Do
                            </option>
                            <option value="in_progress" className="bg-[#131A17] text-[#F0F5F2]">
                              In Progress
                            </option>
                            <option value="in_review" className="bg-[#131A17] text-[#F0F5F2]">
                              In Review
                            </option>
                            <option
                              value="changes_requested"
                              className="bg-[#131A17] text-[#F0F5F2]"
                            >
                              Changes Requested
                            </option>
                            <option value="done" className="bg-[#131A17] text-[#F0F5F2]">
                              Done
                            </option>
                          </select>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold',
                              statusStyle.badge,
                            )}
                          >
                            {statusStyle.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top-Right Create Task Modal (POST /api/v1/tasks) */}
      <CreateTaskModal
        open={createModalOpen}
        canAssignOthers={canAssignOthers}
        employees={employees}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleTaskCreated}
      />

      {/* Right-Side Slide Drawer on Clicking Any Task */}
      <TaskDetailDrawer
        task={selectedTask}
        currentStatus={selectedTask ? deriveTaskStatus(selectedTask) : 'todo'}
        canManageTask={
          canManageAll ||
          Boolean(selectedTask && selectedTask.creator?.id === currentUserId)
        }
        canAssignEmployees={canAssignOthers}
        currentUserName={currentUserName}
        employees={employees}
        comments={selectedTask ? (taskCommentsMap[selectedTask.id] ?? []) : []}
        onClose={() => setSelectedTask(null)}
        onStatusChanged={handleStatusChanged}
        onTaskUpdated={handleTaskUpdated}
        onTaskCancelled={handleTaskCancelled}
        onTaskAssignedToEmployee={handleTaskAssignedToEmployee}
        onCommentAdded={handleCommentAdded}
      />
    </motion.div>
  );
}
