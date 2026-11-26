'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Settings2,
  ShieldCheck,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';
import { ApiError, getErrorMessageForCode } from '@/lib/api/errors';
import { can } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import {
  fetchMyAttendanceBoard,
  fetchMyFirstCheckInDate,
  fetchOrganizationSettings,
  patchOrganizationSettings,
  postCheckIn,
  postCheckOut,
  type AttendanceBoardData,
} from '../api';
import type { AttendanceDayRecord, OrganizationShiftSettings } from '../types';
import { ATTENDANCE_STATUS_STYLE, AttendanceCalendar } from './attendance-calendar';
import { HoldActionButton } from './hold-action-button';

const EASE = [0.22, 1, 0.36, 1] as const;

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthBounds(year: number, month: number): { from: string; to: string } {
  const m = String(month + 1).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  const d = String(lastDay).padStart(2, '0');
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${d}`,
  };
}

function formatTimeFromIso(iso: string | null | undefined, timezone = 'Asia/Dhaka'): string | undefined {
  if (!iso) return undefined;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return undefined;
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(parsed);
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }
}

function format24hTo12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function formatLateDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min late`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m late` : `${hrs}h late`;
}

function formatStopwatch(elapsedSeconds: number): string {
  const safe = Math.max(0, Math.floor(elapsedSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function computeStopwatchState(
  checkInIso: string | null | undefined,
  checkOutIso: string | null | undefined,
  workEndHhMm: string,
  now: Date | null,
): { display: string; isShiftEnded: boolean; isCheckedOut: boolean; isActive: boolean } {
  if (!checkInIso || !now) {
    return { display: '00:00:00', isShiftEnded: false, isCheckedOut: false, isActive: false };
  }

  const checkInDate = new Date(checkInIso);
  if (Number.isNaN(checkInDate.getTime())) {
    return { display: '00:00:00', isShiftEnded: false, isCheckedOut: false, isActive: false };
  }

  if (checkOutIso) {
    const checkOutDate = new Date(checkOutIso);
    if (!Number.isNaN(checkOutDate.getTime())) {
      const elapsedSeconds = Math.max(
        0,
        Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / 1000),
      );
      return {
        display: formatStopwatch(elapsedSeconds),
        isShiftEnded: false,
        isCheckedOut: true,
        isActive: false,
      };
    }
  }

  const [endHStr, endMStr] = workEndHhMm.split(':');
  const endH = Number(endHStr);
  const endM = Number(endMStr ?? 0);

  const shiftEndDate = new Date(checkInDate);
  if (!Number.isNaN(endH) && !Number.isNaN(endM)) {
    shiftEndDate.setHours(endH, endM, 0, 0);
  } else {
    shiftEndDate.setHours(18, 0, 0, 0);
  }

  const nowMs = now.getTime();
  const shiftEndMs = shiftEndDate.getTime();
  const isShiftEnded = nowMs >= shiftEndMs;

  // Stop the stopwatch once shift ends
  const effectiveNowMs = isShiftEnded ? shiftEndMs : nowMs;
  const elapsedSeconds = Math.max(0, Math.floor((effectiveNowMs - checkInDate.getTime()) / 1000));

  return {
    display: formatStopwatch(elapsedSeconds),
    isShiftEnded,
    isCheckedOut: false,
    isActive: !isShiftEnded,
  };
}

function buildCalendarRecordsMap(
  year: number,
  month: number,
  todayKey: string,
  board: AttendanceBoardData | null,
  localCheckIn: AttendanceDayRecord | null,
  firstCheckInDate: string | null,
): Record<string, AttendanceDayRecord> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const records: Record<string, AttendanceDayRecord> = {};
  const tz = board?.timezone ?? 'Asia/Dhaka';

  const apiRecordsByDate = new Map<string, AttendanceBoardData['records'][number]>();
  if (board?.records) {
    for (const rec of board.records) {
      apiRecordsByDate.set(rec.workDate, rec);
    }
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, month, day);
    const key = formatDateKey(d);
    const weekday = d.getDay();

    const apiRec = apiRecordsByDate.get(key);
    if (apiRec) {
      // Count attendance/absence only from the employee's first check-in date, not joining date
      if (
        apiRec.isDerived &&
        apiRec.status === 'absent' &&
        (!firstCheckInDate || key < firstCheckInDate)
      ) {
        records[key] = {
          date: key,
          status: 'empty',
          note: 'No attendance record',
        };
        continue;
      }

      const mergedCheckOutIso =
        apiRec.checkOutAt ??
        (key === todayKey ? (localCheckIn?.checkOutIso ?? board?.today?.checkOutAt ?? null) : null);

      records[key] = {
        date: key,
        status: apiRec.status,
        checkInIso: apiRec.checkInAt,
        checkInTime: formatTimeFromIso(apiRec.checkInAt, tz),
        checkOutIso: mergedCheckOutIso,
        checkOutTime: formatTimeFromIso(mergedCheckOutIso, tz),
        lateMinutes: apiRec.lateMinutes,
        note:
          apiRec.note ??
          (apiRec.isDerived ? 'Derived absent (no check-in recorded)' : undefined),
        isDerived: apiRec.isDerived,
      };
      continue;
    }

    if (key === todayKey) {
      if (localCheckIn) {
        records[key] = localCheckIn;
        continue;
      }
      if (
        board?.today &&
        board.today.status !== 'not_checked_in' &&
        !(board.today.status === 'absent' && !firstCheckInDate)
      ) {
        const todayCheckOutIso = board.today.checkOutAt ?? null;
        records[key] = {
          date: key,
          status: board.today.status,
          checkInIso: board.today.checkInAt,
          checkInTime: formatTimeFromIso(board.today.checkInAt, tz),
          checkOutIso: todayCheckOutIso,
          checkOutTime: formatTimeFromIso(todayCheckOutIso, tz),
          lateMinutes: board.today.lateMinutes,
        };
        continue;
      }
      records[key] = {
        date: key,
        status: 'pending',
        note: 'Waiting for daily check-in',
      };
      continue;
    }

    if (weekday === 5 || weekday === 6) {
      records[key] = {
        date: key,
        status: 'weekend',
        note: 'Weekly off day',
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

    // No attendance record returned for this date (e.g. before employee's joining date) -> leave empty
    records[key] = {
      date: key,
      status: 'empty',
      note: 'No attendance record',
    };
  }

  return records;
}

export function AttendanceDashboard() {
  const { user, session, activeRole, isLoading: isAuthLoading } = useAuth();
  const hasEmployeeProfile = Boolean(session?.employeeId);
  const canManageShift =
    activeRole === 'super_admin' || can(user, 'org.settings.manage', 'org');

  const [now, setNow] = useState<Date | null>(null);
  const todayKey = useMemo(
    () => (now ? formatDateKey(now) : '2026-11-22'),
    [now],
  );

  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(10);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('2026-11-22');

  const [board, setBoard] = useState<AttendanceBoardData | null>(null);
  const [firstCheckInDate, setFirstCheckInDate] = useState<string | null>(null);
  const [localCheckIn, setLocalCheckIn] = useState<AttendanceDayRecord | null>(null);
  const [isLoadingBoard, setIsLoadingBoard] = useState<boolean>(true);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Dynamic Shift Settings (GET /organization/settings + PATCH /organization/settings)
  const [shiftSettings, setShiftSettings] = useState<OrganizationShiftSettings | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [draftWorkStart, setDraftWorkStart] = useState('');
  const [draftWorkEnd, setDraftWorkEnd] = useState('');
  const [draftGrace, setDraftGrace] = useState('15');
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [shiftFeedback, setShiftFeedback] = useState<string | null>(null);

  // 1-second ticker so live clock and stopwatch update smoothly
  useEffect(() => {
    const initTimer = setTimeout(() => {
      const current = new Date();
      setNow(current);
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
      setSelectedDateKey(formatDateKey(current));
    }, 0);

    const timer = setInterval(() => setNow(new Date()), 1_000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, []);

  // Load GET /organization/settings on mount
  useEffect(() => {
    let cancelled = false;
    fetchOrganizationSettings()
      .then((settings) => {
        if (!cancelled) {
          setShiftSettings(settings);
        }
      })
      .catch(() => {
        // Fallback to attendance board shift settings if /organization/settings is not available yet
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBoard = useCallback(
    async (year: number, month: number) => {
      if (!hasEmployeeProfile) {
        setIsLoadingBoard(false);
        return;
      }
      try {
        const bounds = getMonthBounds(year, month);
        const data = await fetchMyAttendanceBoard(bounds);
        setBoard(data);
        setShiftSettings((prev) => ({
          timezone: data.timezone || prev?.timezone || 'Asia/Dhaka',
          workStart: data.workStart || prev?.workStart || '10:00',
          workEnd: data.workEnd || prev?.workEnd || '18:30',
          graceMinutes: data.graceMinutes ?? prev?.graceMinutes ?? 15,
        }));
      } catch {
        // Keep UI responsive if offline or user has no employee profile yet
      } finally {
        setIsLoadingBoard(false);
      }
    },
    [hasEmployeeProfile],
  );

  useEffect(() => {
    const handleAutoCheckIn = () => {
      void loadBoard(viewYear, viewMonth);
    };
    const handleShiftUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<OrganizationShiftSettings>;
      if (customEvent.detail) {
        setShiftSettings(customEvent.detail);
      }
    };
    window.addEventListener('ems:attendance-checked-in', handleAutoCheckIn);
    window.addEventListener('ems:shift-updated', handleShiftUpdated);
    return () => {
      window.removeEventListener('ems:attendance-checked-in', handleAutoCheckIn);
      window.removeEventListener('ems:shift-updated', handleShiftUpdated);
    };
  }, [loadBoard, viewYear, viewMonth]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!hasEmployeeProfile) {
      const doneTimer = setTimeout(() => setIsLoadingBoard(false), 0);
      return () => clearTimeout(doneTimer);
    }

    let cancelled = false;
    const bounds = getMonthBounds(viewYear, viewMonth);
    fetchMyAttendanceBoard(bounds)
      .then((data) => {
        if (cancelled) return;
        setBoard(data);
        setShiftSettings((prev) => ({
          timezone: data.timezone || prev?.timezone || 'Asia/Dhaka',
          workStart: data.workStart || prev?.workStart || '10:00',
          workEnd: data.workEnd || prev?.workEnd || '18:30',
          graceMinutes: data.graceMinutes ?? prev?.graceMinutes ?? 15,
        }));
      })
      .catch(() => {
        // Keep UI responsive if offline or user has no employee profile yet
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingBoard(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth, isAuthLoading, hasEmployeeProfile]);

  useEffect(() => {
    if (isAuthLoading || !hasEmployeeProfile) return;
    let cancelled = false;
    fetchMyFirstCheckInDate()
      .then((date) => {
        if (!cancelled) {
          setFirstCheckInDate(date);
        }
      })
      .catch(() => {
        // Ignore if offline or unavailable
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, hasEmployeeProfile]);

  const effectiveFirstCheckInDate = useMemo(() => {
    let earliest = firstCheckInDate;
    if (
      localCheckIn &&
      (localCheckIn.status === 'present' || localCheckIn.status === 'late')
    ) {
      if (!earliest || localCheckIn.date < earliest) {
        earliest = localCheckIn.date;
      }
    }
    if (
      board?.today &&
      (board.today.status === 'present' ||
        board.today.status === 'late' ||
        Boolean(board.today.checkInAt))
    ) {
      if (!earliest || board.today.workDate < earliest) {
        earliest = board.today.workDate;
      }
    }
    if (board?.records) {
      for (const rec of board.records) {
        if (
          !rec.isDerived &&
          (rec.status === 'present' || rec.status === 'late' || Boolean(rec.checkInAt))
        ) {
          if (!earliest || rec.workDate < earliest) {
            earliest = rec.workDate;
          }
        }
      }
    }
    return earliest;
  }, [firstCheckInDate, localCheckIn, board]);

  const recordsByDate = useMemo(
    () =>
      buildCalendarRecordsMap(
        viewYear,
        viewMonth,
        todayKey,
        board,
        localCheckIn,
        effectiveFirstCheckInDate,
      ),
    [viewYear, viewMonth, todayKey, board, localCheckIn, effectiveFirstCheckInDate],
  );

  const todayRecord = recordsByDate[todayKey];
  const isCheckedInToday =
    todayRecord?.status === 'present' || todayRecord?.status === 'late';
  const isCheckedOutToday = Boolean(todayRecord?.checkOutIso);

  const selectedRecord = recordsByDate[selectedDateKey];
  const isViewingToday = selectedDateKey === todayKey;

  const stopwatch = useMemo(
    () =>
      computeStopwatchState(
        isViewingToday ? todayRecord?.checkInIso : selectedRecord?.checkInIso,
        isViewingToday ? todayRecord?.checkOutIso : selectedRecord?.checkOutIso,
        shiftSettings?.workEnd ?? '18:30',
        now,
      ),
    [isViewingToday, todayRecord, selectedRecord, shiftSettings?.workEnd, now],
  );

  const summary = useMemo(() => {
    const values = Object.values(recordsByDate);
    const present = values.filter((r) => r.status === 'present').length;
    const late = values.filter((r) => r.status === 'late').length;
    const absent = values.filter((r) => r.status === 'absent').length;
    const total = present + late + absent;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { present, late, absent, rate };
  }, [recordsByDate]);

  // Recent 5 days (per requirement: 5 days, not 6)
  const recentLogs = useMemo(() => {
    return Object.values(recordsByDate)
      .filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'absent')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [recordsByDate]);

  const formattedDate = useMemo(() => {
    if (!now) return 'Loading date...';
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(now);
  }, [now]);

  const formattedTime = useMemo(() => {
    if (!now) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);
  }, [now]);

  async function handleCheckIn() {
    if (isCheckedInToday || isCheckingIn) return;
    setIsCheckingIn(true);
    setCheckInError(null);

    try {
      const record = await postCheckIn();
      const checkInIso = record.checkInAt ?? new Date().toISOString();
      setLocalCheckIn({
        date: record.workDate || todayKey,
        status: record.status,
        checkInIso,
        checkInTime: formatTimeFromIso(checkInIso, shiftSettings?.timezone ?? 'Asia/Dhaka'),
        lateMinutes: record.lateMinutes,
      });
      setSelectedDateKey(record.workDate || todayKey);
      await loadBoard(viewYear, viewMonth);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ALREADY_CHECKED_IN') {
          await loadBoard(viewYear, viewMonth);
        } else {
          setCheckInError(getErrorMessageForCode(err.code));
        }
      } else {
        setCheckInError('Unable to reach attendance server. Please try again.');
      }
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    if (!isCheckedInToday || isCheckedOutToday || isCheckingOut) return;
    setIsCheckingOut(true);
    setCheckInError(null);

    try {
      const record = await postCheckOut();
      const tz = shiftSettings?.timezone ?? board?.timezone ?? 'Asia/Dhaka';
      const checkInIso = record.checkInAt ?? todayRecord?.checkInIso ?? null;
      const checkOutIso = record.checkOutAt ?? new Date().toISOString();
      setLocalCheckIn({
        date: record.workDate || todayKey,
        status: record.status,
        checkInIso,
        checkInTime: formatTimeFromIso(checkInIso, tz),
        checkOutIso,
        checkOutTime: formatTimeFromIso(checkOutIso, tz),
        lateMinutes: record.lateMinutes,
      });
      setSelectedDateKey(record.workDate || todayKey);
      await loadBoard(viewYear, viewMonth);
    } catch (err) {
      if (err instanceof ApiError) {
        if ((err.code as string) === 'ALREADY_CHECKED_OUT') {
          await loadBoard(viewYear, viewMonth);
        } else {
          setCheckInError(err.message || getErrorMessageForCode(err.code));
        }
      } else {
        setCheckInError('Unable to reach attendance server. Please try again.');
      }
    } finally {
      setIsCheckingOut(false);
    }
  }

  function openShiftModal() {
    if (!shiftSettings) return;
    setDraftWorkStart(shiftSettings.workStart);
    setDraftWorkEnd(shiftSettings.workEnd);
    setDraftGrace(String(shiftSettings.graceMinutes));
    setShiftFeedback(null);
    setShiftModalOpen(true);
  }

  async function handleSaveShiftSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!shiftSettings) return;
    setIsSavingShift(true);
    setShiftFeedback(null);

    const nextSettings: OrganizationShiftSettings = {
      ...shiftSettings,
      workStart: draftWorkStart,
      workEnd: draftWorkEnd,
      graceMinutes: Math.max(0, Number(draftGrace) || 0),
    };

    try {
      const updated = await patchOrganizationSettings(nextSettings);
      setShiftSettings(updated);
      setShiftModalOpen(false);
    } catch {
      // Apply locally if PATCH /organization/settings is not deployed yet on backend
      setShiftSettings(nextSettings);
      setShiftModalOpen(false);
    } finally {
      setIsSavingShift(false);
    }
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

        {/* Dynamic Shift Pill */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-2.5">
          <Clock className="h-4 w-4 text-[#4CAF7D]" />
          <span className="text-xs text-[#A3B3AC]">Shift:</span>
          <span className="text-xs font-semibold text-[#F0F5F2]">
            {shiftSettings
              ? `${format24hTo12h(shiftSettings.workStart)} – ${format24hTo12h(shiftSettings.workEnd)} · ${shiftSettings.graceMinutes}m grace`
              : '—'}
          </span>
          {canManageShift && (
            <button
              type="button"
              onClick={openShiftModal}
              title="Edit organization shift settings"
              aria-label="Edit organization shift settings"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-lg border border-[#23302B] bg-[#0B0F0E] text-[#A3B3AC] transition-colors hover:border-[#2E8B57] hover:text-[#4CAF7D]"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Split: Left Check-in + Metrics + 5-Day Log | Right Calendar + Status & Stopwatch Card */}
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
                  {isCheckedOutToday && todayRecord ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/15 px-2.5 py-0.5 text-xs font-medium text-[#38BDF8]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Checked Out
                    </span>
                  ) : isCheckedInToday && todayRecord ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        todayRecord.status === 'late'
                          ? 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]'
                          : 'border-[#2E8B57]/40 bg-[#1F5C3A]/40 text-[#4CAF7D]',
                      )}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {todayRecord.status === 'late' ? 'Checked In (Late)' : 'Checked In'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#23302B] bg-[#1A2420] px-2.5 py-0.5 text-xs font-medium text-[#A3B3AC]">
                      {isLoadingBoard ? 'Checking status...' : 'Not Checked In Yet'}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#6E8078]">
                  {isCheckedOutToday && todayRecord
                    ? `Checked in at ${todayRecord.checkInTime ?? '—'} · Checked out at ${todayRecord.checkOutTime ?? '—'}.`
                    : isCheckedInToday && todayRecord
                      ? `Checked in at ${todayRecord.checkInTime ?? 'today'}. Hold for 2.5s when ready to check out.`
                      : 'Press and hold for 2.5 seconds to record your daily check-in.'}
                </p>
              </div>

              {isCheckedOutToday ? (
                <div className="inline-flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-6 text-sm font-semibold text-[#4CAF7D]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Checked Out</span>
                </div>
              ) : isCheckedInToday ? (
                <HoldActionButton
                  variant="check-out"
                  label="Hold to Check Out"
                  loadingLabel="Checking out..."
                  durationMs={2500}
                  isLoading={isCheckingOut}
                  onComplete={handleCheckOut}
                />
              ) : (
                <HoldActionButton
                  variant="check-in"
                  label="Hold to Check In"
                  loadingLabel="Checking in..."
                  durationMs={2500}
                  disabled={isLoadingBoard}
                  isLoading={isCheckingIn}
                  onComplete={handleCheckIn}
                />
              )}
            </div>

            {checkInError && (
              <div
                role="alert"
                className="mt-4 flex items-center gap-2 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-[#EF4444]" />
                <span>{checkInError}</span>
              </div>
            )}
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

          {/* Recent 5-Day Check-In History */}
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-5">
            <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
              Recent Attendance Log
            </h2>
            <p className="mt-0.5 text-xs text-[#6E8078]">
              Latest 5 recorded working days for the selected month
            </p>

            <div className="mt-4 divide-y divide-[#23302B]/70">
              {recentLogs.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#6E8078]">
                  No attendance records for this month yet.
                </p>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.date}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#F0F5F2]">{log.date}</p>
                      <p className="text-xs text-[#6E8078]">
                        {log.checkInTime
                          ? log.checkOutTime
                            ? `In ${log.checkInTime} · Out ${log.checkOutTime}`
                            : `Check-in at ${log.checkInTime}`
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
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Calendar + Separate Check-In Status & Stopwatch Card */}
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

          {/* Separate Day / Today's Check-In Status Card with Stopwatch */}
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

              {/* 4-Tile Metrics: Check-In | Check-Out | Punctuality | Worked Stopwatch */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                  <span className="text-[11px] text-[#6E8078]">Check-In Time</span>
                  <p className="mt-1 font-heading text-base font-semibold text-[#F0F5F2]">
                    {selectedRecord?.checkInTime ?? '—'}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                  <span className="text-[11px] text-[#6E8078]">Check-Out Time</span>
                  <p className="mt-1 font-heading text-base font-semibold text-[#F0F5F2]">
                    {selectedRecord?.checkOutTime ?? '—'}
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

                <div className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/75 p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] text-[#6E8078]">Worked Today</span>
                    <Timer
                      className={cn(
                        'h-3.5 w-3.5',
                        stopwatch.isActive ? 'text-[#4CAF7D]' : 'text-[#6E8078]',
                      )}
                    />
                  </div>
                  <p className="mt-1 font-heading text-base font-semibold tabular-nums text-[#F0F5F2]">
                    {selectedRecord?.checkInIso ? stopwatch.display : '00:00:00'}
                  </p>
                  {selectedRecord?.checkInIso && stopwatch.isCheckedOut && (
                    <span className="mt-0.5 block text-[10px] font-medium text-[#4CAF7D]">
                      Checked out ({selectedRecord.checkOutTime})
                    </span>
                  )}
                  {selectedRecord?.checkInIso && !stopwatch.isCheckedOut && stopwatch.isShiftEnded && (
                    <span className="mt-0.5 block text-[10px] font-medium text-[#F59E0B]">
                      Shift ended ({format24hTo12h(shiftSettings?.workEnd ?? '18:30')})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#23302B]/80 pt-3.5 text-xs text-[#A3B3AC]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#4CAF7D]" />
                <span>
                  {selectedRecord?.checkInTime
                    ? stopwatch.isShiftEnded
                      ? `Stopwatch stopped at shift end (${format24hTo12h(shiftSettings?.workEnd ?? '18:30')})`
                      : 'Verified web check-in · Stopwatch active'
                    : selectedRecord?.note ?? 'Select any date on the calendar'}
                </span>
              </span>
              {!isViewingToday && (
                <button
                  type="button"
                  onClick={() => {
                    const current = now ?? new Date();
                    setViewYear(current.getFullYear());
                    setViewMonth(current.getMonth());
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

      {/* Organization Shift Settings Modal (PATCH /organization/settings) */}
      <AnimatePresence>
        {shiftModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          >
            <motion.form
              onSubmit={handleSaveShiftSettings}
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                  Organization Shift Settings
                </h2>
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  aria-label="Close modal"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-[#A3B3AC]">
                Updates work start, shift end cutoff (stopwatch stop time), and grace period via{' '}
                <code className="text-[#4CAF7D]">PATCH /organization/settings</code>.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="shift-work-start"
                    className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Work Start
                  </label>
                  <input
                    id="shift-work-start"
                    type="time"
                    value={draftWorkStart}
                    onChange={(e) => setDraftWorkStart(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="shift-work-end"
                    className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                  >
                    Work End
                  </label>
                  <input
                    id="shift-work-end"
                    type="time"
                    value={draftWorkEnd}
                    onChange={(e) => setDraftWorkEnd(e.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label
                  htmlFor="shift-grace-minutes"
                  className="mb-1 block text-xs font-medium text-[#A3B3AC]"
                >
                  Grace Period (minutes)
                </label>
                <input
                  id="shift-grace-minutes"
                  type="number"
                  min={0}
                  max={120}
                  value={draftGrace}
                  onChange={(e) => setDraftGrace(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                />
              </div>

              {shiftFeedback && (
                <p className="mt-3 text-xs text-[#EF4444]">{shiftFeedback}</p>
              )}

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShiftModalOpen(false)}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingShift}
                  className="rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                >
                  {isSavingShift ? 'Saving...' : 'Save Shift'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
