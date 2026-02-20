'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getLoanLedgerReport } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

type PageProps = { params: { id: string } };

function formatMinor(value: string) {
  const minor = BigInt(value || '0');
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const major = abs / 100n;
  const frac = abs % 100n;
  return `${sign}${major.toString()}.${frac.toString().padStart(2, '0')}`;
}

export default function LoanLedgerPage({ params }: PageProps) {
  const { token } = useAuth();
  const { tenantId } = useTenant();

  const ledgerQuery = useQuery({
    queryKey: ['admin', 'loan-ledger', params.id, tenantId],
    queryFn: () => getLoanLedgerReport(params.id),
    enabled: Boolean(token && tenantId)
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Loan Ledger</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link className="underline" href={`/dashboard/loan-applications/${params.id}`}>
            Loan Detail
          </Link>
          <Link className="underline" href="/dashboard/ledger/entries">
            All Entries
          </Link>
        </div>
      </div>

      {ledgerQuery.isLoading && <p className="text-sm text-muted-foreground">Loading ledger...</p>}
      {ledgerQuery.isError && (
        <p className="text-sm text-destructive">
          {ledgerQuery.error instanceof Error ? ledgerQuery.error.message : 'Failed to load loan ledger'}
        </p>
      )}

      {ledgerQuery.data ? (
        <>
          <div className="rounded border p-3 text-sm">
            <div>
              <span className="font-medium">Loan:</span> {ledgerQuery.data.loan.id}
            </div>
            <div>
              <span className="font-medium">Borrower:</span> {ledgerQuery.data.loan.fullName}
            </div>
            <div>
              <span className="font-medium">Status:</span> {ledgerQuery.data.loan.status}
            </div>
          </div>

          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Type</th>
                  <th className="px-2 py-2 text-left">Memo</th>
                  <th className="px-2 py-2 text-left">Line</th>
                  <th className="px-2 py-2 text-left">Debit</th>
                  <th className="px-2 py-2 text-left">Credit</th>
                  <th className="px-2 py-2 text-left">Running Principal</th>
                </tr>
              </thead>
              <tbody>
                {ledgerQuery.data.items.flatMap((entry) =>
                  entry.lines.map((line, index) => (
                    <tr className="border-t" key={`${entry.id}-${index}`}>
                      <td className="px-2 py-2">
                        {index === 0 ? new Date(entry.occurredAt).toLocaleString() : ''}
                      </td>
                      <td className="px-2 py-2">{index === 0 ? entry.type : ''}</td>
                      <td className="px-2 py-2">{index === 0 ? (entry.memo ?? '-') : ''}</td>
                      <td className="px-2 py-2">
                        {line.accountCode} ({line.direction})
                      </td>
                      <td className="px-2 py-2">
                        {line.direction === 'DEBIT' ? formatMinor(line.amountMinor) : ''}
                      </td>
                      <td className="px-2 py-2">
                        {line.direction === 'CREDIT' ? formatMinor(line.amountMinor) : ''}
                      </td>
                      <td className="px-2 py-2">
                        {index === entry.lines.length - 1
                          ? formatMinor(entry.runningBalances.principalMinor)
                          : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

