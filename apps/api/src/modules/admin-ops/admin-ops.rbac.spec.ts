import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { canManageOps } from './admin-ops.service';

test('canManageOps allows only SUPER_ADMIN or SYSTEM', () => {
  assert.equal(canManageOps('SUPER_ADMIN'), true);
  assert.equal(canManageOps('SYSTEM'), true);
  assert.equal(canManageOps('OPS'), false);
  assert.equal(canManageOps('RISK_MANAGER'), false);
});

