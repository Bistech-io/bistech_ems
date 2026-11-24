'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  Clock,
  Crown,
  Layers,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { ROLE_LABELS, type RoleName } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';
import { fetchOrganizationSettings } from '@/features/attendance/api';
import type { OrganizationShiftSettings } from '@/features/attendance/types';
import { fetchDashboardSummary, type SummaryDashboardData } from '../api';
import type { EmployeeTaskItem } from '../types';
import { MyTasksTable } from './my-tasks-table';

const EASE = [0.22, 1, 0.36, 1] as const;

const DEFAULT_SHIFT: OrganizationShiftSettings = {
  timezone: 'Asia/Dhaka',
  workStart: '09:30',
  workEnd: '18:00',
  graceMinutes: 15,
};

function format24hTo12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

const ROLE_DASHBOARD_META: Record<
  RoleName,
  {
    title: string;
    badge: string;
  }
> = {
  super_admin: {
    title: 'Super Admin Dashboard',
    badge: 'Super Admin Workspace',
  },
  hr_manager: {
    title: 'HR Manager Dashboard',
    badge: 'HR Manager Workspace',
  },
  dept_head: {
    title: 'Department Head Dashboard',
    badge: 'Department Head Workspace',
  },
  employee: {
    title: 'Dashboard',
    badge: 'Employee Workspace',
  },
};

