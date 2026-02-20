'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageHeader } from '@/src/components/layout/page-header';
import {
  createSupportCase,
  listSupportCases,
  type SupportCaseStatus
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { Select } from '@/src/ui/Select';

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function statusVariant(status: SupportCaseStatus): 'success' | 'neutral' {
  return status === 'OPEN' ? 'success' : 'neutral';
}

function canAccessSupport(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'OPS' || role === 'RISK_MANAGER' || role === 'CREDIT_OFFICER';
}

export default function SupportCasesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { token, role } = useAuth();
  const { tenantId } = useTenant();
  const enabled = Boolean(token && tenantId);
  const allowed = canAccessSupport(role);

  const [status, setStatus] = useState<SupportCaseStatus>('OPEN');
  const [loanId, setLoanId] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [title, setTitle] = useState('');
  const [createLoanId, setCreateLoanId] = useState('');
  const [createBorrowerId, setCreateBorrowerId] = useState('');

  const filters = useMemo(
    () => ({
      status,
      loanId: loanId.trim() || undefined,
      borrowerId: borrowerId.trim() || undefined
    }),
    [status, loanId, borrowerId]
  );

  const casesQuery = useQuery({
    queryKey: ['admin', 'support', 'cases', filters],
    queryFn: () => listSupportCases(filters),
    enabled: enabled && allowed
  });

  const createCaseMutation = useMutation({
    mutationFn: () =>
      createSupportCase({
        title: title.trim(),
        loanId: createLoanId.trim() || undefined,
        borrowerId: createBorrowerId.trim() || undefined
      }),
    onSuccess: async () => {
      setTitle('');
      setCreateLoanId('');
      setCreateBorrowerId('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'support', 'cases'] });
    }
  });

  if (!allowed) {
    return (
      <Card>
        <CardContent className="py-5">
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
          <p className="mt-1 text-sm text-slate-600">
            Support console is restricted to CREDIT_OFFICER, OPS, RISK_MANAGER, and SUPER_ADMIN roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Cases"
        subtitle="Manual intervention requests with approval workflow and immutable execution trail."
        right={
          <Button
            onClick={() => {
              void casesQuery.refetch();
            }}
            size="sm"
            variant="secondary"
          >
            Refresh
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-semibold text-slate-900">Open New Case</p>
          <div className="grid gap-3 md:grid-cols-4">
            <Input label="Title" onChange={(event) => setTitle(event.target.value)} value={title} />
            <Input
              label="Loan ID (optional)"
              onChange={(event) => setCreateLoanId(event.target.value)}
              value={createLoanId}
            />
            <Input
              label="Borrower ID (optional)"
              onChange={(event) => setCreateBorrowerId(event.target.value)}
              value={createBorrowerId}
            />
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!title.trim()}
                loading={createCaseMutation.isPending}
                onClick={() => {
                  void createCaseMutation.mutateAsync();
                }}
                size="sm"
              >
                Create Case
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 py-4 md:grid-cols-4">
          <Select label="Status" onChange={(event) => setStatus(event.target.value as SupportCaseStatus)} value={status}>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </Select>
          <Input label="Filter by Loan ID" onChange={(event) => setLoanId(event.target.value)} value={loanId} />
          <Input
            label="Filter by Borrower ID"
            onChange={(event) => setBorrowerId(event.target.value)}
            value={borrowerId}
          />
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => {
                void casesQuery.refetch();
              }}
              size="sm"
              variant="secondary"
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {casesQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-red-700">Failed to load support cases.</p>
          </CardContent>
        </Card>
      ) : null}

      {!casesQuery.isLoading && !casesQuery.isError && (casesQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title="No support cases found" description="Create a case to start a manual intervention workflow." />
      ) : null}

      {casesQuery.data?.length ? (
        <DataTable
          columns={[
            { header: 'Case ID' },
            { header: 'Title' },
            { header: 'Loan / Borrower' },
            { header: 'Status' },
            { header: 'Created At' },
            { header: 'Action', className: 'w-24' }
          ]}
        >
          {casesQuery.data.map((row) => (
            <tr className="hover:bg-slate-50" key={row.id}>
              <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">{row.id.slice(0, 14)}...</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-900">{row.title}</td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                <p className="font-mono text-xs">Loan: {row.loanId ?? '-'}</p>
                <p className="font-mono text-xs">Borrower: {row.borrowerId ?? '-'}</p>
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {DATE_TIME.format(new Date(row.createdAt))}
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  href={`/dashboard/support/${encodeURIComponent(row.id)}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </div>
  );
}
