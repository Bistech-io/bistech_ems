'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Ban,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import type { EmployeeItem } from '@/features/employees/types';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { useRegisterRightDrawer } from '@/lib/ui/right-drawer';
import { cn } from '@/lib/utils';
import {
  cancelTask,
  fetchTaskById,
  fetchTaskComments,
  postTaskComment,
  submitTaskReviewRequest,
  updateTask,
  updateTaskAssignmentStatus,
} from '../api';
import type {
  TaskAssignmentStatus,
  TaskCommentItem,
  TaskItem,
  TaskPriority,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

export const ASSIGNMENT_STATUS_STYLES: Record<
  TaskAssignmentStatus,
  { label: string; badge: string }
> = {
  todo: {
    label: 'To Do',
    badge: 'border-[#23302B] bg-[#1A2420] text-[#A3B3AC]',
  },
  in_progress: {
    label: 'In Progress',
    badge: 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8]',
  },
  in_review: {
    label: 'In Review',
    badge: 'border-[#2E8B57]/40 bg-[#1F5C3A]/45 text-[#4CAF7D]',
  },
  changes_requested: {
    label: 'Changes Requested',
    badge: 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]',
  },
  done: {
    label: 'Done',
    badge: 'border-[#4CAF7D]/40 bg-[#4CAF7D]/15 text-[#4CAF7D]',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]',
  },
};

export const TASK_PRIORITY_STYLES: Record<
  TaskPriority,
  { label: string; dot: string; badge: string }
> = {
  low: {
    label: 'Low',
    dot: 'bg-[#6E8078]',
    badge: 'border-[#23302B] bg-[#1A2420] text-[#A3B3AC]',
  },
  medium: {
    label: 'Medium',
    dot: 'bg-[#38BDF8]',
    badge: 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8]',
  },
  high: {
    label: 'High',
    dot: 'bg-[#F59E0B]',
    badge: 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]',
  },
  urgent: {
    label: 'Urgent',
    dot: 'bg-[#EF4444]',
    badge: 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]',
  },
};

interface TaskDetailDrawerProps {
  task: TaskItem | null;
  currentStatus: TaskAssignmentStatus;
  canManageTask: boolean;
  canAssignEmployees: boolean;
  currentUserName: string;
  employees: EmployeeItem[];
  comments: TaskCommentItem[];
  onClose: () => void;
  onStatusChanged: (taskId: string, nextStatus: TaskAssignmentStatus) => void;
  onTaskUpdated: (updated: TaskItem) => void;
  onTaskCancelled: (taskId: string, reason: string) => void;
  onTaskAssignedToEmployee: (taskId: string, employee: EmployeeItem) => void;
  onCommentAdded: (taskId: string, item: TaskCommentItem) => void;
}

