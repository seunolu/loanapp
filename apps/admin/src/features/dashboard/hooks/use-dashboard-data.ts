'use client';

import { useQueries } from '@tanstack/react-query';
import { fetchCollectionsLast30Days, fetchParToday, fetchSummary } from '@/src/features/dashboard/api';

export function useDashboardData() {
  const [summaryQuery, collectionsQuery, parQuery] = useQueries({
    queries: [
      { queryKey: ['dashboard-summary'], queryFn: fetchSummary },
      { queryKey: ['dashboard-collections'], queryFn: fetchCollectionsLast30Days },
      { queryKey: ['dashboard-par'], queryFn: fetchParToday }
    ]
  });

  return {
    summaryQuery,
    collectionsQuery,
    parQuery,
    isLoading: summaryQuery.isLoading || collectionsQuery.isLoading || parQuery.isLoading,
    isError: summaryQuery.isError || collectionsQuery.isError || parQuery.isError
  };
}
