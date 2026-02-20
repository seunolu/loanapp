import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { FinancialInvariantsService } from './financial-invariants.service';

function buildService(overrides?: Record<string, unknown>): FinancialInvariantsService {
  const prisma = {
    tenantLoanApplication: {
      findUnique: async () => null,
      findMany: async () => []
    },
    loanRepaymentScheduleItem: {
      aggregate: async () => ({ _sum: { totalDue: null } })
    },
    loanRepayment: {
      aggregate: async () => ({ _sum: { amount: null } })
    },
    tenantDisbursement: {
      findMany: async () => []
    },
    tenantLedgerEntry: {
      count: async () => 0
    },
    ...(overrides ?? {})
  };
  return new FinancialInvariantsService(prisma as any);
}

test('assertLoanInvariants rejects overpayment', async () => {
  const service = buildService({
    tenantLoanApplication: {
      findUnique: async () => ({
        id: 'loan_1',
        tenantId: 'tenant_1',
        approvedAmount: new Prisma.Decimal(100),
        requestedAmount: new Prisma.Decimal(100),
        outstandingPrincipal: new Prisma.Decimal(20),
        outstandingInterest: new Prisma.Decimal(5),
        outstandingFees: new Prisma.Decimal(0),
        outstandingTotal: new Prisma.Decimal(25)
      })
    },
    loanRepaymentScheduleItem: {
      aggregate: async () => ({ _sum: { totalDue: new Prisma.Decimal(100) } })
    },
    loanRepayment: {
      aggregate: async () => ({ _sum: { amount: new Prisma.Decimal(120) } })
    }
  });

  await assert.rejects(
    () => service.assertLoanInvariants('loan_1'),
    /Total repayments exceed scheduled total due/
  );
});

test('assertLoanInvariants rejects over-disbursement', async () => {
  const service = buildService({
    tenantLoanApplication: {
      findUnique: async () => ({
        id: 'loan_2',
        tenantId: 'tenant_2',
        approvedAmount: new Prisma.Decimal(50),
        requestedAmount: new Prisma.Decimal(50),
        outstandingPrincipal: new Prisma.Decimal(50),
        outstandingInterest: new Prisma.Decimal(0),
        outstandingFees: new Prisma.Decimal(0),
        outstandingTotal: new Prisma.Decimal(50)
      })
    },
    tenantDisbursement: {
      findMany: async () => [{ id: 'd_1', amount: new Prisma.Decimal(75) }]
    }
  });

  await assert.rejects(
    () => service.assertLoanInvariants('loan_2'),
    /Disbursement amount exceeds approved amount/
  );
});

