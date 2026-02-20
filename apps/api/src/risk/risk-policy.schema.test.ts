import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultRiskPolicyConfig, riskPolicyConfigSchema } from './risk-policy.schema';

test('policy schema accepts default config', () => {
  const parsed = riskPolicyConfigSchema.safeParse(defaultRiskPolicyConfig);
  assert.equal(parsed.success, true);
});

test('policy schema rejects invalid thresholds ordering', () => {
  const parsed = riskPolicyConfigSchema.safeParse({
    ...defaultRiskPolicyConfig,
    thresholds: { approveMinScore: 500, reviewMinScore: 650 }
  });
  assert.equal(parsed.success, false);
});

