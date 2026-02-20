import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { FeeApplyAt, FeeType, InterestType, RepaymentFrequency } from '@prisma/client';
import { computeOffer } from './offer-engine';

const baseProduct = {
  id: 'prod_1',
  name: 'Standard',
  currency: 'NGN',
  interestType: InterestType.FLAT,
  interestRateBps: 2400,
  repaymentFrequency: RepaymentFrequency.WEEKLY,
  graceDays: 0
};

test('computeOffer generates installment counts for each frequency', () => {
  const frequencies: Array<[RepaymentFrequency, number]> = [
    [RepaymentFrequency.DAILY, 10],
    [RepaymentFrequency.WEEKLY, 2],
    [RepaymentFrequency.BIWEEKLY, 1],
    [RepaymentFrequency.MONTHLY, 1]
  ];
  for (const [frequency, expected] of frequencies) {
    const result = computeOffer(
      { ...baseProduct, repaymentFrequency: frequency },
      [],
      { principalMinor: 100_000, tenorDays: 10, startDate: new Date('2026-02-18T00:00:00.000Z') }
    );
    assert.equal(result.schedule.length, expected);
  }
});

test('computeOffer keeps exact money totals with rounding remainder on last installment', () => {
  const result = computeOffer(
    { ...baseProduct, repaymentFrequency: RepaymentFrequency.MONTHLY, interestRateBps: 1000 },
    [],
    { principalMinor: 100_001, tenorDays: 31, startDate: new Date('2026-02-18T00:00:00.000Z') }
  );
  const principalBySchedule = result.schedule.reduce((sum, item) => sum + item.principal, 0);
  const totalBySchedule = result.schedule.reduce((sum, item) => sum + item.total, 0);
  assert.equal(principalBySchedule, result.totals.principal);
  assert.equal(totalBySchedule, result.totals.total);
});

test('computeOffer applies fees by applyAt rules', () => {
  const fees = [
    { id: 'f1', name: 'Processing', type: FeeType.FIXED, amount: 3000, applyAt: FeeApplyAt.UPFRONT },
    { id: 'f2', name: 'Service', type: FeeType.FIXED, amount: 2000, applyAt: FeeApplyAt.PER_INSTALLMENT },
    { id: 'f3', name: 'Exit', type: FeeType.FIXED, amount: 500, applyAt: FeeApplyAt.END },
    { id: 'f4', name: 'Risk', type: FeeType.PERCENT_OF_PRINCIPAL, amount: 100, applyAt: FeeApplyAt.UPFRONT }
  ];
  const result = computeOffer(
    { ...baseProduct, repaymentFrequency: RepaymentFrequency.WEEKLY, interestType: InterestType.REDUCING },
    fees,
    { principalMinor: 100_000, tenorDays: 14, startDate: new Date('2026-02-18T00:00:00.000Z') }
  );
  assert.equal(result.schedule.length, 2);
  assert.equal(result.schedule[0].fees > 0, true);
  assert.equal(result.schedule[1].fees > 0, true);
  assert.equal(result.totals.fees, 3000 + 2000 + 500 + 1000);
});
