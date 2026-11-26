'use client';

import { CheckCircle2, Clock, Fingerprint } from 'lucide-react';
import type { EmployeeProfileSummary, TodayAttendance } from '../types';

interface EmployeeHeroBannerProps {
  employee: EmployeeProfileSummary;
  todayAttendance: TodayAttendance;
  onCheckIn: () => void;
}

export function EmployeeHeroBanner({
  employee,
  todayAttendance,
  onCheckIn,
}: EmployeeHeroBannerProps) {
  const isCheckedIn = todayAttendance.status === 'present' || todayAttendance.status === 'late';

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#23302B] bg-gradient-to-br from-[#131A17] via-[#15241D] to-[#1A2E24] p-6 md:p-8">
      <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-[#2E8B57]/20 blur-3xl" />
      <div className="pointer-events-none absolute right-24 -bottom-20 h-52 w-52 rounded-full bg-[#4CAF7D]/10 blur-2xl" />

      <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-[#4CAF7D] uppercase">
              {employee.employeeCode}
            </span>
            <span className="text-xs text-[#6E8078]">•</span>
            <span className="text-xs font-medium text-[#A3B3AC]">
              {employee.department} — {employee.teamName}
            </span>
            <span className="text-xs text-[#6E8078]">•</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4CAF7D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
              {employee.timezone}
            </span>
          </div>

          <h2 className="font-heading text-2xl leading-tight font-bold text-[#F0F5F2] md:text-3xl">
            Welcome back, <span className="text-[#4CAF7D]">{employee.fullName}</span>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#A3B3AC]">
            {employee.designation}. Shift window {employee.workStartTime} – {employee.workEndTime}.
            Track your daily attendance, active assignments, and upcoming deadlines.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
          <div className="flex items-center gap-2.5 rounded-full border border-[#23302B] bg-[#0B0F0E]/70 px-3.5 py-2">
            <Clock className="h-4 w-4 text-[#4CAF7D]" />
            <span className="text-xs font-medium text-[#A3B3AC]">
              {isCheckedIn ? (
                <>
                  Checked in at{' '}
                  <strong className="font-mono text-[#F0F5F2]">
                    {todayAttendance.checkInAt}
                  </strong>
                  {todayAttendance.status === 'late' && todayAttendance.lateMinutes > 0
                    ? ` (${todayAttendance.lateMinutes}m late)`
                    : ' (On-time)'}
                </>
              ) : (
                'Not checked in yet today'
              )}
            </span>
          </div>

          {isCheckedIn ? (
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-[#4CAF7D]/40 bg-[#1F5C3A]/50 px-5 py-2.5 text-xs font-semibold text-[#4CAF7D]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Attendance Recorded</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCheckIn}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#2E8B57] px-5 py-2.5 text-xs font-semibold text-[#F0F5F2] transition-colors duration-150 hover:bg-[#4CAF7D] hover:text-[#0B0F0E] focus:ring-2 focus:ring-[#4CAF7D] focus:ring-offset-2 focus:ring-offset-[#131A17] focus:outline-none active:bg-[#1F5C3A]"
            >
              <Fingerprint className="h-4 w-4" />
              <span>Check In Now</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
