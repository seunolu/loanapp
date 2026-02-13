'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { useAuth } from '@/components/auth/auth-context';
import { ApplicationDetailPanel } from '@/src/components/applications/application-detail';
import { useApplicationDetail } from '@/src/features/applications/hooks/use-application-detail';
import { hasPermission } from '@/lib/auth/permissions';

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const { auth } = useAuth();
  const canApprove = hasPermission(auth.permissions, 'LOANS_APPROVE');
  const canReject = hasPermission(auth.permissions, 'LOANS_REJECT');
  const { detailQuery, previewMutation, approveMutation, rejectMutation } = useApplicationDetail(params.id);

  return (
    <RequirePermission permission="LOANS_VIEW">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Application Decision</h1>
          <p className="text-sm text-muted-foreground">{params.id}</p>
        </div>

        {detailQuery.isLoading && <div className="text-sm text-muted-foreground">Loading application...</div>}
        {detailQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load application details.
          </div>
        )}

        {detailQuery.data && (
          <ApplicationDetailPanel
            canApprove={canApprove}
            canReject={canReject}
            detail={detailQuery.data}
            isApproving={approveMutation.isPending}
            isPreviewing={previewMutation.isPending}
            isRejecting={rejectMutation.isPending}
            onApprove={async () => {
              await approveMutation.mutateAsync();
            }}
            onPreview={async () => {
              await previewMutation.mutateAsync();
            }}
            onReject={async (reason) => {
              await rejectMutation.mutateAsync(reason);
            }}
            preview={previewMutation.data ?? null}
          />
        )}
      </div>
    </RequirePermission>
  );
}
