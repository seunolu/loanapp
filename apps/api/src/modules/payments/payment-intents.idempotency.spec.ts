import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { PaymentDirection, PaymentIntentStatus, PaymentProvider } from '@prisma/client';
import { PaymentIntentsService } from './payment-intents.service';

function buildService(overrides?: {
  prisma?: Record<string, unknown>;
  gateway?: Record<string, unknown>;
}) {
  const prisma = {
    paymentIntent: {
      findFirst: async () => null,
      findUniqueOrThrow: async () => null
    },
    payoutIntent: {
      findFirst: async () => null
    },
    $transaction: async () => null,
    ...(overrides?.prisma ?? {})
  };

  const gateway = {
    verifyWebhookSignature: () => true,
    normalizeWebhook: () => ({ type: 'IGNORED', providerEventId: null, raw: {} }),
    verifyTransaction: async () => ({ status: 'PENDING', providerReference: 'ref-1', raw: {} }),
    verifyTransfer: async () => ({ status: 'PENDING', reference: 'ref-1', raw: {} }),
    ...(overrides?.gateway ?? {})
  };

  const auditService = {} as any;
  const tenantLedgerService = {} as any;
  const financialInvariantsService = { assertLoanInvariants: async () => undefined } as any;
  const idempotencyService = { record: async () => true } as any;
  const redisLockService = { acquireLock: async () => ({ release: async () => null }) } as any;
  const promMetricsService = { incrementPaymentSuccess: () => undefined, incrementPaymentFailed: () => undefined } as any;
  const service = new PaymentIntentsService(
    prisma as any,
    gateway as any,
    auditService,
    {} as any,
    tenantLedgerService,
    financialInvariantsService,
    idempotencyService,
    redisLockService,
    promMetricsService
  );
  return { service, prisma, gateway };
}

test('handlePaystackWebhook is idempotent for already-succeeded inbound intents', async () => {
  let verifyCalls = 0;
  let transactionCalls = 0;
  const succeededIntent = {
    id: 'pi_1',
    tenantId: 'tenant_1',
    direction: PaymentDirection.INBOUND,
    provider: PaymentProvider.PAYSTACK,
    status: PaymentIntentStatus.SUCCEEDED,
    currency: 'NGN',
    amountMinor: 10000,
    feeMinor: 0,
    netMinor: 10000,
    loanId: 'loan_1',
    disbursementId: null,
    providerReference: 'ref_123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const { service } = buildService({
    prisma: {
      paymentIntent: {
        findFirst: async () => succeededIntent,
        findUniqueOrThrow: async () => succeededIntent
      },
      $transaction: async () => {
        transactionCalls += 1;
      }
    },
    gateway: {
      normalizeWebhook: () => ({
        type: 'PAYMENT_SUCCEEDED',
        providerEventId: 'evt_1',
        reference: 'ref_123',
        raw: {}
      }),
      verifyTransaction: async () => {
        verifyCalls += 1;
        return { status: 'SUCCEEDED', providerReference: 'ref_123', amountMinor: 10000, raw: {} };
      }
    }
  });

  const first = await service.handlePaystackWebhook({ event: 'charge.success' }, 'sig', '{}');
  const second = await service.handlePaystackWebhook({ event: 'charge.success' }, 'sig', '{}');

  assert.deepEqual(first, { ok: true });
  assert.deepEqual(second, { ok: true });
  assert.equal(verifyCalls, 0);
  assert.equal(transactionCalls, 0);
});

test('verifyBorrowerRepayment returns existing success without provider re-verify', async () => {
  let verifyCalls = 0;
  const succeededIntent = {
    id: 'pi_2',
    tenantId: 'tenant_2',
    direction: PaymentDirection.INBOUND,
    provider: PaymentProvider.PAYSTACK,
    status: PaymentIntentStatus.SUCCEEDED,
    currency: 'NGN',
    amountMinor: 20000,
    feeMinor: 0,
    netMinor: 20000,
    loanId: 'loan_2',
    disbursementId: null,
    providerReference: 'ref_abc',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const { service } = buildService({
    prisma: {
      paymentIntent: {
        findFirst: async () => succeededIntent,
        findUniqueOrThrow: async () => succeededIntent
      }
    },
    gateway: {
      verifyTransaction: async () => {
        verifyCalls += 1;
        return { status: 'SUCCEEDED', providerReference: 'ref_abc', amountMinor: 20000, raw: {} };
      }
    }
  });

  const response = await service.verifyBorrowerRepayment(
    {
      borrowerId: 'borrower_1',
      lenderId: 'lender_1',
      tenantId: 'tenant_2',
      phone: '08000000000',
      sessionId: 'sess_1'
    },
    'ref_abc'
  );

  assert.equal(response.id, 'pi_2');
  assert.equal(response.status, PaymentIntentStatus.SUCCEEDED);
  assert.equal(verifyCalls, 0);
});
