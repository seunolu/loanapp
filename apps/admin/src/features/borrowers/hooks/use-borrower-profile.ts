'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBorrowerNote,
  fetchBorrower,
  fetchBorrowerRisk,
  upsertBorrowerOverride
} from '@/src/features/borrowers/api';

export function useBorrowerProfile(id: string) {
  const queryClient = useQueryClient();

  const borrowerQuery = useQuery({
    queryKey: ['borrower', id],
    queryFn: () => fetchBorrower(id),
    enabled: Boolean(id)
  });

  const riskQuery = useQuery({
    queryKey: ['borrower-risk', id],
    queryFn: () => fetchBorrowerRisk(id),
    enabled: Boolean(id)
  });

  const noteMutation = useMutation({
    mutationFn: (note: string) => createBorrowerNote(id, note),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['borrower', id] });
    }
  });

  const overrideMutation = useMutation({
    mutationFn: (input: { maxLoanKobo?: number; maxTenorDays?: number }) =>
      upsertBorrowerOverride(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['borrower', id] });
    }
  });

  return {
    borrowerQuery,
    riskQuery,
    noteMutation,
    overrideMutation
  };
}
