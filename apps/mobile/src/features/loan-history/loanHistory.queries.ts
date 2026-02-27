import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../providers/auth-provider';
import { useTenant } from '../../tenant/tenant-context';
import { fetchLoanHistory } from './loanHistory.api';
import { mapLoanHistory } from './loanHistory.mapper';

export function useLoanHistory(params: { limit?: number } = {}) {
  const { status } = useAuth();
  const { tenantSlug } = useTenant();
  const limit = params.limit ?? 20;

  return useQuery({
    queryKey: ['loan-history', tenantSlug || 'default', limit],
    queryFn: async () => {
      const response = await fetchLoanHistory({ limit });
      return mapLoanHistory(response);
    },
    enabled: status === 'authenticated',
    staleTime: 30_000
  });
}

