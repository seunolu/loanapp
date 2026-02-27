import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { LoanApplicationsService } from '../loan-applications.service';

function buildHarness(status: TenantLoanApplicationStatus, failLedger = false) {
  const now = new Date('2026-02-18T00:00:00.000Z');
  let committedLoan = {
    id: 'loan_1',
    tenantId: 'tenant_1',
    status,
    disbursedAmount: null as Prisma.Decimal | null
  };
  let committedLines: any[] = [];

  const prisma = {
    $transaction: async <T>(cb: (tx: any) => Promise<T>) => {
      const draftLoan = { ...committedLoan };
      const draftLines = [...committedLines];
      const tx = {
        tenantLoanApplication: {
          findFirst: async () => ({ ...draftLoan }),
          update: async ({ data }: any) => {
            draftLoan.status = data.status;
            draftLoan.disbursedAmount = data.disbursedAmount;
            return { ...draftLoan };
          }
        },
        loanApplicationStatusHistory: {
          create: async () => ({})
        },
        ledgerAccount: {
          findMany: async () => [
            { id: 'acc_cash', code: 'CASH' },
            { id: 'acc_recv', code: 'LOAN_PRINCIPAL_RECEIVABLE' }
          ]
        },
        journalEntry: {
          create: async ({ data }: any) => ({ id: 'je_1', ...data })
        },
        journalLine: {
          createMany: async ({ data }: any) => {
            if (failLedger) {
              throw new Error('ledger failure');
            }
            draftLines.push(...data);
            return { count: data.length };
          }
        }
      };
      const result = await cb(tx);
      committedLoan = draftLoan;
      committedLines = draftLines;
      return result;
    },
    tenantDisbursement: { findUnique: async () => null },
    tenantRepayment: { findMany: async () => [] },
    tenantRepaymentSchedule: { findMany: async () => [] },
    loanApplicationStatusHistory: { findMany: async () => [] },
    tenantLedgerEntry: { findMany: async () => [] }
  };

  const service = new LoanApplicationsService(
    prisma as any,
    { requireResolvedTenantId: async () => 'tenant_1' } as any,
    { findTenantLoanApplicationById: async () => ({ ...committedLoan, fullName: '', phone: '', amount: 0, tenorMonths: 0, createdAt: now, updatedAt: now, requestedAmount: new Prisma.Decimal(0), approvedAmount: null, annualInterestRate: null, lastAccruedAt: null, outstandingPrincipal: new Prisma.Decimal(0), outstandingInterest: new Prisma.Decimal(0), outstandingFees: new Prisma.Decimal(0), purpose: null, employmentStatus: null, incomeBand: null, email: null, dob: null, address: null }) } as any,
    {} as any,
    {} as any,
    {
      getBalances: async () => ({
        principalOutstanding: new Prisma.Decimal(0),
        interestOutstanding: new Prisma.Decimal(0),
        feesOutstanding: new Prisma.Decimal(0),
        totalOutstanding: new Prisma.Decimal(0)
      })
    } as any,
    {
      ensureCoreAccounts: async () => undefined,
      createJournalEntry: async (input: any, tx: any) => {
        const lineWriter = tx?.journalLine?.createMany;
        if (lineWriter) {
          await lineWriter({
            data: input.lines.map((line: any) => ({
              journalEntryId: 'je_1',
              accountId: line.accountId,
              ledgerAccountId: line.accountId,
              tenantId: input.tenantId,
              debitMinor: line.debitMinor ?? 0,
              creditMinor: line.creditMinor ?? 0,
              entryType: line.debitMinor > 0 ? 'DEBIT' : 'CREDIT',
              amountKobo: line.debitMinor > 0 ? line.debitMinor : line.creditMinor
            }))
          });
        }
        return { id: 'je_1' };
      }
    } as any,
    {} as any,
    { hasOpenAlertAtOrAbove: async () => false, incrementBehaviorSnapshot: async () => undefined } as any,
    { assertBorrowerNotRestricted: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    { publishLoanStatusChanged: async () => undefined } as any,
    { get: () => ({ requestId: 'req_test', actorId: 'admin_1' }) } as any,
    { applyWriteOff: async () => undefined } as any
  );

  return {
    service,
    getLoan: () => committedLoan,
    getLines: () => committedLines
  };
}

test('disbursement creates balanced debit/credit lines and updates status', async () => {
  const harness = buildHarness(TenantLoanApplicationStatus.APPROVED);
  await harness.service.disburseLoan('loan_1', 50000);
  assert.equal(harness.getLoan().status, TenantLoanApplicationStatus.DISBURSED);
  assert.equal(harness.getLines().length, 2);
  assert.equal(harness.getLines()[0].debitMinor + harness.getLines()[1].debitMinor, 50000);
  assert.equal(harness.getLines()[0].creditMinor + harness.getLines()[1].creditMinor, 50000);
});

test('disbursement rejects non-approved loans', async () => {
  const harness = buildHarness(TenantLoanApplicationStatus.SUBMITTED);
  await assert.rejects(() => harness.service.disburseLoan('loan_1', 50000), BadRequestException);
});

test('disbursement is atomic when ledger write fails', async () => {
  const harness = buildHarness(TenantLoanApplicationStatus.APPROVED, true);
  await assert.rejects(() => harness.service.disburseLoan('loan_1', 50000), /ledger failure/);
  assert.equal(harness.getLoan().status, TenantLoanApplicationStatus.APPROVED);
  assert.equal(harness.getLines().length, 0);
});
