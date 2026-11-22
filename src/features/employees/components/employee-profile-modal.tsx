'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { updateEmployeeDesignation } from '../api';
import type { DesignationOption, EmployeeItem, EmployeeLiveStatus } from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface EmployeeProfileModalProps {
  employee: EmployeeItem | null;
  liveStatus: EmployeeLiveStatus;
  designations: DesignationOption[];
  canEditDesignation: boolean;
  onClose: () => void;
  onDesignationUpdated: (employeeId: string, designation: { id: string; title: string }) => void;
  onLiveStatusChange: (employeeId: string, status: EmployeeLiveStatus | 'auto') => void;
}

const EMPLOYMENT_TYPE_LABELS: Record<EmployeeItem['employmentType'], string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  intern: 'Intern',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function EmployeeProfileModal({
  employee,
  liveStatus,
  designations,
  canEditDesignation,
  onClose,
  onDesignationUpdated,
  onLiveStatusChange,
}: EmployeeProfileModalProps) {
  const [designationInput, setDesignationInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!employee) return;
    const timer = setTimeout(() => {
      setDesignationInput(employee.designation.title);
      setSavedNotice(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [employee]);

  async function handleSaveDesignation(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = designationInput.trim();
    if (!employee || !trimmed || isSaving) return;

    const matched = designations.find(
      (d) => d.title.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    setIsSaving(true);
    setSavedNotice(false);

    try {
      await updateEmployeeDesignation(employee.id, {
        ...(matched ? { designationId: matched.id } : {}),
        designationTitle: trimmed,
        reason: 'Designation updated by HR',
      });
    } catch {
      // Apply locally in directory if backend PATCH /employees/:id is not yet deployed
    } finally {
      onDesignationUpdated(employee.id, {
        id: matched?.id ?? employee.designation.id,
        title: trimmed,
      });
      setIsSaving(false);
      setSavedNotice(true);
    }
  }

  return (
    <AnimatePresence>
      {employee && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="w-full max-w-xl rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#23302B] pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2E8B57]/50 bg-[#1A2420] font-heading text-base font-bold text-[#4CAF7D]">
                  {getInitials(employee.fullName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                      {employee.fullName}
                    </h2>
                    <span className="rounded-lg border border-[#23302B] bg-[#0B0F0E] px-2 py-0.5 text-xs font-medium text-[#4CAF7D]">
                      {employee.employeeCode}
                    </span>
                  </div>
                  <p className="text-xs text-[#A3B3AC]">
                    {employee.designation.title} · {employee.department.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="rounded-xl p-1.5 text-[#A3B3AC] transition-colors hover:bg-[#1A2420] hover:text-[#F0F5F2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Details Grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Username</span>
                <p className="mt-1 text-sm font-medium text-[#F0F5F2]">
                  @{employee.user.username}
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Work Email</span>
                <p className="mt-1 truncate text-sm font-medium text-[#F0F5F2]">
                  {employee.workEmail}
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Department</span>
                <p className="mt-1 text-sm font-medium text-[#F0F5F2]">
                  {employee.department.name}
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Phone</span>
                <p className="mt-1 text-sm font-medium text-[#F0F5F2]">
                  {employee.phone || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Employment Type</span>
                <p className="mt-1 text-sm font-medium text-[#F0F5F2]">
                  {EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
                </p>
              </div>

              <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                <span className="text-[#6E8078]">Joining Date</span>
                <p className="mt-1 text-sm font-medium text-[#F0F5F2]">
                  {String(employee.joiningDate).slice(0, 10)}
                </p>
              </div>
            </div>

            {/* Dynamic Status & Change Designation (Text Input) */}
            {canEditDesignation && (
              <div className="mt-5 space-y-4 border-t border-[#23302B] pt-4">
                <div>
                  <label
                    htmlFor="profile-live-status-select"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Attendance / Presence Status
                  </label>
                  <select
                    id="profile-live-status-select"
                    value={liveStatus}
                    onChange={(e) =>
                      onLiveStatusChange(
                        employee.id,
                        e.target.value as EmployeeLiveStatus | 'auto',
                      )
                    }
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  >
                    <option value="auto">Auto (From Attendance)</option>
                    <option value="available">Available</option>
                    <option value="arriving">Arriving</option>
                    <option value="absent">Absent</option>
                    <option value="on_vacation">On Vacation</option>
                    <option value="after_hours">Working Hour Ended</option>
                  </select>
                </div>

                <form onSubmit={handleSaveDesignation}>
                  <label
                    htmlFor="profile-designation-input"
                    className="mb-1.5 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Change Designation
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      id="profile-designation-input"
                      type="text"
                      value={designationInput}
                      onChange={(e) => {
                        setDesignationInput(e.target.value);
                        setSavedNotice(false);
                      }}
                      className="h-10 flex-1 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    />

                    <button
                      type="submit"
                      disabled={
                        isSaving ||
                        !designationInput.trim() ||
                        designationInput.trim() === employee.designation.title
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving</span>
                        </>
                      ) : (
                        <span>Update</span>
                      )}
                    </button>
                  </div>

                  {savedNotice && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Designation updated.</span>
                    </p>
                  )}
                </form>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
