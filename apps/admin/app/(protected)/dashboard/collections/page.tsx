'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  listCollectionsCases,
  runCollectionsScan,
  type CollectionsCaseStatus,
  type CollectionsStage
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<CollectionsCaseStatus | ''>('OPEN');
  const [stage, setStage] = useState<CollectionsStage | ''>('');

  const casesQuery = useQuery({
    queryKey: ['admin', 'collections', 'cases', { status, stage }, tenantId],
    queryFn: () => listCollectionsCases({ status: status || undefined, stage: stage || undefined, limit: 200 }),
    enabled: Boolean(token && tenantId)
  });

  const runMutation = useMutation({
    mutationFn: async () => runCollectionsScan(),
    onSuccess: async (payload) => {
      toast.success(`Scan done: scanned=${payload.scanned}, opened=${payload.opened}, resolved=${payload.resolved}`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'collections', 'cases'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to run scan')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Collections Cases</h1>
        <Button disabled={runMutation.isPending} onClick={() => runMutation.mutate()} size="sm">
          {runMutation.isPending ? 'Running...' : 'Run Scan'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="rounded border px-2 py-1 text-sm" onChange={(e) => setStatus(e.target.value as CollectionsCaseStatus | '')} value={status}>
          <option value="">All status</option>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="PROMISE_TO_PAY">PROMISE_TO_PAY</option>
          <option value="BROKEN_PTP">BROKEN_PTP</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
          <option value="WRITTEN_OFF">WRITTEN_OFF</option>
        </select>
        <select className="rounded border px-2 py-1 text-sm" onChange={(e) => setStage(e.target.value as CollectionsStage | '')} value={stage}>
          <option value="">All stage</option>
          <option value="SOFT">SOFT</option>
          <option value="FIELD">FIELD</option>
          <option value="LEGAL">LEGAL</option>
        </select>
      </div>

      {casesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading cases...</p>}
      {casesQuery.isError && (
        <p className="text-sm text-destructive">
          {casesQuery.error instanceof Error ? casesQuery.error.message : 'Failed to load cases'}
        </p>
      )}

      {!casesQuery.isLoading && !casesQuery.isError ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-2 py-2 text-left">Case ID</th>
                <th className="px-2 py-2 text-left">Borrower</th>
                <th className="px-2 py-2 text-left">Loan Account</th>
                <th className="px-2 py-2 text-left">DPD</th>
                <th className="px-2 py-2 text-left">Outstanding</th>
                <th className="px-2 py-2 text-left">Stage</th>
                <th className="px-2 py-2 text-left">Assigned</th>
                <th className="px-2 py-2 text-left">Last Contact</th>
                <th className="px-2 py-2 text-left">Next Action</th>
                <th className="px-2 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(casesQuery.data ?? []).map((item) => (
                <tr className="border-t" key={item.id}>
                  <td className="px-2 py-2 font-mono text-xs">{item.id}</td>
                  <td className="px-2 py-2">{item.borrowerName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{item.loanAccountId}</td>
                  <td className="px-2 py-2">{item.currentDpd}</td>
                  <td className="px-2 py-2">{item.currentOutstanding}</td>
                  <td className="px-2 py-2">{item.stage}</td>
                  <td className="px-2 py-2 font-mono text-xs">{item.assignedToAdminUserId ?? '-'}</td>
                  <td className="px-2 py-2">{item.lastContactAt ? new Date(item.lastContactAt).toLocaleString() : '-'}</td>
                  <td className="px-2 py-2">{item.nextActionAt ? new Date(item.nextActionAt).toLocaleString() : '-'}</td>
                  <td className="px-2 py-2">
                    <Link className="underline" href={`/dashboard/collections/${item.id}`}>
                      Open
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

