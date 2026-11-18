export type AttendanceStatus = 'present' | 'late' | 'absent' | 'not_checked_in';

export type TaskAssignmentStatus =
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'changes_requested'
  | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskAssignmentType = 'self' | 'individual' | 'team';

export interface EmployeeProfileSummary {
  id: string;
  employeeCode: string;
  fullName: string;
  initials: string;
  designation: string;
  department: string;
  teamName: string;
  timezone: string;
  workStartTime: string;
  graceMinutes: number;
  workEndTime: string;
}

export interface TodayAttendance {
  workDate: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  lateMinutes: number;
  source: 'web' | 'hr_correction' | null;
}

export interface MonthlyAttendanceSummary {
  presentDays: number;
  lateDays: number;
  absentDays: number;
  expectedWorkingDays: number;
  attendanceRatePercent: number;
}

export interface AttendanceChartPoint {
  dateLabel: string;
  dayShort: string;
  status: 'present' | 'late' | 'absent' | 'weekend';
  checkInTime: string | null;
  lateMinutes: number;
  barHeight: number;
}

export interface EmployeeTaskItem {
  id: string;
  title: string;
  projectOrTeam: string;
  assignmentType: TaskAssignmentType;
  status: TaskAssignmentStatus;
  priority: TaskPriority;
  dueDate: string;
  dueLabel: string;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface ScheduleDayItem {
  isoDate: string;
  dayShort: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  attendanceStatus?: 'present' | 'late' | 'absent';
  tasksDueCount: number;
}

export interface ActivityFeedItem {
  id: string;
  title: string;
  description: string;
  timestampLabel: string;
  category: 'attendance' | 'task' | 'review' | 'feedback';
  tone: 'success' | 'warning' | 'info' | 'neutral';
}

export interface EmployeeDashboardData {
  employee: EmployeeProfileSummary;
  todayAttendance: TodayAttendance;
  monthlyAttendance: MonthlyAttendanceSummary;
  weeklyAttendanceChart: AttendanceChartPoint[];
  twoWeekAttendanceChart: AttendanceChartPoint[];
  tasks: EmployeeTaskItem[];
  completionRatePercent: number;
  openFeedbackCount: number;
  scheduleStrip: ScheduleDayItem[];
  activityFeed: ActivityFeedItem[];
}
