import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RepaymentService } from './repayment.service';

test('repayment posting blocks duplicate idempotency key', async () => {
  const service = new RepaymentService(
    {
      $transaction: async (cb: (tx: any) => Promise<any>) =>
        cb({
          tenantLoanApplication: {
            findFirst: async () => ({
              id: 'loan_1',
              tenantId: 'tenant_1',
              status: 'DISBURSED',
              currency: 'NGN'
            })
          },
          loanRepaymentScheduleItem: {
            updateMany: async () => ({ count: 0 }),
            findMany: async () => [
              {
                id: 'item_1',
                installmentNumber: 1,
                dueDate: new Date('2025-01-01T00:00:00.000Z'),
                principalDue: new Prisma.Decimal(100),
                interestDue: new Prisma.Decimal(0),
                feesDue: new Prisma.Decimal(0),
                principalPaid: new Prisma.Decimal(0),
                interestPaid: new Prisma.Decimal(0),
                feesPaid: new Prisma.Decimal(0),
                totalDue: new Prisma.Decimal(100),
                totalPaid: new Prisma.Decimal(0),
                status: 'PENDING'
              }
            ],
            update: async () => ({})
          },
          loanRepayment: {
            findUnique: async () => ({ id: 'rep_existing' })
          }
        })
    } as any,
    { postEntry: async () => ({ id: 'entry_1', reused: false }) } as any,
    {} as any,
    {
      withIdempotency: async ({ fn }: { fn: (tx: any) => Promise<any> }) =>
        fn({
          tenantLoanApplication: {
            findFirst: async () => ({
              id: 'loan_1',
              tenantId: 'tenant_1',
              status: 'DISBURSED',
              currency: 'NGN'
            })
          },
          loanRepaymentScheduleItem: {
            updateMany: async () => ({ count: 0 }),
            findMany: async () => [
              {
                id: 'item_1',
                installmentNumber: 1,
                dueDate: new Date('2025-01-01T00:00:00.000Z'),
                principalDue: new Prisma.Decimal(100),
                interestDue: new Prisma.Decimal(0),
                feesDue: new Prisma.Decimal(0),
                principalPaid: new Prisma.Decimal(0),
                interestPaid: new Prisma.Decimal(0),
                feesPaid: new Prisma.Decimal(0),
                totalDue: new Prisma.Decimal(100),
                totalPaid: new Prisma.Decimal(0),
                status: 'PENDING'
              }
            ],
            update: async () => ({})
          },
          loanRepayment: {
            findUnique: async () => ({ id: 'rep_existing' })
          }
        })
    } as any,
    { lockLoanApplication: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    { publishRepaymentPosted: async () => undefined } as any,
    { incrementBehaviorSnapshot: async () => undefined } as any,
    { get: () => ({ requestId: 'req_test', actorId: 'admin_1' }) } as any,
    { assertLoanInvariants: async () => undefined } as any,
    { applyPrincipalRepayment: async () => undefined } as any
  );

  await assert.rejects(
    () =>
      service.postRepayment({
        tenantId: 'tenant_1',
        loanApplicationId: 'loan_1',
        amount: 100,
        idempotencyKey: 'repay:1',
        actor: { role: 'OPS', adminId: 'admin_1' as any }
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      return true;
    }
  );
});
