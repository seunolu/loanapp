import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareNames } from './name-match.util';

test('compareNames returns strong match for equivalent names', () => {
  const result = compareNames('Adaeze N. Okoro', 'adaeze okoro');
  assert.equal(result.isStrongMatch, true);
  assert.ok(result.similarity >= 0.85);
});

test('compareNames returns low match for different names', () => {
  const result = compareNames('John Doe', 'Amina Bello');
  assert.equal(result.isStrongMatch, false);
  assert.ok(result.similarity < 0.65);
});

