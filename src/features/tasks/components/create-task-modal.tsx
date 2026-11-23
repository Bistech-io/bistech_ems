'use client';

import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckSquare,
  Loader2,
  X,
} from 'lucide-react';
import type { EmployeeItem } from '@/features/employees/types';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { createTask } from '../api';
import type {
  CreateTaskPayload,
  TaskAssignmentType,
  TaskItem,
  TaskPriority,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface CreateTaskModalProps {
  open: boolean;
  canAssignOthers: boolean;
  employees: EmployeeItem[];
  onClose: () => void;
  onCreated: (task: TaskItem) => void;
}

export function CreateTaskModal({
  open,
  canAssignOthers,
  employees,
  onClose,
  onCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignmentType, setAssignmentType] = useState<TaskAssignmentType>(
    canAssignOthers ? 'individual' : 'self',
  );
  const [assigneeId, setAssigneeId] = useState('');
  const [requiresReview, setRequiresReview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetForm() {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setAssignmentType(canAssignOthers ? 'individual' : 'self');
    setAssigneeId('');
    setRequiresReview(true);
    setErrorMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setErrorMessage(null);

    const effectiveAssignmentType: TaskAssignmentType =
      canAssignOthers && assignmentType === 'individual' && assigneeId
        ? 'individual'
        : 'self';

    const payload: CreateTaskPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      assignmentType: effectiveAssignmentType,
      ...(effectiveAssignmentType === 'individual' && assigneeId
        ? { assigneeId }
        : {}),
      requiresReview,
    };

    setIsSubmitting(true);

    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : undefined;
      const created = await createTask(payload, idempotencyKey);
      onCreated(created);
      resetForm();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || getErrorMessageForCode(err.code));
      } else {
        setErrorMessage('Failed to create task. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-task-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="w-full max-w-lg rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#23302B] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
                  <CheckSquare className="h-4 w-4" />
                </span>
                <h2
                  id="create-task-modal-title"
                  className="font-heading text-lg font-bold text-[#F0F5F2]"
                >
                  Create Task
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="task-title-input"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  Task Name
                </label>
                <input
                  id="task-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter task title"
                  required
                  maxLength={150}
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description-input"
                  className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                >
                  Description
                </label>
                <textarea
                  id="task-description-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe task objectives and expectations..."
                  maxLength={4000}
                  className="w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] p-3 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="task-priority-select"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Priority
                  </label>
                  <select
                    id="task-priority-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-duedate-input"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Due Date
                  </label>
                  <input
                    id="task-duedate-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
              </div>

              {canAssignOthers && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#A3B3AC]">
                      Assignment Scope
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'self', label: 'Self Task' },
                          { id: 'individual', label: 'Assign Employee' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAssignmentType(opt.id)}
                          className={cn(
                            'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                            assignmentType === opt.id
                              ? 'border-[#2E8B57] bg-[#1F5C3A]/40 text-[#4CAF7D]'
                              : 'border-[#23302B] bg-[#0B0F0E] text-[#A3B3AC] hover:text-[#F0F5F2]',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {assignmentType === 'individual' && (
                    <div>
                      <label
                        htmlFor="task-assignee-select"
                        className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                      >
                        Assign To Employee
                      </label>
                      <select
                        id="task-assignee-select"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                      >
                        <option value="">— Select employee (or leave for self) —</option>
                        {employees
                          .filter((emp) => emp.employmentStatus === 'active')
                          .map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.fullName} ({emp.employeeCode}) — {emp.department.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#23302B] bg-[#0B0F0E]/75 px-3.5 py-2.5 text-xs text-[#F0F5F2]">
                <input
                  type="checkbox"
                  checked={requiresReview}
                  onChange={(e) => setRequiresReview(e.target.checked)}
                  className="h-4 w-4 rounded border-[#23302B] accent-[#2E8B57]"
                />
                <span>Review required before final completion</span>
              </label>

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create Task</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
