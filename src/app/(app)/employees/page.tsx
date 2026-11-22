import { RoleGuard } from '@/components/auth/role-guard';
import { EmployeesDashboard } from '@/features/employees/components/employees-dashboard';

export default function EmployeesPage() {
  return (
    <RoleGuard
      allowedRoles={['super_admin', 'hr_manager', 'dept_head']}
      permission="employee.read"
      minScope="managed"
    >
      <EmployeesDashboard />
    </RoleGuard>
  );
}
