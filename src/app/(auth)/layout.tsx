import type { ReactNode } from 'react';
import { Layers } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0B0F0E] px-4 py-10 text-[#F0F5F2]">
      {/* Subtle Sea Green ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#2E8B57]/15 blur-[120px]"
      />

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#23302B] bg-[#131A17] text-[#4CAF7D] shadow-lg">
            <Layers className="h-6 w-6" strokeWidth={2} />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2]">
            BisTech EMS
          </h1>
          <p className="mt-1 text-sm text-[#A3B3AC]">
            Sign in to your organization workspace
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#23302B] bg-[#131A17]/95 p-6 shadow-2xl sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
