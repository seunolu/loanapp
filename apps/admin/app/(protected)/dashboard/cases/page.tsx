'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listCases, type CasePriority, type CaseStatus } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function CasesPage() {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<CaseStatus | ''>('OPEN');
  const [priority, setPriority] = useState<CasePriority | ''>('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const casesQuery = useQuery({
    queryKey: ['admin', 'cases', { status, priority, overdueOnly }, tenantId],
    queryFn: () =>
      listCases({
        status: status || undefined,
        priority: priority || undefined,
        overdueOnly
      }),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <div className="flex items-center gap-2">
          <select
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setStatus(event.target.value as CaseStatus | '')}
            value={status}
          >
            <option value="">ALL STATUS</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="AWAITING_BORROWER">AWAITING_BORROWER</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <select
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setPriority(event.target.value as CasePriority | '')}
            value={priority}
          >
            <option value="">ALL PRIORITY</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} type="checkbox" />
            Overdue only
          </label>
        </div>
      </div>

      {casesQuery.isLoading && <p className="text-sm text-muted-foreground">Loading cases...</p>}
      {casesQuery.isError && (
        <p className="text-sm text-destructive">
          {casesQuery.error instanceof Error ? casesQuery.error.message : 'Failed to load cases'}
        </p>
      )}

      {casesQuery.data ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Borrower</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Assigned</th>
                <th className="px-3 py-2">SLA Due</th>
              </tr>
            </thead>
            <tbody>
              {casesQuery.data.items.map((row) => (
                <tr className="border-t" key={row.id}>
                  <td className="px-3 py-2">
                    <Link className="underline" href={`/dashboard/cases/${row.id}`}>
                      {row.subject}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.borrowerId ?? '-'}</td>
                  <td className="px-3 py-2">{row.priority}</td>
                  <td className="px-3 py-2">
                    {row.status}
                    {row.slaDueAt && new Date(row.slaDueAt) < new Date() && !['RESOLVED', 'CLOSED'].includes(row.status) ? (
                      <span className="ml-2 rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">OVERDUE</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.assignedToAdminUserId ?? '-'}</td>
                  <td className="px-3 py-2">{row.slaDueAt ? new Date(row.slaDueAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

