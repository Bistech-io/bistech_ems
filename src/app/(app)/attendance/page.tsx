import { Suspense } from 'react';
import { RoleGuard } from '@/components/auth/role-guard';
import { AttendanceDashboard } from '@/features/attendance/components/attendance-dashboard';

export default function AttendancePage() {
  return (
    <RoleGuard
      allowedRoles={['hr_manager', 'dept_head', 'employee']}
      permission="attendance.self"
      minScope="own"
    >
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-3xl border border-[#23302B] bg-[#131A17]/60" />
        }
      >
        <AttendanceDashboard />
      </Suspense>
    </RoleGuard>
  );
}

