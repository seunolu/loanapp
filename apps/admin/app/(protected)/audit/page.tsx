'use client';

import { useState } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { useAuth } from '@/components/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuditLogsTable } from '@/src/components/audit/audit-logs-table';
import { buildAuditExportUrl } from '@/src/features/audit/api';
import { useAuditLogs } from '@/src/features/audit/hooks/use-audit-logs';
import { hasPermission } from '@/lib/auth/permissions';

export default function AuditPage() {
  const { auth } = useAuth();
  const canExport = hasPermission(auth.permissions, 'AUDIT_EXPORT');
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const logsQuery = useAuditLogs({
    limit: 50,
    cursor,
    query: query || undefined,
    action: action || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined
  });

  const exportUrl = buildAuditExportUrl({
    query: query || undefined,
    action: action || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined
  });

  const onNext = () => {
    const nextCursor = logsQuery.data?.nextCursor;
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

  const resetPaging = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  return (
    <RequirePermission permission="AUDIT_VIEW">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">Explore system events and export filtered logs.</p>
          </div>
          {canExport && (
            <a
              className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
              href={exportUrl}
              rel="noreferrer"
              target="_blank"
            >
              Export CSV
            </a>
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <Input
            onChange={(event) => {
              setQuery(event.target.value);
              resetPaging();
            }}
            placeholder="Search"
            value={query}
          />
          <Input
            onChange={(event) => {
              setAction(event.target.value);
              resetPaging();
            }}
            placeholder="Action"
            value={action}
          />
          <Input
            onChange={(event) => {
              setFrom(event.target.value);
              resetPaging();
            }}
            type="date"
            value={from}
          />
          <Input
            onChange={(event) => {
              setTo(event.target.value);
              resetPaging();
            }}
            type="date"
            value={to}
          />
        </div>

        {logsQuery.isLoading && <div className="text-sm text-muted-foreground">Loading audit logs...</div>}
        {logsQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load audit logs.
          </div>
        )}
        {logsQuery.data && <AuditLogsTable items={logsQuery.data.items} />}

        <div className="flex items-center justify-end gap-2">
          <Button disabled={cursorHistory.length === 0 || logsQuery.isFetching} onClick={onPrev} variant="outline">
            Prev
          </Button>
          <Button disabled={!logsQuery.data?.nextCursor || logsQuery.isFetching} onClick={onNext} variant="outline">
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  );
}
