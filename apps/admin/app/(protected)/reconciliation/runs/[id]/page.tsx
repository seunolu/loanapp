'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getReconciliationRun, updateReconciliationIssue } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

type PageProps = {
  params: { id: string };
};

export default function ReconciliationRunDetailPage({ params }: PageProps) {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const runQuery = useQuery({
    queryKey: ['admin', 'recon', 'run', params.id],
    queryFn: () => getReconciliationRun(params.id),
    enabled: Boolean(token && tenantId)
  });

  const updateIssueMutation = useMutation({
    mutationFn: async (input: { issueId: string; status: 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED' }) =>
      updateReconciliationIssue(input.issueId, { status: input.status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'recon', 'run', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'recon', 'issues', tenantId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Issue update failed')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reconciliation Run</h1>
        <Link className="text-sm underline" href="/reconciliation">
          Back to runs
        </Link>
      </div>

      {runQuery.isLoading && <p className="text-sm text-muted-foreground">Loading run details...</p>}
      {runQuery.isError && (
        <p className="text-sm text-destructive">{runQuery.error instanceof Error ? runQuery.error.message : 'Failed to load run.'}</p>
      )}

      {runQuery.data ? (
        <>
          <div className="rounded-md border p-4 text-sm">
            <div>ID: {runQuery.data.id}</div>
            <div>Type: {runQuery.data.type}</div>
            <div>Status: {runQuery.data.status}</div>
            <div>Started: {new Date(runQuery.data.startedAt).toLocaleString()}</div>
            <div>Finished: {runQuery.data.finishedAt ? new Date(runQuery.data.finishedAt).toLocaleString() : '-'}</div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Provider Ref</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runQuery.data.issues.map((issue) => (
                  <tr className="border-t" key={issue.id}>
                    <td className="px-3 py-2">
                      <span className="rounded border px-2 py-1 text-xs">{issue.severity}</span>
                    </td>
                    <td className="px-3 py-2">{issue.category}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {issue.entityType}:{issue.entityId}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{issue.providerRef || '-'}</td>
                    <td className="px-3 py-2">{issue.status}</td>
                    <td className="px-3 py-2">{new Date(issue.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          disabled={updateIssueMutation.isPending}
                          onClick={() => updateIssueMutation.mutate({ issueId: issue.id, status: 'ACKNOWLEDGED' })}
                          size="sm"
                          variant="outline"
                        >
                          Ack
                        </Button>
                        <Button
                          disabled={updateIssueMutation.isPending}
                          onClick={() => updateIssueMutation.mutate({ issueId: issue.id, status: 'RESOLVED' })}
                          size="sm"
                          variant="outline"
                        >
                          Resolve
                        </Button>
                        <Button
                          disabled={updateIssueMutation.isPending}
                          onClick={() => updateIssueMutation.mutate({ issueId: issue.id, status: 'ESCALATED' })}
                          size="sm"
                          variant="destructive"
                        >
                          Escalate
                        </Button>
                      </div>
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

