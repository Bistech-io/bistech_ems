'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  resolvePermissionsForRoles,
  ROLE_LABELS,
  type RoleName,
  type UserAuthContext,
} from '@/lib/auth/permissions';

interface AuthContextValue {
  user: UserAuthContext;
  activeRole: RoleName;
  /** Allows switching roles in UI preview/dev mode until GET /auth/me is connected */
  setPreviewRole: (role: RoleName) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: UserAuthContext;
  defaultRole?: RoleName;
}

export function AuthProvider({
  children,
  initialUser,
  defaultRole = 'super_admin',
}: AuthProviderProps) {
  const [previewRole, setPreviewRoleState] = useState<RoleName>(
    initialUser?.roles[0] ?? defaultRole,
  );
  const [customUser, setCustomUser] = useState<UserAuthContext | null>(initialUser ?? null);

  const setPreviewRole = useCallback((role: RoleName) => {
    setPreviewRoleState(role);
    setCustomUser({
      userId: 'preview-user',
      employeeId: 'BST-00101',
      name: 'BisTech Member',
      email: 'member@bistech.io',
      roleTitle: ROLE_LABELS[role],
      roles: [role],
      permissions: resolvePermissionsForRoles([role]),
    });
  }, []);

  const user = useMemo<UserAuthContext>(() => {
    if (customUser) return customUser;
    return {
      userId: 'preview-user',
      employeeId: 'BST-00101',
      name: 'BisTech Member',
      email: 'member@bistech.io',
      roleTitle: ROLE_LABELS[previewRole],
      roles: [previewRole],
      permissions: resolvePermissionsForRoles([previewRole]),
    };
  }, [customUser, previewRole]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      activeRole: user.roles[0] ?? previewRole,
      setPreviewRole,
    }),
    [user, previewRole, setPreviewRole],
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
