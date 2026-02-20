'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { addCaseMessage, assignCase, getCase, transitionCase, type CaseResolutionCode, type CaseStatus } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

type PageProps = {
  params: { id: string };
};

export default function CaseDetailPage({ params }: PageProps) {
  const queryClient = useQueryClient();
  const { token, role } = useAuth();
  const { tenantId } = useTenant();
  const [message, setMessage] = useState('');
  const [visibility, setVisibility] = useState<'INTERNAL' | 'BORROWER'>('INTERNAL');
  const [nextStatus, setNextStatus] = useState<CaseStatus>('IN_REVIEW');
  const [reason, setReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionCode, setResolutionCode] = useState<CaseResolutionCode | ''>('');

  const detailQuery = useQuery({
    queryKey: ['admin', 'case', params.id],
    queryFn: () => getCase(params.id),
    enabled: Boolean(token && tenantId)
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'case', params.id] });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'cases'] });
  };

  const assignMutation = useMutation({
    mutationFn: async () => assignCase(params.id),
    onSuccess: async () => {
      toast.success('Case assigned to you');
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Assign failed')
  });

  const messageMutation = useMutation({
    mutationFn: async () => addCaseMessage(params.id, { visibility, message }),
    onSuccess: async () => {
      setMessage('');
      toast.success('Message added');
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Message failed')
  });

  const transitionMutation = useMutation({
    mutationFn: async () =>
      transitionCase(params.id, {
        toStatus: nextStatus,
        reason: reason.trim() || undefined,
        resolutionNotes: resolutionNotes.trim() || undefined,
        resolutionCode: resolutionCode || undefined
      }),
    onSuccess: async () => {
      toast.success('Case transitioned');
      await refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Transition failed')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Case Detail</h1>
        <Link className="text-sm underline" href="/dashboard/cases">
          Back to cases
        </Link>
      </div>

      {detailQuery.isLoading && <p className="text-sm text-muted-foreground">Loading case...</p>}
      {detailQuery.isError && (
        <p className="text-sm text-destructive">
          {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load case'}
        </p>
      )}

      {detailQuery.data ? (
        <>
          <div className="rounded border p-4 text-sm">
            <div>
              <span className="font-medium">Subject:</span> {detailQuery.data.subject}
            </div>
            <div>
              <span className="font-medium">Status:</span> {detailQuery.data.status}
            </div>
            <div>
              <span className="font-medium">Priority:</span> {detailQuery.data.priority}
            </div>
            <div>
              <span className="font-medium">Loan:</span> {detailQuery.data.loanApplicationId ?? '-'}
            </div>
            <div>
              <span className="font-medium">Repayment:</span> {detailQuery.data.repaymentId ?? '-'}
            </div>
            <div>
              <span className="font-medium">Disbursement:</span> {detailQuery.data.disbursementId ?? '-'}
            </div>
            <div>
              <span className="font-medium">SLA Due:</span>{' '}
              {detailQuery.data.slaDueAt ? new Date(detailQuery.data.slaDueAt).toLocaleString() : '-'}
            </div>
          </div>

          <div className="rounded border p-4">
            <p className="mb-2 text-sm font-medium">Actions</p>
            <div className="flex flex-wrap gap-2">
              <button className="rounded border px-3 py-1 text-sm" onClick={() => assignMutation.mutate()} type="button">
                Assign to me
              </button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <select
                className="rounded border px-2 py-1 text-sm"
                onChange={(event) => setNextStatus(event.target.value as CaseStatus)}
                value={nextStatus}
              >
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="AWAITING_BORROWER">AWAITING_BORROWER</option>
                <option value="ESCALATED">ESCALATED</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
                {(role === 'OPS' || role === 'SUPER_ADMIN') ? <option value="CLOSED">CLOSED</option> : null}
              </select>
              <input
                className="rounded border px-2 py-1 text-sm"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason (optional)"
                value={reason}
              />
              <select
                className="rounded border px-2 py-1 text-sm"
                onChange={(event) => setResolutionCode(event.target.value as CaseResolutionCode | '')}
                value={resolutionCode}
              >
                <option value="">No resolution code</option>
                <option value="REFUND_ISSUED">REFUND_ISSUED</option>
                <option value="WAIVER_GRANTED">WAIVER_GRANTED</option>
                <option value="PAYMENT_REVERSED">PAYMENT_REVERSED</option>
                <option value="CORRECTION_MADE">CORRECTION_MADE</option>
                <option value="NO_ACTION_REQUIRED">NO_ACTION_REQUIRED</option>
                <option value="FRAUD_CONFIRMED">FRAUD_CONFIRMED</option>
                <option value="FRAUD_NOT_CONFIRMED">FRAUD_NOT_CONFIRMED</option>
                <option value="OTHER">OTHER</option>
              </select>
              <input
                className="rounded border px-2 py-1 text-sm"
                onChange={(event) => setResolutionNotes(event.target.value)}
                placeholder="Resolution notes"
                value={resolutionNotes}
              />
            </div>
            <button
              className="mt-2 rounded border bg-primary px-3 py-1 text-sm text-primary-foreground"
              onClick={() => transitionMutation.mutate()}
              type="button"
            >
              Transition
            </button>
          </div>

          <div className="rounded border p-4">
            <p className="mb-2 text-sm font-medium">Messages</p>
            <div className="mb-3 space-y-2">
              {detailQuery.data.messages.map((item) => (
                <div className="rounded border p-2 text-sm" key={item.id}>
                  <div className="font-medium">
                    {item.visibility} - {new Date(item.createdAt).toLocaleString()}
                  </div>
                  <div>{item.message}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded border px-2 py-1 text-sm"
                onChange={(event) => setVisibility(event.target.value as 'INTERNAL' | 'BORROWER')}
                value={visibility}
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="BORROWER">BORROWER</option>
              </select>
              <input
                className="min-w-80 rounded border px-2 py-1 text-sm"
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Add note"
                value={message}
              />
              <button
                className="rounded border px-3 py-1 text-sm"
                disabled={!message.trim()}
                onClick={() => messageMutation.mutate()}
                type="button"
              >
                Add message
              </button>
            </div>
          </div>

          <div className="rounded border p-4">
            <p className="mb-2 text-sm font-medium">Status timeline</p>
            <div className="space-y-2 text-sm">
              {detailQuery.data.history.map((item) => (
                <div className="rounded border p-2" key={item.id}>
                  <div className="font-medium">
                    {item.fromStatus ?? 'START'} {'->'} {item.toStatus}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                  {item.reason ? <div className="text-xs">{item.reason}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

