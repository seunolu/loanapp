import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { WebhookEventStatus } from '@prisma/client';
import { WebhookProcessorService } from './webhook-processor.service';

function createService(overrides?: {
  prisma?: Record<string, unknown>;
  paymentIntentsService?: Record<string, unknown>;
  gateway?: Record<string, unknown>;
}) {
  const prisma = {
    webhookEvent: {
      findUnique: async () => null,
      update: async () => null
    },
    paymentEvent: {
      create: async () => null
    },
    payoutIntent: {
      findFirst: async () => null,
      findUnique: async () => null
    },
    paymentIntent: {
      findFirst: async () => null
    },
    ...(overrides?.prisma ?? {})
  } as any;

  const jobQueueService = { enqueueJob: async () => null } as any;
  const paymentIntentsService = {
    verifyByReference: async () => null,
    verifyPayoutByReference: async () => null,
    ...(overrides?.paymentIntentsService ?? {})
  } as any;
  const notificationsService = {
    sendRepaymentReceipt: async () => null,
    sendPaymentFailed: async () => null,
    sendDisbursementNotice: async () => null
  } as any;
  const mandatesService = {
    activateMandateFromWebhook: async () => null,
    syncDebitStatusFromPaymentIntent: async () => null
  } as any;
  const idempotencyService = {
    record: async () => true
  } as any;
  const webhookVerifyService = {
    verifyPaystackOrThrow: async () => undefined
  } as any;
  const redisLockService = {
    acquireLock: async () => ({ release: async () => null })
  } as any;
  const gateway = {
    verifyWebhookSignature: () => true,
    normalizeWebhook: () => ({ type: 'PAYMENT_SUCCEEDED', providerEventId: 'evt_1', reference: 'ref_1', raw: {} }),
    ...(overrides?.gateway ?? {})
  } as any;

  return new WebhookProcessorService(
    prisma,
    jobQueueService,
    paymentIntentsService,
    mandatesService,
    notificationsService,
    webhookVerifyService,
    idempotencyService,
    redisLockService,
    gateway
  );
}

test('processWebhookEvent is idempotent for already processed events', async () => {
  let verifyCalls = 0;
  const service = createService({
    prisma: {
      webhookEvent: {
        findUnique: async () => ({
          id: 'wh_1',
          status: WebhookEventStatus.PROCESSED,
          signatureValid: true,
          payload: {}
        }),
        update: async () => null
      }
    },
    paymentIntentsService: {
      verifyByReference: async () => {
        verifyCalls += 1;
        return null;
      }
    }
  });

  await service.processWebhookEvent('wh_1');
  assert.equal(verifyCalls, 0);
});

test('receivePaystackWebhook deduplicates by provider event id', async () => {
  let enqueueCalls = 0;
  const service = createService({
    prisma: {
      webhookEvent: {
        findFirst: async ({ where }: any) => {
          if (where?.providerEventId === 'evt_dup') {
            return { id: 'wh_existing', status: WebhookEventStatus.PROCESSED };
          }
          return null;
        },
        create: async () => ({ id: 'wh_new' }),
        update: async () => null
      }
    },
    gateway: {
      verifyWebhookSignature: () => true,
      normalizeWebhook: () => ({
        type: 'PAYMENT_SUCCEEDED',
        providerEventId: 'evt_dup',
        reference: 'ref_1',
        raw: {}
      })
    }
  });

  (service as any).jobQueueService = {
    enqueueJob: async () => {
      enqueueCalls += 1;
    }
  };

  const result = await service.receivePaystackWebhook({
    headers: { 'x-paystack-signature': 'sig' },
    rawBody: Buffer.from('{}'),
    body: { event: 'charge.success' },
    requestId: 'req_1'
  } as any);

  assert.deepEqual(result, { ok: true, status: 'IGNORED' });
  assert.equal(enqueueCalls, 0);
});
