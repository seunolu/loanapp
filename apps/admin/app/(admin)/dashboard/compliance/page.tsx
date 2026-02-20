'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { listAdminAudits, exportRegulatoryReport } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';

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

export default function CompliancePage(): React.JSX.Element {
  const { role } = useAuth();
  const allowed = canView(role);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loanId, setLoanId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const queryInput = useMemo(
    () => ({
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize
    }),
    [action, entityType, from, to, page, pageSize]
  );

  const auditsQuery = useQuery({
    queryKey: ['admin', 'compliance', 'audits', queryInput],
    queryFn: () => listAdminAudits(queryInput),
    enabled: allowed
  });

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Compliance tools are restricted to OPS, RISK_MANAGER, and SUPER_ADMIN roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        subtitle="Immutable audit timeline, regulator-ready exports, and forensic investigation tools."
        right={
          <>
            <Link href="/dashboard/compliance/suspicious">
              <Button size="sm" variant="secondary">
                Suspicious Activity
              </Button>
            </Link>
            <Button onClick={() => void exportRegulatoryReport({ kind: 'loan-book', format: 'csv', from, to })} size="sm" variant="secondary">
              Export Loan Book
            </Button>
            <Button onClick={() => void exportRegulatoryReport({ kind: 'delinquency', format: 'csv', from, to })} size="sm" variant="secondary">
              Export Delinquency
            </Button>
            <Button onClick={() => void exportRegulatoryReport({ kind: 'ledger', format: 'csv', from, to })} size="sm" variant="secondary">
              Export Ledger
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-3 py-4 md:grid-cols-5">
            <Input
              label="Action"
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
              value={action}
            />
            <Input
              label="Entity"
              onChange={(event) => {
                setEntityType(event.target.value);
                setPage(1);
              }}
              value={entityType}
            />
            <Input
              label="From"
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              type="date"
              value={from}
            />
            <Input
              label="To"
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              type="date"
              value={to}
            />
          <div className="space-y-2">
            <Input label="Loan Forensics" onChange={(event) => setLoanId(event.target.value)} placeholder="loan id" value={loanId} />
            <Link className="inline-block" href={loanId.trim() ? `/dashboard/compliance/loan/${loanId.trim()}` : '/dashboard/compliance'}>
              <Button disabled={!loanId.trim()} size="sm" variant="primary">
                Open Forensic Report
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {auditsQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">Failed to load audit events.</CardContent>
        </Card>
      ) : null}

      {auditsQuery.data?.items?.length ? (
        <>
          <DataTable
            columns={[
              { header: 'Time' },
              { header: 'Action' },
              { header: 'Actor' },
              { header: 'Entity' },
              { header: 'Status' }
            ]}
          >
            {auditsQuery.data.items.map((item) => (
              <tr key={item.id}>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{DATE_TIME.format(new Date(item.createdAt))}</td>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-900">{item.action}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{item.actorType ?? '-'}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                  {item.entityType ?? '-'} {item.entityId ? <span className="font-mono text-xs">{item.entityId.slice(0, 12)}</span> : null}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <Badge variant={item.status === 'FAIL' ? 'danger' : 'success'}>{item.status}</Badge>
                </td>
              </tr>
            ))}
          </DataTable>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="text-sm text-slate-600">
                Showing page {auditsQuery.data.page} of {auditsQuery.data.totalPages} ({auditsQuery.data.total} total records)
              </p>
              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                  value={String(pageSize)}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                </select>
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
                  disabled={page >= auditsQuery.data.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
