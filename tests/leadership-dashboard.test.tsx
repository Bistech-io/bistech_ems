import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadershipDashboard } from '@/features/admin/leadership/components/leadership-dashboard';
import * as leadershipApi from '@/features/admin/leadership/api';
import * as employeesApi from '@/features/employees/api';
import * as attendanceApi from '@/features/attendance/api';

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      userId: 'admin-user-id',
      email: 'admin@bistech.io',
      roles: ['super_admin'],
      fullName: 'Super Admin',
    },
    session: {
      user: {
        id: 'admin-user-id',
        email: 'admin@bistech.io',
        name: 'Super Admin',
      },
      employeeId: 'emp-admin',
    },
    activeRole: 'super_admin',
  }),
}));

describe('LeadershipDashboard Integration', () => {
  const mockDepartments: leadershipApi.LeadershipDepartmentItem[] = [
    {
      id: 'dept-1',
      name: 'Engineering',
      description: 'Tech squad',
      headEmployeeId: 'emp-101',
      activeEmployeeCount: 5,
      headEmployee: {
        id: 'emp-101',
        name: 'Farhan Ahmed',
        employeeCode: 'BST-1002',
      },
    },
    {
      id: 'dept-2',
      name: 'Human Resources',
      description: 'People Ops',
      headEmployeeId: null,
      activeEmployeeCount: 1,
      headEmployee: null,
    },
    {
      id: 'dept-3',
      name: 'Management',
      description: 'Leadership team',
      headEmployeeId: null,
      activeEmployeeCount: 1,
      headEmployee: null,
    },
  ];

  const mockUsers: leadershipApi.OrgUserItem[] = [
    {
      id: 'u-1',
      username: 'nadia',
      email: 'hr@bistech.io',
      displayName: 'Nadia Rahman',
      accountStatus: 'active',
      roles: ['hr_manager'],
      employee: {
        id: 'emp-100',
        employeeCode: 'BST-1001',
        employmentStatus: 'active',
        department: { id: 'dept-2', name: 'Human Resources' },
        designation: { id: 'desig-1', title: 'HR Manager' },
      },
    },
    {
      id: 'u-2',
      username: 'farhan',
      email: 'head@bistech.io',
      displayName: 'Farhan Ahmed',
      accountStatus: 'active',
      roles: ['employee', 'hr_manager', 'dept_head'],
      employee: {
        id: 'emp-101',
        employeeCode: 'BST-1002',
        employmentStatus: 'active',
        department: { id: 'dept-1', name: 'Engineering' },
        designation: { id: 'desig-2', title: 'Lead Engineer' },
      },
    },
  ];

  const mockRoles: leadershipApi.OrgRoleItem[] = [
    { id: 'r-1', name: 'super_admin' },
    { id: 'r-2', name: 'hr_manager' },
    { id: 'r-3', name: 'dept_head' },
    { id: 'r-4', name: 'employee' },
  ];

  beforeEach(() => {
    vi.spyOn(leadershipApi, 'fetchLeadershipDepartments').mockResolvedValue([...mockDepartments]);
    vi.spyOn(leadershipApi, 'fetchOrgUsers').mockResolvedValue([...mockUsers]);
    vi.spyOn(leadershipApi, 'fetchOrgRoles').mockResolvedValue([...mockRoles]);
    vi.spyOn(leadershipApi, 'createLeadershipDepartment').mockResolvedValue({
      id: 'dept-new',
      name: 'Product Squad',
      description: 'Product line',
      headEmployeeId: null,
      activeEmployeeCount: 0,
      headEmployee: null,
    });
    vi.spyOn(leadershipApi, 'putDepartmentHead').mockResolvedValue();
    vi.spyOn(leadershipApi, 'putUserRoles').mockResolvedValue({
      id: 'u-1',
      email: 'hr@bistech.io',
      displayName: 'Nadia Rahman',
      accountStatus: 'active',
      roles: ['employee'],
    });

    vi.spyOn(employeesApi, 'fetchEmployees').mockResolvedValue([]);
    vi.spyOn(employeesApi, 'fetchDesignations').mockResolvedValue([]);
    vi.spyOn(employeesApi, 'fetchTodayOrgAttendance').mockResolvedValue([]);
    vi.spyOn(attendanceApi, 'fetchOrganizationSettings').mockResolvedValue(null);
    vi.spyOn(attendanceApi, 'fetchMyAttendanceBoard').mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders stats matching Screenshot 1 (2 HR managers, 1/3 covered, 2 unassigned, 4 roles)', async () => {
    render(<LeadershipDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Manage HR & Department Heads')).toBeInTheDocument();
    });

    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders HR Managers table and Department Heads table with live data', async () => {
    render(<LeadershipDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Farhan Ahmed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Nadia Rahman')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Engineering').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Management')).toBeInTheDocument();
  });

  it('opens "Create or Change on Departments" modal and displays departments', async () => {
    render(<LeadershipDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create or Change on Departments')).toBeInTheDocument();
    });

    const openBtn = screen.getByRole('button', { name: /create or change on departments/i });
    fireEvent.click(openBtn);

    expect(screen.getByText('New Department')).toBeInTheDocument();
    expect(screen.getAllByText('5 staff').length).toBeGreaterThanOrEqual(1);
  });
});
