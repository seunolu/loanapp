import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantAdminRole, TenantLoanApplicationStatus } from '@prisma/client';
import { LoanApplicationsService } from '../loan-applications.service';

type TransitionHarnessOptions = {
  initialStatus: TenantLoanApplicationStatus;
  failHistoryInsert?: boolean;
  balances?: {
    principal: number;
    interest: number;
    fees: number;
  };
};

function buildTransitionHarness(options: TransitionHarnessOptions) {
  const now = new Date('2026-02-17T12:00:00.000Z');

  let committedApplication = {
    id: 'app_1',
    tenantId: 'tenant_1',
    status: options.initialStatus,
    fullName: 'Ada Okafor',
    phone: '+2348012345678',
    email: 'ada@example.com',
    dob: null as Date | null,
    address: 'Lekki, Lagos',
    amount: 250000,
    tenorMonths: 6,
    purpose: 'Business expansion',
    employmentStatus: 'EMPLOYED',
    incomeBand: '200k-500k',
    requestedAmount: new Prisma.Decimal(250000),
    approvedAmount: new Prisma.Decimal(250000),
    disbursedAmount: null as Prisma.Decimal | null,
    annualInterestRate: null as Prisma.Decimal | null,
    lastAccruedAt: null as Date | null,
    outstandingPrincipal: new Prisma.Decimal(0),
    outstandingInterest: new Prisma.Decimal(0),
    outstandingFees: new Prisma.Decimal(0),
    delinquencyStatus: 'CURRENT',
    daysPastDue: 0,
    overdueAmountCents: BigInt(0),
    lastDelinquencyCalcAt: null as Date | null,
    interestAccrualPaused: false,
    interestPausedAt: null as Date | null,
    interestPausedById: null as string | null,
    interestPauseReason: null as string | null,
    interestOverrideRate: null as Prisma.Decimal | null,
    interestOverrideSetAt: null as Date | null,
    interestOverrideSetById: null as string | null,
    createdAt: now,
    updatedAt: now
  };

  let committedHistories: Array<{
    id: string;
    tenantId: string;
    loanApplicationId: string;
    fromStatus: TenantLoanApplicationStatus | null;
    toStatus: TenantLoanApplicationStatus;
    note: string | null;
    changedByUserId: string | null;
    changedAt: Date;
  }> = [];

  const callLog = {
    updateCalls: [] as Array<{ where: { id: string }; data: { status: TenantLoanApplicationStatus } }>,
    historyCreateCalls: [] as Array<{
      tenantId: string;
      loanApplicationId: string;
      fromStatus: TenantLoanApplicationStatus;
      toStatus: TenantLoanApplicationStatus;
      note: string | null;
      changedByUserId: string | null;
    }>,
    auditTransitionCalls: [] as Array<{
      tenantId?: string | null;
      entityId?: string | null;
      from: string | null;
      to: string;
    }>,
    notificationCalls: [] as Array<{
      loanApplicationId: string;
      fromStatus: string | null;
      toStatus: string;
    }>
  };

  const prisma = {
    $transaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
      let draftApplication = { ...committedApplication };
      const draftHistories = [...committedHistories];

      const tx = {
        tenantLoanApplication: {
          findFirst: async ({ where }: { where: { id: string; tenantId: string } }) => {
            if (where.id === draftApplication.id && where.tenantId === draftApplication.tenantId) {
              return { ...draftApplication };
            }
            return null;
          },
          update: async (args: { where: { id: string }; data: { status: TenantLoanApplicationStatus } }) => {
            callLog.updateCalls.push(args);
            if (args.where.id !== draftApplication.id) {
              throw new Error('Application not found in draft transaction state');
            }
            draftApplication = {
              ...draftApplication,
              status: args.data.status,
              updatedAt: new Date(draftApplication.updatedAt.getTime() + 1000)
            };
            return { ...draftApplication };
          }
        },
        loanApplicationStatusHistory: {
          create: async ({
            data
          }: {
            data: {
              tenantId: string;
              loanApplicationId: string;
              fromStatus: TenantLoanApplicationStatus;
              toStatus: TenantLoanApplicationStatus;
              note: string | null;
              changedByUserId: string | null;
            };
          }) => {
            callLog.historyCreateCalls.push(data);
            if (options.failHistoryInsert) {
              throw new Error('Simulated history insert failure');
            }
            draftHistories.push({
              id: `hist_${draftHistories.length + 1}`,
              tenantId: data.tenantId,
              loanApplicationId: data.loanApplicationId,
              fromStatus: data.fromStatus,
              toStatus: data.toStatus,
              note: data.note,
              changedByUserId: data.changedByUserId,
              changedAt: new Date(now.getTime() + 2000)
            });
            return draftHistories[draftHistories.length - 1];
          }
        },
        tenantAdminUser: {
          findMany: async () => []
        }
      };

      const result = await callback(tx);
      committedApplication = draftApplication;
      committedHistories = draftHistories;
      return result;
    },
    loanApplicationStatusHistory: {
      findMany: async ({
        where
      }: {
        where: { loanApplicationId: string; tenantId: string };
        orderBy: { changedAt: 'desc' };
      }) => {
        return committedHistories
          .filter(
            (item) => item.loanApplicationId === where.loanApplicationId && item.tenantId === where.tenantId
          )
          .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
          .map((item) => ({ ...item }));
      }
    },
    tenantDisbursement: {
      findUnique: async () => null
    },
    loanRepayment: {
      findMany: async () => []
    },
    loanRepaymentScheduleItem: {
      findMany: async () => []
    },
    tenantLedgerEntry: {
      findMany: async () => []
    },
    tenantLedgerLine: {
      findMany: async () => []
    }
  };

  const tenantScopedPrisma = {
    findTenantLoanApplicationById: async (id: string) => {
      if (id !== committedApplication.id) {
        throw new Error('Application not found');
      }
      return { ...committedApplication };
    }
  };

  const service = new LoanApplicationsService(
    prisma as any,
    { requireResolvedTenantId: async () => committedApplication.tenantId } as any,
    tenantScopedPrisma as any,
    {
      logTransition: async (payload: {
        tenantId?: string | null;
        entityId?: string | null;
        from: string | null;
        to: string;
      }) => {
        callLog.auditTransitionCalls.push(payload);
      }
    } as any,
    {} as any,
    {
      getBalances: async () => ({
        principalOutstanding: new Prisma.Decimal(options.balances?.principal ?? 0),
        interestOutstanding: new Prisma.Decimal(options.balances?.interest ?? 0),
        feesOutstanding: new Prisma.Decimal(options.balances?.fees ?? 0),
        totalOutstanding: new Prisma.Decimal(
          (options.balances?.principal ?? 0) +
            (options.balances?.interest ?? 0) +
            (options.balances?.fees ?? 0)
        )
      })
    } as any,
    {} as any,
    { getRiskSnapshot: async () => ({ assessment: { decision: 'APPROVE' }, overrideEnabled: true }), listActiveHolds: async () => [] } as any,
    { hasOpenAlertAtOrAbove: async () => false, incrementBehaviorSnapshot: async () => undefined } as any,
    { assertBorrowerNotRestricted: async () => undefined } as any,
    { increment: () => undefined, observeLatency: () => undefined } as any,
    {
      publishLoanStatusChanged: async (payload: {
        loanApplicationId: string;
        fromStatus: string | null;
        toStatus: string;
      }) => {
        callLog.notificationCalls.push(payload);
      }
    } as any,
    { get: () => ({ requestId: 'req_test', actorId: 'admin_1' }) } as any,
    { applyWriteOff: async () => undefined } as any
  );

  return {
    service,
    callLog,
    getCommittedStatus: () => committedApplication.status,
    getCommittedHistoryCount: () => committedHistories.length
  };
}

