import { RoleGuard } from '@/components/auth/role-guard';
import { AccessControlDashboard } from '@/features/admin/access-control/components/access-control-dashboard';

export default function AccessControlPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']} permission="role.manage" minScope="org">
      <AccessControlDashboard />
    </RoleGuard>
  );
}
