'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchDisbursements,
  initiateDisbursement,
  type DisbursementListResponse,
  type DisbursementStatus
} from '@/src/features/disbursements/api';

export function useDisbursements(params: { limit: number; cursor?: string; status?: DisbursementStatus }) {
  const queryClient = useQueryClient();

  const disbursementsQuery = useQuery<DisbursementListResponse>({
    queryKey: ['disbursements', params.limit, params.cursor ?? '', params.status ?? ''],
    queryFn: () => fetchDisbursements(params),
    placeholderData: (previousData) => previousData
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
