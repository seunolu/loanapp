'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { exportAdminAuditsCsv, listAdminAudits } from '@/src/lib/api';
import { useTenant } from '@/src/providers/tenant-provider';

type Filters = {
  from: string;
  to: string;
  actorType: '' | 'BORROWER' | 'TENANT_ADMIN' | 'SYSTEM';
  status: '' | 'SUCCESS' | 'FAIL';
  action: string;
  entityType: string;
  entityId: string;
  q: string;
  page: number;
};

export default function DashboardAuditsPage() {
  const { tenantId } = useTenant();
  const [filters, setFilters] = useState<Filters>({
    from: '',
    to: '',
    actorType: '',
    status: '',
    action: '',
    entityType: '',
    entityId: '',
    q: '',
    page: 1
  });

  const queryInput = useMemo(
    () => ({
      from: filters.from || undefined,
      to: filters.to || undefined,
      actorType: filters.actorType || undefined,
      status: filters.status || undefined,
      action: filters.action || undefined,
      entityType: filters.entityType || undefined,
      entityId: filters.entityId || undefined,
      q: filters.q || undefined,
      page: filters.page,
      pageSize: 25,
      sort: '-createdAt' as const
    }),
    [filters]
  );

  const auditsQuery = useQuery({
    queryKey: ['admin', 'audits', tenantId, queryInput],
    queryFn: () => listAdminAudits(queryInput),
    enabled: Boolean(tenantId)
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit Explorer</h1>

      <div className="grid gap-2 md:grid-cols-4">
        <input className="rounded border p-2 text-sm" type="datetime-local" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))} />
        <input className="rounded border p-2 text-sm" type="datetime-local" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))} />
        <select className="rounded border p-2 text-sm" value={filters.actorType} onChange={(e) => setFilters((f) => ({ ...f, actorType: e.target.value as Filters['actorType'], page: 1 }))}>
          <option value="">Actor Type</option>
          <option value="BORROWER">BORROWER</option>
          <option value="TENANT_ADMIN">TENANT_ADMIN</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>
        <select className="rounded border p-2 text-sm" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters['status'], page: 1 }))}>
          <option value="">Status</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAIL">FAIL</option>
        </select>
        <input className="rounded border p-2 text-sm" placeholder="action contains..." value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value, page: 1 }))} />
        <input className="rounded border p-2 text-sm" placeholder="entityType" value={filters.entityType} onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value, page: 1 }))} />
        <input className="rounded border p-2 text-sm" placeholder="entityId" value={filters.entityId} onChange={(e) => setFilters((f) => ({ ...f, entityId: e.target.value, page: 1 }))} />
        <input className="rounded border p-2 text-sm" placeholder="free text q" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))} />
      </div>

      <div>
        <Button
          variant="outline"
          onClick={() => exportAdminAuditsCsv(queryInput)}
        >
          Export CSV
        </Button>
      </div>

      {auditsQuery.isLoading && <div className="text-sm text-muted-foreground">Loading audits...</div>}
      {auditsQuery.isError && (
        <div className="text-sm text-destructive">{auditsQuery.error instanceof Error ? auditsQuery.error.message : 'Failed to load audits.'}</div>
      )}

      {!auditsQuery.isLoading && !auditsQuery.isError && (
        <>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-2 text-left">Created</th>
                  <th className="px-2 py-2 text-left">Action</th>
                  <th className="px-2 py-2 text-left">Actor</th>
                  <th className="px-2 py-2 text-left">Entity</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">RequestId</th>
                </tr>
              </thead>
              <tbody>
                {(auditsQuery.data?.items ?? []).map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/20">
                    <td className="px-2 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <Link className="underline" href={`/dashboard/audits/${item.id}`}>
                        {item.action}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{item.actorType ?? '-'} / {item.actorId ?? '-'}</td>
                    <td className="px-2 py-2">{item.entityType ?? '-'} / {item.entityId ?? '-'}</td>
                    <td className="px-2 py-2">{item.status}</td>
                    <td className="px-2 py-2 font-mono text-xs">{item.requestId ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
            >
              Prev
            </Button>
            <div className="text-sm">
              Page {auditsQuery.data?.page ?? 1} / {auditsQuery.data?.totalPages ?? 1}
            </div>
            <Button
              variant="outline"
              disabled={(auditsQuery.data?.page ?? 1) >= (auditsQuery.data?.totalPages ?? 1)}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
