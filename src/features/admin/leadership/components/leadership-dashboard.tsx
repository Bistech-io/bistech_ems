'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  Network,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import {
  fetchMyAttendanceBoard,
  fetchOrganizationSettings,
} from '@/features/attendance/api';
import type { OrganizationShiftSettings } from '@/features/attendance/types';
import {
  fetchDesignations,
  fetchEmployees,
  fetchTodayOrgAttendance,
  type OrgAttendanceItem,
} from '@/features/employees/api';
import { EmployeeProfileModal } from '@/features/employees/components/employee-profile-modal';
import { LIVE_STATUS_STYLES } from '@/features/employees/components/employees-dashboard';
import type {
  DesignationOption,
  EmployeeItem,
  EmployeeLiveStatus,
} from '@/features/employees/types';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import {
  fetchLeadershipDepartments,
  fetchOrgRoles,
  fetchOrgUsers,
  putDepartmentHead,
  putUserRoles,
  type LeadershipDepartmentItem,
  type OrgRoleItem,
  type OrgUserItem,
} from '../api';

type LeadershipTab = 'all' | 'hr' | 'heads';

const EASE = [0.22, 1, 0.36, 1] as const;

const DEFAULT_SHIFT: OrganizationShiftSettings = {
  timezone: 'Asia/Dhaka',
  workStart: '09:00',
  workEnd: '18:00',
  graceMinutes: 15,
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

function buildFallbackEmployeeProfile(
  userItem: OrgUserItem,
  fallbackDept?: { id: string; name: string },
): EmployeeItem {
  const parts = userItem.displayName.trim().split(/\s+/);
  const firstName = parts[0] || userItem.displayName;
  const lastName = parts.slice(1).join(' ') || '';

  return {
    id: userItem.employee?.id ?? userItem.id,
    employeeCode: userItem.employee?.employeeCode ?? 'BST-0000',
    firstName,
    lastName,
    fullName: userItem.displayName,
    workEmail: userItem.email,
    phone: null,
    department: userItem.employee?.department ??
      fallbackDept ?? { id: 'dept', name: 'Organization' },
    designation: userItem.employee?.designation ?? {
      id: 'desig',
      title: 'Department Head',
    },
    employmentType: 'full_time',
    employmentStatus: userItem.employee?.employmentStatus ?? 'active',
    joiningDate: userItem.createdAt ?? '2026-01-01',
    user: {
      id: userItem.id,
      username: userItem.username,
      displayName: userItem.displayName,
      email: userItem.email,
      accountStatus: userItem.accountStatus,
      roles: userItem.roles,
    },
  };
}

export function LeadershipDashboard() {
  const { user, session } = useAuth();
  const currentUserId = session?.user.id ?? user?.userId ?? '';
  const currentEmployeeId = session?.employeeId ?? null;

  const [users, setUsers] = useState<OrgUserItem[]>([]);
  const [roles, setRoles] = useState<OrgRoleItem[]>([]);
  const [departments, setDepartments] = useState<LeadershipDepartmentItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [shiftSettings, setShiftSettings] = useState<OrganizationShiftSettings>(DEFAULT_SHIFT);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, OrgAttendanceItem>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, EmployeeLiveStatus>>({});
  const [now, setNow] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<LeadershipTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [assignHrOpen, setAssignHrOpen] = useState(false);
  const [selectedHrUserId, setSelectedHrUserId] = useState('');
  const [isAssigningHr, setIsAssigningHr] = useState(false);

  const [revokeHrTarget, setRevokeHrTarget] = useState<OrgUserItem | null>(null);
  const [isRevokingHr, setIsRevokingHr] = useState(false);

  const [headModalDept, setHeadModalDept] = useState<LeadershipDepartmentItem | null>(null);
  const [selectedHeadEmployeeId, setSelectedHeadEmployeeId] = useState('');
  const [isSavingHead, setIsSavingHead] = useState(false);

  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState<EmployeeItem | null>(
    null,
  );

  useEffect(() => {
    const initTimer = setTimeout(() => setNow(new Date()), 0);
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, []);

  const loadAll = useCallback(async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const [
      usersList,
      rolesList,
      deptsList,
      empList,
      desigList,
      orgSettings,
      myBoard,
      todayOrgAtt,
    ] = await Promise.all([
      fetchOrgUsers({ limit: 100 }).catch(() => [] as OrgUserItem[]),
      fetchOrgRoles().catch(() => [] as OrgRoleItem[]),
      fetchLeadershipDepartments().catch(() => [] as LeadershipDepartmentItem[]),
      fetchEmployees().catch(() => [] as EmployeeItem[]),
      fetchDesignations().catch(() => [] as DesignationOption[]),
      fetchOrganizationSettings().catch(() => null),
      fetchMyAttendanceBoard().catch(() => null),
      fetchTodayOrgAttendance(todayIso).catch(() => [] as OrgAttendanceItem[]),
    ]);

    setUsers(usersList);
    setRoles(rolesList);
    setDepartments(deptsList);
    setEmployees(empList);
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
      if (item.employeeId) {
        nextAttMap[item.employeeId] = item;
      }
    }
    if (
      myBoard?.today &&
      myBoard.today.status !== 'not_checked_in' &&
      currentEmployeeId
    ) {
      nextAttMap[currentEmployeeId] = {
        employeeId: currentEmployeeId,
        workDate: myBoard.today.workDate,
        status: myBoard.today.status,
        checkInAt: myBoard.today.checkInAt,
      };
    }
    setAttendanceMap(nextAttMap);
  }, [currentEmployeeId]);

  useEffect(() => {
    let cancelled = false;
    const todayIso = new Date().toISOString().slice(0, 10);

    Promise.all([
      fetchOrgUsers({ limit: 100 }).catch(() => [] as OrgUserItem[]),
      fetchOrgRoles().catch(() => [] as OrgRoleItem[]),
      fetchLeadershipDepartments().catch(() => [] as LeadershipDepartmentItem[]),
      fetchEmployees().catch(() => [] as EmployeeItem[]),
      fetchDesignations().catch(() => [] as DesignationOption[]),
      fetchOrganizationSettings().catch(() => null),
      fetchMyAttendanceBoard().catch(() => null),
      fetchTodayOrgAttendance(todayIso).catch(() => [] as OrgAttendanceItem[]),
    ])
      .then(
        ([
          usersList,
          rolesList,
          deptsList,
          empList,
          desigList,
          orgSettings,
          myBoard,
          todayOrgAtt,
        ]) => {
          if (cancelled) return;
          setUsers(usersList);
          setRoles(rolesList);
          setDepartments(deptsList);
          setEmployees(empList);
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
            if (item.employeeId) {
              nextAttMap[item.employeeId] = item;
            }
          }
          if (
            myBoard?.today &&
            myBoard.today.status !== 'not_checked_in' &&
            currentEmployeeId
          ) {
            nextAttMap[currentEmployeeId] = {
              employeeId: currentEmployeeId,
              workDate: myBoard.today.workDate,
              status: myBoard.today.status,
              checkInAt: myBoard.today.checkInAt,
            };
          }
          setAttendanceMap(nextAttMap);
        },
      )
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentEmployeeId]);

  const employeeById = useMemo(() => {
    const map = new Map<string, EmployeeItem>();
    for (const emp of employees) {
      map.set(emp.id, emp);
    }
    return map;
  }, [employees]);

  const userByEmployeeId = useMemo(() => {
    const map = new Map<string, OrgUserItem>();
    for (const u of users) {
      if (u.employee?.id) {
        map.set(u.employee.id, u);
      }
    }
    return map;
  }, [users]);

  const deriveLiveStatus = useCallback(
    (employeeId: string | null | undefined, employmentStatus = 'active'): EmployeeLiveStatus => {
      if (!employeeId) return 'absent';
      const override = statusOverrides[employeeId];
      if (override) return override;

      if (employmentStatus !== 'active') {
        return 'absent';
      }

      const att = attendanceMap[employeeId];
      const hasCheckedInToday = Boolean(
        att && (att.status === 'present' || att.status === 'late'),
      );

      const currentMinutes = now ? now.getHours() * 60 + now.getMinutes() : 10 * 60;
      const endCutoff = parseHhMmToMinutes(shiftSettings.workEnd, 18 * 60);
      const isWorkingHourEnded = currentMinutes >= endCutoff;

      if (isWorkingHourEnded) {
        return hasCheckedInToday ? 'after_hours' : 'absent';
      }

      if (hasCheckedInToday) {
        return 'available';
      }

      return 'arriving';
    },
    [statusOverrides, attendanceMap, now, shiftSettings],
  );

  const hrUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (!u.roles.includes('hr_manager')) return false;
      if (!q) return true;
      const code = u.employee?.employeeCode ?? '';
      const dept = u.employee?.department?.name ?? '';
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  const nonHrCandidates = useMemo(() => {
    return users.filter(
      (u) =>
        u.id !== currentUserId &&
        u.accountStatus === 'active' &&
        !u.roles.includes('hr_manager'),
    );
  }, [users, currentUserId]);

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return departments.filter((dept) => {
      if (!q) return true;
      const headEmp = dept.headEmployeeId ? employeeById.get(dept.headEmployeeId) : null;
      const headName = headEmp?.fullName ?? dept.headEmployee?.name ?? '';
      const headCode = headEmp?.employeeCode ?? dept.headEmployee?.employeeCode ?? '';
      return (
        dept.name.toLowerCase().includes(q) ||
        headName.toLowerCase().includes(q) ||
        headCode.toLowerCase().includes(q)
      );
    });
  }, [departments, employeeById, searchQuery]);

  const hrRoleCountFromRoles = useMemo(() => {
    const found = roles.find((r) => r.name === 'hr_manager');
    return found?._count?.userRoles;
  }, [roles]);

  const totalHrCount = useMemo(() => {
    const fromUsers = users.filter((u) => u.roles.includes('hr_manager')).length;
    return fromUsers > 0 ? fromUsers : (hrRoleCountFromRoles ?? 0);
  }, [users, hrRoleCountFromRoles]);

  const coveredDeptCount = useMemo(
    () => departments.filter((d) => Boolean(d.headEmployeeId)).length,
    [departments],
  );
  const unassignedDeptCount = Math.max(0, departments.length - coveredDeptCount);

  const headCandidates = useMemo(() => {
    if (employees.length > 0) {
      return employees
        .filter((e) => e.employmentStatus === 'active')
        .map((e) => ({
          employeeId: e.id,
          userId: e.user.id,
          roles: e.user.roles,
          name: e.fullName,
          code: e.employeeCode,
          departmentName: e.department.name,
        }));
    }

    return users
      .filter((u) => Boolean(u.employee?.id) && u.accountStatus === 'active')
      .map((u) => ({
        employeeId: u.employee!.id,
        userId: u.id,
        roles: u.roles,
        name: u.displayName,
        code: u.employee!.employeeCode,
        departmentName: u.employee?.department?.name ?? 'Organization',
      }));
  }, [employees, users]);

  async function handleAssignHr() {
    if (!selectedHrUserId || isAssigningHr) return;
    const targetUser = users.find((u) => u.id === selectedHrUserId);
    if (!targetUser) return;

    setIsAssigningHr(true);
    setActionError(null);

    const nextRoles = Array.from(new Set([...targetUser.roles, 'hr_manager']));

    try {
      await putUserRoles(targetUser.id, nextRoles);
      await loadAll();
      setAssignHrOpen(false);
      setSelectedHrUserId('');
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message || getErrorMessageForCode(err.code));
      } else {
        setActionError('Failed to assign HR Manager role.');
      }
    } finally {
      setIsAssigningHr(false);
    }
  }

  async function handleRevokeHr() {
    if (!revokeHrTarget || isRevokingHr) return;

    setIsRevokingHr(true);
    setActionError(null);

    const remainingRoles = revokeHrTarget.roles.filter((r) => r !== 'hr_manager');
    const nextRoles = remainingRoles.length > 0 ? remainingRoles : ['employee'];

    try {
      await putUserRoles(revokeHrTarget.id, nextRoles);
      await loadAll();
      setRevokeHrTarget(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message || getErrorMessageForCode(err.code));
      } else {
        setActionError('Failed to revoke HR Manager role.');
      }
    } finally {
      setIsRevokingHr(false);
    }
  }

  function openHeadModal(dept: LeadershipDepartmentItem) {
    setActionError(null);
    setHeadModalDept(dept);
    setSelectedHeadEmployeeId(dept.headEmployeeId ?? '');
  }

  async function handleSaveDepartmentHead() {
    if (!headModalDept || isSavingHead) return;
    const nextHeadEmployeeId = selectedHeadEmployeeId || null;

    setIsSavingHead(true);
    setActionError(null);

    try {
      await putDepartmentHead(headModalDept.id, nextHeadEmployeeId);
      await loadAll();
      setHeadModalDept(null);
      setSelectedHeadEmployeeId('');
    } catch (err) {
      // Fallback: if PUT /departments/:id/head is not yet deployed on the backend,
      // sync department_head role via PUT /users/:id/roles and update department state.
      if (err instanceof ApiError && err.status === 404 && nextHeadEmployeeId) {
        try {
          const candidate = headCandidates.find((c) => c.employeeId === nextHeadEmployeeId);
          if (candidate && candidate.userId !== currentUserId) {
            const nextRoles = Array.from(
              new Set([...candidate.roles, 'department_head']),
            );
            await putUserRoles(candidate.userId, nextRoles);
          }
          setDepartments((prev) =>
            prev.map((d) =>
              d.id === headModalDept.id
                ? {
                    ...d,
                    headEmployeeId: nextHeadEmployeeId,
                    headEmployee: candidate
                      ? {
                          id: candidate.employeeId,
                          name: candidate.name,
                          employeeCode: candidate.code,
                        }
                      : null,
                  }
                : d,
            ),
          );
          setHeadModalDept(null);
          setSelectedHeadEmployeeId('');
          return;
        } catch (innerErr) {
          if (innerErr instanceof ApiError) {
            setActionError(innerErr.message || getErrorMessageForCode(innerErr.code));
          } else {
            setActionError('Failed to update Department Head.');
          }
          return;
        }
      }

      if (err instanceof ApiError) {
        setActionError(err.message || getErrorMessageForCode(err.code));
      } else {
        setActionError('Failed to update Department Head.');
      }
    } finally {
      setIsSavingHead(false);
    }
  }

  function handleOpenEmployeeProfile(
    employeeId: string | null | undefined,
    fallbackUser?: OrgUserItem,
    fallbackDept?: { id: string; name: string },
  ) {
    if (employeeId) {
      const fullEmp = employeeById.get(employeeId);
      if (fullEmp) {
        setSelectedProfileEmployee(fullEmp);
        return;
      }
      const linkedUser = userByEmployeeId.get(employeeId) ?? fallbackUser;
      if (linkedUser) {
        setSelectedProfileEmployee(buildFallbackEmployeeProfile(linkedUser, fallbackDept));
        return;
      }
    }
    if (fallbackUser) {
      setSelectedProfileEmployee(buildFallbackEmployeeProfile(fallbackUser, fallbackDept));
    }
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
    setUsers((prev) =>
      prev.map((u) =>
        u.employee?.id === employeeId
          ? {
              ...u,
              employee: {
                ...u.employee,
                designation: nextDesignation,
              },
            }
          : u,
      ),
    );
    setSelectedProfileEmployee((prev) =>
      prev && prev.id === employeeId
        ? { ...prev, designation: nextDesignation }
        : prev,
    );
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

  const showHrSection = activeTab === 'all' || activeTab === 'hr';
  const showHeadsSection = activeTab === 'all' || activeTab === 'heads';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Clean Header (No subtitle clutter) */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
          Manage HR &amp; Department Heads
        </h1>

        <button
          type="button"
          onClick={() => {
            setActionError(null);
            setSelectedHrUserId(nonHrCandidates[0]?.id ?? '');
            setAssignHrOpen(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Assign HR Manager</span>
        </button>
      </header>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-xs text-[#FCA5A5]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[#FCA5A5] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Active HR Managers</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">{totalHrCount}</p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Departments Covered</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <Network className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {coveredDeptCount} / {departments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Unassigned Heads</span>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl',
                unassignedDeptCount > 0
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                  : 'bg-[#1F5C3A]/40 text-[#4CAF7D]',
              )}
            >
              {unassignedDeptCount > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {unassignedDeptCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Total System Roles</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {roles.length || 4}
          </p>
        </div>
      </section>

      {/* Controls: Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Leadership sections"
          className="inline-flex rounded-2xl border border-[#23302B] bg-[#131A17] p-1"
        >
          {(
            [
              { id: 'all', label: 'All Leadership' },
              { id: 'hr', label: `HR Managers (${totalHrCount})` },
              { id: 'heads', label: `Department Heads (${coveredDeptCount})` },
            ] as const
          ).map((tab) => {
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
                    layoutId="leadership-tab-pill"
                    transition={{ duration: 0.2, ease: EASE }}
                    className="absolute inset-0 rounded-xl bg-[#2E8B57]/90 shadow-sm"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, BST code, or department..."
            className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] transition-colors outline-none focus:border-[#4CAF7D]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-[#23302B] bg-[#131A17]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* HR Managers Table (Full Width, Clean Alignment) */}
          {showHrSection && (
            <section className="overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23302B] px-6 py-4">
                <h2 className="font-heading text-lg font-semibold text-[#F0F5F2]">
                  HR Managers
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setSelectedHrUserId(nonHrCandidates[0]?.id ?? '');
                    setAssignHrOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#23302B] bg-[#1A2420] px-3 py-1.5 text-xs font-medium text-[#4CAF7D] transition-colors hover:border-[#2E8B57]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add HR</span>
                </button>
              </div>

              {hrUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#6E8078]">
                  No HR Managers found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#23302B] bg-[#0B0F0E]/40 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                        <th className="w-28 px-6 py-3.5">Code</th>
                        <th className="w-[34%] px-6 py-3.5">HR Manager</th>
                        <th className="w-[20%] px-6 py-3.5">Department</th>
                        <th className="w-36 px-6 py-3.5">Attendance</th>
                        <th className="w-32 px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23302B]/60">
                      {hrUsers.map((hrUser) => {
                        const empId = hrUser.employee?.id;
                        const liveStatus = deriveLiveStatus(
                          empId,
                          hrUser.employee?.employmentStatus ?? 'active',
                        );
                        const statusStyle = LIVE_STATUS_STYLES[liveStatus];
                        const isSelf = hrUser.id === currentUserId;

                        return (
                          <tr
                            key={hrUser.id}
                            onClick={() => handleOpenEmployeeProfile(empId, hrUser)}
                            className="cursor-pointer transition-colors hover:bg-[#1A2420]/75"
                          >
                            <td className="px-6 py-4 font-mono text-xs font-medium text-[#4CAF7D]">
                              {hrUser.employee?.employeeCode ?? '—'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#23302B] bg-[#1A2420] font-heading text-xs font-bold text-[#4CAF7D]">
                                  {getInitials(hrUser.displayName)}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-[#F0F5F2]">
                                    {hrUser.displayName}
                                  </div>
                                  <div className="truncate text-xs text-[#6E8078]">
                                    @{hrUser.username} · {hrUser.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="truncate px-6 py-4 text-xs text-[#A3B3AC]">
                              {hrUser.employee?.department?.name ?? '—'}
                            </td>
                            <td className="px-6 py-4">
                              {empId ? (
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                                    statusStyle.badge,
                                  )}
                                >
                                  {statusStyle.label}
                                </span>
                              ) : (
                                <span className="text-xs text-[#6E8078]">—</span>
                              )}
                            </td>
                            <td
                              className="px-6 py-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => {
                                  setActionError(null);
                                  setRevokeHrTarget(hrUser);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#23302B] px-3 py-1.5 text-xs font-medium text-[#A3B3AC] transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                                <span>Revoke</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Department Heads Table (Full Width, with Attendance Status & Click-to-Open Profile) */}
          {showHeadsSection && (
            <section className="overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23302B] px-6 py-4">
                <h2 className="font-heading text-lg font-semibold text-[#F0F5F2]">
                  Department Heads
                </h2>
              </div>

              {filteredDepartments.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#6E8078]">
                  No departments found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#23302B] bg-[#0B0F0E]/40 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                        <th className="w-[24%] px-6 py-3.5">Department</th>
                        <th className="w-28 px-6 py-3.5">Code</th>
                        <th className="w-[28%] px-6 py-3.5">Department Head</th>
                        <th className="w-40 px-6 py-3.5">Attendance Status</th>
                        <th className="w-24 px-6 py-3.5">Members</th>
                        <th className="w-36 px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23302B]/60">
                      {filteredDepartments.map((dept) => {
                        const headEmpId = dept.headEmployeeId ?? dept.headEmployee?.id ?? null;
                        const fullHeadEmp = headEmpId ? employeeById.get(headEmpId) : null;
                        const linkedHeadUser = headEmpId
                          ? userByEmployeeId.get(headEmpId)
                          : undefined;

                        const headName =
                          fullHeadEmp?.fullName ??
                          dept.headEmployee?.name ??
                          linkedHeadUser?.displayName ??
                          null;
                        const headCode =
                          fullHeadEmp?.employeeCode ??
                          dept.headEmployee?.employeeCode ??
                          linkedHeadUser?.employee?.employeeCode ??
                          null;
                        const headDesignation =
                          fullHeadEmp?.designation.title ??
                          linkedHeadUser?.employee?.designation?.title ??
                          'Department Head';

                        const liveStatus = headEmpId
                          ? deriveLiveStatus(
                              headEmpId,
                              fullHeadEmp?.employmentStatus ?? 'active',
                            )
                          : null;
                        const statusStyle = liveStatus ? LIVE_STATUS_STYLES[liveStatus] : null;

                        return (
                          <tr
                            key={dept.id}
                            onClick={() => {
                              if (headEmpId) {
                                handleOpenEmployeeProfile(headEmpId, linkedHeadUser, {
                                  id: dept.id,
                                  name: dept.name,
                                });
                              }
                            }}
                            className={cn(
                              'transition-colors',
                              headEmpId
                                ? 'cursor-pointer hover:bg-[#1A2420]/75'
                                : 'hover:bg-[#1A2420]/40',
                            )}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5 font-medium text-[#F0F5F2]">
                                <Building2 className="h-4 w-4 shrink-0 text-[#4CAF7D]" />
                                <span className="truncate">{dept.name}</span>
                              </div>
                            </td>

                            <td className="px-6 py-4 font-mono text-xs font-medium text-[#4CAF7D]">
                              {headCode ?? '—'}
                            </td>

                            <td className="px-6 py-4">
                              {headName ? (
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#23302B] bg-[#1A2420] font-heading text-xs font-bold text-[#4CAF7D]">
                                    {getInitials(headName)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate font-medium text-[#F0F5F2]">
                                      {headName}
                                    </div>
                                    <div className="truncate text-xs text-[#6E8078]">
                                      {headDesignation}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#F59E0B]">
                                  Unassigned
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {statusStyle ? (
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium',
                                    statusStyle.badge,
                                  )}
                                >
                                  {statusStyle.label}
                                </span>
                              ) : (
                                <span className="text-xs text-[#6E8078]">—</span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-xs text-[#A3B3AC]">
                              {dept.activeEmployeeCount ?? 0} staff
                            </td>

                            <td
                              className="px-6 py-4 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => openHeadModal(dept)}
                                className="rounded-xl border border-[#23302B] bg-[#1A2420] px-3 py-1.5 text-xs font-medium text-[#F0F5F2] transition-colors hover:border-[#2E8B57] hover:text-[#4CAF7D]"
                              >
                                {headName ? 'Change Head' : 'Assign Head'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Assign HR Manager Modal */}
      <AnimatePresence>
        {assignHrOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                  Assign HR Manager Role
                </h2>
                <button
                  type="button"
                  onClick={() => setAssignHrOpen(false)}
                  aria-label="Close modal"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <label
                  htmlFor="assign-hr-select"
                  className="block text-xs font-medium text-[#A3B3AC]"
                >
                  Employee
                </label>
                <select
                  id="assign-hr-select"
                  value={selectedHrUserId}
                  onChange={(e) => setSelectedHrUserId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                >
                  {nonHrCandidates.length === 0 ? (
                    <option value="">No eligible employees available</option>
                  ) : (
                    nonHrCandidates.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName}
                        {u.employee?.employeeCode ? ` (${u.employee.employeeCode})` : ''}
                        {u.employee?.department?.name ? ` — ${u.employee.department.name}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignHrOpen(false)}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedHrUserId || isAssigningHr}
                  onClick={handleAssignHr}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAssigningHr && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Grant HR Role</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke HR Confirmation Modal */}
      <AnimatePresence>
        {revokeHrTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                Revoke HR Manager Role
              </h2>
              <p className="mt-2 text-sm text-[#A3B3AC]">
                Remove{' '}
                <span className="font-medium text-[#F0F5F2]">{revokeHrTarget.displayName}</span>{' '}
                from HR Manager?
              </p>
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRevokeHrTarget(null)}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isRevokingHr}
                  onClick={handleRevokeHr}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#EF4444] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isRevokingHr && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Revoke</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign / Change Department Head Modal */}
      <AnimatePresence>
        {headModalDept && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                  {headModalDept.name} — Department Head
                </h2>
                <button
                  type="button"
                  onClick={() => setHeadModalDept(null)}
                  aria-label="Close modal"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <label
                  htmlFor="dept-head-select"
                  className="block text-xs font-medium text-[#A3B3AC]"
                >
                  Department Head
                </label>
                <select
                  id="dept-head-select"
                  value={selectedHeadEmployeeId}
                  onChange={(e) => setSelectedHeadEmployeeId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                >
                  <option value="">— Unassigned —</option>
                  {headCandidates.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.name} ({emp.code}) — {emp.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setHeadModalDept(null)}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingHead}
                  onClick={handleSaveDepartmentHead}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                >
                  {isSavingHead && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Assignment</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee Profile Modal on Clicking Department Head or HR Row */}
      <EmployeeProfileModal
        employee={selectedProfileEmployee}
        liveStatus={
          selectedProfileEmployee
            ? deriveLiveStatus(
                selectedProfileEmployee.id,
                selectedProfileEmployee.employmentStatus,
              )
            : 'available'
        }
        designations={designations}
        canEditDesignation={true}
        onClose={() => setSelectedProfileEmployee(null)}
        onDesignationUpdated={handleDesignationUpdated}
        onLiveStatusChange={handleLiveStatusChange}
      />
    </motion.div>
  );
}
