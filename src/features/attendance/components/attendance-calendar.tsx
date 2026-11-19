'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceDayRecord, AttendanceDayStatus } from '../types';

interface AttendanceCalendarProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  todayKey: string;
  selectedDateKey: string;
  recordsByDate: Record<string, AttendanceDayRecord>;
  onSelectDate: (dateKey: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const ATTENDANCE_STATUS_STYLE: Record<
  AttendanceDayStatus,
  { dot: string; badge: string; label: string }
> = {
  present: {
    dot: 'bg-[#4CAF7D]',
    badge: 'border-[#2E8B57]/40 bg-[#1F5C3A]/40 text-[#4CAF7D]',
    label: 'Present',
  },
  late: {
    dot: 'bg-[#F59E0B]',
    badge: 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]',
    label: 'Late',
  },
  absent: {
    dot: 'bg-[#EF4444]',
    badge: 'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]',
    label: 'Absent',
  },
  holiday: {
    dot: 'bg-[#38BDF8]',
    badge: 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8]',
    label: 'Holiday',
  },
  weekend: {
    dot: 'bg-[#6E8078]/40',
    badge: 'border-[#23302B] bg-[#1A2420] text-[#A3B3AC]',
    label: 'Weekend',
  },
  pending: {
    dot: 'bg-[#A3B3AC]/50',
    badge: 'border-[#23302B] bg-[#1A2420] text-[#A3B3AC]',
    label: 'Not Checked In',
  },
  future: {
    dot: 'bg-transparent',
    badge: 'border-[#23302B] bg-[#1A2420] text-[#6E8078]',
    label: 'Upcoming',
  },
};

function toDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function AttendanceCalendar({
  year,
  month,
  todayKey,
  selectedDateKey,
  recordsByDate,
  onSelectDate,
  onMonthChange,
}: AttendanceCalendarProps) {
  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month, 1));
  }, [year, month]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateKey: string | null }> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ day: null, dateKey: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, dateKey: toDateKey(year, month, day) });
    }
    return cells;
  }, [year, month]);

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  return (
    <section className="flex flex-col rounded-3xl border border-[#23302B] bg-[#131A17] p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
              {monthLabel}
            </h2>
            <p className="text-[11px] text-[#6E8078]">Monthly attendance overview</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#23302B] bg-[#0B0F0E] text-[#A3B3AC] transition-colors hover:border-[#2E8B57]/60 hover:text-[#F0F5F2]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#23302B] bg-[#0B0F0E] text-[#A3B3AC] transition-colors hover:border-[#2E8B57]/60 hover:text-[#F0F5F2]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {calendarCells.map((cell, idx) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`empty-${idx}`} className="h-11" />;
          }

          const record = recordsByDate[cell.dateKey];
          const status: AttendanceDayStatus = record?.status ?? 'future';
          const isToday = cell.dateKey === todayKey;
          const isSelected = cell.dateKey === selectedDateKey;
          const style = ATTENDANCE_STATUS_STYLE[status];

          return (
            <motion.button
              key={cell.dateKey}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectDate(cell.dateKey!)}
              aria-label={`${cell.dateKey} — ${style.label}`}
              className={cn(
                'relative flex h-11 flex-col items-center justify-center rounded-xl border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]',
                isSelected
                  ? 'border-[#4CAF7D] bg-[#1F5C3A]/45 text-[#F0F5F2]'
                  : isToday
                    ? 'border-[#2E8B57]/70 bg-[#1A2420] text-[#F0F5F2]'
                    : status === 'weekend' || status === 'future'
                      ? 'border-transparent bg-[#0B0F0E]/50 text-[#6E8078] hover:border-[#23302B] hover:text-[#A3B3AC]'
                      : 'border-[#23302B]/70 bg-[#0B0F0E]/85 text-[#F0F5F2] hover:border-[#2E8B57]/60 hover:bg-[#1A2420]',
              )}
            >
              <span>{cell.day}</span>
              <span className={cn('mt-1 h-1.5 w-1.5 rounded-full', style.dot)} />
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#23302B]/80 pt-3.5 text-[11px] text-[#A3B3AC]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#4CAF7D]" />
          Present
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
          Late
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
          Absent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#6E8078]/60" />
          Weekend
        </span>
      </div>
    </section>
  );
}
