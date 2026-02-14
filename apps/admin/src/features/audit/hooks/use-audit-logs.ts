'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, type AuditFilters, type AuditLogsResponse } from '@/src/features/audit/api';

export function useAuditLogs(filters: AuditFilters) {
  return useQuery<AuditLogsResponse>({
    queryKey: [
      'audit-logs',
      filters.limit,
      filters.cursor ?? '',
      filters.from ?? '',
      filters.to ?? '',
      filters.action ?? '',
      filters.actorType ?? '',
      filters.actorId ?? '',
      filters.entityType ?? '',
      filters.entityId ?? '',
      filters.query ?? ''
    ],
    queryFn: () => fetchAuditLogs(filters),
    placeholderData: (previousData) => previousData
  });
}
