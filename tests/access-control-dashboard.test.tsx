import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessControlDashboard } from '@/features/admin/access-control/components/access-control-dashboard';
import * as accessControlApi from '@/features/admin/access-control/api';
import * as leadershipApi from '@/features/admin/leadership/api';
import { PERMISSION_CATALOG } from '@/features/admin/access-control/types';

vi.mock('@/features/admin/access-control/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/admin/access-control/api')>();
  return {
    ...actual,
    fetchAccessControlRoles: vi.fn(),
    fetchPermissionCatalog: vi.fn(),
    createCustomRole: vi.fn(),
    updateCustomRole: vi.fn(),
    deleteCustomRole: vi.fn(),
  };
});

vi.mock('@/features/admin/leadership/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/admin/leadership/api')>();
  return {
    ...actual,
    fetchOrgUsers: vi.fn(),
    putUserRoles: vi.fn(),
  };
});

const MOCK_ROLES = [
  {
    id: 'role-sa',
    name: 'super_admin',
    displayName: 'Super Admin',
    description: 'Full organization-wide administrative control.',
    isSystem: true,
    userCount: 1,
    permissions: [
      { key: 'user.read', scope: 'org' as const },
      { key: 'role.manage', scope: 'org' as const },
    ],
  },
  {
    id: 'role-hr',
    name: 'hr_manager',
    displayName: 'HR Manager',
    description: 'Manages employees and attendance.',
    isSystem: true,
    userCount: 2,
    permissions: [
      { key: 'employee.read', scope: 'org' as const },
      { key: 'attendance.read', scope: 'org' as const },
    ],
  },
];

const MOCK_USERS = [
  {
    id: 'user-1',
    username: 'nadia.hr',
    email: 'nadia@bistech.io',
    displayName: 'Nadia Rahman',
    accountStatus: 'active',
    roles: ['hr_manager'],
    employee: {
      id: 'emp-1',
      employeeCode: 'BST-1001',
      employmentStatus: 'active' as const,
      department: { id: 'dept-hr', name: 'Human Resources' },
      designation: { id: 'desig-hr', title: 'HR Manager' },
    },
  },
  {
    id: 'user-2',
    username: 'tariq.hr',
    email: 'tariq@bistech.io',
    displayName: 'Tariq Hasan',
    accountStatus: 'active',
    roles: ['hr_manager'],
    employee: {
      id: 'emp-2',
      employeeCode: 'BST-1002',
      employmentStatus: 'active' as const,
      department: { id: 'dept-hr', name: 'Human Resources' },
      designation: { id: 'desig-hr2', title: 'HR Specialist' },
    },
  },
];

