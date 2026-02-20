import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { OutboxDispatcherWorker } from './outbox-dispatcher.worker';

test('dispatcher publishes unpublished outbox rows to redis stream', async () => {
  const updates: Array<any> = [];
  const prisma = {
    $transaction: async (fn: any) =>
      fn({
        $queryRaw: async () => [{ id: 'evt-1' }],
        outboxEvent: {
          findMany: async () => [
            {
              id: 'evt-1',
              tenantId: 'tenant-1',
              aggregateType: 'LoanApplication',
              aggregateId: 'loan-1',
              eventType: 'loan_application.submitted',
              payload: { loanApplicationId: 'loan-1', status: 'SUBMITTED' },
              createdAt: new Date(),
              traceId: null,
              correlationId: null,
              causationId: null
            }
          ]
        }
      }),
    outboxEvent: {
      update: async (args: any) => {
        updates.push(args);
        return args;
      }
    }
  };

  const xaddCalls: Array<any[]> = [];
  const redisService = {
    getClient: () => ({
      xadd: async (...args: any[]) => {
        xaddCalls.push(args);
        return '1-0';
      }
    })
  };

  const worker = new OutboxDispatcherWorker(
    prisma as any,
    redisService as any,
    {
      get: (key: string) => {
        if (key === 'OUTBOX_STREAM') return 'loanapp:domain-events';
        if (key === 'OUTBOX_POLL_MS') return 1000;
        if (key === 'OUTBOX_BATCH_SIZE') return 50;
        if (key === 'OUTBOX_MAX_ATTEMPTS') return 25;
        return undefined;
      }
    } as any,
    {
      incrementOutboxPublished: () => undefined,
      incrementOutboxPublishFailed: () => undefined
    } as any
  );

  await (worker as any).dispatchOnce();
  assert.equal(xaddCalls.length, 1);
  assert.equal(updates.length, 1);
});

