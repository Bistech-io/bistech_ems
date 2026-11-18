'use client';

import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { ScheduleDayItem } from '../types';

interface ScheduleCalendarStripProps {
  days: ScheduleDayItem[];
  monthTitle?: string;
  subtitle?: string;
}

export function ScheduleCalendarStrip({
  days,
  monthTitle = 'November, 2026',
  subtitle = 'Org Working Schedule',
}: ScheduleCalendarStripProps) {
  const defaultSelected = days.find((d) => d.isToday)?.isoDate ?? days[0]?.isoDate ?? '';
  const [selectedIso, setSelectedIso] = useState<string>(defaultSelected);

  const selectedDay = days.find((d) => d.isoDate === selectedIso) ?? days[0];

  return (
    <section className="flex flex-col gap-4 rounded-[2rem] border border-[#23302B] bg-[#131A17] p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/50 text-[#4CAF7D]">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-heading text-base font-bold text-[#F0F5F2]">{monthTitle}</h3>
            <p className="text-xs text-[#A3B3AC]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous week"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#23302B] bg-[#1A2420] text-[#A3B3AC] transition-colors hover:border-[#2E8B57]/50 hover:text-[#F0F5F2]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next week"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#23302B] bg-[#1A2420] text-[#A3B3AC] transition-colors hover:border-[#2E8B57]/50 hover:text-[#F0F5F2]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5 pt-1">
        {days.map((day) => {
          const isSelected = day.isoDate === selectedIso;
          const dotColor =
            day.attendanceStatus === 'present'
              ? 'bg-[#4CAF7D]'
              : day.attendanceStatus === 'late'
                ? 'bg-[#F59E0B]'
                : day.attendanceStatus === 'absent'
                  ? 'bg-[#EF4444]'
                  : day.tasksDueCount > 0
                    ? 'bg-[#38BDF8]'
                    : null;

          return (
            <button
              key={day.isoDate}
              type="button"
              onClick={() => setSelectedIso(day.isoDate)}
              className={`flex cursor-pointer flex-col items-center rounded-2xl border px-1 py-2.5 text-center transition-all ${
                isSelected
                  ? 'border-[#4CAF7D] bg-[#2E8B57] text-[#F0F5F2] shadow-sm'
                  : day.isWeekend || day.isHoliday
                    ? 'border-[#23302B] bg-[#0B0F0E]/60 text-[#6E8078] hover:border-[#2E8B57]/40'
                    : 'border-[#23302B] bg-[#1A2420]/70 text-[#F0F5F2] hover:border-[#2E8B57]/50'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase ${
                  isSelected ? 'text-[#F0F5F2]' : 'text-[#A3B3AC]'
                }`}
              >
                {day.dayShort}
              </span>
              <span className="mt-1 font-heading text-sm font-bold">{day.dayNumber}</span>
              <span className="mt-1 flex h-2 items-center justify-center">
                {dotColor ? (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-[#F0F5F2]' : dotColor
                    }`}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="flex items-center justify-between rounded-2xl border border-[#23302B] bg-[#0B0F0E]/70 px-3.5 py-2.5 text-xs">
          <span className="text-[#A3B3AC]">
            {selectedDay.isToday ? 'Today' : selectedDay.isoDate} •{' '}
            {selectedDay.isWeekend
              ? 'Weekend'
              : selectedDay.isHoliday
                ? (selectedDay.holidayName ?? 'Holiday')
                : 'Working Day'}
          </span>
          <span className="font-mono font-semibold text-[#4CAF7D]">
            {selectedDay.tasksDueCount > 0 ? `${selectedDay.tasksDueCount} task due` : 'No tasks due'}
          </span>
        </div>
      ) : null}
    </section>
  );
}
