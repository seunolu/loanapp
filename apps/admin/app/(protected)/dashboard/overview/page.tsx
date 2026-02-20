'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminMetrics, getAdminSystemStatus } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

function ratio(numerator: number, denominator: number): string {
  if (denominator <= 0) return '0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function money(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return `NGN ${num.toLocaleString()}`;
}

export default function DashboardOverviewPage() {
  const { tenantId } = useTenant();
  const { role } = useAuth();

  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
        Overview is available to SUPER_ADMIN only.
      </div>
    );
  }

  const metricsQuery = useQuery({
    queryKey: ['admin', 'metrics', tenantId],
    queryFn: () => getAdminMetrics(),
    enabled: Boolean(tenantId)
  });

  const systemStatusQuery = useQuery({
    queryKey: ['admin', 'system-status', tenantId],
    queryFn: () => getAdminSystemStatus(),
    enabled: Boolean(tenantId)
  });

  if (metricsQuery.isLoading || systemStatusQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading overview...</div>;
  }

  if (metricsQuery.isError || systemStatusQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
        {(metricsQuery.error as Error | undefined)?.message ||
          (systemStatusQuery.error as Error | undefined)?.message ||
          'Failed to load overview.'}
      </div>
    );
  }

  const metrics = metricsQuery.data!;
  const status = systemStatusQuery.data!;
  const submitted = metrics.counters.loan_application_submitted_total.total;
  const approved = metrics.counters.loan_application_approved_total.total;
  const disbursed = status.totalDisbursedAmount;
  const repayments = status.totalRepaymentsAmount;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Card label="Total Applications" value={String(submitted)} />
        <Card label="Approval Rate" value={ratio(approved, submitted)} />
        <Card label="Total Disbursed" value={money(disbursed)} />
        <Card label="Total Repayments" value={money(repayments)} />
        <Card label="Overdue Count" value={String(status.overdueAccounts)} />
        <Card label="Active Loans" value={String(status.activeLoanAccounts)} />
        <Card label="System Health" value={status.status.toUpperCase()} />
      </div>
      <div className="rounded-md border border-border p-3 text-sm">
        <div>DB: {status.health.database}</div>
        <div>Pending Disbursements: {status.health.pendingDisbursements}</div>
        <div>Stuck Transitions: {status.health.stuckTransitions}</div>
        <div>Paused Interest: {status.health.pausedInterest}</div>
        <div>Ledger Imbalances: {status.health.ledgerImbalanceCount}</div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
