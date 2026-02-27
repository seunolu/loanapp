import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { LoanApplicationsService } from './loan-applications.service';
import { TenantLoanApplicationStatus } from '@prisma/client';

function createServiceHarness() {
  const outboxCalls: Array<any> = [];
  const tx = {
    tenantLoanApplication: {
      findFirst: async () => ({
        id: 'loan-1',
        tenantId: 'tenant-1',
        status: TenantLoanApplicationStatus.SUBMITTED,
        phone: '08000000000',
        outstandingPrincipal: 0,
        outstandingInterest: 0,
        outstandingFees: 0,
        outstandingTotal: 0,
        currency: 'NGN'
      }),
      update: async () => ({})
    },
    loanApplicationStatusHistory: {
      create: async () => ({ id: 'hist-1' })
    },
    tenantAdminUser: {
      findMany: async () => []
    }
  };
  const prisma = {
    $transaction: async (fn: any) => fn(tx)
  };

  const service = new LoanApplicationsService(
    prisma as any,
    { requireResolvedTenantId: async () => 'tenant-1' } as any,
    {} as any,
    { logTransition: async () => undefined, recordEvent: async () => undefined } as any,
    {} as any,
    { getBalances: async () => ({ totalOutstanding: { eq: () => true }, principalOutstanding: 0, interestOutstanding: 0, feesOutstanding: 0 }) } as any,
    {} as any,
    {
      getRiskSnapshot: async () => ({ assessment: { decision: 'APPROVE' }, overrideEnabled: true }),
      listActiveHolds: async () => [],
      evaluateAndPersist: async () => ({ assessment: { decision: 'APPROVE' } })
    } as any,
    { incrementBehaviorSnapshot: async () => undefined, hasOpenAlertAtOrAbove: async () => false } as any,
    { assertBorrowerNotRestricted: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    { publishLoanStatusChanged: async () => undefined } as any,
    { get: () => ({ requestId: 'req-1', actorId: 'admin-1' }) } as any,
    { applyWriteOff: async () => undefined } as any,
    {
      writeOutboxEvent: async (_tx: any, event: any) => {
        outboxCalls.push(event);
      }
    } as any,
    { incrementLoanTransition: () => undefined } as any
  );

  (service as any).findOne = async () => ({ id: 'loan-1' });
  return { service, outboxCalls };
}

test('transitionStatus writes outbox event for status transition', async () => {
  const { service, outboxCalls } = createServiceHarness();
  await service.transitionStatus(
    'tenant-1',
    'loan-1',
    TenantLoanApplicationStatus.UNDER_REVIEW,
    'CREDIT_OFFICER' as any,
    'manual review',
    'admin-1'
  );

  assert.equal(outboxCalls.length, 1);
  assert.equal(outboxCalls[0].eventType, 'loan_application.status_transitioned');
  assert.equal(outboxCalls[0].aggregateId, 'loan-1');
});
