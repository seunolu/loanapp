'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchUnderwritingCase,
  updateUnderwritingCase,
  upsertUnderwritingChecklist,
  type UnderwritingCaseStatus
} from '@/src/features/underwriting/api';

type CaseUpdateInput = {
  status?: UnderwritingCaseStatus;
  monthlyIncomeKobo?: number | null;
  existingDebtKobo?: number | null;
  riskLevel?: string | null;
  decisionNotes?: string | null;
};

type ChecklistInputItem = {
  code: string;
  label: string;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  isRequired: boolean;
  notes?: string | null;
};

export function useUnderwritingCase(applicationId: string) {
  const queryClient = useQueryClient();

  const caseQuery = useQuery({
    queryKey: ['underwriting-case', applicationId],
    queryFn: () => fetchUnderwritingCase(applicationId),
    enabled: Boolean(applicationId)
  });

  const updateMutation = useMutation({
    mutationFn: (input: CaseUpdateInput) => updateUnderwritingCase(applicationId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['underwriting-case', applicationId] });
      await queryClient.invalidateQueries({ queryKey: ['underwriting-cases'] });
    }
  });

  const checklistMutation = useMutation({
    mutationFn: (items: ChecklistInputItem[]) => upsertUnderwritingChecklist(applicationId, items),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['underwriting-case', applicationId] });
      await queryClient.invalidateQueries({ queryKey: ['underwriting-cases'] });
    }
  });

  return {
    caseQuery,
    updateMutation,
    checklistMutation
  };
}
