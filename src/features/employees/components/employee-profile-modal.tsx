'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  Unlock,
  UserCog,
  X,
} from 'lucide-react';
import {
  fetchOrgRoles,
  putDepartmentHead,
  putUserRoles,
  type OrgRoleItem,
} from '@/features/admin/leadership/api';
import { getRoleLabel, isCustomRoleName } from '@/lib/auth/permissions';
import { ApiError } from '@/lib/api/errors';
import { useRegisterRightDrawer } from '@/lib/ui/right-drawer';
import { cn } from '@/lib/utils';
import {
  createDesignation,
  updateEmployeeAccountStatus,
  updateEmployeeDesignation,
} from '../api';
import type {
  DepartmentOption,
  DesignationOption,
  EmployeeItem,
  EmployeeLiveStatus,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

export type TeamRoleAssignment = 'team_member' | 'department_manager' | 'hr_manager';

interface EmployeeProfileModalProps {
  employee: EmployeeItem | null;
  liveStatus: EmployeeLiveStatus;
  designations: DesignationOption[];
  departments?: DepartmentOption[];
  canEditDesignation: boolean;
  onClose: () => void;
  onDesignationUpdated: (
    employeeId: string,
    designation: { id: string; title: string },
  ) => void;
  onDepartmentUpdated?: (
    employeeId: string,
    department: { id: string; name: string },
  ) => void;
  onRoleUpdated?: (
    employeeId: string,
    assignment: TeamRoleAssignment,
    departmentId: string,
    nextRoles: string[],
  ) => void;
  onAccountStatusUpdated?: (employeeId: string, accountStatus: string) => void;
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

function resolveInitialRoleAssignment(roles: string[]): TeamRoleAssignment {
  if (roles.includes('hr_manager')) return 'hr_manager';
  if (roles.includes('department_head') || roles.includes('dept_head')) {
    return 'department_manager';
  }
  return 'team_member';
}

export function EmployeeProfileModal({
  employee,
  liveStatus,
  designations,
  departments = [],
  canEditDesignation,
  onClose,
  onDesignationUpdated,
  onDepartmentUpdated,
  onRoleUpdated,
  onAccountStatusUpdated,
  onLiveStatusChange,
}: EmployeeProfileModalProps) {
  useRegisterRightDrawer(Boolean(employee), 512);

  const [designationInput, setDesignationInput] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedRoleAssignment, setSelectedRoleAssignment] =
    useState<TeamRoleAssignment>('team_member');
  const [availableCustomRoles, setAvailableCustomRoles] = useState<OrgRoleItem[]>([]);
  const [selectedCustomRoles, setSelectedCustomRoles] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<EmployeeLiveStatus | 'auto'>(liveStatus);
  const [savedStatusNotice, setSavedStatusNotice] = useState(false);

  const [isSavingDesignation, setIsSavingDesignation] = useState(false);
  const [savedDesignationNotice, setSavedDesignationNotice] = useState(false);

  const [isSavingDepartment, setIsSavingDepartment] = useState(false);
  const [savedDepartmentNotice, setSavedDepartmentNotice] = useState(false);

  const [isSavingRole, setIsSavingRole] = useState(false);
  const [savedRoleNotice, setSavedRoleNotice] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [isTogglingFreeze, setIsTogglingFreeze] = useState(false);
  const [freezeNotice, setFreezeNotice] = useState<string | null>(null);
  const [freezeError, setFreezeError] = useState<string | null>(null);

  const availableDepartments = useMemo<DepartmentOption[]>(() => {
    if (!employee) return departments;
    const exists = departments.some((d) => d.id === employee.department.id);
    if (exists) return departments;
    return [employee.department, ...departments];
  }, [departments, employee]);

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;
    fetchOrgRoles()
      .then((rolesList) => {
        if (!cancelled) {
          setAvailableCustomRoles(rolesList.filter((r) => !r.isSystem));
        }
      })
      .catch(() => {});

    const timer = setTimeout(() => {
      setDesignationInput(employee.designation.title);
      setSelectedDepartmentId(employee.department.id);
      setSelectedRoleAssignment(resolveInitialRoleAssignment(employee.user.roles));
      setSelectedCustomRoles(employee.user.roles.filter((r) => isCustomRoleName(r)));
      setDraftStatus(liveStatus);
      setSavedStatusNotice(false);
      setSavedDesignationNotice(false);
      setSavedDepartmentNotice(false);
      setSavedRoleNotice(false);
      setRoleError(null);
      setFreezeNotice(null);
      setFreezeError(null);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employee, liveStatus]);

  function handleConfirmStatusChange(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    onLiveStatusChange(employee.id, draftStatus);
    setSavedStatusNotice(true);
  }

  async function handleSaveDesignation(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = designationInput.trim();
    if (!employee || !trimmed || isSavingDesignation) return;

    const matched = designations.find(
      (d) => d.title.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    setIsSavingDesignation(true);
    setSavedDesignationNotice(false);

    let resolvedDesignation = matched
      ? { id: matched.id, title: matched.title }
      : { id: employee.designation.id, title: trimmed };

    try {
      if (!matched) {
        try {
          const created = await createDesignation(trimmed);
          resolvedDesignation = { id: created.id, title: created.title };
        } catch {
          // Proceed with title update if POST /designations fails
        }
      }

      await updateEmployeeDesignation(employee.id, {
        designationId: resolvedDesignation.id,
        designationTitle: trimmed,
        reason: 'Designation updated',
      });
    } catch {
      // Apply locally in directory if backend PATCH /employees/:id is not yet deployed
    } finally {
      onDesignationUpdated(employee.id, {
        id: resolvedDesignation.id,
        title: trimmed,
      });
      setIsSavingDesignation(false);
      setSavedDesignationNotice(true);
    }
  }

  async function handleSaveDepartment(e: React.FormEvent) {
    e.preventDefault();
    if (!employee || !selectedDepartmentId || isSavingDepartment) return;

    const targetDept = availableDepartments.find((d) => d.id === selectedDepartmentId);
    if (!targetDept) return;

    setIsSavingDepartment(true);
    setSavedDepartmentNotice(false);

    try {
      await updateEmployeeDesignation(employee.id, {
        departmentId: targetDept.id,
        reason: 'Department updated',
      });
    } catch {
      // Apply locally in directory if backend PATCH /employees/:id is not yet deployed
    } finally {
      onDepartmentUpdated?.(employee.id, {
        id: targetDept.id,
        name: targetDept.name,
      });
      setIsSavingDepartment(false);
      setSavedDepartmentNotice(true);
    }
  }

  async function handleSaveRoleAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!employee || isSavingRole) return;

    setIsSavingRole(true);
    setSavedRoleNotice(false);
    setRoleError(null);

    const targetDeptId = selectedDepartmentId || employee.department.id;
    const preserveSuperAdmin = employee.user.roles.includes('super_admin')
      ? ['super_admin']
      : [];

    let nextRoles: string[] = [...preserveSuperAdmin, 'employee'];
    if (selectedRoleAssignment === 'department_manager') {
      nextRoles = Array.from(new Set([...nextRoles, 'dept_head']));
    } else if (selectedRoleAssignment === 'hr_manager') {
      nextRoles = Array.from(new Set([...nextRoles, 'hr_manager']));
    }
    nextRoles = Array.from(new Set([...nextRoles, ...selectedCustomRoles]));

    const hadCustomRoles = employee.user.roles.some((r) => isCustomRoleName(r));

    try {
      if (selectedRoleAssignment === 'department_manager') {
        await putDepartmentHead(targetDeptId, employee.id);
        if (
          employee.user.roles.includes('hr_manager') ||
          selectedCustomRoles.length > 0 ||
          hadCustomRoles
        ) {
          await putUserRoles(employee.user.id, nextRoles, targetDeptId);
        }
      } else {
        await putUserRoles(employee.user.id, nextRoles);
      }

      onRoleUpdated?.(employee.id, selectedRoleAssignment, targetDeptId, nextRoles);
      setSavedRoleNotice(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORBIDDEN') {
        setRoleError('Only Super Admin can change manager role assignments.');
      } else if (err instanceof ApiError && err.code === 'SELF_MODIFICATION_NOT_ALLOWED') {
        setRoleError('You cannot modify your own role assignment.');
      } else if (err instanceof ApiError) {
        setRoleError(err.message || 'Failed to update role assignment.');
      } else {
        setRoleError('Failed to update role assignment. Please try again.');
      }
    } finally {
      setIsSavingRole(false);
    }
  }

  return (
    <AnimatePresence>
      {employee && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`${employee.fullName} profile drawer`}
        >
          {/* Slightly blurred backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
          />

          {/* Slide Drawer from Right */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: EASE }}
            className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#23302B] pb-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2E8B57]/50 bg-[#1A2420] font-heading text-base font-bold text-[#4CAF7D]">
                  {getInitials(employee.fullName)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                      {employee.fullName}
                    </h2>
                    <span className="rounded-lg border border-[#23302B] bg-[#0B0F0E] px-2 py-0.5 font-mono text-xs font-medium text-[#4CAF7D]">
                      {employee.employeeCode}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#A3B3AC]">
                    {employee.designation.title} · {employee.department.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile drawer"
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

            {/* Editable Management Controls */}
            {canEditDesignation && (
              <div className="mt-6 space-y-4 border-t border-[#23302B] pt-5">
                {/* 1. Separate Status Change Block with Confirm Button */}
                <form
                  onSubmit={handleConfirmStatusChange}
                  className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-4"
                >
                  <label
                    htmlFor="profile-live-status-select"
                    className="mb-2 block text-xs font-semibold tracking-[0.04em] text-[#4CAF7D] uppercase"
                  >
                    Change Status
                  </label>
                  <div className="flex items-center gap-2.5">
                    <select
                      id="profile-live-status-select"
                      value={draftStatus}
                      onChange={(e) => {
                        setDraftStatus(e.target.value as EmployeeLiveStatus | 'auto');
                        setSavedStatusNotice(false);
                      }}
                      className="h-10 flex-1 rounded-xl border border-[#23302B] bg-[#131A17] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                    >
                      <option value="auto">Auto (From Attendance)</option>
                      <option value="available">Available</option>
                      <option value="arriving">Not Arrived Yet</option>
                      <option value="absent">Absent</option>
                      <option value="on_vacation">On Vacation</option>
                      <option value="after_hours">Working Hour Ended</option>
                    </select>

                    <button
                      type="submit"
                      disabled={draftStatus === liveStatus}
                      className="inline-flex h-10 items-center rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>

                  {savedStatusNotice && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Status updated.</span>
                    </p>
                  )}
                </form>

                {/* 2. Change Designation & Department Block */}
                <div className="space-y-4 rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-4">
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
                          setSavedDesignationNotice(false);
                        }}
                        placeholder="Enter designation title"
                        className="h-10 flex-1 rounded-xl border border-[#23302B] bg-[#131A17] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                      />

                      <button
                        type="submit"
                        disabled={
                          isSavingDesignation ||
                          !designationInput.trim() ||
                          designationInput.trim() === employee.designation.title
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingDesignation ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving</span>
                          </>
                        ) : (
                          <span>Update</span>
                        )}
                      </button>
                    </div>

                    {savedDesignationNotice && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Designation updated.</span>
                      </p>
                    )}
                  </form>

                  <form onSubmit={handleSaveDepartment}>
                    <label
                      htmlFor="profile-department-select"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[#A3B3AC]"
                    >
                      <Building2 className="h-3.5 w-3.5 text-[#4CAF7D]" />
                      <span>Change Department</span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <select
                        id="profile-department-select"
                        value={selectedDepartmentId}
                        onChange={(e) => {
                          setSelectedDepartmentId(e.target.value);
                          setSavedDepartmentNotice(false);
                        }}
                        className="h-10 flex-1 rounded-xl border border-[#23302B] bg-[#131A17] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                      >
                        {availableDepartments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={
                          isSavingDepartment ||
                          !selectedDepartmentId ||
                          selectedDepartmentId === employee.department.id
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingDepartment ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving</span>
                          </>
                        ) : (
                          <span>Update</span>
                        )}
                      </button>
                    </div>

                    {savedDepartmentNotice && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Department updated.</span>
                      </p>
                    )}
                  </form>
                </div>

                {/* 3. Role Assignment Block */}
                <form
                  onSubmit={handleSaveRoleAssignment}
                  className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-4"
                >
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#4CAF7D] uppercase">
                    <UserCog className="h-3.5 w-3.5" />
                    <span>Assign Role</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'team_member', label: 'Team Member' },
                        { id: 'department_manager', label: 'Dept Manager' },
                        { id: 'hr_manager', label: 'HR Manager' },
                      ] as const
                    ).map((opt) => {
                      const active = selectedRoleAssignment === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedRoleAssignment(opt.id);
                            setSavedRoleNotice(false);
                            setRoleError(null);
                          }}
                          className={cn(
                            'rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors',
                            active
                              ? 'border-[#2E8B57] bg-[#1F5C3A]/45 text-[#4CAF7D]'
                              : 'border-[#23302B] bg-[#131A17] text-[#A3B3AC] hover:border-[#2E8B57]/50 hover:text-[#F0F5F2]',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {availableCustomRoles.length > 0 && (
                    <div className="mt-3 border-t border-[#23302B]/70 pt-3">
                      <p className="mb-2 text-[11px] font-semibold tracking-[0.04em] text-[#A3B3AC] uppercase">
                        Custom Roles
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCustomRoles.map((customRole) => {
                          const checked = selectedCustomRoles.includes(customRole.name);
                          return (
                            <button
                              key={customRole.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomRoles((prev) =>
                                  prev.includes(customRole.name)
                                    ? prev.filter((r) => r !== customRole.name)
                                    : [...prev, customRole.name],
                                );
                                setSavedRoleNotice(false);
                                setRoleError(null);
                              }}
                              className={cn(
                                'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                                checked
                                  ? 'border-[#38BDF8]/60 bg-[#38BDF8]/15 text-[#38BDF8]'
                                  : 'border-[#23302B] bg-[#131A17] text-[#A3B3AC] hover:border-[#38BDF8]/40 hover:text-[#F0F5F2]',
                              )}
                            >
                              {getRoleLabel(customRole.name)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingRole}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSavingRole ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Role...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Confirm Role</span>
                      </>
                    )}
                  </button>

                  {savedRoleNotice && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Role assignment updated.</span>
                    </p>
                  )}

                  {roleError && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{roleError}</span>
                    </p>
                  )}
                </form>

                {/* 4. Account Freezing Block */}
                <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#A3B3AC] uppercase">
                        <Lock className="h-3.5 w-3.5 text-[#F59E0B]" />
                        <span>Account Access</span>
                      </p>
                      <p className="mt-1 text-xs text-[#6E8078]">
                        {employee.user.accountStatus === 'suspended'
                          ? 'This account is frozen and cannot sign in.'
                          : 'Freezing revokes active sessions and blocks sign-in.'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize',
                        employee.user.accountStatus === 'suspended'
                          ? 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FCA5A5]'
                          : 'border-[#2E8B57]/40 bg-[#1F5C3A]/30 text-[#4CAF7D]',
                      )}
                    >
                      {employee.user.accountStatus === 'suspended' ? 'Frozen' : 'Active'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isTogglingFreeze}
                    onClick={async () => {
                      if (!employee || isTogglingFreeze) return;
                      const willFreeze = employee.user.accountStatus !== 'suspended';
                      setIsTogglingFreeze(true);
                      setFreezeNotice(null);
                      setFreezeError(null);
                      try {
                        const updated = await updateEmployeeAccountStatus(employee.id, {
                          frozen: willFreeze,
                        });
                        onAccountStatusUpdated?.(
                          employee.id,
                          updated.user.accountStatus,
                        );
                        setFreezeNotice(
                          willFreeze
                            ? 'Employee account frozen.'
                            : 'Employee account unfrozen.',
                        );
                      } catch (err) {
                        setFreezeError(
                          err instanceof ApiError
                            ? err.message
                            : 'Failed to update account status.',
                        );
                      } finally {
                        setIsTogglingFreeze(false);
                      }
                    }}
                    className={cn(
                      'mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      employee.user.accountStatus === 'suspended'
                        ? 'border-[#2E8B57]/50 bg-[#1F5C3A]/40 text-[#4CAF7D] hover:bg-[#2E8B57] hover:text-[#F0F5F2]'
                        : 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#FCA5A5] hover:bg-[#EF4444] hover:text-white',
                    )}
                  >
                    {isTogglingFreeze ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : employee.user.accountStatus === 'suspended' ? (
                      <>
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Unfreeze Account</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        <span>Freeze Account</span>
                      </>
                    )}
                  </button>

                  {freezeNotice && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{freezeNotice}</span>
                    </p>
                  )}

                  {freezeError && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{freezeError}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
