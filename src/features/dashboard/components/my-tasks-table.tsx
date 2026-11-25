'use client';

import Link from 'next/link';
import { CheckSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateTaskModal } from '@/features/tasks/components/create-task-modal';
import { TaskDetailDrawer } from '@/features/tasks/components/task-detail-drawer';
import type { TaskCommentItem, TaskItem } from '@/features/tasks/types';
import { useAuth } from '@/providers/auth-provider';
import type { EmployeeTaskItem, TaskAssignmentStatus, TaskPriority } from '../types';

interface MyTasksTableProps {
  tasks: EmployeeTaskItem[];
}

type FilterTab = 'all' | 'open' | 'in_review' | 'done';

const STATUS_META: Record<TaskAssignmentStatus, { label: string; className: string }> = {
  todo: {
    label: 'To Do',
    className: 'border-[#23302B] bg-[#1A2420] text-[#A3B3AC]',
  },
  in_progress: {
    label: 'In Progress',
    className: 'border-[#38BDF8]/30 bg-[#38BDF8]/15 text-[#38BDF8]',
  },
  in_review: {
    label: 'In Review',
    className: 'border-[#2E8B57]/40 bg-[#1F5C3A]/50 text-[#4CAF7D]',
  },
  changes_requested: {
    label: 'Changes Requested',
    className: 'border-[#F59E0B]/30 bg-[#F59E0B]/15 text-[#F59E0B]',
  },
  done: {
    label: 'Done',
    className: 'border-[#4CAF7D]/30 bg-[#4CAF7D]/15 text-[#4CAF7D]',
  },
};

const PRIORITY_META: Record<TaskPriority, { label: string; dotClass: string }> = {
  urgent: { label: 'Urgent', dotClass: 'bg-[#EF4444]' },
  high: { label: 'High', dotClass: 'bg-[#F59E0B]' },
  medium: { label: 'Medium', dotClass: 'bg-[#38BDF8]' },
  low: { label: 'Low', dotClass: 'bg-[#6E8078]' },
};

