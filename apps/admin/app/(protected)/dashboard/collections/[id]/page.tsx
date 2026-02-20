'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  addCollectionsCaseAction,
  assignCollectionsCase,
  closeCollectionsCase,
  getCollectionsCase,
  pauseLoanPenalty,
  setCollectionsPromiseToPay,
  waiveLoanPenalty,
  writeOffCollectionsCase
} from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

type PageProps = { params: { id: string } };

export default function CollectionCaseDetailPage({ params }: PageProps) {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const [note, setNote] = useState('');
  const [ptpDate, setPtpDate] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [waiverAmount, setWaiverAmount] = useState('');
  const [penaltyPaused, setPenaltyPaused] = useState(true);

  const caseQuery = useQuery({
    queryKey: ['admin', 'collections', 'case', params.id, tenantId],
    queryFn: () => getCollectionsCase(params.id),
    enabled: Boolean(token && tenantId)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'collections', 'case', params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'collections', 'cases'] });
  };

  const mutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: async () => {
      await refresh();
      setNote('');
      setResolutionNote('');
      setWaiverAmount('');
      setPtpDate('');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Action failed')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Collections Case</h1>
        <Link className="text-sm underline" href="/dashboard/collections">
          Back to cases
        </Link>
      </div>

      {caseQuery.isLoading && <p className="text-sm text-muted-foreground">Loading case...</p>}
      {caseQuery.isError && (
        <p className="text-sm text-destructive">{caseQuery.error instanceof Error ? caseQuery.error.message : 'Failed to load case.'}</p>
      )}

      {caseQuery.data ? (
        <>
          <div className="rounded border p-4 text-sm">
            <div>Status: {caseQuery.data.status}</div>
            <div>Stage: {caseQuery.data.stage}</div>
            <div>DPD: {caseQuery.data.currentDpd}</div>
            <div>Outstanding: {caseQuery.data.currentOutstanding}</div>
            <div>Borrower: {caseQuery.data.loanAccount.fullName} ({caseQuery.data.loanAccount.phone})</div>
            <div>Loan Account: {caseQuery.data.loanAccountId}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                const adminUserId = window.prompt('Assign to admin user id');
                if (!adminUserId?.trim()) return;
                mutation.mutate(() => assignCollectionsCase(params.id, adminUserId.trim()));
              }}
              size="sm"
              variant="outline"
            >
              Assign to me
            </Button>
            <Button
              disabled={mutation.isPending || !ptpDate}
              onClick={() =>
                mutation.mutate(() =>
                  setCollectionsPromiseToPay(params.id, { promiseToPayAt: new Date(ptpDate).toISOString() })
                )
              }
              size="sm"
              variant="outline"
            >
              Set PTP
            </Button>
            <input className="rounded border px-2 py-1 text-sm" onChange={(e) => setPtpDate(e.target.value)} type="date" value={ptpDate} />
            <Button
              disabled={mutation.isPending || !resolutionNote.trim()}
              onClick={() => mutation.mutate(() => closeCollectionsCase(params.id, { resolutionNote }))}
              size="sm"
              variant="outline"
            >
              Mark Closed
            </Button>
            <Button
              disabled={mutation.isPending || !resolutionNote.trim()}
              onClick={() => mutation.mutate(() => writeOffCollectionsCase(params.id, { note: resolutionNote }))}
              size="sm"
              variant="destructive"
            >
              Write-off
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <textarea
              className="min-h-[80px] w-full rounded border p-2 text-sm"
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add case note..."
              value={note}
            />
            <Button
              disabled={mutation.isPending || !note.trim()}
              onClick={() => mutation.mutate(() => addCollectionsCaseAction(params.id, { type: 'NOTE', note }))}
              size="sm"
            >
              Add Note
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={mutation.isPending || !note.trim()}
              onClick={() =>
                mutation.mutate(() =>
                  pauseLoanPenalty(caseQuery.data.loanAccountId, { isPaused: penaltyPaused, note })
                )
              }
              size="sm"
              variant="outline"
            >
              {penaltyPaused ? 'Pause Penalties' : 'Resume Penalties'}
            </Button>
            <Button onClick={() => setPenaltyPaused((prev) => !prev)} size="sm" variant="ghost">
              Toggle Pause/Resume
            </Button>
            <input
              className="rounded border px-2 py-1 text-sm"
              onChange={(e) => setWaiverAmount(e.target.value)}
              placeholder="Waiver amount"
              value={waiverAmount}
            />
            <Button
              disabled={mutation.isPending || !Number(waiverAmount) || !note.trim()}
              onClick={() =>
                mutation.mutate(() =>
                  waiveLoanPenalty(caseQuery.data.loanAccountId, {
                    amount: Number(waiverAmount),
                    note
                  })
                )
              }
              size="sm"
              variant="outline"
            >
              Waive Penalty
            </Button>
          </div>

          <div className="rounded border p-4">
            <h2 className="mb-2 text-sm font-medium">Actions Timeline</h2>
            <div className="space-y-2 text-sm">
              {caseQuery.data.actions.map((action) => (
                <div className="rounded border p-2" key={action.id}>
                  <div className="font-medium">{action.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(action.createdAt).toLocaleString()} {action.actorAdminUserId ? `by ${action.actorAdminUserId}` : 'by SYSTEM'}
                  </div>
                  <div>{action.note}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
