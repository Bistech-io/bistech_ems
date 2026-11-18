import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen gap-4 bg-[#0B0F0E] p-3 text-[#F0F5F2] md:gap-5 md:p-4">
      <Sidebar />
      <main className="min-w-0 flex-1 rounded-[2rem] border border-[#23302B]/70 bg-[#131A17]/40 p-5 md:p-7">
        {children}
      </main>
    </div>
  );
}
