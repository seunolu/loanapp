import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { DelinquencyService } from './delinquency.service';

test('determineBucket maps DPD ranges correctly', () => {
  const service = new DelinquencyService({} as any);
  assert.equal(service.determineBucket(0), 'CURRENT');
  assert.equal(service.determineBucket(1), 'DPD_1_30');
  assert.equal(service.determineBucket(30), 'DPD_1_30');
  assert.equal(service.determineBucket(31), 'DPD_31_60');
  assert.equal(service.determineBucket(61), 'DPD_61_90');
  assert.equal(service.determineBucket(120), 'DPD_90_PLUS');
});

test('calculateDaysPastDue returns zero with no overdue schedule', async () => {
  const service = new DelinquencyService({
    loanRepaymentScheduleItem: { findFirst: async () => null }
  } as any);
  const dpd = await service.calculateDaysPastDue('loan', 'tenant', new Date('2026-02-01T00:00:00.000Z'));
  assert.equal(dpd, 0);
});

test('calculateDaysPastDue uses earliest unpaid due date', async () => {
  const service = new DelinquencyService({
    loanRepaymentScheduleItem: {
      findFirst: async () => ({
        dueDate: new Date('2026-01-20T00:00:00.000Z'),
        totalDue: new Prisma.Decimal(100),
        totalPaid: new Prisma.Decimal(0)
      })
    }
  } as any);
  const dpd = await service.calculateDaysPastDue('loan', 'tenant', new Date('2026-02-01T00:00:00.000Z'));
  assert.equal(dpd, 12);
});
