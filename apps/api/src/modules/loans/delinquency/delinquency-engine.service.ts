import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  DelinquencyStatus,
  LoanRepaymentScheduleItem,
  Prisma,
  TenantAdminRole,
  TenantLoanApplicationStatus
} from '@prisma/client';
import { AuditService } from '../../../common/audit/audit.service';
import { PrismaService } from '../../../common/database/prisma.service';
import { assertRoleCanTransition } from '../../loan-applications/loan-application-transition-rbac';
import { assertValidTransition } from '../../loan-applications/loan-application-status-transition';

const CENTS = new Prisma.Decimal(100);

function toCents(value: Prisma.Decimal): bigint {
  return BigInt(value.mul(CENTS).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toString());
}

function remainingAmount(item: LoanRepaymentScheduleItem): Prisma.Decimal {
  return Prisma.Decimal.max(new Prisma.Decimal(0), item.totalDue.minus(item.totalPaid));
}

@Injectable()
export class DelinquencyEngineService {
  private readonly logger = new Logger(DelinquencyEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  computeScheduleItemOverdue(item: LoanRepaymentScheduleItem, now: Date): {
    isOverdue: boolean;
    overdueSince: Date | null;
    remaining: Prisma.Decimal;
  } {
    const remaining = remainingAmount(item);
    const isOverdue = now.getTime() > item.dueDate.getTime() && remaining.gt(0);
    return {
      isOverdue,
      overdueSince: isOverdue ? item.overdueSince ?? item.dueDate : null,
      remaining
    };
  }

  async computeLoanDelinquency(loanId: string, tenantId: string, now: Date): Promise<{
    daysPastDue: number;
    overdueAmountCents: bigint;
    delinquencyStatus: DelinquencyStatus;
  }> {
    const items = await this.prisma.loanRepaymentScheduleItem.findMany({
      where: { tenantId, loanApplicationId: loanId },
      orderBy: { dueDate: 'asc' }
    });

    let earliestOverdue: Date | null = null;
    let overdueAmount = new Prisma.Decimal(0);

    for (const item of items) {
      const computed = this.computeScheduleItemOverdue(item, now);
      if (!computed.isOverdue) {
        continue;
      }
      overdueAmount = overdueAmount.plus(computed.remaining);
      if (!earliestOverdue || item.dueDate.getTime() < earliestOverdue.getTime()) {
        earliestOverdue = item.dueDate;
      }
    }

    const daysPastDue = earliestOverdue
      ? Math.max(0, Math.floor((now.getTime() - earliestOverdue.getTime()) / 86_400_000))
      : 0;
    const overdueAmountCents = toCents(overdueAmount);

    return {
      daysPastDue,
      overdueAmountCents,
      delinquencyStatus: overdueAmountCents > 0n ? DelinquencyStatus.OVERDUE : DelinquencyStatus.CURRENT
    };
  }

  async recalcLoanDelinquencyTx(
    tx: Prisma.TransactionClient,
    loanId: string,
    tenantId: string,
    now: Date,
    actorRole: TenantAdminRole = 'SYSTEM',
    actorId: string | null = null
  ): Promise<{
    daysPastDue: number;
    overdueAmountCents: bigint;
    delinquencyStatus: DelinquencyStatus;
  }> {
    const loan = await tx.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanId }
      });
    }

    const items = await tx.loanRepaymentScheduleItem.findMany({
      where: { tenantId, loanApplicationId: loanId },
      orderBy: { dueDate: 'asc' }
    });

    let earliestOverdue: Date | null = null;
    let overdueAmount = new Prisma.Decimal(0);

    for (const item of items) {
      const computed = this.computeScheduleItemOverdue(item, now);
      if (item.isOverdue !== computed.isOverdue || item.overdueSince?.getTime() !== computed.overdueSince?.getTime()) {
        await tx.loanRepaymentScheduleItem.update({
          where: { id: item.id },
          data: {
            isOverdue: computed.isOverdue,
            overdueSince: computed.overdueSince
          }
        });
      }
      if (!computed.isOverdue) {
        continue;
      }
      overdueAmount = overdueAmount.plus(computed.remaining);
      if (!earliestOverdue || item.dueDate.getTime() < earliestOverdue.getTime()) {
        earliestOverdue = item.dueDate;
      }
    }

    const daysPastDue = earliestOverdue
      ? Math.max(0, Math.floor((now.getTime() - earliestOverdue.getTime()) / 86_400_000))
      : 0;
    const overdueAmountCents = toCents(overdueAmount);
    const delinquencyStatus = overdueAmountCents > 0n ? DelinquencyStatus.OVERDUE : DelinquencyStatus.CURRENT;

    const nextLifecycleStatus =
      delinquencyStatus === DelinquencyStatus.OVERDUE ? TenantLoanApplicationStatus.OVERDUE : TenantLoanApplicationStatus.DISBURSED;
    const shouldMoveToOverdue =
      loan.status === TenantLoanApplicationStatus.DISBURSED &&
      nextLifecycleStatus === TenantLoanApplicationStatus.OVERDUE;
    const shouldReturnToDisbursed =
      loan.status === TenantLoanApplicationStatus.OVERDUE &&
      nextLifecycleStatus === TenantLoanApplicationStatus.DISBURSED;

    if (shouldMoveToOverdue || shouldReturnToDisbursed) {
      assertValidTransition(loan.status, nextLifecycleStatus);
      assertRoleCanTransition({
        role: actorRole,
        from: loan.status,
        to: nextLifecycleStatus
      });
    }

    await tx.tenantLoanApplication.update({
      where: { id: loan.id },
      data: {
        daysPastDue,
        overdueAmountCents,
        delinquencyStatus,
        lastDelinquencyCalcAt: now,
        ...(shouldMoveToOverdue || shouldReturnToDisbursed ? { status: nextLifecycleStatus } : {})
      }
    });

    if (shouldMoveToOverdue || shouldReturnToDisbursed) {
      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId,
          loanApplicationId: loan.id,
          fromStatus: loan.status,
          toStatus: nextLifecycleStatus,
          note:
            nextLifecycleStatus === TenantLoanApplicationStatus.OVERDUE
              ? 'SYSTEM transition: delinquency became OVERDUE'
              : 'SYSTEM transition: delinquency returned to CURRENT',
          changedByUserId: actorId
        }
      });
    }

    return { daysPastDue, overdueAmountCents, delinquencyStatus };
  }

  async recalcLoanDelinquency(
    loanId: string,
    tenantId: string,
    now = new Date(),
    actorRole: TenantAdminRole = 'SYSTEM',
    actorId: string | null = null
  ) {
    const result = await this.prisma.$transaction((tx) =>
      this.recalcLoanDelinquencyTx(tx, loanId, tenantId, now, actorRole, actorId)
    );

    void this.auditService.log({
      tenantId,
      actorType: 'SYSTEM',
      action: 'DELINQUENCY_RECALCULATED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: loanId,
      metadata: {
        daysPastDue: result.daysPastDue,
        overdueAmountCents: result.overdueAmountCents.toString(),
        delinquencyStatus: result.delinquencyStatus
      }
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Failed to write delinquency audit loan=${loanId}: ${message}`);
    });

    return result;
  }
}
