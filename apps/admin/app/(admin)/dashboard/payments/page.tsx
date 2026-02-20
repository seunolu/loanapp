'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { LoadingSkeletonRows } from '@/src/components/ui/loading-skeleton';
import {
  listAdminPayments,
  type PaymentDirection,
  type PaymentIntentStatus,
  verifyAdminPayment
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Select } from '@/src/ui/Select';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function statusVariant(status: PaymentIntentStatus): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'PENDING' || status === 'CREATED') return 'warning';
  return 'neutral';
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [direction, setDirection] = useState<PaymentDirection | 'ALL'>('ALL');
  const [status, setStatus] = useState<PaymentIntentStatus | 'ALL'>('ALL');

  const paymentsQuery = useQuery({
    queryKey: ['admin', 'payments', tenantId, direction, status],
    queryFn: () =>
      listAdminPayments({
        direction: direction === 'ALL' ? undefined : direction,
        status: status === 'ALL' ? undefined : status
      }),
    enabled: Boolean(token && tenantId)
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifyAdminPayment(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'payments', tenantId] });
    }
  });

  const rows = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Repayments Monitoring"
        subtitle="Track inbound and outbound provider intents, verification status, and references."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <Select
                aria-label="Direction filter"
                value={direction}
                onChange={(event) => setDirection(event.target.value as PaymentDirection | 'ALL')}
                className="focus:ring-2 focus:ring-slate-300"
              >
                <option value="ALL">All directions</option>
                <option value="INBOUND">INBOUND</option>
                <option value="OUTBOUND">OUTBOUND</option>
              </Select>
            </div>
            <div className="w-40">
              <Select
                aria-label="Status filter"
                value={status}
                onChange={(event) => setStatus(event.target.value as PaymentIntentStatus | 'ALL')}
                className="focus:ring-2 focus:ring-slate-300"
              >
                <option value="ALL">All statuses</option>
                <option value="CREATED">CREATED</option>
                <option value="PENDING">PENDING</option>
                <option value="SUCCEEDED">SUCCEEDED</option>
                <option value="FAILED">FAILED</option>
                <option value="CANCELED">CANCELED</option>
              </Select>
            </div>
          </div>
        }
      />

      <DataTable
        columns={[
          { header: 'Intent ID', className: 'w-[19%]' },
          { header: 'Direction', className: 'w-[11%]' },
          { header: 'Status', className: 'w-[12%]' },
          { header: 'Amount', className: 'w-[12%] text-right' },
          { header: 'Provider Ref', className: 'w-[18%]' },
          { header: 'Loan/Disbursement', className: 'w-[14%]' },
          { header: 'Created', className: 'w-[9%]' },
          { header: 'Actions', className: 'w-[5%] text-right' }
        ]}
      >
        {paymentsQuery.isLoading ? <LoadingSkeletonRows rows={7} /> : null}
        {paymentsQuery.isError ? (
          <tr>
            <td className="px-4 py-6" colSpan={8}>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {paymentsQuery.error instanceof Error ? paymentsQuery.error.message : 'Failed to load payment intents.'}
              </div>
            </td>
          </tr>
        ) : null}
        {!paymentsQuery.isLoading && !paymentsQuery.isError && rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6" colSpan={8}>
              <EmptyState
                title="No payment intents yet"
                description="Payment intents will appear here once repayment or payout flows start."
              />
            </td>
          </tr>
        ) : null}
        {!paymentsQuery.isLoading && !paymentsQuery.isError
          ? rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-900">
                  <Link href={`/dashboard/payments/${row.id}`} className="underline underline-offset-2">
                    {row.id}
                  </Link>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{row.direction}</td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right font-mono text-slate-700">
                  {(row.amountMinor / 100).toLocaleString()} {row.currency}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">
                  {row.providerReference ?? '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">
                  {row.loanId ?? row.disbursementId ?? '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {DATE_TIME_FORMATTER.format(new Date(row.createdAt))}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={verifyMutation.isPending || row.status === 'SUCCEEDED'}
                    onClick={() => verifyMutation.mutate(row.id)}
                    className="focus:ring-2 focus:ring-slate-300"
                  >
                    Verify
                  </Button>
                </td>
              </tr>
            ))
          : null}
      </DataTable>
    </div>
  );
}

