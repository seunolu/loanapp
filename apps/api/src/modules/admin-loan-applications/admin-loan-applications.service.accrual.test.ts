import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';

test('pause interest prevents accrual ledger posting', async () => {
  const ledgerCalls: Array<unknown> = [];
  const tx = {
    tenantLoanApplication: {
      findFirst: async () => ({
        id: 'loan_1',
        tenantId: 'tenant_1',
        status: 'DISBURSED',
        interestAccrualPaused: true,
        annualInterestRate: 12,
        annualInterestRateBps: 1200,
        interestOverrideRate: null,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
        lastAccruedAt: null,
        currency: 'NGN'
      })
    }
  };

  const prisma = {
    $transaction: async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx),
    tenantLoanApplication: { findFirst: async () => ({ id: 'loan_1', tenantId: 'tenant_1' }) }
  };
  const ledgerService = {
    postEntry: async (input: unknown) => {
      ledgerCalls.push(input);
    }
  };
  const featureFlagService = { isEnabled: async () => true };

  const service = new AdminLoanApplicationsService(
    prisma as any,
    ledgerService as any,
    { log: async () => undefined } as any,
    { findManyTenantLoanApplications: async () => [] } as any,
    { findOne: async () => ({ id: 'loan_1', tenantId: 'tenant_1' }) } as any,
    { getBalances: async () => ({ principalOutstanding: { lte: () => true } }) } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    featureFlagService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );

  (service as any).findOne = async () => ({ id: 'loan_1' });

  await service.accrueInterest(
    { adminId: 'admin_1', email: 'ops@example.com', tenantId: 'tenant_1', role: 'OPS' },
    'loan_1',
    { throughDate: '2026-02-20' }
  );

  assert.equal(ledgerCalls.length, 0);
});
