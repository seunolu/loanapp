'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/src/components/layout/page-header';
import { usePortfolioCollections } from '@/src/lib/queries/portfolio';
import { Card, CardContent } from '@/src/ui/Card';
import { Select } from '@/src/ui/Select';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit'
});

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2
});

function money(value: number): string {
  return MONEY.format(value);
}

export default function PortfolioCollectionsPage(): React.JSX.Element {
  const [days, setDays] = useState(30);
  const collectionsQuery = usePortfolioCollections(days);

  const chartData = (collectionsQuery.data?.items ?? []).map((row) => ({
    date: DATE_FORMAT.format(new Date(row.date)),
    due: row.dueAmount,
    collected: row.collectedAmount
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections Effectiveness"
        subtitle="Daily due versus collected amounts and efficiency rates."
        right={
          <Select className="w-36" onChange={(event) => setDays(Number(event.target.value))} value={String(days)}>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
          </Select>
        }
      />

      <Card>
        <CardContent className="py-5">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip formatter={(value) => (typeof value === 'number' ? money(value) : value)} />
                <Area type="monotone" dataKey="due" stroke="#ef4444" fill="url(#dueFill)" />
                <Area type="monotone" dataKey="collected" stroke="#16a34a" fill="url(#colFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

