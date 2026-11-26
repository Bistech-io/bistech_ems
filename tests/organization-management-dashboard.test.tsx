import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationManagementDashboard } from '@/features/admin/organization/components/organization-management-dashboard';
import * as attendanceApi from '@/features/attendance/api';
import { ApiError } from '@/lib/api/errors';

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

describe('OrganizationManagementDashboard', () => {
  const mockInitialSettings = {
    timezone: 'Asia/Dhaka',
    workStart: '09:30',
    workEnd: '18:00',
    graceMinutes: 25,
  };

  beforeEach(() => {
    vi.spyOn(attendanceApi, 'fetchOrganizationSettings').mockResolvedValue(
      mockInitialSettings,
    );
    vi.spyOn(attendanceApi, 'patchOrganizationSettings').mockResolvedValue({
      ...mockInitialSettings,
      workStart: '10:00',
      workEnd: '18:30',
      graceMinutes: 15,
      timezone: 'Asia/Dhaka',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial organization settings in header, form and summary', async () => {
    render(<OrganizationManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Organization Management')).toBeInTheDocument();
    });

    // Header badge shows active shift with grace period
    expect(
      screen.getByText(/09:30 AM – 06:00 PM · 25m grace/i),
    ).toBeInTheDocument();
    // Summary card shows shift window
    expect(screen.getByText('09:30 AM – 06:00 PM')).toBeInTheDocument();

    // Inputs have loaded values
    const startInput = screen.getByLabelText(/Shift Start Time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/Shift End Time/i) as HTMLInputElement;
    const graceInput = screen.getByLabelText(/Late Grace Period/i) as HTMLInputElement;
    const tzInput = screen.getByLabelText(/Organization Timezone/i) as HTMLInputElement;

    expect(startInput.value).toBe('09:30');
    expect(endInput.value).toBe('18:00');
    expect(graceInput.value).toBe('25');
    expect(tzInput.value).toBe('Asia/Dhaka');

    // Summary card has grace period and timezone
    expect(screen.getByText('25 minutes')).toBeInTheDocument();
  });

  it('applies seasonal presets when clicked', async () => {
    render(<OrganizationManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Standard / Summer Shift')).toBeInTheDocument();
    });

    const summerBtn = screen.getByText('Standard / Summer Shift').closest('button')!;
    fireEvent.click(summerBtn);

    const startInput = screen.getByLabelText(/Shift Start Time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/Shift End Time/i) as HTMLInputElement;

    expect(startInput.value).toBe('10:00');
    expect(endInput.value).toBe('18:00');

    const winterBtn = screen.getByText('Winter Shift').closest('button')!;
    fireEvent.click(winterBtn);

    expect(startInput.value).toBe('09:00');
    expect(endInput.value).toBe('17:00');
  });

  it('submits updated shift settings and displays success message', async () => {
    const patchSpy = vi.spyOn(attendanceApi, 'patchOrganizationSettings').mockResolvedValue({
      timezone: 'Asia/Dhaka',
      workStart: '10:00',
      workEnd: '18:30',
      graceMinutes: 15,
    });

    render(<OrganizationManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Shift Start Time/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Shift Start Time/i);
    const endInput = screen.getByLabelText(/Shift End Time/i);
    const graceInput = screen.getByLabelText(/Late Grace Period/i);

    fireEvent.change(startInput, { target: { value: '10:00' } });
    fireEvent.change(endInput, { target: { value: '18:30' } });
    fireEvent.change(graceInput, { target: { value: '15' } });

    const submitBtn = screen.getByRole('button', { name: /Save Shift Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith({
        timezone: 'Asia/Dhaka',
        workStart: '10:00',
        workEnd: '18:30',
        graceMinutes: 15,
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Shift schedule updated to 10:00 AM – 06:30 PM\./i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('15 minutes')).toBeInTheDocument();
  });

  it('validates shift end time after shift start time client-side', async () => {
    render(<OrganizationManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Shift Start Time/i)).toBeInTheDocument();
    });

    const startInput = screen.getByLabelText(/Shift Start Time/i);
    const endInput = screen.getByLabelText(/Shift End Time/i);

    fireEvent.change(startInput, { target: { value: '18:00' } });
    fireEvent.change(endInput, { target: { value: '09:00' } });

    const submitBtn = screen.getByRole('button', { name: /Save Shift Schedule/i });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText('Shift end time must be after shift start time.'),
    ).toBeInTheDocument();
  });

  it('displays detailed error message when API fails with ApiError details', async () => {
    vi.spyOn(attendanceApi, 'patchOrganizationSettings').mockRejectedValue(
      new ApiError(
        'VALIDATION_ERROR',
        400,
        [{ field: 'timezone', message: 'Invalid IANA timezone identifier' }],
        'req-1',
      ),
    );

    render(<OrganizationManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Organization Timezone/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Save Shift Schedule/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Invalid IANA timezone identifier'),
      ).toBeInTheDocument();
    });
  });

  it('adds, validates, and saves allowed office IPs including 1-click current IP', async () => {
    vi.spyOn(attendanceApi, 'fetchOrganizationSettings').mockResolvedValue({
      ...mockInitialSettings,
      allowedOfficeIps: ['203.0.113.10'],
      ipRestrictionEnabled: true,
      currentIp: '103.45.20.88',
    });

    const patchSpy = vi.spyOn(attendanceApi, 'patchOrganizationSettings').mockResolvedValue({
      ...mockInitialSettings,
      allowedOfficeIps: ['203.0.113.10', '103.45.20.88', '103.45.20.0/24'],
      ipRestrictionEnabled: true,
      currentIp: '103.45.20.88',
    });

    render(<OrganizationManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Office Network IP Security')).toBeInTheDocument();
    });

    // Shows detected current IP and existing allowlist entry
    expect(screen.getByText('103.45.20.88')).toBeInTheDocument();
    expect(screen.getByText('203.0.113.10')).toBeInTheDocument();

    // Rejects invalid IP client-side
    const ipInput = screen.getByLabelText(/Add Office IP Address or CIDR Range/i);
    fireEvent.change(ipInput, { target: { value: 'invalid-ip-address' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add IP$/i }));
    expect(screen.getByText(/Invalid IP address or CIDR range/i)).toBeInTheDocument();

    // 1-click add current IP
    fireEvent.click(screen.getByRole('button', { name: /Add Current IP/i }));

    // Add valid CIDR range
    fireEvent.change(ipInput, { target: { value: '103.45.20.0/24' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add IP$/i }));

    // Save Office IPs
    fireEvent.click(screen.getByRole('button', { name: /Save Office IPs/i }));

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith({
        allowedOfficeIps: ['203.0.113.10', '103.45.20.88', '103.45.20.0/24'],
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Office IP restriction active \(3 allowed entries\)/i),
      ).toBeInTheDocument();
    });
  });
});

