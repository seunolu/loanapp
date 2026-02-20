'use client';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { MetricCard } from '@/src/components/ui/metric-card';
import { usePortfolioKpis } from '@/src/lib/queries/portfolio';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(value);
}

function formatPercent(rate: number): string {
  return `${(Math.max(0, rate) * 100).toFixed(2)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardOverviewPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const kpisQuery = usePortfolioKpis();

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'portfolio', 'kpis'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'portfolio', 'trends'] })
    ]);
    await kpisQuery.refetch();
  };

  const kpis = kpisQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Executive summary of your tenant portfolio."
        right={
          <div className="flex items-center gap-2">
            <Button
              className="focus-visible:ring-slate-300"
              onClick={() => {
                void refreshAll();
              }}
              size="sm"
              variant="secondary"
            >
              Refresh
            </Button>
            <Link href="/dashboard/portfolio">
              <Button className="focus-visible:ring-slate-300" size="sm" variant="primary">
                Open Portfolio Intelligence
              </Button>
            </Link>
          </div>
        }
      />

      {kpisQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium text-red-700">Unable to load portfolio KPIs.</p>
            <Button
              className="focus-visible:ring-slate-300"
              onClick={() => {
                void kpisQuery.refetch();
              }}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {kpisQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={`kpi-skeleton-${index}`}>
              <CardContent className="space-y-3 py-5">
                <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
                <div className="h-7 w-36 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard title="Active Loans" value={formatNumber(kpis.activeLoansCount)} />
          <MetricCard title="Total Disbursed" value={formatMoney(kpis.totalDisbursed)} />
          <MetricCard title="Outstanding Principal" value={formatMoney(kpis.totalPrincipalOutstanding)} />
          <MetricCard
            title="PAR 30"
            value={formatPercent(kpis.par30Rate)}
            variant={kpis.par30Rate > 0.1 ? 'warning' : 'success'}
          />
          <MetricCard
            title="Default Rate"
            value={formatPercent(kpis.defaultRate)}
            variant={kpis.defaultRate > 0.08 ? 'danger' : 'success'}
          />
          <MetricCard
            title="Recovery Rate"
            value={formatPercent(kpis.recoveryRate)}
            variant={kpis.recoveryRate > 0.4 ? 'success' : 'warning'}
          />
        </div>
      ) : null}
    </div>
  );
}
