'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Search } from 'lucide-react';
import {
  fetchMyAttendanceBoard,
  fetchOrganizationSettings,
} from '@/features/attendance/api';
import type { OrganizationShiftSettings } from '@/features/attendance/types';
import { can } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import {
  fetchDepartments,
  fetchDesignations,
  fetchEmployees,
  fetchTodayOrgAttendance,
  type OrgAttendanceItem,
} from '../api';
import type {
  DepartmentOption,
  DesignationOption,
  EmployeeItem,
  EmployeeLiveStatus,
} from '../types';
import { CreateEmployeeModal } from './create-employee-modal';
import { EmployeeProfileModal } from './employee-profile-modal';

const EASE = [0.22, 1, 0.36, 1] as const;

function format24hTo12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export const LIVE_STATUS_STYLES: Record<
  EmployeeLiveStatus,
  { badge: string; label: string }
> = {
  available: {
    badge: 'border-[#2E8B57]/40 bg-[#1F5C3A]/40 text-[#4CAF7D]',
    label: 'Available',
  },
  arriving: {
    badge: 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8]',
    label: 'Not Arrived Yet',
  },
  absent: {
    badge: 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]',
    label: 'Absent',
  },
  on_vacation: {
    badge: 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]',
    label: 'On Vacation',
  },
  after_hours: {
    badge: 'border-[#23302B] bg-[#1A2420] text-[#A3B3AC]',
    label: 'Working Hour Ended',
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function parseHhMmToMinutes(hhmm: string, fallback: number): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return h * 60 + m;
}

function getEmployeeHierarchyRank(emp: EmployeeItem): number {
  const roles = emp.user.roles.map((r) => r.toLowerCase());
  const dept = emp.department.name.toLowerCase();
  const desig = emp.designation.title.toLowerCase();

  if (
    roles.includes('super_admin') ||
    dept.includes('management') ||
    dept.includes('executive') ||
    desig.includes('ceo') ||
    desig.includes('director') ||
    desig.includes('executive')
  ) {
    return 0;
  }

  if (
    roles.includes('department_head') ||
    roles.includes('dept_head') ||
    desig.includes('head') ||
    desig.includes('lead') ||
    desig.includes('manager')
  ) {
    if (roles.includes('hr_manager') || dept.includes('human resource') || dept.includes('people')) {
      return 2;
    }
    return 1;
  }

  if (roles.includes('hr_manager') || dept.includes('human resource') || dept.includes('people')) {
    return 2;
  }

  return 3;
}

