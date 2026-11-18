'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ShieldCheck, Users } from 'lucide-react';
import { getFilteredNavigation } from '@/config/navigation';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';

export default function DashboardPage() {
  const { user, activeRole } = useAuth();
  const visibleGroups = getFilteredNavigation(user);
  const visibleCount = visibleGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[#4CAF7D] uppercase">
            BisTech EMS Workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            Overview Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#A3B3AC]">
            Hover the left floating sidebar to expand navigation. Switch RBAC roles at the bottom
            of the sidebar to preview role-based menus.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-2xl border border-[#23302B] bg-[#131A17] px-4 py-2.5">
          <ShieldCheck className="h-4 w-4 text-[#4CAF7D]" />
          <span className="text-xs font-medium text-[#A3B3AC]">Active Role:</span>
          <span className="text-xs font-semibold text-[#F0F5F2]">
            {ROLE_LABELS[activeRole]}
          </span>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Visible Nav Modules</span>
            <CheckCircle2 className="h-4 w-4 text-[#4CAF7D]" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">{visibleCount}</p>
          <p className="mt-1 text-xs text-[#6E8078]">
            Filtered dynamically for {ROLE_LABELS[activeRole]}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Theme Standard</span>
            <Clock className="h-4 w-4 text-[#2E8B57]" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">Deep Dark</p>
          <p className="mt-1 text-xs text-[#6E8078]">Sea Green (#2E8B57 / #4CAF7D) accents</p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">RBAC Optimization</span>
            <Users className="h-4 w-4 text-[#4CAF7D]" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">4 Roles</p>
          <p className="mt-1 text-xs text-[#6E8078]">
            Super Admin, HR Manager, Dept Head, Employee
          </p>
        </div>
      </section>
    </motion.div>
  );
}
