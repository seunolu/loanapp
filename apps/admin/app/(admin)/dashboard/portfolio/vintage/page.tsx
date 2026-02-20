'use client';

import { useState } from 'react';
import { PageHeader } from '@/src/components/layout/page-header';
import { usePortfolioVintage } from '@/src/lib/queries/portfolio';
import { Card, CardContent } from '@/src/ui/Card';
import { Select } from '@/src/ui/Select';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2
});

function money(value: number): string {
  return MONEY.format(value);
}

export default function PortfolioVintagePage(): React.JSX.Element {
  const [months, setMonths] = useState(6);
  const vintageQuery = usePortfolioVintage(months);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vintage Analysis"
        subtitle="Cohort performance by disbursement month."
        right={
          <Select className="w-40" onChange={(event) => setMonths(Number(event.target.value))} value={String(months)}>
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </Select>
        }
      />

      <Card>
        <CardContent className="py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Cohort</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Count</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Disbursed</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Delinquent 30+</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Delinquent 90+</th>
                </tr>
              </thead>
              <tbody>
                {(vintageQuery.data?.items ?? []).map((row) => (
                  <tr key={row.cohortMonth}>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{row.cohortMonth}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{row.disbursedCount}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(row.disbursedAmount)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(row.delinquent30Amount)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(row.delinquent90Amount)}</td>
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

