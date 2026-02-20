import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdminJobsService } from './admin-jobs.service';

test('admin retry job retries only tenant-owned job', async () => {
  const jobsService = {
    retryJob: async () => ({
      id: 'job-1',
      type: 'SEND_NOTIFICATION',
      status: 'PENDING',
      tenantId: 'tenant-1',
      lenderId: null,
      dedupeKey: null,
      payload: {},
      attempts: 0,
      maxAttempts: 3,
      runAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
      succeededAt: null,
      failedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  };
  const prisma = {
    job: {
      findFirst: async ({ where }: any) =>
        where.id === 'job-1' && where.tenantId === 'tenant-1' ? { id: 'job-1' } : null
    }
  };
  const service = new AdminJobsService(jobsService as any, prisma as any);
  const result = await service.retryJob({ tenantId: 'tenant-1' } as any, 'job-1');
  assert.equal(result.id, 'job-1');
  assert.equal(result.status, 'PENDING');
});

