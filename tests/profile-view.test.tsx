import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileView } from '@/features/account/components/profile-view';
import * as authApi from '@/features/auth/api';
import { AuthProvider } from '@/providers/auth-provider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/account/profile',
}));

const mockProfileData = {
  employeeId: 'emp_123',
  employeeCode: 'BT-001',
  fullName: 'Mehedi Alam',
  workEmail: 'mehedi@bistech.com',
  department: { id: 'dept_1', name: 'Engineering' },
  designation: { id: 'desig_1', title: 'Software Engineer' },
  employmentStatus: 'active',
  joiningDate: '2026-01-01',
  organizationName: 'BisTech',
  timezone: 'Asia/Dhaka',
  workStart: '09:30 AM',
  workEnd: '06:00 PM',
  dateOfBirth: null,
  personalEmail: null,
  personalPhone: null,
  addressLine: null,
  city: null,
  countryCode: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  emergencyContactRelation: null,
  updatedAt: null,
};

describe('ProfileView Avatar Photo Upload Flow', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const storageMock = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStore[key] = String(val);
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
      length: 0,
      key: () => null,
    };

    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      writable: true,
    });
    vi.restoreAllMocks();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/employees/me/profile')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: mockProfileData }),
        } as Response;
      }
      if (url.includes('/api/upload/avatar')) {
        return {
          ok: true,
          json: async () => ({ success: true, url: null, publicId: null }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as Response;
    });
  });

  afterEach(() => {
    mockStore = {};
  });

  function renderProfile(defaultRole: 'employee' | 'hr_manager' = 'employee') {
    return render(
      <AuthProvider defaultRole={defaultRole}>
        <ProfileView />
      </AuthProvider>,
    );
  }

  it('renders initial profile identity with initials and Change Photo button', () => {
    renderProfile('employee');

    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/change profile picture/i)).toBeInTheDocument();
  });

  it('validates file type and displays error on unsupported file', async () => {
    renderProfile('employee');

    const input = screen.getByLabelText(/upload profile picture/i) as HTMLInputElement;
    const file = new File(['dummy-content'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Please select a JPG, PNG, or WebP image.',
      );
    });
  });

  it('fetches and displays avatar from Cloudinary on initial mount for a new device login', async () => {
    const cloudAvatar = {
      success: true,
      url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v12345/cloud_avatar.png',
      publicId: 'bistech_ems/avatars/avatar_preview-employee',
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/upload/avatar')) {
        return {
          ok: true,
          json: async () => cloudAvatar,
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true, data: mockProfileData }),
      } as Response;
    });

    // Fresh new device: localStorage is empty
    expect(window.localStorage.getItem('bistech_avatar_preview-employee')).toBeNull();

    renderProfile('employee');

    // Avatar image should be fetched and rendered
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', cloudAvatar.url);
    });

    // LocalStorage should now be cached for offline / instant render
    expect(window.localStorage.getItem('bistech_avatar_preview-employee')).toBe(cloudAvatar.url);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('isolates avatar strictly per account: never shows previous user avatar on different account', async () => {
    const userAAvatar = {
      success: true,
      url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v12345/user_a.png',
      publicId: 'bistech_ems/avatars/avatar_preview-hr_manager',
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/upload/avatar?userId=preview-hr_manager')) {
        return {
          ok: true,
          json: async () => userAAvatar,
        } as Response;
      }
      if (url.includes('/api/upload/avatar?userId=preview-employee')) {
        return {
          ok: true,
          json: async () => ({ success: true, url: null, publicId: null }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true, data: mockProfileData }),
      } as Response;
    });

    // 1. User A (HR Manager) renders with their avatar
    const { unmount } = renderProfile('hr_manager');
    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', userAAvatar.url);
    });
    expect(window.localStorage.getItem('bistech_avatar_preview-hr_manager')).toBe(userAAvatar.url);

    // 2. User A logs out (component unmounts)
    unmount();

    // 3. User B (Employee without avatar) logs in on the same browser
    renderProfile('employee');

    // User B must NOT see User A's avatar; initials should be shown instead
    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('MA')).toBeInTheDocument();
    });

    // User B's localStorage must NOT be contaminated with User A's avatar
    expect(window.localStorage.getItem('bistech_avatar_preview-employee')).toBeNull();
  });

  it('successfully uploads photo to /api/upload/avatar and updates profile picture', async () => {
    const mockUploadResponse = {
      success: true,
      url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v12345/avatar.png',
      publicId: 'bistech_ems/avatars/avatar_preview-employee',
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/upload/avatar') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => mockUploadResponse,
        } as Response;
      }
      if (url.includes('/employees/me/profile')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: mockProfileData }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true, url: null, publicId: null }),
      } as Response;
    });

    renderProfile('employee');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/upload profile picture/i) as HTMLInputElement;
    const file = new File(['valid-image-bytes'], 'me.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Profile picture updated.',
      );
    });

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockUploadResponse.url);
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('removes photo and calls DELETE endpoint when Remove button is clicked', async () => {
    const mockUploadResponse = {
      success: true,
      url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v12345/avatar.png',
      publicId: 'bistech_ems/avatars/avatar_preview-employee',
    };

    let deleteCalled = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('/api/upload/avatar') && init?.method === 'POST') {
        return {
          ok: true,
          json: async () => mockUploadResponse,
        } as Response;
      }
      if (url.includes('/api/upload/avatar') && init?.method === 'DELETE') {
        deleteCalled = true;
        return {
          ok: true,
          json: async () => ({ success: true }),
        } as Response;
      }
      if (url.includes('/employees/me/profile')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: mockProfileData }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ success: true, url: null, publicId: null }),
      } as Response;
    });

    renderProfile('employee');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/upload profile picture/i) as HTMLInputElement;
    const file = new File(['valid-image-bytes'], 'me.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
      expect(deleteCalled).toBe(true);
    });
  });

  it('validates current password field and changes password successfully', async () => {
    const changePasswordSpy = vi
      .spyOn(authApi, 'changePassword')
      .mockResolvedValue('Password updated successfully.');

    renderProfile('employee');

    expect(screen.getByText('Change Password')).toBeInTheDocument();

    const currentInput = screen.getByPlaceholderText('Enter current password');
    const newInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmInput = screen.getByPlaceholderText('Re-enter new password');
    const updateBtn = screen.getByRole('button', { name: /update password/i });
    const form = updateBtn.closest('form')!;

    // Submit with empty current password
    fireEvent.change(newInput, { target: { value: 'BrandNewPass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'BrandNewPass123!' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Current password is required.')).toBeInTheDocument();
    });

    // Submit with valid inputs
    fireEvent.change(currentInput, { target: { value: 'Password123!' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(changePasswordSpy).toHaveBeenCalledWith({
        currentPassword: 'Password123!',
        newPassword: 'BrandNewPass123!',
      });
      expect(screen.getByText('Password updated successfully.')).toBeInTheDocument();
    });
  });
});
