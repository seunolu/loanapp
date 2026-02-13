'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDisbursements, initiateDisbursement, type DisbursementStatus } from '@/src/features/disbursements/api';

export function useDisbursements(params: { limit: number; cursor?: string; status?: DisbursementStatus }) {
  const queryClient = useQueryClient();

  const disbursementsQuery = useQuery({
    queryKey: ['disbursements', params.limit, params.cursor ?? '', params.status ?? ''],
    queryFn: () => fetchDisbursements(params),
    keepPreviousData: true
  });

  const initiateMutation = useMutation({
    mutationFn: (disbursementId: string) => initiateDisbursement(disbursementId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['disbursements'] });
    }
  });

  return {
    disbursementsQuery,
    initiateMutation
  };
}
