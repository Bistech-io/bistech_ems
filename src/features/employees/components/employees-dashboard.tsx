'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { can } from '@/lib/auth/permissions';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import { fetchDepartments, fetchDesignations, fetchEmployees } from '../api';
import type {
  DepartmentOption,
  DesignationOption,
  EmployeeItem,
  EmploymentStatus,
} from '../types';
import { CreateEmployeeModal } from './create-employee-modal';
import { EmployeeProfileModal } from './employee-profile-modal';

const EASE = [0.22, 1, 0.36, 1] as const;

const EMPLOYMENT_TYPE_LABELS: Record<EmployeeItem['employmentType'], string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  intern: 'Intern',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function EmployeesDashboard() {
  const { user, activeRole } = useAuth();
  const canCreate =
    activeRole === 'super_admin' ||
    activeRole === 'hr_manager' ||
    can(user, 'employee.create', 'org');
  const canUpdate =
    activeRole === 'super_admin' ||
    activeRole === 'hr_manager' ||
    can(user, 'employee.update', 'org');

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | ''>('');

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchEmployees().catch(() => [] as EmployeeItem[]),
      fetchDepartments().catch(() => [] as DepartmentOption[]),
      fetchDesignations().catch(() => [] as DesignationOption[]),
    ])
      .then(([empList, deptList, desigList]) => {
        if (cancelled) return;
        setEmployees(empList);
        setDepartments(deptList);
        setDesignations(desigList);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter((emp) => {
      if (departmentFilter && emp.department.id !== departmentFilter) return false;
      if (statusFilter && emp.employmentStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        emp.fullName.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.workEmail.toLowerCase().includes(q) ||
        emp.user.username.toLowerCase().includes(q) ||
        emp.designation.title.toLowerCase().includes(q)
      );
    });
  }, [employees, departmentFilter, statusFilter, searchQuery]);

  const activeCount = useMemo(
    () => employees.filter((e) => e.employmentStatus === 'active').length,
    [employees],
  );

  function handleCreated(newEmp: EmployeeItem) {
    setEmployees((prev) => [newEmp, ...prev]);
  }

  function handleDesignationUpdated(
    employeeId: string,
    nextDesignation: { id: string; title: string },
  ) {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId ? { ...emp, designation: nextDesignation } : emp,
      ),
    );
    setSelectedEmployee((prev) =>
      prev && prev.id === employeeId
        ? { ...prev, designation: nextDesignation }
        : prev,
    );
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
        <div className="flex flex-wrap items-baseline gap-4">
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-[#F0F5F2] md:text-3xl">
            Employees
          </h1>
          <div className="flex items-center gap-2 text-xs text-[#A3B3AC]">
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Total: <strong className="text-[#F0F5F2]">{employees.length}</strong>
            </span>
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Active: <strong className="text-[#4CAF7D]">{activeCount}</strong>
            </span>
            <span className="rounded-lg border border-[#23302B] bg-[#131A17] px-2.5 py-1">
              Departments: <strong className="text-[#F0F5F2]">{departments.length}</strong>
            </span>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2E8B57] px-4 text-xs font-semibold text-[#F0F5F2] shadow-[0_6px_20px_-6px_rgba(46,139,87,0.55)] transition-colors hover:bg-[#4CAF7D] hover:text-[#0B0F0E]"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Employee</span>
          </button>
        )}
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6E8078]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, BST code, email..."
            className="h-10 w-full rounded-2xl border border-[#23302B] bg-[#131A17] pr-3.5 pl-10 text-sm text-[#F0F5F2] placeholder-[#6E8078] outline-none focus:border-[#4CAF7D]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Filter by department"
            className="h-10 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 text-xs font-medium text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EmploymentStatus | '')}
            aria-label="Filter by status"
            className="h-10 rounded-2xl border border-[#23302B] bg-[#131A17] px-3.5 text-xs font-medium text-[#F0F5F2] outline-none focus:border-[#4CAF7D]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <section className="overflow-hidden rounded-3xl border border-[#23302B] bg-[#131A17]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#23302B] border-t-[#4CAF7D]" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#6E8078]">
            No employees found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#23302B] bg-[#0B0F0E]/40 text-[11px] font-semibold tracking-[0.06em] text-[#6E8078] uppercase">
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Designation</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-5 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23302B]/60">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="cursor-pointer transition-colors hover:bg-[#1A2420]/75"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#23302B] bg-[#1A2420] font-heading text-xs font-bold text-[#4CAF7D]">
                          {getInitials(emp.fullName)}
                        </div>
                        <div>
                          <div className="font-medium text-[#F0F5F2]">{emp.fullName}</div>
                          <div className="text-xs text-[#6E8078]">
                            @{emp.user.username} · {emp.workEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#4CAF7D]">
                      {emp.employeeCode}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#A3B3AC]">
                      {emp.department.name}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-[#F0F5F2]">
                      {emp.designation.title}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#A3B3AC]">
                      {EMPLOYMENT_TYPE_LABELS[emp.employmentType]}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize',
                          emp.employmentStatus === 'active'
                            ? 'border-[#2E8B57]/40 bg-[#1F5C3A]/40 text-[#4CAF7D]'
                            : 'border-[#23302B] bg-[#1A2420] text-[#A3B3AC]',
                        )}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Big Create Employee Modal */}
      <CreateEmployeeModal
        open={createOpen}
        departments={departments}
        designations={designations}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {/* Employee Profile & Change Designation Modal */}
      <EmployeeProfileModal
        employee={selectedEmployee}
        designations={designations}
        canEditDesignation={canUpdate}
        onClose={() => setSelectedEmployee(null)}
        onDesignationUpdated={handleDesignationUpdated}
      />
    </motion.div>
  );
}
