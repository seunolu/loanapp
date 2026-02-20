'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { listSuspiciousActivityPaged } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Select } from '@/src/ui/Select';

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function canView(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER' || role === 'OPS' || role === 'SYSTEM';
}

function severityVariant(severity: string): 'warning' | 'danger' | 'neutral' {
  if (severity === 'HIGH' || severity === 'CRITICAL') return 'danger';
  if (severity === 'MEDIUM') return 'warning';
  return 'neutral';
}

export default function SuspiciousCompliancePage(): React.JSX.Element {
  const { role } = useAuth();
  const allowed = canView(role);
  const [severity, setSeverity] = useState('');
  const [resolved, setResolved] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const query = useQuery({
    queryKey: ['admin', 'compliance', 'suspicious', severity, resolved, page, pageSize],
    queryFn: () =>
      listSuspiciousActivityPaged({
        severity: severity ? (severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') : undefined,
        resolved: resolved ? resolved === 'true' : undefined,
        page,
        pageSize
      }),
    enabled: allowed
  });

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Suspicious activity view is restricted to OPS, RISK_MANAGER, and SUPER_ADMIN roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suspicious Activity"
        subtitle="High-risk operational and financial anomalies flagged by system controls."
        right={
          <Button onClick={() => void query.refetch()} size="sm" variant="secondary">
            Refresh
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-3 py-4 md:grid-cols-2">
          <Select
            label="Severity"
            onChange={(event) => {
              setSeverity(event.target.value);
              setPage(1);
            }}
            value={severity}
          >
            <option value="">All</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </Select>
          <Select
            label="Resolved"
            onChange={(event) => {
              setResolved(event.target.value);
              setPage(1);
            }}
            value={resolved}
          >
            <option value="">All</option>
            <option value="false">Open</option>
            <option value="true">Resolved</option>
          </Select>
        </CardContent>
      </Card>

      {query.data?.items?.length ? (
        <DataTable
          columns={[
            { header: 'Time' },
            { header: 'Entity' },
            { header: 'Reason' },
            { header: 'Severity' },
            { header: 'State' }
          ]}
        >
          {query.data.items.map((item) => (
            <tr key={item.id}>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{DATE_TIME.format(new Date(item.createdAt))}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {item.entityType} <span className="font-mono text-xs text-slate-500">{item.entityId.slice(0, 12)}</span>
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-900">{item.reason}</td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Badge variant={item.resolved ? 'success' : 'warning'}>{item.resolved ? 'RESOLVED' : 'OPEN'}</Badge>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-slate-600">No suspicious activity in the selected filter.</CardContent>
        </Card>
      )}

      {query.data ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-slate-600">
              Showing page {query.data.page} of {query.data.totalPages} ({query.data.total} total records)
            </p>
            <div className="flex items-center gap-2">
              <Select
                className="w-28"
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </Select>
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= query.data.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
