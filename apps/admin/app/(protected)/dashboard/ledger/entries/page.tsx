'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { listLedgerEntries, reverseLedgerEntry } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

function formatMinor(value: string) {
  const minor = BigInt(value || '0');
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const major = abs / 100n;
  const frac = abs % 100n;
  return `${sign}${major.toString()}.${frac.toString().padStart(2, '0')}`;
}

export default function LedgerEntriesPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [referenceType, setReferenceType] = useState('');

  const entriesQuery = useQuery({
    queryKey: ['admin', 'ledger', 'entries', tenantId, from, to, referenceType],
    queryFn: () =>
      listLedgerEntries({
        from: from || undefined,
        to: to || undefined,
        referenceType: referenceType || undefined,
        limit: 100
      }),
    enabled: Boolean(token && tenantId)
  });

  const reverseMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const reason = window.prompt('Reason for reversal');
      if (!reason?.trim()) {
        throw new Error('Reason is required');
      }
      return reverseLedgerEntry(entryId, reason.trim());
    },
    onSuccess: async () => {
      toast.success('Entry reversed');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ledger', 'entries'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ledger', 'accounts'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to reverse entry')
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ledger Entries</h1>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input className="rounded border px-2 py-1 text-sm" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input className="rounded border px-2 py-1 text-sm" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Reference Type</label>
          <input className="rounded border px-2 py-1 text-sm" value={referenceType} onChange={(e) => setReferenceType(e.target.value)} placeholder="LOAN_REPAYMENT" />
        </div>
      </div>

      {entriesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading entries...</p>}
      {entriesQuery.isError && (
        <p className="text-sm text-destructive">
          {entriesQuery.error instanceof Error ? entriesQuery.error.message : 'Failed to load entries'}
        </p>
      )}

      {entriesQuery.data ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Total: {entriesQuery.data.total}</p>
          {entriesQuery.data.items.map((entry) => (
            <div key={entry.id} className="rounded border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-x-2">
                  <span className="font-mono text-xs">{entry.id}</span>
                  <span className="text-xs">{entry.type}</span>
                  <span className="text-xs">{entry.referenceType}:{entry.referenceId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(entry.occurredAt).toLocaleString()}</span>
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => reverseMutation.mutate(entry.id)}
                    type="button"
                  >
                    Reverse
                  </button>
                </div>
              </div>
              {entry.memo ? <p className="mt-1 text-xs text-muted-foreground">{entry.memo}</p> : null}
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="px-2 py-1 text-left">Account</th>
                      <th className="px-2 py-1 text-left">Direction</th>
                      <th className="px-2 py-1 text-left">Amount</th>
                      <th className="px-2 py-1 text-left">Currency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((line, idx) => (
                      <tr key={`${entry.id}-${idx}`} className="border-t">
                        <td className="px-2 py-1 font-mono">{line.accountCode}</td>
                        <td className="px-2 py-1">{line.direction}</td>
                        <td className="px-2 py-1">{formatMinor(line.amountMinor)}</td>
                        <td className="px-2 py-1">{line.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

