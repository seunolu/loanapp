import { proxyRequest } from '@/lib/api/web-client';

export type JobStatus = 'PENDING' | 'RUNNING' | 'FAILED' | 'COMPLETED' | 'DEAD';

export type JobListItem = {
  id: string;
  type: string;
  key: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  lastError: string | null;
  updatedAt?: string;
  createdAt?: string;
};

export type JobListResponse = {
  items: JobListItem[];
  nextCursor: string | null;
};

export async function fetchJobs(params: {
  limit: number;
  cursor?: string;
  status?: JobStatus;
  type?: string;
}): Promise<JobListResponse> {
  const search = new URLSearchParams({ limit: String(params.limit) });
  if (params.cursor) {
    search.set('cursor', params.cursor);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.type) {
    search.set('type', params.type);
  }
  return (await proxyRequest(`admin/jobs?${search.toString()}`)) as JobListResponse;
}

export async function retryJob(jobId: string): Promise<unknown> {
  return proxyRequest(`admin/jobs/${jobId}/retry`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}
