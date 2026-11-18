'use client';

import { BarChart3 } from 'lucide-react';
import { useState } from 'react';
import type { AttendanceChartPoint, MonthlyAttendanceSummary } from '../types';

interface AttendanceChartCardProps {
  weeklyPoints: AttendanceChartPoint[];
  twoWeekPoints: AttendanceChartPoint[];
  monthlySummary: MonthlyAttendanceSummary;
  graceCutoffLabel: string;
}

export function AttendanceChartCard({
  weeklyPoints,
  twoWeekPoints,
  monthlySummary,
  graceCutoffLabel,
}: AttendanceChartCardProps) {
  const [range, setRange] = useState<'7d' | '14d'>('7d');
  const points = range === '7d' ? weeklyPoints : twoWeekPoints;

  return (
    <section className="flex flex-col gap-5 rounded-[2rem] border border-[#23302B] bg-[#131A17] p-6 md:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/50 text-[#4CAF7D]">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
              Attendance &amp; Check-In Punctuality
            </h2>
          </div>
          <p className="mt-1 text-xs text-[#A3B3AC]">
            Daily check-in consistency against {graceCutoffLabel} late cutoff
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border border-[#23302B] bg-[#0B0F0E] p-1">
          <button
            type="button"
            onClick={() => setRange('7d')}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              range === '7d'
                ? 'bg-[#2E8B57] text-[#F0F5F2]'
                : 'text-[#A3B3AC] hover:text-[#F0F5F2]'
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            onClick={() => setRange('14d')}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              range === '14d'
                ? 'bg-[#2E8B57] text-[#F0F5F2]'
                : 'text-[#A3B3AC] hover:text-[#F0F5F2]'
            }`}
          >
            14 Days
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-[#A3B3AC]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D]" />
          <span>On-time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#23302B]" />
          <span>Weekend / Off</span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/70 p-4 sm:p-5">
        <div className="relative flex h-44 items-end gap-2 pt-6 sm:gap-3">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1">
            <div className="h-px w-full bg-[#23302B]/70" />
            <div className="h-px w-full bg-[#23302B]/70" />
            <div className="h-px w-full bg-[#23302B]/70" />
            <div className="h-px w-full bg-[#23302B]/70" />
          </div>

          {points.map((point) => {
            const barColor =
              point.status === 'present'
                ? 'bg-gradient-to-t from-[#1F5C3A] via-[#2E8B57] to-[#4CAF7D]'
                : point.status === 'late'
                  ? 'bg-gradient-to-t from-[#B45309] to-[#F59E0B]'
                  : point.status === 'absent'
                    ? 'bg-gradient-to-t from-[#991B1B] to-[#EF4444]'
                    : 'border border-[#23302B] bg-[#1A2420]';

            return (
              <div
                key={point.dateLabel}
                className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end"
              >
                <div className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-[#23302B] bg-[#1A2420] px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-[#F0F5F2] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  <span>{point.dateLabel}: </span>
                  <span className="font-mono text-[#4CAF7D]">
                    {point.status === 'weekend' ? 'Weekend' : (point.checkInTime ?? 'Absent')}
                  </span>
                </div>

                <div className="flex h-full w-full max-w-[34px] items-end justify-center">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 group-hover:brightness-110 ${barColor}`}
                    style={{ height: `${point.barHeight}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-[#23302B] pt-2 sm:gap-3">
          {points.map((point) => (
            <div key={point.dateLabel} className="min-w-0 flex-1 text-center">
              <div className="truncate text-[11px] font-semibold text-[#A3B3AC]">
                {point.dayShort}
              </div>
              <div className="truncate font-mono text-[10px] text-[#6E8078]">
                {point.dateLabel.replace('Nov ', '11/')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="rounded-2xl border border-[#23302B] bg-[#1A2420]/60 px-4 py-3">
          <div className="text-[11px] font-medium text-[#A3B3AC]">Present Days</div>
          <div className="mt-0.5 font-heading text-lg font-bold text-[#4CAF7D]">
            {monthlySummary.presentDays}
            <span className="ml-1 text-xs font-normal text-[#6E8078]">
              / {monthlySummary.expectedWorkingDays}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#23302B] bg-[#1A2420]/60 px-4 py-3">
          <div className="text-[11px] font-medium text-[#A3B3AC]">Late Check-Ins</div>
          <div className="mt-0.5 font-heading text-lg font-bold text-[#F59E0B]">
            {monthlySummary.lateDays}
          </div>
        </div>
        <div className="rounded-2xl border border-[#23302B] bg-[#1A2420]/60 px-4 py-3">
          <div className="text-[11px] font-medium text-[#A3B3AC]">Absent Days</div>
          <div className="mt-0.5 font-heading text-lg font-bold text-[#F0F5F2]">
            {monthlySummary.absentDays}
          </div>
        </div>
      </div>
    </section>
  );
}
