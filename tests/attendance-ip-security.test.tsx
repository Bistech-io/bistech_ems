import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceDashboard } from '@/features/attendance/components/attendance-dashboard';
import * as attendanceApi from '@/features/attendance/api';

vi.mock('@/features/attendance/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/attendance/api')>();
  return {
    ...actual,
    fetchOrganizationSettings: vi.fn(),
    fetchMyAttendanceBoard: vi.fn(),
    fetchMyFirstCheckInDate: vi.fn(),
  };
});

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      userId: 'emp-user-1',
      employeeId: 'emp-1',
      email: 'emp@bistech.io',
      name: 'Saad Ferozee',
      roles: ['employee'],
      permissions: { 'attendance.self': 'own', 'attendance.read': 'own' },
    },
    session: {
      user: {
        id: 'emp-user-1',
        email: 'emp@bistech.io',
        name: 'Saad Ferozee',
      },
      employeeId: 'emp-1',
    },
    activeRole: 'employee',
    isLoading: false,
  }),
}));

describe('AttendanceDashboard Office IP Security Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(attendanceApi.fetchOrganizationSettings).mockResolvedValue({
      timezone: 'Asia/Dhaka',
      workStart: '10:00',
      workEnd: '18:30',
      graceMinutes: 15,
      allowedOfficeIps: [],
      ipRestrictionEnabled: true,
      currentIp: null,
    });
    vi.mocked(attendanceApi.fetchMyFirstCheckInDate).mockResolvedValue('2026-11-01');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('disables Hold to Check In and shows Outside Office Network alert when outside allowed office IPs', async () => {
    vi.mocked(attendanceApi.fetchMyAttendanceBoard).mockResolvedValue({
      timezone: 'Asia/Dhaka',
      workStart: '10:00',
      graceMinutes: 15,
      workEnd: '18:30',
      from: '2026-11-01',
      to: '2026-11-30',
      networkStatus: { isRestricted: true, isAllowed: false },
      today: {
        workDate: '2026-11-26',
        status: 'not_checked_in',
        checkInAt: null,
        checkOutAt: null,
        lateMinutes: 0,
        source: null,
      },
      summary: {
        presentDays: 10,
        lateDays: 0,
        absentDays: 0,
        expectedWorkingDays: 10,
        attendanceRatePercent: 100,
      },
      records: [],
    });

    render(<AttendanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Outside Office Network:/i)).toBeInTheDocument();
    });

    const checkInBtn = screen.getByRole('button', { name: /Hold to Check In/i });
    expect(checkInBtn).toBeDisabled();
  });

  it('enables Hold to Check In and shows Office Network Verified badge when inside office IP', async () => {
    vi.mocked(attendanceApi.fetchMyAttendanceBoard).mockResolvedValue({
      timezone: 'Asia/Dhaka',
      workStart: '10:00',
      graceMinutes: 15,
      workEnd: '18:30',
      from: '2026-11-01',
      to: '2026-11-30',
      networkStatus: { isRestricted: true, isAllowed: true },
      today: {
        workDate: '2026-11-26',
        status: 'not_checked_in',
        checkInAt: null,
        checkOutAt: null,
        lateMinutes: 0,
        source: null,
      },
      summary: {
        presentDays: 10,
        lateDays: 0,
        absentDays: 0,
        expectedWorkingDays: 10,
        attendanceRatePercent: 100,
      },
      records: [],
    });

    render(<AttendanceDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Office Network Verified')).toBeInTheDocument();
    });

    const checkInBtn = screen.getByRole('button', { name: /Hold to Check In/i });
    expect(checkInBtn).not.toBeDisabled();
  });
});
