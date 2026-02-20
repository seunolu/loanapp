import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { JobStatus, JobType } from '@prisma/client';
import { JobQueueService, calculateBackoffMs } from './job-queue.service';

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
  const service = new JobQueueService(prisma as any, undefined);
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
        }
      })
  };
  const service = new JobQueueService(prisma as any, undefined);
  await service.markFailed('job-1', 'worker-1', 'boom');
  assert.equal(updatedStatus, JobStatus.DEAD_LETTER);
  assert.equal(dlqCreated, true);
});

