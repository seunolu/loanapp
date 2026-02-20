import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { allocateRepayment } from './repayment-allocation';

test('allocateRepayment applies fees -> interest -> principal order', () => {
  const result = allocateRepayment(100, 10, 20, 200);
  assert.equal(result.feesPaid.toString(), '10');
  assert.equal(result.interestPaid.toString(), '20');
  assert.equal(result.principalPaid.toString(), '70');
  assert.equal(result.remaining.toString(), '0');
});
