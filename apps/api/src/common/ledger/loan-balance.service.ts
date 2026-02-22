import { Injectable } from '@nestjs/common';
import { Prisma, TenantLedgerAccountCode, TenantLedgerDirection } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export type LoanBalances = {
  principalOutstanding: Prisma.Decimal;
  interestOutstanding: Prisma.Decimal;
  feesOutstanding: Prisma.Decimal;
  totalOutstanding: Prisma.Decimal;
};

@Injectable()
export class LoanBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(
    tenantId: string,
    loanApplicationId: string,
    tx?: Prisma.TransactionClient
  ): Promise<LoanBalances> {
    const db = tx ?? this.prisma;
    const lines = await db.tenantLedgerLine.findMany({
      where: {
        tenantId,
        entry: {
          referenceType: 'LoanApplication',
          referenceId: loanApplicationId
        },
        account: {
          code: {
            in: [
              TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
              TenantLedgerAccountCode.INTEREST_RECEIVABLE,
              TenantLedgerAccountCode.FEES_RECEIVABLE
            ]
          }
        }
      },
      select: {
        direction: true,
        amount: true,
        account: { select: { code: true } }
      }
    });

    const accum = new Map<TenantLedgerAccountCode, Prisma.Decimal>([
      [TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE, new Prisma.Decimal(0)],
      [TenantLedgerAccountCode.INTEREST_RECEIVABLE, new Prisma.Decimal(0)],
      [TenantLedgerAccountCode.FEES_RECEIVABLE, new Prisma.Decimal(0)]
    ]);

    for (const line of lines) {
      const current = accum.get(line.account.code) ?? new Prisma.Decimal(0);
      const next =
        line.direction === TenantLedgerDirection.DEBIT ? current.plus(line.amount) : current.minus(line.amount);
      accum.set(line.account.code, next);
    }

    const principalOutstanding = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      accum.get(TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE) ?? new Prisma.Decimal(0)
    );
    const interestOutstanding = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      accum.get(TenantLedgerAccountCode.INTEREST_RECEIVABLE) ?? new Prisma.Decimal(0)
    );
    const feesOutstanding = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      accum.get(TenantLedgerAccountCode.FEES_RECEIVABLE) ?? new Prisma.Decimal(0)
    );

    return {
      principalOutstanding,
      interestOutstanding,
      feesOutstanding,
      totalOutstanding: principalOutstanding.plus(interestOutstanding).plus(feesOutstanding)
    };
  }
}
