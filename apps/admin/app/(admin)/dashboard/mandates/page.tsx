'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { LoadingSkeletonRows } from '@/src/components/ui/loading-skeleton';
import {
  cancelAdminMandate,
  listAdminMandates,
  pauseAdminMandate,
  resumeAdminMandate,
  type AdminMandate,
  type MandateStatus
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Select } from '@/src/ui/Select';

function statusVariant(status: MandateStatus): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') return 'danger';
  if (status === 'PENDING' || status === 'PAUSED') return 'warning';
  return 'neutral';
}

export default function AdminMandatesPage() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { role } = useAuth();
  const [status, setStatus] = useState<MandateStatus | 'ALL'>('ALL');

  const query = useQuery({
    queryKey: ['admin', 'mandates', tenantId, status],
    queryFn: () => listAdminMandates({ status: status === 'ALL' ? undefined : status }),
    enabled: Boolean(tenantId)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'mandates', tenantId] });
  };

  const pauseMutation = useMutation({
    mutationFn: (id: string) => pauseAdminMandate(id, 'Paused from admin dashboard'),
    onSuccess: refresh
  });
  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeAdminMandate(id, 'Resumed from admin dashboard'),
    onSuccess: refresh
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelAdminMandate(id, 'Cancelled from admin dashboard'),
    onSuccess: refresh
  });

  const canMutate = role === 'SUPER_ADMIN' || role === 'OPS';

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Mandates"
        subtitle="Monitor and manage borrower auto-debit mandates."
        right={
          <div className="w-44">
            <Select
              aria-label="Mandate status filter"
              value={status}
              onChange={(event) => setStatus(event.target.value as MandateStatus | 'ALL')}
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="EXPIRED">EXPIRED</option>
            </Select>
          </div>
        }
      />

      <DataTable
        columns={[
          { header: 'Mandate ID', className: 'w-[17%]' },
          { header: 'Borrower', className: 'w-[12%]' },
          { header: 'Loan ID', className: 'w-[14%]' },
          { header: 'Status', className: 'w-[10%]' },
          { header: 'Max Amount', className: 'w-[11%] text-right' },
          { header: 'Next Debit', className: 'w-[13%]' },
          { header: 'Last Debit', className: 'w-[13%]' },
          { header: 'Actions', className: 'w-[10%] text-right' }
        ]}
      >
        {query.isLoading ? <LoadingSkeletonRows rows={6} /> : null}
        {query.isError ? (
          <tr>
            <td colSpan={8} className="px-4 py-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {query.error instanceof Error ? query.error.message : 'Failed to load mandates.'}
              </div>
            </td>
          </tr>
        ) : null}
        {!query.isLoading && !query.isError && (query.data ?? []).length === 0 ? (
          <tr>
            <td className="px-4 py-6" colSpan={8}>
              <EmptyState title="No mandates found" description="Mandates will appear after borrower setup completes." />
            </td>
          </tr>
        ) : null}
        {!query.isLoading && !query.isError
          ? (query.data ?? []).map((row: AdminMandate) => (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-900">
                  <Link href={`/dashboard/mandates/${row.id}`} className="underline underline-offset-2">
                    {row.id}
                  </Link>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">{row.borrowerId}</td>
                <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">{row.loanId ?? '-'}</td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right font-mono text-slate-700">
                  {row.maxAmount ? `NGN ${Number(row.maxAmount).toLocaleString()}` : '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                  {row.nextDebitAt ? new Date(row.nextDebitAt).toLocaleString() : '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                  {row.lastDebit ? `${row.lastDebit.status} (${row.lastDebit.amount})` : '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canMutate || pauseMutation.isPending || row.status !== 'ACTIVE'}
                      onClick={() => pauseMutation.mutate(row.id)}
                    >
                      Pause
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canMutate || resumeMutation.isPending || row.status !== 'PAUSED'}
                      onClick={() => resumeMutation.mutate(row.id)}
                    >
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!canMutate || cancelMutation.isPending || row.status === 'CANCELLED'}
                      onClick={() => cancelMutation.mutate(row.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          : null}
      </DataTable>
    </div>
  );
}
