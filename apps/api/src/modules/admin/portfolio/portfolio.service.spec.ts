import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPortfolioKpis, computeDelinquencyRatios, computeParBucketsFromLoans } from './portfolio.service';

test('buildPortfolioKpis returns zero-safe rates for empty tenant', () => {
  const result = buildPortfolioKpis({
    asOf: new Date().toISOString(),
    activeLoansCount: 0,
    totalDisbursed: 0,
    totalPrincipalOutstanding: 0,
    totalInterestAccrued: 0,
    totalRepaid: 0,
    overdueAmount: 0,
    par30Amount: 0,
    par90Amount: 0,
    defaultedOutstanding: 0,
    defaultedPrincipal: 0,
    recoveries: 0,
    delinquentDaysPastDue: []
  });

  assert.equal(result.par30Rate, 0);
  assert.equal(result.par90Rate, 0);
  assert.equal(result.defaultRate, 0);
  assert.equal(result.recoveryRate, 0);
  assert.equal(result.avgDaysPastDue, 0);
});

test('buildPortfolioKpis computes current-loan profile correctly', () => {
  const result = buildPortfolioKpis({
    asOf: new Date().toISOString(),
    activeLoansCount: 1,
    totalDisbursed: 1000,
    totalPrincipalOutstanding: 800,
    totalInterestAccrued: 120,
    totalRepaid: 200,
    overdueAmount: 0,
    par30Amount: 0,
    par90Amount: 0,
    defaultedOutstanding: 0,
    defaultedPrincipal: 0,
    recoveries: 0,
    delinquentDaysPastDue: []
  });

  assert.equal(result.par30Rate, 0);
  assert.equal(result.par90Rate, 0);
  assert.equal(result.defaultRate, 0);
});

test('buildPortfolioKpis computes delinquency and default rates', () => {
  const result = buildPortfolioKpis({
    asOf: new Date().toISOString(),
    activeLoansCount: 3,
    totalDisbursed: 3000,
    totalPrincipalOutstanding: 1000,
    totalInterestAccrued: 300,
    totalRepaid: 1100,
    overdueAmount: 250,
    par30Amount: 400,
    par90Amount: 200,
    defaultedOutstanding: 300,
    defaultedPrincipal: 500,
    recoveries: 100,
    delinquentDaysPastDue: [35, 102]
  });

  assert.equal(result.par30Rate, 0.4);
  assert.equal(result.par90Rate, 0.2);
  assert.equal(result.defaultRate, 0.3);
  assert.equal(result.recoveryRate, 0.2);
  assert.equal(result.avgDaysPastDue, 68.5);
});

test('buildPortfolioKpis guards divide-by-zero when outstanding is zero', () => {
  const result = buildPortfolioKpis({
    asOf: new Date().toISOString(),
    activeLoansCount: 1,
    totalDisbursed: 500,
    totalPrincipalOutstanding: 0,
    totalInterestAccrued: 20,
    totalRepaid: 520,
    overdueAmount: 0,
    par30Amount: 100,
    par90Amount: 100,
    defaultedOutstanding: 100,
    defaultedPrincipal: 200,
    recoveries: 10,
    delinquentDaysPastDue: [90]
  });

  assert.equal(result.par30Rate, 0);
  assert.equal(result.par90Rate, 0);
  assert.equal(result.defaultRate, 0);
  assert.equal(result.recoveryRate, 0.05);
});

test('computeParBucketsFromLoans maps DPD ranges correctly', () => {
  const result = computeParBucketsFromLoans([
    { dpd: 3, outstandingAmount: 100 },
    { dpd: 12, outstandingAmount: 200 },
    { dpd: 35, outstandingAmount: 300 },
    { dpd: 75, outstandingAmount: 400 },
    { dpd: 120, outstandingAmount: 500 }
  ]);

  const byBucket = new Map(result.buckets.map((row) => [row.bucket, row]));
  assert.equal(byBucket.get('PAR_1_7')?.count, 1);
  assert.equal(byBucket.get('PAR_8_30')?.count, 1);
  assert.equal(byBucket.get('PAR_31_60')?.count, 1);
  assert.equal(byBucket.get('PAR_61_90')?.count, 1);
  assert.equal(byBucket.get('PAR_90_PLUS')?.count, 1);
  assert.equal(result.par30, 1200);
  assert.equal(result.par90, 500);
});

test('computeDelinquencyRatios handles divide-by-zero safely', () => {
  const zero = computeDelinquencyRatios({
    totalOutstanding: 0,
    par30Outstanding: 100,
    par90Outstanding: 50
  });
  assert.equal(zero.par30Ratio, 0);
  assert.equal(zero.nplRatio, 0);

  const nonZero = computeDelinquencyRatios({
    totalOutstanding: 1000,
    par30Outstanding: 250,
    par90Outstanding: 100
  });
  assert.equal(nonZero.par30Ratio, 0.25);
  assert.equal(nonZero.nplRatio, 0.1);
});
