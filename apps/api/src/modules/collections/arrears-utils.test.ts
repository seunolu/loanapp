import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { CollectionsStage, Prisma } from '@prisma/client';
import { calculateDpd, determineCollectionsStage, sumOutstanding } from './arrears-utils';

test('calculateDpd computes full days from earliest unpaid due date', () => {
  const now = new Date('2026-02-20T00:00:00.000Z');
  assert.equal(calculateDpd(now, null), 0);
  assert.equal(calculateDpd(now, new Date('2026-02-19T01:00:00.000Z')), 0);
  assert.equal(calculateDpd(now, new Date('2026-02-18T00:00:00.000Z')), 2);
});

test('determineCollectionsStage thresholds', () => {
  assert.equal(determineCollectionsStage(1), CollectionsStage.SOFT);
  assert.equal(determineCollectionsStage(14), CollectionsStage.SOFT);
  assert.equal(determineCollectionsStage(15), CollectionsStage.FIELD);
  assert.equal(determineCollectionsStage(60), CollectionsStage.FIELD);
  assert.equal(determineCollectionsStage(61), CollectionsStage.LEGAL);
});

test('sumOutstanding aggregates remaining balances', () => {
  const items = [
    {
      totalDue: new Prisma.Decimal(100),
      totalPaid: new Prisma.Decimal(20)
    },
    {
      totalDue: new Prisma.Decimal(50),
      totalPaid: new Prisma.Decimal(50)
    }
  ];
  assert.equal(sumOutstanding(items).toString(), '80');
});

