'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { getFraudBorrower, holdFraudBorrower, releaseFraudBorrowerHold } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';

type PageProps = {
  params: {
    borrowerId: string;
  };
};

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function allow(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER';
}

function canManage(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER' || role === 'SYSTEM';
}

function fraudVariant(level: string): 'neutral' | 'warning' | 'danger' {
  if (level === 'SEVERE' || level === 'HIGH') return 'danger';
  if (level === 'MEDIUM' || level === 'LOW') return 'warning';
  return 'neutral';
}

export default function FraudBorrowerDetailPage({ params }: PageProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [reason, setReason] = useState('');
  const canView = allow(role);
  const canEdit = canManage(role);

  const borrowerId = useMemo(() => decodeURIComponent(params.borrowerId), [params.borrowerId]);

  const detailQuery = useQuery({
    queryKey: ['admin', 'fraud', 'borrower', borrowerId],
    queryFn: () => getFraudBorrower(borrowerId),
    enabled: canView
  });

  const holdMutation = useMutation({
    mutationFn: async () => holdFraudBorrower(borrowerId, { reason: reason.trim() || 'Manual risk hold' }),
    onSuccess: async () => {
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'fraud', 'borrower', borrowerId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'fraud', 'queue'] });
    }
  });

  const releaseMutation = useMutation({
    mutationFn: async () => releaseFraudBorrowerHold(borrowerId, { reason: reason.trim() || 'Risk hold released' }),
    onSuccess: async () => {
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'fraud', 'borrower', borrowerId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'fraud', 'queue'] });
    }
  });

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Fraud detail is restricted to RISK_MANAGER and SUPER_ADMIN roles.</p>
        </CardContent>
      </Card>
    );
  }

  const activeHold = detailQuery.data?.holds.find((hold) => hold.status === 'ACTIVE') ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={detailQuery.data?.borrower.fullName || 'Borrower Fraud Profile'}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{detailQuery.data?.borrower.phone ?? borrowerId}</span>
            <Badge variant={fraudVariant(detailQuery.data?.aggregate.fraudLevel ?? 'NONE')}>
              {detailQuery.data?.aggregate.fraudLevel ?? 'NONE'}
            </Badge>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
              Score {detailQuery.data?.aggregate.riskScore ?? 0}
            </span>
          </div>
        }
        right={
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            href="/dashboard/fraud"
          >
            Back to Queue
          </Link>
        }
      />

      {detailQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-red-700">Failed to load borrower fraud profile.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900">Flags</h2>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 py-4">
              {(detailQuery.data?.aggregate.flags.length ? detailQuery.data.aggregate.flags : ['No active flags']).map((flag) => (
                <Badge key={flag} variant={flag === 'No active flags' ? 'neutral' : 'warning'}>
                  {flag}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900">Recent Events</h2>
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              {detailQuery.data?.recentEvents.length ? (
                detailQuery.data.recentEvents.map((event) => (
                  <div className="relative border-l border-slate-200 pl-4" key={event.id}>
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={event.severity === 'CRITICAL' || event.severity === 'HIGH' ? 'danger' : 'warning'}>
                        {event.severity}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">{event.type}</span>
                      <span className="text-xs text-slate-500">{event.source}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">{DATE_TIME.format(new Date(event.createdAt))}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent events.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900">Hold Status</h2>
            </CardHeader>
            <CardContent className="space-y-3 py-4">
              {activeHold ? (
                <div className="space-y-1 rounded-lg border border-red-200 bg-red-50 p-3">
                  <Badge variant="danger">ACTIVE HOLD</Badge>
                  <p className="text-sm text-red-700">{activeHold.reason}</p>
                  <p className="text-xs text-red-600">{DATE_TIME.format(new Date(activeHold.createdAt))}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <Badge variant="success">No Active Hold</Badge>
                </div>
              )}
              <Input
                label="Reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Enter hold/release reason"
                value={reason}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!canEdit || holdMutation.isPending || Boolean(activeHold)}
                  onClick={() => {
                    void holdMutation.mutateAsync();
                  }}
                  size="sm"
                  variant="danger"
                >
                  Place Hold
                </Button>
                <Button
                  disabled={!canEdit || releaseMutation.isPending || !activeHold}
                  onClick={() => {
                    void releaseMutation.mutateAsync();
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Release Hold
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-slate-900">Velocity Counters</h2>
            </CardHeader>
            <CardContent className="space-y-2 py-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Failed Logins (1h)</span>
                <span className="font-mono">{detailQuery.data?.counters.failedLogins1h ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment Attempts (24h)</span>
                <span className="font-mono">{detailQuery.data?.counters.paymentAttempts24h ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bank Changes (7d)</span>
                <span className="font-mono">{detailQuery.data?.counters.bankChanges7d ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Device Changes (14d)</span>
                <span className="font-mono">{detailQuery.data?.counters.deviceChanges14d ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
