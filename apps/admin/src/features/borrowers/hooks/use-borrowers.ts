'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchBorrowers } from '@/src/features/borrowers/api';

export function useBorrowers(params: { limit: number; cursor?: string; query?: string }) {
  return useQuery({
    queryKey: ['borrowers', params.limit, params.cursor ?? '', params.query ?? ''],
    queryFn: () => fetchBorrowers(params),
    keepPreviousData: true
  });
}
