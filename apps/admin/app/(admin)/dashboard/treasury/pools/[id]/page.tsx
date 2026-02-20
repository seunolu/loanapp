'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import {
  getTreasuryPool,
  getTreasuryPoolSummary,
  listTreasuryPoolAllocations,
  updateTreasuryPool,
  type CapitalPoolStatus
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';
import { Select } from '@/src/ui/Select';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2
});

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function toMoney(value: string): string {
  return MONEY.format(Number(value));
}

function canManage(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'OPS' || role === 'SYSTEM';
}

function statusVariant(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'neutral';
}

export default function TreasuryPoolDetailPage(): React.JSX.Element {
  const { role } = useAuth();
  const params = useParams<{ id: string }>();
  const poolId = params.id;
  const queryClient = useQueryClient();
  const canEdit = canManage(role);
  const [statusValue, setStatusValue] = useState<CapitalPoolStatus>('ACTIVE');
  const [rulesJson, setRulesJson] = useState('{}');
  const [saving, setSaving] = useState(false);

  const poolQuery = useQuery({
    queryKey: ['admin', 'treasury', 'pool', poolId],
    queryFn: () => getTreasuryPool(poolId)
  });
  const summaryQuery = useQuery({
    queryKey: ['admin', 'treasury', 'pool-summary', poolId],
    queryFn: () => getTreasuryPoolSummary(poolId)
  });
  const allocationsQuery = useQuery({
    queryKey: ['admin', 'treasury', 'pool-allocations', poolId],
    queryFn: () => listTreasuryPoolAllocations(poolId, 20)
  });

  useEffect(() => {
    if (!poolQuery.data) return;
    setStatusValue(poolQuery.data.status);
    setRulesJson(JSON.stringify(poolQuery.data.rulesJson ?? {}, null, 2));
  }, [poolQuery.data]);

  const saveChanges = async () => {
    if (!canEdit || !poolQuery.data) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(rulesJson);
      await updateTreasuryPool(poolId, {
        status: statusValue,
        rules: parsed
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'treasury', 'pool', poolId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'treasury', 'pool-summary', poolId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'treasury', 'pools'] })
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit && role !== 'RISK_MANAGER') {
    return (
      <Card>
        <CardContent className="py-5 text-sm text-slate-700">Not authorized to access treasury pool details.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={poolQuery.data?.name ?? 'Treasury Pool'}
        subtitle={
          <span className="flex items-center gap-2">
            <Badge variant="info">{poolQuery.data?.type ?? '...'}</Badge>
            <Badge variant={statusVariant(poolQuery.data?.status ?? 'PAUSED')}>{poolQuery.data?.status ?? '...'}</Badge>
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Available</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{summaryQuery.data ? toMoney(summaryQuery.data.available) : '...'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Deployed</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{summaryQuery.data ? toMoney(summaryQuery.data.deployed) : '...'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Repaid</p>
            <p className="mt-2 text-lg font-semibold text-emerald-700">{summaryQuery.data ? toMoney(summaryQuery.data.repaid) : '...'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Losses</p>
            <p className="mt-2 text-lg font-semibold text-red-700">{summaryQuery.data ? toMoney(summaryQuery.data.losses) : '...'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Utilization</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {summaryQuery.data ? `${summaryQuery.data.utilizationPct.toFixed(2)}%` : '...'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Pool Settings</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              disabled={!canEdit}
              label="Status"
              onChange={(event) => setStatusValue(event.target.value as CapitalPoolStatus)}
              value={statusValue}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="CLOSED">CLOSED</option>
            </Select>
            <div />
          </div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="rules-json">
            Rules JSON
          </label>
          <textarea
            className="min-h-40 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
            disabled={!canEdit}
            id="rules-json"
            onChange={(event) => setRulesJson(event.target.value)}
            value={rulesJson}
          />
          {canEdit ? (
            <Button loading={saving} onClick={() => void saveChanges()} size="sm">
              Save Changes
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Recent Allocations</h2>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <DataTable
            columns={[
              { header: 'Loan Application ID' },
              { header: 'Status' },
              { header: 'Deployed Amount' },
              { header: 'Released Amount' },
              { header: 'Written Off' },
              { header: 'Created At' }
            ]}
          >
            {(allocationsQuery.data ?? []).map((allocation) => (
              <tr className="hover:bg-slate-50" key={allocation.id}>
                <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">{allocation.loanApplicationId}</td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <Badge variant="neutral">{allocation.status}</Badge>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{toMoney(allocation.deployedAmount)}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{toMoney(allocation.releasedAmount)}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{toMoney(allocation.writtenOffAmount)}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                  {DATE_TIME.format(new Date(allocation.createdAt))}
                </td>
              </tr>
            ))}
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}
