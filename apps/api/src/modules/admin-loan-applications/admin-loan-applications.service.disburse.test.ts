import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantLoanApplicationStatus } from '@prisma/client';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';

function createServiceWithTransactionRow(status: TenantLoanApplicationStatus) {
  const prisma = {
    $transaction: async (cb: (tx: any) => Promise<void>) => {
      const tx = {
        tenantLoanApplication: {
          findFirst: async () => ({
            id: 'app_1',
            tenantId: 'tenant_1',
            status,
            approvedAmount: 100,
            requestedAmount: 100,
            outstandingPrincipal: 0,
            annualInterestRate: null
          }),
          update: async () => ({})
        },
        tenantDisbursement: {
          findUnique: async () => null,
          create: async () => ({
            id: 'disb_1',
            currency: 'NGN',
            disbursedAt: new Date()
          })
        },
        loanApplicationStatusHistory: {
          create: async () => ({})
        }
      };
      return cb(tx);
    }
  };

  return new AdminLoanApplicationsService(
    prisma as any,
    { postEntry: async () => ({ id: 'entry_1', reused: false }) } as any,
    {} as any,
    {} as any,
    { findOne: async () => ({ id: 'app_1' }) } as any,
    { getBalances: async () => ({}) } as any,
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
}

test('disburse forbidden for non-OPS/SUPER_ADMIN roles', async () => {
  const service = createServiceWithTransactionRow(TenantLoanApplicationStatus.APPROVED);

  await assert.rejects(
    () =>
      service.disburse(
        {
          adminId: 'admin_1',
          tenantId: 'tenant_1',
          email: 'ops@example.com',
          role: 'RISK_MANAGER'
        } as any,
        'app_1',
        { amount: 100, method: 'BANK_TRANSFER', idempotencyKey: 'idem-1' }
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match((error as Error).message, /Only OPS or SUPER_ADMIN/);
      return true;
    }
  );
});

test('disburse forbidden when loan status is not APPROVED', async () => {
  const service = createServiceWithTransactionRow(TenantLoanApplicationStatus.SUBMITTED);

  await assert.rejects(
    () =>
      service.disburse(
        {
          adminId: 'admin_1',
          tenantId: 'tenant_1',
          email: 'ops@example.com',
          role: 'OPS'
        } as any,
        'app_1',
        { amount: 100, method: 'BANK_TRANSFER', idempotencyKey: 'idem-1' }
      ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match((error as Error).message, /Only APPROVED loans can be disbursed/);
      return true;
    }
  );
});
