'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceDayRecord } from '../types';
import { ATTENDANCE_STATUS_STYLE, AttendanceCalendar } from './attendance-calendar';

const EASE = [0.22, 1, 0.36, 1] as const;

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLateDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min late`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m late` : `${hrs}h late`;
}

function buildMonthRecords(
  year: number,
  month: number,
  todayKey: string,
  checkedInToday: AttendanceDayRecord | null,
): Record<string, AttendanceDayRecord> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const records: Record<string, AttendanceDayRecord> = {};

  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, month, day);
    const key = formatDateKey(d);
    const weekday = d.getDay();

    if (weekday === 5 || weekday === 6) {
      records[key] = {
        date: key,
        status: 'weekend',
        note: 'Weekly off day',
      };
      continue;
    }

    if (key === todayKey) {
      records[key] = checkedInToday ?? {
        date: key,
        status: 'pending',
        note: 'Waiting for daily check-in',
      };
      continue;
    }

    if (key > todayKey) {
      records[key] = {
        date: key,
        status: 'future',
        note: 'Upcoming working day',
      };
      continue;
    }

    if (day % 11 === 0) {
      records[key] = {
        date: key,
        status: 'absent',
        note: 'Derived absent (no check-in recorded)',
      };
    } else if (day % 6 === 0) {
      records[key] = {
        date: key,
        status: 'late',
        checkInTime: '09:24 AM',
        lateMinutes: 9,
      };
    } else {
      const mins = String(48 + (day % 11)).padStart(2, '0');
      records[key] = {
        date: key,
        status: 'present',
        checkInTime: `08:${mins} AM`,
        lateMinutes: 0,
      };
    }
  }

  return records;
}

