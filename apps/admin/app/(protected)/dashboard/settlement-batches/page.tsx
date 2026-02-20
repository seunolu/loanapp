'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createSettlementBatch, listSettlementBatches, type SettlementBatchStatus } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function SettlementBatchesPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<SettlementBatchStatus | ''>('');
  const [provider, setProvider] = useState('PAYSTACK');
  const [settlementDate, setSettlementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('NGN');

  const batchesQuery = useQuery({
    queryKey: ['admin', 'settlement-batches', { status }, tenantId],
    queryFn: () => listSettlementBatches({ status: status || undefined, limit: 100 }),
    enabled: Boolean(token && tenantId)
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      createSettlementBatch({
        provider,
        settlementDate: new Date(`${settlementDate}T00:00:00.000Z`).toISOString(),
        currency
      }),
    onSuccess: async () => {
      toast.success('Settlement batch ready');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settlement-batches'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to create settlement batch')
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settlement Batches</h1>

      <div className="rounded border p-3">
        <h2 className="mb-2 text-sm font-semibold">Create/Open Batch</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setProvider(event.target.value)}
            placeholder="Provider"
            value={provider}
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setSettlementDate(event.target.value)}
            type="date"
            value={settlementDate}
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            placeholder="Currency"
            value={currency}
          />
          <button
            className="rounded border px-3 py-1 text-sm"
            onClick={() => createMutation.mutate()}
            type="button"
          >
            {createMutation.isPending ? 'Saving...' : 'Create/Open'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(['', 'OPEN', 'CLOSED'] as const).map((item) => (
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

      {batchesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading batches...</p>}
      {batchesQuery.isError && (
        <p className="text-sm text-destructive">
          {batchesQuery.error instanceof Error ? batchesQuery.error.message : 'Failed to load batches'}
        </p>
      )}

      {Array.isArray(batchesQuery.data) ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {batchesQuery.data.map((row) => (
                <tr className="border-t" key={row.id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link className="underline" href={`/dashboard/settlement-batches/${row.id}`}>
                      {row.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.provider}</td>
                  <td className="px-3 py-2">{new Date(row.settlementDate).toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{row.currency}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
