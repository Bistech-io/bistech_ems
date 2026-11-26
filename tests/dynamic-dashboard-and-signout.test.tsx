import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { DashboardSessionBar } from '@/components/layout/dashboard-session-bar';
import { EmployeeDashboard } from '@/features/dashboard/components/employee-dashboard';
import { authHandlers, resetMockSessionState } from '@/mocks/handlers';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockSessionState();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe('Dynamic Dashboard per Role', () => {
  it('renders dynamic workspace and persona for super_admin', async () => {
    render(
      <QueryProvider>
        <AuthProvider defaultRole="super_admin">
          <EmployeeDashboard />
        </AuthProvider>
      </QueryProvider>,
    );

    expect(screen.getByText(/super admin workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /super admin dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/bistech admin/i)).toBeInTheDocument();
    expect(screen.getByText(/super administrator/i)).toBeInTheDocument();
  });

  it('renders dynamic workspace and persona for hr_manager', async () => {
    render(
      <QueryProvider>
        <AuthProvider defaultRole="hr_manager">
          <EmployeeDashboard />
        </AuthProvider>
      </QueryProvider>,
    );

    expect(screen.getByText(/hr manager workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /hr manager dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/nadia rahman/i)).toBeInTheDocument();
    expect(screen.getAllByText(/hr manager/i).length).toBeGreaterThan(0);
  });

  it('renders dynamic workspace and persona for dept_head', async () => {
    render(
      <QueryProvider>
        <AuthProvider defaultRole="dept_head">
          <EmployeeDashboard />
        </AuthProvider>
      </QueryProvider>,
    );

    expect(screen.getByText(/department head workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /department head dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/farhan ahmed/i)).toBeInTheDocument();
    expect(screen.getByText(/lead engineer & department head/i)).toBeInTheDocument();
  });

  it('renders dynamic workspace and persona for employee', async () => {
    render(
      <QueryProvider>
        <AuthProvider defaultRole="employee">
          <EmployeeDashboard />
        </AuthProvider>
      </QueryProvider>,
    );

    expect(screen.getByText(/employee workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByText(/mehedi alam/i)).toBeInTheDocument();
    expect(screen.getByText(/senior frontend engineer/i)).toBeInTheDocument();
  });

  it('activates Department Head Workspace when session roles list employee before dept_head', async () => {
    render(
      <QueryProvider>
        <AuthProvider
          initialSession={{
            user: {
              id: 'u-dh',
              username: 'demo_dept_head',
              email: 'dh@bistech.io',
              name: 'Demo Department Head',
              accountStatus: 'active',
            },
            employeeId: 'emp-dh',
            roles: ['employee', 'dept_head'],
            permissions: {
              'dashboard.read': 'managed',
            },
            csrfToken: 'csrf-token-dh',
          }}
        >
          <EmployeeDashboard />
        </AuthProvider>
      </QueryProvider>,
    );

    expect(screen.getByText(/department head workspace/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: /department head dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^dept head$/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders dynamic company dashboard for a custom "admin" role with governance permissions', async () => {
    server.use(
      http.get('/api/v1/dashboard/summary', () => {
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            primaryRole: 'super_admin',
            availableViews: ['company', 'hr'],
            company: {
              timezone: 'Asia/Dhaka',
              workStart: '10:00',
              graceMinutes: 15,
              workEnd: '18:30',
              workforce: {
                activeEmployees: 18,
                inactiveEmployees: 1,
                joinersThisMonth: 2,
                departmentSummary: [
                  { departmentId: 'd1', departmentName: 'Engineering', activeCount: 10 },
                ],
              },
              todayAttendance: {
                workDate: '2026-11-26',
                isWorkingDay: true,
                presentCount: 14,
                lateCount: 2,
                notCheckedInCount: 2,
                absentCount: 0,
                attendanceRatePercent: 89,
              },
              monthlyAttendance: {
                presentDays: 14,
                lateDays: 2,
                absentDays: 0,
                expectedWorkingDays: 16,
                attendanceRatePercent: 95,
              },
              tasks: {
                countsByStatus: {
                  todo: 4,
                  inProgress: 3,
                  inReview: 2,
                  changesRequested: 0,
                  done: 9,
                },
                openCount: 9,
                overdueCount: 1,
                dueSoonCount: 2,
                completionRatePercent: 50,
              },
              openFeedbackCount: 2,
              recentJoiners: [],
              recentAuditLogs: [],
              governance: {
                activeTeamsCount: 3,
                totalDepartments: 4,
                departmentsWithHead: 3,
                pendingReviewsCount: 2,
              },
              feedbackBreakdown: {
                openTotal: 2,
                issues: 1,
                suggestions: 1,
              },
            },
            hr: null,
            me: null,
          },
          meta: null,
        });
      }),
    );

    render(
      <QueryProvider>
        <AuthProvider
          initialSession={{
            user: {
              id: 'u-custom-admin',
              username: 'custom_admin',
              email: 'admin.custom@bistech.io',
              name: 'Custom Admin User',
              accountStatus: 'active',
            },
            employeeId: null,
            roles: ['admin'],
            permissions: {
              'role.manage': 'org',
              'user.read': 'org',
              'org.settings.manage': 'org',
              'dashboard.read': 'org',
            },
            csrfToken: 'csrf-custom-admin',
          }}
        >
          <EmployeeDashboard />
        </AuthProvider>
      </QueryProvider>,
    );

    expect(screen.getByText(/admin workspace/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /admin dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Active Workforce')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText('Admin Quick Access')).toBeInTheDocument();
    });
  });

  it('renders fallback Custom Role Workspace cards when custom role has no org dashboard or employee profile', async () => {
    server.use(
      http.get('/api/v1/dashboard/summary', () => {
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            primaryRole: 'employee',
            availableViews: [],
            company: null,
            hr: null,
            me: null,
          },
          meta: null,
        });
      }),
    );

    render(
      <QueryProvider>
        <AuthProvider
          initialSession={{
            user: {
              id: 'u-custom-narrow',
              username: 'narrow_admin',
              email: 'narrow@bistech.io',
              name: 'Narrow Custom Role',
              accountStatus: 'active',
            },
            employeeId: null,
            roles: ['admin'],
            permissions: {
              'feedback.read': 'own',
              'feedback.submit': 'own',
            },
            csrfToken: 'csrf-narrow',
          }}
        >
          <EmployeeDashboard />
        </AuthProvider>
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Authorized Workspaces' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Granted Permissions' })).toBeInTheDocument();
      expect(screen.getByText('feedback.read')).toBeInTheDocument();
    });
  });
});

describe('Sign Out resilience', () => {
  let locationMock: { href: string };

  beforeEach(() => {
    locationMock = { href: '' };
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: locationMock,
    });
  });

  it('signs out successfully and redirects to /login', async () => {
    render(
      <QueryProvider>
        <AuthProvider defaultRole="super_admin">
          <DashboardSessionBar />
        </AuthProvider>
      </QueryProvider>,
    );

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(locationMock.href).toBe('/login');
    });
  });

  it('proceeds with sign out even if backend logout fails with 500', async () => {
    server.use(
      http.post('/api/v1/auth/logout', () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Database unreachable' },
            requestId: 'test-req',
          },
          { status: 500 },
        );
      }),
    );

    render(
      <QueryProvider>
        <AuthProvider defaultRole="hr_manager">
          <DashboardSessionBar />
        </AuthProvider>
      </QueryProvider>,
    );

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(signOutBtn);

    await waitFor(() => {
      expect(locationMock.href).toBe('/login');
    });
  });
});
