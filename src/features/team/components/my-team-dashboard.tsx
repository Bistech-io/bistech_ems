'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Users } from 'lucide-react';
import { fetchOrganizationSettings } from '@/features/attendance/api';
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
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

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

export function MyTeamDashboard() {
  const { session } = useAuth();
  const currentEmployeeId = session?.employeeId ?? null;

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [shiftSettings, setShiftSettings] = useState<OrganizationShiftSettings>(DEFAULT_SHIFT);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, OrgAttendanceItem>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, EmployeeLiveStatus>>({});
  const [now, setNow] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<EmployeeItem | null>(null);

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

    Promise.all([
      fetchEmployees().catch(() => [] as EmployeeItem[]),
      fetchDesignations().catch(() => [] as DesignationOption[]),
      fetchOrganizationSettings().catch(() => null),
      fetchTodayOrgAttendance(todayIso).catch(() => [] as OrgAttendanceItem[]),
    ])
      .then(([empList, desigList, orgSettings, todayAtt]) => {
        if (cancelled) return;
        setEmployees(empList);
        setDesignations(desigList);
        if (orgSettings) setShiftSettings(orgSettings);

        const nextAtt: Record<string, OrgAttendanceItem> = {};
        for (const item of todayAtt) {
          if (item.employeeId) nextAtt[item.employeeId] = item;
        }
        setAttendanceMap(nextAtt);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter strictly to the logged-in Dept Head's department/team members
  const myDepartmentId = useMemo(() => {
    if (!currentEmployeeId) return null;
    const me = employees.find((e) => e.id === currentEmployeeId);
    return me?.department.id ?? null;
  }, [employees, currentEmployeeId]);

  const teamMembers = useMemo(() => {
    const scoped = myDepartmentId
      ? employees.filter((e) => e.department.id === myDepartmentId)
      : employees;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.workEmail.toLowerCase().includes(q) ||
        emp.designation.title.toLowerCase().includes(q),
    );
  }, [employees, myDepartmentId, searchQuery]);

  const deriveLiveStatus = useCallback(
    (emp: EmployeeItem): EmployeeLiveStatus => {
      const override = statusOverrides[emp.id];
      if (override) return override;
      if (emp.employmentStatus !== 'active') return 'absent';

      const att = attendanceMap[emp.id];
      const hasCheckedInToday = Boolean(
        att && (att.status === 'present' || att.status === 'late'),
      );

      const currentMinutes = now ? now.getHours() * 60 + now.getMinutes() : 10 * 60;
      const endCutoff = parseHhMmToMinutes(shiftSettings.workEnd, 18 * 60);

      if (currentMinutes >= endCutoff) {
        return hasCheckedInToday ? 'after_hours' : 'absent';
      }
      return hasCheckedInToday ? 'available' : 'arriving';
    },
    [statusOverrides, attendanceMap, now, shiftSettings],
  );

  const availableCount = useMemo(
    () => teamMembers.filter((m) => deriveLiveStatus(m) === 'available').length,
    [teamMembers, deriveLiveStatus],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
            <Users className="h-5 w-5" />
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            My Team
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#A3B3AC]">
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Members: <strong className="text-[#F0F5F2]">{teamMembers.length}</strong>
            </span>
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Available: <strong className="text-[#4CAF7D]">{availableCount}</strong>
            </span>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team member..."
            className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
          />
        </div>
      </header>

      <section className="overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#6E8078]">No team members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-[#23302B] bg-[#0B0F0E]/40 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                  <th className="w-32 px-6 py-4">Code</th>
                  <th className="w-[34%] px-6 py-4">Team Member</th>
                  <th className="w-[22%] px-6 py-4">Department</th>
                  <th className="w-[22%] px-6 py-4">Designation</th>
                  <th className="w-40 px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23302B]/60">
                {teamMembers.map((emp) => {
                  const status = deriveLiveStatus(emp);
                  const style = LIVE_STATUS_STYLES[status];

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedMember(emp)}
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

      <EmployeeProfileModal
        employee={selectedMember}
        liveStatus={selectedMember ? deriveLiveStatus(selectedMember) : 'available'}
        designations={designations}
        canEditDesignation={false}
        onClose={() => setSelectedMember(null)}
        onDesignationUpdated={() => {}}
        onLiveStatusChange={(id, status) => {
          setStatusOverrides((prev) => {
            const next = { ...prev };
            if (status === 'auto') delete next[id];
            else next[id] = status;
            return next;
          });
        }}
      />
    </motion.div>
  );
}
