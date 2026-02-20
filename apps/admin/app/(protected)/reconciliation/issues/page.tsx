'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  listReconciliationIssues,
  updateReconciliationIssue,
  type ReconciliationIssueCategory,
  type ReconciliationIssueSeverity,
  type ReconciliationIssueStatus
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function ReconciliationIssuesPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<ReconciliationIssueStatus | ''>('OPEN');
  const [severity, setSeverity] = useState<ReconciliationIssueSeverity | ''>('');
  const [category, setCategory] = useState<ReconciliationIssueCategory | ''>('');

  const issuesQuery = useQuery({
    queryKey: ['admin', 'recon', 'issues', { status, severity, category }, tenantId],
    queryFn: () =>
      listReconciliationIssues({
        status: status || undefined,
        severity: severity || undefined,
        category: category || undefined,
        limit: 200
      }),
    enabled: Boolean(token && tenantId)
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; status: 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED' }) =>
      updateReconciliationIssue(payload.id, { status: payload.status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'recon', 'issues'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'recon', 'runs'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update issue')
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reconciliation Issues</h1>
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded border px-2 py-1 text-sm"
          onChange={(event) => setStatus(event.target.value as ReconciliationIssueStatus | '')}
          value={status}
        >
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="ESCALATED">ESCALATED</option>
        </select>
        <select
          className="rounded border px-2 py-1 text-sm"
          onChange={(event) => setSeverity(event.target.value as ReconciliationIssueSeverity | '')}
          value={severity}
        >
          <option value="">All severity</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <select
          className="rounded border px-2 py-1 text-sm"
          onChange={(event) => setCategory(event.target.value as ReconciliationIssueCategory | '')}
          value={category}
        >
          <option value="">All categories</option>
          <option value="MISSING_LEDGER">MISSING_LEDGER</option>
          <option value="DUPLICATE_LEDGER">DUPLICATE_LEDGER</option>
          <option value="AMOUNT_MISMATCH">AMOUNT_MISMATCH</option>
          <option value="STATUS_MISMATCH">STATUS_MISMATCH</option>
          <option value="UNKNOWN_REFERENCE">UNKNOWN_REFERENCE</option>
          <option value="FEE_MISMATCH">FEE_MISMATCH</option>
        </select>
      </div>

      {issuesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading issues...</p>}
      {issuesQuery.isError && (
        <p className="text-sm text-destructive">{issuesQuery.error instanceof Error ? issuesQuery.error.message : 'Failed to load issues.'}</p>
      )}

      {issuesQuery.data ? (
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
              {issuesQuery.data.map((issue) => (
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
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: issue.id, status: 'ACKNOWLEDGED' })}
                        size="sm"
                        variant="outline"
                      >
                        Ack
                      </Button>
                      <Button
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: issue.id, status: 'RESOLVED' })}
                        size="sm"
                        variant="outline"
                      >
                        Resolve
                      </Button>
                      <Button
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: issue.id, status: 'ESCALATED' })}
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
      ) : null}
    </div>
  );
}

