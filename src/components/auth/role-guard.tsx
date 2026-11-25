'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import {
  getRoleLabel,
  isAuthorizedForRule,
  type PermissionKey,
  type RoleName,
  type ScopeLevel,
} from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleName[];
  permission?: PermissionKey;
  minScope?: ScopeLevel;
}

/**
 * Client-side route guard for role-restricted views.
 * Enforces UI visibility only; backend handlers enforce real authorization.
 */
export function RoleGuard({
  children,
  allowedRoles,
  permission,
  minScope = 'org',
}: RoleGuardProps) {
  const { user, activeRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
      </div>
    );
  }

  const authorized = isAuthorizedForRule(user, {
    allowedRoles,
    permission,
    minScope,
  });

  if (!authorized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-[60vh] items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-7 text-center shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-heading text-xl font-bold text-[#F0F5F2]">
            {allowedRoles.length === 1
              ? `${getRoleLabel(allowedRoles[0])} Access Required`
              : 'Restricted Access'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#A3B3AC]">
            This section is restricted to{' '}
            <span className="font-medium text-[#F0F5F2]">
              {allowedRoles.map((r) => getRoleLabel(r)).join(' or ')}
            </span>
            . Your current active role is{' '}
            <span className="font-medium text-[#4CAF7D]">
              {activeRole ? getRoleLabel(activeRole) : 'Unauthenticated'}
            </span>
            .
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 py-2.5 text-sm font-medium text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Overview
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return <>{children}</>;
}
