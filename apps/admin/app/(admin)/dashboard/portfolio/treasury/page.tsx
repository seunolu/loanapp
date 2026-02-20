'use client';

import { PageHeader } from '@/src/components/layout/page-header';
import { usePortfolioTreasuryExposure } from '@/src/lib/queries/portfolio';
import { Card, CardContent } from '@/src/ui/Card';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2
});

function money(value: number): string {
  return MONEY.format(value);
}

export default function PortfolioTreasuryPage(): React.JSX.Element {
  const treasuryQuery = usePortfolioTreasuryExposure();

  return (
    <div className="space-y-6">
      <PageHeader title="Treasury Exposure" subtitle="Committed, reserved, and available liquidity by funding pool." />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Committed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{money(treasuryQuery.data?.totals.committed ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Reserved</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{money(treasuryQuery.data?.totals.reserved ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Available Liquidity</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">
              {money(treasuryQuery.data?.totals.availableLiquidity ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Pool</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Committed</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Reserved</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Available</th>
                </tr>
              </thead>
              <tbody>
                {(treasuryQuery.data?.pools ?? []).map((pool) => (
                  <tr key={pool.poolId}>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{pool.poolName}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{pool.type}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{pool.status}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(pool.totalCommitted)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(pool.totalReserved)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(pool.availableLiquidity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

