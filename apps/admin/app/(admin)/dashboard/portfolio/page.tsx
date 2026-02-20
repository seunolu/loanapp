'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { usePortfolioDelinquency, usePortfolioPar, usePortfolioSummary } from '@/src/lib/queries/portfolio';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2
});

function money(value: number): string {
  return MONEY.format(value);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function metric(title: string, value: string): React.JSX.Element {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function PortfolioOverviewPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const summaryQuery = usePortfolioSummary();
  const parQuery = usePortfolioPar();
  const delinquencyQuery = usePortfolioDelinquency();
  const loading = summaryQuery.isLoading || parQuery.isLoading || delinquencyQuery.isLoading;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'portfolio', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'portfolio', 'par'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'portfolio', 'delinquency'] })
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio Overview"
        subtitle="Core lending exposure, delinquency posture, and payment throughput."
        right={
          <div className="flex items-center gap-2">
            <Button onClick={() => void refresh()} size="sm" variant="secondary">
              Refresh
            </Button>
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/dashboard/portfolio/par">
              PAR
            </Link>
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/dashboard/portfolio/vintage">
              Vintage
            </Link>
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/dashboard/portfolio/collections">
              Collections
            </Link>
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href="/dashboard/portfolio/treasury">
              Treasury
            </Link>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={`portfolio-skeleton-${index}`}>
              <CardContent className="py-5">
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-8 w-36 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {summaryQuery.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metric('Active Loans', `${summaryQuery.data.activeLoanCount}`)}
          {metric('Outstanding Total', money(summaryQuery.data.totalOutstandingTotal))}
          {metric('Outstanding Principal', money(summaryQuery.data.totalOutstandingPrincipal))}
          {metric('Outstanding Interest', money(summaryQuery.data.totalOutstandingInterest))}
          {metric('Disbursed Today', money(summaryQuery.data.disbursedTodayAmount))}
          {metric('Disbursed This Week', money(summaryQuery.data.disbursedThisWeekAmount))}
          {metric('Disbursed This Month', money(summaryQuery.data.disbursedThisMonthAmount))}
          {metric('Repaid This Month', money(summaryQuery.data.repaymentsThisMonthAmount))}
        </div>
      ) : null}

      {delinquencyQuery.data ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-5">
            <Badge variant={delinquencyQuery.data.nplRatio > 0.1 ? 'danger' : 'warning'}>
              NPL Ratio: {pct(delinquencyQuery.data.nplRatio)}
            </Badge>
            <Badge variant={delinquencyQuery.data.par30Ratio > 0.2 ? 'danger' : 'warning'}>
              PAR30 Ratio: {pct(delinquencyQuery.data.par30Ratio)}
            </Badge>
            <span className="text-sm text-slate-600">
              PAR30 {money(delinquencyQuery.data.par30Outstanding)} | PAR90 {money(delinquencyQuery.data.par90Outstanding)}
            </span>
          </CardContent>
        </Card>
      ) : null}

      {parQuery.data ? (
        <Card>
          <CardContent className="py-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Bucket</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Count</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {parQuery.data.buckets.map((bucket) => (
                    <tr key={bucket.bucket}>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-800">{bucket.bucket}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{bucket.count}</td>
                      <td className="border-b border-slate-100 px-3 py-2 text-slate-700">{money(bucket.outstandingAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

