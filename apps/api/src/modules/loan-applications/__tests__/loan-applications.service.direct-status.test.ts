import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantLoanApplicationStatus } from '@prisma/client';
import { LoanApplicationsService } from '../loan-applications.service';

test('setStatusDirectSystemOnly forbids non-SYSTEM actor role', async () => {
  const service = new LoanApplicationsService(
    { $transaction: async () => undefined } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { hasOpenAlertAtOrAbove: async () => false, incrementBehaviorSnapshot: async () => undefined } as any,
    { assertBorrowerNotRestricted: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    { publishLoanStatusChanged: async () => undefined } as any,
    { get: () => ({ requestId: 'req_test', actorId: 'admin_1' }) } as any,
    { applyWriteOff: async () => undefined } as any
  );

  await assert.rejects(
    () =>
      service.setStatusDirectSystemOnly({
        tenantId: 'tenant_1',
        loanApplicationId: 'loan_1',
        toStatus: TenantLoanApplicationStatus.REJECTED,
        actorRole: 'OPS'
      }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    }
  );
});

test('setStatusDirectSystemOnly throws not found for unknown loan', async () => {
  const service = new LoanApplicationsService(
    {
      $transaction: async (cb: (tx: any) => Promise<void>) =>
        cb({
          tenantLoanApplication: { findFirst: async () => null }
        })
    } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { hasOpenAlertAtOrAbove: async () => false, incrementBehaviorSnapshot: async () => undefined } as any,
    { assertBorrowerNotRestricted: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    { publishLoanStatusChanged: async () => undefined } as any,
    { get: () => ({ requestId: 'req_test', actorId: 'admin_1' }) } as any,
    { applyWriteOff: async () => undefined } as any
  );

  await assert.rejects(
    () =>
      service.setStatusDirectSystemOnly({
        tenantId: 'tenant_1',
        loanApplicationId: 'loan_404',
        toStatus: TenantLoanApplicationStatus.REJECTED,
        actorRole: 'SYSTEM'
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    }
  );
});
