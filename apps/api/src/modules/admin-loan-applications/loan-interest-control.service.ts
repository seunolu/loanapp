import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InterestAccrualAction, Prisma } from '@prisma/client';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';

const ALLOWED_INTEREST_CONTROL_ROLES = new Set(['RISK_MANAGER', 'OPS', 'SUPER_ADMIN']);

@Injectable()
export class LoanInterestControlService {
  constructor(private readonly prisma: PrismaService) {}

  private assertRole(principal: TenantAdminPrincipal): void {
    if (!ALLOWED_INTEREST_CONTROL_ROLES.has(principal.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role cannot manage interest accrual control.',
        details: { role: principal.role }
      });
    }
  }

  async pauseInterest(
    loanId: string,
    reason: string | undefined,
    principal: TenantAdminPrincipal
  ) {
    this.assertRole(principal);
    const now = new Date();
    return this.prisma.$transaction(async (trx) => {
      const loan = await trx.tenantLoanApplication.findFirst({
        where: { id: loanId, tenantId: principal.tenantId }
      });
      if (!loan) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { loanId }
        });
      }
      if (loan.interestAccrualPaused) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Interest accrual is already paused.',
          details: null
        });
      }

      const updated = await trx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          interestAccrualPaused: true,
          interestPausedAt: now,
          interestPausedById: principal.adminId,
          interestPauseReason: reason?.trim() || null
        }
      });

      await trx.interestAccrualAudit.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loan.id,
          action: InterestAccrualAction.PAUSED,
          previousRate: loan.interestOverrideRate ?? loan.annualInterestRate ?? null,
          newRate: loan.interestOverrideRate ?? loan.annualInterestRate ?? null,
          reason: reason?.trim() || null,
          performedById: principal.adminId
        }
      });

      return updated;
    });
  }

  async resumeInterest(
    loanId: string,
    principal: TenantAdminPrincipal
  ) {
    this.assertRole(principal);
    return this.prisma.$transaction(async (trx) => {
      const loan = await trx.tenantLoanApplication.findFirst({
        where: { id: loanId, tenantId: principal.tenantId }
      });
      if (!loan) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { loanId }
        });
      }
      if (!loan.interestAccrualPaused) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Interest accrual is not paused.',
          details: null
        });
      }

      const updated = await trx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          interestAccrualPaused: false,
          interestPausedAt: null,
          interestPausedById: null,
          interestPauseReason: null
        }
      });

      await trx.interestAccrualAudit.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loan.id,
          action: InterestAccrualAction.RESUMED,
          previousRate: loan.interestOverrideRate ?? loan.annualInterestRate ?? null,
          newRate: loan.interestOverrideRate ?? loan.annualInterestRate ?? null,
          reason: null,
          performedById: principal.adminId
        }
      });

      return updated;
    });
  }

  async setInterestOverride(
    loanId: string,
    rate: string | number,
    principal: TenantAdminPrincipal,
    reason?: string
  ) {
    this.assertRole(principal);
    const nextRate = new Prisma.Decimal(rate);
    if (nextRate.lte(0)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Override rate must be greater than zero.',
        details: null
      });
    }

    const now = new Date();
    return this.prisma.$transaction(async (trx) => {
      const loan = await trx.tenantLoanApplication.findFirst({
        where: { id: loanId, tenantId: principal.tenantId }
      });
      if (!loan) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { loanId }
        });
      }

      const updated = await trx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          interestOverrideRate: nextRate,
          interestOverrideSetAt: now,
          interestOverrideSetById: principal.adminId
        }
      });

      await trx.interestAccrualAudit.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loan.id,
          action: InterestAccrualAction.RATE_OVERRIDE_SET,
          previousRate: loan.interestOverrideRate ?? loan.annualInterestRate ?? null,
          newRate: nextRate,
          reason: reason?.trim() || null,
          performedById: principal.adminId
        }
      });

      return updated;
    });
  }

  async removeInterestOverride(
    loanId: string,
    principal: TenantAdminPrincipal,
    reason?: string
  ) {
    this.assertRole(principal);
    return this.prisma.$transaction(async (trx) => {
      const loan = await trx.tenantLoanApplication.findFirst({
        where: { id: loanId, tenantId: principal.tenantId }
      });
      if (!loan) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { loanId }
        });
      }
      if (!loan.interestOverrideRate) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'No interest override is currently set.',
          details: null
        });
      }

      const updated = await trx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          interestOverrideRate: null,
          interestOverrideSetAt: null,
          interestOverrideSetById: null
        }
      });

      await trx.interestAccrualAudit.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loan.id,
          action: InterestAccrualAction.RATE_OVERRIDE_REMOVED,
          previousRate: loan.interestOverrideRate,
          newRate: loan.annualInterestRate ?? null,
          reason: reason?.trim() || null,
          performedById: principal.adminId
        }
      });

      return updated;
    });
  }

  async listAudit(loanId: string, principal: TenantAdminPrincipal) {
    this.assertRole(principal);
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanId }
      });
    }

    return this.prisma.interestAccrualAudit.findMany({
      where: { tenantId: principal.tenantId, loanApplicationId: loanId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
