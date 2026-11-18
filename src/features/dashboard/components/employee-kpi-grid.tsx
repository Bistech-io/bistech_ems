import { CheckCircle2, CheckSquare, Clock, TrendingUp } from 'lucide-react';
import type {
  EmployeeTaskItem,
  MonthlyAttendanceSummary,
  TodayAttendance,
} from '../types';
import { StatCard } from './stat-card';

interface EmployeeKpiGridProps {
  todayAttendance: TodayAttendance;
  monthlyAttendance: MonthlyAttendanceSummary;
  tasks: EmployeeTaskItem[];
  completionRatePercent: number;
  openFeedbackCount: number;
}

export function EmployeeKpiGrid({
  todayAttendance,
  monthlyAttendance,
  tasks,
  completionRatePercent,
  openFeedbackCount,
}: EmployeeKpiGridProps) {
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const overdueCount = openTasks.filter((t) => t.isOverdue).length;
  const dueSoonCount = openTasks.filter((t) => t.isDueSoon).length;

  const todayStatusLabel =
    todayAttendance.status === 'present'
      ? 'Present'
      : todayAttendance.status === 'late'
        ? 'Late'
        : todayAttendance.status === 'absent'
          ? 'Absent'
          : 'Pending';

  const todayBadgeTone =
    todayAttendance.status === 'present'
      ? 'success'
      : todayAttendance.status === 'late'
        ? 'warning'
        : todayAttendance.status === 'absent'
          ? 'danger'
          : 'neutral';

  const todayBadgeText =
    todayAttendance.status === 'present'
      ? 'On-time'
      : todayAttendance.status === 'late'
        ? `+${todayAttendance.lateMinutes}m late`
        : todayAttendance.status === 'absent'
          ? 'Absent'
          : 'Before cutoff';

  return (
    <section
      aria-label="Key performance indicators"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatCard
        label="Today's Status"
        value={todayStatusLabel}
        icon={<Clock className="h-4 w-4" />}
        iconTone={
          todayAttendance.status === 'late'
            ? 'warning'
            : todayAttendance.status === 'present'
              ? 'success'
              : 'primary'
        }
        badgeText={todayBadgeText}
        badgeTone={todayBadgeTone}
        footerText={
          todayAttendance.checkInAt ? `In at ${todayAttendance.checkInAt}` : 'Web check-in ready'
        }
      />

      <StatCard
        label="Monthly Attendance"
        value={`${monthlyAttendance.attendanceRatePercent}%`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        iconTone="success"
        progressPercent={monthlyAttendance.attendanceRatePercent}
        footerText={`${monthlyAttendance.presentDays} present • ${monthlyAttendance.lateDays} late • ${monthlyAttendance.absentDays} absent`}
      />

      <StatCard
        label="My Open Tasks"
        value={openTasks.length}
        unit="assigned"
        icon={<CheckSquare className="h-4 w-4" />}
        iconTone={overdueCount > 0 ? 'warning' : 'info'}
        badgeText={overdueCount > 0 ? `${overdueCount} Overdue` : `${dueSoonCount} Due soon`}
        badgeTone={overdueCount > 0 ? 'danger' : 'warning'}
        footerText={`${dueSoonCount} due in 3d`}
      />

      <StatCard
        label="Completion Rate"
        value={`${completionRatePercent}%`}
        icon={<TrendingUp className="h-4 w-4" />}
        iconTone="primary"
        badgeText={`${openFeedbackCount} Open feedback`}
        badgeTone="neutral"
        footerText="Done vs open tasks"
      />
    </section>
  );
}
