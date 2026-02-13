'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchUnderwritingCases, type UnderwritingCaseStatus } from '@/src/features/underwriting/api';

export function useUnderwritingCases(params: {
  limit: number;
  cursor?: string;
  status?: UnderwritingCaseStatus;
  query?: string;
}) {
  return useQuery({
    queryKey: ['underwriting-cases', params.limit, params.cursor ?? '', params.status ?? '', params.query ?? ''],
    queryFn: () => fetchUnderwritingCases(params),
    keepPreviousData: true
  });
}
