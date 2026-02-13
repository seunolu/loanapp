'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveApplication,
  fetchApplicationDetail,
  previewOffer,
  rejectApplication
} from '@/src/features/applications/api';

export function useApplicationDetail(applicationId: string) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['loan-application-detail', applicationId],
    queryFn: () => fetchApplicationDetail(applicationId),
    enabled: Boolean(applicationId)
  });

  const previewMutation = useMutation({
    mutationFn: () => previewOffer(applicationId)
  });

  const approveMutation = useMutation({
    mutationFn: () => approveApplication(applicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['loan-application-detail', applicationId] });
      await queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectApplication(applicationId, reason),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['loan-application-detail', applicationId] });
      await queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
    }
  });

  return {
    detailQuery,
    previewMutation,
    approveMutation,
    rejectMutation
  };
}
