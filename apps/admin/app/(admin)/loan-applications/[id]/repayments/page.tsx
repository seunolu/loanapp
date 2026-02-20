'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { LoadingSkeletonRows } from '@/src/components/ui/loading-skeleton';
import { getLoanApplication, getLoanLedgerReport, listLoanRepayments, listLoanSchedule } from '@/src/lib/api';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';

type PageProps = {
  params: { id: string };
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric'
});

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(value: unknown): string {
  const amount = parseNumber(value);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(amount);
}

function formatMonoNumber(value: unknown): string {
  return parseNumber(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function scheduleStatusBadge(status: string): { label: string; variant: 'warning' | 'success' | 'neutral' | 'info' } {
  switch (status) {
    case 'PAID':
      return { label: 'PAID', variant: 'success' };
    case 'PARTIAL':
      return { label: 'PARTIAL', variant: 'info' };
    case 'OVERDUE':
      return { label: 'OVERDUE', variant: 'warning' };
    default:
      return { label: 'PENDING', variant: 'neutral' };
  }
}

export default function RepaymentLedgerPage({ params }: PageProps) {
  const loanId = params.id;

  const detailQuery = useQuery({
    queryKey: ['admin', 'loan', loanId],
    queryFn: () => getLoanApplication(loanId)
  });

  const scheduleQuery = useQuery({
    queryKey: ['admin', 'repayment-schedule', loanId],
    queryFn: () => listLoanSchedule(loanId)
  });

  const repaymentsQuery = useQuery({
    queryKey: ['admin', 'repayments', loanId],
    queryFn: () => listLoanRepayments(loanId)
  });

  const ledgerQuery = useQuery({
    queryKey: ['admin', 'ledger', loanId],
    queryFn: () => getLoanLedgerReport(loanId)
  });

  const totalPaid = (repaymentsQuery.data ?? []).reduce((sum, item) => sum + parseNumber(item.amount), 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        right={
          <Link href={`/dashboard/loan-applications/${loanId}`}>
            <Button className="focus:ring-2 focus:ring-slate-300" size="sm" variant="secondary">
              Back to Loan
            </Button>
          </Link>
        }
        subtitle="Review repayment schedule performance and ledger movements."
        title="Repayment Ledger"
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-slate-900">Loan Summary</h2>
        {detailQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-12 animate-pulse rounded bg-slate-100" />
            <div className="h-12 animate-pulse rounded bg-slate-100" />
            <div className="h-12 animate-pulse rounded bg-slate-100" />
          </div>
        ) : detailQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load loan summary.'}
          </div>
        ) : detailQuery.data ? (
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Principal</p>
              <p className="font-semibold text-slate-900">{formatCurrency(detailQuery.data.disbursedAmount ?? detailQuery.data.requestedAmount)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding Balance</p>
              <p className="font-semibold text-slate-900">{formatCurrency(detailQuery.data.totalOutstanding)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Paid</p>
              <p className="font-semibold text-slate-900">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Accrued Interest</p>
              <p className="font-semibold text-slate-900">{formatCurrency(detailQuery.data.outstandingInterest)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Penalties</p>
              <p className="font-semibold text-slate-900">{formatCurrency((detailQuery.data as Record<string, unknown>).outstandingPenalty ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
              <Badge variant="info">{String(detailQuery.data.status)}</Badge>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">Repayment Schedule</h2>
        <DataTable
          columns={[
            { header: 'Installment #', className: 'w-[10%] text-right' },
            { header: 'Due Date', className: 'w-[12%]' },
            { header: 'Principal', className: 'w-[11%] text-right' },
            { header: 'Interest', className: 'w-[11%] text-right' },
            { header: 'Penalty', className: 'w-[11%] text-right' },
            { header: 'Total Due', className: 'w-[11%] text-right' },
            { header: 'Paid', className: 'w-[11%] text-right' },
            { header: 'Remaining', className: 'w-[11%] text-right' },
            { header: 'Status', className: 'w-[12%]' }
          ]}
        >
          {scheduleQuery.isLoading ? <LoadingSkeletonRows rows={6} /> : null}

          {scheduleQuery.isError ? (
            <tr>
              <td className="px-4 py-6" colSpan={9}>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {scheduleQuery.error instanceof Error ? scheduleQuery.error.message : 'Failed to load repayment schedule.'}
                </div>
              </td>
            </tr>
          ) : null}

          {!scheduleQuery.isLoading && !scheduleQuery.isError && (scheduleQuery.data ?? []).length === 0 ? (
            <tr>
              <td className="px-4 py-6" colSpan={9}>
                <EmptyState
                  description="Repayment schedule entries will appear here once generated."
                  title="No repayments available"
                />
              </td>
            </tr>
          ) : null}

          {!scheduleQuery.isLoading && !scheduleQuery.isError
            ? (scheduleQuery.data ?? []).map((row) => {
                const rowRecord = row as Record<string, unknown>;
                const principal = rowRecord.principalDue ?? rowRecord.principal ?? 0;
                const interest = rowRecord.interestDue ?? rowRecord.interest ?? 0;
                const penalty = rowRecord.penaltyDue ?? rowRecord.penalty ?? 0;
                const totalDue = rowRecord.totalDue ?? 0;
                const paid = rowRecord.totalPaid ?? rowRecord.paid ?? 0;
                const remaining = rowRecord.remainingAmountCents ?? rowRecord.remaining ?? 0;
                const badge = scheduleStatusBadge(String(row.status));

                return (
                  <tr className="transition-colors hover:bg-slate-50" key={row.id}>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">
                      {row.installmentNumber}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {DATE_FORMATTER.format(new Date(row.dueDate))}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">
                      {formatMonoNumber(principal)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">
                      {formatMonoNumber(interest)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">
                      {formatMonoNumber(penalty)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">
                      {formatMonoNumber(totalDue)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">
                      {formatMonoNumber(paid)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">
                      {formatMonoNumber(remaining)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </td>
                  </tr>
                );
              })
            : null}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-900">Ledger Entries</h2>
        <DataTable
          columns={[
            { header: 'Date', className: 'w-[16%]' },
            { header: 'Type', className: 'w-[14%]' },
            { header: 'Debit', className: 'w-[12%] text-right' },
            { header: 'Credit', className: 'w-[12%] text-right' },
            { header: 'Balance After', className: 'w-[16%] text-right' },
            { header: 'Reference', className: 'w-[30%]' }
          ]}
        >
          {ledgerQuery.isLoading ? <LoadingSkeletonRows rows={6} /> : null}

          {ledgerQuery.isError ? (
            <tr>
              <td className="px-4 py-6" colSpan={6}>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {ledgerQuery.error instanceof Error ? ledgerQuery.error.message : 'Failed to load ledger entries.'}
                </div>
              </td>
            </tr>
          ) : null}

          {!ledgerQuery.isLoading && !ledgerQuery.isError && (ledgerQuery.data?.items ?? []).length === 0 ? (
            <tr>
              <td className="px-4 py-6" colSpan={6}>
                <EmptyState
                  description="Ledger postings will appear once repayment and accrual events are posted."
                  title="No ledger entries"
                />
              </td>
            </tr>
          ) : null}

          {!ledgerQuery.isLoading && !ledgerQuery.isError
            ? (ledgerQuery.data?.items ?? []).map((entry) => {
                const debit = entry.lines
                  .filter((line) => line.direction === 'DEBIT')
                  .reduce((sum, line) => sum + parseNumber(line.amountMinor), 0);
                const credit = entry.lines
                  .filter((line) => line.direction === 'CREDIT')
                  .reduce((sum, line) => sum + parseNumber(line.amountMinor), 0);
                const running = entry.runningBalances;
                const balanceAfter = running ? parseNumber(running.cashMinor) : 0;
                const reference = entry.referenceId || entry.id;

                return (
                  <tr className="transition-colors hover:bg-slate-50" key={entry.id}>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {DATE_TIME_FORMATTER.format(new Date(entry.occurredAt))}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{entry.type}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">{formatMonoNumber(debit)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">{formatMonoNumber(credit)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-right font-mono">{formatMonoNumber(balanceAfter)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-600">{reference}</td>
                  </tr>
                );
              })
            : null}
        </DataTable>
      </section>
    </div>
  );
}
