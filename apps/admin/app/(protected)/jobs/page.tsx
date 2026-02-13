'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RequirePermission } from '@/components/auth/require-permission';
import { useAuth } from '@/components/auth/auth-context';
import { Button } from '@/components/ui/button';
import { JobsTable } from '@/src/components/jobs/jobs-table';
import { useJobs } from '@/src/features/jobs/hooks/use-jobs';
import type { JobStatus } from '@/src/features/jobs/api';
import { hasPermission } from '@/lib/auth/permissions';

export default function JobsPage() {
  const { auth } = useAuth();
  const canRetry = hasPermission(auth.permissions, 'JOBS_RETRY');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [type, setType] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const { jobsQuery, retryMutation } = useJobs({
    limit: 20,
    cursor,
    status: status || undefined,
    type: type || undefined
  });

  const failedCount = jobsQuery.data?.items.filter((job) => job.status === 'FAILED').length ?? 0;

  const onNext = () => {
    const nextCursor = jobsQuery.data?.nextCursor;
    if (!nextCursor) {
      return;
    }
    setCursorHistory((prev) => (cursor ? [...prev, cursor] : prev));
    setCursor(nextCursor);
  };

  const onPrev = () => {
    if (cursorHistory.length === 0) {
      setCursor(undefined);
      return;
    }
    const nextHistory = [...cursorHistory];
    const previousCursor = nextHistory.pop();
    setCursorHistory(nextHistory);
    setCursor(previousCursor);
  };

  const retry = async (jobId: string) => {
    try {
      await retryMutation.mutateAsync(jobId);
      toast.success('Job queued for retry.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to retry job.');
    }
  };

  return (
    <RequirePermission permission="JOBS_VIEW">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Jobs</h1>
            <p className="text-sm text-muted-foreground">Monitor background jobs and retry failures.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => {
                setType(event.target.value);
                setCursor(undefined);
                setCursorHistory([]);
              }}
              placeholder="Type"
              value={type}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => {
                setStatus(event.target.value as JobStatus | '');
                setCursor(undefined);
                setCursorHistory([]);
              }}
              value={status}
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="RUNNING">RUNNING</option>
              <option value="FAILED">FAILED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DEAD">DEAD</option>
            </select>
          </div>
        </div>

        {failedCount > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {failedCount} failed job(s) in current result set.
          </div>
        )}

        {jobsQuery.isLoading && <div className="text-sm text-muted-foreground">Loading jobs...</div>}
        {jobsQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load jobs.
          </div>
        )}
        {jobsQuery.data && (
          <JobsTable
            canRetry={canRetry}
            isRetrying={retryMutation.isPending}
            items={jobsQuery.data.items}
            onRetry={retry}
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button disabled={cursorHistory.length === 0 || jobsQuery.isFetching} onClick={onPrev} variant="outline">
            Prev
          </Button>
          <Button disabled={!jobsQuery.data?.nextCursor || jobsQuery.isFetching} onClick={onNext} variant="outline">
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  );
}
