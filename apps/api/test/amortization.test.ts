import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { RepaymentFrequency } from '@prisma/client';
import { generateSchedule } from '../src/loan/repayment/amortization';

test('generateSchedule principal totals equal principal amount', () => {
  const schedule = generateSchedule({
    principal: '10000.00',
    annualInterestRateBps: 2400,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    repaymentFrequency: RepaymentFrequency.MONTHLY,
    termInDays: 180,
    interestMethod: 'REDUCING_BALANCE'
  });
  const totalPrincipal = schedule.reduce((sum, item) => sum + Number(item.principalDue.toString()), 0);
  assert.equal(totalPrincipal.toFixed(2), '10000.00');
});

test('generateSchedule reducing-balance interest decreases over time', () => {
  const schedule = generateSchedule({
    principal: '12000.00',
    annualInterestRateBps: 1200,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    repaymentFrequency: RepaymentFrequency.MONTHLY,
    termInDays: 150
  });
  assert.ok(schedule.length > 2);
  assert.ok(Number(schedule[0].interestDue.toString()) >= Number(schedule[1].interestDue.toString()));
  assert.ok(
    Number(schedule[schedule.length - 2].interestDue.toString()) >=
      Number(schedule[schedule.length - 1].interestDue.toString())
  );
});

test('generateSchedule supports weekly and monthly frequencies', () => {
  const weekly = generateSchedule({
    principal: '7000.00',
    annualInterestRateBps: 1800,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    repaymentFrequency: RepaymentFrequency.WEEKLY,
    termInDays: 35
  });
  const monthly = generateSchedule({
    principal: '7000.00',
    annualInterestRateBps: 1800,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    repaymentFrequency: RepaymentFrequency.MONTHLY,
    termInDays: 35
  });
  assert.equal(weekly.length, 5);
  assert.equal(monthly.length, 2);
});

test('generateSchedule applies last-installment rounding adjustment', () => {
  const schedule = generateSchedule({
    principal: '100.01',
    annualInterestRateBps: 0,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    repaymentFrequency: RepaymentFrequency.MONTHLY,
    termInDays: 90
  });
  const principal = schedule.reduce((sum, item) => sum + Number(item.principalDue.toString()), 0);
  assert.equal(principal.toFixed(2), '100.01');
});