export function TaskDetailDrawer({
  task,
  currentStatus,
  canManageTask,
  canAssignEmployees,
  currentUserName,
  employees,
  comments,
  onClose,
  onStatusChanged,
  onTaskUpdated,
  onTaskCancelled,
  onTaskAssignedToEmployee,
  onCommentAdded,
}: TaskDetailDrawerProps) {
  useRegisterRightDrawer(Boolean(task), 576);

  const [detailedTask, setDetailedTask] = useState<TaskItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TaskAssignmentStatus>('todo');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Review Request state
  const [reviewTarget, setReviewTarget] = useState<'dept_head' | 'assignee'>('dept_head');
  const [reviewNote, setReviewNote] = useState('');
  const [isSendingReview, setIsSendingReview] = useState(false);
  const [reviewSentNotice, setReviewSentNotice] = useState<string | null>(null);

  // Suggestions & Comments state
  const [entryKind, setEntryKind] = useState<'comment' | 'suggestion'>('comment');
  const [entryBody, setEntryBody] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [fetchedComments, setFetchedComments] = useState<TaskCommentItem[]>([]);

  // Dept Head / Super Admin Assign Employee state
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignNotice, setAssignNotice] = useState<string | null>(null);

  // Edit Task fields (Super Admin / Dept Head / Creator)
  const [editMode, setEditMode] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPriority, setDraftPriority] = useState<TaskPriority>('medium');
  const [draftDueDate, setDraftDueDate] = useState('');
  const [draftRequiresReview, setDraftRequiresReview] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Cancel Task state
  const [showCancelBox, setShowCancelBox] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!task) {
      const clearTimer = setTimeout(() => {
        setDetailedTask(null);
      }, 0);
      return () => clearTimeout(clearTimer);
    }

    const initTimer = setTimeout(() => {
      setDetailedTask(task);
      setSelectedStatus(currentStatus);
      setStatusFeedback(null);
      setReviewSentNotice(null);
      setReviewNote('');
      setEntryBody('');
      setAssignNotice(null);
      setEditMode(false);
      setShowCancelBox(false);
      setCancelReason('');
      setErrorMessage(null);
      setDraftTitle(task.title);
      setDraftDescription(task.description ?? '');
      setDraftPriority(task.priority);
      setDraftDueDate(task.dueDate ?? '');
      setDraftRequiresReview(task.requiresReview);
    }, 0);

    let cancelled = false;
    fetchTaskById(task.id)
      .then((full) => {
        if (!cancelled) {
          setDetailedTask(full);
          setDraftTitle(full.title);
          setDraftDescription(full.description ?? '');
          setDraftPriority(full.priority);
          setDraftDueDate(full.dueDate ?? '');
          setDraftRequiresReview(full.requiresReview);
        }
      })
      .catch(() => {
        // Use summary task object if detail fetch fails
      });

    fetchTaskComments(task.id)
      .then((items) => {
        if (!cancelled) {
          setFetchedComments(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedComments([]);
        }
      });

    return () => {
      clearTimeout(initTimer);
      cancelled = true;
    };
  }, [task, currentStatus]);

  useEffect(() => {
    if (!task) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  const activeTask = task ? (detailedTask?.id === task.id ? detailedTask : task) : null;
  const mergedComments = [...fetchedComments, ...comments];

  async function handleUpdateStatus(nextStatus: TaskAssignmentStatus) {
    if (!activeTask || isUpdatingStatus) return;
    setSelectedStatus(nextStatus);
    setIsUpdatingStatus(true);
    setStatusFeedback(null);

    const firstAssignmentId = activeTask.assignments?.[0]?.id;

    try {
      await updateTaskAssignmentStatus(activeTask.id, firstAssignmentId, nextStatus);
      onStatusChanged(activeTask.id, nextStatus);
      setStatusFeedback(`Task status updated to ${ASSIGNMENT_STATUS_STYLES[nextStatus].label}.`);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleSendReviewRequest(e: FormEvent) {
    e.preventDefault();
    if (!activeTask || isSendingReview) return;

    setIsSendingReview(true);
    setReviewSentNotice(null);

    try {
      await submitTaskReviewRequest(activeTask.id, {
        targetRole: reviewTarget,
        note: reviewNote.trim() || undefined,
      });

      onStatusChanged(activeTask.id, 'in_review');
      setSelectedStatus('in_review');

      const targetLabel =
        reviewTarget === 'dept_head' ? 'Department Head' : 'Assignee';

      onCommentAdded(activeTask.id, {
        id: `rev-${Date.now()}`,
        authorName: currentUserName,
        kind: 'review_request',
        body:
          reviewNote.trim() ||
          `Sent review request to ${targetLabel} for approval.`,
        createdAt: 'Just now',
      });

      setReviewNote('');
      setReviewSentNotice(`Review request sent to ${targetLabel}.`);
    } finally {
      setIsSendingReview(false);
    }
  }

  async function handlePostCommentOrSuggestion(e: FormEvent) {
    e.preventDefault();
    const trimmed = entryBody.trim();
    if (!activeTask || !trimmed || isPostingComment) return;

    setIsPostingComment(true);

    try {
      await postTaskComment(activeTask.id, {
        kind: entryKind,
        body: trimmed,
      });

      onCommentAdded(activeTask.id, {
        id: `cmt-${Date.now()}`,
        authorName: currentUserName,
        kind: entryKind,
        body: trimmed,
        createdAt: 'Just now',
      });
      setEntryBody('');
    } finally {
      setIsPostingComment(false);
    }
  }

  function handleAssignToEmployee(e: FormEvent) {
    e.preventDefault();
    if (!activeTask || !assignEmployeeId) return;
    const targetEmp = employees.find((emp) => emp.id === assignEmployeeId);
    if (!targetEmp) return;

    onTaskAssignedToEmployee(activeTask.id, targetEmp);
    setDetailedTask((prev) =>
      prev
        ? {
            ...prev,
            assignmentType: 'individual',
            assignments: [
              ...(prev.assignments ?? []),
              {
                id: `asg-${Date.now()}`,
                status: 'todo',
                employee: {
                  id: targetEmp.id,
                  employeeCode: targetEmp.employeeCode,
                  fullName: targetEmp.fullName,
                },
              },
            ],
          }
        : prev,
    );
    setAssignNotice(`Assigned to ${targetEmp.fullName} (${targetEmp.employeeCode}).`);
  }

  async function handleSaveTaskEdits(e: FormEvent) {
    e.preventDefault();
    if (!activeTask || !draftTitle.trim() || isSavingEdit) return;

    setIsSavingEdit(true);
    setErrorMessage(null);

    try {
      const updated = await updateTask(activeTask.id, {
        title: draftTitle.trim(),
        description: draftDescription.trim() || null,
        priority: draftPriority,
        dueDate: draftDueDate || null,
        requiresReview: draftRequiresReview,
      });

      const merged: TaskItem = {
        ...activeTask,
        ...updated,
      };
      setDetailedTask(merged);
      onTaskUpdated(merged);
      setEditMode(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || getErrorMessageForCode(err.code));
      } else {
        // Apply locally so Super Admin / Dept Head edits reflect smoothly
        const merged: TaskItem = {
          ...activeTask,
          title: draftTitle.trim(),
          description: draftDescription.trim() || null,
          priority: draftPriority,
          dueDate: draftDueDate || null,
          requiresReview: draftRequiresReview,
        };
        setDetailedTask(merged);
        onTaskUpdated(merged);
        setEditMode(false);
      }
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleConfirmCancelTask(e: FormEvent) {
    e.preventDefault();
    const reason = cancelReason.trim();
    if (!activeTask || !reason || isCancelling) return;

    setIsCancelling(true);
    setErrorMessage(null);

    try {
      await cancelTask(activeTask.id, reason);
      onTaskCancelled(activeTask.id, reason);
      setShowCancelBox(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || getErrorMessageForCode(err.code));
      } else {
        onTaskCancelled(activeTask.id, reason);
        setShowCancelBox(false);
      }
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <AnimatePresence>
      {activeTask && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`Task details: ${activeTask.title}`}
        >
          {/* Slightly Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
          />

          {/* Slide Bar from Right Side */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: EASE }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
          >
            {/* Top Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#23302B] pb-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                      TASK_PRIORITY_STYLES[activeTask.priority].badge,
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        TASK_PRIORITY_STYLES[activeTask.priority].dot,
                      )}
                    />
                    {TASK_PRIORITY_STYLES[activeTask.priority].label} Priority
                  </span>

                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                      ASSIGNMENT_STATUS_STYLES[selectedStatus].badge,
                    )}
                  >
                    {ASSIGNMENT_STATUS_STYLES[selectedStatus].label}
                  </span>

                  {activeTask.requiresReview && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-2.5 py-0.5 text-[11px] font-medium text-[#4CAF7D]">
                      <ShieldCheck className="h-3 w-3" />
                      Review Required
                    </span>
                  )}
                </div>

                <h2 className="mt-2 font-heading text-xl font-bold text-[#F0F5F2]">
                  {activeTask.title}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                {canManageTask && activeTask.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => setEditMode((prev) => !prev)}
                    className="rounded-xl border border-[#23302B] bg-[#1A2420] px-2.5 py-1 text-xs font-medium text-[#A3B3AC] hover:border-[#2E8B57] hover:text-[#4CAF7D]"
                  >
                    {editMode ? 'Close Edit' : 'Edit'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close task drawer"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Edit Form for Super Admin / Dept Head / Creator (PATCH /api/v1/tasks/:id) */}
            {editMode && canManageTask && (
              <form
                onSubmit={handleSaveTaskEdits}
                className="mt-4 space-y-3 rounded-2xl border border-[#2E8B57]/40 bg-[#0B0F0E]/80 p-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#A3B3AC]">
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    required
                    className="h-9 w-full rounded-xl border border-[#23302B] bg-[#131A17] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#A3B3AC]">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#23302B] bg-[#131A17] p-2.5 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#A3B3AC]">
                      Priority
                    </label>
                    <select
                      value={draftPriority}
                      onChange={(e) => setDraftPriority(e.target.value as TaskPriority)}
                      className="h-9 w-full rounded-xl border border-[#23302B] bg-[#131A17] px-2.5 text-xs text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#A3B3AC]">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={draftDueDate}
                      onChange={(e) => setDraftDueDate(e.target.value)}
                      className="h-9 w-full rounded-xl border border-[#23302B] bg-[#131A17] px-2.5 text-xs text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#F0F5F2]">
                  <input
                    type="checkbox"
                    checked={draftRequiresReview}
                    onChange={(e) => setDraftRequiresReview(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#2E8B57]"
                  />
                  <span>Requires Review</span>
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="rounded-xl border border-[#23302B] px-3 py-1.5 text-xs text-[#A3B3AC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-3.5 py-1.5 text-xs font-semibold text-[#F0F5F2] hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
                  >
                    {isSavingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* Metadata Grid: Assigned By, Department/Team, Due Date, Progress */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Assigned By</span>
                <p className="mt-1 text-sm font-medium text-[#F0F5F2]">
                  {activeTask.creator?.displayName ?? 'Department Leadership'}
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Department / Scope</span>
                <p className="mt-1 truncate text-sm font-medium text-[#F0F5F2]">
                  {activeTask.department?.name ??
                    activeTask.team?.name ??
                    activeTask.assignmentType.toUpperCase()}
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Due Date</span>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#F0F5F2]">
                  <Calendar className="h-3.5 w-3.5 text-[#4CAF7D]" />
                  <span>{activeTask.dueDate ?? 'No deadline'}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Completion Progress</span>
                <p className="mt-1 text-sm font-medium text-[#F0F5F2]">
                  {activeTask.progress.done} / {Math.max(1, activeTask.progress.total)} Done
                </p>
              </div>
            </div>

            {/* Task Description */}
            <div className="mt-5 rounded-2xl border border-[#23302B] bg-[#0B0F0E]/65 p-4">
              <h3 className="text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                Description
              </h3>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-[#F0F5F2]">
                {activeTask.description || 'No detailed description provided for this task.'}
              </p>
            </div>

            {/* Assignees List & Dept Head Task Assignment */}
            {(Boolean(activeTask.assignments?.length) || canAssignEmployees) && (
              <div className="mt-5 rounded-2xl border border-[#23302B] bg-[#0B0F0E]/65 p-4">
                <h3 className="text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                  Assigned Members
                </h3>

                {activeTask.assignments && activeTask.assignments.length > 0 ? (
                  <div className="mt-2.5 space-y-2">
                    {activeTask.assignments.map((asg) => (
                      <div
                        key={asg.id}
                        className="flex items-center justify-between rounded-xl border border-[#23302B] bg-[#131A17] px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-medium text-[#F0F5F2]">
                            {asg.employee.fullName}
                          </span>{' '}
                          <span className="font-mono text-[#4CAF7D]">
                            ({asg.employee.employeeCode})
                          </span>
                        </div>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            ASSIGNMENT_STATUS_STYLES[asg.status].badge,
                          )}
                        >
                          {ASSIGNMENT_STATUS_STYLES[asg.status].label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#F59E0B]">
                    Not assigned to an individual employee yet.
                  </p>
                )}

                {canAssignEmployees && (
                  <form onSubmit={handleAssignToEmployee} className="mt-3 pt-2 border-t border-[#23302B]">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#A3B3AC]">
                      <UserCheck className="h-3.5 w-3.5 text-[#4CAF7D]" />
                      <span>Assign / Reassign Task to Employee</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={assignEmployeeId}
                        onChange={(e) => setAssignEmployeeId(e.target.value)}
                        className="h-9 flex-1 rounded-xl border border-[#23302B] bg-[#131A17] px-2.5 text-xs text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                      >
                        <option value="">— Select employee —</option>
                        {employees
                          .filter((e) => e.employmentStatus === 'active')
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} ({emp.employeeCode}) — {emp.department.name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="submit"
                        disabled={!assignEmployeeId}
                        className="h-9 rounded-xl bg-[#2E8B57] px-3.5 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                    {assignNotice && (
                      <p className="mt-1.5 text-xs text-[#4CAF7D]">{assignNotice}</p>
                    )}
                  </form>
                )}
              </div>
            )}

            {/* Update Task Status Section */}
            {activeTask.status !== 'cancelled' && (
              <div className="mt-5 rounded-2xl border border-[#23302B] bg-[#0B0F0E]/65 p-4">
                <h3 className="text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                  Update Task Status
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    [
                      'todo',
                      'in_progress',
                      'in_review',
                      'changes_requested',
                      'done',
                    ] as const
                  ).map((st) => {
                    const active = selectedStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() => handleUpdateStatus(st)}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                          active
                            ? 'border-[#2E8B57] bg-[#1F5C3A]/50 text-[#4CAF7D]'
                            : 'border-[#23302B] bg-[#131A17] text-[#A3B3AC] hover:border-[#2E8B57]/50 hover:text-[#F0F5F2]',
                        )}
                      >
                        {ASSIGNMENT_STATUS_STYLES[st].label}
                      </button>
                    );
                  })}
                </div>
                {statusFeedback && (
                  <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{statusFeedback}</span>
                  </p>
                )}
              </div>
            )}

            {/* Review Request Section (when review is required or user submits for review) */}
            {activeTask.status !== 'cancelled' && (
              <form
                onSubmit={handleSendReviewRequest}
                className="mt-5 rounded-2xl border border-[#2E8B57]/35 bg-[#1F5C3A]/15 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {activeTask.requiresReview
                        ? 'Review Required — Send Review Request'
                        : 'Send Review Request'}
                    </span>
                  </h3>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewTarget('dept_head')}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                      reviewTarget === 'dept_head'
                        ? 'border-[#2E8B57] bg-[#1F5C3A]/55 text-[#4CAF7D]'
                        : 'border-[#23302B] bg-[#0B0F0E] text-[#A3B3AC] hover:text-[#F0F5F2]',
                    )}
                  >
                    Send to Dept Head
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTarget('assignee')}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                      reviewTarget === 'assignee'
                        ? 'border-[#2E8B57] bg-[#1F5C3A]/55 text-[#4CAF7D]'
                        : 'border-[#23302B] bg-[#0B0F0E] text-[#A3B3AC] hover:text-[#F0F5F2]',
                    )}
                  >
                    Send to Assignee
                  </button>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add review note or completion link..."
                    className="h-9 flex-1 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-xs text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReview}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2E8B57] px-3.5 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                  >
                    {isSendingReview ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Send Review</span>
                  </button>
                </div>

                {reviewSentNotice && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{reviewSentNotice}</span>
                  </p>
                )}
              </form>
            )}

            {/* Suggestions & Comments Thread */}
            <div className="mt-5 flex-1 rounded-2xl border border-[#23302B] bg-[#0B0F0E]/65 p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Suggestions &amp; Comments</span>
                </h3>
                <span className="text-[11px] text-[#6E8078]">
                  {mergedComments.length} {mergedComments.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              <div className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                {mergedComments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#6E8078]">
                    No suggestions or comments yet.
                  </p>
                ) : (
                  mergedComments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#23302B] bg-[#131A17] p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#F0F5F2]">
                            {item.authorName}
                          </span>
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                              item.kind === 'suggestion'
                                ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                                : item.kind === 'review_request'
                                  ? 'bg-[#1F5C3A]/50 text-[#4CAF7D]'
                                  : 'bg-[#1A2420] text-[#A3B3AC]',
                            )}
                          >
                            {item.kind === 'review_request' ? 'Review' : item.kind}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#6E8078]">{item.createdAt}</span>
                      </div>
                      <p className="mt-1.5 leading-relaxed text-[#A3B3AC]">{item.body}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostCommentOrSuggestion} className="mt-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryKind('comment')}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium',
                      entryKind === 'comment'
                        ? 'border-[#2E8B57] bg-[#1F5C3A]/40 text-[#4CAF7D]'
                        : 'border-[#23302B] bg-[#131A17] text-[#A3B3AC]',
                    )}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Comment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryKind('suggestion')}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium',
                      entryKind === 'suggestion'
                        ? 'border-[#38BDF8]/50 bg-[#38BDF8]/15 text-[#38BDF8]'
                        : 'border-[#23302B] bg-[#131A17] text-[#A3B3AC]',
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Suggestion</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={entryBody}
                    onChange={(e) => setEntryBody(e.target.value)}
                    placeholder={
                      entryKind === 'suggestion'
                        ? 'Write a suggestion for this task...'
                        : 'Write a comment...'
                    }
                    className="h-9 flex-1 rounded-xl border border-[#23302B] bg-[#131A17] px-3 text-xs text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                  />
                  <button
                    type="submit"
                    disabled={!entryBody.trim() || isPostingComment}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2E8B57] px-3.5 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Post</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Cancel Task Option (POST /api/v1/tasks/:id/cancel) */}
            {canManageTask && activeTask.status !== 'cancelled' && (
              <div className="mt-5 border-t border-[#23302B] pt-4">
                {!showCancelBox ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelBox(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-1.5 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/20"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Cancel Task</span>
                  </button>
                ) : (
                  <form onSubmit={handleConfirmCancelTask} className="space-y-2.5">
                    <label className="block text-xs font-medium text-[#FCA5A5]">
                      Reason for cancellation
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Provide reason to cancel task..."
                        required
                        className="h-9 flex-1 rounded-xl border border-[#EF4444]/40 bg-[#0B0F0E] px-3 text-xs text-[#F0F5F2] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCancelBox(false)}
                        className="h-9 rounded-xl border border-[#23302B] px-3 text-xs text-[#A3B3AC]"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!cancelReason.trim() || isCancelling}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#EF4444] px-3.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {isCancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>Confirm Cancel</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
