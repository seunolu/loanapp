'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { getFraudAlert, type FraudAlertStatus, updateFraudAlert } from '@/src/lib/api';
import { useAuth } from '@/src/providers/auth-provider';
import { useTenant } from '@/src/providers/tenant-provider';

type PageProps = {
  params: { id: string };
};

export default function FraudAlertDetailPage({ params }: PageProps) {
  const { token } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [resolutionNotes, setResolutionNotes] = useState('');

  const detailQuery = useQuery({
    queryKey: ['admin', 'fraud', 'alert', params.id, tenantId],
    queryFn: () => getFraudAlert(params.id),
    enabled: Boolean(token && tenantId)
  });

  const updateMutation = useMutation({
    mutationFn: async (status: Exclude<FraudAlertStatus, 'OPEN'>) =>
      updateFraudAlert(params.id, { status, resolutionNotes: resolutionNotes.trim() || undefined }),
    onSuccess: async () => {
      toast.success('Fraud alert updated');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'fraud', 'alert', params.id, tenantId] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'fraud', 'alerts', tenantId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update fraud alert')
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fraud Alert</h1>
        <Link className="text-sm underline" href="/dashboard/fraud/alerts">
          Back to alerts
        </Link>
      </div>

      {detailQuery.isLoading && <p className="text-sm text-muted-foreground">Loading alert...</p>}
      {detailQuery.isError && (
        <p className="text-sm text-destructive">
          {detailQuery.error instanceof Error ? detailQuery.error.message : 'Failed to load alert'}
        </p>
      )}

      {detailQuery.data ? (
        <>
          <div className="rounded-md border border-border p-4 text-sm">
            <div>
              <span className="font-medium">Alert ID:</span> {detailQuery.data.id}
            </div>
            <div>
              <span className="font-medium">Loan:</span> {detailQuery.data.loanApplicationId ?? '-'}
            </div>
            <div>
              <span className="font-medium">Severity:</span> {detailQuery.data.severity}
            </div>
            <div>
              <span className="font-medium">Status:</span> {detailQuery.data.status}
            </div>
            <div>
              <span className="font-medium">Created:</span> {new Date(detailQuery.data.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="mb-2 text-sm font-medium">Signals</p>
            <div className="space-y-2">
              {detailQuery.data.signals.map((signal) => (
                <div className="rounded border border-border p-2 text-sm" key={signal.id}>
                  <div className="font-medium">
                    {signal.type} ({signal.severity})
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(signal.createdAt).toLocaleString()}</div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs">
                    {JSON.stringify(signal.metadataJson, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border p-4">
            <p className="mb-2 text-sm font-medium">Actions</p>
            <textarea
              className="min-h-24 w-full rounded border p-2 text-sm"
              onChange={(event) => setResolutionNotes(event.target.value)}
              placeholder="Resolution note (optional)"
              value={resolutionNotes}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={() => updateMutation.mutate('INVESTIGATING')}
                type="button"
              >
                Mark Investigating
              </button>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={() => updateMutation.mutate('ESCALATED')}
                type="button"
              >
                Escalate
              </button>
              <button
                className="rounded border px-3 py-1 text-sm"
                onClick={() => updateMutation.mutate('FALSE_POSITIVE')}
                type="button"
              >
                False Positive
              </button>
              <button
                className="rounded border bg-primary px-3 py-1 text-sm text-primary-foreground"
                onClick={() => updateMutation.mutate('RESOLVED')}
                type="button"
              >
                Resolve
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

