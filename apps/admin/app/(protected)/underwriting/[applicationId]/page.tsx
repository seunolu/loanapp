'use client';

import { RequirePermission } from '@/components/auth/require-permission';
import { useAuth } from '@/components/auth/auth-context';
import { UnderwritingCaseEditor } from '@/src/components/underwriting/underwriting-case-editor';
import { useUnderwritingCase } from '@/src/features/underwriting/hooks/use-underwriting-case';
import { hasPermission } from '@/lib/auth/permissions';

export default function UnderwritingCasePage({ params }: { params: { applicationId: string } }) {
  const { auth } = useAuth();
  const canEdit = hasPermission(auth.permissions, 'UNDERWRITING_EDIT');
  const { caseQuery, updateMutation, checklistMutation } = useUnderwritingCase(params.applicationId);

  return (
    <RequirePermission permission="UNDERWRITING_VIEW">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Underwriting Case</h1>
          <p className="text-sm text-muted-foreground">{params.applicationId}</p>
        </div>

        {caseQuery.isLoading && <div className="text-sm text-muted-foreground">Loading case...</div>}
        {caseQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load underwriting case.
          </div>
        )}

        {caseQuery.data && (
          <UnderwritingCaseEditor
            canEdit={canEdit}
            caseData={caseQuery.data}
            isSavingCase={updateMutation.isPending}
            isSavingChecklist={checklistMutation.isPending}
            onMarkCompleted={async () => {
              await updateMutation.mutateAsync({ status: 'COMPLETED' });
            }}
            onSaveCase={async (input) => {
              await updateMutation.mutateAsync(input);
            }}
            onSaveChecklist={async (items) => {
              await checklistMutation.mutateAsync(items);
            }}
          />
        )}
      </div>
    </RequirePermission>
  );
}
