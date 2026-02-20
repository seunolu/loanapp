'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { getAdminAudit } from '@/src/lib/api';
import { useTenant } from '@/src/providers/tenant-provider';

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function summarize(value: unknown): Array<{ key: string; value: string }> {
  const record = toRecord(value);
  if (!record) return [];
  return Object.entries(record)
    .slice(0, 6)
    .map(([key, entryValue]) => ({
      key,
      value:
        typeof entryValue === 'string'
          ? entryValue
          : typeof entryValue === 'number' || typeof entryValue === 'boolean'
            ? String(entryValue)
            : Array.isArray(entryValue)
              ? `Array(${entryValue.length})`
              : entryValue && typeof entryValue === 'object'
                ? 'Object'
                : 'null'
    }));
}

export default function DashboardAuditDetailPage() {
  const params = useParams<{ id: string }>();
  const { tenantId } = useTenant();
  const id = params.id;

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit', tenantId, id],
    queryFn: () => getAdminAudit(id),
    enabled: Boolean(tenantId && id)
  });

  if (auditQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading audit detail...</div>;
  }

  if (auditQuery.isError || !auditQuery.data) {
    return <div className="text-sm text-destructive">{auditQuery.error instanceof Error ? auditQuery.error.message : 'Failed to load audit detail.'}</div>;
  }

  const item = auditQuery.data;
  const metadataSummary = summarize(item.metadata);
  const beforeSummary = summarize(item.before);
  const afterSummary = summarize(item.after);
  const errorSummary = summarize(item.error);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit Detail</h1>
      <div className="rounded border p-3 text-sm space-y-1">
        <div><strong>Action:</strong> {item.action}</div>
        <div><strong>Status:</strong> {item.status}</div>
        <div><strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}</div>
        <div><strong>Actor:</strong> {item.actorType ?? '-'} / {item.actorId ?? '-'} ({item.actorRole ?? '-'})</div>
        <div><strong>Entity:</strong> {item.entityType ?? '-'} / {item.entityId ?? '-'}</div>
        <div><strong>RequestId:</strong> <span className="font-mono">{item.requestId ?? '-'}</span></div>
      </div>
      <JsonCard title="Metadata" value={item.metadata} summary={metadataSummary} />
      <JsonCard title="Before" value={item.before} summary={beforeSummary} />
      <JsonCard title="After" value={item.after} summary={afterSummary} />
      <JsonCard title="Error" value={item.error} summary={errorSummary} />
    </div>
  );
}

function JsonCard({
  title,
  value,
  summary
}: {
  title: string;
  value: unknown;
  summary: Array<{ key: string; value: string }>;
}) {
  const hasData = value !== null && value !== undefined;

  return (
    <div className="rounded border p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      {!hasData ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-2">
          {summary.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {summary.map((entry) => (
                <div key={entry.key} className="rounded border bg-muted/20 px-2 py-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{entry.key}</p>
                  <p className="text-xs">{entry.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Structured value available</p>
          )}
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">Expand raw JSON</summary>
            <pre className="mt-2 overflow-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
