'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchUnderwritingCases,
  type UnderwritingCaseListResponse,
  type UnderwritingCaseStatus
} from '@/src/features/underwriting/api';

export function useUnderwritingCases(params: {
  limit: number;
  cursor?: string;
  status?: UnderwritingCaseStatus;
  query?: string;
}) {
  return useQuery<UnderwritingCaseListResponse>({
    queryKey: ['underwriting-cases', params.limit, params.cursor ?? '', params.status ?? '', params.query ?? ''],
    queryFn: () => fetchUnderwritingCases(params),
    placeholderData: (previousData) => previousData
  });
}
