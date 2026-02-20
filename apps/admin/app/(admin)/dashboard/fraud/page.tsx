'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import { listFraudQueue, type BorrowerFraudLevel } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function fraudVariant(level: BorrowerFraudLevel): 'neutral' | 'warning' | 'danger' {
  if (level === 'SEVERE' || level === 'HIGH') return 'danger';
  if (level === 'MEDIUM' || level === 'LOW') return 'warning';
  return 'neutral';
}

function allow(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER';
}

export default function FraudQueuePage(): React.JSX.Element {
  const { role } = useAuth();
  const [level, setLevel] = useState<'HIGH' | 'SEVERE'>('HIGH');
  const canView = allow(role);

  const queueQuery = useQuery({
    queryKey: ['admin', 'fraud', 'queue', level],
    queryFn: () => listFraudQueue(level),
    enabled: canView
  });

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Fraud queue is restricted to RISK_MANAGER and SUPER_ADMIN roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud Queue"
        subtitle="Prioritized borrower behavioral risk signals that require review."
        right={
          <div className="flex gap-2">
            <Button onClick={() => setLevel('HIGH')} size="sm" variant={level === 'HIGH' ? 'primary' : 'secondary'}>
              High
            </Button>
            <Button onClick={() => setLevel('SEVERE')} size="sm" variant={level === 'SEVERE' ? 'primary' : 'secondary'}>
              Severe
            </Button>
          </div>
        }
      />

      {queueQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-red-700">Failed to load fraud queue.</p>
          </CardContent>
        </Card>
      ) : null}

      {!queueQuery.isLoading && !queueQuery.isError && (queueQuery.data?.items?.length ?? 0) === 0 ? (
        <EmptyState title="No borrowers in this queue" description="Signals will appear here when risk thresholds are crossed." />
      ) : null}

      {queueQuery.data?.items?.length ? (
        <DataTable
          columns={[
            { header: 'Borrower' },
            { header: 'Risk' },
            { header: 'Score' },
            { header: 'Flags' },
            { header: 'Updated' },
            { header: 'Action', className: 'w-28' }
          ]}
        >
          {queueQuery.data.items.map((row) => (
            <tr key={row.id}>
              <td className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-900">{row.borrowerName ?? row.borrowerId}</p>
                <p className="font-mono text-xs text-slate-500">{row.borrowerPhone}</p>
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Badge variant={fraudVariant(row.fraudLevel)}>{row.fraudLevel}</Badge>
              </td>
              <td className="border-b border-slate-100 px-4 py-3 font-mono text-sm text-slate-800">{row.riskScore}</td>
              <td className="border-b border-slate-100 px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(row.flags.length ? row.flags : ['-']).map((flag) => (
                    <Badge key={flag} variant="warning">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                {DATE_TIME.format(new Date(row.updatedAt))}
              </td>
              <td className="border-b border-slate-100 px-4 py-3">
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  href={`/dashboard/fraud/borrowers/${encodeURIComponent(row.borrowerId)}`}
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
