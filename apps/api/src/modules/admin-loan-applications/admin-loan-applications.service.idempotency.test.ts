import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';

test('disburse idempotency returns existing result when key is reused for same loan', async () => {
  let created = 0;
  const prisma = {
    $transaction: async (cb: (tx: any) => Promise<void>) => {
      const tx = {
        tenantDisbursement: {
          findUnique: async () => ({
            id: 'disb_1',
            tenantId: 'tenant_1',
            loanApplicationId: 'app_1',
            idempotencyKey: 'idem-1'
          }),
          create: async () => {
            created += 1;
            return {};
          }
        }
      };
      return cb(tx);
    }
  };

  const service = new AdminLoanApplicationsService(
    prisma as any,
    { postEntry: async () => ({ id: 'entry_1', reused: false }) } as any,
    {} as any,
    {} as any,
    { findOne: async () => ({ id: 'app_1' }) } as any,
    {} as any,
    { lockLoanApplication: async () => undefined } as any,
    { withIdempotency: async ({ fn }: { fn: (tx: any) => Promise<any> }) => prisma.$transaction(fn) } as any,
    { postRepayment: async () => ({}) } as any,
    { recalcLoanDelinquency: async () => ({}) } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { assertBorrowerNotRestricted: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    { isEnabled: async () => true } as any,
    {} as any,
    {} as any,
    { assertLoanInvariants: async () => undefined } as any,
    { deployToLoan: async () => ({ allocationId: 'alloc_1', poolId: 'pool_1' }) } as any,
    {} as any
  );

  await service.disburse(
    { adminId: 'admin_1', tenantId: 'tenant_1', email: 'ops@example.com', role: 'OPS' } as any,
    'app_1',
    { amount: 100, method: 'BANK_TRANSFER', idempotencyKey: 'idem-1' }
  );

  assert.equal(created, 0);
});

test('disburse idempotency throws conflict when key is reused for different loan', async () => {
  const prisma = {
    $transaction: async (cb: (tx: any) => Promise<void>) => {
      const tx = {
        tenantDisbursement: {
          findUnique: async () => ({
            id: 'disb_1',
            tenantId: 'tenant_1',
            loanApplicationId: 'another_app',
            idempotencyKey: 'idem-1'
          })
        }
      };
      return cb(tx);
    }
  };

  const service = new AdminLoanApplicationsService(
    prisma as any,
    { postEntry: async () => ({ id: 'entry_1', reused: false }) } as any,
    {} as any,
    {} as any,
    { findOne: async () => ({ id: 'app_1' }) } as any,
    {} as any,
    { lockLoanApplication: async () => undefined } as any,
    { withIdempotency: async ({ fn }: { fn: (tx: any) => Promise<any> }) => prisma.$transaction(fn) } as any,
    { postRepayment: async () => ({}) } as any,
    { recalcLoanDelinquency: async () => ({}) } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { assertBorrowerNotRestricted: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    { isEnabled: async () => true } as any,
    {} as any,
    {} as any,
    { assertLoanInvariants: async () => undefined } as any,
    { deployToLoan: async () => ({ allocationId: 'alloc_1', poolId: 'pool_1' }) } as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.disburse(
        { adminId: 'admin_1', tenantId: 'tenant_1', email: 'ops@example.com', role: 'OPS' } as any,
        'app_1',
        { amount: 100, method: 'BANK_TRANSFER', idempotencyKey: 'idem-1' }
      ),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      return true;
    }
  );
});
