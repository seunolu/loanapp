import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { HardshipService } from './hardship.service';

test('cannot approve without role', async () => {
  const service = new HardshipService({} as any, {} as any, {} as any);
  await assert.rejects(
    () =>
      service.transitionRequest(
        {
          tenantId: 'tenant_1',
          adminId: 'admin_1',
          role: 'CREDIT_OFFICER'
        } as any,
        'hardship_1',
        { toStatus: 'APPROVED' }
      ),
    (error: unknown) => error instanceof ForbiddenException
  );
});

test('cannot approve twice', async () => {
  const service = new HardshipService(
    {
      $transaction: async (fn: (tx: any) => Promise<any>) =>
        fn({
          hardshipRequest: {
            findFirst: async () => ({
              id: 'hardship_1',
              tenantId: 'tenant_1',
              status: 'APPROVED'
            })
          }
        })
    } as any,
    {} as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.transitionRequest(
        {
          tenantId: 'tenant_1',
          adminId: 'admin_1',
          role: 'SUPER_ADMIN'
        } as any,
        'hardship_1',
        { toStatus: 'APPROVED' }
      ),
    (error: unknown) => error instanceof ConflictException
  );
});

test('cannot approve when loan is not disbursed', async () => {
  const service = new HardshipService(
    {
      $transaction: async (fn: (tx: any) => Promise<any>) =>
        fn({
          hardshipRequest: {
            findFirst: async () => ({
              id: 'hardship_1',
              tenantId: 'tenant_1',
              borrowerId: 'borrower_1',
              loanApplicationId: 'loan_1',
              status: 'UNDER_REVIEW',
              type: 'PAYMENT_PAUSE',
              pauseDays: 10
            }),
            update: async () => ({ id: 'hardship_1' })
          },
          hardshipStatusHistory: {
            create: async () => ({})
          },
          tenantLoanApplication: {
            findFirst: async () => ({
              id: 'loan_1',
              status: 'SUBMITTED'
            })
          }
        })
    } as any,
    {} as any,
    {} as any
  );

  await assert.rejects(
    () =>
      service.transitionRequest(
        {
          tenantId: 'tenant_1',
          adminId: 'admin_1',
          role: 'RISK_MANAGER'
        } as any,
        'hardship_1',
        { toStatus: 'APPROVED' }
      ),
    (error: unknown) => error instanceof BadRequestException
  );
});

