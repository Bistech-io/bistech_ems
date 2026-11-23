import { Suspense } from 'react';
import { TasksDashboard } from '@/features/tasks/components/tasks-dashboard';

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
        </div>
      }
    >
      <TasksDashboard />
    </Suspense>
  );
}
