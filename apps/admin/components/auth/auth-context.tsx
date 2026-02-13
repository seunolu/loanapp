'use client';

import { createContext, useContext, useMemo } from 'react';
import type { AdminPermission } from '@/lib/auth/permissions';
import { useMe } from '@/lib/use-me';

export type AuthState = {
  adminId: string | null;
  role: string | null;
  lenderId: string | null;
  email: string | null;
  permissions: AdminPermission[];
};

const AuthContext = createContext<{
  auth: AuthState;
  loading: boolean;
  refresh: () => Promise<void>;
}>({
  auth: { adminId: null, role: null, lenderId: null, email: null, permissions: [] },
  loading: true,
  refresh: async () => {}
});

const emptyState: AuthState = {
  adminId: null,
  role: null,
  lenderId: null,
  email: null,
  permissions: []
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const meQuery = useMe();
  const auth: AuthState = meQuery.data
    ? {
        adminId: meQuery.data.admin.id,
        role: meQuery.data.admin.role ?? null,
        lenderId: meQuery.data.lender?.id ?? null,
        email: meQuery.data.admin.email,
        permissions: meQuery.data.permissions ?? []
      }
    : emptyState;

  const value = useMemo(
    () => ({
      auth,
      loading: meQuery.isLoading,
      refresh: async () => {
        await meQuery.refetch();
      }
    }),
    [auth, meQuery]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
