import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { getTenantSlug, setTenantSlug } from '../lib/storage';

export const DEFAULT_API_BASE_URL = 'http://10.0.2.2:3000';
const DEFAULT_TENANT_SLUG =
  process.env.EXPO_PUBLIC_DEFAULT_TENANT_SLUG?.trim().toLowerCase() ??
  String((Constants.expoConfig?.extra as { defaultTenantSlug?: string } | undefined)?.defaultTenantSlug ?? '')
    .trim()
    .toLowerCase();
let hydratedTenantSlug: string | null | undefined;
let hydrateTenantPromise: Promise<string | null> | null = null;

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
  tenantSlug: DEFAULT_TENANT_SLUG,
  tenantId: undefined,
  lenderTitle: undefined,
  apiBaseUrl: envApiBaseUrl || DEFAULT_API_BASE_URL,
  resolved: Boolean(DEFAULT_TENANT_SLUG)
};

async function resolveHydratedTenantSlug(): Promise<string | null> {
  const storedSlug = (await getTenantSlug())?.trim().toLowerCase() ?? '';
  const slugToUse = storedSlug || DEFAULT_TENANT_SLUG;
  if (!slugToUse) {
    hydratedTenantSlug = null;
    return null;
  }
  if (!storedSlug) {
    await setTenantSlug(slugToUse);
  }
  hydratedTenantSlug = slugToUse;
  return slugToUse;
}

export async function hydrateTenant(): Promise<void> {
  if (!hydrateTenantPromise) {
    hydrateTenantPromise = resolveHydratedTenantSlug().finally(() => {
      hydrateTenantPromise = null;
    });
  }
  await hydrateTenantPromise;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TenantSnapshot>(() => {
    if (hydratedTenantSlug === undefined) {
      return initialState;
    }
    return {
      ...initialState,
      tenantSlug: hydratedTenantSlug ?? '',
      resolved: Boolean(hydratedTenantSlug)
    };
  });

  useEffect(() => {
    let active = true;
    (async () => {
      await hydrateTenant();
      if (!active) {
        return;
      }
      const slugToUse = hydratedTenantSlug ?? '';
      setState((prev) => ({
        ...prev,
        tenantSlug: slugToUse,
        resolved: Boolean(slugToUse)
      }));
    })();
    return () => {
      active = false;
    };
  }, []);

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
