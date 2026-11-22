import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSession } from '@/lib/auth/session';
import * as serverApiModule from '@/lib/api/server';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null immediately without calling serverApiRequest if no session cookie exists', async () => {
    const mockCookieStore = {
      get: vi.fn().mockReturnValue(undefined),
      toString: vi.fn().mockReturnValue(''),
    };
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

    const serverApiSpy = vi.spyOn(serverApiModule, 'serverApiRequest');

    const result = await getSession();

    expect(result).toBeNull();
    expect(mockCookieStore.get).toHaveBeenCalledWith('ems_access');
    expect(serverApiSpy).not.toHaveBeenCalled();
  });

  it('calls serverApiRequest and returns session data when session cookie is present', async () => {
    const mockCookieStore = {
      get: vi.fn().mockReturnValue({ name: 'ems_access', value: 'valid-token' }),
      toString: vi.fn().mockReturnValue('ems_access=valid-token'),
    };
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

    const mockAuthMe = {
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'admin',
        name: 'Super Admin',
        accountStatus: 'active',
      },
      roles: ['super_admin'],
      permissions: { 'user.read': 'org' },
    };

    const serverApiSpy = vi.spyOn(serverApiModule, 'serverApiRequest').mockResolvedValue({
      success: true,
      data: mockAuthMe,
    } as any);

    const result = await getSession();

    expect(serverApiSpy).toHaveBeenCalledWith('/auth/me', expect.anything());
    expect(result).toEqual(mockAuthMe);
  });

  it('returns null when serverApiRequest throws an error (e.g. timeout or 401)', async () => {
    const mockCookieStore = {
      get: vi.fn().mockReturnValue({ name: 'ems_access', value: 'invalid-token' }),
      toString: vi.fn().mockReturnValue('ems_access=invalid-token'),
    };
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);

    vi.spyOn(serverApiModule, 'serverApiRequest').mockRejectedValue(new Error('fetch failed'));

    const result = await getSession();

    expect(result).toBeNull();
  });
});
