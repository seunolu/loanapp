'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  listReconciliationRuns,
  runReconciliation,
  type ReconciliationRunStatus,
  type ReconciliationRunType
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [type, setType] = useState<ReconciliationRunType | ''>('');
  const [status, setStatus] = useState<ReconciliationRunStatus | ''>('');
  const [runType, setRunType] = useState<ReconciliationRunType>('PAYMENT');

  const runsQuery = useQuery({
    queryKey: ['admin', 'recon', 'runs', tenantId, type, status],
    queryFn: () => listReconciliationRuns({ type: type || undefined, status: status || undefined, limit: 50 }),
    enabled: Boolean(token && tenantId)
  });

  const runMutation = useMutation({
    mutationFn: async () => runReconciliation({ type: runType, days: 7 }),
    onSuccess: async (payload) => {
      toast.success(`Run started: ${payload.runId}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'recon', 'runs', tenantId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to run reconciliation')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reconciliation</h1>
        <div className="flex items-center gap-2">
          <select
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setRunType(event.target.value as ReconciliationRunType)}
            value={runType}
          >
            <option value="PAYMENT">PAYMENT</option>
            <option value="DISBURSEMENT">DISBURSEMENT</option>
            <option value="SETTLEMENT">SETTLEMENT</option>
          </select>
          <Button disabled={runMutation.isPending} onClick={() => runMutation.mutate()} size="sm">
            {runMutation.isPending ? 'Running...' : 'Run reconciliation'}
          </Button>
          <Link className="text-sm underline" href="/reconciliation/issues">
            View issues
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <select className="rounded border px-2 py-1 text-sm" onChange={(event) => setType(event.target.value as ReconciliationRunType | '')} value={type}>
          <option value="">All types</option>
          <option value="PAYMENT">PAYMENT</option>
          <option value="DISBURSEMENT">DISBURSEMENT</option>
          <option value="SETTLEMENT">SETTLEMENT</option>
        </select>
        <select className="rounded border px-2 py-1 text-sm" onChange={(event) => setStatus(event.target.value as ReconciliationRunStatus | '')} value={status}>
          <option value="">All statuses</option>
          <option value="RUNNING">RUNNING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </div>

      {runsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading runs...</p>}
      {runsQuery.isError && (
        <p className="text-sm text-destructive">{runsQuery.error instanceof Error ? runsQuery.error.message : 'Failed to load runs.'}</p>
      )}

      {runsQuery.data ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">Run ID</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Finished</th>
              </tr>
            </thead>
            <tbody>
              {runsQuery.data.map((run) => (
                <tr className="border-t" key={run.id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link className="underline" href={`/reconciliation/runs/${run.id}`}>
                      {run.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{run.type}</td>
                  <td className="px-3 py-2">{run.status}</td>
                  <td className="px-3 py-2">{new Date(run.startedAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

