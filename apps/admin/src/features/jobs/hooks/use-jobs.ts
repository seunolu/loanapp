'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, retryJob, type JobStatus } from '@/src/features/jobs/api';

export function useJobs(params: { limit: number; cursor?: string; status?: JobStatus; type?: string }) {
  const queryClient = useQueryClient();

  const jobsQuery = useQuery({
    queryKey: ['jobs', params.limit, params.cursor ?? '', params.status ?? '', params.type ?? ''],
    queryFn: () => fetchJobs(params),
    keepPreviousData: true
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => retryJob(jobId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  return {
    jobsQuery,
    retryMutation
  };
}
