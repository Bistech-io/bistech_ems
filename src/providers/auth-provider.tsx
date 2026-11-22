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
import { useRouter } from 'next/navigation';
import type { AuthMeData } from '@ems/contracts';
import { setOnUnauthenticated } from '@/lib/api/client';
import { clearCsrfToken, setCsrfToken } from '@/lib/api/csrf';
import {
  authMeToUserContext,
  resolvePermissionsForRoles,
  ROLE_LABELS,
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
  user: UserAuthContext;
  session: AuthMeData | null;
  isAuthenticated: boolean;
  activeRole: RoleName;
  setSession: (authMe: AuthMeData | null) => void;
  /** Allows switching roles in UI preview/dev mode until GET /auth/me is connected */
  setPreviewRole: (role: RoleName) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialSession?: AuthMeData | null;
  defaultRole?: RoleName;
}

export function AuthProvider({
  children,
  initialSession = null,
  defaultRole = 'super_admin',
}: AuthProviderProps) {
  const router = useRouter();
  const [session, setSessionState] = useState<AuthMeData | null>(initialSession);
  const [previewRole, setPreviewRoleState] = useState<RoleName>(
    initialSession?.roles[0] ?? defaultRole,
  );

  const setSession = useCallback((nextSession: AuthMeData | null) => {
    setSessionState(nextSession);
    if (nextSession) {
      setCsrfToken(nextSession.csrfToken);
      if (nextSession.roles[0]) {
        setPreviewRoleState(nextSession.roles[0]);
      }
    } else {
      clearCsrfToken();
    }
  }, []);

  useEffect(() => {
    if (initialSession?.csrfToken) {
      setCsrfToken(initialSession.csrfToken);
    }
  }, [initialSession]);

  useEffect(() => {
    setOnUnauthenticated(() => {
      setSessionState(null);
      clearCsrfToken();
      router.replace('/login');
    });
    return () => setOnUnauthenticated(null);
  }, [router]);

  const setPreviewRole = useCallback((role: RoleName) => {
    setPreviewRoleState(role);
    setSessionState(null);
  }, []);

  const user = useMemo<UserAuthContext>(() => {
    if (session) {
      return authMeToUserContext(session);
    }
    const persona = ROLE_PREVIEW_PERSONAS[previewRole] ?? ROLE_PREVIEW_PERSONAS.employee;
    return {
      userId: `preview-${previewRole}`,
      employeeId: persona.employeeCode,
      username: previewRole,
      name: persona.name,
      email: persona.email,
      roleTitle: persona.designation,
      roles: [previewRole],
      permissions: resolvePermissionsForRoles([previewRole]),
    };
  }, [session, previewRole]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthenticated: Boolean(session),
      activeRole: user.roles[0] ?? previewRole,
      setSession,
      setPreviewRole,
    }),
    [user, session, previewRole, setSession, setPreviewRole],
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
