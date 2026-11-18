import { Suspense } from 'react';
import { DashboardSessionBar } from '@/components/layout/dashboard-session-bar';
import { EmployeeDashboard } from '@/features/dashboard/components/employee-dashboard';
import { getSession } from '@/lib/auth/session';

async function ServerSessionProbe() {
  // Server-side /auth/me check when backend is active
  await getSession();
  return <DashboardSessionBar />;
}

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={<DashboardSessionBar />}>
        <ServerSessionProbe />
      </Suspense>
      <EmployeeDashboard />
    </>
  );
}
