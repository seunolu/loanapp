'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { getAdminJob, type AdminJobStatus } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';

type JobDetailPageProps = {
  params: {
    id: string;
  };
};

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

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

function statusLabel(value: AdminJobStatus): string {
  return value.replace(/_/g, ' ');
}

export default function JobDetailPage({ params }: JobDetailPageProps): React.JSX.Element {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const enabled = Boolean(token && tenantId && params.id);

  const jobQuery = useQuery({
    queryKey: ['admin', 'job', params.id],
    queryFn: () => getAdminJob(params.id),
    enabled
  });

  const job = jobQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Details"
        subtitle={params.id}
        right={
          <Link href="/dashboard/jobs">
            <Button className="focus-visible:ring-slate-300" size="sm" variant="secondary">
              Back to Jobs
            </Button>
          </Link>
        }
      />

      {jobQuery.isLoading ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="h-5 animate-pulse rounded bg-slate-100" key={`job-detail-skeleton-${index}`} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {jobQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium text-red-700">Unable to load this job.</p>
            <Button
              className="focus-visible:ring-slate-300"
              onClick={() => {
                void jobQuery.refetch();
              }}
              size="sm"
              variant="secondary"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {job ? (
        <>
          {(job.status === 'FAILED' || job.status === 'DEAD_LETTER') && job.lastError ? (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="border-red-200 py-3">
                <p className="text-sm font-semibold text-red-700">Last Error</p>
              </CardHeader>
              <CardContent className="py-4">
                <p className="whitespace-pre-wrap break-words font-mono text-xs text-red-800">{job.lastError}</p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="py-3">
              <p className="text-sm font-semibold text-slate-900">Summary</p>
            </CardHeader>
            <CardContent className="grid gap-4 py-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Type</p>
                <p className="mt-1 text-sm text-slate-900">{job.type}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <div className="mt-1">
                  <Badge variant={statusVariant(job.status)}>{statusLabel(job.status)}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Run At</p>
                <p className="mt-1 text-sm text-slate-900">{DATE_TIME.format(new Date(job.runAt))}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Attempts</p>
                <p className="mt-1 text-sm text-slate-900">
                  {job.attempts}/{job.maxAttempts}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Dedupe Key</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-900">{job.dedupeKey ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Locked By</p>
                <p className="mt-1 text-sm text-slate-900">{job.lockedBy ?? '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <p className="text-sm font-semibold text-slate-900">Payload</p>
            </CardHeader>
            <CardContent className="py-4">
              <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

