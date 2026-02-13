'use client';

import { useState } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentsTable } from '@/src/components/payments/payments-table';
import { usePayments, type PaymentsTab } from '@/src/features/payments/hooks/use-payments';

export default function PaymentsPage() {
  const [tab, setTab] = useState<PaymentsTab>('payments');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

  const paymentsQuery = usePayments({
    tab,
    limit: 20,
    cursor,
    status: status || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined
  });

  const resetCursor = () => {
    setCursor(undefined);
    setCursorHistory([]);
  };

  const onNext = () => {
    const nextCursor = paymentsQuery.data?.nextCursor;
    if (!nextCursor) {
      return;
    }
    setCursorHistory((prev) => (cursor ? [...prev, cursor] : prev));
    setCursor(nextCursor);
  };

  const onPrev = () => {
    if (cursorHistory.length === 0) {
      setCursor(undefined);
      return;
    }
    const nextHistory = [...cursorHistory];
    const previousCursor = nextHistory.pop();
    setCursorHistory(nextHistory);
    setCursor(previousCursor);
  };

  return (
    <RequirePermission permission="PAYMENTS_VIEW">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Payments & Repayments</h1>
          <p className="text-sm text-muted-foreground">Monitor payment lifecycle and repayment posting.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setTab('payments');
              resetCursor();
            }}
            variant={tab === 'payments' ? 'default' : 'outline'}
          >
            Payments
          </Button>
          <Button
            onClick={() => {
              setTab('repayments');
              resetCursor();
            }}
            variant={tab === 'repayments' ? 'default' : 'outline'}
          >
            Repayments
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <Input
            onChange={(event) => {
              setFrom(event.target.value);
              resetCursor();
            }}
            type="date"
            value={from}
          />
          <Input
            onChange={(event) => {
              setTo(event.target.value);
              resetCursor();
            }}
            type="date"
            value={to}
          />
          <Input
            onChange={(event) => {
              setStatus(event.target.value);
              resetCursor();
            }}
            placeholder="Status (e.g. SUCCEEDED)"
            value={status}
          />
        </div>

        {paymentsQuery.isLoading && <div className="text-sm text-muted-foreground">Loading records...</div>}
        {paymentsQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load records.
          </div>
        )}
        {paymentsQuery.data && <PaymentsTable items={paymentsQuery.data.items} tab={tab} />}

        <div className="flex items-center justify-end gap-2">
          <Button disabled={cursorHistory.length === 0 || paymentsQuery.isFetching} onClick={onPrev} variant="outline">
            Prev
          </Button>
          <Button disabled={!paymentsQuery.data?.nextCursor || paymentsQuery.isFetching} onClick={onNext} variant="outline">
            Next
          </Button>
        </div>
      </div>
    </RequirePermission>
  );
}
