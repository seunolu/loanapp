import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { IntegrationsPaymentsService } from './payments.service';

test('initRepayment delegates to payment intent creation with kobo amount', async () => {
  let received: Record<string, unknown> | null = null;
  const service = new IntegrationsPaymentsService(
    {} as any,
    {
      createInboundCollectionIntent: async (_principal: unknown, input: Record<string, unknown>) => {
        received = input;
        return { ok: true };
      }
    } as any
  );

  const principal = { tenantId: 'tenant_1', adminId: 'admin_1' } as any;
  await service.initRepayment(principal, { loanId: 'loan_1', amountKobo: 15500 });

  assert.equal((received as any)?.loanId, 'loan_1');
  assert.equal((received as any)?.amountMinor, 15500);
  assert.equal((received as any)?.currency, 'NGN');
  assert.equal(typeof (received as any)?.idempotencyKey, 'string');
});
