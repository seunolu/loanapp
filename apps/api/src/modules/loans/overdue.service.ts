import { Injectable } from '@nestjs/common';
import { LoanStatus, RepaymentScheduleItemStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationsService } from '../../common/notifications/notifications.service';

@Injectable()
export class OverdueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async reconcileLoanStatus(loanId: string): Promise<void> {
    const now = new Date();

    await this.prisma.repaymentScheduleItem.updateMany({
      where: {
        loanId,
        dueDate: { lt: now },
        status: { not: RepaymentScheduleItemStatus.PAID }
      },
      data: { status: RepaymentScheduleItemStatus.LATE }
    });

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        status: true,
        borrower: {
          select: {
            phone: true
          }
        }
      }
    });
    if (!loan || loan.status === LoanStatus.CLOSED) {
      return;
    }

    const overdueCount = await this.prisma.repaymentScheduleItem.count({
      where: {
        loanId,
        status: RepaymentScheduleItemStatus.LATE
      }
    });
    const hasLateItems = overdueCount > 0;

    if (hasLateItems && loan.status !== LoanStatus.OVERDUE) {
      await this.prisma.loan.update({
        where: { id: loanId },
        data: { status: LoanStatus.OVERDUE }
      });

      await this.writeSystemAudit('LOAN_MARKED_OVERDUE', loanId);

      if (loan.borrower.phone) {
        await this.notificationsService.sendOverdueReminder(loan.borrower.phone, loanId);
      }
      return;
    }

    if (!hasLateItems && loan.status === LoanStatus.OVERDUE) {
      await this.prisma.loan.update({
        where: { id: loanId },
        data: { status: LoanStatus.ACTIVE }
      });

      await this.writeSystemAudit('LOAN_RETURNED_TO_ACTIVE', loanId);
    }
  }

  private async writeSystemAudit(event: string, loanId: string): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          event,
          actorType: 'SYSTEM',
          actorId: null,
          metadata: {
            entityType: 'LOAN',
            entityId: loanId
          }
        }
      });
    } catch {
      // no-op by design
    }
  }
}
