import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { TenantLedgerAccountCode, TenantLedgerDirection } from '@prisma/client';
import { TenantLedgerService } from './tenant-ledger.service';

test('creates balanced tenant journal', async () => {
  let created = 0;
  const service = new TenantLedgerService(
    {} as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    { incrementLedgerPosting: () => undefined } as any
  );

  const result = await service.createJournal(
    {
      tenantId: 'tenant_1',
      referenceType: 'ADJUSTMENT',
      referenceId: 'adj_1',
      idempotencyKey: 'adj:1',
      entries: [
        { accountCode: TenantLedgerAccountCode.CASH_ON_HAND, direction: TenantLedgerDirection.DEBIT, amount: 100 },
        {
          accountCode: TenantLedgerAccountCode.SUSPENSE,
          direction: TenantLedgerDirection.CREDIT,
          amount: 100
        }
      ]
    },
    {
      tenantLedgerEntry: {
        findUnique: async () => null,
        create: async () => {
          created += 1;
          return { id: 'entry_1' };
        }
      },
      tenantLedgerAccount: {
        findMany: async () => [
          { id: 'a1', code: TenantLedgerAccountCode.CASH_ON_HAND },
          { id: 'a2', code: TenantLedgerAccountCode.SUSPENSE }
        ]
      },
      tenantLedgerLine: { createMany: async () => ({ count: 2 }) }
    } as any
  );

  assert.equal(result.id, 'entry_1');
  assert.equal(created, 1);
});

test('rejects unbalanced tenant journal', async () => {
  const service = new TenantLedgerService(
    {} as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    { incrementLedgerPosting: () => undefined } as any
  );

  await assert.rejects(
    () =>
      service.createJournal({
        tenantId: 'tenant_1',
        referenceType: 'ADJUSTMENT',
        referenceId: 'adj_1',
        idempotencyKey: 'adj:1',
        entries: [
          { accountCode: TenantLedgerAccountCode.CASH_ON_HAND, direction: TenantLedgerDirection.DEBIT, amount: 100 },
          { accountCode: TenantLedgerAccountCode.SUSPENSE, direction: TenantLedgerDirection.CREDIT, amount: 90 }
        ]
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    }
  );
});

test('idempotency returns existing journal', async () => {
  const service = new TenantLedgerService(
    {} as any,
    { ensureDefaultAccounts: async () => undefined } as any,
    { incrementLedgerPosting: () => undefined } as any
  );

  const result = await service.createJournal(
    {
      tenantId: 'tenant_1',
      referenceType: 'ADJUSTMENT',
      referenceId: 'adj_1',
      idempotencyKey: 'adj:existing',
      entries: [
        { accountCode: TenantLedgerAccountCode.CASH_ON_HAND, direction: TenantLedgerDirection.DEBIT, amount: 50 },
        { accountCode: TenantLedgerAccountCode.SUSPENSE, direction: TenantLedgerDirection.CREDIT, amount: 50 }
      ]
    },
    {
      tenantLedgerEntry: { findUnique: async () => ({ id: 'entry_existing' }) }
    } as any
  );

  assert.equal(result.id, 'entry_existing');
  assert.equal(result.reused, true);
});
