'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { getOpsJob, listOpsJobs, retryOpsJob, type OpsJobItem, type OpsJobStatus } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { Select } from '@/src/ui/Select';

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const STATUS_TABS: Array<{ label: string; value: OpsJobStatus }> = [
  { label: 'Failed (DLQ)', value: 'failed' },
  { label: 'Waiting', value: 'waiting' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
];

function statusVariant(status: OpsJobStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'waiting') return 'warning';
  if (status === 'active') return 'info';
  if (status === 'completed') return 'success';
  return 'danger';
}

function shortValue(value: string | null): string {
  if (!value) return '-';
  return value.length > 12 ? `${value.slice(0, 12)}...` : value;
}

function statusLabel(value: OpsJobStatus): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function canManage(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'SYSTEM';
}

export default function OperationsPage(): React.JSX.Element {
  const { token, role } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const enabled = Boolean(token && tenantId);
  const allowed = canManage(role);

  const [queue, setQueue] = useState('main');
  const [status, setStatus] = useState<OpsJobStatus>('failed');
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['admin', 'ops', 'jobs', queue, status, search],
    queryFn: () => listOpsJobs({ queue, status, search: search.trim() || undefined, limit: 50 }),
    enabled: enabled && allowed
  });

  const selectedId = useMemo(() => {
    if (!selectedJobId) return null;
    const found = jobsQuery.data?.items.find((item) => item.id === selectedJobId);
    return found?.id ?? selectedJobId;
  }, [jobsQuery.data?.items, selectedJobId]);

  const detailQuery = useQuery({
    queryKey: ['admin', 'ops', 'job', queue, selectedId],
    queryFn: () => getOpsJob({ queue, id: selectedId as string }),
    enabled: enabled && allowed && Boolean(selectedId)
  });

  const retryMutation = useMutation({
    mutationFn: (job: OpsJobItem) => retryOpsJob({ queue, id: job.id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ops', 'jobs', queue, status, search] });
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin', 'ops', 'job', queue, selectedId] });
      }
    }
  });

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Operations controls are restricted to SUPER_ADMIN or SYSTEM roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations"
        subtitle="Monitor queue health, inspect jobs, and trigger safe retries for failed jobs."
        right={
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
        }
      />

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                size="sm"
                variant={status === tab.value ? 'primary' : 'secondary'}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-48">
              <Select label="Queue" onChange={(event) => setQueue(event.target.value)} value={queue}>
                <option value="main">main</option>
              </Select>
            </div>
            <div className="w-72">
              <Input
                label="Search Job ID"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="cuid substring"
                value={search}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {jobsQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-red-700">Failed to load operations jobs.</p>
          </CardContent>
        </Card>
      ) : null}

      {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.items?.length ?? 0) === 0 ? (
        <EmptyState title="No jobs found for this filter" description="Try another status or queue." />
      ) : null}

      {jobsQuery.data?.items?.length ? (
        <DataTable
          columns={[
            { header: 'Job ID' },
            { header: 'Name' },
            { header: 'Tenant' },
            { header: 'RequestId' },
            { header: 'Attempts' },
            { header: 'Last Updated' },
            { header: 'Status' },
            { header: 'Actions', className: 'w-52' }
          ]}
        >
          {jobsQuery.data.items.map((item) => (
            <tr className="hover:bg-slate-50" key={item.id}>
              <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">{shortValue(item.id)}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{item.name}</td>
              <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">{shortValue(item.tenantId)}</td>
              <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">{shortValue(item.requestId)}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {item.attemptsMade}/{item.attemptsMax}
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {DATE_TIME.format(new Date(item.finishedOn ?? item.timestamp))}
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <div className="flex gap-2">
                  <Button onClick={() => setSelectedJobId(item.id)} size="sm" variant="secondary">
                    View
                  </Button>
                  <Button
                    disabled={item.status !== 'failed' || retryMutation.isPending}
                    onClick={() => {
                      const confirmed = window.confirm('Retry job once? This will re-queue the job.');
                      if (!confirmed) return;
                      void retryMutation.mutateAsync(item);
                    }}
                    size="sm"
                    variant="primary"
                  >
                    Retry
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}

      {selectedId ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Job Detail</h2>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            {detailQuery.isLoading ? <p className="text-sm text-slate-500">Loading job details...</p> : null}
            {detailQuery.data ? (
              <>
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Name:</span> {detailQuery.data.name}
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Status:</span> {detailQuery.data.status}
                </div>
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Failed Reason:</span>{' '}
                  {detailQuery.data.stacktrace[0] ?? '-'}
                </div>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(detailQuery.data.data, null, 2)}
                </pre>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

