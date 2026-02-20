import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { PaystackGateway } from './paystack.gateway';

function buildGateway(secret: string) {
  const configService = {
    get: (key: string) => {
      if (key === 'PAYSTACK_WEBHOOK_SECRET') return secret;
      if (key === 'PAYSTACK_SECRET_KEY') return secret;
      if (key === 'PAYSTACK_BASE_URL') return 'https://api.paystack.co';
      return undefined;
    }
  } as any;
  return new PaystackGateway(configService);
}

test('verifyWebhookSignature validates HMAC SHA512 signature', () => {
  const secret = 'test_secret_key_12345';
  const gateway = buildGateway(secret);
  const body = JSON.stringify({ event: 'charge.success', data: { id: 1 } });
  const signature = createHmac('sha512', secret).update(body).digest('hex');

  assert.equal(gateway.verifyWebhookSignature(body, signature), true);
  assert.equal(gateway.verifyWebhookSignature(body, `${signature}00`), false);
  assert.equal(gateway.verifyWebhookSignature(body, undefined), false);
});
