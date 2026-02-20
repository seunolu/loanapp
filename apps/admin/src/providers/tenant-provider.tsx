'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type TenantState = {
  tenantSlug: string;
  tenantId: string;
  lenderTitle: string;
};

type TenantContextValue = {
  tenantSlug: string;
  tenantId: string;
  lenderTitle: string;
  hydrated: boolean;
  setTenant: (next: TenantState) => void;
  clearTenant: () => void;
};

const STORAGE_KEY = 'admin_tenant_context';

const TenantContext = createContext<TenantContextValue>({
  tenantSlug: '',
  tenantId: '',
  lenderTitle: '',
  hydrated: false,
  setTenant: () => {},
  clearTenant: () => {}
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [lenderTitle, setLenderTitle] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<TenantState>;
        setTenantSlug(typeof parsed.tenantSlug === 'string' ? parsed.tenantSlug : '');
        setTenantId(typeof parsed.tenantId === 'string' ? parsed.tenantId : '');
        setLenderTitle(typeof parsed.lenderTitle === 'string' ? parsed.lenderTitle : '');
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  const setTenant = (next: TenantState) => {
    setTenantSlug(next.tenantSlug);
    setTenantId(next.tenantId);
    setLenderTitle(next.lenderTitle);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const clearTenant = () => {
    setTenantSlug('');
    setTenantId('');
    setLenderTitle('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value = useMemo(
    () => ({
      tenantSlug,
      tenantId,
      lenderTitle,
      hydrated,
      setTenant,
      clearTenant
    }),
    [hydrated, lenderTitle, tenantId, tenantSlug]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
