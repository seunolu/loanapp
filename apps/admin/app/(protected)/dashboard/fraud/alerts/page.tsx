'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { listFraudAlerts, type FraudAlertStatus, type FraudSeverity } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

export default function FraudAlertsPage() {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<FraudAlertStatus | ''>('OPEN');
  const [severity, setSeverity] = useState<FraudSeverity | ''>('');

  const alertsQuery = useQuery({
    queryKey: ['admin', 'fraud', 'alerts', tenantId, { status, severity }],
    queryFn: () =>
      listFraudAlerts({
        status: status || undefined,
        severity: severity || undefined,
        onlyOpen: status ? undefined : true
      }),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fraud Alerts</h1>
        <div className="flex items-center gap-2">
          <select
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setStatus(event.target.value as FraudAlertStatus | '')}
            value={status}
          >
            <option value="">ALL</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
          </select>
          <select
            className="rounded border px-2 py-1 text-sm"
            onChange={(event) => setSeverity(event.target.value as FraudSeverity | '')}
            value={severity}
          >
            <option value="">ALL SEVERITIES</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      {alertsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading fraud alerts...</p>}
      {alertsQuery.isError && (
        <p className="text-sm text-destructive">
          {alertsQuery.error instanceof Error ? alertsQuery.error.message : 'Failed to load fraud alerts'}
        </p>
      )}

      {alertsQuery.data ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2">Alert</th>
                <th className="px-3 py-2">Loan</th>
                <th className="px-3 py-2">Borrower</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {alertsQuery.data.map((item) => (
                <tr className="border-t" key={item.id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link className="underline" href={`/dashboard/fraud/alerts/${item.id}`}>
                      {item.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.loanApplicationId ?? '-'}</td>
                  <td className="px-3 py-2">{item.borrowerId ?? '-'}</td>
                  <td className="px-3 py-2">{item.severity}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

