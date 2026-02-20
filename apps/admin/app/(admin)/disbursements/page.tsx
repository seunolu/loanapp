'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { LoadingSkeletonRows } from '@/src/components/ui/loading-skeleton';
import { type DisbursementListRow, listDisbursements } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Select } from '@/src/ui/Select';

type DisbursementUiStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
type FilterStatus = 'ALL' | DisbursementUiStatus;

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function formatAmount(amount: string, currency: string): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return `${amount} ${currency}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(parsed);
}

function mapStatus(status: DisbursementListRow['status']): DisbursementUiStatus {
  if (status === 'REVERSED') return 'CANCELLED';
  return status;
}

function statusBadge(status: DisbursementUiStatus): { variant: 'warning' | 'info' | 'success' | 'danger' | 'neutral'; label: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'PENDING', variant: 'warning' };
    case 'PROCESSING':
      return { label: 'PROCESSING', variant: 'info' };
    case 'SUCCESS':
      return { label: 'SUCCESS', variant: 'success' };
    case 'FAILED':
      return { label: 'FAILED', variant: 'danger' };
    default:
      return { label: 'CANCELLED', variant: 'neutral' };
  }
}

export default function AdminDisbursementsPage() {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  const disbursementsQuery = useQuery({
    queryKey: ['admin', 'disbursements'],
    queryFn: () => listDisbursements(),
    enabled: Boolean(token && tenantId)
  });

  const filteredRows = useMemo(() => {
    const rows = disbursementsQuery.data ?? [];
    if (statusFilter === 'ALL') return rows;
    return rows.filter((row) => mapStatus(row.status) === statusFilter);
  }, [disbursementsQuery.data, statusFilter]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        right={
          <div className="w-52">
            <Select
              aria-label="Disbursement status filter"
              className="focus:ring-2 focus:ring-slate-300"
              onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
              value={statusFilter}
            >
              <option value="ALL">ALL</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
            </Select>
          </div>
        }
        subtitle="Manage outbound loan funding operations"
        title="Disbursements"
      />

      <DataTable
        columns={[
          { header: 'Disbursement ID', className: 'w-[18%]' },
          { header: 'Loan ID', className: 'w-[14%]' },
          { header: 'Borrower', className: 'w-[14%]' },
          { header: 'Amount', className: 'w-[12%] text-right' },
          { header: 'Provider', className: 'w-[10%]' },
          { header: 'Status', className: 'w-[11%]' },
          { header: 'Created At', className: 'w-[13%]' },
          { header: 'Action', className: 'w-[8%] text-right' }
        ]}
      >
        {disbursementsQuery.isLoading ? <LoadingSkeletonRows rows={6} /> : null}

        {disbursementsQuery.isError ? (
          <tr>
            <td className="px-4 py-6" colSpan={8}>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {disbursementsQuery.error instanceof Error
                    ? disbursementsQuery.error.message
                    : 'Failed to load disbursements.'}
                </p>
                <div className="mt-3">
                  <Button
                    className="focus:ring-2 focus:ring-slate-300"
                    onClick={() => disbursementsQuery.refetch()}
                    size="sm"
                    variant="secondary"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </td>
          </tr>
        ) : null}

        {!disbursementsQuery.isLoading && !disbursementsQuery.isError && filteredRows.length === 0 ? (
          <tr>
            <td className="px-4 py-6" colSpan={8}>
              <EmptyState
                description="Disbursement records will appear once loan funding is initiated."
                title="No disbursements yet."
              />
            </td>
          </tr>
        ) : null}

        {!disbursementsQuery.isLoading && !disbursementsQuery.isError
          ? filteredRows.map((row) => {
              const uiStatus = mapStatus(row.status);
              const badge = statusBadge(uiStatus);
              const borrower = (row as Record<string, unknown>).borrowerName;

              return (
                <tr className="transition-colors hover:bg-slate-50" key={row.id}>
                  <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-900">{row.id}</td>
                  <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">
                    {row.loanApplicationId}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                    {typeof borrower === 'string' && borrower.trim() ? borrower : 'Not available'}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right font-mono text-slate-700">
                    {formatAmount(row.amount, row.currency)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                    {row.provider ?? 'Provider'}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                    {DATE_TIME_FORMATTER.format(new Date(row.createdAt))}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right">
                    <Link href={`/disbursements/${row.id}`}>
                      <Button className="focus:ring-2 focus:ring-slate-300" size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })
          : null}
      </DataTable>
    </div>
  );
}
