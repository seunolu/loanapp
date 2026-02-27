import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { JobStatus, JobType } from '@prisma/client';
import { JobQueueService, calculateBackoffMs } from './job-queue.service';

const configService = {
  get: (key: string) => {
    if (key === 'JOB_MAX_ATTEMPTS') return 5;
    if (key === 'JOB_BACKOFF_MS') return 30000;
    if (key === 'JOB_DLQ_ENABLED') return true;
    return undefined;
  }
} as any;

test('calculateBackoffMs applies exponential backoff with bounded jitter', () => {
  const v1 = calculateBackoffMs({ attempts: 1, baseMs: 2000, capMs: 600000, jitterRatio: 0.2, random: () => 0 });
  const v2 = calculateBackoffMs({ attempts: 2, baseMs: 2000, capMs: 600000, jitterRatio: 0.2, random: () => 1 });
  assert.equal(v1, 2000);
  assert.ok(v2 >= 4000);
  assert.ok(v2 <= 4800);
});

test('markFailed schedules retry when attempts not exhausted', async () => {
  let updatedStatus: JobStatus | null = null;
  const prisma = {
    $transaction: async (fn: any) =>
      fn({
        $queryRaw: async () => [
          {
            id: 'job-1',
            type: JobType.SEND_NOTIFICATION,
            tenantId: 'tenant-1',
            attempts: 0,
            maxAttempts: 3,
            backoffMs: 2000,
            payload: {}
          }
        ],
        job: {
          update: async ({ data }: any) => {
            updatedStatus = data.status;
          }
        }
      })
  };
  const service = new JobQueueService(prisma as any, configService, undefined);
  await service.markFailed('job-1', 'worker-1', 'boom');
  assert.equal(updatedStatus, JobStatus.PENDING);
});

test('markFailed moves to dead letter and writes JobDlq when exhausted', async () => {
  let updatedStatus: JobStatus | null = null;
  let dlqCreated = false;
  const prisma = {
    $transaction: async (fn: any) =>
      fn({
        $queryRaw: async () => [
          {
            id: 'job-1',
            type: JobType.SEND_NOTIFICATION,
            tenantId: 'tenant-1',
            attempts: 2,
            maxAttempts: 3,
            backoffMs: 2000,
            payload: {}
          }
        ],
        job: {
          update: async ({ data }: any) => {
            updatedStatus = data.status;
          }
        },
        jobDlq: {
          create: async () => {
            dlqCreated = true;
          }
        },
        auditLog: {
          create: async () => null
        }
      })
  };
  const service = new JobQueueService(prisma as any, configService, undefined);
  await service.markFailed('job-1', 'worker-1', 'boom');
  assert.equal(updatedStatus, JobStatus.DEAD_LETTER);
  assert.equal(dlqCreated, true);
});

test('markFailed skips JobDlq writes when JOB_DLQ_ENABLED is false', async () => {
  let dlqCreated = false;
  const prisma = {
    $transaction: async (fn: any) =>
      fn({
        $queryRaw: async () => [
          {
            id: 'job-1',
            type: JobType.SEND_NOTIFICATION,
            tenantId: 'tenant-1',
            attempts: 2,
            maxAttempts: 3,
            backoffMs: 2000,
            payload: { requestId: 'req-1' }
          }
        ],
        job: {
          update: async () => null
        },
        auditLog: {
          create: async () => null
        },
        jobDlq: {
          create: async () => {
            dlqCreated = true;
          }
        }
      })
  };
  const service = new JobQueueService(
    prisma as any,
    { get: (key: string) => (key === 'JOB_DLQ_ENABLED' ? false : key === 'JOB_BACKOFF_MS' ? 30000 : 5) } as any,
    undefined
  );
  await service.markFailed('job-1', 'worker-1', 'boom');
  assert.equal(dlqCreated, false);
});
