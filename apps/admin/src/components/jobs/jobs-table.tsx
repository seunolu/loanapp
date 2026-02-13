import { Button } from '@/components/ui/button';
import type { JobListItem } from '@/src/features/jobs/api';

export function JobsTable({
  items,
  canRetry,
  isRetrying,
  onRetry
}: {
  items: JobListItem[];
  canRetry: boolean;
  isRetrying: boolean;
  onRetry: (jobId: string) => void;
}) {
  if (items.length === 0) {
    return <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">No jobs found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Job ID</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Key</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Attempts</th>
            <th className="px-3 py-2">Run At</th>
            <th className="px-3 py-2">Error</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={`border-t border-border ${item.status === 'FAILED' ? 'bg-destructive/5' : ''}`}
              key={item.id}
            >
              <td className="px-3 py-2 font-mono text-xs">{item.id}</td>
              <td className="px-3 py-2">{item.type}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.key}</td>
              <td className="px-3 py-2 font-medium">{item.status}</td>
              <td className="px-3 py-2">
                {item.attempts}/{item.maxAttempts}
              </td>
              <td className="px-3 py-2">{new Date(item.runAt).toLocaleString()}</td>
              <td className="max-w-[280px] truncate px-3 py-2 text-xs text-muted-foreground">{item.lastError ?? '-'}</td>
              <td className="px-3 py-2 text-right">
                {canRetry && (item.status === 'FAILED' || item.status === 'DEAD') ? (
                  <Button disabled={isRetrying} onClick={() => onRetry(item.id)} size="sm" variant="outline">
                    Retry
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
