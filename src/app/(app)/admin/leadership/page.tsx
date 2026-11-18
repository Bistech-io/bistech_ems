import { RoleGuard } from '@/components/auth/role-guard';
import { LeadershipDashboard } from '@/features/admin/leadership/components/leadership-dashboard';

export default function ManageLeadershipPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']} permission="role.manage" minScope="org">
      <LeadershipDashboard />
    </RoleGuard>
  );
}
