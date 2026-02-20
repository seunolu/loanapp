'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { PageHeader } from '@/src/components/layout/page-header';
import { getAdminPayment, verifyAdminPayment } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function statusVariant(status: string): 'neutral' | 'warning' | 'success' | 'danger' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'PENDING' || status === 'CREATED') return 'warning';
  return 'neutral';
}

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const paymentQuery = useQuery({
    queryKey: ['admin', 'payment', id],
    queryFn: () => getAdminPayment(id),
    enabled: Boolean(token && tenantId && id)
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyAdminPayment(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'payment', id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'payments', tenantId] });
    }
  });

  if (paymentQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Payment Intent" subtitle="Loading payment details." />
      </div>
    );
  }

  if (paymentQuery.isError || !paymentQuery.data) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Payment Intent" subtitle="Unable to load payment details." />
        <Card className="rounded-xl border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="py-4 text-sm text-red-700">
            {paymentQuery.error instanceof Error ? paymentQuery.error.message : 'Failed to load payment.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const payment = paymentQuery.data;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payment Intent"
        subtitle={`Reference ${payment.providerReference ?? payment.id}`}
        right={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/payments">
              <Button variant="secondary" size="sm" className="focus:ring-2 focus:ring-slate-300">
                Back
              </Button>
            </Link>
            <Button
              size="sm"
              disabled={verifyMutation.isPending || payment.status === 'SUCCEEDED'}
              onClick={() => verifyMutation.mutate()}
              className="focus:ring-2 focus:ring-slate-300"
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        }
      />

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="py-5">
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <span className="font-medium">Intent ID:</span>{' '}
              <span className="font-mono text-xs">{payment.id}</span>
            </div>
            <div>
              <span className="font-medium">Status:</span> <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
            </div>
            <div>
              <span className="font-medium">Direction:</span> {payment.direction}
            </div>
            <div>
              <span className="font-medium">Amount:</span> {(payment.amountMinor / 100).toLocaleString()} {payment.currency}
            </div>
            <div>
              <span className="font-medium">Loan:</span> <span className="font-mono text-xs">{payment.loanId ?? '-'}</span>
            </div>
            <div>
              <span className="font-medium">Disbursement:</span>{' '}
              <span className="font-mono text-xs">{payment.disbursementId ?? '-'}</span>
            </div>
            <div>
              <span className="font-medium">Provider Ref:</span>{' '}
              <span className="font-mono text-xs">{payment.providerReference ?? '-'}</span>
            </div>
            <div>
              <span className="font-medium">Created:</span> {DATE_TIME_FORMATTER.format(new Date(payment.createdAt))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-3 py-5">
          <h2 className="text-lg font-medium text-slate-900">Status History</h2>
          {payment.histories.length === 0 ? (
            <p className="text-sm text-slate-600">No history entries.</p>
          ) : (
            payment.histories.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <div className="font-medium">
                  {entry.fromStatus ?? 'INITIAL'} {'->'} {entry.toStatus}
                </div>
                <div className="text-xs text-slate-500">
                  {DATE_TIME_FORMATTER.format(new Date(entry.createdAt))} | {entry.actorType ?? 'SYSTEM'}
                </div>
                {entry.reason ? <div className="mt-1 text-xs text-slate-600">{entry.reason}</div> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-3 py-5">
          <h2 className="text-lg font-medium text-slate-900">Webhook / Verify Events</h2>
          {payment.events.length === 0 ? (
            <p className="text-sm text-slate-600">No provider events recorded yet.</p>
          ) : (
            payment.events.map((event) => (
              <details key={event.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                <summary className="cursor-pointer">
                  {event.type} | {event.providerEventId ?? '-'} | {DATE_TIME_FORMATTER.format(new Date(event.receivedAt))}
                </summary>
                <pre className="mt-3 max-h-72 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(event.raw, null, 2)}
                </pre>
              </details>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

