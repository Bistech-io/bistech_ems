'use client';

import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';
import { EMPLOYEE_DASHBOARD_MOCK } from '../mock-data';
import type { EmployeeDashboardData } from '../types';
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

export function EmployeeDashboard({
  initialData = EMPLOYEE_DASHBOARD_MOCK,
}: EmployeeDashboardProps) {
  const { activeRole } = useAuth();
  const [data, setData] = useState<EmployeeDashboardData>(initialData);

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
            BisTech EMS Workspace
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            Employee Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#A3B3AC]">
            Daily attendance check-in, personal task assignments, and upcoming deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-[#4CAF7D]" />
          <span className="text-xs font-medium text-[#A3B3AC]">Active Role:</span>
          <span className="text-xs font-semibold text-[#F0F5F2]">
            {ROLE_LABELS[activeRole]}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          <EmployeeHeroBanner
            employee={data.employee}
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
            graceCutoffLabel={`${data.employee.workStartTime} (+${data.employee.graceMinutes}m)`}
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
