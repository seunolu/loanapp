import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { FraudEvaluatorService } from './fraud-evaluator.service';

function buildLoan(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'loan_1',
    tenantId: 'tenant_1',
    phone: '2348000000000',
    deviceId: 'device_1',
    requestedAmount: new Prisma.Decimal(1000),
    lastRiskScore: 700,
    ...overrides
  };
}

function buildService(stubs: Partial<Record<string, unknown>>) {
  const prisma = {
    tenantLoanApplication: {
      findFirst: async () => buildLoan(),
      count: async () => 0,
      findMany: async () => []
    },
    borrowerBlacklist: { findFirst: async () => null },
    borrowerBehaviorSnapshot: { findUnique: async () => null },
    loanDecisionPolicy: { findFirst: async () => null },
    fraudSignal: {
      create: async ({ data }: { data: any }) => ({
        id: `signal_${data.type}`,
        ...data,
        createdAt: new Date()
      })
    },
    fraudAlert: {
      findFirst: async () => null,
      create: async ({ data }: { data: any }) => ({ id: 'alert_1', ...data })
    },
    fraudAlertSignal: { upsert: async () => null },
    tenantAdminUser: { findMany: async () => [] },
    notification: { findUnique: async () => null, create: async () => ({ id: 'notif_1' }) },
    notificationOutbox: { upsert: async () => null }
  };
  return new FraudEvaluatorService({ ...prisma, ...stubs } as any, {
    createNotification: async () => ({ notificationId: 'notif_1', reused: false })
  } as any);
}

test('multiple applications within 24h rule fires', async () => {
  const service = buildService({
    tenantLoanApplication: {
      findFirst: async () => buildLoan(),
      count: async () => 3,
      findMany: async () => []
    }
  });

  const result = await service.evaluateApplication('loan_1', { tenantId: 'tenant_1' });
  assert.equal(result.blocked, false);
  assert.ok(result.signals.some((signal) => signal.type === 'MULTIPLE_APPLICATIONS_SHORT_WINDOW'));
});

test('blacklisted borrower blocks with critical severity', async () => {
  const service = buildService({
    borrowerBlacklist: {
      findFirst: async () => ({
        id: 'bl_1',
        tenantId: 'tenant_1',
        identifierType: 'PHONE',
        identifierValue: '2348000000000',
        reason: 'Known fraud'
      })
    }
  });

  const result = await service.evaluateApplication('loan_1', { tenantId: 'tenant_1' });
  assert.equal(result.blocked, true);
  assert.ok(result.signals.some((signal) => signal.severity === 'CRITICAL'));
});

test('no signal path returns blocked false', async () => {
  const service = buildService({
    tenantLoanApplication: {
      findFirst: async () => buildLoan({ deviceId: null, lastRiskScore: 10 }),
      count: async () => 1,
      findMany: async () => []
    }
  });

  const result = await service.evaluateApplication('loan_1', { tenantId: 'tenant_1' });
  assert.equal(result.blocked, false);
  assert.equal(result.signals.length, 0);
});

test('behavior snapshot counters increment safely', async () => {
  const updates: any[] = [];
  const service = buildService({
    borrowerBehaviorSnapshot: {
      findUnique: async () => ({
        id: 'snap_1',
        tenantId: 'tenant_1',
        borrowerId: '2348000000000',
        totalApplications: 1,
        totalApproved: 0,
        totalRejected: 0,
        totalDisbursedAmount: new Prisma.Decimal(0),
        totalRepaidAmount: new Prisma.Decimal(0),
        defaultCount: 0
      }),
      update: async ({ data }: { data: any }) => {
        updates.push(data);
        return { id: 'snap_1' };
      }
    }
  });

  await service.incrementBehaviorSnapshot({
    tenantId: 'tenant_1',
    borrowerId: '2348000000000',
    updates: { totalApplications: 1, totalRepaidAmount: 250, lastRepaymentAt: new Date() }
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].totalApplications.increment, 1);
});

