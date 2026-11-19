'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthMeData } from '@ems/contracts';
import { me } from '@/features/auth/api';
import { setOnUnauthenticated } from '@/lib/api/client';
import { clearCsrfToken, setCsrfToken } from '@/lib/api/csrf';
import {
  authMeToUserContext,
  type RoleName,
  type UserAuthContext,
} from '@/lib/auth/permissions';

interface AuthContextValue {
  user: UserAuthContext | null;
  session: AuthMeData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: RoleName | null;
  setSession: (authMe: AuthMeData | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialSession?: AuthMeData | null;
}

/**
 * Provides authenticated user state hydrated strictly from server `/auth/login` or `/auth/me`.
 * Fail-closed: no client-side role switching or default elevated roles.
 */
export function AuthProvider({
  children,
  initialSession = null,
}: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSessionState] = useState<AuthMeData | null>(initialSession);
  const [hydrated, setHydrated] = useState<boolean>(Boolean(initialSession));

  const setSession = useCallback((nextSession: AuthMeData | null) => {
    setSessionState(nextSession);
    setHydrated(true);
    if (nextSession) {
      setCsrfToken(nextSession.csrfToken);
    } else {
      clearCsrfToken();
    }
  }, []);

  useEffect(() => {
    if (initialSession?.csrfToken) {
      setCsrfToken(initialSession.csrfToken);
    }
  }, [initialSession]);

  // Hydrate client session from /api/v1/auth/me if not provided by SSR
  useEffect(() => {
    if (session || hydrated || pathname === '/login') {
      return;
    }

    let cancelled = false;
    me()
      .then((data) => {
        if (!cancelled) {
          setSessionState(data);
          setCsrfToken(data.csrfToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionState(null);
          clearCsrfToken();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session, hydrated, pathname]);

  useEffect(() => {
    setOnUnauthenticated(() => {
      setSessionState(null);
      setHydrated(true);
      clearCsrfToken();
      router.replace('/login');
    });
    return () => setOnUnauthenticated(null);
  }, [router]);

  const user = useMemo<UserAuthContext | null>(() => {
    return session ? authMeToUserContext(session) : null;
  }, [session]);

  const isLoading = !session && !hydrated && pathname !== '/login';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: Boolean(session),
      isLoading,
      activeRole: session?.roles[0] ?? null,
      setSession,
    }),
    [user, session, isLoading, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
