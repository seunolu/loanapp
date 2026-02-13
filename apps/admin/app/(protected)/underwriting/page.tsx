'use client';

import { useEffect, useState } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnderwritingCasesTable } from '@/src/components/underwriting/underwriting-cases-table';
import { useUnderwritingCases } from '@/src/features/underwriting/hooks/use-underwriting-cases';
import type { UnderwritingCaseStatus } from '@/src/features/underwriting/api';

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

export default function UnderwritingPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UnderwritingCaseStatus | ''>('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search, 350);

  const casesQuery = useUnderwritingCases({
    limit: 20,
    cursor,
    status: status || undefined,
    query: debouncedSearch || undefined
  });

  const onNext = () => {
    const nextCursor = casesQuery.data?.nextCursor;
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
    <RequirePermission permission="UNDERWRITING_VIEW">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Underwriting Queue</h1>
            <p className="text-sm text-muted-foreground">Review and complete underwriting cases.</p>
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
                setStatus(event.target.value as UnderwritingCaseStatus | '');
                setCursor(undefined);
                setCursorHistory([]);
              }}
              value={status}
            >
              <option value="">All statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        {casesQuery.isLoading && <div className="text-sm text-muted-foreground">Loading underwriting cases...</div>}
        {casesQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load underwriting cases.
          </div>
        )}
        {casesQuery.data && <UnderwritingCasesTable items={casesQuery.data.items} />}

        <div className="flex items-center justify-end gap-2">
          <Button disabled={cursorHistory.length === 0 || casesQuery.isFetching} onClick={onPrev} variant="outline">
            Prev
          </Button>
          <Button disabled={!casesQuery.data?.nextCursor || casesQuery.isFetching} onClick={onNext} variant="outline">
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  );
}
