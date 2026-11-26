export type AttendanceDayStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'weekend'
  | 'holiday'
  | 'pending'
  | 'future'
  | 'empty';

export interface AttendanceDayRecord {
  /** YYYY-MM-DD */
  date: string;
  status: AttendanceDayStatus;
  /** Formatted display time (e.g. "09:04 AM") */
  checkInTime?: string;
  /** Raw ISO 8601 timestamp for stopwatch calculation */
  checkInIso?: string | null;
  /** Formatted check-out display time (e.g. "06:15 PM") */
  checkOutTime?: string;
  /** Raw ISO 8601 check-out timestamp */
  checkOutIso?: string | null;
  lateMinutes?: number;
  note?: string;
  isDerived?: boolean;
}

export interface OrganizationShiftSettings {
  timezone: string;
  /** HH:mm (24h, e.g. "09:00") */
  workStart: string;
  /** HH:mm (24h, e.g. "18:00") */
  workEnd: string;
  graceMinutes: number;
}
