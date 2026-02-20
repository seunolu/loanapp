import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { DelinquencyStatus, Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { DelinquencyEngineService } from './delinquency-engine.service';

function decimal(value: number | string) {
  return new Prisma.Decimal(value);
}

test('computeLoanDelinquency returns CURRENT when no overdue items', async () => {
  const service = new DelinquencyEngineService(
    {
      loanRepaymentScheduleItem: {
        findMany: async () => [
          {
            id: 's1',
            dueDate: new Date('2026-03-01T00:00:00.000Z'),
            totalDue: decimal(100),
            totalPaid: decimal(0),
            overdueSince: null
          }
        ]
      }
    } as any,
    { log: async () => {} } as any
  );

  const result = await service.computeLoanDelinquency('loan-1', 'tenant-1', new Date('2026-02-01T00:00:00.000Z'));
  assert.equal(result.delinquencyStatus, DelinquencyStatus.CURRENT);
  assert.equal(result.daysPastDue, 0);
  assert.equal(result.overdueAmountCents, 0n);
});

test('computeLoanDelinquency returns OVERDUE with one overdue partially unpaid item', async () => {
  const service = new DelinquencyEngineService(
    {
      loanRepaymentScheduleItem: {
        findMany: async () => [
          {
            id: 's1',
            dueDate: new Date('2026-01-01T00:00:00.000Z'),
            totalDue: decimal(100),
            totalPaid: decimal(30),
            overdueSince: null
          }
        ]
      }
    } as any,
    { log: async () => {} } as any
  );

  const result = await service.computeLoanDelinquency('loan-1', 'tenant-1', new Date('2026-01-11T00:00:00.000Z'));
  assert.equal(result.delinquencyStatus, DelinquencyStatus.OVERDUE);
  assert.equal(result.daysPastDue, 10);
  assert.equal(result.overdueAmountCents, 7000n);
});

test('computeLoanDelinquency uses earliest overdue dueDate and sums overdue amounts', async () => {
  const service = new DelinquencyEngineService(
    {
      loanRepaymentScheduleItem: {
        findMany: async () => [
          {
            id: 's1',
            dueDate: new Date('2026-01-01T00:00:00.000Z'),
            totalDue: decimal(100),
            totalPaid: decimal(50),
            overdueSince: null
          },
          {
            id: 's2',
            dueDate: new Date('2026-01-05T00:00:00.000Z'),
            totalDue: decimal(80),
            totalPaid: decimal(30),
            overdueSince: null
          }
        ]
      }
    } as any,
    { log: async () => {} } as any
  );

  const result = await service.computeLoanDelinquency('loan-1', 'tenant-1', new Date('2026-01-11T00:00:00.000Z'));
  assert.equal(result.daysPastDue, 10);
  assert.equal(result.overdueAmountCents, 10000n);
  assert.equal(result.delinquencyStatus, DelinquencyStatus.OVERDUE);
});

test('computeScheduleItemOverdue clears overdue when fully paid', () => {
  const service = new DelinquencyEngineService({} as any, { log: async () => {} } as any);
  const output = service.computeScheduleItemOverdue(
    {
      id: 's1',
      loanApplicationId: 'loan-1',
      tenantId: 'tenant-1',
      installmentNumber: 1,
      dueDate: new Date('2026-01-01T00:00:00.000Z'),
      currency: 'NGN',
      principalDue: decimal(50),
      interestDue: decimal(10),
      feesDue: decimal(5),
      totalDue: decimal(65),
      principalPaid: decimal(50),
      interestPaid: decimal(10),
      feesPaid: decimal(5),
      totalPaid: decimal(65),
      status: 'PAID',
      paidAt: new Date('2026-01-01T00:00:00.000Z'),
      overdueSince: new Date('2026-01-02T00:00:00.000Z'),
      isOverdue: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    new Date('2026-01-11T00:00:00.000Z')
  );
  assert.equal(output.isOverdue, false);
  assert.equal(output.remaining.toString(), '0');
});

test('recalcLoanDelinquencyTx transitions DISBURSED -> OVERDUE and OVERDUE -> DISBURSED', async () => {
  const loan = {
    id: 'loan-1',
    tenantId: 'tenant-1',
    status: TenantLoanApplicationStatus.DISBURSED
  };
  const schedule = [
    {
      id: 's1',
      dueDate: new Date('2026-01-01T00:00:00.000Z'),
      totalDue: decimal(100),
      totalPaid: decimal(0),
      overdueSince: null,
      isOverdue: false
    }
  ];

  const history: Array<{ fromStatus: string | null; toStatus: string }> = [];
  const service = new DelinquencyEngineService({} as any, { log: async () => {} } as any);

  const tx: any = {
    tenantLoanApplication: {
      findFirst: async () => loan,
      update: async ({ data }: any) => {
        if (data.status) {
          loan.status = data.status;
        }
      }
    },
    loanRepaymentScheduleItem: {
      findMany: async () => schedule,
      update: async ({ data }: any) => {
        schedule[0].isOverdue = data.isOverdue;
        schedule[0].overdueSince = data.overdueSince;
      }
    },
    loanApplicationStatusHistory: {
      create: async ({ data }: any) => {
        history.push({ fromStatus: data.fromStatus, toStatus: data.toStatus });
      }
    }
  };

  await service.recalcLoanDelinquencyTx(tx, 'loan-1', 'tenant-1', new Date('2026-01-11T00:00:00.000Z'));
  assert.equal(loan.status, TenantLoanApplicationStatus.OVERDUE);
  assert.equal(history.length, 1);
  assert.equal(history[0].toStatus, TenantLoanApplicationStatus.OVERDUE);

  schedule[0].totalPaid = decimal(100);
  await service.recalcLoanDelinquencyTx(tx, 'loan-1', 'tenant-1', new Date('2026-01-12T00:00:00.000Z'));
  assert.equal(loan.status, TenantLoanApplicationStatus.DISBURSED);
  assert.equal(history.length, 2);
  assert.equal(history[1].toStatus, TenantLoanApplicationStatus.DISBURSED);
});
