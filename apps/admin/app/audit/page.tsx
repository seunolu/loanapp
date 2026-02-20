'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listAdminAudit } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';

export default function AuditPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  const query = useQuery({
    queryKey: ['admin', 'audit', 100],
    queryFn: () => listAdminAudit(100),
    enabled: Boolean(hydrated && token)
  });

  if (!hydrated || !token) {
    return <main className="p-6 text-sm text-muted-foreground">Loading...</main>;
  }

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold">Audit</h1>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading events...</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : 'Failed to load audit events.'}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded border border-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-3 py-2">Created At</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity Type</th>
              <th className="px-3 py-2">Entity Id</th>
              <th className="px-3 py-2">Actor Type</th>
              <th className="px-3 py-2">Actor Role</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((row) => (
              <tr className="border-b border-border" key={row.id}>
                <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{row.action}</td>
                <td className="px-3 py-2">{row.entityType ?? '-'}</td>
                <td className="px-3 py-2">{row.entityId ?? '-'}</td>
                <td className="px-3 py-2">{row.actorType ?? '-'}</td>
                <td className="px-3 py-2">{row.actorRole ?? '-'}</td>
              </tr>
            ))}
            {!query.isLoading && (query.data?.length ?? 0) === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                  No audit events found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