export function EmployeeDashboard() {
  const { user, isAuthenticated, activeRole } = useAuth();
  const [summary, setSummary] = useState<SummaryDashboardData | null>(null);
  const [shiftSettings, setShiftSettings] = useState<OrganizationShiftSettings>(DEFAULT_SHIFT);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const role: RoleName = activeRole ?? 'employee';
  const meta = ROLE_DASHBOARD_META[role] ?? ROLE_DASHBOARD_META.employee;

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationSettings()
      .then((settings) => {
        if (!cancelled) setShiftSettings(settings);
      })
      .catch(() => {});

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
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const startTimer = setTimeout(() => {
      if (!cancelled) setIsLoading(true);
    }, 0);

    fetchDashboardSummary()
      .then((res) => {
        if (!cancelled) {
          setSummary(res);
          if (res.company?.workStart) {
            setShiftSettings({
              workStart: res.company.workStart,
              workEnd: res.company.workEnd,
              graceMinutes: res.company.graceMinutes,
              timezone: res.company.timezone,
            });
          } else if (res.hr?.workStart) {
            setShiftSettings({
              workStart: res.hr.workStart,
              workEnd: res.hr.workEnd,
              graceMinutes: res.hr.graceMinutes,
              timezone: res.hr.timezone,
            });
          } else if (res.me?.employee?.workStart) {
            setShiftSettings({
              workStart: res.me.employee.workStart,
              workEnd: res.me.employee.workEnd,
              graceMinutes: res.me.employee.graceMinutes,
              timezone: res.me.employee.timezone,
            });
          }
        }
      })
      .catch(() => {
        // Keep dashboard resilient if backend summary is unavailable
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      clearTimeout(startTimer);
      cancelled = true;
    };
  }, [isAuthenticated]);

  const persona = useMemo(() => {
    const emp = summary?.me?.employee;
    const fullName = emp?.fullName || user?.name || 'Team Member';
    const employeeCode =
      emp?.employeeCode ||
      (user?.employeeId && user.employeeId.startsWith('BST-') ? user.employeeId : null) ||
      '—';
    const department = emp?.department || '—';
    const teamName = emp?.teams?.[0] || '—';
    const designation = emp?.designation || user?.roleTitle || ROLE_LABELS[role];

    return {
      fullName,
      employeeCode,
      department,
      teamName,
      designation,
    };
  }, [summary, user, role]);

  const myTaskRows: EmployeeTaskItem[] = useMemo(() => {
    const items = summary?.me?.tasks.items ?? [];
    return items.map((t) => ({
      id: t.taskId,
      title: t.title,
      projectOrTeam: t.teamName || t.departmentName || 'Workspace',
      assignmentType: t.assignmentType,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ?? '',
      dueLabel: t.dueDate ?? 'No deadline',
      isOverdue: t.isOverdue,
      isDueSoon: t.isDueSoon,
    }));
  }, [summary]);

  const company = summary?.company;
  const hr = summary?.hr ?? summary?.company;
  const me = summary?.me;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Clean Role Header with Eye-Catchy Dynamic Designation */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[#4CAF7D] uppercase">
            {meta.badge}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            {meta.title}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <span className="font-heading text-lg font-semibold tracking-[-0.01em] text-[#F0F5F2] md:text-xl">
              {persona.fullName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2E8B57]/50 bg-gradient-to-r from-[#1F5C3A]/60 to-[#2E8B57]/25 px-3 py-1 text-xs font-semibold tracking-wide text-[#4CAF7D] shadow-[0_4px_14px_-4px_rgba(46,139,87,0.45)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
              {persona.designation}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 py-2 text-xs">
            <Clock className="h-4 w-4 text-[#4CAF7D]" />
            <span className="text-[#A3B3AC]">Shift:</span>
            <strong className="text-[#F0F5F2]">
              {format24hTo12h(shiftSettings.workStart)} – {format24hTo12h(shiftSettings.workEnd)} ·{' '}
              {shiftSettings.graceMinutes}m grace
            </strong>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-2.5">
            <ShieldCheck className="h-4 w-4 text-[#4CAF7D]" />
            <span className="text-xs font-medium text-[#A3B3AC]">Role:</span>
            <span className="text-xs font-semibold text-[#F0F5F2]">{ROLE_LABELS[role]}</span>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-3xl border border-[#23302B] bg-[#131A17]">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
        </div>
      ) : (
        <>
          {/* SUPER ADMIN VIEW */}
          {role === 'super_admin' && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Active Workforce</span>
                    <Users className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {company?.workforce.activeEmployees ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    +{company?.workforce.joinersThisMonth ?? 0} joined this month
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Today Attendance</span>
                    <CalendarCheck className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {company?.todayAttendance.attendanceRatePercent ?? 0}%
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {company?.todayAttendance.presentCount ?? 0} present ·{' '}
                    {company?.todayAttendance.lateCount ?? 0} late
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Departments Covered</span>
                    <Building2 className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {company?.governance.departmentsWithHead ?? 0} /{' '}
                    {company?.governance.totalDepartments ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {company?.governance.activeTeamsCount ?? 0} active teams
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Open Org Tasks</span>
                    <Layers className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {company?.tasks.openCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {company?.tasks.overdueCount ?? 0} overdue ·{' '}
                    {company?.governance.pendingReviewsCount ?? 0} pending review
                  </p>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-12">
                {/* Department Breakdown */}
                <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
                      Department Headcount
                    </h2>
                    <Link
                      href="/admin/leadership"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#4CAF7D] hover:underline"
                    >
                      <span>Manage Leadership</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-4 divide-y divide-[#23302B]/70">
                    {(company?.workforce.departmentSummary ?? []).length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#6E8078]">
                        No departments recorded yet.
                      </p>
                    ) : (
                      company!.workforce.departmentSummary.map((dept) => (
                        <div
                          key={dept.departmentId}
                          className="flex items-center justify-between py-3 text-sm"
                        >
                          <span className="font-medium text-[#F0F5F2]">
                            {dept.departmentName}
                          </span>
                          <span className="rounded-full border border-[#23302B] bg-[#0B0F0E] px-3 py-0.5 text-xs font-semibold text-[#4CAF7D]">
                            {dept.activeCount} active
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Recent Audit Events & Quick Actions */}
                <section className="flex flex-col gap-5 rounded-3xl border border-[#23302B] bg-[#131A17] p-6 lg:col-span-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
                      Recent Governance Activity
                    </h2>
                    <Crown className="h-4 w-4 text-[#4CAF7D]" />
                  </div>

                  <div className="space-y-2.5">
                    {(company?.recentAuditLogs ?? []).length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#6E8078]">
                        No recent audit events.
                      </p>
                    ) : (
                      company!.recentAuditLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/70 px-3.5 py-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-medium text-[#4CAF7D]">
                              {log.action}
                            </span>
                            <span className="text-[11px] text-[#6E8078]">
                              {log.actorName ?? 'System'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2.5 border-t border-[#23302B] pt-4">
                    <Link
                      href="/tasks"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 py-2 text-xs font-medium text-[#F0F5F2] transition-colors hover:border-[#2E8B57] hover:text-[#4CAF7D]"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Full Task Board</span>
                    </Link>
                    <Link
                      href="/employees"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 py-2 text-xs font-medium text-[#F0F5F2] transition-colors hover:border-[#2E8B57] hover:text-[#4CAF7D]"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Directory</span>
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* HR MANAGER VIEW */}
          {role === 'hr_manager' && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Active Employees</span>
                    <UserCheck className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {hr?.workforce.activeEmployees ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {hr?.workforce.joinersThisMonth ?? 0} new this month
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Checked In Today</span>
                    <CalendarCheck className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {(hr?.todayAttendance.presentCount ?? 0) +
                      (hr?.todayAttendance.lateCount ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {hr?.todayAttendance.notCheckedInCount ?? 0} not arrived yet ·{' '}
                    {hr?.todayAttendance.absentCount ?? 0} absent
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Attendance Rate</span>
                    <TrendingUp className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {hr?.monthlyAttendance.attendanceRatePercent ?? 0}%
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">Monthly organization average</p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Ongoing Tasks</span>
                    <Clock className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {hr?.tasks.openCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {hr?.tasks.completionRatePercent ?? 0}% completion rate
                  </p>
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-12">
                <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6 lg:col-span-7">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
                      Recent Joiners
                    </h2>
                    <Link
                      href="/employees"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#4CAF7D] hover:underline"
                    >
                      <span>Manage Employees</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="mt-4 divide-y divide-[#23302B]/70">
                    {(hr?.recentJoiners ?? []).length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#6E8078]">
                        No recent onboarding records.
                      </p>
                    ) : (
                      hr!.recentJoiners.slice(0, 6).map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-[#F0F5F2]">{emp.fullName}</p>
                            <p className="text-xs text-[#6E8078]">
                              {emp.designationTitle} · {emp.departmentName}
                            </p>
                          </div>
                          <span className="font-mono text-xs text-[#4CAF7D]">
                            {emp.employeeCode}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6 lg:col-span-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
                      Department Distribution
                    </h2>
                    <Building2 className="h-4 w-4 text-[#4CAF7D]" />
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {(hr?.workforce.departmentSummary ?? []).length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#6E8078]">
                        No departments available.
                      </p>
                    ) : (
                      hr!.workforce.departmentSummary.map((dept) => (
                        <div
                          key={dept.departmentId}
                          className="flex items-center justify-between rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/70 px-3.5 py-2.5 text-xs"
                        >
                          <span className="font-medium text-[#F0F5F2]">
                            {dept.departmentName}
                          </span>
                          <span className="font-semibold text-[#4CAF7D]">
                            {dept.activeCount} staff
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* DEPARTMENT HEAD VIEW */}
          {role === 'dept_head' && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Open Tasks</span>
                    <CheckSquare className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {me?.tasks.openCount ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">In Review</span>
                    <Clock className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {me?.tasks.countsByStatus.inReview ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Overdue</span>
                    <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {me?.tasks.overdueCount ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Monthly Attendance</span>
                    <CalendarCheck className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {me?.monthlyAttendance.attendanceRatePercent ?? 100}%
                  </p>
                </div>
              </section>

              <MyTasksTable tasks={myTaskRows} />
            </div>
          )}

          {/* EMPLOYEE VIEW */}
          {role === 'employee' && (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Attendance Rate</span>
                    <CalendarCheck className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {me?.monthlyAttendance.attendanceRatePercent ?? 100}%
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {me?.monthlyAttendance.presentDays ?? 0} present ·{' '}
                    {me?.monthlyAttendance.lateDays ?? 0} late
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Active Tasks</span>
                    <CheckSquare className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {me?.tasks.openCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {me?.tasks.dueSoonCount ?? 0} due soon
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Completed Tasks</span>
                    <CheckCircle2 className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
                    {me?.tasks.countsByStatus.done ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-[#6E8078]">
                    {me?.tasks.completionRatePercent ?? 0}% completion
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#A3B3AC]">Today Status</span>
                    <Clock className="h-4 w-4 text-[#4CAF7D]" />
                  </div>
                  <p className="mt-3 font-heading text-lg font-bold capitalize text-[#F0F5F2]">
                    {(me?.todayAttendance.status ?? 'not_checked_in').replace('_', ' ')}
                  </p>
                  <Link
                    href="/attendance"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#4CAF7D] hover:underline"
                  >
                    <span>Open Attendance</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </section>

              <MyTasksTable tasks={myTaskRows} />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
