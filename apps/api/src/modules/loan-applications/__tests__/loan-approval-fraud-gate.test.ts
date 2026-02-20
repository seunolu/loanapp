import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { isApprovalBlockedByFraudAlert } from '../loan-applications.service';

test('approval blocked when fraud alert exists for non-super-admin', () => {
  assert.equal(
    isApprovalBlockedByFraudAlert({
      role: 'CREDIT_OFFICER',
      hasBlockingFraudAlert: true
    }),
    true
  );
});

test('super admin override allowed even with blocking fraud alert', () => {
  assert.equal(
    isApprovalBlockedByFraudAlert({
      role: 'SUPER_ADMIN',
      hasBlockingFraudAlert: true
    }),
    false
  );
});

