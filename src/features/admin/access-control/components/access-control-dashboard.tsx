'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ChevronRight,
  Crown,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  ShieldPlus,
  Users,
} from 'lucide-react';
import { fetchOrgUsers, type OrgUserItem } from '@/features/admin/leadership/api';
import { useOptionalAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import {
  fetchAccessControlRoles,
  fetchPermissionCatalog,
} from '../api';
import {
  PERMISSION_CATALOG,
  PERMISSION_CATALOG_BY_KEY,
  SCOPE_LABELS,
  userHasRole,
  type AccessControlRole,
  type PermissionCatalogItem,
} from '../types';
import { CreateRoleModal } from './create-role-modal';
import { RoleMembersDrawer } from './role-members-drawer';

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_VISIBLE_PERMS_PER_CARD = 6;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getRoleHierarchyRank(role: AccessControlRole): number {
  const key = role.name.toLowerCase();
  if (key === 'super_admin') return 0;
  if (key === 'dept_head' || key === 'department_head') return 1;
  if (key === 'hr_manager') return 2;
  if (key === 'employee') return 3;
  return 4;
}

export function AccessControlDashboard() {
  const currentUser = useOptionalAuth()?.user;
  const [roles, setRoles] = useState<AccessControlRole[]>([]);
  const [users, setUsers] = useState<OrgUserItem[]>([]);
  const [permissionCatalog, setPermissionCatalog] =
    useState<PermissionCatalogItem[]>(PERMISSION_CATALOG);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AccessControlRole | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    tone: 'success' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchAccessControlRoles().catch(() => [] as AccessControlRole[]),
      fetchOrgUsers({ limit: 100 }).catch(() => [] as OrgUserItem[]),
      fetchPermissionCatalog().catch(() => PERMISSION_CATALOG),
    ])
      .then(([roleList, userList, catalog]) => {
        if (cancelled) return;
        setRoles(roleList);
        setUsers(userList);
        setPermissionCatalog(catalog);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const membersByRoleName = useMemo(() => {
    const map = new Map<string, OrgUserItem[]>();
    for (const role of roles) {
      map.set(
        role.name,
        users.filter((u) => userHasRole(u.roles, role.name)),
      );
    }
    return map;
  }, [roles, users]);

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roles
      .filter((role) => {
        if (roleTypeFilter === 'system' && !role.isSystem) return false;
        if (roleTypeFilter === 'custom' && role.isSystem) return false;
        if (!q) return true;
        return (
          role.displayName.toLowerCase().includes(q) ||
          role.name.toLowerCase().includes(q) ||
          role.description.toLowerCase().includes(q) ||
          role.permissions.some(
            (p) =>
              p.key.toLowerCase().includes(q) ||
              (PERMISSION_CATALOG_BY_KEY[p.key]?.label.toLowerCase().includes(q) ?? false),
          )
        );
      })
      .sort((a, b) => {
        const rankDiff = getRoleHierarchyRank(a) - getRoleHierarchyRank(b);
        if (rankDiff !== 0) return rankDiff;
        const permDiff = b.permissions.length - a.permissions.length;
        if (permDiff !== 0) return permDiff;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [roles, searchQuery, roleTypeFilter]);

  const stats = useMemo(() => {
    const systemCount = roles.filter((r) => r.isSystem).length;
    const customCount = roles.filter((r) => !r.isSystem).length;
    return {
      totalRoles: roles.length,
      systemCount,
      customCount,
      totalPermissions: permissionCatalog.length,
      totalUsers: users.length,
    };
  }, [roles, permissionCatalog.length, users.length]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const selectedRoleMembers = useMemo(() => {
    if (!selectedRole) return [];
    return membersByRoleName.get(selectedRole.name) ?? [];
  }, [selectedRole, membersByRoleName]);

  function handleRoleCreated(newRole: AccessControlRole, syncedWithServer: boolean) {
    setRoles((prev) => [newRole, ...prev]);
    setBannerMessage({
      tone: syncedWithServer ? 'success' : 'info',
      text: syncedWithServer
        ? `Custom role "${newRole.displayName}" created with ${newRole.permissions.length} permissions.`
        : `Custom role "${newRole.displayName}" added locally with ${newRole.permissions.length} permissions (awaiting backend POST /api/v1/roles deployment).`,
    });
  }

  function handleRoleUpdated(updatedRole: AccessControlRole) {
    setRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)));
    setBannerMessage({
      tone: 'success',
      text: `Custom role "${updatedRole.displayName}" updated (${updatedRole.permissions.length} permissions).`,
    });
  }

  function handleRoleDeleted(deletedRole: AccessControlRole, detachedUsersCount: number) {
    setRoles((prev) => prev.filter((r) => r.id !== deletedRole.id));
    if (detachedUsersCount > 0) {
      setUsers((prev) =>
        prev.map((u) => {
          if (!userHasRole(u.roles, deletedRole.name)) return u;
          const remaining = u.roles.filter(
            (r) => r.toLowerCase() !== deletedRole.name.toLowerCase(),
          );
          return {
            ...u,
            roles: remaining.length > 0 ? remaining : ['employee'],
          };
        }),
      );
    }
    setSelectedRoleId(null);
    setBannerMessage({
      tone: 'success',
      text: `Custom role "${deletedRole.displayName}" deleted.${detachedUsersCount > 0 ? ` Updated ${detachedUsersCount} affected user(s).` : ''}`,
    });
  }

  function handleUserRolesUpdated(userId: string, nextRoles: string[]) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, roles: nextRoles } : u)),
    );
    setBannerMessage({
      tone: 'success',
      text: 'Member role assignment updated.',
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#23302B] pb-5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
              Access Control
            </h1>
            <p className="mt-0.5 text-xs text-[#A3B3AC]">
              Inspect organization roles, granted permissions, assigned members, and create custom roles.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-sm transition-colors hover:bg-[#349960] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]"
        >
          <ShieldPlus className="h-4 w-4" />
          Create Custom Role
        </button>
      </header>

      {/* Feedback Banner */}
      {bannerMessage && (
        <div
          role="status"
          className={cn(
            'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs',
            bannerMessage.tone === 'success'
              ? 'border-[#2E8B57]/45 bg-[#1F5C3A]/30 text-[#4CAF7D]'
              : 'border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#38BDF8]',
          )}
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {bannerMessage.text}
          </span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-[11px] font-medium underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Total Roles</span>
            <Crown className="h-4 w-4 text-[#4CAF7D]" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {stats.totalRoles}
          </p>
          <p className="mt-1 text-xs text-[#6E8078]">
            {stats.systemCount} system · {stats.customCount} custom
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Custom Roles</span>
            <ShieldPlus className="h-4 w-4 text-[#38BDF8]" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {stats.customCount}
          </p>
          <p className="mt-1 text-xs text-[#6E8078]">Tailored permission sets</p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Permissions Catalog</span>
            <KeyRound className="h-4 w-4 text-[#4CAF7D]" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {stats.totalPermissions}
          </p>
          <p className="mt-1 text-xs text-[#6E8078]">Across 6 system modules</p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Assigned Accounts</span>
            <Users className="h-4 w-4 text-[#4CAF7D]" />
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {stats.totalUsers}
          </p>
          <p className="mt-1 text-xs text-[#6E8078]">Click any role to view members</p>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles or permissions..."
            aria-label="Search roles or permissions"
            className="h-10 w-full rounded-xl border border-[#23302B] bg-[#131A17] pl-10 pr-4 text-xs text-[#F0F5F2] placeholder-[#6E8078] focus:border-[#4CAF7D] focus:outline-none"
          />
        </div>

        <div className="inline-flex items-center gap-1 rounded-xl border border-[#23302B] bg-[#131A17] p-1">
          {(['all', 'system', 'custom'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setRoleTypeFilter(filter)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                roleTypeFilter === filter
                  ? 'bg-[#2E8B57] text-[#F0F5F2]'
                  : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
              )}
            >
              {filter === 'all' ? 'All Roles' : `${filter} Roles`}
            </button>
          ))}
        </div>
      </div>

      {/* Role Cards Grid */}
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((skeleton) => (
            <div
              key={skeleton}
              className="h-60 animate-pulse rounded-3xl border border-[#23302B] bg-[#131A17]/70 p-6"
            />
          ))}
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#23302B] bg-[#131A17]/60 px-6 py-14 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-[#6E8078]" />
          <p className="mt-3 text-sm font-semibold text-[#F0F5F2]">No matching roles found</p>
          <p className="mt-1 text-xs text-[#6E8078]">
            Try clearing your search filter or create a new custom role.
          </p>
        </div>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredRoles.map((role) => {
            const assignedMembers = membersByRoleName.get(role.name) ?? [];
            const memberCount = users.length > 0 ? assignedMembers.length : role.userCount;
            const visiblePerms = role.permissions.slice(0, MAX_VISIBLE_PERMS_PER_CARD);
            const remainingPerms = Math.max(
              0,
              role.permissions.length - visiblePerms.length,
            );

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className="group flex flex-col rounded-3xl border border-[#23302B] bg-[#131A17] p-6 text-left transition-all duration-200 hover:border-[#2E8B57]/60 hover:bg-[#131A17]/90 hover:shadow-[0_12px_32px_-12px_rgba(46,139,87,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CAF7D]"
              >
                {/* Role Card Top */}
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                        role.isSystem
                          ? 'border-[#2E8B57]/40 bg-[#1F5C3A]/35 text-[#4CAF7D]'
                          : 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8]',
                      )}
                    >
                      {role.isSystem ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-heading text-base font-bold text-[#F0F5F2]">
                          {role.displayName}
                        </h2>
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            role.isSystem
                              ? 'border-[#2E8B57]/40 bg-[#1F5C3A]/30 text-[#4CAF7D]'
                              : 'border-[#38BDF8]/40 bg-[#38BDF8]/15 text-[#38BDF8]',
                          )}
                        >
                          {role.isSystem ? 'System' : 'Custom'}
                        </span>
                      </div>
                      <code className="mt-0.5 inline-block font-mono text-[11px] text-[#6E8078]">
                        {role.name}
                      </code>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-2.5 py-1.5 text-[11px] font-medium text-[#A3B3AC] transition-colors group-hover:border-[#2E8B57]/50 group-hover:text-[#F0F5F2]">
                    <Users className="h-3.5 w-3.5 text-[#4CAF7D]" />
                    <span>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#6E8078] transition-transform group-hover:translate-x-0.5 group-hover:text-[#4CAF7D]" />
                  </span>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs leading-relaxed text-[#A3B3AC]">
                  {role.description}
                </p>

                {/* Granted Permissions Preview */}
                <div className="mt-4 w-full flex-1 rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/65 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E8078]">
                      Granted Permissions
                    </span>
                    <span className="text-[11px] font-medium text-[#4CAF7D]">
                      {role.permissions.length} total
                    </span>
                  </div>

                  {role.permissions.length === 0 ? (
                    <p className="text-xs text-[#6E8078]">No permissions assigned.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {visiblePerms.map((perm) => {
                        const meta = PERMISSION_CATALOG_BY_KEY[perm.key];
                        return (
                          <span
                            key={perm.key}
                            title={`${perm.key} (${SCOPE_LABELS[perm.scope] ?? perm.scope})`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1 text-[11px] text-[#F0F5F2]"
                          >
                            <span>{meta?.label ?? perm.key}</span>
                            <span className="rounded bg-[#1F5C3A]/45 px-1.5 py-0.2 text-[9px] font-semibold uppercase text-[#4CAF7D]">
                              {perm.scope}
                            </span>
                          </span>
                        );
                      })}
                      {remainingPerms > 0 && (
                        <span className="inline-flex items-center rounded-lg border border-[#2E8B57]/35 bg-[#1F5C3A]/25 px-2.5 py-1 text-[11px] font-medium text-[#4CAF7D]">
                          +{remainingPerms} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Member Avatars Footer */}
                <div className="mt-4 flex w-full items-center justify-between border-t border-[#23302B]/70 pt-3.5">
                  <div className="flex items-center gap-2">
                    {assignedMembers.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {assignedMembers.slice(0, 4).map((member) => (
                            <span
                              key={member.id}
                              title={member.displayName}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#131A17] bg-[#1A2420] text-[10px] font-bold text-[#4CAF7D]"
                            >
                              {getInitials(member.displayName)}
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] text-[#6E8078]">
                          {assignedMembers
                            .slice(0, 2)
                            .map((m) => m.displayName.split(' ')[0])
                            .join(', ')}
                          {assignedMembers.length > 2
                            ? ` +${assignedMembers.length - 2} others`
                            : ''}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#6E8078]">
                        No members assigned yet
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-[#4CAF7D] group-hover:underline">
                    View members
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      )}

              {/* Right-Side Drawer: Members & Full Permissions for Clicked Role */}
      <RoleMembersDrawer
        role={selectedRole}
        members={selectedRoleMembers}
        allUsers={users}
        currentUserId={currentUser?.userId}
        onClose={() => setSelectedRoleId(null)}
        onEditRole={(roleToEdit) => {
          setEditingRole(roleToEdit);
          setCreateModalOpen(true);
        }}
        onRoleDeleted={handleRoleDeleted}
        onUserRolesUpdated={handleUserRolesUpdated}
      />

      {/* Modal: Create / Edit Custom Role */}
      <CreateRoleModal
        open={createModalOpen}
        editingRole={editingRole}
        existingRoleNames={roles.map((r) => r.name)}
        permissionCatalog={permissionCatalog}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingRole(null);
        }}
        onRoleCreated={handleRoleCreated}
        onRoleUpdated={handleRoleUpdated}
      />
    </motion.div>
  );
}
