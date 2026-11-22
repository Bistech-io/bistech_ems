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
    expect(screen.getByText('BST-0001')).toBeInTheDocument();
    expect(screen.getByText(/management & operations — executive leadership/i)).toBeInTheDocument();
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
    expect(screen.getByText('BST-1001')).toBeInTheDocument();
    expect(screen.getByText(/human resources — people operations/i)).toBeInTheDocument();
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
    expect(screen.getByText('BST-1002')).toBeInTheDocument();
    expect(screen.getByText(/engineering — engineering leadership/i)).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { level: 1, name: /employee dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/mehedi alam/i)).toBeInTheDocument();
    expect(screen.getByText('BST-1003')).toBeInTheDocument();
    expect(screen.getByText(/engineering — core platform squad/i)).toBeInTheDocument();
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
