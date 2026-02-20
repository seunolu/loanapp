import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConflictException } from '@nestjs/common';
import { AdminLoanApplicationsService } from './admin-loan-applications.service';

test('disbursement posting blocks idempotency key reuse across loans', async () => {
  const service = new AdminLoanApplicationsService(
    {
      $transaction: async (cb: (tx: any) => Promise<any>) =>
        cb({
          tenantLoanApplication: {
            findFirst: async () => ({
              id: 'loan_1',
              tenantId: 'tenant_1',
              status: 'READY_FOR_DISBURSEMENT',
              approvedAmount: 100,
              requestedAmount: 100,
              currency: 'NGN',
              outstandingPrincipal: 0,
              outstandingInterest: 0,
              outstandingFees: 0,
              outstandingTotal: 0
            })
          },
          tenantDisbursement: {
            findUnique: async () => ({
              id: 'disb_1',
              loanApplicationId: 'loan_other'
            })
          }
        })
    } as any,
    { postEntry: async () => ({ id: 'entry_1', reused: false }), createJournal: async () => ({ id: 'j1', reused: false }) } as any,
    { log: async () => undefined } as any,
    {} as any,
    { findOne: async () => ({ id: 'loan_1' }) } as any,
    { getBalances: async () => ({}) } as any,
    { lockLoanApplication: async () => undefined } as any,
    { withIdempotency: async ({ fn }: { fn: (tx: any) => Promise<any> }) =>
      ((
        {
          $transaction: async (cb: (tx: any) => Promise<any>) =>
            cb({
              tenantLoanApplication: {
                findFirst: async () => ({
                  id: 'loan_1',
                  tenantId: 'tenant_1',
                  status: 'READY_FOR_DISBURSEMENT',
                  approvedAmount: 100,
                  requestedAmount: 100,
                  currency: 'NGN',
                  outstandingPrincipal: 0,
                  outstandingInterest: 0,
                  outstandingFees: 0,
                  outstandingTotal: 0
                })
              },
              tenantDisbursement: {
                findUnique: async () => ({
                  id: 'disb_1',
                  loanApplicationId: 'loan_other'
                })
              }
            })
        } as any
      ).$transaction(fn)) } as any,
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
      service.disburseNow(
        { adminId: 'admin_1', tenantId: 'tenant_1', email: 'ops@example.com', role: 'OPS' } as any,
        'loan_1',
        { idempotencyKey: 'same-key' }
      ),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      return true;
    }
  );
});
