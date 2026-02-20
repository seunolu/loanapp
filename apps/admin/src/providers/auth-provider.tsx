'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { decodeRoleFromAccessToken, getAccessToken, setAccessToken, type AdminActorRole } from '@/src/lib/api';

type AuthContextValue = {
  token: string | null;
  role: AdminActorRole | null;
  hydrated: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  token: null,
  role: null,
  hydrated: false,
  setToken: () => {},
  logout: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [role, setRole] = useState<AdminActorRole | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedToken = getAccessToken();
    setTokenState(storedToken);
    setRole(decodeRoleFromAccessToken(storedToken));
    setHydrated(true);
  }, []);

  const setToken = (nextToken: string | null) => {
    setAccessToken(nextToken);
    setTokenState(nextToken);
    setRole(decodeRoleFromAccessToken(nextToken));
  };

  const logout = () => {
    setToken(null);
  };

  const value = useMemo(
    () => ({
      token,
      role,
      hydrated,
      setToken,
      logout
    }),
    [hydrated, role, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