describe('AccessControlDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(accessControlApi.fetchAccessControlRoles).mockResolvedValue(MOCK_ROLES);
    vi.mocked(accessControlApi.fetchPermissionCatalog).mockResolvedValue(PERMISSION_CATALOG);
    vi.mocked(leadershipApi.fetchOrgUsers).mockResolvedValue(MOCK_USERS);
  });

  it('renders current roles with their granted permissions and opens members drawer on role click', async () => {
    const user = userEvent.setup();
    render(<AccessControlDashboard />);

    await waitFor(() => {
      expect(screen.getByText('HR Manager')).toBeInTheDocument();
    });

    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Read Employees')).toBeInTheDocument();
    expect(screen.getByText('Read Attendance')).toBeInTheDocument();

    // Click the HR Manager role card to inspect assigned members
    await user.click(screen.getByRole('button', { name: /HR Manager/i }));

    const drawer = await screen.findByRole('dialog', {
      name: /HR Manager role details/i,
    });
    expect(within(drawer).getByText('Nadia Rahman')).toBeInTheDocument();
    expect(within(drawer).getByText('Tariq Hasan')).toBeInTheDocument();
    expect(within(drawer).getByText('BST-1001')).toBeInTheDocument();
  });

  it('opens Create Custom Role modal, grants checked permissions, and adds the new role', async () => {
    const user = userEvent.setup();
    vi.mocked(accessControlApi.createCustomRole).mockResolvedValue({
      role: {
        id: 'role-custom-1',
        name: 'finance_auditor',
        displayName: 'Finance Auditor',
        description: 'Audits logs and attendance records.',
        isSystem: false,
        userCount: 0,
        permissions: [
          { key: 'audit.read', scope: 'org' },
          { key: 'attendance.read', scope: 'org' },
        ],
      },
      syncedWithServer: true,
    });

    render(<AccessControlDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Create Custom Role/i }));

    const modal = await screen.findByRole('dialog', { name: /Create custom role/i });

    await user.type(within(modal).getByLabelText(/Role Name/i), 'Finance Auditor');
    await user.type(
      within(modal).getByLabelText(/Description/i),
      'Audits logs and attendance records.',
    );

    // Check two permissions from the checklist
    await user.click(within(modal).getByLabelText(/Read Audit Logs/i));
    await user.click(within(modal).getByLabelText(/Read Attendance/i));

    await user.click(within(modal).getByRole('button', { name: /^Create Role$/i }));

    await waitFor(() => {
      expect(accessControlApi.createCustomRole).toHaveBeenCalledWith({
        name: 'finance_auditor',
        displayName: 'Finance Auditor',
        description: 'Audits logs and attendance records.',
        permissions: [
          { key: 'audit.read', scope: 'org' },
          { key: 'attendance.read', scope: 'org' },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Finance Auditor')).toBeInTheDocument();
    });
  });

  it('edits, assigns a member to, and deletes a custom role', async () => {
    const user = userEvent.setup();
    vi.mocked(accessControlApi.fetchAccessControlRoles).mockResolvedValue([
      ...MOCK_ROLES,
      {
        id: 'role-custom-1',
        name: 'finance_auditor',
        displayName: 'Finance Auditor',
        description: 'Audits logs.',
        isSystem: false,
        userCount: 0,
        permissions: [{ key: 'audit.read', scope: 'org' }],
      },
    ]);

    vi.mocked(leadershipApi.putUserRoles).mockResolvedValue({
      id: 'user-1',
      email: 'nadia@bistech.io',
      displayName: 'Nadia Rahman',
      accountStatus: 'active',
      roles: ['hr_manager', 'finance_auditor'],
    });

    vi.mocked(accessControlApi.updateCustomRole).mockResolvedValue({
      id: 'role-custom-1',
      name: 'finance_auditor',
      displayName: 'Finance Auditor',
      description: 'Updated audit scope.',
      isSystem: false,
      userCount: 1,
      permissions: [
        { key: 'audit.read', scope: 'org' },
        { key: 'attendance.read', scope: 'org' },
      ],
    });

    vi.mocked(accessControlApi.deleteCustomRole).mockResolvedValue({
      id: 'role-custom-1',
      name: 'finance_auditor',
      detachedUsersCount: 1,
    });

    render(<AccessControlDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Finance Auditor')).toBeInTheDocument();
    });

    // Open custom role drawer
    await user.click(screen.getByRole('button', { name: /Finance Auditor/i }));
    const drawer = await screen.findByRole('dialog', {
      name: /Finance Auditor role details/i,
    });

    // Assign member to custom role
    await user.selectOptions(
      within(drawer).getByLabelText(/Select user to assign Finance Auditor/i),
      'user-1',
    );
    await user.click(within(drawer).getByRole('button', { name: /^Assign$/i }));

    await waitFor(() => {
      expect(leadershipApi.putUserRoles).toHaveBeenCalledWith('user-1', [
        'hr_manager',
        'finance_auditor',
      ]);
      expect(within(drawer).getByText('Nadia Rahman')).toBeInTheDocument();
    });

    // Edit custom role
    await user.click(within(drawer).getByRole('button', { name: /Edit Finance Auditor/i }));
    const editModal = await screen.findByRole('dialog', { name: /Edit custom role/i });
    await user.click(within(editModal).getByLabelText(/Read Attendance/i));
    await user.click(within(editModal).getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(accessControlApi.updateCustomRole).toHaveBeenCalled();
    });

    // Delete custom role
    await user.click(within(drawer).getByRole('button', { name: /Delete Finance Auditor/i }));
    await user.click(within(drawer).getByRole('button', { name: /Confirm Delete/i }));

    await waitFor(() => {
      expect(accessControlApi.deleteCustomRole).toHaveBeenCalledWith('role-custom-1');
      expect(screen.queryByRole('dialog', { name: /Finance Auditor role details/i })).not.toBeInTheDocument();
    });
  });

  it('allows adding and removing members in system roles such as Super Admin and HR Manager', async () => {
    const user = userEvent.setup();
    vi.mocked(leadershipApi.putUserRoles)
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'nadia@bistech.io',
        displayName: 'Nadia Rahman',
        accountStatus: 'active',
        roles: ['hr_manager', 'super_admin'],
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        email: 'tariq@bistech.io',
        displayName: 'Tariq Hasan',
        accountStatus: 'active',
        roles: ['employee'],
      });

    render(<AccessControlDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin')).toBeInTheDocument();
    });

    // Open Super Admin system role drawer and assign Nadia Rahman
    await user.click(screen.getByRole('button', { name: /Super Admin/i }));
    const saDrawer = await screen.findByRole('dialog', {
      name: /Super Admin role details/i,
    });

    await user.selectOptions(
      within(saDrawer).getByLabelText(/Select user to assign Super Admin/i),
      'user-1',
    );
    await user.click(within(saDrawer).getByRole('button', { name: /^Assign$/i }));

    await waitFor(() => {
      expect(leadershipApi.putUserRoles).toHaveBeenCalledWith('user-1', [
        'hr_manager',
        'super_admin',
      ]);
      expect(within(saDrawer).getByText('Nadia Rahman')).toBeInTheDocument();
    });

    // Switch to HR Manager drawer and remove Tariq Hasan
    await user.click(within(saDrawer).getByRole('button', { name: /Close role details drawer/i }));
    await user.click(screen.getByRole('button', { name: /HR Manager/i }));
    const hrDrawer = await screen.findByRole('dialog', {
      name: /HR Manager role details/i,
    });

    await user.click(
      within(hrDrawer).getByRole('button', { name: /Remove Tariq Hasan from HR Manager/i }),
    );

    await waitFor(() => {
      expect(leadershipApi.putUserRoles).toHaveBeenCalledWith('user-2', ['employee']);
    });
  });
});
