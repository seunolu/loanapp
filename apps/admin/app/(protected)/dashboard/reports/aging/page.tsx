'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getAgingReport } from '@/src/lib/api';
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

export default function AgingReportPage() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const agingQuery = useQuery({
    queryKey: ['admin', 'reports', 'aging', tenantId],
    queryFn: () => getAgingReport(),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Aging Report</h1>
        <Link className="text-sm underline" href="/dashboard/reports/portfolio">
          Portfolio
        </Link>
      </div>

      {agingQuery.isLoading && <p className="text-sm text-muted-foreground">Loading aging buckets...</p>}
      {agingQuery.isError && (
        <p className="text-sm text-destructive">
          {agingQuery.error instanceof Error ? agingQuery.error.message : 'Failed to load aging'}
        </p>
      )}

      {agingQuery.data ? (
        <div className="rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-2 text-left">Bucket</th>
                <th className="px-2 py-2 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              {agingQuery.data.buckets.map((row) => (
                <tr className="border-t" key={row.bucket}>
                  <td className="px-2 py-2">{row.bucket}</td>
                  <td className="px-2 py-2">{formatMinor(row.amountMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

