import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { __test__ } from './strip-tenant-id.interceptor';

test('scrub removes tenant and internal decision fields recursively', () => {
  const payload = {
    tenantId: 'tenant_a',
    loan: {
      tenantId: 'tenant_a',
      riskScoreRaw: 912,
      internalDecisionReason: 'policy-internal',
      nested: [{ tenantId: 'tenant_a', value: 1 }]
    },
    lenderInternalConfig: { a: 1 },
    ok: true
  };

  const scrubbed = __test__.scrub(payload) as any;
  assert.equal('tenantId' in scrubbed, false);
  assert.equal('lenderInternalConfig' in scrubbed, false);
  assert.equal('tenantId' in scrubbed.loan, false);
  assert.equal('riskScoreRaw' in scrubbed.loan, false);
  assert.equal('internalDecisionReason' in scrubbed.loan, false);
  assert.equal('tenantId' in scrubbed.loan.nested[0], false);
  assert.equal(scrubbed.ok, true);
});

