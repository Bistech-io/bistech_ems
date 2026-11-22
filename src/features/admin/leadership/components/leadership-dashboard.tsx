'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crown,
  History,
  Network,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

type LeadershipTab = 'all' | 'hr' | 'heads';

interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  email: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  status: 'active' | 'invited';
  isHrManager: boolean;
  assignedAt?: string;
}

interface DepartmentRecord {
  id: string;
  name: string;
  headEmployeeId: string | null;
  teamCount: number;
  memberCount: number;
}

interface GovernanceEvent {
  id: string;
  action: 'role.changed' | 'department.head.changed';
  summary: string;
  actor: string;
  timestamp: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp-1',
    code: 'BST-00102',
    name: 'Nadia Rahman',
    email: 'nadia.rahman@bistech.io',
    departmentId: 'dept-people',
    departmentName: 'People Operations',
    designation: 'Lead HR Partner',
    status: 'active',
    isHrManager: true,
    assignedAt: '2026-03-12',
  },
  {
    id: 'emp-2',
    code: 'BST-00108',
    name: 'Tariq Hasan',
    email: 'tariq.hasan@bistech.io',
    departmentId: 'dept-people',
    departmentName: 'People Operations',
    designation: 'HR Operations Specialist',
    status: 'active',
    isHrManager: true,
    assignedAt: '2026-06-04',
  },
  {
    id: 'emp-3',
    code: 'BST-00103',
    name: 'Farhan Ahmed',
    email: 'farhan.ahmed@bistech.io',
    departmentId: 'dept-eng',
    departmentName: 'Engineering',
    designation: 'Principal Engineer',
    status: 'active',
    isHrManager: false,
  },
  {
    id: 'emp-4',
    code: 'BST-00105',
    name: 'Samira Chowdhury',
    email: 'samira.chowdhury@bistech.io',
    departmentId: 'dept-product',
    departmentName: 'Product & Design',
    designation: 'Product Director',
    status: 'active',
    isHrManager: false,
  },
  {
    id: 'emp-5',
    code: 'BST-00111',
    name: 'Rafiul Karim',
    email: 'rafiul.karim@bistech.io',
    departmentId: 'dept-finance',
    departmentName: 'Finance & Legal',
    designation: 'Finance Controller',
    status: 'active',
    isHrManager: false,
  },
  {
    id: 'emp-6',
    code: 'BST-00115',
    name: 'Mehedi Alam',
    email: 'mehedi.alam@bistech.io',
    departmentId: 'dept-eng',
    departmentName: 'Engineering',
    designation: 'Staff Backend Engineer',
    status: 'active',
    isHrManager: false,
  },
  {
    id: 'emp-7',
    code: 'BST-00119',
    name: 'Tasnim Kabir',
    email: 'tasnim.kabir@bistech.io',
    departmentId: 'dept-growth',
    departmentName: 'Growth & Sales',
    designation: 'Growth Lead',
    status: 'active',
    isHrManager: false,
  },
];

const INITIAL_DEPARTMENTS: DepartmentRecord[] = [
  {
    id: 'dept-eng',
    name: 'Engineering',
    headEmployeeId: 'emp-3',
    teamCount: 4,
    memberCount: 28,
  },
  {
    id: 'dept-product',
    name: 'Product & Design',
    headEmployeeId: 'emp-4',
    teamCount: 2,
    memberCount: 11,
  },
  {
    id: 'dept-people',
    name: 'People Operations',
    headEmployeeId: 'emp-1',
    teamCount: 1,
    memberCount: 6,
  },
  {
    id: 'dept-finance',
    name: 'Finance & Legal',
    headEmployeeId: 'emp-5',
    teamCount: 1,
    memberCount: 5,
  },
  {
    id: 'dept-growth',
    name: 'Growth & Sales',
    headEmployeeId: null,
    teamCount: 2,
    memberCount: 9,
  },
];