export function AttendanceDashboard() {
  const [now, setNow] = useState<Date>(() => new Date());
  const todayKey = useMemo(() => formatDateKey(now), [now]);

  const [viewYear, setViewYear] = useState<number>(() => now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => now.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => formatDateKey(new Date()));
  const [checkedInToday, setCheckedInToday] = useState<AttendanceDayRecord | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const recordsByDate = useMemo(
    () => buildMonthRecords(viewYear, viewMonth, todayKey, checkedInToday),
    [viewYear, viewMonth, todayKey, checkedInToday],
  );

  const selectedRecord = recordsByDate[selectedDateKey];
  const isViewingToday = selectedDateKey === todayKey;

  const summary = useMemo(() => {
    const values = Object.values(recordsByDate);
    const present = values.filter((r) => r.status === 'present').length;
    const late = values.filter((r) => r.status === 'late').length;
    const absent = values.filter((r) => r.status === 'absent').length;
    const total = present + late + absent;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { present, late, absent, rate };
  }, [recordsByDate]);

  const recentLogs = useMemo(() => {
    return Object.values(recordsByDate)
      .filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'absent')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [recordsByDate]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now);
  }, [now]);

  const formattedTime = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
  }, [now]);

  async function handleCheckIn() {
    if (checkedInToday || isCheckingIn) return;
    setIsCheckingIn(true);

    await new Promise((resolve) => setTimeout(resolve, 250));

    const current = new Date();
    const isLate =
      current.getHours() > 9 || (current.getHours() === 9 && current.getMinutes() > 15);
    const lateMinutes = isLate
      ? (current.getHours() - 9) * 60 + current.getMinutes() - 15
      : 0;

    setCheckedInToday({
      date: todayKey,
      status: isLate ? 'late' : 'present',
      checkInTime: new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(current),
      lateMinutes,
    });
    setSelectedDateKey(todayKey);
    setIsCheckingIn(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#23302B] pb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[#4CAF7D] uppercase">
            Daily Attendance
          </p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            Attendance Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#A3B3AC]">{formattedDate}</p>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-2.5">
          <Clock className="h-4 w-4 text-[#4CAF7D]" />
          <span className="text-xs text-[#A3B3AC]">Shift:</span>
          <span className="text-xs font-semibold text-[#F0F5F2]">09:00 AM · 15m grace</span>
        </div>
      </header>

      {/* Main Split: Left Check-in + Metrics + Log | Right Calendar + Separate Day Status Card */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-7">
          {/* Check-In Action Card */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-[#A3B3AC]">Today&apos;s Status</span>
                <div className="mt-1.5 flex items-baseline gap-3">
                  <span className="font-heading text-3xl font-bold tracking-[-0.02em] text-[#F0F5F2]">
                    {formattedTime}
                  </span>
                  {checkedInToday ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        checkedInToday.status === 'late'
                          ? 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]'
                          : 'border-[#2E8B57]/40 bg-[#1F5C3A]/40 text-[#4CAF7D]',
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {checkedInToday.status === 'late' ? 'Checked In (Late)' : 'Checked In'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#23302B] bg-[#1A2420] px-2.5 py-0.5 text-xs font-medium text-[#A3B3AC]">
                      Not Checked In Yet
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#6E8078]">
                  {checkedInToday
                    ? `Recorded at ${checkedInToday.checkInTime}. Daily attendance is complete.`
                    : 'One-tap daily check-in. Attendance timestamp is recorded once per workday.'}
                </p>
              </div>

              <button
                type="button"
                disabled={Boolean(checkedInToday) || isCheckingIn}
                onClick={handleCheckIn}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl px-6 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]',
                  checkedInToday
                    ? 'cursor-default border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]'
                    : 'bg-[#2E8B57] text-[#F0F5F2] shadow-[0_8px_24px_-6px_rgba(46,139,87,0.55)] hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-60',
                )}
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking in...</span>
                  </>
                ) : checkedInToday ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Checked In</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    <span>Check In</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Monthly KPI Cards */}
          <section className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A3B3AC]">Present</span>
                <CalendarCheck className="h-4 w-4 text-[#4CAF7D]" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold text-[#F0F5F2]">
                {summary.present}
              </p>
            </div>

            <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A3B3AC]">Late</span>
                <Clock className="h-4 w-4 text-[#F59E0B]" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold text-[#F0F5F2]">
                {summary.late}
              </p>
            </div>

            <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A3B3AC]">Absent</span>
                <AlertCircle className="h-4 w-4 text-[#EF4444]" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold text-[#F0F5F2]">
                {summary.absent}
              </p>
            </div>

            <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A3B3AC]">Rate</span>
                <TrendingUp className="h-4 w-4 text-[#4CAF7D]" />
              </div>
              <p className="mt-2 font-heading text-2xl font-bold text-[#F0F5F2]">
                {summary.rate}%
              </p>
            </div>
          </section>

          {/* Recent Check-In History */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-5">
            <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
              Recent Attendance Log
            </h2>
            <p className="mt-0.5 text-xs text-[#6E8078]">
              Latest recorded working days for the selected month
            </p>

            <div className="mt-4 divide-y divide-[#23302B]/70">
              {recentLogs.map((log) => (
                <div
                  key={log.date}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[#F0F5F2]">{log.date}</p>
                    <p className="text-xs text-[#6E8078]">
                      {log.checkInTime
                        ? `Check-in at ${log.checkInTime}`
                        : log.note ?? 'No check-in'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize',
                      log.status === 'present' &&
                        'border-[#2E8B57]/40 bg-[#1F5C3A]/40 text-[#4CAF7D]',
                      log.status === 'late' &&
                        'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]',
                      log.status === 'absent' &&
                        'border-[#EF4444]/40 bg-[#EF4444]/15 text-[#EF4444]',
                    )}
                  >
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Calendar + Separate Check-In Status Card filling the gap */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <AttendanceCalendar
            year={viewYear}
            month={viewMonth}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            recordsByDate={recordsByDate}
            onSelectDate={setSelectedDateKey}
            onMonthChange={(y, m) => {
              setViewYear(y);
              setViewMonth(m);
            }}
          />

          {/* Separate Day / Today's Check-In Status Card */}
          <section className="flex flex-1 flex-col justify-between rounded-3xl border border-[#23302B] bg-[#131A17] p-5 md:p-6">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
                    {isViewingToday ? "Today's Check-In Status" : 'Selected Day Status'}
                  </p>
                  <h3 className="mt-0.5 font-heading text-lg font-semibold text-[#F0F5F2]">
                    {selectedDateKey}
                  </h3>
                </div>

                {selectedRecord ? (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                      ATTENDANCE_STATUS_STYLE[selectedRecord.status].badge,
                    )}
                  >
                    {ATTENDANCE_STATUS_STYLE[selectedRecord.status].label}
                  </span>
                ) : (
                  <span className="rounded-full border border-[#23302B] bg-[#1A2420] px-3 py-1 text-xs text-[#6E8078]">
                    No Record
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                  <span className="text-[11px] text-[#6E8078]">Check-In Time</span>
                  <p className="mt-1 font-heading text-base font-semibold text-[#F0F5F2]">
                    {selectedRecord?.checkInTime ?? '—'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                  <span className="text-[11px] text-[#6E8078]">Punctuality</span>
                  <p className="mt-1 font-heading text-base font-semibold text-[#F0F5F2]">
                    {selectedRecord?.checkInTime
                      ? selectedRecord.lateMinutes && selectedRecord.lateMinutes > 0
                        ? formatLateDuration(selectedRecord.lateMinutes)
                        : 'On Time'
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#23302B]/80 pt-3.5 text-xs text-[#A3B3AC]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#4CAF7D]" />
                <span>
                  {selectedRecord?.checkInTime
                    ? 'Verified web check-in'
                    : selectedRecord?.note ?? 'Select any date on the calendar'}
                </span>
              </span>
              {!isViewingToday && (
                <button
                  type="button"
                  onClick={() => {
                    setViewYear(now.getFullYear());
                    setViewMonth(now.getMonth());
                    setSelectedDateKey(todayKey);
                  }}
                  className="font-medium text-[#4CAF7D] transition-colors hover:underline"
                >
                  Jump to today
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}
