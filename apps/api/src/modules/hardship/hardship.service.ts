import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  LoanRepaymentScheduleItemStatus,
  NotificationAudienceType,
  NotificationDeliveryChannel,
  Prisma,
  RepaymentFrequency,
  TenantAdminRole,
  TenantLoanApplicationStatus
} from '@prisma/client';
import { generateSchedule } from '../../loan/repayment/amortization';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationsService } from '../../common/notifications/notifications.service';

const TERMINAL_STATUSES: HardshipStatus[] = ['APPROVED', 'REJECTED', 'CANCELLED'];
const ACTIVE_STATUSES: HardshipStatus[] = ['REQUESTED', 'UNDER_REVIEW'];
type HardshipStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type HardshipType = 'PAYMENT_PAUSE' | 'TENOR_EXTENSION' | 'RATE_REDUCTION';
type HardshipRequestRow = {
  id: string;
  tenantId: string;
  borrowerId: string;
  loanApplicationId: string;
  type: HardshipType;
  reason: string;
  proposedTenorMonths: number | null;
  proposedRate: Prisma.Decimal | null;
  pauseDays: number | null;
  status: HardshipStatus;
  decisionNotes: string | null;
  approvedByAdminId: string | null;
  createdAt: Date;
  decidedAt: Date | null;
};

function periodDays(frequency: RepaymentFrequency): number {
  switch (frequency) {
    case RepaymentFrequency.DAILY:
      return 1;
    case RepaymentFrequency.WEEKLY:
      return 7;
    case RepaymentFrequency.BIWEEKLY:
      return 14;
    case RepaymentFrequency.MONTHLY:
    default:
      return 30;
  }
}

