import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { KycCaseStatus, LoanApplicationStatus, LoanOfferStatus, LoanStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { RiskService } from '../../common/risk/risk.service';
import type { AcceptOfferResponseDto } from './dto/accept-offer-response.dto';
import type { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import type { CreateLoanApplicationResponseDto } from './dto/create-loan-application-response.dto';
import type { LoanApplicationDetailsDto } from './dto/loan-application-details.dto';
import type { LoanOfferDetailsDto } from './dto/loan-offer-details.dto';
import type { LoanScheduleResponseDto } from './dto/loan-schedule-response.dto';
import { OverdueService } from './overdue.service';

@Injectable({ scope: Scope.REQUEST })
export class LoansService {
  private static readonly DEFAULT_MIN_AMOUNT_KOBO = 500_000;
  private static readonly DEFAULT_MAX_AMOUNT_KOBO = 10_000_000;
  private static readonly DEFAULT_MIN_TENOR_DAYS = 7;
  private static readonly DEFAULT_MAX_TENOR_DAYS = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly overdueService: OverdueService,
    private readonly riskService: RiskService
  ) {}

  async createApplication(
    principal: BorrowerPrincipal,
    input: CreateLoanApplicationDto
  ): Promise<CreateLoanApplicationResponseDto> {
    const borrower = await this.prisma.borrower.findUnique({
      where: { id: principal.borrowerId },
      include: {
        profile: true,
        override: true,
        kycCase: true,
        lender: {
          select: { settings: true }
        }
      }
    });

    if (!borrower || borrower.lenderId !== principal.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant access is not allowed.',
        details: null
      });
    }

    const risk = await this.riskService.evaluate({
      lenderId: principal.lenderId,
      borrowerId: principal.borrowerId,
      phone: borrower.phone,
      eventType: 'LOAN_APPLICATION_SUBMIT'
    });

    if (risk.blocked || risk.level === 'HIGH') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Loan application blocked due to risk checks.',
        details: {
          reason: risk.reason ?? 'HIGH_RISK'
        }
      });
    }

    this.validateApplicationPolicy(input, borrower.lender.settings, borrower.override);

    if (!borrower.profile) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Borrower profile must be completed before loan application.',
        details: { field: 'profile' }
      });
    }

    if (!borrower.kycCase || borrower.kycCase.status !== KycCaseStatus.APPROVED) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'KYC must be approved before loan application.',
        details: { field: 'kycStatus' }
      });
    }

    const consentTypes = ['TERMS', 'DATA_CONSENT'] as const;
    const consents = await this.prisma.consentRecord.findMany({
      where: {
        borrowerId: principal.borrowerId,
        borrower: {
          lenderId: principal.lenderId
        },
        type: { in: [...consentTypes] }
      },
      select: { type: true }
    });
    const consentSet = new Set(consents.map((consent) => consent.type));

    for (const requiredType of consentTypes) {
      if (!consentSet.has(requiredType)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Required consents are missing.',
          details: {
            missingConsentType: requiredType
          }
        });
      }
    }

    const openApplication = await this.prisma.loanApplication.findFirst({
      where: {
        borrowerId: principal.borrowerId,
        lenderId: principal.lenderId,
        status: { in: [LoanApplicationStatus.SUBMITTED, LoanApplicationStatus.UNDER_REVIEW] }
      },
      select: { id: true, status: true }
    });

    if (openApplication) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'An open loan application already exists.',
        details: {
          applicationId: openApplication.id,
          status: openApplication.status
        }
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const application = await tx.loanApplication.create({
        data: {
          borrowerId: principal.borrowerId,
          lenderId: principal.lenderId,
          amountRequested: input.amountRequested,
          tenorDays: input.tenorDays,
          status: LoanApplicationStatus.SUBMITTED
        }
      });

      const underwritingCase = await tx.underwritingCase.create({
        data: {
          lenderId: principal.lenderId,
          borrowerId: principal.borrowerId,
          loanApplicationId: application.id
        }
      });

      await tx.underwritingChecklistItem.createMany({
        data: [
          {
            underwritingCaseId: underwritingCase.id,
            code: 'KYC_APPROVED',
            label: 'KYC Approved',
            isRequired: true
          },
          {
            underwritingCaseId: underwritingCase.id,
            code: 'ID_VERIFIED',
            label: 'ID Verified',
            isRequired: true
          }
        ]
      });

      return application;
    });

    await this.auditService.write({
      event: 'LOAN_APPLICATION_SUBMITTED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        entityType: 'LOAN_APPLICATION',
        entityId: created.id,
        amountRequested: created.amountRequested,
        tenorDays: created.tenorDays,
        status: created.status
      }
    });

    return {
      applicationId: created.id,
      status: created.status
    };
  }

  async getApplication(principal: BorrowerPrincipal, id: string): Promise<LoanApplicationDetailsDto> {
    const application = await this.prisma.loanApplication.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: null
      });
    }

    if (application.borrowerId !== principal.borrowerId || application.lenderId !== principal.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this loan application.',
        details: null
      });
    }

    return {
      id: application.id,
      borrowerId: application.borrowerId,
      amountRequested: application.amountRequested,
      tenorDays: application.tenorDays,
      status: application.status,
      submittedAt: application.submittedAt.toISOString(),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString()
    };
  }

  async getOfferByApplication(principal: BorrowerPrincipal, applicationId: string): Promise<LoanOfferDetailsDto> {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id: applicationId },
      include: {
        offer: {
          include: {
            scheduleItems: {
              orderBy: { dueDate: 'asc' }
            }
          }
        }
      }
    });

    if (!application) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: null
      });
    }

    if (application.borrowerId !== principal.borrowerId || application.lenderId !== principal.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this loan offer.',
        details: null
      });
    }

    if (!application.offer) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan offer not found for this application.',
        details: null
      });
    }

    return {
      offerId: application.offer.id,
      applicationId: application.id,
      status: application.offer.status,
      principalAmount: application.offer.principalAmount,
      interestAmount: application.offer.interestAmount,
      feeAmount: application.offer.feeAmount,
      totalRepayable: application.offer.totalRepayable,
      offeredAt: application.offer.offeredAt.toISOString(),
      expiresAt: application.offer.expiresAt.toISOString(),
      schedule: application.offer.scheduleItems.map((item) => ({
        id: item.id,
        dueDate: item.dueDate.toISOString(),
        amount: item.amount
      }))
    };
  }

  async acceptOffer(principal: BorrowerPrincipal, offerId: string): Promise<AcceptOfferResponseDto> {
    const existing = await this.prisma.loanOffer.findUnique({
      where: { id: offerId },
      include: {
        scheduleItems: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan offer not found.',
        details: null
      });
    }

    if (existing.borrowerId !== principal.borrowerId || existing.lenderId !== principal.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this loan offer.',
        details: null
      });
    }

    if (existing.status !== LoanOfferStatus.OFFERED) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Loan offer is not available for acceptance.',
        details: {
          status: existing.status
        }
      });
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.prisma.loanOffer.update({
        where: { id: existing.id },
        data: { status: LoanOfferStatus.EXPIRED }
      });
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Loan offer has expired.',
        details: {
          offerId: existing.id
        }
      });
    }

    const activeLoan = await this.prisma.loan.findFirst({
      where: {
        borrowerId: principal.borrowerId,
        lenderId: principal.lenderId,
        status: {
          in: [LoanStatus.PENDING_DISBURSEMENT, LoanStatus.ACTIVE, LoanStatus.OVERDUE]
        }
      },
      select: { id: true, status: true }
    });

    if (activeLoan) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Borrower already has an open loan.',
        details: {
          loanId: activeLoan.id,
          status: activeLoan.status
        }
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const offer = await tx.loanOffer.findUnique({
        where: { id: offerId },
        include: {
          scheduleItems: true
        }
      });

      if (!offer) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan offer not found.',
          details: null
        });
      }

      if (offer.borrowerId !== principal.borrowerId || offer.lenderId !== principal.lenderId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have access to this loan offer.',
          details: null
        });
      }

      if (offer.status !== LoanOfferStatus.OFFERED) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Loan offer is not available for acceptance.',
          details: {
            status: offer.status
          }
        });
      }

      if (offer.expiresAt.getTime() <= Date.now()) {
        await tx.loanOffer.update({
          where: { id: offer.id },
          data: { status: LoanOfferStatus.EXPIRED }
        });
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Loan offer has expired.',
          details: {
            offerId: offer.id
          }
        });
      }

      const existingLoan = await tx.loan.findFirst({
        where: {
          borrowerId: principal.borrowerId,
          lenderId: principal.lenderId,
          status: {
            in: [LoanStatus.PENDING_DISBURSEMENT, LoanStatus.ACTIVE, LoanStatus.OVERDUE]
          }
        },
        select: { id: true, status: true }
      });

      if (existingLoan) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Borrower already has an open loan.',
          details: {
            loanId: existingLoan.id,
            status: existingLoan.status
          }
        });
      }

      const contractSnapshot: Prisma.InputJsonValue = {
        offerId: offer.id,
        applicationId: offer.loanApplicationId,
        principalAmount: offer.principalAmount,
        interestAmount: offer.interestAmount,
        feeAmount: offer.feeAmount,
        totalRepayable: offer.totalRepayable,
        offeredAt: offer.offeredAt.toISOString(),
        acceptedAt: new Date().toISOString(),
        schedule: offer.scheduleItems
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
          .map((item) => ({
            dueDate: item.dueDate.toISOString(),
            amount: item.amount
          }))
      } as Prisma.InputJsonValue;

      const loan = await tx.loan.create({
        data: {
          borrowerId: offer.borrowerId,
          lenderId: offer.lenderId,
          loanOfferId: offer.id,
          status: LoanStatus.PENDING_DISBURSEMENT,
          principalAmount: offer.principalAmount,
          interestAmount: offer.interestAmount,
          feeAmount: offer.feeAmount,
          totalRepayable: offer.totalRepayable,
          contractSnapshot
        }
      });

      await tx.loanBalance.create({
        data: {
          loanId: loan.id,
          outstandingPrincipalKobo: loan.principalAmount,
          outstandingInterestKobo: loan.interestAmount,
          outstandingFeesKobo: loan.feeAmount,
          outstandingPenaltiesKobo: 0,
          totalOutstandingKobo: loan.totalRepayable
        }
      });

      await tx.repaymentScheduleItem.createMany({
        data: offer.scheduleItems
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
          .map((item) => ({
          loanId: loan.id,
          dueDate: item.dueDate,
          amount: item.amount
          }))
      });

      await tx.loanOffer.update({
        where: { id: offer.id },
        data: { status: LoanOfferStatus.ACCEPTED }
      });

      return loan;
    });

    await this.auditService.write({
      event: 'OFFER_ACCEPTED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        entityType: 'LOAN',
        entityId: result.id,
        offerId
      }
    });

    return {
      loanId: result.id,
      status: 'PENDING_DISBURSEMENT'
    };
  }

  async declineOffer(principal: BorrowerPrincipal, offerId: string): Promise<void> {
    const offer = await this.prisma.loanOffer.findUnique({
      where: { id: offerId }
    });

    if (!offer) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan offer not found.',
        details: null
      });
    }

    if (offer.borrowerId !== principal.borrowerId || offer.lenderId !== principal.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this loan offer.',
        details: null
      });
    }

    if (offer.status !== LoanOfferStatus.OFFERED) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Loan offer cannot be declined in its current state.',
        details: {
          status: offer.status
        }
      });
    }

    await this.prisma.loanOffer.update({
      where: { id: offer.id },
      data: { status: LoanOfferStatus.DECLINED }
    });

    await this.auditService.write({
      event: 'OFFER_DECLINED',
      actorType: 'BORROWER',
      actorId: principal.borrowerId,
      metadata: {
        offerId: offer.id,
        applicationId: offer.loanApplicationId
      }
    });
  }

  async getScheduleForBorrower(
    principal: BorrowerPrincipal,
    loanId: string
  ): Promise<LoanScheduleResponseDto> {
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

    if (loan.borrowerId !== principal.borrowerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have access to this loan schedule.',
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

  private validateApplicationPolicy(
    input: CreateLoanApplicationDto,
    lenderSettings: Prisma.JsonValue | null,
    borrowerOverride: { maxLoanKobo: number | null; maxTenorDays: number | null } | null
  ): void {
    const settings = this.normalizePolicySettings(lenderSettings);
    const maxAmountKobo = borrowerOverride?.maxLoanKobo ?? settings.maxAmountKobo;
    const maxTenorDays = borrowerOverride?.maxTenorDays ?? settings.maxTenorDays;

    if (input.amountRequested < settings.minAmountKobo || input.amountRequested > maxAmountKobo) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Amount requested is outside lender policy limits.',
        details: {
          minAmountKobo: settings.minAmountKobo,
          maxAmountKobo
        }
      });
    }

    if (input.tenorDays < settings.minTenorDays || input.tenorDays > maxTenorDays) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Tenor is outside lender policy limits.',
        details: {
          minTenorDays: settings.minTenorDays,
          maxTenorDays
        }
      });
    }
  }

  private normalizePolicySettings(raw: Prisma.JsonValue | null): {
    minAmountKobo: number;
    maxAmountKobo: number;
    minTenorDays: number;
    maxTenorDays: number;
  } {
    const source =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

    return {
      minAmountKobo: this.asPositiveInt(source.minLoanAmountKobo, LoansService.DEFAULT_MIN_AMOUNT_KOBO),
      maxAmountKobo: this.asPositiveInt(source.maxLoanAmountKobo, LoansService.DEFAULT_MAX_AMOUNT_KOBO),
      minTenorDays: this.asPositiveInt(source.minTenorDays, LoansService.DEFAULT_MIN_TENOR_DAYS),
      maxTenorDays: this.asPositiveInt(source.maxTenorDays, LoansService.DEFAULT_MAX_TENOR_DAYS)
    };
  }

  private asPositiveInt(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
