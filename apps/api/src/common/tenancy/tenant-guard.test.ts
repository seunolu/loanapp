import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureTenantMatch, requireTenantId } from './tenant-guard';

test('requireTenantId throws on empty tenant id', () => {
  assert.throws(() => requireTenantId(''), /Tenant context is required from JWT/);
  assert.throws(() => requireTenantId('   '), /Tenant context is required from JWT/);
  assert.throws(() => requireTenantId(undefined), /Tenant context is required from JWT/);
});

test('requireTenantId returns normalized tenant id', () => {
  assert.equal(requireTenantId(' tenant_abc123 '), 'tenant_abc123');
});

test('ensureTenantMatch throws NotFound on mismatch', () => {
  assert.throws(() => ensureTenantMatch('tenant_a', 'tenant_b'), /Resource not found/);
});

