import { proxyRequest } from '@/lib/api/web-client';

export type AuditLogListItem = {
  id: string;
  action: string;
  actorType: string;
  actorId: string | null;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  metadata?: unknown;
};

export type AuditLogsResponse = {
  items: AuditLogListItem[];
  nextCursor: string | null;
};

export type AuditFilters = {
  limit: number;
  cursor?: string;
  from?: string;
  to?: string;
  action?: string;
  actorType?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  query?: string;
};

function toSearch(filters: AuditFilters): string {
  const search = new URLSearchParams({ limit: String(filters.limit) });
  if (filters.cursor) {
    search.set('cursor', filters.cursor);
  }
  if (filters.from) {
    search.set('from', filters.from);
  }
  if (filters.to) {
    search.set('to', filters.to);
  }
  if (filters.action) {
    search.set('action', filters.action);
  }
  if (filters.actorType) {
    search.set('actorType', filters.actorType);
  }
  if (filters.actorId) {
    search.set('actorId', filters.actorId);
  }
  if (filters.entityType) {
    search.set('entityType', filters.entityType);
  }
  if (filters.entityId) {
    search.set('entityId', filters.entityId);
  }
  if (filters.query) {
    search.set('query', filters.query);
  }
  return search.toString();
}

export async function fetchAuditLogs(filters: AuditFilters): Promise<AuditLogsResponse> {
  return (await proxyRequest(`admin/audit-logs?${toSearch(filters)}`)) as AuditLogsResponse;
}

export function buildAuditExportUrl(filters: Omit<AuditFilters, 'limit' | 'cursor'>): string {
  return `/api/proxy/admin/audit-logs/export.csv?${toSearch({ ...filters, limit: 50000 })}`;
}
