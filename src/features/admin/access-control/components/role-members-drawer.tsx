'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { putUserRoles, type OrgUserItem } from '@/features/admin/leadership/api';
import { ApiError } from '@/lib/api/errors';
import { useRegisterRightDrawer } from '@/lib/ui/right-drawer';
import { cn } from '@/lib/utils';
import { deleteCustomRole } from '../api';
import {
  PERMISSION_CATALOG_BY_KEY,
  PERMISSION_CATEGORIES,
  SCOPE_LABELS,
  formatRoleDisplayName,
  userHasRole,
  type AccessControlRole,
  type PermissionCategory,
  type RolePermissionGrant,
} from '../types';

const EASE = [0.22, 1, 0.36, 1] as const;

interface RoleMembersDrawerProps {
  role: AccessControlRole | null;
  members: OrgUserItem[];
  allUsers?: OrgUserItem[];
  onClose: () => void;
  onEditRole?: (role: AccessControlRole) => void;
  onRoleDeleted?: (role: AccessControlRole, detachedUsersCount: number) => void;
  onUserRolesUpdated?: (userId: string, nextRoles: string[]) => void;
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
  allUsers = [],
  onClose,
  onEditRole,
  onRoleDeleted,
  onUserRolesUpdated,
}: RoleMembersDrawerProps) {
  useRegisterRightDrawer(Boolean(role), 576);

  const [activeTab, setActiveTab] = useState<'members' | 'permissions'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');
  const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    const timer = setTimeout(() => {
      setConfirmDelete(false);
      setSelectedUserIdToAdd('');
      setDrawerError(null);
    }, 0);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [role, onClose]);

  const assignableUsers = useMemo(() => {
    if (!role || role.isSystem) return [];
    return allUsers
      .filter((u) => !userHasRole(u.roles, role.name))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allUsers, role]);

  async function handleConfirmDeleteRole() {
    if (!role || role.isSystem || isDeleting) return;
    setDrawerError(null);
    setIsDeleting(true);
    try {
      const res = await deleteCustomRole(role.id);
      onRoleDeleted?.(role, res.detachedUsersCount);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setDrawerError(err.message || 'Could not delete custom role.');
      } else {
        setDrawerError('Could not delete custom role. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAssignMember() {
    if (!role || role.isSystem || !selectedUserIdToAdd || mutatingUserId) return;
    const targetUser = allUsers.find((u) => u.id === selectedUserIdToAdd);
    if (!targetUser) return;

    setDrawerError(null);
    setMutatingUserId(targetUser.id);
    try {
      const nextRoles = Array.from(new Set([...targetUser.roles, role.name]));
      const updated = await putUserRoles(targetUser.id, nextRoles);
      onUserRolesUpdated?.(targetUser.id, updated.roles);
      setSelectedUserIdToAdd('');
    } catch (err) {
      if (err instanceof ApiError) {
        setDrawerError(err.message || 'Could not assign user to this role.');
      } else {
        setDrawerError('Could not assign user to this role. Please try again.');
      }
    } finally {
      setMutatingUserId(null);
    }
  }

  async function handleRemoveMember(targetUser: OrgUserItem) {
    if (!role || role.isSystem || mutatingUserId) return;
    setDrawerError(null);
    setMutatingUserId(targetUser.id);
    try {
      const remaining = targetUser.roles.filter(
        (r) => r.toLowerCase() !== role.name.toLowerCase(),
      );
      const nextRoles = remaining.length > 0 ? remaining : ['employee'];
      const updated = await putUserRoles(targetUser.id, nextRoles);
      onUserRolesUpdated?.(targetUser.id, updated.roles);
    } catch (err) {
      if (err instanceof ApiError) {
        setDrawerError(err.message || 'Could not remove user from this role.');
      } else {
        setDrawerError('Could not remove user from this role. Please try again.');
      }
    } finally {
      setMutatingUserId(null);
    }
  }

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

                <div className="flex items-center gap-1.5">
                  {!role.isSystem && onEditRole && (
                    <button
                      type="button"
                      onClick={() => onEditRole(role)}
                      aria-label={`Edit ${role.displayName}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#23302B] bg-[#0B0F0E] px-2.5 text-[11px] font-medium text-[#A3B3AC] transition-colors hover:border-[#2E8B57]/60 hover:text-[#4CAF7D]"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {!role.isSystem && onRoleDeleted && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete((prev) => !prev)}
                      aria-label={`Delete ${role.displayName}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-2.5 text-[11px] font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/20"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close role details drawer"
                    className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {confirmDelete && !role.isSystem && (
                <div className="mt-4 rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-3.5 text-xs">
                  <p className="font-medium text-[#F0F5F2]">
                    Delete custom role &ldquo;{role.displayName}&rdquo;?
                  </p>
                  <p className="mt-1 text-[11px] text-[#A3B3AC]">
                    {members.length > 0
                      ? `${members.length} assigned member(s) will lose this role (their baseline Employee role will be preserved).`
                      : 'This role has no assigned members and will be permanently removed.'}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleConfirmDeleteRole}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#EF4444] px-3 text-[11px] font-semibold text-white hover:bg-[#DC2626] disabled:opacity-50"
                    >
                      {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => setConfirmDelete(false)}
                      className="h-8 rounded-lg border border-[#23302B] bg-[#0B0F0E] px-3 text-[11px] font-medium text-[#A3B3AC] hover:text-[#F0F5F2]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {drawerError && (
                <div
                  role="alert"
                  className="mt-3 flex items-center gap-2 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{drawerError}</span>
                </div>
              )}

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
                  {!role.isSystem && onUserRolesUpdated && (
                    <div className="rounded-2xl border border-[#23302B] bg-[#0B0F0E]/80 p-3.5">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4CAF7D]">
                        Assign Member to Role
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Select user to assign ${role.displayName}`}
                          value={selectedUserIdToAdd}
                          onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                          className="h-9 min-w-0 flex-1 rounded-xl border border-[#23302B] bg-[#131A17] px-3 text-xs text-[#F0F5F2] focus:border-[#4CAF7D] focus:outline-none"
                        >
                          <option value="">
                            {assignableUsers.length === 0
                              ? 'All organization users already hold this role'
                              : 'Select a user to add...'}
                          </option>
                          {assignableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.displayName}
                              {u.employee?.employeeCode
                                ? ` (${u.employee.employeeCode})`
                                : ` (@${u.username})`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedUserIdToAdd || Boolean(mutatingUserId)}
                          onClick={handleAssignMember}
                          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#2E8B57] px-3 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#349960] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {mutatingUserId === selectedUserIdToAdd ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="h-3.5 w-3.5" />
                          )}
                          Assign
                        </button>
                      </div>
                    </div>
                  )}

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

                                <div className="flex items-center gap-2">
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
                                  {!role.isSystem && onUserRolesUpdated && (
                                    <button
                                      type="button"
                                      disabled={mutatingUserId === user.id}
                                      onClick={() => handleRemoveMember(user)}
                                      aria-label={`Remove ${user.displayName} from ${role.displayName}`}
                                      className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#23302B] bg-[#131A17] px-2 text-[10px] font-medium text-[#A3B3AC] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:opacity-50"
                                    >
                                      {mutatingUserId === user.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <UserMinus className="h-3 w-3" />
                                      )}
                                      Remove
                                    </button>
                                  )}
                                </div>
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
                        <div className="flex items-center justify-between border-b border-[#23302B]/80 bg-[#1A2420] px-4 py-2.5">
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
