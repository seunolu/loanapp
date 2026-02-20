import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeDefaultRate, computePar30Rate } from './admin-dashboard.service';

test('computePar30Rate returns 0 when portfolioOutstanding is zero', () => {
  assert.equal(computePar30Rate(100, 0), 0);
});

test('computePar30Rate computes bounded ratio', () => {
  assert.equal(computePar30Rate(250, 1000), 0.25);
  assert.equal(computePar30Rate(2000, 1000), 1);
});

test('computeDefaultRate returns 0 when denominator is zero', () => {
  assert.equal(computeDefaultRate(3, 0), 0);
});

test('computeDefaultRate computes bounded ratio', () => {
  assert.equal(computeDefaultRate(2, 8), 0.25);
  assert.equal(computeDefaultRate(12, 8), 1);
});