test('transitionStatus success: updates status and inserts history in one transaction', async () => {
  const harness = buildTransitionHarness({
    initialStatus: TenantLoanApplicationStatus.UNDER_REVIEW
  });

  const result = await harness.service.transitionStatus(
    'tenant_1',
    'app_1',
    TenantLoanApplicationStatus.APPROVED,
    TenantAdminRole.RISK_MANAGER,
    'Meets policy requirements',
    'admin_1'
  );

  assert.equal(harness.callLog.updateCalls.length, 1);
  assert.deepEqual(harness.callLog.updateCalls[0], {
    where: { id: 'app_1' },
    data: { status: TenantLoanApplicationStatus.APPROVED }
  });

  assert.equal(harness.callLog.historyCreateCalls.length, 1);
  assert.deepEqual(harness.callLog.historyCreateCalls[0], {
    tenantId: 'tenant_1',
    loanApplicationId: 'app_1',
    fromStatus: TenantLoanApplicationStatus.UNDER_REVIEW,
    toStatus: TenantLoanApplicationStatus.APPROVED,
    note: 'Meets policy requirements',
    changedByUserId: 'admin_1'
  });

  assert.equal(harness.getCommittedStatus(), TenantLoanApplicationStatus.APPROVED);
  assert.equal(harness.getCommittedHistoryCount(), 1);
  assert.equal(harness.callLog.auditTransitionCalls.length, 1);
  assert.equal(harness.callLog.notificationCalls.length, 1);
  assert.equal(result.status, TenantLoanApplicationStatus.APPROVED);
  assert.equal(result.histories.length, 1);
});

