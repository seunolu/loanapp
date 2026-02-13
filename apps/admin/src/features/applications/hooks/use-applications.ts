'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchApplications, type LoanApplicationStatus } from '@/src/features/applications/api';

export function useApplications(params: {
  limit: number;
  cursor?: string;
  status?: LoanApplicationStatus;
  query?: string;
}) {
  return useQuery({
    queryKey: ['loan-applications', params.limit, params.cursor ?? '', params.status ?? '', params.query ?? ''],
    queryFn: () => fetchApplications(params),
    keepPreviousData: true
  });
}
