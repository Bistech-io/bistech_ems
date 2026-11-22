'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { ROLE_LABELS, type RoleName } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';
import { EMPLOYEE_DASHBOARD_MOCK } from '../mock-data';
import type { EmployeeDashboardData, EmployeeProfileSummary } from '../types';
import { ActivityFeedCard } from './activity-feed-card';
import { AttendanceChartCard } from './attendance-chart-card';
import { DueSoonCard } from './due-soon-card';
import { EmployeeHeroBanner } from './employee-hero-banner';
import { EmployeeKpiGrid } from './employee-kpi-grid';
import { MyTasksTable } from './my-tasks-table';
import { ScheduleCalendarStrip } from './schedule-calendar-strip';

interface EmployeeDashboardProps {
  initialData?: EmployeeDashboardData;
}

const ROLE_DASHBOARD_CONFIG: Record<
  RoleName,
  {
    title: string;
    subtitle: string;
    badge: string;
    defaultPersona: {
      designation: string;
      department: string;
      teamName: string;
      employeeCode: string;
    };
  }
> = {
  super_admin: {
    title: 'Super Admin Dashboard',
    subtitle: 'System governance, user administration, organization structure, and platform audit logs.',
    badge: 'Super Admin Workspace',
    defaultPersona: {
      designation: 'Super Administrator',
      department: 'Management & Operations',
      teamName: 'Executive Leadership',
      employeeCode: 'BST-0001',
    },
  },
  hr_manager: {
    title: 'HR Manager Dashboard',
    subtitle: 'Workforce attendance, employee directory, people operations, and department oversight.',
    badge: 'HR Manager Workspace',
    defaultPersona: {
      designation: 'HR Manager',
      department: 'Human Resources',
      teamName: 'People Operations',
      employeeCode: 'BST-1001',
    },
  },
  dept_head: {
    title: 'Department Head Dashboard',
    subtitle: 'Department task management, team attendance tracking, review approvals, and project operations.',
    badge: 'Department Head Workspace',
    defaultPersona: {
      designation: 'Lead Engineer & Department Head',
      department: 'Engineering',
      teamName: 'Engineering Leadership',
      employeeCode: 'BST-1002',
    },
  },
  employee: {
    title: 'Employee Dashboard',
    subtitle: 'Daily attendance check-in, personal task assignments, and upcoming deadlines.',
    badge: 'Employee Workspace',
    defaultPersona: {
      designation: 'Senior Frontend Engineer',
      department: 'Engineering',
      teamName: 'Core Platform Squad',
      employeeCode: 'BST-1003',
    },
  },
};

export function EmployeeDashboard({
  initialData = EMPLOYEE_DASHBOARD_MOCK,
}: EmployeeDashboardProps) {
  const { user, activeRole } = useAuth();
  const [data, setData] = useState<EmployeeDashboardData>(initialData);

  const config =
    (activeRole ? ROLE_DASHBOARD_CONFIG[activeRole] : undefined) ??
    ROLE_DASHBOARD_CONFIG.employee;

  const currentEmployee: EmployeeProfileSummary = useMemo(() => {
    const fullName = user?.name || data.employee.fullName;
    const initials =
      fullName
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'BT';

    const employeeCode =
      (user?.employeeId && user.employeeId.startsWith('BST-') ? user.employeeId : null) ||
      (user?.username === 'admin'
        ? 'BST-0001'
        : user?.username === 'hr'
          ? 'BST-1001'
          : user?.username === 'head'
            ? 'BST-1002'
            : user?.username === 'employee'
              ? 'BST-1003'
              : config.defaultPersona.employeeCode);

    return {
      ...data.employee,
      fullName,
      initials,
      employeeCode,
      designation: user?.roleTitle || config.defaultPersona.designation,
      department: config.defaultPersona.department,
      teamName: config.defaultPersona.teamName,
    };
  }, [user, data.employee, config]);

  const handleCheckIn = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const formattedTime = `${hh}:${mm}`;

    setData((prev) => ({
      ...prev,
      todayAttendance: {
        workDate: prev.todayAttendance.workDate,
        status: 'present',
        checkInAt: formattedTime,
        lateMinutes: 0,
        source: 'web',
      },
      monthlyAttendance: {
        ...prev.monthlyAttendance,
        presentDays: prev.monthlyAttendance.presentDays + 1,
        expectedWorkingDays: prev.monthlyAttendance.expectedWorkingDays + 1,
      },
      weeklyAttendanceChart: prev.weeklyAttendanceChart.map((pt, idx, arr) =>
        idx === arr.length - 1
          ? {
              ...pt,
              status: 'present',
              checkInTime: formattedTime,
              barHeight: 90,
            }
          : pt,
      ),
      activityFeed: [
        {
          id: `act-checkin-${now.getTime()}`,
          title: `Checked in at ${formattedTime}`,
          description: 'Web self-service check-in recorded',
          timestampLabel: 'Just now',
          category: 'attendance',
          tone: 'success',
        },
        ...prev.activityFeed,
      ],
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[#4CAF7D] uppercase">
            {config.badge}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            {config.title}
          </h1>
          <p className="mt-1 text-sm text-[#A3B3AC]">
            {config.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-[#4CAF7D]" />
          <span className="text-xs font-medium text-[#A3B3AC]">Active Role:</span>
          <span className="text-xs font-semibold text-[#F0F5F2]">
            {activeRole ? ROLE_LABELS[activeRole] : '—'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          <EmployeeHeroBanner
            employee={currentEmployee}
            todayAttendance={data.todayAttendance}
            onCheckIn={handleCheckIn}
          />

          <EmployeeKpiGrid
            todayAttendance={data.todayAttendance}
            monthlyAttendance={data.monthlyAttendance}
            tasks={data.tasks}
            completionRatePercent={data.completionRatePercent}
            openFeedbackCount={data.openFeedbackCount}
          />

          <AttendanceChartCard
            weeklyPoints={data.weeklyAttendanceChart}
            twoWeekPoints={data.twoWeekAttendanceChart}
            monthlySummary={data.monthlyAttendance}
            graceCutoffLabel={`${currentEmployee.workStartTime} (+${currentEmployee.graceMinutes}m)`}
          />

          <MyTasksTable tasks={data.tasks} />
        </div>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <ScheduleCalendarStrip days={data.scheduleStrip} />
          <DueSoonCard tasks={data.tasks} />
          <ActivityFeedCard items={data.activityFeed} />
        </div>
      </div>
    </motion.div>
  );
}
