'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BorrowerDetail } from '@/src/features/borrowers/api';

export function BorrowerOverridesTab({
  borrower,
  onSave,
  isSaving
}: {
  borrower: BorrowerDetail;
  onSave: (input: { maxLoanKobo?: number; maxTenorDays?: number }) => Promise<void>;
  isSaving: boolean;
}) {
  const [maxLoanKobo, setMaxLoanKobo] = useState(
    borrower.override?.maxLoanKobo != null ? String(borrower.override.maxLoanKobo) : ''
  );
  const [maxTenorDays, setMaxTenorDays] = useState(
    borrower.override?.maxTenorDays != null ? String(borrower.override.maxTenorDays) : ''
  );

  const submit = async () => {
    const payload: { maxLoanKobo?: number; maxTenorDays?: number } = {};
    if (maxLoanKobo.trim()) {
      payload.maxLoanKobo = Number(maxLoanKobo);
    }
    if (maxTenorDays.trim()) {
      payload.maxTenorDays = Number(maxTenorDays);
    }

    try {
      await onSave(payload);
      toast.success('Override saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save override.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Max Loan (kobo)</label>
          <Input onChange={(event) => setMaxLoanKobo(event.target.value)} value={maxLoanKobo} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Max Tenor (days)</label>
          <Input onChange={(event) => setMaxTenorDays(event.target.value)} value={maxTenorDays} />
        </div>
      </div>
      <Button disabled={isSaving} onClick={submit}>
        {isSaving ? 'Saving...' : 'Save Override'}
      </Button>
      {borrower.override && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(borrower.override.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
