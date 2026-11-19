export type AttendanceDayStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'weekend'
  | 'holiday'
  | 'pending'
  | 'future';

export interface AttendanceDayRecord {
  /** YYYY-MM-DD */
  date: string;
  status: AttendanceDayStatus;
  checkInTime?: string;
  lateMinutes?: number;
  note?: string;
}
