'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getPortfolioCollections,
  getPortfolioDelinquency,
  getPortfolioKpis,
  getPortfolioPar,
  getPortfolioSummary,
  getPortfolioTreasuryExposure,
  getPortfolioTrends,
  getPortfolioVintage
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export function usePortfolioKpis() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'kpis', tenantId],
    queryFn: () => getPortfolioKpis(),
    enabled: Boolean(token && tenantId),
    staleTime: 30_000
  });
}

export function usePortfolioTrends(days: number) {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'trends', tenantId, days],
    queryFn: () => getPortfolioTrends(days),
    enabled: Boolean(token && tenantId),
    staleTime: 30_000
  });
}

export function usePortfolioSummary() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'summary', tenantId],
    queryFn: () => getPortfolioSummary(),
    enabled: Boolean(token && tenantId),
    staleTime: 60_000
  });
}

export function usePortfolioPar() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'par', tenantId],
    queryFn: () => getPortfolioPar(),
    enabled: Boolean(token && tenantId),
    staleTime: 60_000
  });
}

export function usePortfolioDelinquency() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'delinquency', tenantId],
    queryFn: () => getPortfolioDelinquency(),
    enabled: Boolean(token && tenantId),
    staleTime: 60_000
  });
}

export function usePortfolioVintage(months: number) {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'vintage', tenantId, months],
    queryFn: () => getPortfolioVintage(months),
    enabled: Boolean(token && tenantId),
    staleTime: 60_000
  });
}

export function usePortfolioCollections(days: number) {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'collections', tenantId, days],
    queryFn: () => getPortfolioCollections(days),
    enabled: Boolean(token && tenantId),
    staleTime: 60_000
  });
}

export function usePortfolioTreasuryExposure() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['admin', 'portfolio', 'treasury', tenantId],
    queryFn: () => getPortfolioTreasuryExposure(),
    enabled: Boolean(token && tenantId),
    staleTime: 60_000
  });
}
