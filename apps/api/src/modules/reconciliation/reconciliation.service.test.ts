import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { ReconciliationIssueCategory, ReconciliationIssueSeverity } from '@prisma/client';
import {
  classifyAmountMismatchSeverity,
  canTransitionReconciliationStatus,
  canUpdateIssueStatus,
  ReconciliationService
} from './reconciliation.service';

test('role permissions for issue patch are enforced', async () => {
  assert.equal(canUpdateIssueStatus('CREDIT_OFFICER', 'ACKNOWLEDGED'), true);
  assert.equal(canUpdateIssueStatus('CREDIT_OFFICER', 'RESOLVED'), false);
  assert.equal(canUpdateIssueStatus('OPS', 'RESOLVED'), true);
  assert.equal(canUpdateIssueStatus('TENANT_ADMIN', 'ESCALATED'), true);

  const service = new ReconciliationService(
    {
      reconciliationIssue: {
        findFirst: async () => ({ id: 'issue_1' }),
        update: async () => ({ id: 'issue_1' })
      }
    } as any,
    { log: async () => undefined } as any,
    {} as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.updateIssue(
        { adminId: 'admin_1', email: 'c@example.com', tenantId: 't1', role: 'CREDIT_OFFICER' } as any,
        'issue_1',
        { status: 'RESOLVED' }
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});

test('upsertIssue is idempotent for same unique fingerprint', async () => {
  const calls = {
    create: 0,
    update: 0
  };
  let existing: { id: string } | null = null;

  const service = new ReconciliationService(
    {
      reconciliationIssue: {
        findUnique: async () => existing,
        create: async () => {
          calls.create += 1;
          existing = { id: 'issue_1' };
          return { id: 'issue_1' };
        },
        update: async () => {
          calls.update += 1;
          return { id: 'issue_1' };
        }
      }
    } as any,
    {} as any,
    {} as any,
    {} as any
  );

  const first = await service.upsertIssue({
    runId: 'run_1',
    tenantId: 'tenant_1',
    category: ReconciliationIssueCategory.MISSING_LEDGER,
    severity: ReconciliationIssueSeverity.HIGH,
    entityType: 'PAYMENT',
    entityId: 'entity_1',
    providerRef: 'ref_1',
    expected: { ledgerEntries: 1 },
    actual: { ledgerEntries: 0 }
  });
  const second = await service.upsertIssue({
    runId: 'run_2',
    tenantId: 'tenant_1',
    category: ReconciliationIssueCategory.MISSING_LEDGER,
    severity: ReconciliationIssueSeverity.HIGH,
    entityType: 'PAYMENT',
    entityId: 'entity_1',
    providerRef: 'ref_1',
    expected: { ledgerEntries: 1 },
    actual: { ledgerEntries: 0 }
  });

  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(calls.create, 1);
  assert.equal(calls.update, 1);
});

test('amount mismatch severity classification supports minor rounding as LOW', () => {
  assert.equal(classifyAmountMismatchSeverity(1000, 1001), 'LOW');
  assert.equal(classifyAmountMismatchSeverity(1000, 1010), 'HIGH');
});

test('missing ledger is classified as CRITICAL and supports auto-heal', async () => {
  const capturedIssues: Array<{ category: string; severity: string }> = [];
  let autoHealCalls = 0;
  const service = new ReconciliationService(
    {
      paymentIntent: {
        findMany: async () => [
          {
            id: 'pay_1',
            tenantId: 'tenant_1',
            direction: 'INBOUND',
            status: 'SUCCEEDED',
            amountMinor: 10000,
            currency: 'NGN',
            loanId: 'loan_1',
            providerReference: 'ref_1'
          }
        ],
        findUnique: async () => ({ id: 'pay_1' })
      },
      tenantLedgerEntry: {
        findMany: async () => []
      },
      loanRepayment: {
        findMany: async () => []
      },
      reconciliationIssue: {
        updateMany: async () => ({ count: 1 })
      }
    } as any,
    { log: async () => undefined } as any,
    {} as any,
    {
      postEntry: async () => {
        autoHealCalls += 1;
      }
    } as any
  );

  (service as any).upsertIssue = async (input: { category: string; severity: string }) => {
    capturedIssues.push({ category: input.category, severity: input.severity });
    return true;
  };

  const result = await (service as any).runPaymentReconciliation('tenant_1', 'run_1', {
    from: new Date('2026-02-01T00:00:00.000Z'),
    to: new Date('2026-02-02T00:00:00.000Z')
  });

  assert.equal(capturedIssues[0]?.category, 'MISSING_LEDGER');
  assert.equal(capturedIssues[0]?.severity, 'CRITICAL');
  assert.equal(autoHealCalls, 1);
  assert.equal(result.issuesResolved, 1);
});

test('amount mismatch is HIGH when delta exceeds rounding threshold', async () => {
  const capturedIssues: Array<{ category: string; severity: string }> = [];
  const service = new ReconciliationService(
    {
      paymentIntent: {
        findMany: async () => [
          {
            id: 'pay_2',
            tenantId: 'tenant_1',
            direction: 'INBOUND',
            status: 'SUCCEEDED',
            amountMinor: 10000,
            currency: 'NGN',
            loanId: 'loan_2',
            providerReference: 'ref_2'
          }
        ],
        findUnique: async () => ({ id: 'pay_2' })
      },
      tenantLedgerEntry: {
        findMany: async (args: any) => {
          if (args?.include?.lines) {
            return [
              {
                id: 'tle_1',
                lines: [
                  {
                    direction: 'DEBIT',
                    amount: '98.00'
                  }
                ]
              }
            ];
          }
          return [];
        }
      },
      loanRepayment: {
        findMany: async () => []
      },
      reconciliationIssue: {
        updateMany: async () => ({ count: 0 })
      }
    } as any,
    { log: async () => undefined } as any,
    {} as any,
    {} as any
  );

  (service as any).upsertIssue = async (input: { category: string; severity: string }) => {
    capturedIssues.push({ category: input.category, severity: input.severity });
    return true;
  };

  await (service as any).runPaymentReconciliation('tenant_1', 'run_1', {
    from: new Date('2026-02-01T00:00:00.000Z'),
    to: new Date('2026-02-02T00:00:00.000Z')
  });

  const amountIssue = capturedIssues.find((item) => item.category === 'AMOUNT_MISMATCH');
  assert.equal(amountIssue?.severity, 'HIGH');
});

test('reconciliation status transition guard enforces allowed transitions', () => {
  assert.equal(canTransitionReconciliationStatus('MISMATCH' as any, 'RESOLVED' as any), true);
  assert.equal(canTransitionReconciliationStatus('SUSPENSE' as any, 'WRITE_OFF' as any), true);
  assert.equal(canTransitionReconciliationStatus('MATCHED' as any, 'RESOLVED' as any), false);
  assert.equal(canTransitionReconciliationStatus('RESOLVED' as any, 'WRITE_OFF' as any), false);
});

test('batch close is SUPER_ADMIN only', async () => {
  const service = new ReconciliationService({} as any, {} as any, {} as any, {} as any);
  await assert.rejects(
    () =>
      service.closeSettlementBatch(
        { adminId: 'admin_1', email: 'ops@example.com', tenantId: 'tenant_1', role: 'OPS' } as any,
        'batch_1'
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});

test('write-off resolution is SUPER_ADMIN only', async () => {
  const service = new ReconciliationService(
    {
      $transaction: async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          reconciliationRecord: {
            findFirst: async () => ({
              id: 'rec_1',
              tenantId: 'tenant_1',
              status: 'MISMATCH',
              currency: 'NGN',
              amountMinor: BigInt(10000),
              settlementBatch: null
            })
          }
        })
    } as any,
    {} as any,
    {} as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.resolveRecord(
        { adminId: 'admin_1', email: 'ops@example.com', tenantId: 'tenant_1', role: 'OPS' } as any,
        'rec_1',
        { resolutionType: 'WRITE_OFF', note: 'not allowed' } as any
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});
