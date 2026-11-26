import { RoleGuard } from '@/components/auth/role-guard';
import { OrganizationManagementDashboard } from '@/features/admin/organization/components/organization-management-dashboard';

export default function OrganizationManagementPage() {
  return (
    <RoleGuard
      allowedRoles={['super_admin', 'admin', 'hr_manager']}
      permission="org.settings.manage"
      minScope="org"
    >
      <OrganizationManagementDashboard />
    </RoleGuard>
  );
}