const INITIAL_EVENTS: GovernanceEvent[] = [
  {
    id: 'evt-1',
    action: 'department.head.changed',
    summary: 'Assigned Farhan Ahmed (BST-00103) as Head of Engineering',
    actor: 'Super Admin',
    timestamp: '2 days ago',
  },
  {
    id: 'evt-2',
    action: 'role.changed',
    summary: 'Granted HR Manager role to Tariq Hasan (BST-00108)',
    actor: 'Super Admin',
    timestamp: '5 days ago',
  },
];

export function LeadershipDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_EMPLOYEES);
  const [departments, setDepartments] = useState<DepartmentRecord[]>(INITIAL_DEPARTMENTS);
  const [events, setEvents] = useState<GovernanceEvent[]>(INITIAL_EVENTS);

  const [activeTab, setActiveTab] = useState<LeadershipTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [assignHrOpen, setAssignHrOpen] = useState(false);
  const [selectedHrCandidateId, setSelectedHrCandidateId] = useState('');
  const [revokeHrTarget, setRevokeHrTarget] = useState<EmployeeRecord | null>(null);

  const [headModalDept, setHeadModalDept] = useState<DepartmentRecord | null>(null);
  const [selectedHeadEmployeeId, setSelectedHeadEmployeeId] = useState('');

  const employeeById = useMemo(() => {
    const map = new Map<string, EmployeeRecord>();
    for (const emp of employees) map.set(emp.id, emp);
    return map;
  }, [employees]);

  const hrManagers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      if (!emp.isHrManager) return false;
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        emp.departmentName.toLowerCase().includes(q)
      );
    });
  }, [employees, searchQuery]);

  const nonHrCandidates = useMemo(
    () => employees.filter((emp) => !emp.isHrManager && emp.status === 'active'),
    [employees],
  );

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return departments.filter((dept) => {
      if (!q) return true;
      const head = dept.headEmployeeId ? employeeById.get(dept.headEmployeeId) : null;
      return (
        dept.name.toLowerCase().includes(q) ||
        Boolean(head?.name.toLowerCase().includes(q)) ||
        Boolean(head?.code.toLowerCase().includes(q))
      );
    });
  }, [departments, employeeById, searchQuery]);

  const totalHrCount = useMemo(
    () => employees.filter((e) => e.isHrManager).length,
    [employees],
  );
  const coveredDeptCount = useMemo(
    () => departments.filter((d) => d.headEmployeeId !== null).length,
    [departments],
  );
  const unassignedDeptCount = departments.length - coveredDeptCount;

  function handleAssignHr() {
    if (!selectedHrCandidateId) return;
    const target = employeeById.get(selectedHrCandidateId);
    if (!target) return;

    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === selectedHrCandidateId
          ? { ...emp, isHrManager: true, assignedAt: '2026-11-18' }
          : emp,
      ),
    );
    setEvents((prev) => [
      {
        id: `evt-${Date.now()}`,
        action: 'role.changed',
        summary: `Granted HR Manager role to ${target.name} (${target.code})`,
        actor: user?.name || 'Super Admin',
        timestamp: 'Just now',
      },
      ...prev,
    ]);
    setSelectedHrCandidateId('');
    setAssignHrOpen(false);
  }

  function handleRevokeHr() {
    if (!revokeHrTarget) return;
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === revokeHrTarget.id
          ? { ...emp, isHrManager: false, assignedAt: undefined }
          : emp,
      ),
    );
    setEvents((prev) => [
      {
        id: `evt-${Date.now()}`,
        action: 'role.changed',
        summary: `Revoked HR Manager role from ${revokeHrTarget.name} (${revokeHrTarget.code})`,
        actor: user?.name || 'Super Admin',
        timestamp: 'Just now',
      },
      ...prev,
    ]);
    setRevokeHrTarget(null);
  }

  function openHeadModal(dept: DepartmentRecord) {
    setHeadModalDept(dept);
    setSelectedHeadEmployeeId(dept.headEmployeeId ?? '');
  }

  function handleSaveDepartmentHead() {
    if (!headModalDept) return;
    const nextHeadId = selectedHeadEmployeeId || null;
    const nextHead = nextHeadId ? employeeById.get(nextHeadId) : null;

    setDepartments((prev) =>
      prev.map((dept) =>
        dept.id === headModalDept.id ? { ...dept, headEmployeeId: nextHeadId } : dept,
      ),
    );

    setEvents((prev) => [
      {
        id: `evt-${Date.now()}`,
        action: 'department.head.changed',
        summary: nextHead
          ? `Assigned ${nextHead.name} (${nextHead.code}) as Head of ${headModalDept.name}`
          : `Cleared Department Head for ${headModalDept.name}`,
        actor: user?.name || 'Super Admin',
        timestamp: 'Just now',
      },
      ...prev,
    ]);

    setHeadModalDept(null);
    setSelectedHeadEmployeeId('');
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
      {/* Header */}
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
            onClick={() => {
              setSelectedHrCandidateId(nonHrCandidates[0]?.id ?? '');
              setAssignHrOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 py-2.5 text-sm font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Assign HR Manager</span>
          </button>
        </div>
      </header>

      {/* KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Active HR Managers</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">{totalHrCount}</p>
          <p className="mt-1 text-xs text-[#6E8078]">Org-wide HR &amp; attendance scope</p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Departments Covered</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <Network className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">
            {coveredDeptCount} / {departments.length}
          </p>
          <p className="mt-1 text-xs text-[#6E8078]">Managed-scope department heads</p>
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
            {unassignedDeptCount}
          </p>
          <p className="mt-1 text-xs text-[#6E8078]">
            {unassignedDeptCount > 0
              ? 'Requires Department Head assignment'
              : 'All departments have an active head'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#23302B] bg-[#131A17] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3B3AC]">Security Guardrails</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1F5C3A]/40 text-[#4CAF7D]">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold text-[#F0F5F2]">Enforced</p>
          <p className="mt-1 text-xs text-[#6E8078]">
            Super Admin only · Audit logged
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

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, BST code, or dept..."
            className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] transition-colors outline-none focus:border-[#4CAF7D]"
          />
        </div>
      </div>

      {/* Main Grid: Leadership Tables + Governance Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* HR Managers Table */}
          {showHrSection && (
            <section className="rounded-3xl border border-[#23302B] bg-[#131A17] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-[#F0F5F2]">
                    HR Managers
                  </h2>
                  <p className="text-xs text-[#A3B3AC]">
                    Org-wide employee onboarding, profile, and attendance correction access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHrCandidateId(nonHrCandidates[0]?.id ?? '');
                    setAssignHrOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#23302B] bg-[#1A2420] px-3 py-1.5 text-xs font-medium text-[#4CAF7D] transition-colors hover:border-[#2E8B57]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add HR</span>
                </button>
              </div>

              {hrManagers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#23302B] bg-[#0B0F0E]/60 px-4 py-8 text-center text-sm text-[#6E8078]">
                  No HR Managers match your search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#23302B] text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                        <th className="pb-3 pr-4">Employee</th>
                        <th className="pb-3 pr-4">Department</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23302B]/60">
                      {hrManagers.map((emp) => (
                        <tr
                          key={emp.id}
                          className="transition-colors hover:bg-[#1A2420]/60"
                        >
                          <td className="py-3.5 pr-4">
                            <div className="font-medium text-[#F0F5F2]">{emp.name}</div>
                            <div className="text-xs text-[#6E8078]">
                              {emp.code} · {emp.email}
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-xs text-[#A3B3AC]">
                            {emp.departmentName}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2E8B57]/40 bg-[#1F5C3A]/35 px-2.5 py-0.5 text-[11px] font-medium text-[#4CAF7D]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF7D]" />
                              HR Manager
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setRevokeHrTarget(emp)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#23302B] px-2.5 py-1.5 text-xs font-medium text-[#A3B3AC] transition-colors hover:border-[#EF4444]/40 hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                              <span>Revoke</span>
                            </button>
                          </td>
                        </tr>
                      ))}
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
                <p className="text-xs text-[#A3B3AC]">
                  Assigning a head grants the Dept Head role for that department&apos;s teams,
                  attendance, and task reviews.
                </p>
              </div>

              {filteredDepartments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#23302B] bg-[#0B0F0E]/60 px-4 py-8 text-center text-sm text-[#6E8078]">
                  No departments match your search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#23302B] text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                        <th className="pb-3 pr-4">Department</th>
                        <th className="pb-3 pr-4">Assigned Head</th>
                        <th className="pb-3 pr-4">Scope</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#23302B]/60">
                      {filteredDepartments.map((dept) => {
                        const head = dept.headEmployeeId
                          ? employeeById.get(dept.headEmployeeId)
                          : null;

                        return (
                          <tr
                            key={dept.id}
                            className="transition-colors hover:bg-[#1A2420]/60"
                          >
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-2 font-medium text-[#F0F5F2]">
                                <Building2 className="h-4 w-4 text-[#4CAF7D]" />
                                <span>{dept.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 pr-4">
                              {head ? (
                                <div>
                                  <div className="font-medium text-[#F0F5F2]">{head.name}</div>
                                  <div className="text-xs text-[#6E8078]">
                                    {head.code} · {head.designation}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#F59E0B]">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 pr-4 text-xs text-[#A3B3AC]">
                              {dept.teamCount} teams · {dept.memberCount} staff
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

        {/* Right Column: Governance Rules & Recent Activity */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-[#23302B] bg-[#131A17] p-5">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#4CAF7D]" />
              <h2 className="font-heading text-base font-semibold text-[#F0F5F2]">
                Recent Governance Changes
              </h2>
            </div>
            <ul className="mt-4 space-y-3">
              {events.slice(0, 6).map((evt) => (
                <li
                  key={evt.id}
                  className="rounded-2xl border border-[#23302B]/80 bg-[#0B0F0E]/70 p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-[#1F5C3A]/40 px-2 py-0.5 text-[10px] font-semibold text-[#4CAF7D]">
                      {evt.action}
                    </span>
                    <span className="text-[11px] text-[#6E8078]">{evt.timestamp}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#F0F5F2]">{evt.summary}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-[#23302B] bg-[#131A17] p-5">
            <h3 className="font-heading text-sm font-semibold text-[#F0F5F2]">
              RBAC Policy Guardrails
            </h3>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#A3B3AC]">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4CAF7D]" />
                <span>Only Super Admin can grant or revoke HR Manager and Dept Head roles.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4CAF7D]" />
                <span>
                  A Department Head cannot be deactivated until replaced (409{' '}
                  <code className="text-[#4CAF7D]">DEPARTMENT_HEAD_REQUIRED</code>).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4CAF7D]" />
                <span>HR Managers cannot modify users holding HR, Dept Head, or Super Admin.</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Assign HR Manager Modal */}
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
                  value={selectedHrCandidateId}
                  onChange={(e) => setSelectedHrCandidateId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#23302B] bg-[#0B0F0E] px-3 text-sm text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
                >
                  {nonHrCandidates.length === 0 ? (
                    <option value="">All active employees already hold HR Manager</option>
                  ) : (
                    nonHrCandidates.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.code}) — {emp.departmentName}
                      </option>
                    ))
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
                  disabled={!selectedHrCandidateId}
                  onClick={handleAssignHr}
                  className="rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Grant HR Role
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revoke HR Confirmation Modal */}
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
                Remove <span className="font-medium text-[#F0F5F2]">{revokeHrTarget.name}</span>{' '}
                ({revokeHrTarget.code}) from HR Manager? They will retain standard Employee access.
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
                  onClick={handleRevokeHr}
                  className="rounded-xl bg-[#EF4444] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Confirm Revoke
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign / Change Department Head Modal */}
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
                Updating the head automatically grants Dept Head permissions for{' '}
                {headModalDept.name} and revokes them from the previous head if they lead no other
                department.
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
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code}) — {emp.departmentName}
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
                  onClick={handleSaveDepartmentHead}
                  className="rounded-xl bg-[#2E8B57] px-4 py-2 text-xs font-semibold text-[#F0F5F2] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
                >
                  Save Assignment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
