import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { computeDecisionFromInputs, LoanDecisionOrchestratorService } from './loan-decision-orchestrator.service';

test('decision logic: approve path', () => {
  const result = computeDecisionFromInputs({
    riskScore: 760,
    manualReviewMin: 550,
    approveThreshold: 700,
    exposure: new Prisma.Decimal(1000),
    maxExposure: new Prisma.Decimal(5000),
    holdCodes: [],
    hardBlockFlags: ['FRAUD_SUSPECTED']
  });
  assert.equal(result.decision, 'APPROVE');
  assert.ok(result.reasonCodes.includes('RISK_SCORE_ABOVE_APPROVE_THRESHOLD'));
});

test('decision logic: manual review path', () => {
  const result = computeDecisionFromInputs({
    riskScore: 620,
    manualReviewMin: 550,
    approveThreshold: 700,
    exposure: new Prisma.Decimal(1000),
    maxExposure: new Prisma.Decimal(5000),
    holdCodes: [],
    hardBlockFlags: []
  });
  assert.equal(result.decision, 'MANUAL_REVIEW');
});

test('decision logic: decline path (hard block)', () => {
  const result = computeDecisionFromInputs({
    riskScore: 750,
    manualReviewMin: 550,
    approveThreshold: 700,
    exposure: new Prisma.Decimal(1000),
    maxExposure: new Prisma.Decimal(5000),
    holdCodes: ['FRAUD_SUSPECTED'],
    hardBlockFlags: ['FRAUD_SUSPECTED']
  });
  assert.equal(result.decision, 'DECLINE');
  assert.ok(result.reasonCodes.includes('HARD_BLOCK_FLAG'));
});

test('idempotency: non-submitted status returns latest event and no new create', async () => {
  let createCount = 0;
  const svc = new LoanDecisionOrchestratorService({
    $transaction: async (fn: (tx: any) => Promise<any>) =>
      fn({
        tenantLoanApplication: {
          findFirst: async () => ({
            id: 'loan_1',
            tenantId: 'tenant_1',
            status: TenantLoanApplicationStatus.DISBURSED,
            phone: '234',
            amount: 1000,
            tenorMonths: 3
          })
        },
        loanDecisionEvent: {
          findFirst: async () => ({
            id: 'evt_1',
            decision: 'APPROVE',
            reasonCodes: ['RISK_SCORE_ABOVE_APPROVE_THRESHOLD']
          }),
          create: async () => {
            createCount += 1;
            return { id: 'evt_new' };
          }
        },
        loanDecisionPolicy: {
          findFirst: async () => ({
            id: 'pol_1',
            approveThreshold: 700,
            manualReviewMin: 550,
            maxExposure: new Prisma.Decimal(1000000),
            hardBlockFlags: [],
            allowUnderReviewReeval: false
          })
        }
      })
  } as any, { isEnabled: async () => true } as any);

  const result = await svc.decideAndTransition({
    tenantId: 'tenant_1',
    loanApplicationId: 'loan_1',
    actor: { type: 'ADMIN', actorId: 'a1', role: 'SUPER_ADMIN' }
  });

  assert.equal(result.eventId, 'evt_1');
  assert.equal(result.transitionedTo, TenantLoanApplicationStatus.DISBURSED);
  assert.equal(createCount, 0);
});

test('fraud overrides risk and forces decline to REJECTED', async () => {
  const svc = new LoanDecisionOrchestratorService(
    {
      $transaction: async (fn: (tx: any) => Promise<any>) =>
        fn({
          tenantLoanApplication: {
            findFirst: async () => ({
              id: 'loan_1',
              tenantId: 'tenant_1',
              status: TenantLoanApplicationStatus.SUBMITTED,
              phone: '234',
              amount: 1000,
              tenorMonths: 3
            }),
            aggregate: async () => ({ _sum: { outstandingPrincipal: new Prisma.Decimal(0) } }),
            update: async () => null
          },
          loanDecisionEvent: {
            findFirst: async () => null,
            create: async () => ({ id: 'evt_2' })
          },
          loanDecisionPolicy: {
            findFirst: async () => ({
              id: 'pol_1',
              approveThreshold: 700,
              manualReviewMin: 550,
              maxExposure: new Prisma.Decimal(1000000),
              hardBlockFlags: [],
              allowUnderReviewReeval: false
            })
          },
          riskEvaluation: {
            findFirst: async () => ({
              score: 900,
              decision: 'APPROVE',
              trigger: 'MANUAL_ADMIN',
              createdAt: new Date()
            })
          },
          loanApplicationHold: {
            findMany: async () => []
          },
          loanApplicationStatusHistory: {
            create: async () => null
          }
        })
    } as any,
    { isEnabled: async () => true } as any,
    {
      evaluateApplication: async () => ({
        blocked: true,
        severity: ['BLACKLIST_MATCH'],
        signals: [
          {
            signalType: 'BLACKLIST_MATCH',
            severity: 'CRITICAL',
            metadata: {}
          }
        ]
      })
    } as any
  );

  const result = await svc.decideAndTransition({
    tenantId: 'tenant_1',
    loanApplicationId: 'loan_1',
    actor: { type: 'ADMIN', actorId: 'a1', role: 'CREDIT_OFFICER' }
  });

  assert.equal(result.decision, 'DECLINE');
  assert.equal(result.transitionedTo, TenantLoanApplicationStatus.REJECTED);
  assert.ok(result.reasonCodes.includes('FRAUD_BLOCK'));
});