test('transitionStatus rollback: if history insert fails, status is not committed', async () => {
  const harness = buildTransitionHarness({
    initialStatus: TenantLoanApplicationStatus.UNDER_REVIEW,
    failHistoryInsert: true
  });

  await assert.rejects(
    () =>
      harness.service.transitionStatus(
        'tenant_1',
        'app_1',
        TenantLoanApplicationStatus.APPROVED,
        TenantAdminRole.RISK_MANAGER,
        'Approve with exception',
        'admin_1'
      ),
    /Simulated history insert failure/
  );

  assert.equal(harness.callLog.updateCalls.length, 1);
  assert.equal(harness.callLog.historyCreateCalls.length, 1);
  assert.equal(harness.getCommittedStatus(), TenantLoanApplicationStatus.UNDER_REVIEW);
  assert.equal(harness.getCommittedHistoryCount(), 0);
});

test('transitionStatus throws ForbiddenException when role is not allowed for valid transition', async () => {
  const harness = buildTransitionHarness({
    initialStatus: TenantLoanApplicationStatus.UNDER_REVIEW
  });

  await assert.rejects(
    () =>
      harness.service.transitionStatus(
        'tenant_1',
        'app_1',
        TenantLoanApplicationStatus.APPROVED,
        TenantAdminRole.CREDIT_OFFICER,
        'Attempt without permission',
        'admin_1'
      ),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      assert.match((error as Error).message, /cannot transition UNDER_REVIEW -> APPROVED/);
      return true;
    }
  );

  assert.equal(harness.callLog.updateCalls.length, 0);
  assert.equal(harness.callLog.historyCreateCalls.length, 0);
  assert.equal(harness.getCommittedStatus(), TenantLoanApplicationStatus.UNDER_REVIEW);
  assert.equal(harness.getCommittedHistoryCount(), 0);
});

test('transitionStatus REPAID is blocked when computed balances are not zero', async () => {
  const harness = buildTransitionHarness({
    initialStatus: TenantLoanApplicationStatus.DISBURSED,
    balances: { principal: 10, interest: 1, fees: 0 }
  });

  await assert.rejects(
    () =>
      harness.service.transitionStatus(
        'tenant_1',
        'app_1',
        TenantLoanApplicationStatus.REPAID,
        TenantAdminRole.OPS,
        'close loan',
        'admin_1'
      ),
    /outstanding balance exists/
  );

  assert.equal(harness.callLog.updateCalls.length, 0);
  assert.equal(harness.callLog.historyCreateCalls.length, 0);
});
