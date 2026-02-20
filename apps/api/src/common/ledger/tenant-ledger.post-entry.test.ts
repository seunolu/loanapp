import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { TenantLedgerAccountCode, TenantLedgerDirection, TenantLedgerEntryType } from '@prisma/client';
import { TenantLedgerService } from './tenant-ledger.service';

test('postEntry rejects empty lines', async () => {
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
        type: TenantLedgerEntryType.ADJUSTMENT,
        idempotencyKey: 'adj:empty',
        referenceType: 'LoanApplication',
        referenceId: 'loan_1',
        lines: []
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match((error as Error).message, /at least one line/i);
      return true;
    }
  );
});

test('postEntry enforces positive amounts', async () => {
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
        type: TenantLedgerEntryType.ADJUSTMENT,
        idempotencyKey: 'adj:nonpositive',
        referenceType: 'LoanApplication',
        referenceId: 'loan_1',
        lines: [
          { accountCode: TenantLedgerAccountCode.CASH_ON_HAND, direction: TenantLedgerDirection.DEBIT, amount: 0 },
          { accountCode: TenantLedgerAccountCode.SUSPENSE, direction: TenantLedgerDirection.CREDIT, amount: 0 }
        ]
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      return true;
    }
  );
});
