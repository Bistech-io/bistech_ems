'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  KeyRound,
  Mail,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type { OrgUserItem } from '@/features/admin/leadership/api';
import { useRegisterRightDrawer } from '@/lib/ui/right-drawer';
import { cn } from '@/lib/utils';
import {
  PERMISSION_CATALOG_BY_KEY,
  PERMISSION_CATEGORIES,
  SCOPE_LABELS,
  formatRoleDisplayName,
  type AccessControlRole,
  type PermissionCategory,
  type RolePermissionGrant,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface RoleMembersDrawerProps {
  role: AccessControlRole | null;
  members: OrgUserItem[];
  onClose: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function RoleMembersDrawer({
  role,
  members,
  onClose,
}: RoleMembersDrawerProps) {
  useRegisterRightDrawer(Boolean(role), 576);

  const [activeTab, setActiveTab] = useState<'members' | 'permissions'>('members');
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (!role) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [role, onClose]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (user) =>
        user.displayName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        (user.employee?.employeeCode.toLowerCase().includes(q) ?? false) ||
        (user.employee?.department?.name.toLowerCase().includes(q) ?? false),
    );
  }, [members, memberSearch]);

  const permissionsByCategory = useMemo(() => {
    if (!role) return [];
    const map = new Map<PermissionCategory, RolePermissionGrant[]>();
    for (const cat of PERMISSION_CATEGORIES) {
      map.set(cat, []);
    }
    for (const perm of role.permissions) {
      const cat = PERMISSION_CATALOG_BY_KEY[perm.key]?.category ?? 'Users & Access';
      const list = map.get(cat) ?? [];
      list.push(perm);
      map.set(cat, list);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [role]);

  return (
    <AnimatePresence>
      {role && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`${role.displayName} role details`}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.26, ease: EASE }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[#23302B] bg-[#131A17] shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-[#23302B] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                        {role.displayName}
                      </h2>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          role.isSystem
                            ? 'border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]'
                            : 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8]',
                        )}
                      >
                        {role.isSystem ? 'System Role' : 'Custom Role'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#A3B3AC]">{role.description}</p>
                    <p className="mt-1.5 text-[11px] text-[#6E8078]">
                      Key:{' '}
                      <code className="rounded bg-[#0B0F0E] px-1.5 py-0.5 font-mono text-[#4CAF7D]">
                        {role.name}
                      </code>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close role details drawer"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#23302B] bg-[#0B0F0E] p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('members')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                    activeTab === 'members'
                      ? 'bg-[#2E8B57] text-[#F0F5F2] shadow-sm'
                      : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  Assigned Members ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                    activeTab === 'permissions'
                      ? 'bg-[#2E8B57] text-[#F0F5F2] shadow-sm'
                      : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
                  )}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Permissions ({role.permissions.length})
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'members' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6E8078]" />
                    <input
                      type="search"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search assigned users by name, email, or code..."
                      aria-label="Search assigned users"
                      className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] pl-9 pr-3 text-xs text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
                    />
                  </div>

                  {filteredMembers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#23302B] bg-[#0B0F0E]/50 px-5 py-12 text-center">
                      <Users className="mx-auto h-8 w-8 text-[#6E8078]" />
                      <p className="mt-3 text-sm font-medium text-[#F0F5F2]">
                        {members.length === 0
                          ? `No users currently assigned to ${role.displayName}`
                          : 'No matching members found'}
                      </p>
                      <p className="mt-1 text-xs text-[#6E8078]">
                        {members.length === 0
                          ? 'Assign users to this role from Employees or HR & Dept Heads management.'
                          : 'Try adjusting your search keyword.'}
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5">
                      {filteredMembers.map((user) => (
                        <li
                          key={user.id}
                          className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75 p-4 transition-colors hover:border-[#2E8B57]/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#2E8B57]/40 bg-[#1A2420] font-heading text-xs font-bold text-[#4CAF7D]">
                              {getInitials(user.displayName)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-[#F0F5F2]">
                                    {user.displayName}
                                  </span>
                                  {user.employee?.employeeCode && (
                                    <span className="rounded-md border border-[#23302B] bg-[#131A17] px-1.5 py-0.5 font-mono text-[10px] text-[#4CAF7D]">
                                      {user.employee.employeeCode}
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
                                    user.accountStatus === 'active'
                                      ? 'border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]'
                                      : 'border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#F59E0B]',
                                  )}
                                >
                                  {user.accountStatus}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#A3B3AC]">
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-[#6E8078]" />
                                  {user.email}
                                </span>
                                {user.employee?.department?.name && (
                                  <span className="inline-flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-[#6E8078]" />
                                    {user.employee.department.name}
                                    {user.employee.designation?.title
                                      ? ` · ${user.employee.designation.title}`
                                      : ''}
                                  </span>
                                )}
                              </div>

                              {user.roles.length > 1 && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {user.roles.map((r) => (
                                    <span
                                      key={r}
                                      className="rounded-md border border-[#23302B] bg-[#131A17] px-2 py-0.5 text-[10px] font-medium text-[#A3B3AC]"
                                    >
                                      {formatRoleDisplayName(r)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {permissionsByCategory.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#23302B] bg-[#0B0F0E]/50 px-5 py-10 text-center text-xs text-[#6E8078]">
                      No permissions assigned to this role.
                    </div>
                  ) : (
                    permissionsByCategory.map(([category, perms]) => (
                      <div
                        key={category}
                        className="overflow-hidden rounded-2xl border border-[#23302B] bg-[#0B0F0E]/75"
                      >
                        <div className="flex items-center justify-between border-b border-[#23302B]/80 bg-[#1A2420]/55 px-4 py-2.5">
                          <span className="text-xs font-semibold text-[#F0F5F2]">
                            {category}
                          </span>
                          <span className="text-[11px] text-[#A3B3AC]">
                            {perms.length} granted
                          </span>
                        </div>
                        <ul className="divide-y divide-[#23302B]/50">
                          {perms.map((perm) => {
                            const meta = PERMISSION_CATALOG_BY_KEY[perm.key];
                            return (
                              <li
                                key={perm.key}
                                className="flex items-start justify-between gap-3 px-4 py-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-[#F0F5F2]">
                                      {meta?.label ?? perm.key}
                                    </span>
                                    <code className="rounded bg-[#131A17] px-1.5 py-0.5 font-mono text-[10px] text-[#4CAF7D]">
                                      {perm.key}
                                    </code>
                                  </div>
                                  {(perm.description ?? meta?.description) && (
                                    <p className="mt-0.5 text-[11px] text-[#6E8078]">
                                      {perm.description ?? meta?.description}
                                    </p>
                                  )}
                                </div>
                                <span className="shrink-0 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-2.5 py-0.5 text-[10px] font-medium text-[#4CAF7D]">
                                  {SCOPE_LABELS[perm.scope] ?? perm.scope}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
