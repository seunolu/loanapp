'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getDisbursement, retryDisbursement, reverseDisbursement } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function DisbursementDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { token, role } = useAuth();
  const { tenantId } = useTenant();
  const id = params.id;

  const disbursementQuery = useQuery({
    queryKey: ['admin', 'disbursement', id],
    queryFn: () => getDisbursement(id),
    enabled: Boolean(token && tenantId && id)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'disbursement', id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'disbursements', tenantId] });
  };

  const retryMutation = useMutation({
    mutationFn: async () => retryDisbursement(id),
    onSuccess: async () => {
      toast.success('Disbursement retried');
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Retry failed')
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      const reason = window.prompt('Reason for reversal');
      if (!reason || !reason.trim()) {
        throw new Error('Reason is required');
      }
      return reverseDisbursement(id, { reason: reason.trim() });
    },
    onSuccess: async () => {
      toast.success('Disbursement reversed');
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Reverse failed')
  });

  const canOperate = role === 'OPS' || role === 'SUPER_ADMIN';

  if (disbursementQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading disbursement...</p>;
  }
  if (disbursementQuery.isError || !disbursementQuery.data) {
    return <p className="text-sm text-destructive">Failed to load disbursement.</p>;
  }

  const row = disbursementQuery.data;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Disbursement</h1>
        <Link className="text-sm underline" href="/dashboard/disbursements">
          Back
        </Link>
      </div>

      <div className="rounded-md border p-4 text-sm">
        <p>ID: {row.id}</p>
        <p>Loan: {row.loanApplicationId}</p>
        <p>Status: {row.status}</p>
        <p>
          Amount: {row.amount} {row.currency}
        </p>
        <p>Provider Ref: {row.providerReference ?? '-'}</p>
        <p>Processed: {row.processedAt ? new Date(row.processedAt).toLocaleString() : '-'}</p>
        <p>Failure: {row.failureReason ?? '-'}</p>
      </div>

      {canOperate && row.status === 'FAILED' ? (
        <Button disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()} variant="outline">
          {retryMutation.isPending ? 'Retrying...' : 'Retry'}
        </Button>
      ) : null}
      {canOperate && row.status === 'SUCCESS' ? (
        <Button disabled={reverseMutation.isPending} onClick={() => reverseMutation.mutate()} variant="destructive">
          {reverseMutation.isPending ? 'Reversing...' : 'Reverse'}
        </Button>
      ) : null}

      <div className="rounded-md border p-4">
        <p className="mb-2 text-sm font-medium">Status History</p>
        <div className="space-y-2 text-sm">
          {row.history.map((item) => (
            <div className="rounded border p-2" key={item.id}>
              <p>
                {item.fromStatus ?? 'INITIAL'} {'->'} {item.toStatus}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              {item.note ? <p className="text-xs">{item.note}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