@Injectable()
export class HardshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  private assertAdminTransitionRole(role: TenantAdminRole, toStatus: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'): void {
    if (role === 'SUPER_ADMIN') {
      return;
    }
    if (toStatus === 'UNDER_REVIEW' && role === 'CREDIT_OFFICER') {
      return;
    }
    if ((toStatus === 'APPROVED' || toStatus === 'REJECTED') && role === 'RISK_MANAGER') {
      return;
    }
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Role ${role} cannot transition hardship request to ${toStatus}.`,
      details: null
    });
  }

  private assertTransitionAllowed(from: HardshipStatus, to: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED') {
    if (from === 'REQUESTED' && (to === 'UNDER_REVIEW' || to === 'REJECTED')) {
      return;
    }
    if (from === 'UNDER_REVIEW' && (to === 'APPROVED' || to === 'REJECTED')) {
      return;
    }
    throw new BadRequestException({
      code: 'BAD_REQUEST',
      message: `Invalid hardship transition ${from} -> ${to}.`,
      details: null
    });
  }

  private async notifyCreditOfficerGroup(
    tx: Prisma.TransactionClient,
    input: { tenantId: string; hardshipId: string; title: string; body: string; templateKey: string; dataJson: Prisma.InputJsonValue }
  ): Promise<void> {
    const recipients = await tx.tenantAdminUser.findMany({
      where: { tenantId: input.tenantId, role: TenantAdminRole.CREDIT_OFFICER },
      select: { id: true }
    });
    for (const recipient of recipients) {
      await this.notificationsService.createNotification(
        {
          tenantId: input.tenantId,
          audienceType: NotificationAudienceType.ADMIN,
          audienceUserId: recipient.id,
          channel: NotificationDeliveryChannel.IN_APP,
          templateKey: input.templateKey,
          title: input.title,
          body: input.body,
          dataJson: input.dataJson,
          idempotencyKey: `hardship:${input.hardshipId}:${input.templateKey}:credit:${recipient.id}`
        },
        tx
      );
    }
  }

  private async notifyCollectionsGroup(
    tx: Prisma.TransactionClient,
    input: { tenantId: string; hardshipId: string; title: string; body: string; dataJson: Prisma.InputJsonValue }
  ): Promise<void> {
    const recipients = await tx.tenantAdminUser.findMany({
      where: { tenantId: input.tenantId, role: TenantAdminRole.COLLECTIONS },
      select: { id: true }
    });
    for (const recipient of recipients) {
      await this.notificationsService.createNotification(
        {
          tenantId: input.tenantId,
          audienceType: NotificationAudienceType.ADMIN,
          audienceUserId: recipient.id,
          channel: NotificationDeliveryChannel.IN_APP,
          templateKey: 'HARDSHIP_APPROVED',
          title: input.title,
          body: input.body,
          dataJson: input.dataJson,
          idempotencyKey: `hardship:${input.hardshipId}:approved:collections:${recipient.id}`
        },
        tx
      );
    }
  }

  async createBorrowerRequest(
    borrower: BorrowerPrincipal,
    input: {
      loanApplicationId: string;
      type: HardshipType;
      reason: string;
      proposedTenorMonths?: number;
      proposedRate?: number;
      pauseDays?: number;
    }
  ) {
    const created = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.tenantLoanApplication.findFirst({
        where: { id: input.loanApplicationId, tenantId: borrower.tenantId }
      });
      if (!loan || loan.phone !== borrower.phone) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan application not found.',
          details: { loanApplicationId: input.loanApplicationId }
        });
      }
      if (loan.status !== TenantLoanApplicationStatus.DISBURSED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Hardship can only be requested for DISBURSED loans.',
          details: { status: loan.status }
        });
      }
      const active = await (tx as any).hardshipRequest.findFirst({
        where: {
          tenantId: borrower.tenantId,
          borrowerId: borrower.borrowerId,
          loanApplicationId: loan.id,
          status: { in: ACTIVE_STATUSES }
        },
        select: { id: true }
      });
      if (active) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'An active hardship request already exists for this loan.',
          details: { hardshipRequestId: active.id }
        });
      }

      const request = await (tx as any).hardshipRequest.create({
        data: {
          tenantId: borrower.tenantId,
          borrowerId: borrower.borrowerId,
          loanApplicationId: loan.id,
          type: input.type,
          reason: input.reason.trim(),
          proposedTenorMonths: input.proposedTenorMonths ?? null,
          proposedRate: input.proposedRate ? new Prisma.Decimal(input.proposedRate) : null,
          pauseDays: input.pauseDays ?? null,
          status: 'REQUESTED'
        }
      });
      await (tx as any).hardshipStatusHistory.create({
        data: {
          hardshipRequestId: request.id,
          fromStatus: 'REQUESTED',
          toStatus: 'REQUESTED'
        }
      });

      await this.notifyCreditOfficerGroup(tx, {
        tenantId: borrower.tenantId,
        hardshipId: request.id,
        templateKey: 'HARDSHIP_REQUEST_CREATED',
        title: 'New hardship request',
        body: `Borrower submitted hardship request ${request.id}.`,
        dataJson: {
          hardshipRequestId: request.id,
          loanApplicationId: request.loanApplicationId,
          type: request.type
        } as Prisma.InputJsonValue
      });

      await this.auditService.log({
        tx,
        tenantId: borrower.tenantId,
        actorType: 'BORROWER',
        actorId: borrower.borrowerId,
        action: 'HARDSHIP_REQUEST_CREATED',
        entity: 'HARDSHIP_REQUEST',
        entityId: request.id,
        metadata: {
          loanApplicationId: request.loanApplicationId,
          type: request.type
        }
      });

      return request;
    });

    return created;
  }

  async listBorrowerRequests(
    borrower: BorrowerPrincipal,
    query: { status?: HardshipStatus; page: number; limit: number }
  ) {
    const where = {
      tenantId: borrower.tenantId,
      borrowerId: borrower.borrowerId,
      ...(query.status ? { status: query.status } : {})
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      (this.prisma as any).hardshipRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit
      }),
      (this.prisma as any).hardshipRequest.count({ where })
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit))
    };
  }

  async getBorrowerRequest(borrower: BorrowerPrincipal, id: string) {
    const row = await (this.prisma as any).hardshipRequest.findFirst({
      where: { id, tenantId: borrower.tenantId, borrowerId: borrower.borrowerId },
      include: { history: { orderBy: { createdAt: 'asc' } } }
    });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Hardship request not found.', details: { id } });
    }
    return row;
  }

  async listAdminRequests(principal: TenantAdminPrincipal, query: { status?: HardshipStatus; page: number; pageSize: number }) {
    const where = {
      tenantId: principal.tenantId,
      ...(query.status ? { status: query.status } : {})
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      (this.prisma as any).hardshipRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize
      }),
      (this.prisma as any).hardshipRequest.count({ where })
    ]);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    };
  }

  private async applyApprovedMutation(
    tx: Prisma.TransactionClient,
    request: HardshipRequestRow,
    principal: TenantAdminPrincipal
  ): Promise<void> {
    const loan = await tx.tenantLoanApplication.findFirst({
      where: { id: request.loanApplicationId, tenantId: request.tenantId }
    });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan not found for hardship request.',
        details: { loanApplicationId: request.loanApplicationId }
      });
    }
    if (loan.status !== TenantLoanApplicationStatus.DISBURSED) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Only DISBURSED loans can be mutated by hardship approval.',
        details: { status: loan.status }
      });
    }

    if (request.type === 'PAYMENT_PAUSE') {
      const pauseDays = request.pauseDays ?? 0;
      if (pauseDays <= 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'pauseDays is required for PAYMENT_PAUSE approvals.',
          details: null
        });
      }
      const pausedUntil = new Date();
      pausedUntil.setUTCDate(pausedUntil.getUTCDate() + pauseDays);
      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          interestAccrualPaused: true,
          interestPausedAt: new Date(),
          interestPausedUntil: pausedUntil,
          interestPauseReason: `Hardship approved (${request.id})`,
          interestPausedById: principal.adminId
        } as any
      });
      return;
    }

    const items = await tx.loanRepaymentScheduleItem.findMany({
      where: { tenantId: request.tenantId, loanApplicationId: loan.id },
      orderBy: [{ installmentNumber: 'asc' }]
    });
    const paid = items.filter((item) => item.status === LoanRepaymentScheduleItemStatus.PAID);
    const unpaid = items.filter((item) => item.status !== LoanRepaymentScheduleItemStatus.PAID);

    if (unpaid.some((item) => item.totalPaid.gt(0))) {
      throw new ConflictException({
        code: 'STATE_CONFLICT',
        message: 'Cannot recalculate schedule when a future installment is partially paid.',
        details: null
      });
    }

    const startDate = new Date();
    let annualRateBps = loan.annualInterestRateBps;
    let termInDays = Math.max(periodDays(loan.repaymentFrequency), unpaid.length * periodDays(loan.repaymentFrequency));

    if (request.type === 'TENOR_EXTENSION') {
      const proposedTenorMonths = request.proposedTenorMonths ?? 0;
      if (proposedTenorMonths <= 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'proposedTenorMonths is required for TENOR_EXTENSION approvals.',
          details: null
        });
      }
      termInDays = Math.max(proposedTenorMonths * 30, periodDays(loan.repaymentFrequency));
    }

    if (request.type === 'RATE_REDUCTION') {
      const proposedRate = request.proposedRate ? Number(request.proposedRate) : 0;
      if (!proposedRate || proposedRate <= 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'proposedRate is required for RATE_REDUCTION approvals.',
          details: null
        });
      }
      annualRateBps = Math.round(proposedRate * 100);
    }

    const generated = generateSchedule({
      principal: loan.outstandingPrincipal,
      annualInterestRateBps: annualRateBps,
      startDate,
      repaymentFrequency: loan.repaymentFrequency,
      termInDays,
      interestMethod: 'REDUCING_BALANCE',
      feesTotal: 0
    });

    await tx.loanRepaymentScheduleItem.deleteMany({
      where: { tenantId: request.tenantId, loanApplicationId: loan.id, status: { not: LoanRepaymentScheduleItemStatus.PAID } }
    });

    for (let i = 0; i < generated.length; i += 1) {
      const item = generated[i];
      await tx.loanRepaymentScheduleItem.create({
        data: {
          tenantId: request.tenantId,
          loanApplicationId: loan.id,
          installmentNumber: paid.length + i + 1,
          dueDate: item.dueDate,
          currency: loan.currency,
          principalDue: item.principalDue,
          interestDue: item.interestDue,
          feesDue: item.feesDue,
          totalDue: item.totalDue,
          principalPaid: new Prisma.Decimal(0),
          interestPaid: new Prisma.Decimal(0),
          feesPaid: new Prisma.Decimal(0),
          totalPaid: new Prisma.Decimal(0),
          status: LoanRepaymentScheduleItemStatus.PENDING
        }
      });
    }

    const remainingFromPaid = paid.reduce(
      (acc, row) => {
        acc.principal = acc.principal.plus(row.principalDue.minus(row.principalPaid));
        acc.interest = acc.interest.plus(row.interestDue.minus(row.interestPaid));
        acc.fees = acc.fees.plus(row.feesDue.minus(row.feesPaid));
        return acc;
      },
      {
        principal: new Prisma.Decimal(0),
        interest: new Prisma.Decimal(0),
        fees: new Prisma.Decimal(0)
      }
    );

    const newPrincipal = generated.reduce((sum, row) => sum.plus(row.principalDue), new Prisma.Decimal(0));
    const newInterest = generated.reduce((sum, row) => sum.plus(row.interestDue), new Prisma.Decimal(0));
    const newFees = generated.reduce((sum, row) => sum.plus(row.feesDue), new Prisma.Decimal(0));

    const outstandingPrincipal = remainingFromPaid.principal.plus(newPrincipal);
    const outstandingInterest = remainingFromPaid.interest.plus(newInterest);
    const outstandingFees = remainingFromPaid.fees.plus(newFees);
    const outstandingTotal = outstandingPrincipal.plus(outstandingInterest).plus(outstandingFees);

    await tx.tenantLoanApplication.update({
      where: { id: loan.id },
      data: {
        annualInterestRateBps: annualRateBps,
        annualInterestRate:
          request.type === 'RATE_REDUCTION' && request.proposedRate
            ? request.proposedRate
            : loan.annualInterestRate,
        outstandingPrincipal,
        outstandingInterest,
        outstandingFees,
        outstandingTotal,
        nextDueDate: generated[0]?.dueDate ?? loan.nextDueDate
      }
    });
  }

  async transitionRequest(
    principal: TenantAdminPrincipal,
    hardshipId: string,
    input: {
      toStatus: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
      decisionNotes?: string;
    }
  ) {
    this.assertAdminTransitionRole(principal.role, input.toStatus);
    return this.prisma.$transaction(async (tx) => {
      const request = await (tx as any).hardshipRequest.findFirst({
        where: { id: hardshipId, tenantId: principal.tenantId }
      });
      if (!request) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Hardship request not found.', details: { hardshipId } });
      }
      if (TERMINAL_STATUSES.includes(request.status)) {
        throw new ConflictException({
          code: 'STATE_CONFLICT',
          message: 'Hardship request is already in a terminal status.',
          details: { status: request.status }
        });
      }
      this.assertTransitionAllowed(request.status, input.toStatus);

      if (input.toStatus === 'APPROVED') {
        await this.applyApprovedMutation(tx, request, principal);
      }

      const updated = await (tx as any).hardshipRequest.update({
        where: { id: request.id },
        data: {
          status: input.toStatus,
          decisionNotes: input.decisionNotes?.trim() || null,
          approvedByAdminId: input.toStatus === 'APPROVED' ? principal.adminId : null,
          decidedAt: input.toStatus === 'APPROVED' || input.toStatus === 'REJECTED' ? new Date() : null
        }
      });
      await (tx as any).hardshipStatusHistory.create({
        data: {
          hardshipRequestId: request.id,
          fromStatus: request.status,
          toStatus: input.toStatus,
          changedByAdminId: principal.adminId
        }
      });

      if (input.toStatus === 'APPROVED') {
        await this.notificationsService.createNotification(
          {
            tenantId: request.tenantId,
            audienceType: NotificationAudienceType.BORROWER,
            audienceUserId: request.borrowerId,
            channel: NotificationDeliveryChannel.IN_APP,
            templateKey: 'HARDSHIP_APPROVED',
            title: 'Hardship request approved',
            body: `Your hardship request ${request.id} has been approved.`,
            dataJson: { hardshipRequestId: request.id, loanApplicationId: request.loanApplicationId } as Prisma.InputJsonValue,
            idempotencyKey: `hardship:${request.id}:approved:borrower:${request.borrowerId}`
          },
          tx
        );
        await this.notifyCollectionsGroup(tx, {
          tenantId: request.tenantId,
          hardshipId: request.id,
          title: 'Hardship approved',
          body: `Hardship request ${request.id} was approved.`,
          dataJson: { hardshipRequestId: request.id, loanApplicationId: request.loanApplicationId } as Prisma.InputJsonValue
        });
      }

      await this.auditService.log({
        tx,
        tenantId: principal.tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: principal.adminId,
        actorRole: principal.role,
        action: 'HARDSHIP_STATUS_TRANSITION',
        entity: 'HARDSHIP_REQUEST',
        entityId: request.id,
        metadata: {
          fromStatus: request.status,
          toStatus: input.toStatus
        }
      });

      return updated;
    });
  }
}
