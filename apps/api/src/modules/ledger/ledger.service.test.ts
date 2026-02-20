import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { LedgerGuardService } from './ledger-guard.service';
import { LedgerService } from './ledger.service';

function createPrismaMock() {
  const state = {
    entries: [] as Array<{ id: string; tenantId: string; referenceType: string }>,
    lines: [] as Array<{ journalEntryId: string; debitMinor: number; creditMinor: number }>,
    accounts: [
      { id: 'a1', tenantId: 't1', code: 'CASH' },
      { id: 'a2', tenantId: 't1', code: 'LOAN_PRINCIPAL_RECEIVABLE' }
    ]
  };
  const prisma = {
    $transaction: async <T>(fn: (tx: any) => Promise<T>) => {
      const draft = {
        entries: [...state.entries],
        lines: [...state.lines]
      };
      const tx = {
        ledgerAccount: {
          findMany: async ({ where }: any) =>
            state.accounts.filter(
              (a) => a.tenantId === where.tenantId && where.id.in.includes(a.id)
            ),
          upsert: async () => ({})
        },
        journalEntry: {
          create: async ({ data }: any) => {
            const created = { id: `je_${draft.entries.length + 1}`, ...data };
            draft.entries.push(created);
            return created;
          }
        },
        journalLine: {
          createMany: async ({ data }: any) => {
            draft.lines.push(...data);
            return { count: data.length };
          }
        }
      };
      const result = await fn(tx);
      state.entries = draft.entries;
      state.lines = draft.lines;
      return result;
    }
  };
  return { prisma, state };
}

test('rejects single-line journal', async () => {
  const { prisma } = createPrismaMock();
  const service = new LedgerService(prisma as any, new LedgerGuardService());
  await assert.rejects(
    () =>
      service.createJournalEntry({
        tenantId: 't1',
        referenceType: 'TEST',
        lines: [{ accountId: 'a1', debitMinor: 100 }]
      }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      assert.match((error as Error).message, /At least 2 journal lines/);
      return true;
    }
  );
});

test('rejects unbalanced journal', async () => {
  const { prisma } = createPrismaMock();
  const service = new LedgerService(prisma as any, new LedgerGuardService());
  await assert.rejects(
    () =>
      service.createJournalEntry({
        tenantId: 't1',
        referenceType: 'TEST',
        lines: [
          { accountId: 'a1', debitMinor: 100 },
          { accountId: 'a2', creditMinor: 80 }
        ]
      }),
    /not balanced/i
  );
});

test('creates balanced journal', async () => {
  const { prisma, state } = createPrismaMock();
  const service = new LedgerService(prisma as any, new LedgerGuardService());
  const result = await service.createJournalEntry({
    tenantId: 't1',
    referenceType: 'TEST',
    lines: [
      { accountId: 'a1', debitMinor: 100 },
      { accountId: 'a2', creditMinor: 100 }
    ]
  });

  assert.equal(result.debitMinor, 100);
  assert.equal(result.creditMinor, 100);
  assert.equal(state.entries.length, 1);
  assert.equal(state.lines.length, 2);
});

test('createJournalEntry is atomic when line insert fails', async () => {
  const state = {
    entries: [] as any[],
    lines: [] as any[],
    accounts: [
      { id: 'a1', tenantId: 't1', code: 'CASH' },
      { id: 'a2', tenantId: 't1', code: 'LOAN_PRINCIPAL_RECEIVABLE' }
    ]
  };
  const prisma = {
    $transaction: async <T>(fn: (tx: any) => Promise<T>) => {
      const draft = { entries: [...state.entries], lines: [...state.lines] };
      const tx = {
        ledgerAccount: {
          findMany: async () => state.accounts,
          upsert: async () => ({})
        },
        journalEntry: {
          create: async ({ data }: any) => {
            const created = { id: 'je_1', ...data };
            draft.entries.push(created);
            return created;
          }
        },
        journalLine: {
          createMany: async () => {
            throw new Error('line insert failed');
          }
        }
      };
      const result = await fn(tx);
      state.entries = draft.entries;
      state.lines = draft.lines;
      return result;
    }
  };
  const service = new LedgerService(prisma as any, new LedgerGuardService());

  await assert.rejects(
    () =>
      service.createJournalEntry({
        tenantId: 't1',
        referenceType: 'TEST',
        lines: [
          { accountId: 'a1', debitMinor: 10 },
          { accountId: 'a2', creditMinor: 10 }
        ]
      }),
    /line insert failed/
  );

  assert.equal(state.entries.length, 0);
  assert.equal(state.lines.length, 0);
});
