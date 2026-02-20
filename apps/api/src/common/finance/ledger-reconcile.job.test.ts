import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { LedgerReconcileJob } from './ledger-reconcile.job';

test('runOnce records mismatch metric and audit event when equation fails', async () => {
  let mismatchCount = 0;
  let auditCount = 0;
  const service = new LedgerReconcileJob(
    { get: () => 'true' } as any,
    {
      tenant: { findMany: async () => [{ id: 'tenant_1' }] },
      auditEvent: {
        create: async () => {
          auditCount += 1;
        }
      },
      $queryRaw: async () => [
        { type: 'ASSET', normalBalance: 'DEBIT', direction: 'DEBIT', totalMinor: 1_000n },
        { type: 'LIABILITY', normalBalance: 'CREDIT', direction: 'CREDIT', totalMinor: 100n }
      ]
    } as any,
    {
      incrementLedgerReconcileMismatch: () => {
        mismatchCount += 1;
      }
    } as any
  );

  await service.runOnce();

  assert.equal(mismatchCount, 1);
  assert.equal(auditCount, 1);
});
