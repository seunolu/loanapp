'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { LoadingSkeletonRows } from '@/src/components/ui/loading-skeleton';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card } from '@/src/ui/Card';
import { EmptyState } from '@/src/components/ui/empty-state';
import {
  cancelAdminMandate,
  getAdminMandate,
  pauseAdminMandate,
  resumeAdminMandate
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

function statusVariant(status: string): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'ACTIVE' || status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'EXPIRED') return 'danger';
  if (status === 'PENDING' || status === 'PAUSED') return 'warning';
  return 'neutral';
}

export default function MandateDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { role } = useAuth();
  const canMutate = role === 'SUPER_ADMIN' || role === 'OPS';

  const query = useQuery({
    queryKey: ['admin', 'mandates', tenantId, params.id],
    queryFn: () => getAdminMandate(params.id),
    enabled: Boolean(tenantId && params.id)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'mandates', tenantId] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'mandates', tenantId, params.id] });
  };

  const pauseMutation = useMutation({
    mutationFn: () => pauseAdminMandate(params.id, 'Paused from mandate detail'),
    onSuccess: refresh
  });
  const resumeMutation = useMutation({
    mutationFn: () => resumeAdminMandate(params.id, 'Resumed from mandate detail'),
    onSuccess: refresh
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelAdminMandate(params.id, 'Cancelled from mandate detail'),
    onSuccess: refresh
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Mandate Detail"
        subtitle="Review mandate state and recent debit attempts."
        right={
          <Link href="/dashboard/mandates">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />

      {query.isLoading ? <LoadingSkeletonRows rows={4} /> : null}
      {query.isError ? (
        <Card>
          <p className="text-sm text-red-700">{query.error instanceof Error ? query.error.message : 'Failed to load mandate.'}</p>
        </Card>
      ) : null}
      {query.data ? (
        <>
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs text-slate-700">{query.data.id}</p>
              <Badge variant={statusVariant(query.data.status)}>{query.data.status}</Badge>
            </div>
            <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              <p>Borrower: <span className="font-mono">{query.data.borrowerId}</span></p>
              <p>Loan: <span className="font-mono">{query.data.loanId ?? '-'}</span></p>
              <p>Max Amount: {query.data.maxAmount ? `NGN ${Number(query.data.maxAmount).toLocaleString()}` : '-'}</p>
              <p>Next Debit At: {query.data.nextDebitAt ? new Date(query.data.nextDebitAt).toLocaleString() : '-'}</p>
              <p>Frequency: {query.data.frequency ?? '-'}</p>
              <p>Auth linked: {query.data.authorizationCodePresent && query.data.customerCodePresent ? 'Yes' : 'No'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!canMutate || pauseMutation.isPending || query.data.status !== 'ACTIVE'}
                onClick={() => pauseMutation.mutate()}
              >
                Pause
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!canMutate || resumeMutation.isPending || query.data.status !== 'PAUSED'}
                onClick={() => resumeMutation.mutate()}
              >
                Resume
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!canMutate || cancelMutation.isPending || query.data.status === 'CANCELLED'}
                onClick={() => cancelMutation.mutate()}
              >
                Cancel
              </Button>
            </div>
          </Card>

          <DataTable
            columns={[
              { header: 'Debit ID', className: 'w-[20%]' },
              { header: 'Status', className: 'w-[10%]' },
              { header: 'Amount', className: 'w-[12%] text-right' },
              { header: 'Scheduled', className: 'w-[18%]' },
              { header: 'Attempted', className: 'w-[18%]' },
              { header: 'Attempts', className: 'w-[8%] text-right' },
              { header: 'Failure', className: 'w-[14%]' }
            ]}
          >
            {query.data.debits.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <EmptyState title="No debit attempts yet" description="Debit attempts will appear after mandate scheduler runs." />
                </td>
              </tr>
            ) : (
              query.data.debits.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-900">{row.id}</td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right font-mono text-slate-700">{row.amount}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{new Date(row.scheduledAt).toLocaleString()}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                    {row.attemptedAt ? new Date(row.attemptedAt).toLocaleString() : '-'}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right text-slate-700">{row.attemptCount}/{row.maxAttempts}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-xs text-slate-600">{row.failureReason ?? '-'}</td>
                </tr>
              ))
            )}
          </DataTable>
        </>
      ) : null}
    </div>
  );
}
