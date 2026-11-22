'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthMeData, LoginRequest } from '@ems/contracts';
import { clearCsrfToken } from '@/lib/api/csrf';
import { useAuth } from '@/providers/auth-provider';
import { login, logout, me } from './api';

export const AUTH_QUERY_KEYS = {
  me: ['auth', 'me'] as const,
};

export function useAuthMe(options?: { enabled?: boolean; initialData?: AuthMeData | null }) {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.me,
    queryFn: me,
    retry: false,
    enabled: options?.enabled ?? true,
    initialData: options?.initialData ?? undefined,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.me, data);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.me });
      queryClient.clear();
    },
  });
}

export function useSignOut() {
  const logoutMutation = useLogoutMutation();
  const { setSession } = useAuth();

  const signOut = useCallback(
    async (onBeforeRedirect?: () => void) => {
      try {
        await logoutMutation.mutateAsync();
      } catch {
        // Proceed with full client session teardown even if backend call fails or network drops
      } finally {
        setSession(null);
        clearCsrfToken();
        if (typeof document !== 'undefined') {
          document.cookie =
            'ems_access=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          document.cookie =
            'ems_refresh=; path=/api/v1/auth; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }
        onBeforeRedirect?.();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    },
    [logoutMutation, setSession],
  );

  return {
    signOut,
    isPending: logoutMutation.isPending,
  };
}

