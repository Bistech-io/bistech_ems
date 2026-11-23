'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crown,
  Edit2,
  Loader2,
  Network,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import {
  assignDepartmentHead,
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  fetchRoles,
  fetchUsers,
  updateDepartment,
  updateUserRoles,
  type DepartmentItem,
  type RoleItem,
  type UserItem,
} from '../api';

type LeadershipTab = 'all' | 'hr' | 'heads';

const EASE = [0.22, 1, 0.36, 1] as const;

export function LeadershipDashboard() {
  const { user: currentAuthUser } = useAuth();

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<LeadershipTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [manageDeptsModalOpen, setManageDeptsModalOpen] = useState(false);
  const [deptFormOpen, setDeptFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  const [assignHrOpen, setAssignHrOpen] = useState(false);
  const [selectedHrCandidateUserId, setSelectedHrCandidateUserId] = useState('');
  const [revokeHrTarget, setRevokeHrTarget] = useState<UserItem | null>(null);

  const [headModalDept, setHeadModalDept] = useState<DepartmentItem | null>(null);
  const [selectedHeadEmployeeId, setSelectedHeadEmployeeId] = useState('');

  // Initial data load
  async function loadData() {
    try {
      setErrorMessage(null);
      const [deptData, userData, roleData] = await Promise.all([
        fetchDepartments(),
        fetchUsers(),
        fetchRoles(),
      ]);
      setDepartments(deptData);
      setUsers(userData);
      setRoles(roleData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load governance data';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered HR Managers
  const hrUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const isHr = u.roles.includes('hr_manager');
      if (!isHr) return false;
      if (!q) return true;
      const empName = u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : '';
      const empCode = u.employee?.employeeCode ?? '';
      const deptNameStr = u.employee?.department?.name ?? '';
      return (
        u.email.toLowerCase().includes(q) ||
        empName.toLowerCase().includes(q) ||
        empCode.toLowerCase().includes(q) ||
        deptNameStr.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery]);

  // Non-HR active employees who can be promoted to HR Manager
  const nonHrCandidates = useMemo(() => {
    return users.filter(
      (u) =>
        u.employee !== null &&
        u.employee?.employmentStatus === 'active' &&
        !u.roles.includes('hr_manager'),
    );
  }, [users]);

  // All active employees for Department Head assignment
  const activeEmployees = useMemo(() => {
    const list: Array<{
      employeeId: string;
      name: string;
      code: string;
      departmentName: string;
      designationTitle: string;
    }> = [];

    for (const u of users) {
      if (u.employee && u.employee.employmentStatus === 'active') {
        list.push({
          employeeId: u.employee.id,
          name: `${u.employee.firstName} ${u.employee.lastName}`.trim(),
          code: u.employee.employeeCode,
          departmentName: u.employee.department?.name ?? 'Unassigned',
          designationTitle: u.employee.designation?.title ?? 'Staff',
        });
      }
    }
    return list;
  }, [users]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return departments.filter((d) => {
      if (!q) return true;
      const headName = d.headEmployee?.name ?? '';
      const headCode = d.headEmployee?.employeeCode ?? '';
      return (
        d.name.toLowerCase().includes(q) ||
        headName.toLowerCase().includes(q) ||
        headCode.toLowerCase().includes(q)
      );
    });
  }, [departments, searchQuery]);

  // Stats
  const totalHrCount = useMemo(() => {
    return users.filter((u) => u.roles.includes('hr_manager')).length;
  }, [users]);

  const coveredDeptCount = useMemo(() => {
    return departments.filter((d) => d.headEmployeeId !== null).length;
  }, [departments]);

  const unassignedDeptCount = departments.length - coveredDeptCount;

  // Actions
  async function handleAssignHr() {
    if (!selectedHrCandidateUserId) return;
    const targetUser = users.find((u) => u.id === selectedHrCandidateUserId);
    if (!targetUser) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const updatedRoles = Array.from(new Set([...targetUser.roles, 'hr_manager']));
      await updateUserRoles(targetUser.id, { roles: updatedRoles });
      await loadData();
      setAssignHrOpen(false);
      setSelectedHrCandidateUserId('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to assign HR Manager role');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevokeHr() {
    if (!revokeHrTarget) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const updatedRoles = revokeHrTarget.roles.filter((r) => r !== 'hr_manager');
      await updateUserRoles(revokeHrTarget.id, { roles: updatedRoles });
      await loadData();
      setRevokeHrTarget(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to revoke HR Manager role');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openHeadModal(dept: DepartmentItem) {
    setHeadModalDept(dept);
    setSelectedHeadEmployeeId(dept.headEmployeeId ?? '');
  }

  async function handleSaveDepartmentHead() {
    if (!headModalDept) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await assignDepartmentHead(headModalDept.id, {
        employeeId: selectedHeadEmployeeId || null,
      });
      await loadData();
      setHeadModalDept(null);
      setSelectedHeadEmployeeId('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update department head');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateDeptModal() {
    setEditingDept(null);
    setDeptName('');
    setDeptDesc('');
    setDeptFormOpen(true);
  }

  function openEditDeptModal(dept: DepartmentItem) {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDesc(dept.description ?? '');
    setDeptFormOpen(true);
  }

  async function handleSaveDeptForm() {
    const trimmed = deptName.trim();
    if (!trimmed) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: trimmed,
          description: deptDesc.trim() || undefined,
        });
      } else {
        await createDepartment({
          name: trimmed,
          description: deptDesc.trim() || undefined,
        });
      }
      await loadData();
      setDeptFormOpen(false);
      setEditingDept(null);
      setDeptName('');
      setDeptDesc('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDept(deptId: string) {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await deleteDepartment(deptId);
      await loadData();
      setDeptFormOpen(false);
      setEditingDept(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to archive department');
    } finally {
      setIsSubmitting(false);
    }
  }

  const showHrSection = activeTab === 'all' || activeTab === 'hr';
  const showHeadsSection = activeTab === 'all' || activeTab === 'heads';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
      className="space-y-6"
    >
      {/* Top Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#23302B] pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/30 px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-[#4CAF7D] uppercase">
            <Crown className="h-3.5 w-3.5" />
            <span>Super Admin Governance</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            Manage HR &amp; Department Heads
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#A3B3AC]">
            Assign or revoke HR Manager roles and manage Department Head ownership across the
            organization. Every change is transactionally audited.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setManageDeptsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 py-2.5 text-sm font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
          >
            <Building2 className="h-4 w-4" />
            <span>Create or Change on Departments</span>
          </button>
        </div>
      </header>

      {/* Global Error Notice */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-2xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-sm text-[#EF4444]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-lg p-1 text-[#EF4444] hover:bg-[#EF4444]/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Active HR Managers</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {isLoading ? '...' : totalHrCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Departments Covered</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <Network className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {isLoading ? '...' : `${coveredDeptCount} / ${departments.length}`}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Unassigned Heads</span>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl',
                unassignedDeptCount > 0
                  ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                  : 'bg-[#1F5C3A]/40 text-[#4CAF7D]',
              )}
            >
              {unassignedDeptCount > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {isLoading ? '...' : unassignedDeptCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Total System Roles</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {isLoading ? '...' : roles.length}
          </p>
        </div>
      </section>

      {/* Controls: Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Leadership sections"
          className="inline-flex rounded-2xl border border-[#23302B] bg-[#131A17] p-1"
        >
          {(
            [
              { id: 'all', label: 'All Leadership' },
              { id: 'hr', label: `HR Managers (${totalHrCount})` },
              { id: 'heads', label: `Department Heads (${coveredDeptCount})` },
            ] as const
          ).map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'relative rounded-xl px-3.5 py-2 text-xs font-medium transition-colors',
                  selected ? 'text-[#F0F5F2]' : 'text-[#A3B3AC] hover:text-[#F0F5F2]',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="leadership-tab-pill"
                    transition={{ duration: 0.2, ease: EASE }}
                    className="absolute inset-0 rounded-xl bg-[#2E8B57]/90 shadow-sm"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, BST code, or departme..."
            className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] transition-colors outline-none focus:border-[#4CAF7D]"
          />
        </div>
      </div>

      {/* Main Tables */}
      <div className="space-y-6">
        {/* HR Managers Table */}
        {showHrSection && (
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold text-[#F0F5F2]">HR Managers</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedHrCandidateUserId(nonHrCandidates[0]?.id ?? '');
                  setAssignHrOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#23302B] bg-[#1A2420] px-3 py-1.5 text-xs font-medium text-[#4CAF7D] transition-colors hover:border-[#2E8B57]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add HR</span>
              </button>
            </div>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#4CAF7D]" />
              </div>
            ) : hrUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#23302B] bg-[#0B0F0E]/60 px-4 py-8 text-center text-sm text-[#6E8078]">
                No HR Managers match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#23302B] text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                      <th className="pb-3 pr-4">Code</th>
                      <th className="pb-3 pr-4">HR Manager</th>
                      <th className="pb-3 pr-4">Department</th>
                      <th className="pb-3 pr-4">Attendance</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23302B]/60">
                    {hrUsers.map((u) => {
                      const empName = u.employee
                        ? `${u.employee.firstName} ${u.employee.lastName}`.trim()
                        : u.email.split('@')[0];
                      const empCode = u.employee?.employeeCode ?? '—';
                      const deptName = u.employee?.department?.name ?? '—';
                      const initials = empName
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <tr key={u.id} className="transition-colors hover:bg-[#1A2420]/60">
                          <td className="py-3.5 pr-4 text-xs font-mono text-[#A3B3AC]">{empCode}</td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F5C3A] text-xs font-semibold text-[#4CAF7D]">
                                {initials}
                              </span>
                              <div>
                                <div className="font-medium text-[#F0F5F2]">{empName}</div>
                                <div className="text-xs text-[#6E8078]">
                                  @{u.email.split('@')[0]} · {u.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-[#A3B3AC]">{deptName}</td>
                          <td className="py-3.5 pr-4">
                            <span className="inline-flex items-center rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#38BDF8]">
                              Arriving
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setRevokeHrTarget(u)}
                              disabled={u.id === currentAuthUser?.userId}
                              title={
                                u.id === currentAuthUser?.userId
                                  ? 'Self-modification not allowed'
                                  : undefined
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#23302B] px-2.5 py-1.5 text-xs font-medium text-[#A3B3AC] transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              <span>Revoke</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Department Heads Table */}
        {showHeadsSection && (
          <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-5">
            <div className="mb-4">
              <h2 className="font-heading text-lg font-semibold text-[#F0F5F2]">
                Department Heads
              </h2>
            </div>

            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#4CAF7D]" />
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#23302B] bg-[#0B0F0E]/60 px-4 py-8 text-center text-sm text-[#6E8078]">
                No departments match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#23302B] text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                      <th className="pb-3 pr-4">Department</th>
                      <th className="pb-3 pr-4">Code</th>
                      <th className="pb-3 pr-4">Department Head</th>
                      <th className="pb-3 pr-4">Attendance Status</th>
                      <th className="pb-3 pr-4">Members</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23302B]/60">
                    {filteredDepartments.map((dept) => {
                      const head = dept.headEmployee;
                      const initials = head
                        ? head.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)
                        : '';

                      return (
                        <tr key={dept.id} className="transition-colors hover:bg-[#1A2420]/60">
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2 font-medium text-[#F0F5F2]">
                              <Building2 className="h-4 w-4 text-[#4CAF7D]" />
                              <span>{dept.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-xs font-mono text-[#A3B3AC]">
                            {head?.employeeCode ?? '—'}
                          </td>
                          <td className="py-3.5 pr-4">
                            {head ? (
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F5C3A] text-xs font-semibold text-[#4CAF7D]">
                                  {initials}
                                </span>
                                <div>
                                  <div className="font-medium text-[#F0F5F2]">{head.name}</div>
                                  <div className="text-xs text-[#6E8078]">
                                    {head.employeeCode} · Lead
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#F59E0B]">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 pr-4">
                            {head ? (
                              <span className="inline-flex items-center rounded-full border border-[#38BDF8]/40 bg-[#38BDF8]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#38BDF8]">
                                Arriving
                              </span>
                            ) : (
                              <span className="text-xs text-[#6E8078]">—</span>
                            )}
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-[#A3B3AC]">
                            {dept.activeEmployeeCount ?? 0} staff
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openHeadModal(dept)}
                              className="rounded-xl border border-[#23302B] bg-[#1A2420] px-3 py-1.5 text-xs font-medium text-[#F0F5F2] transition-colors hover:border-[#2E8B57] hover:text-[#4CAF7D]"
                            >
                              {head ? 'Change Head' : 'Assign Head'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {/* MODAL 1: Create or Change on Departments (Matches Screenshot 2) */}
      <AnimatePresence>
        {manageDeptsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-2xl rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#23302B] pb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#4CAF7D]" />
                  <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                    Create or Change on Departments
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openCreateDeptModal}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#23302B] bg-[#1A2420] px-3 py-1.5 text-xs font-medium text-[#4CAF7D] transition-colors hover:border-[#2E8B57]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Department</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManageDeptsModalOpen(false)}
                    aria-label="Close modal"
                    className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Department Cards Grid */}
              <div className="mt-5 grid max-h-[60vh] gap-3.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {departments.map((dept) => {
                  const head = dept.headEmployee;

                  return (
                    <div
                      key={dept.id}
                      onClick={() => openEditDeptModal(dept)}
                      className="group relative rounded-2xl border border-[#23302B] bg-[#0E1512] p-4 transition-colors hover:border-[#2E8B57]/60 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-semibold text-[#F0F5F2]">
                          {dept.name}
                        </span>
                        <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-0.5 text-xs text-[#A3B3AC]">
                          {dept.activeEmployeeCount ?? 0} staff
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs">
                        <span className="text-[#6E8078]">Manager:</span>
                        {head ? (
                          <span className="font-medium text-[#4CAF7D]">
                            {head.name} ({head.employeeCode})
                          </span>
                        ) : (
                          <span className="font-medium text-[#F59E0B]">Unassigned</span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#23302B]/60 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDeptModal(dept);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#A3B3AC] hover:text-[#4CAF7D]"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        {dept.activeEmployeeCount === 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDept(dept.id);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-[#EF4444] hover:underline"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUBMODAL: Create / Edit Department */}
      <AnimatePresence>
        {deptFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-bold text-[#F0F5F2]">
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </h3>
                <button
                  type="button"
                  onClick={() => setDeptFormOpen(false)}
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="dept-name-input" className="block text-xs font-medium text-[#A3B3AC]">
                    Department Name *
                  </label>
                  <input
                    id="dept-name-input"
                    type="text"
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Engineering, Product, Marketing"
                    className="mt-1.5 h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>

                <div>
                  <label htmlFor="dept-desc-input" className="block text-xs font-medium text-[#A3B3AC]">
                    Description
                  </label>
                  <textarea
                    id="dept-desc-input"
                    rows={3}
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Brief department scope or responsibilities..."
                    className="mt-1.5 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] p-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                {editingDept && editingDept.activeEmployeeCount === 0 ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDeleteDept(editingDept.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Archive Department</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeptFormOpen(false)}
                    className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!deptName.trim() || isSubmitting}
                    onClick={handleSaveDeptForm}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingDept ? 'Save Changes' : 'Create Department'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Assign HR Manager */}
      <AnimatePresence>
        {assignHrOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                  Assign HR Manager Role
                </h2>
                <button
                  type="button"
                  onClick={() => setAssignHrOpen(false)}
                  aria-label="Close modal"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[#A3B3AC]">
                Select an active employee to grant organization-wide HR Manager permissions.
              </p>

              <div className="mt-4 space-y-2">
                <label
                  htmlFor="assign-hr-select"
                  className="block text-xs font-medium text-[#A3B3AC]"
                >
                  Employee
                </label>
                <select
                  id="assign-hr-select"
                  value={selectedHrCandidateUserId}
                  onChange={(e) => setSelectedHrCandidateUserId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                >
                  {nonHrCandidates.length === 0 ? (
                    <option value="">All active employees already hold HR Manager</option>
                  ) : (
                    nonHrCandidates.map((u) => {
                      const empName = u.employee
                        ? `${u.employee.firstName} ${u.employee.lastName}`.trim()
                        : u.email;
                      const empCode = u.employee?.employeeCode ?? '';
                      const dept = u.employee?.department?.name ?? 'No Dept';
                      return (
                        <option key={u.id} value={u.id}>
                          {empName} ({empCode}) — {dept}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignHrOpen(false)}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedHrCandidateUserId || isSubmitting}
                  onClick={handleAssignHr}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Grant HR Role</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Revoke HR Manager */}
      <AnimatePresence>
        {revokeHrTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                Revoke HR Manager Role
              </h2>
              <p className="mt-2 text-sm text-[#A3B3AC]">
                Remove{' '}
                <span className="font-medium text-[#F0F5F2]">
                  {revokeHrTarget.employee
                    ? `${revokeHrTarget.employee.firstName} ${revokeHrTarget.employee.lastName}`.trim()
                    : revokeHrTarget.email}
                </span>{' '}
                ({revokeHrTarget.employee?.employeeCode ?? revokeHrTarget.email}) from HR Manager?
                They will retain standard employee access.
              </p>
              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRevokeHrTarget(null)}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRevokeHr}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#EF4444] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Confirm Revoke</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Assign / Change Department Head */}
      <AnimatePresence>
        {headModalDept && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="w-full max-w-md rounded-3xl border border-[#23302B] bg-[#131A17] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-[#F0F5F2]">
                  {headModalDept.name} — Department Head
                </h2>
                <button
                  type="button"
                  onClick={() => setHeadModalDept(null)}
                  aria-label="Close modal"
                  className="rounded-xl p-1.5 text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[#A3B3AC]">
                Updating the head automatically synchronizes the Dept Head role in the database and
                audits the leadership transfer.
              </p>

              <div className="mt-4 space-y-2">
                <label
                  htmlFor="dept-head-select"
                  className="block text-xs font-medium text-[#A3B3AC]"
                >
                  Department Head
                </label>
                <select
                  id="dept-head-select"
                  value={selectedHeadEmployeeId}
                  onChange={(e) => setSelectedHeadEmployeeId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                >
                  <option value="">— Unassigned —</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.name} ({emp.code}) — {emp.departmentName} ({emp.designationTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setHeadModalDept(null)}
                  className="rounded-xl border border-[#23302B] px-4 py-2 text-xs font-medium text-[#A3B3AC] hover:bg-[#1A2420] hover:text-[#F0F5F2]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveDepartmentHead}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Assignment</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
