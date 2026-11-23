import { RoleGuard } from '@/components/auth/role-guard';
import { OrganizationManagementDashboard } from '@/features/admin/organization/components/organization-management-dashboard';

export default function OrganizationManagementPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']}>
      <OrganizationManagementDashboard />
    </RoleGuard>
  );
}
