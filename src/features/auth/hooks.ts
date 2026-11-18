'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthMeData, LoginRequest } from '@ems/contracts';
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
    },
  });
}
