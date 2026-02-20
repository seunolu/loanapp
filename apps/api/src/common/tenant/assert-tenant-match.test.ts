import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { InternalServerErrorException } from '@nestjs/common';
import { assertTenantMatch } from './assert-tenant-match';

test('assertTenantMatch passes for same tenant', () => {
  assert.doesNotThrow(() => assertTenantMatch('tenant_a', 'tenant_a'));
});

test('assertTenantMatch throws for mismatched tenant', () => {
  assert.throws(
    () => assertTenantMatch('tenant_b', 'tenant_a'),
    (error: unknown) => error instanceof InternalServerErrorException
  );
});