export function EmployeesDashboard() {
  const { user, activeRole } = useAuth();
  const canCreate =
    activeRole === 'super_admin' ||
    activeRole === 'hr_manager' ||
    can(user, 'employee.create', 'org');
  const canUpdate =
    activeRole === 'super_admin' ||
    activeRole === 'hr_manager' ||
    can(user, 'employee.update', 'org');

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [shiftSettings, setShiftSettings] = useState<OrganizationShiftSettings | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, OrgAttendanceItem>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, EmployeeLiveStatus>>({});
  const [now, setNow] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [liveStatusFilter, setLiveStatusFilter] = useState<EmployeeLiveStatus | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);

  useEffect(() => {
    const initTimer = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const todayIso = new Date().toISOString().slice(0, 10);
    const hasEmployeeRecord = Boolean(user?.employeeId);

    Promise.all([
      fetchEmployees().catch(() => [] as EmployeeItem[]),
      fetchDepartments().catch(() => [] as DepartmentOption[]),
      fetchDesignations().catch(() => [] as DesignationOption[]),
      fetchOrganizationSettings().catch(() => null),
      hasEmployeeRecord ? fetchMyAttendanceBoard().catch(() => null) : Promise.resolve(null),
      fetchTodayOrgAttendance(todayIso).catch(() => [] as OrgAttendanceItem[]),
    ])
      .then(([empList, deptList, desigList, orgSettings, myBoard, todayOrgAtt]) => {
        if (cancelled) return;
        setEmployees(empList);
        setDepartments(deptList);
        setDesignations(desigList);

        if (orgSettings) {
          setShiftSettings(orgSettings);
        } else if (myBoard) {
          setShiftSettings({
            timezone: myBoard.timezone,
            workStart: myBoard.workStart,
            workEnd: myBoard.workEnd,
            graceMinutes: myBoard.graceMinutes,
          });
        }

        const nextAttMap: Record<string, OrgAttendanceItem> = {};
        for (const item of todayOrgAtt) {
          nextAttMap[item.employeeId] = item;
        }
        if (
          myBoard?.today &&
          myBoard.today.status !== 'not_checked_in' &&
          user?.employeeId
        ) {
          nextAttMap[user.employeeId] = {
            employeeId: user.employeeId,
            workDate: myBoard.today.workDate,
            status: myBoard.today.status,
            checkInAt: myBoard.today.checkInAt,
          };
        }
        setAttendanceMap(nextAttMap);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const handleShiftUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<OrganizationShiftSettings>;
      if (customEvent.detail) {
        setShiftSettings(customEvent.detail);
      }
    };

    window.addEventListener('ems:shift-updated', handleShiftUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener('ems:shift-updated', handleShiftUpdated);
    };
  }, [user?.employeeId]);

  /**
   * Auto-derives employee live status from daily attendance and working hours,
   * while allowing HR manual override (e.g., On Vacation).
   */
  const deriveLiveStatus = useCallback(
    (emp: EmployeeItem): EmployeeLiveStatus => {
      const override = statusOverrides[emp.id];
      if (override) return override;

      if (emp.employmentStatus !== 'active') {
        return 'absent';
      }

      const att = attendanceMap[emp.id];
      const hasCheckedInToday = Boolean(
        att && (att.status === 'present' || att.status === 'late'),
      );

      const currentMinutes = now
        ? now.getHours() * 60 + now.getMinutes()
        : 10 * 60;
      const endCutoff = parseHhMmToMinutes(shiftSettings?.workEnd ?? '', 18 * 60 + 30);
      const isWorkingHourEnded = currentMinutes >= endCutoff;

      if (isWorkingHourEnded) {
        // Working hour ended: if not checked in today -> Absent; if checked in -> Working Hour Ended
        return hasCheckedInToday ? 'after_hours' : 'absent';
      }

      if (hasCheckedInToday) {
        return 'available';
      }

      // Work hour started / active, not checked in yet -> Arriving
      return 'arriving';
    },
    [statusOverrides, attendanceMap, now, shiftSettings],
  );

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees
      .filter((emp) => {
        if (departmentFilter && emp.department.id !== departmentFilter) return false;
        const empStatus = deriveLiveStatus(emp);
        if (liveStatusFilter && empStatus !== liveStatusFilter) return false;
        if (!q) return true;
        return (
          emp.fullName.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q) ||
          emp.workEmail.toLowerCase().includes(q) ||
          emp.user.username.toLowerCase().includes(q) ||
          emp.designation.title.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const rankDiff = getEmployeeHierarchyRank(a) - getEmployeeHierarchyRank(b);
        if (rankDiff !== 0) return rankDiff;
        const deptDiff = a.department.name.localeCompare(b.department.name);
        if (deptDiff !== 0) return deptDiff;
        return a.employeeCode.localeCompare(b.employeeCode);
      });
  }, [employees, departmentFilter, liveStatusFilter, searchQuery, deriveLiveStatus]);

  const availableCount = useMemo(
    () => employees.filter((e) => deriveLiveStatus(e) === 'available').length,
    [employees, deriveLiveStatus],
  );

  function handleCreated(newEmp: EmployeeItem) {
    setEmployees((prev) => [newEmp, ...prev]);
    fetchDesignations().then(setDesignations).catch(() => {});
    fetchDepartments().then(setDepartments).catch(() => {});
  }

  function handleDesignationUpdated(
    employeeId: string,
    nextDesignation: { id: string; title: string },
  ) {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, designation: nextDesignation } : emp,
      ),
    );
    setSelectedEmployee((prev) =>
      prev && prev.id === employeeId
        ? { ...prev, designation: nextDesignation }
        : prev,
    );
  }

  function handleDepartmentUpdated(
    employeeId: string,
    nextDepartment: { id: string; name: string },
  ) {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, department: nextDepartment } : emp,
      ),
    );
    setSelectedEmployee((prev) =>
      prev && prev.id === employeeId
        ? { ...prev, department: nextDepartment }
        : prev,
    );
  }

  function handleRoleUpdated(
    employeeId: string,
    _assignment: string,
    _departmentId: string,
    nextRoles: string[],
  ) {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? { ...emp, user: { ...emp.user, roles: nextRoles } }
          : emp,
      ),
    );
    setSelectedEmployee((prev) =>
      prev && prev.id === employeeId
        ? { ...prev, user: { ...prev.user, roles: nextRoles } }
        : prev,
    );
    fetchDepartments().then(setDepartments).catch(() => {});
  }

  function handleLiveStatusChange(
    employeeId: string,
    status: EmployeeLiveStatus | 'auto',
  ) {
    setStatusOverrides((prev) => {
      const next = { ...prev };
      if (status === 'auto') {
        delete next[employeeId];
      } else {
        next[employeeId] = status;
      }
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div className="flex flex-wrap items-baseline gap-4">
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            Manage Employees
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#A3B3AC]">
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Total: <strong className="text-[#F0F5F2]">{employees.length}</strong>
            </span>
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Available: <strong className="text-[#4CAF7D]">{availableCount}</strong>
            </span>
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Departments: <strong className="text-[#F0F5F2]">{departments.length}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 py-2 text-xs">
            <Clock className="h-4 w-4 text-[#4CAF7D]" />
            <span className="text-[#A3B3AC]">Shift:</span>
            <strong className="text-[#F0F5F2]">
              {shiftSettings
                ? `${format24hTo12h(shiftSettings.workStart)} – ${format24hTo12h(shiftSettings.workEnd)} · ${shiftSettings.graceMinutes}m grace`
                : '—'}
            </strong>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Employee</span>
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, BST code, email..."
            className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="h-10 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 text-xs font-medium text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={liveStatusFilter}
            onChange={(e) => setLiveStatusFilter(e.target.value as EmployeeLiveStatus | '')}
            aria-label="Filter by status"
            className="h-10 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 text-xs font-medium text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="arriving">Not Arrived Yet</option>
            <option value="absent">Absent</option>
            <option value="on_vacation">On Vacation</option>
            <option value="after_hours">Working Hour Ended</option>
          </select>
        </div>
      </div>

      {/* Employee Table (Code -> Employee -> Department -> Designation -> Status) */}
      <section className="overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#6E8078]">
            No employees found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-[#23302B] bg-[#0B0F0E]/40 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                  <th className="w-32 px-6 py-4">Code</th>
                  <th className="w-[34%] px-6 py-4">Employee</th>
                  <th className="w-[22%] px-6 py-4">Department</th>
                  <th className="w-[22%] px-6 py-4">Designation</th>
                  <th className="w-48 px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23302B]/60">
                {filteredEmployees.map((emp) => {
                  const liveStatus = deriveLiveStatus(emp);
                  const style = LIVE_STATUS_STYLES[liveStatus];

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="cursor-pointer transition-colors hover:bg-[#1A2420]/75"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-medium text-[#4CAF7D]">
                        {emp.employeeCode}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#23302B] bg-[#1A2420] font-heading text-xs font-bold text-[#4CAF7D]">
                            {getInitials(emp.fullName)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[#F0F5F2]">
                              {emp.fullName}
                            </div>
                            <div className="truncate text-xs text-[#6E8078]">
                              @{emp.user.username} · {emp.workEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="truncate px-6 py-4 text-xs text-[#A3B3AC]">
                        {emp.department.name}
                      </td>
                      <td className="truncate px-6 py-4 text-xs font-medium text-[#F0F5F2]">
                        {emp.designation.title}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium',
                            style.badge,
                          )}
                        >
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Big Create Employee Modal */}
      <CreateEmployeeModal
        open={createOpen}
        departments={departments}
        designations={designations}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        onDesignationCreated={(newDesig) => {
          setDesignations((prev) => {
            if (
              prev.some(
                (d) =>
                  d.id === newDesig.id ||
                  d.title.trim().toLowerCase() === newDesig.title.trim().toLowerCase(),
              )
            ) {
              return prev;
            }
            return [...prev, newDesig];
          });
        }}
      />

      {/* Employee Profile Right-Side Slide Drawer */}
      <EmployeeProfileModal
        employee={selectedEmployee}
        liveStatus={selectedEmployee ? deriveLiveStatus(selectedEmployee) : 'available'}
        designations={designations}
        departments={departments}
        canEditDesignation={canUpdate}
        onClose={() => setSelectedEmployee(null)}
        onDesignationUpdated={handleDesignationUpdated}
        onDepartmentUpdated={handleDepartmentUpdated}
        onRoleUpdated={handleRoleUpdated}
        onLiveStatusChange={handleLiveStatusChange}
      />
    </motion.div>
  );
}
