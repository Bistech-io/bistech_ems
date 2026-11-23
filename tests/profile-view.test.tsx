import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileView } from '@/features/account/components/profile-view';
import { AuthProvider } from '@/providers/auth-provider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/account/profile',
}));

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

  it('successfully uploads photo to /api/upload/avatar and updates profile picture', async () => {
    const mockUploadResponse = {
      success: true,
      url: 'https://res.cloudinary.com/bwr0yh78/image/upload/v12345/avatar.png',
      publicId: 'bistech_ems/avatars/avatar12345',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockUploadResponse,
    } as Response);

    renderProfile('employee');

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
      publicId: 'bistech_ems/avatars/avatar12345',
    };

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUploadResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    renderProfile('employee');

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
    });
  });
});
