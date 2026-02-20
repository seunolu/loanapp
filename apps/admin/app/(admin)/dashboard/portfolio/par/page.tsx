'use client';

import { PageHeader } from '@/src/components/layout/page-header';
import { usePortfolioPar } from '@/src/lib/queries/portfolio';
import { Card, CardContent } from '@/src/ui/Card';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2
});

function money(value: number): string {
  return MONEY.format(value);
}

export default function PortfolioParPage(): React.JSX.Element {
  const parQuery = usePortfolioPar();
  const maxAmount = Math.max(1, ...(parQuery.data?.buckets.map((bucket) => bucket.outstandingAmount) ?? [1]));

  return (
    <div className="space-y-6">
      <PageHeader title="Portfolio At Risk" subtitle="DPD bucket distribution and exposure concentrations." />

      <Card>
        <CardContent className="space-y-4 py-5">
          {(parQuery.data?.buckets ?? []).map((bucket) => (
            <div key={bucket.bucket}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{bucket.bucket}</span>
                <span className="text-slate-600">
                  {bucket.count} loans | {money(bucket.outstandingAmount)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-slate-700"
                  style={{ width: `${Math.max(4, (bucket.outstandingAmount / maxAmount) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          <div className="grid gap-3 border-t border-slate-200 pt-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">PAR 30</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{money(parQuery.data?.par30 ?? 0)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">PAR 90</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{money(parQuery.data?.par90 ?? 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

