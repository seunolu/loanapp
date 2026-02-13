import Link from 'next/link';
import type { UnderwritingCaseListItem } from '@/src/features/underwriting/api';

export function UnderwritingCasesTable({ items }: { items: UnderwritingCaseListItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">No cases found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Application ID</th>
            <th className="px-3 py-2">Borrower ID</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t border-border" key={item.applicationId}>
              <td className="px-3 py-2 font-mono text-xs">{item.applicationId}</td>
              <td className="px-3 py-2 font-mono text-xs">{item.borrowerId}</td>
              <td className="px-3 py-2">{item.status}</td>
              <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
                  href={`/underwriting/${item.applicationId}`}
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
