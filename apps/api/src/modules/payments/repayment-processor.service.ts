import { Injectable, Scope } from '@nestjs/common';
import {
  LoanStatus,
  PaymentPurpose,
  PaymentStatus,
  RepaymentAllocationType,
  RepaymentScheduleItemStatus,
  type Prisma
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { LedgerService } from '../../common/ledger/ledger.service';
import { NotificationsService } from '../../common/notifications/notifications.service';
import { OverdueService } from '../loans/overdue.service';

type AllocationSummary = {
  fees: number;
  penalties: number;
  interest: number;
  principal: number;
  totalAllocated: number;
  unallocated: number;
};

@Injectable({ scope: Scope.REQUEST })
export class RepaymentProcessorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
    private readonly overdueService: OverdueService,
    private readonly notificationsService: NotificationsService
  ) {}

  async applyPayment(paymentId: string): Promise<void> {
    const existingRepayment = await this.prisma.repayment.findUnique({
      where: { paymentId },
      select: { id: true }
    });
    if (existingRepayment) {
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        loanId: true,
        borrowerId: true,
        amountKobo: true,
        status: true,
        purpose: true,
        reference: true,
        borrower: {
          select: {
            phone: true
          }
        }
      }
    });

    if (!payment) {
      return;
    }

    if (payment.status !== PaymentStatus.SUCCEEDED || payment.purpose !== PaymentPurpose.LOAN_REPAYMENT) {
      return;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.repayment.findUnique({
        where: { paymentId: payment.id },
        select: { id: true }
      });
      if (duplicate) {
        return null;
      }

      const loan = await tx.loan.findUnique({
        where: { id: payment.loanId },
        include: {
          balance: true
        }
      });
      if (!loan || !loan.balance) {
        return null;
      }

      const allocation = this.allocateAmount(payment.amountKobo, loan.balance);

      const repayment = await tx.repayment.create({
        data: {
          loanId: loan.id,
          paymentId: payment.id,
          amountKobo: payment.amountKobo,
          allocatedFeesKobo: allocation.fees,
          allocatedPenaltiesKobo: allocation.penalties,
          allocatedInterestKobo: allocation.interest,
          allocatedPrincipalKobo: allocation.principal,
          unallocatedKobo: allocation.unallocated
        }
      });

      const allocationRows: Prisma.RepaymentAllocationCreateManyInput[] = [];
      if (allocation.fees > 0) {
        allocationRows.push({
          repaymentId: repayment.id,
          bucket: RepaymentAllocationType.FEES,
          amountKobo: allocation.fees
        });
      }
      if (allocation.penalties > 0) {
        allocationRows.push({
          repaymentId: repayment.id,
          bucket: RepaymentAllocationType.PENALTIES,
          amountKobo: allocation.penalties
        });
      }
      if (allocation.interest > 0) {
        allocationRows.push({
          repaymentId: repayment.id,
          bucket: RepaymentAllocationType.INTEREST,
          amountKobo: allocation.interest
        });
      }
      if (allocation.principal > 0) {
        allocationRows.push({
          repaymentId: repayment.id,
          bucket: RepaymentAllocationType.PRINCIPAL,
          amountKobo: allocation.principal
        });
      }
      if (allocationRows.length > 0) {
        await tx.repaymentAllocation.createMany({
          data: allocationRows
        });
      }

      const nextOutstandingFees = loan.balance.outstandingFeesKobo - allocation.fees;
      const nextOutstandingPenalties = loan.balance.outstandingPenaltiesKobo - allocation.penalties;
      const nextOutstandingInterest = loan.balance.outstandingInterestKobo - allocation.interest;
      const nextOutstandingPrincipal = loan.balance.outstandingPrincipalKobo - allocation.principal;
      const nextTotalOutstanding =
        nextOutstandingFees +
        nextOutstandingPenalties +
        nextOutstandingInterest +
        nextOutstandingPrincipal;

      await tx.loanBalance.update({
        where: { loanId: loan.id },
        data: {
          outstandingFeesKobo: nextOutstandingFees,
          outstandingPenaltiesKobo: nextOutstandingPenalties,
          outstandingInterestKobo: nextOutstandingInterest,
          outstandingPrincipalKobo: nextOutstandingPrincipal,
          totalOutstandingKobo: nextTotalOutstanding,
          paidFeesKobo: { increment: allocation.fees },
          paidPenaltiesKobo: { increment: allocation.penalties },
          paidInterestKobo: { increment: allocation.interest },
          paidPrincipalKobo: { increment: allocation.principal },
          totalPaidKobo: { increment: allocation.totalAllocated }
        }
      });

      let remainingScheduleCoverage = allocation.totalAllocated;
      if (remainingScheduleCoverage > 0) {
        const scheduleItems = await tx.repaymentScheduleItem.findMany({
          where: { loanId: loan.id },
          orderBy: { dueDate: 'asc' }
        });
        const now = new Date();

        for (const scheduleItem of scheduleItems) {
          if (remainingScheduleCoverage <= 0) {
            break;
          }

          const outstandingItemAmount = Math.max(0, scheduleItem.amount - scheduleItem.paidAmountKobo);
          if (outstandingItemAmount <= 0) {
            continue;
          }

          const appliedToItem = Math.min(remainingScheduleCoverage, outstandingItemAmount);
          const nextPaidAmount = scheduleItem.paidAmountKobo + appliedToItem;
          const fullyPaid = nextPaidAmount >= scheduleItem.amount;
          const nextStatus = fullyPaid
            ? RepaymentScheduleItemStatus.PAID
            : scheduleItem.dueDate.getTime() < now.getTime()
              ? RepaymentScheduleItemStatus.LATE
              : RepaymentScheduleItemStatus.PENDING;

          await tx.repaymentScheduleItem.update({
            where: { id: scheduleItem.id },
            data: {
              paidAmountKobo: nextPaidAmount,
              status: nextStatus,
              paidAt: fullyPaid ? now : null
            }
          });

          remainingScheduleCoverage -= appliedToItem;
        }
      }

      let journalEntryId: string | null = null;
      if (allocation.totalAllocated > 0) {
        const journal = await this.ledgerService.postJournalEntry(
          {
            description: `Repayment applied for loan ${loan.id}`,
            reference: payment.reference,
            lines: [
              {
                accountCode: '1000',
                entryType: 'DEBIT',
                amountKobo: allocation.totalAllocated,
                description: `Repayment cash receipt ${payment.reference}`
              },
              ...(allocation.fees > 0
                ? [
                    {
                      accountCode: '4100',
                      entryType: 'CREDIT' as const,
                      amountKobo: allocation.fees,
                      description: `Repayment fees ${payment.reference}`
                    }
                  ]
                : []),
              ...(allocation.penalties > 0
                ? [
                    {
                      accountCode: '1200',
                      entryType: 'CREDIT' as const,
                      amountKobo: allocation.penalties,
                      description: `Repayment penalties ${payment.reference}`
                    }
                  ]
                : []),
              ...(allocation.interest > 0
                ? [
                    {
                      accountCode: '4000',
                      entryType: 'CREDIT' as const,
                      amountKobo: allocation.interest,
                      description: `Repayment interest ${payment.reference}`
                    }
                  ]
                : []),
              ...(allocation.principal > 0
                ? [
                    {
                      accountCode: '1100',
                      entryType: 'CREDIT' as const,
                      amountKobo: allocation.principal,
                      description: `Repayment principal ${payment.reference}`
                    }
                  ]
                : [])
            ]
          },
          tx
        );
        journalEntryId = journal.journalEntryId;

        await tx.repayment.update({
          where: { id: repayment.id },
          data: { journalEntryId }
        });
      }

      if (nextTotalOutstanding === 0 && loan.status !== LoanStatus.CLOSED) {
        await tx.loan.update({
          where: { id: loan.id },
          data: { status: LoanStatus.CLOSED }
        });
      }

      return {
        repaymentId: repayment.id,
        loanId: loan.id,
        borrowerId: payment.borrowerId,
        borrowerPhone: payment.borrower.phone,
        journalEntryId,
        allocation,
        totalOutstandingKobo: nextTotalOutstanding,
        amountKobo: payment.amountKobo
      };
    });

    if (!result) {
      return;
    }

    await this.overdueService.reconcileLoanStatus(result.loanId);

    await this.auditService.write({
      event: 'REPAYMENT_APPLIED',
      actorType: 'SYSTEM',
      actorId: null,
      metadata: {
        entityType: 'REPAYMENT',
        entityId: result.repaymentId,
        loanId: result.loanId,
        borrowerId: result.borrowerId,
        journalEntryId: result.journalEntryId,
        allocatedFeesKobo: result.allocation.fees,
        allocatedPenaltiesKobo: result.allocation.penalties,
        allocatedInterestKobo: result.allocation.interest,
        allocatedPrincipalKobo: result.allocation.principal,
        unallocatedKobo: result.allocation.unallocated,
        remainingOutstandingKobo: result.totalOutstandingKobo
      }
    });

    if (result.borrowerPhone) {
      await this.notificationsService.sendRepaymentSuccess(
        result.borrowerPhone,
        result.loanId,
        result.amountKobo
      );
    }
  }

  private allocateAmount(
    amountKobo: number,
    balance: {
      outstandingFeesKobo: number;
      outstandingPenaltiesKobo: number;
      outstandingInterestKobo: number;
      outstandingPrincipalKobo: number;
    }
  ): AllocationSummary {
    let remaining = amountKobo;

    const fees = Math.min(remaining, balance.outstandingFeesKobo);
    remaining -= fees;

    const penalties = Math.min(remaining, balance.outstandingPenaltiesKobo);
    remaining -= penalties;

    const interest = Math.min(remaining, balance.outstandingInterestKobo);
    remaining -= interest;

    const principal = Math.min(remaining, balance.outstandingPrincipalKobo);
    remaining -= principal;

    const totalAllocated = fees + penalties + interest + principal;
    return {
      fees,
      penalties,
      interest,
      principal,
      totalAllocated,
      unallocated: remaining
    };
  }
}