export function MyTasksTable({ tasks }: MyTasksTableProps) {
  const { user, session, activeRole } = useAuth();
  const currentUserName = session?.user.name ?? user?.name ?? 'Team Member';
  const canManage = activeRole === 'super_admin' || activeRole === 'dept_head';

  const [filter, setFilter] = useState<FilterTab>('all');
  const [localTasks, setLocalTasks] = useState<EmployeeTaskItem[]>(tasks);
  const [selectedTaskItem, setSelectedTaskItem] = useState<TaskItem | null>(null);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<TaskAssignmentStatus>('todo');
  const [commentsMap, setCommentsMap] = useState<Record<string, TaskCommentItem[]>>({});
  const [createOpen, setCreateOpen] = useState(false);

  const filteredTasks = localTasks.filter((task) => {
    if (filter === 'open') return task.status !== 'done';
    if (filter === 'in_review') {
      return task.status === 'in_review' || task.status === 'changes_requested';
    }
    if (filter === 'done') return task.status === 'done';
    return true;
  });

  function openTaskInDrawer(item: EmployeeTaskItem) {
    setSelectedTaskStatus(item.status);
    setSelectedTaskItem({
      id: item.id,
      title: item.title,
      description: `Deliverable under ${item.projectOrTeam}.`,
      priority: item.priority,
      dueDate: item.dueDate,
      assignmentType: item.assignmentType,
      requiresReview: item.assignmentType !== 'self',
      status: 'active',
      department: { id: 'dept', name: item.projectOrTeam },
      creator: { id: 'lead', displayName: 'Department Leadership' },
      progress: { done: item.status === 'done' ? 1 : 0, total: 1 },
      createdAt: item.dueDate,
    });
  }

  return (
    <section className="flex flex-col gap-5 rounded-[2rem] border border-[#23302B] bg-[#131A17] p-6 md:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/50 text-[#4CAF7D]">
            <CheckSquare className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
              My Task Assignments
            </h2>
            <p className="text-xs text-[#A3B3AC]">
              Active deliverables across self, individual, and team tasks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[#23302B] bg-[#0B0F0E] p-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'open', label: 'Open' },
                { id: 'in_review', label: 'Review' },
                { id: 'done', label: 'Done' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === tab.id
                    ? 'bg-[#2E8B57] text-[#F0F5F2]'
                    : 'text-[#A3B3AC] hover:text-[#F0F5F2]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#2E8B57] px-3 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Task</span>
          </button>

          <Link
            href="/tasks"
            className="inline-flex h-8 items-center rounded-full border border-[#23302B] bg-[#0B0F0E] px-3 text-xs font-medium text-[#4CAF7D] transition-colors hover:border-[#2E8B57]"
          >
            Open Task Board
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#23302B] text-[11px] font-semibold tracking-wider text-[#6E8078] uppercase">
              <th className="py-3 pr-4">Task</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Priority</th>
              <th className="px-3 py-3">Status</th>
              <th className="py-3 pl-3 text-right">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#23302B]/70 text-sm">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-[#A3B3AC]">
                  No task assignments match this filter.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const statusInfo = STATUS_META[task.status];
                const priorityInfo = PRIORITY_META[task.priority];

                return (
                  <tr
                    key={task.id}
                    onClick={() => openTaskInDrawer(task)}
                    className="group cursor-pointer transition-colors hover:bg-[#1A2420]/70"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-[#F0F5F2] transition-colors group-hover:text-[#4CAF7D]">
                        {task.title}
                      </div>
                      <div className="mt-0.5 text-xs text-[#6E8078]">{task.projectOrTeam}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="rounded-full border border-[#23302B] bg-[#1A2420] px-2.5 py-0.5 text-[11px] font-medium text-[#A3B3AC] capitalize">
                        {task.assignmentType}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A3B3AC]">
                        <span className={`h-2 w-2 rounded-full ${priorityInfo.dotClass}`} />
                        {priorityInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${statusInfo.className}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                      <span
                        className={`font-mono text-xs font-medium ${
                          task.isOverdue
                            ? 'text-[#EF4444]'
                            : task.isDueSoon
                              ? 'text-[#F59E0B]'
                              : 'text-[#A3B3AC]'
                        }`}
                      >
                        {task.dueLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CreateTaskModal
        open={createOpen}
        canAssignOthers={canManage}
        employees={[]}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setLocalTasks((prev) => [
            {
              id: created.id,
              title: created.title,
              projectOrTeam: created.department?.name ?? 'My Workspace',
              assignmentType: created.assignmentType,
              status: 'todo',
              priority: created.priority,
              dueDate: created.dueDate ?? '2026-11-30',
              dueLabel: created.dueDate ?? 'Upcoming',
              isOverdue: false,
              isDueSoon: false,
            },
            ...prev,
          ]);
        }}
      />

      <TaskDetailDrawer
        task={selectedTaskItem}
        currentStatus={selectedTaskStatus}
        canManageTask={canManage}
        canAssignEmployees={canManage}
        currentUserName={currentUserName}
        employees={[]}
        comments={selectedTaskItem ? (commentsMap[selectedTaskItem.id] ?? []) : []}
        onClose={() => setSelectedTaskItem(null)}
        onStatusChanged={(taskId, nextStatus) => {
          if (nextStatus === 'cancelled') return;
          setSelectedTaskStatus(nextStatus);
          setLocalTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
          );
        }}
        onTaskUpdated={(updated) => {
          setLocalTasks((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? {
                    ...t,
                    title: updated.title,
                    priority: updated.priority,
                    dueDate: updated.dueDate ?? t.dueDate,
                  }
                : t,
            ),
          );
        }}
        onTaskCancelled={(taskId) => {
          setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
          setSelectedTaskItem(null);
        }}
        onTaskAssignedToEmployee={() => {}}
        onCommentAdded={(taskId, item) => {
          setCommentsMap((prev) => ({
            ...prev,
            [taskId]: [...(prev[taskId] ?? []), item],
          }));
        }}
      />
    </section>
  );
}
