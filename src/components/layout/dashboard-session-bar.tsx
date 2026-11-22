'use client';

import { LogOut, ShieldCheck } from 'lucide-react';
import { useSignOut } from '@/features/auth/hooks';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';

export function DashboardSessionBar() {
  const { user, isAuthenticated, activeRole } = useAuth();
  const { signOut, isPending } = useSignOut();

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[#F0F5F2]">
            {user.name}{' '}
            <span className="font-normal text-[#A3B3AC]">({user.email})</span>
          </p>
          <p className="text-[11px] text-[#6E8078]">
            Role: <span className="text-[#4CAF7D]">{ROLE_LABELS[activeRole]}</span>
            {' · '}
            {isAuthenticated ? 'Authenticated Session' : 'Preview Mode'}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={() => signOut()}
        className="inline-flex items-center gap-2 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3.5 py-2 text-xs font-medium text-[#A3B3AC] transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span>{isPending ? 'Signing out...' : 'Sign Out'}</span>
      </button>
    </div>
  );
}
