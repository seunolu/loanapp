import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { LedgerGuardService } from './ledger-guard.service';

test('validateTransactionBalanced throws on debit/credit mismatch', () => {
  const service = new LedgerGuardService();
  assert.throws(
    () =>
      service.validateTransactionBalanced([
        { accountId: 'a1', debitMinor: 100, creditMinor: 0 },
        { accountId: 'a2', debitMinor: 0, creditMinor: 90 }
      ]),
    (error: unknown) => error instanceof BadRequestException
  );
});

