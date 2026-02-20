import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import {
  TenantAdminRole,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType
} from '@prisma/client';
import { TenantLedgerService } from './tenant-ledger.service';

test('createEntryWithBalancedLines throws for unbalanced lines', async () => {
  const service = new TenantLedgerService(
    {} as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    { incrementLedgerPosting: () => undefined } as any
  );

  await assert.rejects(
    () =>
      service.createEntryWithBalancedLines(
        {
          tenantId: 'tenant_1',
          occurredAt: new Date(),
          referenceType: TenantLedgerEntryType.ADJUSTMENT,
          referenceId: 'ref_1',
          lines: [
            {
              accountType: TenantLedgerAccountCode.CASH_ON_HAND,
              direction: TenantLedgerDirection.DEBIT,
              amount: 100
            },
            {
              accountType: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
              direction: TenantLedgerDirection.CREDIT,
              amount: 80
            }
          ]
        },
        {
          tenantLedgerAccount: { findMany: async () => [] },
          tenantLedgerEntry: {
            findUnique: async () => null,
            create: async () => ({ id: 'entry_1' })
          },
          tenantLedgerLine: { createMany: async () => ({ count: 0 }) }
        } as any
      ),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match((error as Error).message, /balanced/);
      return true;
    }
  );
});

test('reverseEntry creates opposite debit/credit lines', async () => {
  const createdLines: Array<{ direction: TenantLedgerDirection; amount: number }> = [];
  const service = new TenantLedgerService(
    {} as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    { incrementLedgerPosting: () => undefined } as any
  );

  const result = await service.reverseEntry(
    {
      tenantId: 'tenant_1',
      entryId: 'entry_1',
      reason: 'reverse test',
      actorRole: 'SUPER_ADMIN' as TenantAdminRole
    },
    {
      tenantLedgerEntry: {
        findFirst: async () => ({
          id: 'entry_1',
          tenantId: 'tenant_1',
          lines: [
            {
              accountId: 'a1',
              direction: TenantLedgerDirection.DEBIT,
              amount: 100,
              currency: 'NGN'
            },
            {
              accountId: 'a2',
              direction: TenantLedgerDirection.CREDIT,
              amount: 100,
              currency: 'NGN'
            }
          ]
        }),
        findUnique: async () => null,
        create: async () => ({ id: 'entry_reverse' })
      },
      tenantLedgerAccount: {
        findMany: async () => [
          { id: 'a1', code: TenantLedgerAccountCode.CASH_ON_HAND },
          { id: 'a2', code: TenantLedgerAccountCode.SUSPENSE }
        ]
      },
      tenantLedgerLine: {
        createMany: async (args: { data: Array<{ direction: TenantLedgerDirection; amount: number }> }) => {
          createdLines.push(...args.data);
          return { count: 2 };
        }
      }
    } as any
  );

  assert.equal(result.id, 'entry_reverse');
  assert.equal(createdLines[0].direction, TenantLedgerDirection.CREDIT);
  assert.equal(createdLines[1].direction, TenantLedgerDirection.DEBIT);
});

test('postEntry rejects role not allowed for posting type', async () => {
  const service = new TenantLedgerService(
    {} as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    { incrementLedgerPosting: () => undefined } as any
  );

  await assert.rejects(
    () =>
      service.postEntry({
        tenantId: 'tenant_1',
        occurredAt: new Date(),
        type: TenantLedgerEntryType.DISBURSEMENT,
        idempotencyKey: 'x1',
        referenceType: 'LoanApplication',
        referenceId: 'loan_1',
        actorRole: 'CREDIT_OFFICER' as TenantAdminRole,
        lines: [
          { accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE, direction: TenantLedgerDirection.DEBIT, amount: 100 },
          { accountCode: TenantLedgerAccountCode.CASH_ON_HAND, direction: TenantLedgerDirection.CREDIT, amount: 100 }
        ]
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    }
  );
});
