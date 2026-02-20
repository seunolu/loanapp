'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { PageHeader } from '@/src/components/layout/page-header';
import { getDisbursement, getLoanApplication, retryDisbursement, reverseDisbursement } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';

type DisbursementUiStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

function mapStatus(status: string): DisbursementUiStatus {
  if (status === 'REVERSED') return 'CANCELLED';
  if (status === 'PENDING' || status === 'PROCESSING' || status === 'SUCCESS' || status === 'FAILED') return status;
  return 'CANCELLED';
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

function formatAmount(amount: string, currency: string): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return `${amount} ${currency}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(parsed);
}

export default function AdminDisbursementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { token, role } = useAuth();
  const { tenantId } = useTenant();
  const [actionError, setActionError] = useState<string | null>(null);

  const disbursementQuery = useQuery({
    queryKey: ['admin', 'disbursement', id],
    queryFn: () => getDisbursement(id),
    enabled: Boolean(token && tenantId && id)
  });

  const loanQuery = useQuery({
    queryKey: ['admin', 'loan', disbursementQuery.data?.loanApplicationId],
    queryFn: () => getLoanApplication(disbursementQuery.data!.loanApplicationId),
    enabled: Boolean(disbursementQuery.data?.loanApplicationId && token && tenantId)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'disbursements'] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'disbursement', id] });
  };

  const retryMutation = useMutation({
    mutationFn: async () => retryDisbursement(id),
    onSuccess: async () => {
      setActionError(null);
      await refresh();
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : 'Retry failed.');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async () =>
      reverseDisbursement(id, {
        reason: 'Cancelled from admin disbursement workbench'
      }),
    onSuccess: async () => {
      setActionError(null);
      await refresh();
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : 'Cancel failed.');
    }
  });

  const canOperate = role === 'OPS' || role === 'SUPER_ADMIN' || role === 'PLATFORM_SUPER_ADMIN';

  if (disbursementQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader subtitle="Loading disbursement details." title="Disbursement Detail" />
        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-3 py-5">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (disbursementQuery.isError || !disbursementQuery.data) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader subtitle="Unable to load requested disbursement." title="Disbursement Detail" />
        <Card className="rounded-xl border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="py-4 text-sm text-red-700">
            {disbursementQuery.error instanceof Error ? disbursementQuery.error.message : 'Failed to load disbursement.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const disbursement = disbursementQuery.data;
  const uiStatus = mapStatus(disbursement.status);
  const badge = statusBadge(uiStatus);
  const providerResponse = JSON.stringify(disbursement, null, 2);
  const borrowerName =
    ((disbursement as Record<string, unknown>).borrowerName as string | undefined) ??
    ((loanQuery.data as Record<string, unknown> | undefined)?.fullName as string | undefined) ??
    'Not available';

  const showRetry = canOperate && uiStatus === 'FAILED';
  const showCancel = canOperate && uiStatus === 'PENDING';
  const actionsDisabled = uiStatus === 'PROCESSING';

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        subtitle="Inspect disbursement execution details and provider responses."
        title="Disbursement Detail"
      />

      {actionError ? (
        <Card className="rounded-xl border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="py-3 text-sm text-red-700">{actionError}</CardContent>
        </Card>
      ) : null}

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="py-5">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Summary</h2>
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <span className="font-medium">Loan ID:</span> {disbursement.loanApplicationId}
            </div>
            <div>
              <span className="font-medium">Borrower:</span> {borrowerName}
            </div>
            <div>
              <span className="font-medium">Amount:</span> {formatAmount(disbursement.amount, disbursement.currency)}
            </div>
            <div>
              <span className="font-medium">Provider:</span> {disbursement.provider ?? 'Provider'}
            </div>
            <div>
              <span className="font-medium">Reference:</span> {disbursement.providerReference ?? 'Not available'}
            </div>
            <div>
              <span className="font-medium">Status:</span> <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="py-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-slate-900">Provider Response</h2>
            <Button
              className="focus:ring-2 focus:ring-slate-300"
              onClick={async () => {
                await navigator.clipboard.writeText(providerResponse);
              }}
              size="sm"
              variant="secondary"
            >
              Copy
            </Button>
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {providerResponse}
          </pre>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="py-5">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Actions</h2>
          {actionsDisabled ? (
            <p className="text-sm text-slate-600">Disbursement is currently processing. Actions are disabled.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {showRetry ? (
              <Button
                className="focus:ring-2 focus:ring-slate-300"
                disabled={actionsDisabled || retryMutation.isPending || cancelMutation.isPending}
                onClick={() => retryMutation.mutate()}
              >
                {retryMutation.isPending ? 'Retrying...' : 'Retry'}
              </Button>
            ) : null}
            {showCancel ? (
              <Button
                className="focus:ring-2 focus:ring-slate-300"
                disabled={actionsDisabled || retryMutation.isPending || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                variant="danger"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
              </Button>
            ) : null}
            {!showRetry && !showCancel && !actionsDisabled ? (
              <p className="text-sm text-slate-600">No actions available for the current status.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
