'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { LoadingSkeletonRows } from '@/src/components/ui/loading-skeleton';
import { type AdminLoanApplicationStatus, listAdminLoanApplications } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Input } from '@/src/ui/Input';
import { Select } from '@/src/ui/Select';
import { statusToBadgeVariant, statusToLabel } from '@/src/ui/status-badge';

const QUEUE_FILTERS: AdminLoanApplicationStatus[] = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'REQUESTED_DOCUMENTS',
  'APPROVED',
  'READY_FOR_DISBURSEMENT',
  'DISBURSED',
  'OVERDUE'
];

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

export default function LoanApplicationsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [statusFilter, setStatusFilter] = useState<AdminLoanApplicationStatus>('SUBMITTED');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const applicationsQuery = useQuery({
    queryKey: ['admin', 'loan-apps', tenantId, statusFilter],
    queryFn: () =>
      statusFilter === 'OVERDUE'
        ? listAdminLoanApplications({ queue: 'OVERDUE' })
        : listAdminLoanApplications({ status: statusFilter }),
    enabled: Boolean(tenantId && token)
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput.trim().toLowerCase());
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filteredItems = useMemo(() => {
    const items = applicationsQuery.data ?? [];
    if (!searchTerm) {
      return items;
    }
    return items.filter((item) => item.id.toLowerCase().includes(searchTerm));
  }, [applicationsQuery.data, searchTerm]);

  return (
    <div className="space-y-6">
      <PageHeader
        right={
          <div className="flex w-full flex-wrap items-start justify-end gap-2">
            <div className="w-52">
              <Input
                aria-label="Search applications"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by ID"
                value={searchInput}
              />
            </div>
            <div className="w-52">
              <Select
                aria-label="Status filter"
                onChange={(event) => setStatusFilter(event.target.value as AdminLoanApplicationStatus)}
                value={statusFilter}
              >
                {QUEUE_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {statusToLabel(status)}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              className="focus:ring-2 focus:ring-slate-300"
              onClick={() => applicationsQuery.refetch()}
              size="sm"
              variant="secondary"
            >
              Refresh
            </Button>
          </div>
        }
        subtitle="Review and manage borrower submissions."
        title="Loan Applications"
      />

      <DataTable
        columns={[
          { header: 'Application ID', className: 'w-[38%]' },
          { header: 'Status', className: 'w-[22%]' },
          { header: 'Created', className: 'w-[25%]' },
          { header: 'Action', className: 'w-[15%] text-right' }
        ]}
      >
        {applicationsQuery.isLoading ? <LoadingSkeletonRows rows={7} /> : null}

        {applicationsQuery.isError ? (
          <tr>
            <td className="px-4 py-6" colSpan={4}>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  {applicationsQuery.error instanceof Error ? applicationsQuery.error.message : 'Failed to load applications.'}
                </p>
                <div className="mt-3">
                  <Button
                    className="focus:ring-2 focus:ring-slate-300"
                    onClick={() => applicationsQuery.refetch()}
                    size="sm"
                    variant="secondary"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </td>
          </tr>
        ) : null}

        {!applicationsQuery.isLoading && !applicationsQuery.isError && filteredItems.length === 0 ? (
          <tr>
            <td className="px-4 py-6" colSpan={4}>
              <EmptyState
                description={searchTerm ? 'Try a different application ID filter.' : 'New applications will appear here once submitted.'}
                title="No applications yet"
              />
            </td>
          </tr>
        ) : null}

        {!applicationsQuery.isLoading && !applicationsQuery.isError
          ? filteredItems.map((item) => (
              <tr className="transition-colors hover:bg-slate-50" key={item.id}>
                <td className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="max-w-[220px] truncate font-mono text-xs text-slate-900" title={item.id}>
                      {item.id}
                    </span>
                    <Button
                      className="focus:ring-2 focus:ring-slate-300"
                      onClick={async () => {
                        await navigator.clipboard.writeText(item.id);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Copy
                    </Button>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <Badge variant={statusToBadgeVariant(item.status)}>{statusToLabel(item.status)}</Badge>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                  {item.createdAt ? DATE_TIME_FORMATTER.format(new Date(item.createdAt)) : '-'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-right">
                  <Button
                    className="focus:ring-2 focus:ring-slate-300"
                    onClick={() => router.push(`/dashboard/loan-applications/${item.id}`)}
                    size="sm"
                    variant="ghost"
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))
          : null}
      </DataTable>
    </div>
  );
}
