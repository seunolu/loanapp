import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { PenaltyService } from './penalty.service';

test('penalty accrual is idempotent by unique accrued date', async () => {
  let accrualCreated = 0;
  const service = new PenaltyService(
    {
      tenantPenaltyAccrual: {
        findUnique: async () => ({ id: 'existing' })
      },
      tenantLoanApplication: {
        findFirst: async () => ({
          id: 'loan_1',
          status: TenantLoanApplicationStatus.OVERDUE,
          writtenOffAt: null,
          settledAt: null,
          daysPastDue: 10,
          outstandingPrincipal: new Prisma.Decimal(1000),
          totalPenaltyAccrued: new Prisma.Decimal(0),
          outstandingFees: new Prisma.Decimal(0),
          outstandingTotal: new Prisma.Decimal(1000),
          lastPenaltyAccrualDate: null
        })
      },
      loanProduct: { findFirst: async () => null },
      tenantLoanApplication_update: { update: async () => ({}) },
      penaltyRule: { findFirst: async () => null }
    } as any,
    { get: () => '15' } as any
  );

  const result = await service.accrueDailyPenalty('loan_1', 'tenant_1', new Date('2026-02-20T10:00:00.000Z'), {
    tenantPenaltyAccrual: { findUnique: async () => ({ id: 'existing' }), create: async () => ({}) },
    tenantLoanApplication: {
      findFirst: async () => ({
        id: 'loan_1',
        status: TenantLoanApplicationStatus.OVERDUE,
        writtenOffAt: null,
        settledAt: null,
        daysPastDue: 10,
        outstandingPrincipal: new Prisma.Decimal(1000),
        totalPenaltyAccrued: new Prisma.Decimal(0),
        outstandingFees: new Prisma.Decimal(0),
        outstandingTotal: new Prisma.Decimal(1000),
        lastPenaltyAccrualDate: null
      }),
      update: async () => ({})
    },
    loanProduct: { findFirst: async () => null },
    penaltyRule: { findFirst: async () => null }
  } as any);

  assert.equal(result.accrued.toString(), '0');
  assert.equal(accrualCreated, 0);
});
