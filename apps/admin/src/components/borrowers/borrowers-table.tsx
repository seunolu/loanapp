import Link from 'next/link';

import type { BorrowerListItem } from '@/src/features/borrowers/api';

export function BorrowersTable({ items }: { items: BorrowerListItem[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">First Name</th>
            <th className="px-3 py-2 font-medium">Last Name</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr className="border-t border-border" key={item.id}>
              <td className="px-3 py-2">{item.phone}</td>
              <td className="px-3 py-2">{item.firstName ?? '-'}</td>
              <td className="px-3 py-2">{item.lastName ?? '-'}</td>
              <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
              <td className="px-3 py-2">
                <Link
                  className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-muted"
                  href={`/borrowers/${item.id}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                No borrowers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
