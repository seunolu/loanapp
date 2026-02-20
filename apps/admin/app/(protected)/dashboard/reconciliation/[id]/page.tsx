'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getReconciliationRun, resolveReconciliationMismatch } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function ReconciliationRunDetailPage() {
  const params = useParams<{ id: string }>();
  const runId = params.id;
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const runQuery = useQuery({
    queryKey: ['admin', 'reconciliation', 'run', runId, tenantId],
    queryFn: () => getReconciliationRun(runId),
    enabled: Boolean(token && tenantId && runId)
  });

  const resolveMutation = useMutation({
    mutationFn: async (payload: { issueId: string }) =>
      resolveReconciliationMismatch(payload.issueId, 'Resolved from dashboard'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reconciliation', 'run', runId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reconciliation', 'runs'] });
      toast.success('Mismatch resolved');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to resolve mismatch')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reconciliation Run</h1>
        <Link className="text-sm underline" href="/dashboard/reconciliation">
          Back
        </Link>
      </div>

      {runQuery.isLoading && <p className="text-sm text-muted-foreground">Loading run...</p>}
      {runQuery.isError && (
        <p className="text-sm text-destructive">
          {runQuery.error instanceof Error ? runQuery.error.message : 'Failed to load run'}
        </p>
      )}

      {runQuery.data ? (
        <>
          <div className="rounded-md border p-4 text-sm">
            <p><span className="font-medium">ID:</span> <span className="font-mono text-xs">{runQuery.data.id}</span></p>
            <p><span className="font-medium">Type:</span> {runQuery.data.type}</p>
            <p><span className="font-medium">Status:</span> {runQuery.data.status}</p>
            <p><span className="font-medium">Started:</span> {new Date(runQuery.data.startedAt).toLocaleString()}</p>
            <p><span className="font-medium">Completed:</span> {runQuery.data.finishedAt ? new Date(runQuery.data.finishedAt).toLocaleString() : '-'}</p>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {runQuery.data.issues.map((issue) => (
                  <tr className="border-t" key={issue.id}>
                    <td className="px-3 py-2">
                      <span className="rounded border px-2 py-1 text-xs">{issue.severity}</span>
                    </td>
                    <td className="px-3 py-2">{issue.category}</td>
                    <td className="px-3 py-2 font-mono text-xs">{issue.entityType}:{issue.entityId}</td>
                    <td className="px-3 py-2 font-mono text-xs">{JSON.stringify(issue.expected ?? {})}</td>
                    <td className="px-3 py-2 font-mono text-xs">{JSON.stringify(issue.actual ?? {})}</td>
                    <td className="px-3 py-2">{issue.status}</td>
                    <td className="px-3 py-2">
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        disabled={resolveMutation.isPending || issue.status === 'RESOLVED'}
                        onClick={() => resolveMutation.mutate({ issueId: issue.id })}
                        type="button"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
