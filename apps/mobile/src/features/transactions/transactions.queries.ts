import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../providers/auth-provider';
import { useTenant } from '../../tenant/tenant-context';
import { shouldUseMockApi } from '../../lib/mock';
import { getTransactionDetail, listTransactions } from './transactions.api';
import type { TransactionListParams } from './transactions.types';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (tenantSlug: string, filter: string, search: string, useMock: boolean) => ['transactions', tenantSlug, filter, search, useMock] as const,
  detail: (tenantSlug: string, id: string, useMock: boolean) => ['transactions', tenantSlug, id, useMock] as const
};

export function useTransactions(params: TransactionListParams = {}) {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();
  const filter = params.filter ?? 'ALL';
  const search = params.search ?? '';
  const useMock = shouldUseMockApi();

  return useQuery({
    queryKey: transactionKeys.list(tenantSlug || 'default', filter, search, useMock),
    queryFn: () => listTransactions({ filter, search }),
    enabled: status === 'authenticated',
    staleTime: 30_000
  });
}

export function useTransactionDetail(id: string) {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();
  const useMock = shouldUseMockApi();

  return useQuery({
    queryKey: transactionKeys.detail(tenantSlug || 'default', id, useMock),
    queryFn: () => getTransactionDetail(id),
    enabled: Boolean(id) && status === 'authenticated',
    staleTime: 30_000
  });
}
