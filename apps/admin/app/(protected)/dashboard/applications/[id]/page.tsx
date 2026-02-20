'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  type SetLoanApplicationStatusInput,
  getAdminLoanApplication,
  setAdminLoanApplicationStatus
} from '@/src/lib/api';

type PageProps = {
  params: { id: string };
};

function nextStatusPayload(status: SetLoanApplicationStatusInput['status'], reason?: string) {
  return {
    status,
    reason: reason?.trim() ? reason.trim() : undefined
  };
}

export default function AdminApplicationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const detailQuery = useQuery({
    queryKey: ['admin', 'loan-application', params.id],
    queryFn: () => getAdminLoanApplication(params.id)
  });

  const statusMutation = useMutation({
    mutationFn: async (input: SetLoanApplicationStatusInput) =>
      setAdminLoanApplicationStatus(params.id, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'loan-application', params.id] });

      const previousDetail = queryClient.getQueryData(['admin', 'loan-application', params.id]);
      queryClient.setQueryData(['admin', 'loan-application', params.id], (current: any) =>
        current ? { ...current, status: input.status } : current
      );

      const loanListQueries = queryClient.getQueriesData({ queryKey: ['admin', 'loan-apps'] });
      for (const [key, value] of loanListQueries) {
        if (!Array.isArray(value)) {
          continue;
        }
        queryClient.setQueryData(key, value.map((item: any) => (item.id === params.id ? { ...item, status: input.status } : item)));
      }

      return { previousDetail, loanListQueries };
    },
    onError: (_error, _input, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(['admin', 'loan-application', params.id], context.previousDetail);
      }
      if (context?.loanListQueries) {
        for (const [key, value] of context.loanListQueries) {
          queryClient.setQueryData(key, value);
        }
      }
    },
    onSuccess: async () => {
      toast.success('Application status updated.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'loan-application', params.id] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'loan-apps'] });
      router.replace('/dashboard');
    },
    onSettled: () => {
      setRejectOpen(false);
      setReason('');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Application</h1>
          <p className="text-sm text-muted-foreground">{params.id}</p>
        </div>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          Back
        </Button>
      </div>

      {detailQuery.isLoading && <div className="text-sm text-muted-foreground">Loading application...</div>}
      {detailQuery.isError && (
        <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load application.'}
        </div>
      )}

      {detailQuery.data && (
        <>
          <div className="rounded-md border border-border p-4">
            <pre className="overflow-x-auto text-xs">{JSON.stringify(detailQuery.data, null, 2)}</pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(nextStatusPayload('APPROVED'))}
            >
              {statusMutation.isPending ? 'Saving...' : 'Approve'}
            </Button>
            <Button disabled={statusMutation.isPending} onClick={() => setRejectOpen(true)} variant="destructive">
              Reject
            </Button>
          </div>
        </>
      )}

      <Dialog onOpenChange={setRejectOpen} open={rejectOpen}>
        <DialogContent>
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Reject Application</h2>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="reason">
                Reason (optional)
              </label>
              <Input
                id="reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Optional rejection reason"
                value={reason}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setRejectOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(nextStatusPayload('REJECTED', reason))}
                variant="destructive"
              >
                {statusMutation.isPending ? 'Saving...' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
