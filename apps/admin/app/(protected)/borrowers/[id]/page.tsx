'use client';

import { useMemo, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { Button } from '@/components/ui/button';
import { BorrowerNotesTab } from '@/src/components/borrowers/notes-tab';
import { BorrowerOverviewTab } from '@/src/components/borrowers/overview-tab';
import { BorrowerOverridesTab } from '@/src/components/borrowers/overrides-tab';
import { BorrowerRiskTab } from '@/src/components/borrowers/risk-tab';
import { useBorrowerProfile } from '@/src/features/borrowers/hooks/use-borrower-profile';

type TabKey = 'overview' | 'notes' | 'overrides' | 'risk';

export default function BorrowerProfilePage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<TabKey>('overview');
  const { borrowerQuery, riskQuery, noteMutation, overrideMutation } = useBorrowerProfile(params.id);

  const availableTabs = useMemo(
    () =>
      [
        { key: 'overview' as const, label: 'Overview' },
        { key: 'notes' as const, label: 'Notes', permission: 'BORROWERS_NOTE' as const },
        { key: 'overrides' as const, label: 'Overrides', permission: 'BORROWERS_OVERRIDE' as const },
        { key: 'risk' as const, label: 'Risk', permission: 'RISK_VIEW' as const }
      ],
    []
  );

  return (
    <RequirePermission permission="BORROWERS_VIEW">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Borrower Profile</h1>
          <p className="text-sm text-muted-foreground">{params.id}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableTabs.map((item) =>
            item.permission ? (
              <RequirePermission
                fallback={null}
                key={item.key}
                permission={item.permission}
              >
                <Button onClick={() => setTab(item.key)} size="sm" variant={tab === item.key ? 'default' : 'outline'}>
                  {item.label}
                </Button>
              </RequirePermission>
            ) : (
              <Button key={item.key} onClick={() => setTab(item.key)} size="sm" variant={tab === item.key ? 'default' : 'outline'}>
                {item.label}
              </Button>
            )
          )}
        </div>

        {borrowerQuery.isLoading && <div className="text-sm text-muted-foreground">Loading borrower...</div>}
        {borrowerQuery.isError && (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            Failed to load borrower profile.
          </div>
        )}

        {borrowerQuery.data && tab === 'overview' && <BorrowerOverviewTab borrower={borrowerQuery.data} />}

        {borrowerQuery.data && tab === 'notes' && (
          <RequirePermission permission="BORROWERS_NOTE">
            <BorrowerNotesTab
              borrower={borrowerQuery.data}
              isSaving={noteMutation.isPending}
              onAddNote={async (note) => noteMutation.mutateAsync(note).then(() => undefined)}
            />
          </RequirePermission>
        )}

        {borrowerQuery.data && tab === 'overrides' && (
          <RequirePermission permission="BORROWERS_OVERRIDE">
            <BorrowerOverridesTab
              borrower={borrowerQuery.data}
              isSaving={overrideMutation.isPending}
              onSave={async (payload) => overrideMutation.mutateAsync(payload).then(() => undefined)}
            />
          </RequirePermission>
        )}

        {tab === 'risk' && (
          <RequirePermission permission="RISK_VIEW">
            {riskQuery.isLoading && <div className="text-sm text-muted-foreground">Loading risk profile...</div>}
            {riskQuery.isError && (
              <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
                Failed to load risk profile.
              </div>
            )}
            {!riskQuery.isLoading && !riskQuery.isError && <BorrowerRiskTab risk={riskQuery.data} />}
          </RequirePermission>
        )}
      </div>
    </RequirePermission>
  );
}
