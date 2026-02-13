'use client';

import { useEffect, useState } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApplicationsTable } from '@/src/components/applications/applications-table';
import { useApplications } from '@/src/features/applications/hooks/use-applications';
import type { LoanApplicationStatus } from '@/src/features/applications/api';

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

export default function ApplicationsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LoanApplicationStatus | ''>('SUBMITTED');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search, 350);

  const applicationsQuery = useApplications({
    limit: 20,
    cursor,
    status: status || undefined,
    query: debouncedSearch || undefined
  });

  const onNext = () => {
    const nextCursor = applicationsQuery.data?.nextCursor;
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

  return (
    <RequirePermission permission="LOANS_VIEW">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Applications Queue</h1>
            <p className="text-sm text-muted-foreground">Review, approve or reject loan applications.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 md:w-auto">
            <Input
              className="w-full md:w-72"
              onChange={(event) => {
                setSearch(event.target.value);
                setCursor(undefined);
                setCursorHistory([]);
              }}
              placeholder="Search by application or borrower ID"
              value={search}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => {
                setStatus(event.target.value as LoanApplicationStatus | '');
                setCursor(undefined);
                setCursorHistory([]);
              }}
              value={status}
            >
              <option value="">All statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        {applicationsQuery.isLoading && <div className="text-sm text-muted-foreground">Loading applications...</div>}
        {applicationsQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load applications.
          </div>
        )}
        {applicationsQuery.data && <ApplicationsTable items={applicationsQuery.data.items} />}

        <div className="flex items-center justify-end gap-2">
          <Button
            disabled={cursorHistory.length === 0 || applicationsQuery.isFetching}
            onClick={onPrev}
            variant="outline"
          >
            Prev
          </Button>
          <Button
            disabled={!applicationsQuery.data?.nextCursor || applicationsQuery.isFetching}
            onClick={onNext}
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  );
}
