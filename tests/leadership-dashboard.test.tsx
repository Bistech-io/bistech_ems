import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeadershipDashboard } from '@/features/admin/leadership/components/leadership-dashboard';
import * as api from '@/features/admin/leadership/api';

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      userId: 'admin-user-id',
      email: 'admin@bistech.io',
      roles: ['super_admin'],
      fullName: 'Super Admin',
    },
    activeRole: 'super_admin',
  }),
}));

describe('LeadershipDashboard Integration', () => {
  const mockDepartments: api.DepartmentItem[] = [
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

  const mockUsers: api.UserItem[] = [
    {
      id: 'u-1',
      email: 'hr@bistech.io',
      roles: ['hr_manager'],
      employee: {
        id: 'emp-100',
        employeeCode: 'BST-1001',
        firstName: 'Nadia',
        lastName: 'Rahman',
        employmentStatus: 'active',
        department: { id: 'dept-2', name: 'Human Resources' },
        designation: { id: 'desig-1', title: 'HR Manager' },
      },
    },
    {
      id: 'u-2',
      email: 'head@bistech.io',
      roles: ['employee', 'hr_manager', 'dept_head'],
      employee: {
        id: 'emp-101',
        employeeCode: 'BST-1002',
        firstName: 'Farhan',
        lastName: 'Ahmed',
        employmentStatus: 'active',
        department: { id: 'dept-1', name: 'Engineering' },
        designation: { id: 'desig-2', title: 'Lead Engineer' },
      },
    },
    {
      id: 'u-3',
      email: 'tanzim@bistech.io',
      roles: ['employee'],
      employee: {
        id: 'emp-103',
        employeeCode: 'BST-1005',
        firstName: 'Tanzim',
        lastName: 'Hossain',
        employmentStatus: 'active',
        department: { id: 'dept-1', name: 'Engineering' },
        designation: { id: 'desig-3', title: 'Software Engineer' },
      },
    },
  ];

  const mockRoles: api.RoleItem[] = [
    { id: 'r-1', name: 'super_admin', description: 'Super Administrator' },
    { id: 'r-2', name: 'hr_manager', description: 'HR Manager' },
    { id: 'r-3', name: 'dept_head', description: 'Department Head' },
    { id: 'r-4', name: 'employee', description: 'Standard Employee' },
  ];

  beforeEach(() => {
    vi.spyOn(api, 'fetchDepartments').mockResolvedValue([...mockDepartments]);
    vi.spyOn(api, 'fetchUsers').mockResolvedValue([...mockUsers]);
    vi.spyOn(api, 'fetchRoles').mockResolvedValue([...mockRoles]);
    vi.spyOn(api, 'createDepartment').mockResolvedValue({
      id: 'dept-new',
      name: 'Product Squad',
      description: 'Product line',
      headEmployeeId: null,
      activeEmployeeCount: 0,
      headEmployee: null,
    });
    vi.spyOn(api, 'assignDepartmentHead').mockResolvedValue({
      id: 'dept-2',
      name: 'Human Resources',
      description: 'People Ops',
      headEmployeeId: 'emp-100',
      activeEmployeeCount: 1,
      headEmployee: {
        id: 'emp-100',
        name: 'Nadia Rahman',
        employeeCode: 'BST-1001',
      },
    });
    vi.spyOn(api, 'updateUserRoles').mockResolvedValue({
      userId: 'u-1',
      roles: ['employee'],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders stats matching Screenshot 1 (2 HR managers, 1/3 covered, 2 unassigned, 4 roles)', async () => {
    render(<LeadershipDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Manage HR & Department Heads')).toBeInTheDocument();
    });

    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2); // Active HR Managers & Unassigned Heads
    expect(screen.getByText('1 / 3')).toBeInTheDocument(); // Departments Covered
    expect(screen.getByText('4')).toBeInTheDocument(); // Total System Roles
  });

  it('renders HR Managers table and Department Heads table with live data', async () => {
    render(<LeadershipDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Farhan Ahmed').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Nadia Rahman')).toBeInTheDocument();
    });

    // Check department heads
    expect(screen.getAllByText('Engineering').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Management')).toBeInTheDocument();
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThanOrEqual(1);
  });

  it('opens "Create or Change on Departments" modal and lists departments', async () => {
    render(<LeadershipDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create or Change on Departments')).toBeInTheDocument();
    });

    const openBtn = screen.getByRole('button', { name: /create or change on departments/i });
    fireEvent.click(openBtn);

    // Modal title & New Department button
    expect(screen.getByText('New Department')).toBeInTheDocument();
    expect(screen.getAllByText('5 staff').length).toBeGreaterThanOrEqual(1);
  });

  it('triggers assignDepartmentHead when assigning a head to an unassigned department', async () => {
    render(<LeadershipDashboard />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /assign head/i })[0]).toBeInTheDocument();
    });

    const assignBtns = screen.getAllByRole('button', { name: /assign head/i });
    fireEvent.click(assignBtns[0]); // opens head modal for Human Resources

    expect(screen.getByText('Human Resources — Department Head')).toBeInTheDocument();

    const select = screen.getByLabelText(/department head/i);
    fireEvent.change(select, { target: { value: 'emp-100' } });

    const saveBtn = screen.getByRole('button', { name: /save assignment/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.assignDepartmentHead).toHaveBeenCalledWith('dept-2', { employeeId: 'emp-100' });
    });
  });
});
