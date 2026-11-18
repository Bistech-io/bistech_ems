import { authMeResponseSchema, type AuthMeData } from '@ems/contracts';
import { serverApiRequest } from '@/lib/api/server';

/**
 * Server Component session loader.
 * Fetches `GET /api/v1/auth/me` forwarding cookies. Returns `null` when unauthenticated
 * or when the backend is unreachable (e.g., browser-only MSW mode).
 */
export async function getSession(): Promise<AuthMeData | null> {
  try {
    const response = await serverApiRequest('/auth/me', authMeResponseSchema);
    return response.data;
  } catch {
    return null;
  }
}
