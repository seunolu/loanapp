import { Injectable } from '@nestjs/common';
import { Prisma, TenantDisbursementStatus, TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../common/database/prisma.service';
import type { TenantAdminPrincipal } from '../../../common/auth/tenant-admin-principal';
import type { PortfolioKPIsDto } from './dto/portfolio-kpis.dto';
import type { PortfolioTrendsDto, PortfolioTrendsQueryDto } from './dto/portfolio-trends.dto';
import type { PortfolioSummaryDto } from './dto/portfolio-summary.dto';
import type { PortfolioParBucketDto, PortfolioParResponseDto } from './dto/portfolio-par.dto';
import type { PortfolioDelinquencyDto } from './dto/portfolio-delinquency.dto';
import type { PortfolioVintageResponseDto } from './dto/portfolio-vintage.dto';
import type { PortfolioCollectionsSeriesDto } from './dto/portfolio-collections.dto';
import type { PortfolioTreasuryExposureDto } from './dto/portfolio-treasury.dto';
import { TreasuryService } from '../../../treasury/treasury.service';

const ACTIVE_STATUSES: TenantLoanApplicationStatus[] = [
  TenantLoanApplicationStatus.DISBURSED,
  TenantLoanApplicationStatus.OVERDUE
];

const DELINQUENCY_RELEVANT_STATUSES: TenantLoanApplicationStatus[] = [
  TenantLoanApplicationStatus.DISBURSED,
  TenantLoanApplicationStatus.OVERDUE,
  TenantLoanApplicationStatus.DEFAULTED,
  TenantLoanApplicationStatus.WRITTEN_OFF
];

const CACHE_TTL_MS = 45_000;

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'object' && value !== null && 'toString' in value) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function boundedRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  const raw = numerator / denominator;
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(1, Number(raw.toFixed(6)));
}

function startOfUtcDay(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function startOfUtcWeek(input: Date): Date {
  const day = startOfUtcDay(input);
  const weekday = day.getUTCDay();
  const diff = weekday === 0 ? 6 : weekday - 1;
  return addDays(day, -diff);
}

function startOfUtcMonth(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), 1));
}

function endOfUtcDay(input: Date): Date {
  return addDays(startOfUtcDay(input), 1);
}

