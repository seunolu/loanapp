'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/src/components/ui/empty-state';
import { DataTable } from '@/src/components/ui/data-table';
import { PageHeader } from '@/src/components/layout/page-header';
import { listAdminJobs, type AdminJobStatus, type AdminJobType } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';
import { Select } from '@/src/ui/Select';

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const JOB_STATUS_OPTIONS: Array<{ label: string; value: '' | AdminJobStatus }> = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Succeeded', value: 'SUCCEEDED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Dead Letter', value: 'DEAD_LETTER' }
];

const JOB_TYPE_OPTIONS: Array<{ label: string; value: '' | AdminJobType }> = [
  { label: 'All Types', value: '' },
  { label: 'Accrue Interest', value: 'ACCRUE_INTEREST' },
  { label: 'Recalc Balances', value: 'RECALC_BALANCES' },
  { label: 'Send Notification', value: 'SEND_NOTIFICATION' },
  { label: 'Collections Escalation', value: 'COLLECTIONS_ESCALATION' },
  { label: 'Risk Reevaluation', value: 'RISK_REEVALUATION' },
  { label: 'Ledger Reconcile', value: 'LEDGER_RECONCILE' }
];

function statusVariant(status: AdminJobStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'PROCESSING':
      return 'info';
    case 'SUCCEEDED':
      return 'success';
    case 'FAILED':
    case 'DEAD_LETTER':
      return 'danger';
    default:
      return 'neutral';
  }
}

function shortId(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 12)}...`;
}

function statusLabel(value: AdminJobStatus): string {
  return value.replace(/_/g, ' ');
}

export default function AdminJobsPage(): React.JSX.Element {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const enabled = Boolean(token && tenantId);

  const [status, setStatus] = useState<'' | AdminJobStatus>('');
  const [type, setType] = useState<'' | AdminJobType>('');

  const jobsQuery = useQuery({
    queryKey: ['admin', 'jobs', status, type],
    queryFn: () => listAdminJobs({ status: status || undefined, type: type || undefined, take: 25 }),
    enabled
  });

  const items = jobsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        subtitle="Background worker queue with tenant-scoped processing."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="w-40"
              onChange={(event) => setStatus(event.target.value as '' | AdminJobStatus)}
              value={status}
            >
              {JOB_STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select className="w-52" onChange={(event) => setType(event.target.value as '' | AdminJobType)} value={type}>
              {JOB_TYPE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Button
              className="focus-visible:ring-slate-300"
              onClick={() => {
                void jobsQuery.refetch();
              }}
              size="sm"
              variant="secondary"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {jobsQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium text-red-700">Unable to load jobs.</p>
            <Button
              className="focus-visible:ring-slate-300"
              onClick={() => {
                void jobsQuery.refetch();
              }}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {jobsQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="h-5 animate-pulse rounded bg-slate-100" key={`job-skeleton-${index}`} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!jobsQuery.isLoading && !jobsQuery.isError && items.length === 0 ? (
        <EmptyState title="No jobs queued yet" description="Enqueued background jobs will appear here." />
      ) : null}

      {!jobsQuery.isLoading && !jobsQuery.isError && items.length > 0 ? (
        <DataTable
          columns={[
            { header: 'Job ID' },
            { header: 'Type' },
            { header: 'Status' },
            { header: 'Attempts' },
            { header: 'Run At' },
            { header: 'Action', className: 'w-24' }
          ]}
        >
          {items.map((item) => (
            <tr className="hover:bg-slate-50" key={item.id}>
              <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700" title={item.id}>
                {shortId(item.id)}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{item.type}</td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {item.attempts}/{item.maxAttempts}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {DATE_TIME.format(new Date(item.runAt))}
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Link
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  href={`/dashboard/jobs/${item.id}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </div>
  );
}

