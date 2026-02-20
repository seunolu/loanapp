'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getPortfolioSummaryReport, getReconcileReport, getRevenueReport } from '@/src/lib/api';
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

export default function PortfolioReportPage() {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const portfolioQuery = useQuery({
    queryKey: ['admin', 'reports', 'portfolio', tenantId],
    queryFn: () => getPortfolioSummaryReport(),
    enabled: Boolean(token && tenantId)
  });

  const revenueQuery = useQuery({
    queryKey: ['admin', 'reports', 'revenue', tenantId],
    queryFn: () => getRevenueReport(),
    enabled: Boolean(token && tenantId)
  });

  const reconcileQuery = useQuery({
    queryKey: ['admin', 'reports', 'reconcile', tenantId],
    queryFn: () => getReconcileReport(),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio Report</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href="/dashboard/reports/aging">
            Aging
          </Link>
          <Link className="underline" href="/dashboard/ledger">
            Ledger
          </Link>
        </div>
      </div>

      {portfolioQuery.isLoading && <p className="text-sm text-muted-foreground">Loading summary...</p>}
      {portfolioQuery.isError && (
        <p className="text-sm text-destructive">
          {portfolioQuery.error instanceof Error ? portfolioQuery.error.message : 'Failed to load report'}
        </p>
      )}
      {portfolioQuery.data ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border p-3 text-sm">
            <p className="text-muted-foreground">Total Loans</p>
            <p className="text-xl font-semibold">{portfolioQuery.data.totalLoans}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p className="text-muted-foreground">Active Loans</p>
            <p className="text-xl font-semibold">{portfolioQuery.data.activeLoans}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p className="text-muted-foreground">Delinquent Loans</p>
            <p className="text-xl font-semibold">{portfolioQuery.data.delinquentLoans}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p className="text-muted-foreground">Outstanding Principal</p>
            <p className="text-lg font-semibold">{formatMinor(portfolioQuery.data.totalOutstandingPrincipalMinor)}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p className="text-muted-foreground">Outstanding Interest</p>
            <p className="text-lg font-semibold">{formatMinor(portfolioQuery.data.totalOutstandingInterestMinor)}</p>
          </div>
          <div className="rounded border p-3 text-sm">
            <p className="text-muted-foreground">Outstanding Fees</p>
            <p className="text-lg font-semibold">{formatMinor(portfolioQuery.data.totalOutstandingFeesMinor)}</p>
          </div>
        </div>
      ) : null}

      {revenueQuery.data ? (
        <div className="rounded border p-4">
          <h2 className="mb-2 text-base font-medium">Revenue Components</h2>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div>Interest Income: {formatMinor(revenueQuery.data.interestIncomeMinor)}</div>
            <div>Fee Income: {formatMinor(revenueQuery.data.feeIncomeMinor)}</div>
            <div>Penalty Income: {formatMinor(revenueQuery.data.penaltyIncomeMinor)}</div>
            <div>Waivers: {formatMinor(revenueQuery.data.waiversMinor)}</div>
            <div>Write-offs: {formatMinor(revenueQuery.data.writeOffsMinor)}</div>
          </div>
        </div>
      ) : null}

      {reconcileQuery.data ? (
        <div className="rounded border p-4">
          <h2 className="mb-2 text-base font-medium">Ledger Reconciliation</h2>
          <p className="text-sm">
            Scanned {reconcileQuery.data.scanned} loans, mismatches {reconcileQuery.data.mismatchesFound}
          </p>
          {reconcileQuery.data.mismatches.length > 0 ? (
            <div className="mt-2 overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-2 text-left">Loan</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Table Total</th>
                    <th className="px-2 py-2 text-left">Ledger Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reconcileQuery.data.mismatches.map((row) => (
                    <tr className="border-t" key={row.loanId}>
                      <td className="px-2 py-2">
                        <Link className="underline" href={`/dashboard/loans/${row.loanId}/ledger`}>
                          {row.loanId}
                        </Link>
                      </td>
                      <td className="px-2 py-2">{row.status}</td>
                      <td className="px-2 py-2">{row.table.total}</td>
                      <td className="px-2 py-2">{row.ledger.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