function monthKey(date: Date): string {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function bucketDateIso(date: Date): string {
  return `${isoDayKey(date)}T00:00:00.000Z`;
}

type BuildKpisInput = {
  asOf: string;
  activeLoansCount: number;
  totalDisbursed: number;
  totalPrincipalOutstanding: number;
  totalInterestAccrued: number;
  totalRepaid: number;
  overdueAmount: number;
  par30Amount: number;
  par90Amount: number;
  defaultedOutstanding: number;
  defaultedPrincipal: number;
  recoveries: number;
  delinquentDaysPastDue: number[];
};

export function buildPortfolioKpis(input: BuildKpisInput): PortfolioKPIsDto {
  const avgDaysPastDue =
    input.delinquentDaysPastDue.length > 0
      ? Number(
          (
            input.delinquentDaysPastDue.reduce((sum, current) => sum + current, 0) /
            input.delinquentDaysPastDue.length
          ).toFixed(2)
        )
      : 0;

  return {
    asOf: input.asOf,
    activeLoansCount: input.activeLoansCount,
    totalDisbursed: input.totalDisbursed,
    totalPrincipalOutstanding: input.totalPrincipalOutstanding,
    totalInterestAccrued: input.totalInterestAccrued,
    totalRepaid: input.totalRepaid,
    overdueAmount: input.overdueAmount,
    par30Amount: input.par30Amount,
    par90Amount: input.par90Amount,
    par30Rate: boundedRate(input.par30Amount, input.totalPrincipalOutstanding),
    par90Rate: boundedRate(input.par90Amount, input.totalPrincipalOutstanding),
    defaultRate: boundedRate(input.defaultedOutstanding, input.totalPrincipalOutstanding),
    recoveryRate: boundedRate(input.recoveries, input.defaultedPrincipal),
    avgDaysPastDue
  };
}

export type ParLoanInput = {
  dpd: number;
  outstandingAmount: number;
};

export function computeParBucketsFromLoans(loans: ParLoanInput[]): {
  buckets: PortfolioParBucketDto[];
  par30: number;
  par90: number;
} {
  const buckets: Record<PortfolioParBucketDto['bucket'], { count: number; outstandingAmount: number }> = {
    PAR_1_7: { count: 0, outstandingAmount: 0 },
    PAR_8_30: { count: 0, outstandingAmount: 0 },
    PAR_31_60: { count: 0, outstandingAmount: 0 },
    PAR_61_90: { count: 0, outstandingAmount: 0 },
    PAR_90_PLUS: { count: 0, outstandingAmount: 0 }
  };
  let par30 = 0;
  let par90 = 0;

  for (const loan of loans) {
    const dpd = Math.max(0, Math.floor(loan.dpd));
    const amount = Math.max(0, loan.outstandingAmount);
    if (dpd <= 0 || amount <= 0) continue;

    if (dpd <= 7) {
      buckets.PAR_1_7.count += 1;
      buckets.PAR_1_7.outstandingAmount += amount;
    } else if (dpd <= 30) {
      buckets.PAR_8_30.count += 1;
      buckets.PAR_8_30.outstandingAmount += amount;
    } else if (dpd <= 60) {
      buckets.PAR_31_60.count += 1;
      buckets.PAR_31_60.outstandingAmount += amount;
    } else if (dpd <= 90) {
      buckets.PAR_61_90.count += 1;
      buckets.PAR_61_90.outstandingAmount += amount;
    } else {
      buckets.PAR_90_PLUS.count += 1;
      buckets.PAR_90_PLUS.outstandingAmount += amount;
    }

    if (dpd >= 30) par30 += amount;
    if (dpd >= 90) par90 += amount;
  }

  return {
    buckets: (Object.keys(buckets) as PortfolioParBucketDto['bucket'][]).map((bucket) => ({
      bucket,
      count: buckets[bucket].count,
      outstandingAmount: Number(buckets[bucket].outstandingAmount.toFixed(2))
    })),
    par30: Number(par30.toFixed(2)),
    par90: Number(par90.toFixed(2))
  };
}

export function computeDelinquencyRatios(input: {
  totalOutstanding: number;
  par30Outstanding: number;
  par90Outstanding: number;
}): Pick<PortfolioDelinquencyDto, 'par30Ratio' | 'nplRatio'> {
  return {
    par30Ratio: boundedRate(input.par30Outstanding, input.totalOutstanding),
    nplRatio: boundedRate(input.par90Outstanding, input.totalOutstanding)
  };
}

@Injectable()
export class PortfolioService {
  private readonly kpiCache = new Map<string, { expiresAt: number; data: PortfolioKPIsDto }>();
  private readonly trendsCache = new Map<string, { expiresAt: number; data: PortfolioTrendsDto }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly treasuryService: TreasuryService
  ) {}

  async getPortfolioSummary(principal: TenantAdminPrincipal): Promise<PortfolioSummaryDto> {
    const now = new Date();
    const tenantId = principal.tenantId;
    const todayStart = startOfUtcDay(now);
    const todayEnd = endOfUtcDay(now);
    const weekStart = startOfUtcWeek(now);
    const monthStart = startOfUtcMonth(now);

    const [
      activeLoanCount,
      outstandingAggregate,
      disbursedToday,
      disbursedWeek,
      disbursedMonth,
      repaidToday,
      repaidWeek,
      repaidMonth
    ] = await Promise.all([
      this.prisma.tenantLoanApplication.count({
        where: {
          tenantId,
          status: { in: ACTIVE_STATUSES }
        }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: ACTIVE_STATUSES }
        },
        _sum: {
          outstandingPrincipal: true,
          outstandingInterest: true,
          outstandingFees: true,
          outstandingTotal: true
        }
      }),
      this.prisma.tenantDisbursement.aggregate({
        where: {
          tenantId,
          status: TenantDisbursementStatus.SUCCESS,
          disbursedAt: { gte: todayStart, lt: todayEnd }
        },
        _sum: { amount: true }
      }),
      this.prisma.tenantDisbursement.aggregate({
        where: {
          tenantId,
          status: TenantDisbursementStatus.SUCCESS,
          disbursedAt: { gte: weekStart }
        },
        _sum: { amount: true }
      }),
      this.prisma.tenantDisbursement.aggregate({
        where: {
          tenantId,
          status: TenantDisbursementStatus.SUCCESS,
          disbursedAt: { gte: monthStart }
        },
        _sum: { amount: true }
      }),
      this.prisma.loanRepayment.aggregate({
        where: {
          tenantId,
          postedAt: { gte: todayStart, lt: todayEnd }
        },
        _sum: { amount: true }
      }),
      this.prisma.loanRepayment.aggregate({
        where: {
          tenantId,
          postedAt: { gte: weekStart }
        },
        _sum: { amount: true }
      }),
      this.prisma.loanRepayment.aggregate({
        where: {
          tenantId,
          postedAt: { gte: monthStart }
        },
        _sum: { amount: true }
      })
    ]);

    return {
      asOf: now.toISOString(),
      activeLoanCount,
      totalOutstandingPrincipal: toNumber(outstandingAggregate._sum.outstandingPrincipal),
      totalOutstandingInterest: toNumber(outstandingAggregate._sum.outstandingInterest),
      totalOutstandingFees: toNumber(outstandingAggregate._sum.outstandingFees),
      totalOutstandingTotal: toNumber(outstandingAggregate._sum.outstandingTotal),
      disbursedTodayAmount: toNumber(disbursedToday._sum.amount),
      disbursedThisWeekAmount: toNumber(disbursedWeek._sum.amount),
      disbursedThisMonthAmount: toNumber(disbursedMonth._sum.amount),
      repaymentsTodayAmount: toNumber(repaidToday._sum.amount),
      repaymentsThisWeekAmount: toNumber(repaidWeek._sum.amount),
      repaymentsThisMonthAmount: toNumber(repaidMonth._sum.amount)
    };
  }

  async getParBuckets(principal: TenantAdminPrincipal): Promise<PortfolioParResponseDto> {
    const tenantId = principal.tenantId;
    const now = new Date();
    const todayStart = startOfUtcDay(now);

    const activeLoans = await this.prisma.tenantLoanApplication.findMany({
      where: {
        tenantId,
        status: { in: ACTIVE_STATUSES }
      },
      select: {
        id: true,
        outstandingTotal: true
      }
    });

    const earliestUnpaidDue = await this.prisma.loanRepaymentScheduleItem.groupBy({
      by: ['loanApplicationId'],
      where: {
        tenantId,
        loanApplication: {
          status: { in: ACTIVE_STATUSES }
        },
        status: { not: 'PAID' }
      },
      _min: { dueDate: true }
    });

    const earliestByLoan = new Map<string, Date>();
    for (const row of earliestUnpaidDue) {
      if (row._min.dueDate) {
        earliestByLoan.set(row.loanApplicationId, row._min.dueDate);
      }
    }

    const dpdLoans: ParLoanInput[] = [];

    for (const loan of activeLoans) {
      const due = earliestByLoan.get(loan.id);
      if (!due) continue;
      const days = Math.max(0, Math.floor((todayStart.getTime() - startOfUtcDay(due).getTime()) / 86_400_000));
      if (days <= 0) continue;
      const amount = toNumber(loan.outstandingTotal);
      dpdLoans.push({ dpd: days, outstandingAmount: amount });
    }
    const computed = computeParBucketsFromLoans(dpdLoans);

    return {
      asOf: now.toISOString(),
      buckets: computed.buckets,
      par30: computed.par30,
      par90: computed.par90
    };
  }

  async getDelinquencyRatios(principal: TenantAdminPrincipal): Promise<PortfolioDelinquencyDto> {
    const [summary, par] = await Promise.all([
      this.getPortfolioSummary(principal),
      this.getParBuckets(principal)
    ]);
    const totalOutstanding = summary.totalOutstandingTotal;
    const ratios = computeDelinquencyRatios({
      totalOutstanding,
      par30Outstanding: par.par30,
      par90Outstanding: par.par90
    });
    return {
      asOf: new Date().toISOString(),
      nplRatio: ratios.nplRatio,
      par30Ratio: ratios.par30Ratio,
      totalOutstanding,
      par30Outstanding: par.par30,
      par90Outstanding: par.par90
    };
  }

  async getVintageAnalysis(principal: TenantAdminPrincipal, months = 6): Promise<PortfolioVintageResponseDto> {
    const tenantId = principal.tenantId;
    const boundedMonths = Math.min(Math.max(months, 1), 24);
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - boundedMonths + 1, 1));

    const loans = await this.prisma.tenantLoanApplication.findMany({
      where: {
        tenantId,
        disbursedAt: { gte: start },
        status: { in: DELINQUENCY_RELEVANT_STATUSES }
      },
      select: {
        disbursedAt: true,
        disbursedAmount: true,
        outstandingTotal: true,
        daysPastDue: true
      }
    });

    const buckets = new Map<string, { disbursedCount: number; disbursedAmount: number; delinquent30Amount: number; delinquent90Amount: number }>();
    for (let i = 0; i < boundedMonths; i += 1) {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
      buckets.set(monthKey(date), {
        disbursedCount: 0,
        disbursedAmount: 0,
        delinquent30Amount: 0,
        delinquent90Amount: 0
      });
    }

    for (const loan of loans) {
      if (!loan.disbursedAt) continue;
      const key = monthKey(loan.disbursedAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      const disbursed = toNumber(loan.disbursedAmount);
      const outstanding = toNumber(loan.outstandingTotal);
      bucket.disbursedCount += 1;
      bucket.disbursedAmount += disbursed;
      if (loan.daysPastDue >= 30) {
        bucket.delinquent30Amount += outstanding;
      }
      if (loan.daysPastDue >= 90) {
        bucket.delinquent90Amount += outstanding;
      }
    }

    return {
      months: boundedMonths,
      items: Array.from(buckets.entries()).map(([cohortMonth, data]) => ({
        cohortMonth,
        disbursedCount: data.disbursedCount,
        disbursedAmount: Number(data.disbursedAmount.toFixed(2)),
        delinquent30Amount: Number(data.delinquent30Amount.toFixed(2)),
        delinquent90Amount: Number(data.delinquent90Amount.toFixed(2))
      }))
    };
  }

  async getCollectionsSeries(principal: TenantAdminPrincipal, days = 30): Promise<PortfolioCollectionsSeriesDto> {
    const tenantId = principal.tenantId;
    const boundedDays = Math.min(Math.max(days, 1), 120);
    const end = startOfUtcDay(new Date());
    const start = addDays(end, -boundedDays + 1);

    const dayBuckets = Array.from({ length: boundedDays }, (_, idx) => addDays(start, idx)).map((date) => ({
      key: isoDayKey(date),
      iso: bucketDateIso(date),
      dueAmount: 0,
      collectedAmount: 0
    }));
    const bucketByKey = new Map(dayBuckets.map((bucket) => [bucket.key, bucket]));

    const [dueRows, collectedRows] = await Promise.all([
      this.prisma.loanRepaymentScheduleItem.findMany({
        where: {
          tenantId,
          dueDate: { gte: start, lt: endOfUtcDay(end) }
        },
        select: {
          dueDate: true,
          totalDue: true
        }
      }),
      this.prisma.loanRepayment.findMany({
        where: {
          tenantId,
          postedAt: { gte: start, lt: endOfUtcDay(end) }
        },
        select: {
          postedAt: true,
          amount: true
        }
      })
    ]);

    for (const row of dueRows) {
      const bucket = bucketByKey.get(isoDayKey(row.dueDate));
      if (!bucket) continue;
      bucket.dueAmount += toNumber(row.totalDue);
    }
    for (const row of collectedRows) {
      const bucket = bucketByKey.get(isoDayKey(row.postedAt));
      if (!bucket) continue;
      bucket.collectedAmount += toNumber(row.amount);
    }

    return {
      days: boundedDays,
      items: dayBuckets.map((bucket) => ({
        date: bucket.iso,
        dueAmount: Number(bucket.dueAmount.toFixed(2)),
        collectedAmount: Number(bucket.collectedAmount.toFixed(2)),
        collectionRate: boundedRate(bucket.collectedAmount, bucket.dueAmount)
      }))
    };
  }

  async getTreasuryExposure(principal: TenantAdminPrincipal): Promise<PortfolioTreasuryExposureDto> {
    const tenantId = principal.tenantId;
    const pools = await this.prisma.capitalPool.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });
    const allocations = await this.prisma.capitalAllocation.groupBy({
      by: ['poolId'],
      where: { tenantId },
      _sum: {
        reservedAmount: true,
        deployedAmount: true,
        releasedAmount: true,
        writtenOffAmount: true
      }
    });
    const byPool = new Map(allocations.map((row) => [row.poolId, row]));

    const poolRows = await Promise.all(
      pools.map(async (pool) => {
        const agg = byPool.get(pool.id);
        const committed = Math.max(
          0,
          toNumber(agg?._sum.deployedAmount) - toNumber(agg?._sum.releasedAmount) - toNumber(agg?._sum.writtenOffAmount)
        );
        const reserved = toNumber(agg?._sum.reservedAmount);
        const summary = await this.treasuryService.getPoolSummary(tenantId, pool.id);
        return {
          poolId: pool.id,
          poolName: pool.name,
          type: pool.type,
          status: pool.status,
          totalCommitted: Number(committed.toFixed(2)),
          totalReserved: Number(reserved.toFixed(2)),
          availableLiquidity: Number(Number(summary.available).toFixed(2))
        };
      })
    );

    return {
      asOf: new Date().toISOString(),
      pools: poolRows,
      totals: {
        committed: Number(poolRows.reduce((sum, row) => sum + row.totalCommitted, 0).toFixed(2)),
        reserved: Number(poolRows.reduce((sum, row) => sum + row.totalReserved, 0).toFixed(2)),
        availableLiquidity: Number(poolRows.reduce((sum, row) => sum + row.availableLiquidity, 0).toFixed(2))
      }
    };
  }

  async recomputeDailySnapshots(tenantId: string, days = 30): Promise<{ processed: number }> {
    const boundedDays = Math.min(Math.max(days, 1), 366);
    const today = startOfUtcDay(new Date());
    for (let i = 0; i < boundedDays; i += 1) {
      const targetDate = addDays(today, -i);
      const snapshot = await this.computeDailySnapshot(tenantId, targetDate);
      await this.prisma.portfolioDailySnapshot.upsert({
        where: {
          tenantId_date: {
            tenantId,
            date: targetDate
          }
        },
        update: snapshot,
        create: {
          tenantId,
          date: targetDate,
          ...snapshot
        }
      });
    }
    return { processed: boundedDays };
  }

  async recomputeSnapshotsAllTenants(days = 1): Promise<{ tenants: number; processed: number }> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true }
    });
    let processed = 0;
    for (const tenant of tenants) {
      const result = await this.recomputeDailySnapshots(tenant.id, days);
      processed += result.processed;
    }
    return { tenants: tenants.length, processed };
  }

  private async computeDailySnapshot(tenantId: string, date: Date): Promise<{
    activeLoanCount: number;
    outstandingTotal: Prisma.Decimal;
    par30Outstanding: Prisma.Decimal;
    par90Outstanding: Prisma.Decimal;
    disbursedAmount: Prisma.Decimal;
    repaidAmount: Prisma.Decimal;
  }> {
    const dayStart = startOfUtcDay(date);
    const dayEnd = endOfUtcDay(dayStart);
    const [activeLoanCount, outstanding, par30, par90, disbursed, repaid] = await Promise.all([
      this.prisma.tenantLoanApplication.count({
        where: {
          tenantId,
          status: { in: ACTIVE_STATUSES }
        }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: ACTIVE_STATUSES }
        },
        _sum: { outstandingTotal: true }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: ACTIVE_STATUSES },
          daysPastDue: { gte: 30 }
        },
        _sum: { outstandingTotal: true }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: ACTIVE_STATUSES },
          daysPastDue: { gte: 90 }
        },
        _sum: { outstandingTotal: true }
      }),
      this.prisma.tenantDisbursement.aggregate({
        where: {
          tenantId,
          status: TenantDisbursementStatus.SUCCESS,
          disbursedAt: { gte: dayStart, lt: dayEnd }
        },
        _sum: { amount: true }
      }),
      this.prisma.loanRepayment.aggregate({
        where: {
          tenantId,
          postedAt: { gte: dayStart, lt: dayEnd }
        },
        _sum: { amount: true }
      })
    ]);

    return {
      activeLoanCount,
      outstandingTotal: outstanding._sum.outstandingTotal ?? new Prisma.Decimal(0),
      par30Outstanding: par30._sum.outstandingTotal ?? new Prisma.Decimal(0),
      par90Outstanding: par90._sum.outstandingTotal ?? new Prisma.Decimal(0),
      disbursedAmount: disbursed._sum.amount ?? new Prisma.Decimal(0),
      repaidAmount: repaid._sum.amount ?? new Prisma.Decimal(0)
    };
  }

  async getKpis(principal: TenantAdminPrincipal): Promise<PortfolioKPIsDto> {
    const cacheKey = `kpis:${principal.tenantId}`;
    const cached = this.kpiCache.get(cacheKey);
    const nowMs = Date.now();
    if (cached && cached.expiresAt > nowMs) {
      return cached.data;
    }

    const now = new Date();
    const tenantId = principal.tenantId;

    const [
      activeLoansCount,
      totalDisbursedAgg,
      totalRepaidAgg,
      loansAggregate,
      par30Aggregate,
      par90Aggregate,
      scheduleInterestPaidAggregate,
      overdueScheduleRows,
      defaultedOrSevereLoans
    ] = await Promise.all([
      this.prisma.tenantLoanApplication.count({
        where: {
          tenantId,
          status: { in: ACTIVE_STATUSES }
        }
      }),
      this.prisma.tenantDisbursement.aggregate({
        where: {
          tenantId,
          status: TenantDisbursementStatus.SUCCESS
        },
        _sum: { amount: true }
      }),
      this.prisma.loanRepayment.aggregate({
        where: { tenantId },
        _sum: { amount: true }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          outstandingPrincipal: { gt: new Prisma.Decimal(0) }
        },
        _sum: {
          outstandingPrincipal: true,
          outstandingInterest: true
        }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          outstandingPrincipal: { gt: new Prisma.Decimal(0) },
          daysPastDue: { gte: 30 }
        },
        _sum: { outstandingPrincipal: true }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          outstandingPrincipal: { gt: new Prisma.Decimal(0) },
          daysPastDue: { gte: 90 }
        },
        _sum: { outstandingPrincipal: true }
      }),
      this.prisma.loanRepaymentScheduleItem.aggregate({
        where: { tenantId },
        _sum: { interestPaid: true }
      }),
      this.prisma.loanRepaymentScheduleItem.findMany({
        where: {
          tenantId,
          dueDate: { lt: now },
          status: { not: 'PAID' }
        },
        select: {
          totalDue: true,
          totalPaid: true
        }
      }),
      this.prisma.tenantLoanApplication.findMany({
        where: {
          tenantId,
          outstandingPrincipal: { gt: new Prisma.Decimal(0) },
          OR: [
            { status: { in: [TenantLoanApplicationStatus.DEFAULTED, TenantLoanApplicationStatus.WRITTEN_OFF] } },
            { daysPastDue: { gte: 90 } }
          ]
        },
        select: {
          id: true,
          principal: true,
          disbursedAmount: true,
          outstandingPrincipal: true,
          daysPastDue: true
        }
      })
    ]);

    const defaultedLoanIds = defaultedOrSevereLoans.map((loan) => loan.id);

    const [defaultEvents, defaultRepayments] = defaultedLoanIds.length
      ? await Promise.all([
          this.prisma.loanApplicationStatusHistory.findMany({
            where: {
              tenantId,
              loanApplicationId: { in: defaultedLoanIds },
              toStatus: TenantLoanApplicationStatus.DEFAULTED
            },
            select: {
              loanApplicationId: true,
              changedAt: true
            },
            orderBy: { changedAt: 'asc' }
          }),
          this.prisma.loanRepayment.findMany({
            where: {
              tenantId,
              loanApplicationId: { in: defaultedLoanIds }
            },
            select: {
              loanApplicationId: true,
              amount: true,
              postedAt: true
            }
          })
        ])
      : [[], []];

    const defaultedAtByLoan = new Map<string, Date>();
    for (const row of defaultEvents) {
      if (!defaultedAtByLoan.has(row.loanApplicationId)) {
        defaultedAtByLoan.set(row.loanApplicationId, row.changedAt);
      }
    }

    const recoveries = defaultRepayments.reduce((sum, row) => {
      const defaultedAt = defaultedAtByLoan.get(row.loanApplicationId);
      if (!defaultedAt) {
        return sum;
      }
      if (row.postedAt >= defaultedAt) {
        return sum + toNumber(row.amount);
      }
      return sum;
    }, 0);

    const overdueAmount = overdueScheduleRows.reduce((sum, row) => {
      const due = toNumber(row.totalDue);
      const paid = toNumber(row.totalPaid);
      return sum + Math.max(0, due - paid);
    }, 0);

    const totalPrincipalOutstanding = toNumber(loansAggregate._sum.outstandingPrincipal);
    const totalInterestOutstanding = toNumber(loansAggregate._sum.outstandingInterest);
    const totalInterestPaid = toNumber(scheduleInterestPaidAggregate._sum.interestPaid);
    const totalInterestAccrued = Math.max(0, totalInterestOutstanding + totalInterestPaid);

    const par30Amount = toNumber(par30Aggregate._sum.outstandingPrincipal);
    const par90Amount = toNumber(par90Aggregate._sum.outstandingPrincipal);
    const totalDisbursed = toNumber(totalDisbursedAgg._sum.amount);
    const totalRepaid = toNumber(totalRepaidAgg._sum.amount);

    const defaultedOutstanding = defaultedOrSevereLoans.reduce(
      (sum, loan) => sum + toNumber(loan.outstandingPrincipal),
      0
    );
    const defaultedPrincipal = defaultedOrSevereLoans.reduce((sum, loan) => {
      const base = toNumber(loan.disbursedAmount) || toNumber(loan.principal);
      return sum + Math.max(0, base);
    }, 0);

    const delinquentDaysPastDue = defaultedOrSevereLoans
      .map((loan) => loan.daysPastDue)
      .filter((days) => Number.isFinite(days) && days > 0);

    const result = buildPortfolioKpis({
      asOf: now.toISOString(),
      activeLoansCount,
      totalDisbursed,
      totalPrincipalOutstanding,
      totalInterestAccrued,
      totalRepaid,
      overdueAmount,
      par30Amount,
      par90Amount,
      defaultedOutstanding,
      defaultedPrincipal,
      recoveries,
      delinquentDaysPastDue
    });

    this.kpiCache.set(cacheKey, { expiresAt: nowMs + CACHE_TTL_MS, data: result });
    return result;
  }

  async getTrends(
    principal: TenantAdminPrincipal,
    query: PortfolioTrendsQueryDto
  ): Promise<PortfolioTrendsDto> {
    const cacheKey = `trends:${principal.tenantId}:${query.days}`;
    const cached = this.trendsCache.get(cacheKey);
    const nowMs = Date.now();
    if (cached && cached.expiresAt > nowMs) {
      return cached.data;
    }

    const endDate = startOfUtcDay(new Date());
    const startDate = addDays(endDate, -query.days + 1);
    const tenantId = principal.tenantId;

    const dayBuckets = Array.from({ length: query.days }, (_, idx) => addDays(startDate, idx)).map((date) => ({
      key: isoDayKey(date),
      iso: bucketDateIso(date),
      disbursementAmount: 0,
      repaymentAmount: 0,
      submitted: 0,
      approved: 0,
      rejected: 0
    }));

    const bucketByKey = new Map(dayBuckets.map((bucket) => [bucket.key, bucket]));

    const [disbursements, repayments, statusHistory, delinquencyRows] = await Promise.all([
      this.prisma.tenantDisbursement.findMany({
        where: {
          tenantId,
          status: TenantDisbursementStatus.SUCCESS,
          OR: [{ disbursedAt: { gte: startDate } }, { disbursedAt: null, createdAt: { gte: startDate } }]
        },
        select: {
          amount: true,
          disbursedAt: true,
          createdAt: true
        }
      }),
      this.prisma.loanRepayment.findMany({
        where: {
          tenantId,
          postedAt: { gte: startDate }
        },
        select: {
          amount: true,
          postedAt: true
        }
      }),
      this.prisma.loanApplicationStatusHistory.findMany({
        where: {
          tenantId,
          changedAt: { gte: startDate },
          toStatus: {
            in: [
              TenantLoanApplicationStatus.SUBMITTED,
              TenantLoanApplicationStatus.APPROVED,
              TenantLoanApplicationStatus.REJECTED
            ]
          }
        },
        select: {
          toStatus: true,
          changedAt: true
        }
      }),
      this.prisma.tenantLoanApplication.findMany({
        where: {
          tenantId,
          status: { in: DELINQUENCY_RELEVANT_STATUSES },
          outstandingPrincipal: { gt: new Prisma.Decimal(0) }
        },
        select: {
          daysPastDue: true
        }
      })
    ]);

    for (const row of disbursements) {
      const occurredAt = row.disbursedAt ?? row.createdAt;
      const bucket = bucketByKey.get(isoDayKey(occurredAt));
      if (!bucket) continue;
      bucket.disbursementAmount += toNumber(row.amount);
    }

    for (const row of repayments) {
      const bucket = bucketByKey.get(isoDayKey(row.postedAt));
      if (!bucket) continue;
      bucket.repaymentAmount += toNumber(row.amount);
    }

    for (const row of statusHistory) {
      const bucket = bucketByKey.get(isoDayKey(row.changedAt));
      if (!bucket) continue;
      if (row.toStatus === TenantLoanApplicationStatus.SUBMITTED) {
        bucket.submitted += 1;
      } else if (row.toStatus === TenantLoanApplicationStatus.APPROVED) {
        bucket.approved += 1;
      } else if (row.toStatus === TenantLoanApplicationStatus.REJECTED) {
        bucket.rejected += 1;
      }
    }

    const delinquencyBuckets = {
      current: 0,
      dpd1_30: 0,
      dpd31_60: 0,
      dpd61_90: 0,
      dpd90plus: 0
    };

    for (const row of delinquencyRows) {
      if (row.daysPastDue <= 0) delinquencyBuckets.current += 1;
      else if (row.daysPastDue <= 30) delinquencyBuckets.dpd1_30 += 1;
      else if (row.daysPastDue <= 60) delinquencyBuckets.dpd31_60 += 1;
      else if (row.daysPastDue <= 90) delinquencyBuckets.dpd61_90 += 1;
      else delinquencyBuckets.dpd90plus += 1;
    }

    const result: PortfolioTrendsDto = {
      days: query.days,
      disbursements: dayBuckets.map((bucket) => ({
        date: bucket.iso,
        amount: Number(bucket.disbursementAmount.toFixed(2))
      })),
      repayments: dayBuckets.map((bucket) => ({
        date: bucket.iso,
        amount: Number(bucket.repaymentAmount.toFixed(2))
      })),
      applications: dayBuckets.map((bucket) => ({
        date: bucket.iso,
        submitted: bucket.submitted,
        approved: bucket.approved,
        rejected: bucket.rejected
      })),
      delinquencyBuckets
    };

    this.trendsCache.set(cacheKey, { expiresAt: nowMs + CACHE_TTL_MS, data: result });
    return result;
  }
}
