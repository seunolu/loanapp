'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listLedgerAccounts } from '@/src/lib/api';
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

export default function LedgerPage() {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [asOf, setAsOf] = useState('');

  const accountsQuery = useQuery({
    queryKey: ['admin', 'ledger', 'accounts', tenantId, asOf],
    queryFn: () => listLedgerAccounts(asOf || undefined),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ledger</h1>
        <Link className="text-sm underline" href="/dashboard/ledger/entries">
          View Entries
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm">As of</label>
        <input
          className="rounded border px-2 py-1 text-sm"
          type="datetime-local"
          value={asOf}
          onChange={(event) => setAsOf(event.target.value)}
        />
      </div>

      {accountsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading accounts...</p>}
      {accountsQuery.isError && (
        <p className="text-sm text-destructive">
          {accountsQuery.error instanceof Error ? accountsQuery.error.message : 'Failed to load accounts'}
        </p>
      )}

      {accountsQuery.data ? (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-2 py-2 text-left">Code</th>
                <th className="px-2 py-2 text-left">Name</th>
                <th className="px-2 py-2 text-left">Type</th>
                <th className="px-2 py-2 text-left">Normal</th>
                <th className="px-2 py-2 text-left">Debit</th>
                <th className="px-2 py-2 text-left">Credit</th>
                <th className="px-2 py-2 text-left">Balance</th>
              </tr>
            </thead>
            <tbody>
              {accountsQuery.data.map((row) => (
                <tr key={row.code} className="border-t">
                  <td className="px-2 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2">{row.type}</td>
                  <td className="px-2 py-2">{row.normalBalance}</td>
                  <td className="px-2 py-2">{formatMinor(row.debitMinor)}</td>
                  <td className="px-2 py-2">{formatMinor(row.creditMinor)}</td>
                  <td className="px-2 py-2 font-medium">{formatMinor(row.balanceMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

