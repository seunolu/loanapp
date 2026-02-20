import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertImmutableLedgerMutation } from './prisma.service';

test('ledger mutation guard rejects update/delete on immutable ledger models', () => {
  assert.throws(
    () => assertImmutableLedgerMutation('TenantLedgerEntry', 'update'),
    /immutable and append-only/
  );
  assert.throws(
    () => assertImmutableLedgerMutation('TenantLedgerLine', 'deleteMany'),
    /immutable and append-only/
  );
});

test('ledger mutation guard allows non-mutating or non-ledger actions', () => {
  assert.doesNotThrow(() => assertImmutableLedgerMutation('TenantLedgerEntry', 'findMany'));
  assert.doesNotThrow(() => assertImmutableLedgerMutation('PaymentIntent', 'update'));
});

