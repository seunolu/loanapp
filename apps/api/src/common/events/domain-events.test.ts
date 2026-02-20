import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertEventShape, buildEvent } from './domain-events';

test('buildEvent creates versioned domain event and zod validation passes', () => {
  const event = buildEvent({
    eventType: 'repayment.posted',
    tenantId: 'tenant-1',
    aggregateType: 'LoanApplication',
    aggregateId: 'loan-1',
    payload: {
      repaymentId: 'rep-1',
      amount: '1000',
      method: 'BANK_TRANSFER'
    }
  });

  const validated = assertEventShape(event);
  assert.equal(validated.eventType, 'repayment.posted');
  assert.equal(validated.eventVersion, 1);
  assert.equal(validated.aggregateId, 'loan-1');
});

