'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listReconciliationRuns, runReconciliationNow } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function DashboardReconciliationPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<'RUNNING' | 'COMPLETED' | 'FAILED' | ''>('');

  const runsQuery = useQuery({
    queryKey: ['admin', 'reconciliation', 'runs', { status }, tenantId],
    queryFn: () => listReconciliationRuns({ status: status || undefined, limit: 50 }),
    enabled: Boolean(token && tenantId)
  });

  const runMutation = useMutation({
    mutationFn: async () => runReconciliationNow(),
    onSuccess: async () => {
      toast.success('Reconciliation executed');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reconciliation', 'runs'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to run reconciliation')
  });

  const statuses: Array<'RUNNING' | 'COMPLETED' | 'FAILED' | ''> = useMemo(
    () => ['', 'RUNNING', 'COMPLETED', 'FAILED'],
    []
  );

  const mismatchCountFromMetadata = (metadata: unknown): number | '-' => {
    if (!metadata || typeof metadata !== 'object') return '-';
    const obj = metadata as Record<string, unknown>;
    const direct = obj.issuesCreated;
    if (typeof direct === 'number') return direct;
    const summary = obj.summary;
    if (summary && typeof summary === 'object' && typeof (summary as Record<string, unknown>).issuesCreated === 'number') {
      return (summary as Record<string, number>).issuesCreated;
    }
    return '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reconciliation</h1>
        <div className="flex items-center gap-3">
          <button className="rounded border px-3 py-1 text-sm" onClick={() => runMutation.mutate()} type="button">
            {runMutation.isPending ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {statuses.map((item) => (
          <button
            className={`rounded border px-2 py-1 text-xs ${status === item ? 'bg-muted' : ''}`}
            key={item || 'ALL'}
            onClick={() => setStatus(item)}
            type="button"
          >
            {item || 'ALL'}
          </button>
        ))}
      </div>

      {runsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading runs...</p>}
      {runsQuery.isError && (
        <p className="text-sm text-destructive">
          {runsQuery.error instanceof Error ? runsQuery.error.message : 'Failed to load runs'}
        </p>
      )}

      {runsQuery.data ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Mismatches</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runsQuery.data.map((row) => (
                <tr className="border-t" key={row.id}>
                  <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{mismatchCountFromMetadata(row.metadata)}</td>
                  <td className="px-3 py-2">{new Date(row.startedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <Link className="underline" href={`/dashboard/reconciliation/${row.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
