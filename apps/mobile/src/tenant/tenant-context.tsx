import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export const DEFAULT_API_BASE_URL = 'http://10.0.2.2:3000';

export type TenantSnapshot = {
  tenantSlug: string;
  tenantId?: string;
  lenderTitle?: string;
  apiBaseUrl: string;
  resolved: boolean;
};

type SetTenantInput = {
  tenantSlug: string;
  tenantId?: string;
  lenderTitle?: string;
  apiBaseUrl?: string;
  resolved?: boolean;
};

export type TenantContextValue = TenantSnapshot & {
  setTenant: (next: SetTenantInput) => void;
  clearTenant: () => void;
};

const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const initialState: TenantSnapshot = {
  tenantSlug: '',
  tenantId: undefined,
  lenderTitle: undefined,
  apiBaseUrl: envApiBaseUrl || DEFAULT_API_BASE_URL,
  resolved: false
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TenantSnapshot>(initialState);

  const setTenant = useCallback((next: SetTenantInput) => {
    setState((prev) => ({
      tenantSlug: next.tenantSlug.trim().toLowerCase(),
      tenantId: next.tenantId,
      lenderTitle: next.lenderTitle,
      apiBaseUrl: next.apiBaseUrl?.trim() || prev.apiBaseUrl || initialState.apiBaseUrl,
      resolved: next.resolved ?? Boolean(next.tenantId)
    }));
  }, []);

  const clearTenant = useCallback(() => {
    setState(initialState);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setTenant,
      clearTenant
    }),
    [state, setTenant, clearTenant]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);
  if (!value) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return value;
}
