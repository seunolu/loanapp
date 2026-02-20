import { BadRequestException, Injectable } from '@nestjs/common';
import { DelinquencyStatus, Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { assertTenantMatch } from '../../common/tenant/assert-tenant-match';
import { assertRoleCanTransition } from '../loan-applications/loan-application-transition-rbac';
import { assertValidTransition } from '../loan-applications/loan-application-status-transition';

export type DelinquencyBucket = 'CURRENT' | 'DPD_1_30' | 'DPD_31_60' | 'DPD_61_90' | 'DPD_90_PLUS';

@Injectable()
export class DelinquencyService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateDaysPastDue(
    loanId: string,
    tenantId: string,
    now = new Date(),
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const earliest = await db.loanRepaymentScheduleItem.findFirst({
      where: {
        tenantId,
        loanApplicationId: loanId,
        dueDate: { lt: now },
        totalDue: { gt: new Prisma.Decimal(0) },
        OR: [{ status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, { isOverdue: true }]
      },
      orderBy: { dueDate: 'asc' }
    });

    if (!earliest) {
      return 0;
    }
    return Math.max(0, Math.floor((now.getTime() - earliest.dueDate.getTime()) / 86_400_000));
  }

  determineBucket(dpd: number): DelinquencyBucket {
    if (dpd <= 0) return 'CURRENT';
    if (dpd <= 30) return 'DPD_1_30';
    if (dpd <= 60) return 'DPD_31_60';
    if (dpd <= 90) return 'DPD_61_90';
    return 'DPD_90_PLUS';
  }

  async updateLoanDelinquency(
    loanId: string,
    tenantId: string,
    now = new Date(),
    tx?: Prisma.TransactionClient
  ): Promise<{ daysPastDue: number; bucket: DelinquencyBucket; overdueAmountCents: bigint }> {
    const db = tx ?? this.prisma;
    const loan = await db.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanId }
      });
    }
    assertTenantMatch(loan.tenantId, tenantId);

    const items = await db.loanRepaymentScheduleItem.findMany({
      where: { tenantId, loanApplicationId: loanId },
      orderBy: { dueDate: 'asc' }
    });

    let overdueAmount = new Prisma.Decimal(0);
    let earliestOverdue: Date | null = null;
    for (const item of items) {
      const remaining = Prisma.Decimal.max(new Prisma.Decimal(0), item.totalDue.minus(item.totalPaid));
      const isOverdue = now.getTime() > item.dueDate.getTime() && remaining.gt(0);
      if (item.isOverdue !== isOverdue || item.overdueSince?.getTime() !== (isOverdue ? (item.overdueSince ?? item.dueDate).getTime() : undefined)) {
        await db.loanRepaymentScheduleItem.update({
          where: { id: item.id },
          data: {
            isOverdue,
            overdueSince: isOverdue ? item.overdueSince ?? item.dueDate : null,
            status: isOverdue
              ? 'OVERDUE'
              : remaining.eq(0)
                ? 'PAID'
                : item.totalPaid.gt(0)
                  ? 'PARTIAL'
                  : 'PENDING'
          }
        });
      }
      if (isOverdue) {
        overdueAmount = overdueAmount.plus(remaining);
        if (!earliestOverdue || item.dueDate.getTime() < earliestOverdue.getTime()) {
          earliestOverdue = item.dueDate;
        }
      }
    }

    const dpd = earliestOverdue ? Math.max(0, Math.floor((now.getTime() - earliestOverdue.getTime()) / 86_400_000)) : 0;
    const bucket = this.determineBucket(dpd);
    const overdueAmountCents = BigInt(overdueAmount.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toString());

    const delinquencyStatus = overdueAmountCents > 0n ? DelinquencyStatus.OVERDUE : DelinquencyStatus.CURRENT;
    const previousBucket = (loan.delinquencyBucket as DelinquencyBucket | null) ?? 'CURRENT';

    const nextStatus =
      overdueAmountCents > 0n
        ? loan.status === TenantLoanApplicationStatus.DISBURSED
          ? TenantLoanApplicationStatus.OVERDUE
          : loan.status
        : loan.status === TenantLoanApplicationStatus.OVERDUE
          ? TenantLoanApplicationStatus.DISBURSED
          : loan.status;

    if (nextStatus !== loan.status) {
      assertValidTransition(loan.status, nextStatus);
      assertRoleCanTransition({ role: 'SYSTEM', from: loan.status, to: nextStatus });
    }

    await db.tenantLoanApplication.update({
      where: { id: loan.id },
      data: {
        daysPastDue: dpd,
        delinquencyBucket: bucket,
        overdueAmountCents,
        delinquencyStatus,
        lastDelinquencyCalcAt: now,
        ...(nextStatus !== loan.status ? { status: nextStatus } : {})
      }
    });

    if (previousBucket !== bucket) {
      await db.delinquencyEvent.create({
        data: {
          tenantId,
          loanId: loan.id,
          dpd,
          bucket,
          triggeredAt: now
        }
      });
    }

    if (nextStatus !== loan.status) {
      await db.loanApplicationStatusHistory.create({
        data: {
          tenantId,
          loanApplicationId: loan.id,
          fromStatus: loan.status,
          toStatus: nextStatus,
          note: `SYSTEM transition during delinquency update: ${loan.status} -> ${nextStatus}`,
          changedByUserId: null
        }
      });
    }

    return { daysPastDue: dpd, bucket, overdueAmountCents };
  }

  async recalcLoanDelinquency(
    loanId: string,
    tenantId: string,
    now = new Date()
  ): Promise<{ daysPastDue: number; bucket: DelinquencyBucket; overdueAmountCents: bigint }> {
    return this.prisma.$transaction((tx) => this.updateLoanDelinquency(loanId, tenantId, now, tx));
  }
}
