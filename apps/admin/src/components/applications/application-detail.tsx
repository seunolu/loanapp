'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ApplicationDetail, OfferPreview } from '@/src/features/applications/api';

export function ApplicationDetailPanel({
  detail,
  canApprove,
  canReject,
  isApproving,
  isRejecting,
  isPreviewing,
  preview,
  onPreview,
  onApprove,
  onReject
}: {
  detail: ApplicationDetail;
  canApprove: boolean;
  canReject: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  isPreviewing: boolean;
  preview: OfferPreview | null;
  onPreview: () => Promise<void>;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const underwritingCompleted = detail.underwriting?.status === 'COMPLETED';

  const handlePreview = async () => {
    try {
      await onPreview();
      toast.success('Offer preview generated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to preview offer.');
    }
  };

  const handleApprove = async () => {
    if (!underwritingCompleted) {
      toast.error('Underwriting must be COMPLETED before approval.');
      return;
    }
    try {
      await onApprove();
      toast.success('Application approved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve application.');
    }
  };

  const handleReject = async () => {
    const rejectReason = reason.trim();
    if (rejectReason.length < 3) {
      toast.error('Reason must be at least 3 characters.');
      return;
    }
    try {
      await onReject(rejectReason);
      toast.success('Application rejected.');
      setRejectOpen(false);
      setReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject application.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-base font-semibold">Application Details</h2>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Application ID</p>
            <p className="font-mono text-xs">{detail.application.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Borrower ID</p>
            <p className="font-mono text-xs">{detail.application.borrowerId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount Requested</p>
            <p>{detail.application.amountRequested.toLocaleString()} kobo</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tenor</p>
            <p>{detail.application.tenorDays} days</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p>{detail.application.status}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Underwriting</p>
            <p>{detail.underwriting?.status ?? 'NOT_FOUND'}</p>
          </div>
        </div>
        {!underwritingCompleted && (
          <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-100/40 p-3 text-sm text-amber-800">
            Underwriting status is not COMPLETED. Approve is blocked.
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={isPreviewing || !canApprove} onClick={handlePreview} variant="outline">
            {isPreviewing ? 'Previewing...' : 'Offer Preview'}
          </Button>
          <Button
            disabled={isApproving || !canApprove || !underwritingCompleted}
            onClick={handleApprove}
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
          <Button
            disabled={isRejecting || !canReject}
            onClick={() => setRejectOpen(true)}
            variant="destructive"
          >
            Reject
          </Button>
        </div>
      </div>

      {preview && (
        <div className="rounded-md border border-border p-4">
          <h2 className="mb-3 text-base font-semibold">Offer Preview</h2>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Principal</p>
              <p>{preview.principalAmount.toLocaleString()} kobo</p>
            </div>
            <div>
              <p className="text-muted-foreground">Interest</p>
              <p>{preview.interestAmount.toLocaleString()} kobo</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fees</p>
              <p>{preview.feeAmount.toLocaleString()} kobo</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Repayable</p>
              <p>{preview.totalRepayable.toLocaleString()} kobo</p>
            </div>
            <div>
              <p className="text-muted-foreground">Schedule Type</p>
              <p>{preview.scheduleType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Expires At</p>
              <p>{new Date(preview.expiresAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold">Schedule</h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Due Date</th>
                    <th className="px-3 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.schedule.map((item) => (
                    <tr className="border-t border-border" key={`${item.dueDate}-${item.amount}`}>
                      <td className="px-3 py-2">{new Date(item.dueDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{item.amount.toLocaleString()} kobo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog onOpenChange={setRejectOpen} open={rejectOpen}>
        <DialogContent>
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Reject Application</h2>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="rejectReason">
                Reason
              </label>
              <Input
                id="rejectReason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain rejection reason"
                value={reason}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRejectOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button disabled={isRejecting} onClick={handleReject} variant="destructive">
                {isRejecting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
