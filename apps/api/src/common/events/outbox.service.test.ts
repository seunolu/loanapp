import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildEvent } from './domain-events';
import { OutboxService } from './outbox.service';

test('outbox service writes event row using transaction client', async () => {
  const calls: Array<any> = [];
  const tx = {
    outboxEvent: {
      create: async (input: any) => {
        calls.push(input);
        return input;
      }
    }
  };
  const service = new OutboxService();

  await service.writeOutboxEvent(
    tx as any,
    buildEvent({
      eventType: 'loan_application.submitted',
      tenantId: 'tenant-1',
      aggregateType: 'LoanApplication',
      aggregateId: 'loan-1',
      payload: {
        loanApplicationId: 'loan-1',
        status: 'SUBMITTED'
      }
    })
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].data.tenantId, 'tenant-1');
  assert.equal(calls[0].data.eventType, 'loan_application.submitted');
});

