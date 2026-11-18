import {
  authMeResponseSchema,
  loginResponseSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  type AuthMeData,
  type LoginRequest,
} from '@ems/contracts';
import { apiRequest } from '@/lib/api/client';
import { clearCsrfToken, setCsrfToken } from '@/lib/api/csrf';

export async function login(payload: LoginRequest): Promise<AuthMeData> {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: payload,
    schema: loginResponseSchema,
    skipAuthRefresh: true,
  });
  setCsrfToken(res.data.csrfToken);
  return res.data;
}

export async function me(): Promise<AuthMeData> {
  const res = await apiRequest('/auth/me', {
    method: 'GET',
    schema: authMeResponseSchema,
  });
  setCsrfToken(res.data.csrfToken);
  return res.data;
}

export async function refresh(): Promise<AuthMeData> {
  const res = await apiRequest('/auth/refresh', {
    method: 'POST',
    schema: refreshResponseSchema,
    skipAuthRefresh: true,
  });
  setCsrfToken(res.data.csrfToken);
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      schema: logoutResponseSchema,
      skipAuthRefresh: true,
    });
  } finally {
    clearCsrfToken();
  }
}
