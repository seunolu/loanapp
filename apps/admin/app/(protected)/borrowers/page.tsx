'use client';

import { useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BorrowersTable } from '@/src/components/borrowers/borrowers-table';
import { useBorrowers } from '@/src/features/borrowers/hooks/use-borrowers';

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

export default function BorrowersPage() {
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search, 350);

  const borrowersQuery = useBorrowers({
    limit: 20,
    cursor,
    query: debouncedSearch || undefined
  });

  const onNext = () => {
    const nextCursor = borrowersQuery.data?.nextCursor;
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
    <RequirePermission permission="BORROWERS_VIEW">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Borrowers</h1>
            <p className="text-sm text-muted-foreground">Search and manage borrower records.</p>
          </div>
          <Input
            className="w-full md:w-80"
            onChange={(event) => {
              setSearch(event.target.value);
              setCursor(undefined);
              setCursorHistory([]);
            }}
            placeholder="Search by name or phone"
            value={search}
          />
        </div>

        {borrowersQuery.isLoading && <div className="text-sm text-muted-foreground">Loading borrowers...</div>}
        {borrowersQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load borrowers.
          </div>
        )}
        {borrowersQuery.data && <BorrowersTable items={borrowersQuery.data.items} />}

        <div className="flex items-center justify-end gap-2">
          <Button disabled={cursorHistory.length === 0 || borrowersQuery.isFetching} onClick={onPrev} variant="outline">
            Prev
          </Button>
          <Button disabled={!borrowersQuery.data?.nextCursor || borrowersQuery.isFetching} onClick={onNext} variant="outline">
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  );
}
