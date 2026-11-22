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
  resolvePermissionsForRoles,
  type RoleName,
  type UserAuthContext,
} from '@/lib/auth/permissions';

export const ROLE_PREVIEW_PERSONAS: Record<
  RoleName,
  {
    name: string;
    email: string;
    employeeCode: string;
    designation: string;
    department: string;
    teamName: string;
  }
> = {
  super_admin: {
    name: 'BisTech Admin',
    email: 'admin@bistech.io',
    employeeCode: 'BST-0001',
    designation: 'Super Administrator',
    department: 'Management & Operations',
    teamName: 'Executive Leadership',
  },
  hr_manager: {
    name: 'Nadia Rahman',
    email: 'hr@bistech.io',
    employeeCode: 'BST-1001',
    designation: 'HR Manager',
    department: 'Human Resources',
    teamName: 'People Operations',
  },
  dept_head: {
    name: 'Farhan Ahmed',
    email: 'head@bistech.io',
    employeeCode: 'BST-1002',
    designation: 'Lead Engineer & Department Head',
    department: 'Engineering',
    teamName: 'Engineering Leadership',
  },
  employee: {
    name: 'Mehedi Alam',
    email: 'employee@bistech.io',
    employeeCode: 'BST-1003',
    designation: 'Senior Frontend Engineer',
    department: 'Engineering',
    teamName: 'Core Platform Squad',
  },
};

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
  /** Optional static role fixture used by unit tests only */
  defaultRole?: RoleName;
}

/**
 * Provides authenticated user state hydrated strictly from server `/auth/login` or `/auth/me`.
 * Fail-closed in app runtime: no client-side role switching or default elevated roles.
 */
export function AuthProvider({
  children,
  initialSession = null,
  defaultRole,
}: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSessionState] = useState<AuthMeData | null>(initialSession);
  const [hydrated, setHydrated] = useState<boolean>(
    Boolean(initialSession) || Boolean(defaultRole),
  );

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
    if (session) {
      return authMeToUserContext(session);
    }
    if (defaultRole) {
      const persona = ROLE_PREVIEW_PERSONAS[defaultRole] ?? ROLE_PREVIEW_PERSONAS.employee;
      return {
        userId: `preview-${defaultRole}`,
        employeeId: persona.employeeCode,
        username: defaultRole,
        name: persona.name,
        email: persona.email,
        roleTitle: persona.designation,
        roles: [defaultRole],
        permissions: resolvePermissionsForRoles([defaultRole]),
      };
    }
    return null;
  }, [session, defaultRole]);

  const isLoading = !session && !hydrated && pathname !== '/login';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: Boolean(session),
      isLoading,
      activeRole: session?.roles[0] ?? defaultRole ?? null,
      setSession,
    }),
    [user, session, isLoading, defaultRole, setSession],
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
