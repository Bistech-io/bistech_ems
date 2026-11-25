import { RoleGuard } from '@/components/auth/role-guard';
import { EmployeeAttendanceDashboard } from '@/features/attendance/components/employee-attendance-dashboard';

export default function EmployeeAttendancePage() {
  return (
    <RoleGuard
      allowedRoles={['super_admin', 'hr_manager']}
      permission="attendance.read"
      minScope="org"
    >
      <EmployeeAttendanceDashboard />
    </RoleGuard>
  );
}
