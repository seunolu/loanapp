import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequestId } from './api';

test('createRequestId returns non-empty value', () => {
  const id = createRequestId();
  assert.equal(typeof id, 'string');
  assert.ok(id.length > 0);
});

