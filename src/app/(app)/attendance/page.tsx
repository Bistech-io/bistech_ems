import { Suspense } from 'react';
import { AttendanceDashboard } from '@/features/attendance/components/attendance-dashboard';

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-3xl border border-[#23302B] bg-[#131A17]/60" />
      }
    >
      <AttendanceDashboard />
    </Suspense>
  );
}
