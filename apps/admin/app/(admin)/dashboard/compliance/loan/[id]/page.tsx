'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/src/components/layout/page-header';
import { getLoanForensicReport, type LoanForensicReport } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { Button } from '@/src/ui/Button';
import { Card, CardContent, CardHeader } from '@/src/ui/Card';

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function canView(role: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER';
}

function downloadForensicJson(payload: LoanForensicReport, loanId: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forensic_report_${loanId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ComplianceLoanForensicPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? '');
  const { role } = useAuth();
  const allowed = canView(role);

  const query = useQuery({
    queryKey: ['admin', 'compliance', 'forensic', id],
    queryFn: () => getLoanForensicReport(id),
    enabled: allowed && Boolean(id)
  });

  const counts = useMemo(() => {
    if (!query.data) return null;
    return {
      statusHistory: query.data.statusHistory.length,
      disbursements: query.data.disbursements.length,
      repayments: query.data.repayments.length,
      ledgerEntries: query.data.ledgerEntries.length,
      auditTrail: query.data.auditTrail.length,
      riskEvents: query.data.riskEvents.length,
      treasuryAllocations: query.data.treasuryAllocations.length
    };
  }, [query.data]);

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold text-slate-900">Not Authorized</h1>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Forensic reports are restricted to RISK_MANAGER and SUPER_ADMIN roles.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loan Forensic Report"
        subtitle={<span className="font-mono text-xs text-slate-600">{id}</span>}
        right={
          <Button
            disabled={!query.data}
            onClick={() => {
              if (!query.data) return;
              downloadForensicJson(query.data, id);
            }}
            size="sm"
            variant="secondary"
          >
            Download Report
          </Button>
        }
      />

      {query.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">Failed to load forensic report.</CardContent>
        </Card>
      ) : null}

      {counts ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Object.entries(counts).map(([key, value]) => (
            <Card key={key}>
              <CardContent className="py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">{key}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {query.data?.timeline?.length ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            {query.data.timeline.map((item) => (
              <div className="flex items-start gap-3 border-l border-slate-200 pl-3" key={`${item.kind}:${item.id}`}>
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{item.kind}</p>
                  <p className="font-mono text-xs text-slate-500">{item.id}</p>
                  <p className="text-xs text-slate-500">{DATE_TIME.format(new Date(item.at))}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

