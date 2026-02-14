'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, retryJob, type JobListResponse, type JobStatus } from '@/src/features/jobs/api';

export function useJobs(params: { limit: number; cursor?: string; status?: JobStatus; type?: string }) {
  const queryClient = useQueryClient();

  const jobsQuery = useQuery<JobListResponse>({
    queryKey: ['jobs', params.limit, params.cursor ?? '', params.status ?? '', params.type ?? ''],
    queryFn: () => fetchJobs(params),
    placeholderData: (previousData) => previousData
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
