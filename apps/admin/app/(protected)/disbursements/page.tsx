'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RequirePermission } from '@/components/auth/require-permission';
import { useAuth } from '@/components/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DisbursementsTable } from '@/src/components/disbursements/disbursements-table';
import { useDisbursements } from '@/src/features/disbursements/hooks/use-disbursements';
import type { DisbursementListItem, DisbursementStatus } from '@/src/features/disbursements/api';
import { hasPermission } from '@/lib/auth/permissions';

export default function DisbursementsPage() {
  const { auth } = useAuth();
  const canInitiate = hasPermission(auth.permissions, 'LOANS_DISBURSE');
  const [status, setStatus] = useState<DisbursementStatus | ''>('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<DisbursementListItem | null>(null);

  const { disbursementsQuery, initiateMutation } = useDisbursements({
    limit: 20,
    cursor,
    status: status || undefined
  });

  const onNext = () => {
    const nextCursor = disbursementsQuery.data?.nextCursor;
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

  const confirmInitiate = async () => {
    if (!selectedItem) {
      return;
    }
    try {
      await initiateMutation.mutateAsync(selectedItem.id);
      toast.success('Disbursement initiation submitted.');
      setSelectedItem(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initiate disbursement.');
    }
  };

  return (
    <RequirePermission permission="LOANS_VIEW">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Disbursements</h1>
            <p className="text-sm text-muted-foreground">Track and initiate disbursements.</p>
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => {
              setStatus(event.target.value as DisbursementStatus | '');
              setCursor(undefined);
              setCursorHistory([]);
            }}
            value={status}
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="INITIATED">INITIATED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        {disbursementsQuery.isLoading && <div className="text-sm text-muted-foreground">Loading disbursements...</div>}
        {disbursementsQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load disbursements.
          </div>
        )}
        {disbursementsQuery.data && (
          <DisbursementsTable
            canInitiate={canInitiate}
            items={disbursementsQuery.data.items}
            onInitiate={(item) => setSelectedItem(item)}
          />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button disabled={cursorHistory.length === 0 || disbursementsQuery.isFetching} onClick={onPrev} variant="outline">
            Prev
          </Button>
          <Button disabled={!disbursementsQuery.data?.nextCursor || disbursementsQuery.isFetching} onClick={onNext} variant="outline">
            Next
          </Button>
        </div>
      </div>

      <Dialog onOpenChange={(open) => !open && setSelectedItem(null)} open={Boolean(selectedItem)}>
        <DialogContent>
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Confirm Initiation</h2>
            <p className="text-sm text-muted-foreground">
              Initiate disbursement for loan <span className="font-mono">{selectedItem?.loanId}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setSelectedItem(null)} variant="outline">
                Cancel
              </Button>
              <Button disabled={initiateMutation.isPending} onClick={confirmInitiate}>
                {initiateMutation.isPending ? 'Submitting...' : 'Initiate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </RequirePermission>
  );
}
