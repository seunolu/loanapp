import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../providers/auth-provider';
import { fetchLoanDetail } from './loanHistory.api';
import { mapLoanDetail } from './loanHistory.mapper';

export function useLoanDetail(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['loan-detail', id],
    queryFn: async () => {
      const response = await fetchLoanDetail(id);
      return mapLoanDetail(response);
    },
    enabled: Boolean(id) && status === 'authenticated',
    staleTime: 30_000
  });
}

