'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, Clock, Search, X } from 'lucide-react';
import { fetchDepartments, fetchEmployees } from '@/features/employees/api';
import type { DepartmentOption, EmployeeItem } from '@/features/employees/types';
import { cn } from '@/lib/utils';
import {
  fetchOrgAttendanceRange,
  fetchOrganizationSettings,
  type OrgAttendanceListItem,
} from '../api';
import type { AttendanceDayRecord, OrganizationShiftSettings } from '../types';
import { ATTENDANCE_STATUS_STYLE, AttendanceCalendar } from './attendance-calendar';

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

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getLast7Days(baseDate: Date): string[] {
  const dates: string[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - offset);
    dates.push(formatDateKey(d));
  }
  return dates;
}

function formatShortDayHeader(iso: string): { weekday: string; label: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return {
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
    label: `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
  };
}

function getMonthBounds(year: number, month: number): { from: string; to: string } {
  const m = String(month + 1).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

function formatTimeFromIso(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function EmployeeAttendanceDashboard() {
  const [today, setToday] = useState<Date | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [fiveDayRecords, setFiveDayRecords] = useState<OrgAttendanceListItem[]>([]);
  const [shiftSettings, setShiftSettings] = useState<OrganizationShiftSettings>(DEFAULT_SHIFT);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Slide-over employee monthly calendar state
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);
  const [drawerYear, setDrawerYear] = useState<number>(2026);
  const [drawerMonth, setDrawerMonth] = useState<number>(10);
  const [drawerSelectedDate, setDrawerSelectedDate] = useState<string>('2026-11-23');
  const [drawerMonthRecords, setDrawerMonthRecords] = useState<OrgAttendanceListItem[]>([]);
  const [isLoadingDrawer, setIsLoadingDrawer] = useState(false);

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
    const timer = setTimeout(() => {
      const now = new Date();
      setToday(now);
      setDrawerYear(now.getFullYear());
      setDrawerMonth(now.getMonth());
      setDrawerSelectedDate(formatDateKey(now));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const todayKey = useMemo(() => (today ? formatDateKey(today) : '2026-11-23'), [today]);
  const last7Days = useMemo(() => getLast7Days(today ?? new Date(2026, 10, 23)), [today]);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    const days = getLast7Days(today);
    const from = days[0];
    const to = days[days.length - 1];

    Promise.all([
      fetchEmployees().catch(() => [] as EmployeeItem[]),
      fetchDepartments().catch(() => [] as DepartmentOption[]),
      fetchOrgAttendanceRange({ from, to, limit: 100 }).catch(
        () => [] as OrgAttendanceListItem[],
      ),
    ])
      .then(([empList, deptList, attList]) => {
        if (cancelled) return;
        setEmployees(empList);
        setDepartments(deptList);
        setFiveDayRecords(attList);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [today]);

  // Fetch selected employee's monthly attendance records whenever drawer employee or month changes
  useEffect(() => {
    if (!selectedEmployee) return;
    let cancelled = false;
    const startTimer = setTimeout(() => {
      if (!cancelled) setIsLoadingDrawer(true);
    }, 0);

    const bounds = getMonthBounds(drawerYear, drawerMonth);
    fetchOrgAttendanceRange({
      employeeId: selectedEmployee.id,
      from: bounds.from,
      to: bounds.to,
      limit: 100,
    })
      .then((list) => {
        if (!cancelled) {
          setDrawerMonthRecords(list);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDrawerMonthRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDrawer(false);
      });

    return () => {
      clearTimeout(startTimer);
      cancelled = true;
    };
  }, [selectedEmployee, drawerYear, drawerMonth]);

  useEffect(() => {
    if (!selectedEmployee) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEmployee(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedEmployee]);

  // Lookup map: `${employeeId}:${workDate}` -> OrgAttendanceListItem
  const fiveDayLookup = useMemo(() => {
    const map = new Map<string, OrgAttendanceListItem>();
    for (const rec of fiveDayRecords) {
      const empId = rec.employee?.id ?? rec.employeeId;
      if (empId) {
        map.set(`${empId}:${rec.workDate}`, rec);
      }
    }
    return map;
  }, [fiveDayRecords]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      if (departmentFilter && emp.department.id !== departmentFilter) return false;
      if (!q) return true;
      return (
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.department.name.toLowerCase().includes(q)
      );
    });
  }, [employees, departmentFilter, searchQuery]);

  const drawerCalendarMap = useMemo(() => {
    const map: Record<string, AttendanceDayRecord> = {};
    const daysInMonth = new Date(drawerYear, drawerMonth + 1, 0).getDate();

    const byDate = new Map<string, OrgAttendanceListItem>();
    for (const rec of drawerMonthRecords) {
      byDate.set(rec.workDate, rec);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(drawerYear, drawerMonth, day);
      const key = formatDateKey(d);
      const weekday = d.getDay();
      const rec = byDate.get(key);

      if (rec) {
        map[key] = {
          date: key,
          status: rec.status,
          checkInIso: rec.checkInAt,
          checkInTime: formatTimeFromIso(rec.checkInAt),
          lateMinutes: rec.lateMinutes,
          note: rec.note ?? undefined,
          isDerived: rec.isDerived,
        };
      } else if (weekday === 5 || weekday === 6) {
        map[key] = { date: key, status: 'weekend' };
      } else if (key > todayKey) {
        map[key] = { date: key, status: 'future' };
      } else if (key === todayKey) {
        map[key] = { date: key, status: 'pending' };
      } else {
        map[key] = { date: key, status: 'absent' };
      }
    }
    return map;
  }, [drawerYear, drawerMonth, drawerMonthRecords, todayKey]);

  const drawerSummary = useMemo(() => {
    const values = Object.values(drawerCalendarMap);
    const present = values.filter((r) => r.status === 'present').length;
    const late = values.filter((r) => r.status === 'late').length;
    const absent = values.filter((r) => r.status === 'absent').length;
    const attended = present + late;
    return { present, late, absent, attended };
  }, [drawerCalendarMap]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            Employee Attendance
          </h1>
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

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
            />
          </div>

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
        </div>
      </header>

      {/* Last 5 Days Attendance Matrix Table */}
      <section className="overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#6E8078]">No employees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#23302B] bg-[#0B0F0E]/40 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  {last7Days.map((dayIso) => {
                    const h = formatShortDayHeader(dayIso);
                    return (
                      <th key={dayIso} className="px-3 py-4 text-center">
                        <div>{h.weekday}</div>
                        <div className="font-mono text-[10px] text-[#A3B3AC]">{h.label}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23302B]/60">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="cursor-pointer transition-colors hover:bg-[#1A2420]/75"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-medium text-[#4CAF7D]">
                      {emp.employeeCode}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#23302B] bg-[#1A2420] font-heading text-xs font-bold text-[#4CAF7D]">
                          {getInitials(emp.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[#F0F5F2]">
                            {emp.fullName}
                          </div>
                          <div className="truncate text-xs text-[#6E8078]">
                            {emp.designation.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#A3B3AC]">{emp.department.name}</td>
                    {last7Days.map((dayIso) => {
                      const rec = fiveDayLookup.get(`${emp.id}:${dayIso}`);
                      const [y, m, d] = dayIso.split('-').map(Number);
                      const weekday = new Date(y, (m || 1) - 1, d || 1).getDay();
                      const status = rec
                        ? rec.status
                        : weekday === 5 || weekday === 6
                          ? 'weekend'
                          : dayIso === todayKey
                            ? 'pending'
                            : 'absent';
                      const style = ATTENDANCE_STATUS_STYLE[status];

                      return (
                        <td key={dayIso} className="px-3 py-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                              style.badge,
                            )}
                          >
                            {style.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Right-Side Slide Drawer with Employee Monthly Calendar */}
      <AnimatePresence>
        {selectedEmployee && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedEmployee.fullName} monthly attendance`}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedEmployee(null)}
              className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.26, ease: EASE }}
              className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#23302B] pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#2E8B57]/50 bg-[#1A2420] font-heading text-base font-bold text-[#4CAF7D]">
                    {getInitials(selectedEmployee.fullName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                        {selectedEmployee.fullName}
                      </h2>
                      <span className="rounded-lg border border-[#23302B] bg-[#0B0F0E] px-2 py-0.5 font-mono text-xs text-[#4CAF7D]">
                        {selectedEmployee.employeeCode}
                      </span>
                    </div>
                    <p className="text-xs text-[#A3B3AC]">
                      {selectedEmployee.designation.title} · {selectedEmployee.department.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  aria-label="Close attendance drawer"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Monthly Totals */}
              <div className="mt-5 grid grid-cols-4 gap-2.5 text-center">
                <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-3">
                  <span className="text-[11px] text-[#A3B3AC]">Attended</span>
                  <p className="mt-1 font-heading text-xl font-bold text-[#4CAF7D]">
                    {drawerSummary.attended}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-3">
                  <span className="text-[11px] text-[#A3B3AC]">Present</span>
                  <p className="mt-1 font-heading text-xl font-bold text-[#F0F5F2]">
                    {drawerSummary.present}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-3">
                  <span className="text-[11px] text-[#A3B3AC]">Late</span>
                  <p className="mt-1 font-heading text-xl font-bold text-[#F59E0B]">
                    {drawerSummary.late}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-3">
                  <span className="text-[11px] text-[#A3B3AC]">Absent</span>
                  <p className="mt-1 font-heading text-xl font-bold text-[#EF4444]">
                    {drawerSummary.absent}
                  </p>
                </div>
              </div>

              {/* Monthly Calendar */}
              <div className="mt-5">
                {isLoadingDrawer ? (
                  <div className="flex h-72 items-center justify-center rounded-3xl border border-[#23302B] bg-[#0B0F0E]/50">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
                  </div>
                ) : (
                  <AttendanceCalendar
                    year={drawerYear}
                    month={drawerMonth}
                    todayKey={todayKey}
                    selectedDateKey={drawerSelectedDate}
                    recordsByDate={drawerCalendarMap}
                    onSelectDate={setDrawerSelectedDate}
                    onMonthChange={(y, m) => {
                      setDrawerYear(y);
                      setDrawerMonth(m);
                    }}
                  />
                )}
              </div>

              {/* Selected Day Detail */}
              {drawerCalendarMap[drawerSelectedDate] && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 px-4 py-3 text-xs">
                  <div>
                    <span className="font-mono text-[#A3B3AC]">{drawerSelectedDate}</span>
                    <p className="mt-0.5 text-[#F0F5F2]">
                      {drawerCalendarMap[drawerSelectedDate].checkInTime
                        ? `Checked in at ${drawerCalendarMap[drawerSelectedDate].checkInTime}`
                        : ATTENDANCE_STATUS_STYLE[drawerCalendarMap[drawerSelectedDate].status].label}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                      ATTENDANCE_STATUS_STYLE[drawerCalendarMap[drawerSelectedDate].status].badge,
                    )}
                  >
                    {ATTENDANCE_STATUS_STYLE[drawerCalendarMap[drawerSelectedDate].status].label}
                  </span>
                </div>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
