import { RoleGuard } from '@/components/auth/role-guard';
import { BoardDashboard } from '@/features/board/components/board-dashboard';

export default function BoardPage() {
  return (
    <RoleGuard
      allowedRoles={['super_admin', 'hr_manager', 'dept_head', 'employee']}
      permission="feedback.read"
      minScope="own"
    >
      <BoardDashboard />
    </RoleGuard>
  );
}
