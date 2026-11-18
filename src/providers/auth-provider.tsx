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
    return {
      userId: 'preview-user',
      employeeId: 'BST-00101',
      name: 'BisTech Member',
      email: 'member@bistech.io',
      roleTitle: ROLE_LABELS[previewRole],
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
