import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class PenaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async accrueDailyPenalty(
    loanId: string,
    tenantId: string,
    now = new Date(),
    tx?: Prisma.TransactionClient
  ): Promise<{ accrued: Prisma.Decimal }> {
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
    if (
      loan.status === TenantLoanApplicationStatus.WRITTEN_OFF ||
      loan.status === TenantLoanApplicationStatus.SETTLED ||
      loan.writtenOffAt ||
      loan.settledAt
    ) {
      return { accrued: new Prisma.Decimal(0) };
    }
    if (loan.daysPastDue <= 0) {
      return { accrued: new Prisma.Decimal(0) };
    }

    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (loan.lastPenaltyAccrualDate) {
      const last = new Date(
        Date.UTC(
          loan.lastPenaltyAccrualDate.getUTCFullYear(),
          loan.lastPenaltyAccrualDate.getUTCMonth(),
          loan.lastPenaltyAccrualDate.getUTCDate()
        )
      );
      if (last.getTime() === today.getTime()) {
        return { accrued: new Prisma.Decimal(0) };
      }
    }

    const existingAccrual = await db.tenantPenaltyAccrual.findUnique({
      where: {
        tenantId_loanAccountId_accruedForDate: {
          tenantId,
          loanAccountId: loan.id,
          accruedForDate: today.toISOString().slice(0, 10)
        }
      }
    });
    if (existingAccrual) {
      return { accrued: new Prisma.Decimal(0) };
    }

    const productId = await this.resolveLoanProductId(loan.id, tenantId, db);
    const rule = productId
      ? await db.penaltyRule.findFirst({
          where: { tenantId, productId },
          orderBy: { createdAt: 'desc' }
        })
      : null;
    if (rule?.isPaused) {
      return { accrued: new Prisma.Decimal(0) };
    }

    const graceDays = rule?.graceDays ?? 0;
    if (loan.daysPastDue <= graceDays) {
      return { accrued: new Prisma.Decimal(0) };
    }

    const defaultRateBps = Number(this.configService.get<string>('COLLECTIONS_PENALTY_DAILY_RATE_BPS') ?? '15');
    const configuredRateBps = rule?.rateBpsPerDay ?? defaultRateBps;
    const dailyRate = new Prisma.Decimal(configuredRateBps).div(10_000);
    const base = Prisma.Decimal.max(new Prisma.Decimal(0), loan.outstandingPrincipal);
    const flat = rule?.kind === 'FLAT' ? rule.flatAmount ?? new Prisma.Decimal(0) : null;
    const percentAccrued = base.times(dailyRate).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const accruedBase = flat ? flat : percentAccrued;
    const capRemaining = rule?.capAmount
      ? Prisma.Decimal.max(new Prisma.Decimal(0), rule.capAmount.minus(loan.totalPenaltyAccrued))
      : null;
    const accrued = capRemaining ? Prisma.Decimal.min(accruedBase, capRemaining) : accruedBase;
    if (accrued.lte(0)) {
      await db.tenantLoanApplication.update({
        where: { id: loan.id },
        data: { lastPenaltyAccrualDate: today }
      });
      return { accrued: new Prisma.Decimal(0) };
    }

    await db.tenantLoanApplication.update({
      where: { id: loan.id },
      data: {
        totalPenaltyAccrued: loan.totalPenaltyAccrued.plus(accrued),
        outstandingFees: loan.outstandingFees.plus(accrued),
        outstandingTotal: loan.outstandingTotal.plus(accrued),
        lastPenaltyAccrualDate: today
      }
    });

    await db.tenantPenaltyAccrual.create({
      data: {
        tenantId,
        loanAccountId: loan.id,
        accruedForDate: today.toISOString().slice(0, 10),
        amount: accrued
      }
    });

    return { accrued };
  }

  async setPenaltyPaused(
    loanId: string,
    tenantId: string,
    isPaused: boolean
  ): Promise<void> {
    const productId = await this.resolveLoanProductId(loanId, tenantId);
    if (!productId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Unable to resolve product for loan account.',
        details: { loanId }
      });
    }
    await this.prisma.penaltyRule.upsert({
      where: {
        id: `${tenantId}:${productId}:default`
      },
      update: { isPaused },
      create: {
        id: `${tenantId}:${productId}:default`,
        tenantId,
        productId,
        kind: 'DAILY_PERCENT',
        rateBpsPerDay: Number(this.configService.get<string>('COLLECTIONS_PENALTY_DAILY_RATE_BPS') ?? '15'),
        graceDays: 0,
        isPaused
      }
    });
  }

  async waivePenalty(
    loanId: string,
    tenantId: string,
    amount: Prisma.Decimal | number | string
  ): Promise<void> {
    const waiver = new Prisma.Decimal(amount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (waiver.lte(0)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Waiver amount must be > 0.',
        details: null
      });
    }
    await this.prisma.$transaction(async (tx) => {
      const loan = await tx.tenantLoanApplication.findFirst({
        where: { id: loanId, tenantId }
      });
      if (!loan) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan account not found.',
          details: { loanId }
        });
      }

      const applied = Prisma.Decimal.min(waiver, loan.outstandingFees);
      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          totalPenaltyPaid: loan.totalPenaltyPaid.plus(applied),
          outstandingFees: loan.outstandingFees.minus(applied),
          outstandingTotal: loan.outstandingTotal.minus(applied)
        }
      });
    });
  }

  private async resolveLoanProductId(
    loanId: string,
    tenantId: string,
    dbClient?: Prisma.TransactionClient
  ): Promise<string | null> {
    const db = dbClient ?? this.prisma;
    const loan = await db.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId },
      select: {
        purpose: true,
        tenantId: true
      }
    });
    if (!loan) {
      return null;
    }
    const product = await db.loanProduct.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });
    return product?.id ?? null;
  }
}
