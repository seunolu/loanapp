import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { TenantLoanApplicationStatus } from '@prisma/client';
import { defaultRiskPolicyConfig } from './risk-policy.schema';
import { computeRiskFromInput, enforceRiskGate, RiskService } from './risk.service';

test('scoring is deterministic for same input + policy', () => {
  const snapshot = {
    borrower: {
      employmentStatus: 'EMPLOYED',
      incomeBand: 'MEDIUM',
      kycLevel: 'FULL',
      hasActiveDefault: false
    },
    application: {
      requestedAmount: 200000,
      tenorDays: 90
    },
    repaymentStats: {
      onTimeRate: 0.85,
      defaultsCount: 0
    },
    derived: { hasActiveDefault: false },
    deviceRisk: { isEmulator: false }
  };
  const first = computeRiskFromInput({
    snapshot,
    config: defaultRiskPolicyConfig,
    policyMeta: { name: 'default', version: 1 }
  });
  const second = computeRiskFromInput({
    snapshot,
    config: defaultRiskPolicyConfig,
    policyMeta: { name: 'default', version: 1 }
  });

  assert.equal(first.score, second.score);
  assert.equal(first.decision, second.decision);
  assert.deepEqual(first.reasons, second.reasons);
});

test('gate logic: REVIEW blocks APPROVED and allows UNDER_REVIEW', () => {
  assert.doesNotThrow(() =>
    enforceRiskGate({
      toStatus: TenantLoanApplicationStatus.UNDER_REVIEW,
      assessment: {
        score: 650,
        decision: 'REVIEW',
        reasons: [{ code: 'SOFT', message: 'manual review' }]
      },
      activeHoldTypes: [],
      overrideEnabled: false
    })
  );

  assert.throws(
    () =>
      enforceRiskGate({
        toStatus: TenantLoanApplicationStatus.APPROVED,
        assessment: {
          score: 650,
          decision: 'REVIEW',
          reasons: [{ code: 'SOFT', message: 'manual review' }]
        },
        activeHoldTypes: [],
        overrideEnabled: false
      }),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test('rbac forbids manual evaluation for unauthorized role', async () => {
  const service = new RiskService(
    {
      $transaction: async (fn: (tx: unknown) => unknown) => fn({})
    } as any,
    { log: async () => undefined } as any,
    { get: () => ({ requestId: 'req_test', actorId: 'admin_1' }) } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any
  );

  await assert.rejects(
    () =>
      service.runManualEvaluation({
        tenantId: 'tenant_1',
        role: 'COLLECTIONS',
        loanApplicationId: 'loan_1',
        adminId: 'admin_1'
      }),
    (error: unknown) => error instanceof ForbiddenException
  );
});
