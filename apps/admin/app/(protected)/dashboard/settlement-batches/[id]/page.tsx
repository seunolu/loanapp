'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { closeSettlementBatch, getSettlementBatch } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function SettlementBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { token, role } = useAuth();
  const { tenantId } = useTenant();

  const batchQuery = useQuery({
    queryKey: ['admin', 'settlement-batch', id, tenantId],
    queryFn: () => getSettlementBatch(id),
    enabled: Boolean(token && tenantId && id)
  });

  const closeMutation = useMutation({
    mutationFn: async () => closeSettlementBatch(id),
    onSuccess: async () => {
      toast.success('Settlement batch closed');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settlement-batches'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settlement-batch', id, tenantId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to close batch')
  });

  const canClose = role === 'SUPER_ADMIN' && batchQuery.data?.status !== 'CLOSED';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settlement Batch Detail</h1>
      {batchQuery.isLoading && <p className="text-sm text-muted-foreground">Loading batch...</p>}
      {batchQuery.isError && (
        <p className="text-sm text-destructive">
          {batchQuery.error instanceof Error ? batchQuery.error.message : 'Failed to load batch'}
        </p>
      )}

      {batchQuery.data ? (
        <>
          <div className="rounded border p-3 text-sm">
            <p><span className="font-medium">ID:</span> <span className="font-mono text-xs">{batchQuery.data.id}</span></p>
            <p><span className="font-medium">Provider:</span> {batchQuery.data.provider}</p>
            <p><span className="font-medium">Date:</span> {new Date(batchQuery.data.settlementDate).toISOString().slice(0, 10)}</p>
            <p><span className="font-medium">Status:</span> {batchQuery.data.status}</p>
            <p><span className="font-medium">Total amount:</span> {batchQuery.data.totalAmount}</p>
            <p className="text-xs text-muted-foreground">
              Summary: matched {batchQuery.data.summary?.matched ?? 0}, mismatch {batchQuery.data.summary?.mismatch ?? 0}, suspense {batchQuery.data.summary?.suspense ?? 0}, resolved {batchQuery.data.summary?.resolved ?? 0}, write-off {batchQuery.data.summary?.writeOff ?? 0}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="rounded border px-3 py-1 text-sm"
              disabled={!canClose || closeMutation.isPending}
              onClick={() => closeMutation.mutate()}
              type="button"
            >
              {closeMutation.isPending ? 'Closing...' : 'Close Batch'}
            </button>
            {!canClose ? <span className="text-xs text-muted-foreground">SUPER_ADMIN can close OPEN batches only.</span> : null}
            <Link className="text-sm underline" href="/dashboard/reconciliation">
              Back to Reconciliation
            </Link>
          </div>

          {Array.isArray(batchQuery.data.records) ? (
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2">Record ID</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Provider Ref</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batchQuery.data.records.map((row) => (
                    <tr className="border-t" key={row.id}>
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link className="underline" href={`/dashboard/reconciliation/${row.id}`}>
                          {row.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{row.referenceType}</td>
                      <td className="px-3 py-2">{row.providerRef ?? '-'}</td>
                      <td className="px-3 py-2">{row.amountMinor}</td>
                      <td className="px-3 py-2">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
