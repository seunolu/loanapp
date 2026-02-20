'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { DataTable } from '@/src/components/ui/data-table';
import { EmptyState } from '@/src/components/ui/empty-state';
import {
  createTreasuryPool,
  listTreasuryPools,
  type CapitalPoolType,
  type TreasuryPoolSummary,
  getTreasuryPoolSummary
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Badge } from '@/src/ui/Badge';
import { Button } from '@/src/ui/Button';
import { Card, CardContent } from '@/src/ui/Card';
import { Input } from '@/src/ui/Input';
import { Select } from '@/src/ui/Select';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2
});

function canManage(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'OPS' || role === 'SYSTEM';
}

function statusVariant(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'neutral';
}

function toMoney(value: string): string {
  return MONEY.format(Number(value));
}

function parseRules(initialCapital: string) {
  const parsed = Number.parseFloat(initialCapital);
  if (!Number.isFinite(parsed) || parsed < 0) return {};
  return { initialCapital: parsed };
}

export default function TreasuryPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<CapitalPoolType>('TREASURY');
  const [initialCapital, setInitialCapital] = useState('');
  const [creating, setCreating] = useState(false);
  const canEdit = canManage(role);

  const poolsQuery = useQuery({
    queryKey: ['admin', 'treasury', 'pools'],
    queryFn: () => listTreasuryPools()
  });

  const summaryQueries = useQuery({
    queryKey: ['admin', 'treasury', 'pool-summary-all', poolsQuery.data?.map((p) => p.id).join(',') ?? ''],
    enabled: Boolean(poolsQuery.data?.length),
    queryFn: async () => {
      const rows = poolsQuery.data ?? [];
      const summaries = await Promise.all(rows.map(async (pool) => [pool.id, await getTreasuryPoolSummary(pool.id)] as const));
      return Object.fromEntries(summaries) as Record<string, TreasuryPoolSummary>;
    }
  });

  const totals = useMemo(() => {
    const summaries = summaryQueries.data ?? {};
    return Object.values(summaries).reduce(
      (acc, summary) => ({
        available: acc.available + Number(summary.available),
        deployed: acc.deployed + Number(summary.deployed),
        losses: acc.losses + Number(summary.losses)
      }),
      { available: 0, deployed: 0, losses: 0 }
    );
  }, [summaryQueries.data]);

  const createPool = async () => {
    if (!canEdit || !name.trim()) return;
    setCreating(true);
    try {
      await createTreasuryPool({
        name: name.trim(),
        type,
        rules: parseRules(initialCapital)
      });
      setName('');
      setInitialCapital('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'treasury', 'pools'] });
    } finally {
      setCreating(false);
    }
  };

  if (!canEdit && role !== 'RISK_MANAGER') {
    return (
      <Card>
        <CardContent className="py-5">
          <p className="text-sm text-slate-700">Not authorized to view treasury.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treasury"
        subtitle="Capital pools, deployed exposure, and funding utilization."
        right={
          canEdit ? (
            <div className="flex flex-wrap items-end gap-2">
              <Input className="w-48" onChange={(event) => setName(event.target.value)} placeholder="Pool name" value={name} />
              <Select className="w-40" onChange={(event) => setType(event.target.value as CapitalPoolType)} value={type}>
                <option value="TREASURY">Treasury</option>
                <option value="INVESTOR">Investor</option>
                <option value="CREDIT_LINE">Credit Line</option>
              </Select>
              <Input
                className="w-40"
                onChange={(event) => setInitialCapital(event.target.value)}
                placeholder="Initial capital"
                value={initialCapital}
              />
              <Button loading={creating} onClick={() => void createPool()} size="sm">
                Create Pool
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Available</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{MONEY.format(totals.available)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Deployed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{MONEY.format(totals.deployed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Losses</p>
            <p className="mt-2 text-2xl font-semibold text-red-700">{MONEY.format(totals.losses)}</p>
          </CardContent>
        </Card>
      </div>

      {poolsQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">Unable to load treasury pools.</CardContent>
        </Card>
      ) : null}

      {!poolsQuery.isLoading && !poolsQuery.isError && (poolsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title="No capital pools yet" description="Create a treasury pool to fund upcoming disbursements." />
      ) : null}

      {poolsQuery.data?.length ? (
        <DataTable
          columns={[
            { header: 'Name' },
            { header: 'Type' },
            { header: 'Status' },
            { header: 'Available' },
            { header: 'Deployed' },
            { header: 'Utilization' },
            { header: 'View', className: 'w-24' }
          ]}
        >
          {poolsQuery.data.map((pool) => {
            const summary = summaryQueries.data?.[pool.id];
            return (
              <tr className="hover:bg-slate-50" key={pool.id}>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-900">{pool.name}</td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{pool.type}</td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <Badge variant={statusVariant(pool.status)}>{pool.status}</Badge>
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                  {summary ? toMoney(summary.available) : '...'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                  {summary ? toMoney(summary.deployed) : '...'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                  {summary ? `${summary.utilizationPct.toFixed(2)}%` : '...'}
                </td>
                <td className="border-b border-slate-100 px-4 py-3">
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    href={`/dashboard/treasury/pools/${pool.id}`}
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </DataTable>
      ) : null}
    </div>
  );
}

