import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TenantLedgerAccountCode, TenantLedgerDirection, TenantLoanApplicationStatus } from '@prisma/client';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { LoanBalanceService } from '../../common/ledger/loan-balance.service';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';

type RevenueTotals = {
  interestIncomeMinor: string;
  feeIncomeMinor: string;
  penaltyIncomeMinor: string;
  waiversMinor: string;
  writeOffsMinor: string;
};

@Injectable()
export class AdminFinancialReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: TenantLedgerService,
    private readonly loanBalanceService: LoanBalanceService
  ) {}

  private parseDate(value?: string, field = 'date'): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Invalid ${field}.`,
        details: { value }
      });
    }
    return parsed;
  }

  private toMinorString(value: Prisma.Decimal): string {
    return value.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toString();
  }

  async getPortfolioSummary(principal: TenantAdminPrincipal) {
    const [aggregate, totals] = await Promise.all([
      this.prisma.tenantLoanApplication.aggregate({
        where: { tenantId: principal.tenantId },
        _count: { _all: true }
      }),
      this.prisma.tenantLoanApplication.groupBy({
        by: ['status'],
        where: { tenantId: principal.tenantId },
        _count: { _all: true },
        _sum: {
          outstandingPrincipal: true,
          outstandingInterest: true,
          outstandingFees: true
        }
      })
    ]);

    let totalOutstandingPrincipal = new Prisma.Decimal(0);
    let totalOutstandingInterest = new Prisma.Decimal(0);
    let totalOutstandingFees = new Prisma.Decimal(0);
    let activeLoans = 0;
    let delinquentLoans = 0;

    for (const row of totals) {
      totalOutstandingPrincipal = totalOutstandingPrincipal.plus(row._sum.outstandingPrincipal ?? 0);
      totalOutstandingInterest = totalOutstandingInterest.plus(row._sum.outstandingInterest ?? 0);
      totalOutstandingFees = totalOutstandingFees.plus(row._sum.outstandingFees ?? 0);

      if (
        row.status === TenantLoanApplicationStatus.DISBURSED ||
        row.status === TenantLoanApplicationStatus.OVERDUE ||
        row.status === TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT
      ) {
        activeLoans += row._count._all;
      }
      if (row.status === TenantLoanApplicationStatus.OVERDUE) {
        delinquentLoans += row._count._all;
      }
    }

    return {
      totalLoans: aggregate._count._all,
      activeLoans,
      delinquentLoans,
      totalOutstandingPrincipalMinor: this.toMinorString(totalOutstandingPrincipal),
      totalOutstandingInterestMinor: this.toMinorString(totalOutstandingInterest),
      totalOutstandingFeesMinor: this.toMinorString(totalOutstandingFees),
      totalOutstandingPenaltyMinor: '0'
    };
  }

  async getLoanLedger(principal: TenantAdminPrincipal, loanId: string) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { tenantId: principal.tenantId, id: loanId },
      select: { id: true, fullName: true, status: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanId }
      });
    }

    const entries = await this.ledgerService.listEntries({
      tenantId: principal.tenantId,
      referenceType: 'LoanApplication',
      referenceId: loanId,
      limit: 500,
      offset: 0
    });

    const running = {
      principalMinor: 0n,
      interestMinor: 0n,
      feesMinor: 0n,
      penaltyMinor: 0n,
      cashMinor: 0n
    };

    const items = [...entries.items]
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
      .map((entry) => {
        const lineViews = entry.lines.map((line) => {
          const amount = BigInt(line.amountMinor);
          const signed = line.direction === 'DEBIT' ? amount : -amount;
          if (line.accountCode === TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE) {
            running.principalMinor += signed;
          } else if (line.accountCode === TenantLedgerAccountCode.INTEREST_RECEIVABLE) {
            running.interestMinor += signed;
          } else if (line.accountCode === TenantLedgerAccountCode.FEES_RECEIVABLE) {
            running.feesMinor += signed;
          } else if (line.accountCode === TenantLedgerAccountCode.PENALTY_INCOME) {
            running.penaltyMinor += signed;
          } else if (
            line.accountCode === TenantLedgerAccountCode.CASH_MAIN ||
            line.accountCode === TenantLedgerAccountCode.CASH_ON_HAND ||
            line.accountCode === TenantLedgerAccountCode.BANK_CLEARING
          ) {
            running.cashMinor += signed;
          }
          return line;
        });

        return {
          ...entry,
          lines: lineViews,
          runningBalances: {
            principalMinor: running.principalMinor.toString(),
            interestMinor: running.interestMinor.toString(),
            feesMinor: running.feesMinor.toString(),
            penaltyMinor: running.penaltyMinor.toString(),
            cashMinor: running.cashMinor.toString()
          }
        };
      });

    return {
      loan,
      total: entries.total,
      items
    };
  }

  async getAging(principal: TenantAdminPrincipal) {
    const rows = await this.prisma.tenantLoanApplication.findMany({
      where: { tenantId: principal.tenantId },
      select: { daysPastDue: true, outstandingTotal: true }
    });

    const buckets = new Map<string, bigint>([
      ['0', 0n],
      ['1-7', 0n],
      ['8-30', 0n],
      ['31-60', 0n],
      ['61-90', 0n],
      ['90+', 0n]
    ]);

    const add = (bucket: string, amountMinor: bigint) => {
      buckets.set(bucket, (buckets.get(bucket) ?? 0n) + amountMinor);
    };

    for (const row of rows) {
      const minor = BigInt(
        row.outstandingTotal.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toString()
      );
      if (minor <= 0n) continue;
      if (row.daysPastDue <= 0) add('0', minor);
      else if (row.daysPastDue <= 7) add('1-7', minor);
      else if (row.daysPastDue <= 30) add('8-30', minor);
      else if (row.daysPastDue <= 60) add('31-60', minor);
      else if (row.daysPastDue <= 90) add('61-90', minor);
      else add('90+', minor);
    }

    return {
      asOf: new Date().toISOString(),
      buckets: Array.from(buckets.entries()).map(([bucket, amountMinor]) => ({
        bucket,
        amountMinor: amountMinor.toString()
      }))
    };
  }

  async getRevenue(principal: TenantAdminPrincipal, from?: string, to?: string): Promise<RevenueTotals> {
    const fromDate = this.parseDate(from, 'from');
    const toDate = this.parseDate(to, 'to');
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'from must be <= to.',
        details: null
      });
    }

    const lines = await this.prisma.tenantLedgerLine.findMany({
      where: {
        tenantId: principal.tenantId,
        account: {
          code: {
            in: [
              TenantLedgerAccountCode.INTEREST_INCOME,
              TenantLedgerAccountCode.FEE_INCOME,
              TenantLedgerAccountCode.PENALTY_INCOME,
              TenantLedgerAccountCode.WRITE_OFF_EXPENSE
            ]
          }
        },
        ...(fromDate || toDate
          ? {
              entry: {
                occurredAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {})
                }
              }
            }
          : {})
      },
      include: { account: { select: { code: true } }, entry: { select: { type: true, memo: true } } }
    });

    let interestIncome = 0n;
    let feeIncome = 0n;
    let penaltyIncome = 0n;
    let waivers = 0n;
    let writeOffs = 0n;

    for (const line of lines) {
      const amount = line.amountMinor;
      const signed = line.direction === TenantLedgerDirection.CREDIT ? amount : -amount;
      if (line.account.code === TenantLedgerAccountCode.INTEREST_INCOME) interestIncome += signed;
      if (line.account.code === TenantLedgerAccountCode.FEE_INCOME) feeIncome += signed;
      if (line.account.code === TenantLedgerAccountCode.PENALTY_INCOME) penaltyIncome += signed;
      if (line.account.code === TenantLedgerAccountCode.WRITE_OFF_EXPENSE) {
        const debit = line.direction === TenantLedgerDirection.DEBIT ? amount : 0n;
        if (line.entry.type === 'WRITE_OFF') {
          writeOffs += debit;
        } else if ((line.entry.memo ?? '').toLowerCase().includes('waiv')) {
          waivers += debit;
        }
      }
    }

    return {
      interestIncomeMinor: interestIncome.toString(),
      feeIncomeMinor: feeIncome.toString(),
      penaltyIncomeMinor: penaltyIncome.toString(),
      waiversMinor: waivers.toString(),
      writeOffsMinor: writeOffs.toString()
    };
  }

  async reconcile(principal: TenantAdminPrincipal) {
    const rows = await this.prisma.tenantLoanApplication.findMany({
      where: { tenantId: principal.tenantId },
      select: {
        id: true,
        status: true,
        outstandingPrincipal: true,
        outstandingInterest: true,
        outstandingFees: true,
        outstandingTotal: true
      },
      take: 500
    });

    const mismatches: Array<{
      loanId: string;
      status: TenantLoanApplicationStatus;
      table: { principal: string; interest: string; fees: string; total: string };
      ledger: { principal: string; interest: string; fees: string; total: string };
    }> = [];

    for (const row of rows) {
      const ledger = await this.loanBalanceService.getBalances(principal.tenantId, row.id);
      const table = {
        principal: row.outstandingPrincipal.toString(),
        interest: row.outstandingInterest.toString(),
        fees: row.outstandingFees.toString(),
        total: row.outstandingTotal.toString()
      };
      const led = {
        principal: ledger.principalOutstanding.toString(),
        interest: ledger.interestOutstanding.toString(),
        fees: ledger.feesOutstanding.toString(),
        total: ledger.totalOutstanding.toString()
      };

      const delta = (a: Prisma.Decimal, b: Prisma.Decimal) =>
        a.minus(b).abs().gt(new Prisma.Decimal('0.01'));
      if (
        delta(row.outstandingPrincipal, ledger.principalOutstanding) ||
        delta(row.outstandingInterest, ledger.interestOutstanding) ||
        delta(row.outstandingFees, ledger.feesOutstanding) ||
        delta(row.outstandingTotal, ledger.totalOutstanding)
      ) {
        mismatches.push({ loanId: row.id, status: row.status, table, ledger: led });
      }
    }

    return {
      scanned: rows.length,
      mismatchesFound: mismatches.length,
      mismatches
    };
  }
}

