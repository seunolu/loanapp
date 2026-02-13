import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoanStatus } from '@prisma/client';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { LedgerService } from '../../common/ledger/ledger.service';

type PenaltyAccrualResult = {
  created: boolean;
  accrual: {
    id: string;
    loanId: string;
    accrualDate: Date;
    amountKobo: number;
    journalEntryId: string | null;
    createdAt: Date;
  };
  beforeBalance: {
    outstandingPenaltiesKobo: number;
    totalOutstandingKobo: number;
  } | null;
  afterBalance: {
    outstandingPenaltiesKobo: number;
    totalOutstandingKobo: number;
  } | null;
};

@Injectable()
export class PenaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly configService: ConfigService<Env, true>
  ) {}

  async accrueDailyPenalty(loanId: string, accrualDateInput?: string): Promise<PenaltyAccrualResult> {
    const accrualDate = this.normalizeAccrualDate(accrualDateInput);

    const existing = await this.prisma.penaltyAccrual.findUnique({
      where: {
        loanId_accrualDate: {
          loanId,
          accrualDate
        }
      }
    });

    if (existing) {
      return {
        created: false,
        accrual: {
          id: existing.id,
          loanId: existing.loanId,
          accrualDate: existing.accrualDate,
          amountKobo: existing.amountKobo,
          journalEntryId: existing.journalEntryId,
          createdAt: existing.createdAt
        },
        beforeBalance: null,
        afterBalance: null
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { balance: true }
      });

      if (!loan) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan not found.',
          details: null
        });
      }

      if (loan.status !== LoanStatus.OVERDUE) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Penalty can only be accrued for overdue loans.',
          details: {
            status: loan.status
          }
        });
      }

      if (!loan.balance) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan balance record is missing.',
          details: null
        });
      }

      const duplicate = await tx.penaltyAccrual.findUnique({
        where: {
          loanId_accrualDate: {
            loanId,
            accrualDate
          }
        }
      });
      if (duplicate) {
        return {
          created: false,
          accrual: duplicate,
          beforeBalance: null,
          afterBalance: null
        };
      }

      const dailyRateBps = this.configService.get('PENALTY_DAILY_RATE_BPS', { infer: true });
      const dailyCapKobo = this.configService.get('PENALTY_DAILY_CAP_KOBO', { infer: true });

      const baseOutstanding = loan.balance.totalOutstandingKobo;
      const computed = Math.ceil((baseOutstanding * dailyRateBps) / 10_000);
      const amountKobo = Math.min(dailyCapKobo, Math.max(0, computed));

      if (amountKobo <= 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Computed penalty is zero for this loan/day.',
          details: {
            totalOutstandingKobo: baseOutstanding,
            dailyRateBps,
            dailyCapKobo
          }
        });
      }

      const journal = await this.ledgerService.postJournalEntry(
        {
          description: `Penalty accrual for loan ${loan.id}`,
          reference: `PENALTY:${loan.id}:${accrualDate.toISOString().slice(0, 10)}`,
          lines: [
            {
              accountCode: '1200',
              entryType: 'DEBIT',
              amountKobo,
              description: `Penalty receivable accrued ${loan.id}`
            },
            {
              accountCode: '4200',
              entryType: 'CREDIT',
              amountKobo,
              description: `Penalty income accrued ${loan.id}`
            }
          ]
        },
        tx
      );

      const created = await tx.penaltyAccrual.create({
        data: {
          loanId: loan.id,
          accrualDate,
          amountKobo,
          journalEntryId: journal.journalEntryId
        }
      });

      const updatedBalance = await tx.loanBalance.update({
        where: { loanId: loan.id },
        data: {
          outstandingPenaltiesKobo: { increment: amountKobo },
          totalOutstandingKobo: { increment: amountKobo }
        }
      });

      return {
        created: true,
        accrual: created,
        beforeBalance: {
          outstandingPenaltiesKobo: loan.balance.outstandingPenaltiesKobo,
          totalOutstandingKobo: loan.balance.totalOutstandingKobo
        },
        afterBalance: {
          outstandingPenaltiesKobo: updatedBalance.outstandingPenaltiesKobo,
          totalOutstandingKobo: updatedBalance.totalOutstandingKobo
        }
      };
    });

    return {
      created: result.created,
      accrual: {
        id: result.accrual.id,
        loanId: result.accrual.loanId,
        accrualDate: result.accrual.accrualDate,
        amountKobo: result.accrual.amountKobo,
        journalEntryId: result.accrual.journalEntryId,
        createdAt: result.accrual.createdAt
      },
      beforeBalance: result.beforeBalance,
      afterBalance: result.afterBalance
    };
  }

  async listPenalties(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: { id: true }
    });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan not found.',
        details: null
      });
    }

    return this.prisma.penaltyAccrual.findMany({
      where: { loanId },
      orderBy: [{ accrualDate: 'desc' }, { createdAt: 'desc' }]
    });
  }

  private normalizeAccrualDate(input?: string): Date {
    const date = input ? new Date(input) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid accrualDate.',
        details: null
      });
    }

    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}
