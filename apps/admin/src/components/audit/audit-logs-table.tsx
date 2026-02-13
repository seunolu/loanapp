import type { AuditLogListItem } from '@/src/features/audit/api';

export function AuditLogsTable({ items }: { items: AuditLogListItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">No audit logs found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Actor</th>
            <th className="px-3 py-2">Entity</th>
            <th className="px-3 py-2">Metadata</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t border-border" key={item.id}>
              <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2">{item.action}</td>
              <td className="px-3 py-2">
                <div>{item.actorType}</div>
                <div className="font-mono text-xs text-muted-foreground">{item.actorId ?? '-'}</div>
              </td>
              <td className="px-3 py-2">
                <div>{item.entityType}</div>
                <div className="font-mono text-xs text-muted-foreground">{item.entityId ?? '-'}</div>
              </td>
              <td className="max-w-[280px] truncate px-3 py-2 text-xs text-muted-foreground">
                {item.metadata == null ? '-' : JSON.stringify(item.metadata)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
