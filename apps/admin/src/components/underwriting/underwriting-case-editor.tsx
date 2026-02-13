'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type {
  UnderwritingCaseDetail,
  UnderwritingChecklistItem,
  UnderwritingChecklistStatus
} from '@/src/features/underwriting/api';

const detailsSchema = z.object({
  monthlyIncomeKobo: z.string().optional(),
  existingDebtKobo: z.string().optional(),
  riskLevel: z.string().max(50).optional(),
  decisionNotes: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'])
});

type DetailsFormValues = z.infer<typeof detailsSchema>;

type EditableChecklistItem = {
  code: string;
  label: string;
  status: UnderwritingChecklistStatus;
  isRequired: boolean;
  notes: string;
};

function toEditableChecklist(items: UnderwritingChecklistItem[]): EditableChecklistItem[] {
  return items.map((item) => ({
    code: item.code,
    label: item.label,
    status: item.status,
    isRequired: item.isRequired,
    notes: item.notes ?? ''
  }));
}

export function UnderwritingCaseEditor({
  caseData,
  canEdit,
  isSavingCase,
  isSavingChecklist,
  onSaveCase,
  onSaveChecklist,
  onMarkCompleted
}: {
  caseData: UnderwritingCaseDetail;
  canEdit: boolean;
  isSavingCase: boolean;
  isSavingChecklist: boolean;
  onSaveCase: (input: {
    status?: 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';
    monthlyIncomeKobo?: number | null;
    existingDebtKobo?: number | null;
    riskLevel?: string | null;
    decisionNotes?: string | null;
  }) => Promise<void>;
  onSaveChecklist: (
    items: Array<{
      code: string;
      label: string;
      status: UnderwritingChecklistStatus;
      isRequired: boolean;
      notes?: string | null;
    }>
  ) => Promise<void>;
  onMarkCompleted: () => Promise<void>;
}) {
  const [checklistItems, setChecklistItems] = useState<EditableChecklistItem[]>(() =>
    toEditableChecklist(caseData.checklist)
  );
  const form = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      monthlyIncomeKobo: caseData.monthlyIncomeKobo != null ? String(caseData.monthlyIncomeKobo) : '',
      existingDebtKobo: caseData.existingDebtKobo != null ? String(caseData.existingDebtKobo) : '',
      riskLevel: caseData.riskLevel ?? '',
      decisionNotes: caseData.decisionNotes ?? '',
      status: caseData.status
    }
  });

  useEffect(() => {
    form.reset({
      monthlyIncomeKobo: caseData.monthlyIncomeKobo != null ? String(caseData.monthlyIncomeKobo) : '',
      existingDebtKobo: caseData.existingDebtKobo != null ? String(caseData.existingDebtKobo) : '',
      riskLevel: caseData.riskLevel ?? '',
      decisionNotes: caseData.decisionNotes ?? '',
      status: caseData.status
    });
    setChecklistItems(toEditableChecklist(caseData.checklist));
  }, [caseData, form]);

  const requiredFailedCount = useMemo(
    () => checklistItems.filter((item) => item.isRequired && item.status !== 'PASSED').length,
    [checklistItems]
  );

  const submitDetails = form.handleSubmit(async (values) => {
    try {
      await onSaveCase({
        status: values.status,
        monthlyIncomeKobo: values.monthlyIncomeKobo?.trim() ? Number(values.monthlyIncomeKobo) : null,
        existingDebtKobo: values.existingDebtKobo?.trim() ? Number(values.existingDebtKobo) : null,
        riskLevel: values.riskLevel?.trim() ? values.riskLevel.trim() : null,
        decisionNotes: values.decisionNotes?.trim() ? values.decisionNotes.trim() : null
      });
      toast.success('Underwriting case updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update case.');
    }
  });

  const submitChecklist = async () => {
    try {
      await onSaveChecklist(
        checklistItems.map((item) => ({
          code: item.code,
          label: item.label,
          status: item.status,
          isRequired: item.isRequired,
          notes: item.notes.trim() ? item.notes.trim() : null
        }))
      );
      toast.success('Checklist updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update checklist.');
    }
  };

  const completeCase = async () => {
    try {
      await onMarkCompleted();
      toast.success('Underwriting marked completed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark completed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-base font-semibold">Case Details</h2>
        <form className="space-y-4" onSubmit={submitDetails}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="monthlyIncomeKobo">
                Monthly Income (kobo)
              </label>
              <Input disabled={!canEdit} id="monthlyIncomeKobo" {...form.register('monthlyIncomeKobo')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="existingDebtKobo">
                Existing Debt (kobo)
              </label>
              <Input disabled={!canEdit} id="existingDebtKobo" {...form.register('existingDebtKobo')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="riskLevel">
                Risk Level
              </label>
              <Input disabled={!canEdit} id="riskLevel" {...form.register('riskLevel')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="status">
                Status
              </label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={!canEdit}
                id="status"
                {...form.register('status')}
              >
                <option value="PENDING">PENDING</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="decisionNotes">
              Decision Notes
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!canEdit}
              id="decisionNotes"
              {...form.register('decisionNotes')}
            />
          </div>
          {canEdit && (
            <Button disabled={isSavingCase} type="submit">
              {isSavingCase ? 'Saving...' : 'Save Case'}
            </Button>
          )}
        </form>
      </div>

      <div className="rounded-md border border-border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Checklist</h2>
          <div className="text-xs text-muted-foreground">Required not passed: {requiredFailedCount}</div>
        </div>

        <div className="space-y-3">
          {checklistItems.map((item, index) => (
            <div className="rounded-md border border-border p-3" key={item.code}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.code}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.isRequired ? 'Required' : 'Optional'}</span>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    disabled={!canEdit}
                    onChange={(event) => {
                      const next = [...checklistItems];
                      next[index] = { ...next[index], status: event.target.value as UnderwritingChecklistStatus };
                      setChecklistItems(next);
                    }}
                    value={item.status}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PASSED">PASSED</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!canEdit}
                onChange={(event) => {
                  const next = [...checklistItems];
                  next[index] = { ...next[index], notes: event.target.value };
                  setChecklistItems(next);
                }}
                placeholder="Item notes"
                value={item.notes}
              />
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button disabled={isSavingChecklist} onClick={submitChecklist} variant="outline">
              {isSavingChecklist ? 'Saving...' : 'Save Checklist'}
            </Button>
            <Button disabled={isSavingCase || isSavingChecklist} onClick={completeCase}>
              Mark Completed
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
