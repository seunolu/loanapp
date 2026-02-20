'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listDisbursements } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

type DisbursementStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

export default function DashboardDisbursementsPage() {
  const { token, hydrated } = useAuth();
  const { tenantId, hydrated: tenantHydrated } = useTenant();
  const [status, setStatus] = useState<DisbursementStatus | ''>('');

  useEffect(() => {
    // page-level guard is handled by dashboard layout; keep no-op for hydration sync
  }, [hydrated, tenantHydrated, token, tenantId]);

  const disbursementsQuery = useQuery({
    queryKey: ['admin', 'disbursements', tenantId, status],
    queryFn: () => listDisbursements({ status: status || undefined }),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Disbursements</h1>
        <select
          className="rounded border px-2 py-1 text-sm"
          onChange={(event) => setStatus(event.target.value as DisbursementStatus | '')}
          value={status}
        >
          <option value="">All</option>
          <option value="PENDING">PENDING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
          <option value="REVERSED">REVERSED</option>
        </select>
      </div>

      {disbursementsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading disbursements...</p>}
      {disbursementsQuery.isError && (
        <p className="text-sm text-destructive">
          {disbursementsQuery.error instanceof Error ? disbursementsQuery.error.message : 'Failed to load disbursements'}
        </p>
      )}

      {disbursementsQuery.data ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Loan</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {disbursementsQuery.data.map((row) => (
                <tr className="border-t" key={row.id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link className="underline" href={`/dashboard/disbursements/${row.id}`}>
                      {row.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.loanApplicationId}</td>
                  <td className="px-3 py-2">
                    {row.amount} {row.currency}
                  </td>
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
