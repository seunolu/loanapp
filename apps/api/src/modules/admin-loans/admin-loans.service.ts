import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Scope
} from '@nestjs/common';
import { LoanApplicationStatus, LoanOfferStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { OfferCalculatorService } from '../../common/offer-calculator/offer-calculator.service';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../../common/pagination/cursor-pagination';
import type { ApproveLoanApplicationDto } from './dto/approve-loan-application.dto';
import type { AccruePenaltyDto } from './dto/accrue-penalty.dto';
import type { AccruePenaltyResponseDto } from './dto/accrue-penalty-response.dto';
import type { ApproveLoanApplicationResponseDto } from './dto/approve-loan-application-response.dto';
import type { ListLoanApplicationsQueryDto } from './dto/list-loan-applications-query.dto';
import type { ListLoanApplicationsResponseDto } from './dto/list-loan-applications-response.dto';
import type { ListPenaltiesResponseDto } from './dto/list-penalties-response.dto';
import type { OfferPreviewResponseDto } from './dto/offer-preview-response.dto';
import type { LoanScheduleResponseDto } from '../loans/dto/loan-schedule-response.dto';
import type { RejectLoanApplicationDto } from './dto/reject-loan-application.dto';
import type { RejectLoanApplicationResponseDto } from './dto/reject-loan-application-response.dto';
import { OverdueService } from '../loans/overdue.service';
import { PenaltyService } from './penalty.service';

@Injectable({ scope: Scope.REQUEST })
export class AdminLoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly offerCalculatorService: OfferCalculatorService,
    private readonly overdueService: OverdueService,
    private readonly penaltyService: PenaltyService
  ) {}

  async listApplications(
    principal: AdminPrincipal,
    query: ListLoanApplicationsQueryDto
  ): Promise<ListLoanApplicationsResponseDto> {
    const take = query.limit ?? 50;
    const status = query.status ?? LoanApplicationStatus.SUBMITTED;
    const cursor = decodeCursor(query.cursor);
    const search = query.query?.trim();
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;
    const whereAnd: Prisma.LoanApplicationWhereInput[] = [{ lenderId: principal.lenderId, status }];
    if (search) {
      whereAnd.push({
        OR: [{ id: { contains: search, mode: 'insensitive' } }, { borrowerId: { contains: search, mode: 'insensitive' } }]
      });
    }
    if (fromDate || toDate) {
      whereAnd.push({
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {})
        }
      });
    }
    const cursorWhere = buildDescCreatedAtCursorWhere(cursor);
    if (cursorWhere) {
      whereAnd.push(cursorWhere);
    }

    const rows = await this.prisma.loanApplication.findMany({
      where: { AND: whereAnd },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1
    });

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;

    return {
      items: items.map((item) => ({
        id: item.id,
        borrowerId: item.borrowerId,
        amountRequested: item.amountRequested,
        tenorDays: item.tenorDays,
        status: item.status,
        submittedAt: item.submittedAt.toISOString(),
        reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
        reviewReason: item.reviewReason
      })),
      nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null
    };
  }

  async previewOffer(
    principal: AdminPrincipal,
    applicationId: string,
    input: ApproveLoanApplicationDto
  ): Promise<OfferPreviewResponseDto> {
    const payload = input ?? {};
    const existing = await this.prisma.loanApplication.findUnique({ where: { id: applicationId } });
    if (!existing || existing.lenderId !== principal.lenderId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: null
      });
    }

    this.assertOverridePermission(principal, payload.pricingOverride);
    const lender = await this.prisma.lender.findUnique({
      where: { id: principal.lenderId },
      select: { settings: true }
    });

    const calculated = this.offerCalculatorService.calculate({
      amountRequested: existing.amountRequested,
      tenorDays: existing.tenorDays,
      lenderSettings: lender?.settings ?? null,
      pricingOverride: payload.pricingOverride
    });

    return {
      applicationId: existing.id,
      principalAmount: calculated.principalAmount,
      interestAmount: calculated.interestAmount,
      feeAmount: calculated.feeAmount,
      totalRepayable: calculated.totalRepayable,
      expiresAt: calculated.expiresAt.toISOString(),
      scheduleType: calculated.scheduleType,
      schedule: calculated.schedule.map((item) => ({
        dueDate: item.dueDate.toISOString(),
        amount: item.amount
      })),
      pricingSnapshot: calculated.pricingSnapshot
    };
  }

  async approveApplication(
    principal: AdminPrincipal,
    applicationId: string,
    input: ApproveLoanApplicationDto
  ): Promise<ApproveLoanApplicationResponseDto> {
    const payload = input ?? {};
    this.assertOverridePermission(principal, payload.pricingOverride);

    const existing = await this.prisma.loanApplication.findUnique({ where: { id: applicationId } });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: null
      });
    }

    if (existing.lenderId !== principal.lenderId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: null
      });
    }

    if (existing.status !== LoanApplicationStatus.SUBMITTED) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Only submitted applications can be approved.',
        details: {
          status: existing.status
        }
      });
    }

    const underwriting = await this.prisma.underwritingCase.findFirst({
      where: {
        loanApplicationId: existing.id,
        lenderId: principal.lenderId
      },
      include: {
        checklistItems: {
          where: {
            code: { in: ['KYC_APPROVED', 'ID_VERIFIED'] }
          }
        }
      }
    });

    if (!underwriting || underwriting.status !== 'COMPLETED') {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Underwriting must be completed before approval.',
        details: {
          applicationId: existing.id
        }
      });
    }

    const requiredCodes = ['KYC_APPROVED', 'ID_VERIFIED'] as const;
    for (const code of requiredCodes) {
      const item = underwriting.checklistItems.find((entry) => entry.code === code);
      if (!item || item.status !== 'PASSED') {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Required underwriting checklist items must be passed before approval.',
          details: {
            applicationId: existing.id,
            missingOrFailedCode: code
          }
        });
      }
    }

    const existingOffer = await this.prisma.loanOffer.findUnique({
      where: { loanApplicationId: applicationId },
      select: { id: true }
    });
    if (existingOffer) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'An offer already exists for this application.',
        details: {
          offerId: existingOffer.id
        }
      });
    }

    const lender = await this.prisma.lender.findUnique({
      where: { id: principal.lenderId },
      select: { settings: true }
    });

    const calculated = this.offerCalculatorService.calculate({
      amountRequested: existing.amountRequested,
      tenorDays: existing.tenorDays,
      lenderSettings: lender?.settings ?? null,
      pricingOverride: payload.pricingOverride
    });

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.loanOffer.create({
        data: {
          loanApplicationId: existing.id,
          lenderId: existing.lenderId,
          borrowerId: existing.borrowerId,
          status: LoanOfferStatus.OFFERED,
          principalAmount: calculated.principalAmount,
          interestAmount: calculated.interestAmount,
          feeAmount: calculated.feeAmount,
          totalRepayable: calculated.totalRepayable,
          offeredByAdminId: principal.adminId,
          offeredAt: now,
          expiresAt: calculated.expiresAt
        }
      });

      await tx.loanOfferScheduleItem.createMany({
        data: calculated.schedule.map((item) => ({
          loanOfferId: offer.id,
          dueDate: item.dueDate,
          amount: item.amount
        }))
      });

      const application = await tx.loanApplication.update({
        where: { id: existing.id },
        data: {
          status: LoanApplicationStatus.APPROVED,
          reviewedAt: now,
          reviewReason: null
        }
      });

      return { offer, application };
    });

    await this.auditService.write({
      event: 'LOAN_APPLICATION_APPROVED',
      actorType: 'ADMIN',
      actorId: principal.adminId,
      metadata: {
        before: this.applicationSnapshot(existing),
        after: this.applicationSnapshot(result.application),
        offer: {
          id: result.offer.id,
          status: result.offer.status,
          totalRepayable: result.offer.totalRepayable
        },
        pricingSnapshot: calculated.pricingSnapshot,
        schedule: calculated.schedule.map((item) => ({
          dueDate: item.dueDate.toISOString(),
          amount: item.amount
        }))
      }
    });

    return {
      applicationId: result.application.id,
      status: 'APPROVED',
      offerId: result.offer.id,
      offerStatus: 'OFFERED'
    };
  }

  private assertOverridePermission(
    principal: AdminPrincipal,
    pricingOverride: ApproveLoanApplicationDto['pricingOverride']
  ): void {
    if (!pricingOverride) {
      return;
    }
    const hasAnyOverride =
      pricingOverride.interestRateBpsMonthly !== undefined ||
      pricingOverride.originationFeeKoboFlat !== undefined ||
      pricingOverride.originationFeeBps !== undefined ||
      pricingOverride.scheduleType !== undefined ||
      pricingOverride.offerExpiryHours !== undefined;
    if (!hasAnyOverride) {
      return;
    }

    if (principal.role === 'OPS') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'OPS role cannot apply pricing overrides.',
        details: null
      });
    }
    if (principal.role !== 'SUPER_ADMIN' && principal.role !== 'FINANCE') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not allowed to apply pricing overrides.',
        details: null
      });
    }
  }

  async rejectApplication(
    principal: AdminPrincipal,
    applicationId: string,
    input: RejectLoanApplicationDto
  ): Promise<RejectLoanApplicationResponseDto> {
    const existing = await this.prisma.loanApplication.findUnique({ where: { id: applicationId } });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: null
      });
    }

    if (existing.lenderId !== principal.lenderId) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: null
      });
    }

    if (existing.status !== LoanApplicationStatus.SUBMITTED) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Only submitted applications can be rejected.',
        details: {
          status: existing.status
        }
      });
    }

    const updated = await this.prisma.loanApplication.update({
      where: { id: existing.id },
      data: {
        status: LoanApplicationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewReason: input.reason.trim()
      }
    });

    await this.auditService.write({
      event: 'LOAN_APPLICATION_REJECTED',
      actorType: 'ADMIN',
      actorId: principal.adminId,
      metadata: {
        before: this.applicationSnapshot(existing),
        after: this.applicationSnapshot(updated)
      }
    });

    return {
      applicationId: updated.id,
      status: 'REJECTED',
      reviewReason: updated.reviewReason ?? input.reason.trim()
    };
  }

  async getScheduleForAdmin(principal: AdminPrincipal, loanId: string): Promise<LoanScheduleResponseDto> {
    await this.overdueService.reconcileLoanStatus(loanId);

    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        lenderId: principal.lenderId
      },
      include: {
        repaymentSchedule: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan not found.',
        details: null
      });
    }

    return {
      loanId: loan.id,
      items: loan.repaymentSchedule.map((item) => ({
        id: item.id,
        dueDate: item.dueDate.toISOString(),
        amount: item.amount,
        paidAmountKobo: item.paidAmountKobo,
        status: item.status,
        paidAt: item.paidAt ? item.paidAt.toISOString() : null
      }))
    };
  }

  async accruePenalty(principal: AdminPrincipal, loanId: string, input: AccruePenaltyDto): Promise<AccruePenaltyResponseDto> {
    await this.assertLoanTenant(loanId, principal.lenderId);
    const result = await this.penaltyService.accrueDailyPenalty(loanId, input.accrualDate);

    await this.auditService.write({
      event: 'PENALTY_ACCRUED',
      actorType: 'ADMIN',
      actorId: principal.adminId,
      metadata: {
        entityType: 'LOAN',
        entityId: loanId,
        accrualId: result.accrual.id,
        accrualDate: result.accrual.accrualDate.toISOString(),
        amountKobo: result.accrual.amountKobo,
        journalEntryId: result.accrual.journalEntryId,
        created: result.created,
        before: result.beforeBalance,
        after: result.afterBalance
      }
    });

    return {
      created: result.created,
      accrual: {
        id: result.accrual.id,
        loanId: result.accrual.loanId,
        accrualDate: result.accrual.accrualDate.toISOString(),
        amountKobo: result.accrual.amountKobo,
        journalEntryId: result.accrual.journalEntryId,
        createdAt: result.accrual.createdAt.toISOString()
      }
    };
  }

  async listPenalties(principal: AdminPrincipal, loanId: string): Promise<ListPenaltiesResponseDto> {
    await this.assertLoanTenant(loanId, principal.lenderId);
    const rows = await this.penaltyService.listPenalties(loanId);
    return {
      loanId,
      items: rows.map((item) => ({
        id: item.id,
        loanId: item.loanId,
        accrualDate: item.accrualDate.toISOString(),
        amountKobo: item.amountKobo,
        journalEntryId: item.journalEntryId,
        createdAt: item.createdAt.toISOString()
      }))
    };
  }

  private applicationSnapshot(app: {
    id: string;
    borrowerId: string;
    status: LoanApplicationStatus;
    amountRequested: number;
    tenorDays: number;
    reviewedAt: Date | null;
    reviewReason: string | null;
  }) {
    return {
      id: app.id,
      borrowerId: app.borrowerId,
      status: app.status,
      amountRequested: app.amountRequested,
      tenorDays: app.tenorDays,
      reviewedAt: app.reviewedAt ? app.reviewedAt.toISOString() : null,
      reviewReason: app.reviewReason
    };
  }

  private async assertLoanTenant(loanId: string, lenderId: string): Promise<void> {
    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, lenderId },
      select: { id: true }
    });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan not found.',
        details: null
      });
    }
  }
}
