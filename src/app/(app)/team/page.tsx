import { RoleGuard } from '@/components/auth/role-guard';
import { MyTeamDashboard } from '@/features/team/components/my-team-dashboard';

export default function MyTeamPage() {
  return (
    <RoleGuard
      allowedRoles={['dept_head']}
      permission="team.read"
      minScope="department"
    >
      <MyTeamDashboard />
    </RoleGuard>
  );
}
