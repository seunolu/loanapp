import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { RateLimitPolicyService } from './rate-limit.policy';

test('RateLimitPolicyService returns category policy with expected strategy', () => {
  const service = new RateLimitPolicyService({ get: () => undefined } as any);
  const auth = service.get('AUTH');
  const webhook = service.get('PAYMENT_WEBHOOK');
  assert.equal(auth.keyStrategy, 'IP');
  assert.equal(webhook.keyStrategy, 'IP+TENANT');
  assert.ok(auth.maxRequests > 0);
  assert.ok(webhook.windowSeconds > 0);
});

