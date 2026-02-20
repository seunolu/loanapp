import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { PenaltyService } from './penalty.service';

test('accrueDailyPenalty accrues once per day', async () => {
  const loan = {
    id: 'loan-1',
    tenantId: 'tenant-1',
    status: TenantLoanApplicationStatus.OVERDUE,
    writtenOffAt: null,
    settledAt: null,
    daysPastDue: 5,
    outstandingPrincipal: new Prisma.Decimal(1000),
    totalPenaltyAccrued: new Prisma.Decimal(0),
    outstandingFees: new Prisma.Decimal(0),
    outstandingTotal: new Prisma.Decimal(1000),
    lastPenaltyAccrualDate: null
  };
  const updates: any[] = [];
  const service = new PenaltyService(
    {
      tenantPenaltyAccrual: {
        findUnique: async () => null,
        create: async () => ({})
      },
      penaltyRule: { findFirst: async () => null },
      loanProduct: { findFirst: async () => null },
      tenantLoanApplication: {
        findFirst: async () => loan,
        update: async (args: any) => {
          updates.push(args.data);
          Object.assign(loan, args.data);
        }
      }
    } as any,
    {
      get: () => '100'
    } as any
  );

  const first = await service.accrueDailyPenalty('loan-1', 'tenant-1', new Date('2026-02-01T12:00:00.000Z'));
  assert.ok(first.accrued.gt(0));
  const second = await service.accrueDailyPenalty('loan-1', 'tenant-1', new Date('2026-02-01T13:00:00.000Z'));
  assert.equal(second.accrued.toString(), '0');
  assert.equal(updates.length >= 1, true);
});
