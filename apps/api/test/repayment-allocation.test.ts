import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@prisma/client';
import { allocateRepaymentToSchedule } from '../src/loan/repayment/repayment.service';

function d(value: number | string) {
  return new Prisma.Decimal(value);
}

const now = new Date('2026-02-10T00:00:00.000Z');

test('partial repayment on one installment', () => {
  const result = allocateRepaymentToSchedule(
    d(50),
    [
      {
        id: 's1',
        installmentNumber: 1,
        dueDate: new Date('2026-02-20T00:00:00.000Z'),
        principalDue: d(100),
        interestDue: d(20),
        feesDue: d(10),
        principalPaid: d(0),
        interestPaid: d(0),
        feesPaid: d(0),
        totalDue: d(130),
        totalPaid: d(0)
      }
    ],
    now,
    now
  );

  assert.equal(result.allocations.length, 1);
  assert.equal(result.allocations[0].feesPaid.toString(), '10');
  assert.equal(result.allocations[0].interestPaid.toString(), '20');
  assert.equal(result.allocations[0].principalPaid.toString(), '20');
});

test('repayment spanning multiple installments', () => {
  const result = allocateRepaymentToSchedule(
    d(260),
    [
      {
        id: 's1',
        installmentNumber: 1,
        dueDate: new Date('2026-02-01T00:00:00.000Z'),
        principalDue: d(100),
        interestDue: d(20),
        feesDue: d(10),
        principalPaid: d(0),
        interestPaid: d(0),
        feesPaid: d(0),
        totalDue: d(130),
        totalPaid: d(0)
      },
      {
        id: 's2',
        installmentNumber: 2,
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        principalDue: d(100),
        interestDue: d(20),
        feesDue: d(10),
        principalPaid: d(0),
        interestPaid: d(0),
        feesPaid: d(0),
        totalDue: d(130),
        totalPaid: d(0)
      }
    ],
    now,
    now
  );

  assert.equal(result.allocations.length, 2);
  assert.equal(result.amountLeft.toString(), '0');
});

test('overdue installment gets paid before future installment', () => {
  const result = allocateRepaymentToSchedule(
    d(40),
    [
      {
        id: 'future',
        installmentNumber: 2,
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        principalDue: d(100),
        interestDue: d(10),
        feesDue: d(10),
        principalPaid: d(0),
        interestPaid: d(0),
        feesPaid: d(0),
        totalDue: d(120),
        totalPaid: d(0)
      },
      {
        id: 'overdue',
        installmentNumber: 1,
        dueDate: new Date('2026-01-01T00:00:00.000Z'),
        principalDue: d(100),
        interestDue: d(10),
        feesDue: d(10),
        principalPaid: d(0),
        interestPaid: d(0),
        feesPaid: d(0),
        totalDue: d(120),
        totalPaid: d(0)
      }
    ],
    now,
    now
  );

  assert.equal(result.allocations[0].itemId, 'overdue');
});

test('final repayment can close remaining installment balance', () => {
  const result = allocateRepaymentToSchedule(
    d(5),
    [
      {
        id: 's1',
        installmentNumber: 1,
        dueDate: new Date('2026-01-01T00:00:00.000Z'),
        principalDue: d(100),
        interestDue: d(10),
        feesDue: d(10),
        principalPaid: d(100),
        interestPaid: d(10),
        feesPaid: d(5),
        totalDue: d(120),
        totalPaid: d(115)
      }
    ],
    now,
    now
  );

  assert.equal(result.updates[0].status, 'PAID');
  assert.equal(result.amountLeft.toString(), '0');
});
