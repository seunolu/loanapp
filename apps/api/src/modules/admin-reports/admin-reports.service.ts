import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import type { CollectionsQueryDto, ParQueryDto, PortfolioQueryDto, SummaryQueryDto } from './dto/admin-reports-query.dto';
import type {
  CollectionsReportDto,
  DailyCollectionBucketDto,
  ParReportDto,
  PortfolioReportDto,
  SummaryReportDto
} from './dto/admin-reports-response.dto';

@Injectable()
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  async getSummary(admin: AdminPrincipal, query: SummaryQueryDto): Promise<SummaryReportDto> {
    const asOf = this.parseAsOf(query.asOf);
    const isHistoricalDay = this.isHistoricalDay(asOf);
    const dayStart = this.startOfUtcDay(asOf);
    const cacheKey = `reports:summary:${admin.lenderId}:${dayStart.toISOString()}`;
    if (!query.asOf) {
      const cached = await this.redisService.getClient().get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as SummaryReportDto;
      }
    }

    const aggregate = isHistoricalDay ? await this.findDailyAggregate(admin.lenderId, dayStart) : null;
    if (aggregate) {
      const fromAggregate: SummaryReportDto = {
        asOf: asOf.toISOString(),
        totalBorrowers: await this.prisma.borrower.count({
          where: { lenderId: admin.lenderId, createdAt: { lte: this.endOfUtcDay(asOf) } }
        }),
        activeLoans: aggregate.activeLoansCount,
        overdueLoans: aggregate.overdueLoansCount,
        pendingDisbursementLoans: await this.prisma.loan.count({
          where: {
            lenderId: admin.lenderId,
            status: 'PENDING_DISBURSEMENT',
            createdAt: { lte: this.endOfUtcDay(asOf) }
          }
        }),
        outstandingPrincipalKobo: aggregate.principalOutstandingKobo,
        outstandingTotalKobo: aggregate.totalOutstandingKobo,
        disbursedTotalKobo: aggregate.disbursedKobo,
        collectedTotalKobo: aggregate.collectionsKobo
      };
      if (!query.asOf) {
        await this.redisService.getClient().set(cacheKey, JSON.stringify(fromAggregate), 'EX', 60);
      }
      return fromAggregate;
    }

    const snapshot = await this.computeSnapshot(admin.lenderId, asOf);
    if (!query.asOf) {
      await this.redisService.getClient().set(cacheKey, JSON.stringify(snapshot.summary), 'EX', 60);
    }

    return snapshot.summary;
  }

  async buildDailyAggregateForDate(targetDate: Date): Promise<void> {
    const dayStart = this.startOfUtcDay(targetDate);
    const dayEnd = this.endOfUtcDay(targetDate);
    const lenders = await this.prisma.lender.findMany({
      select: { id: true }
    });

    for (const lender of lenders) {
      const snapshot = await this.computeSnapshot(lender.id, dayEnd);
      await this.prisma.dailyAggregate.upsert({
        where: {
          lenderId_date: {
            lenderId: lender.id,
            date: dayStart
          }
        },
        update: {
          activeLoansCount: snapshot.summary.activeLoans,
          overdueLoansCount: snapshot.summary.overdueLoans,
          principalOutstandingKobo: snapshot.summary.outstandingPrincipalKobo,
          totalOutstandingKobo: snapshot.summary.outstandingTotalKobo,
          disbursedKobo: snapshot.summary.disbursedTotalKobo,
          collectionsKobo: snapshot.summary.collectedTotalKobo,
          par1Kobo: snapshot.par.par1AmountKobo,
          par7Kobo: snapshot.par.par7AmountKobo,
          par30Kobo: snapshot.par.par30AmountKobo
        },
        create: {
          lenderId: lender.id,
          date: dayStart,
          activeLoansCount: snapshot.summary.activeLoans,
          overdueLoansCount: snapshot.summary.overdueLoans,
          principalOutstandingKobo: snapshot.summary.outstandingPrincipalKobo,
          totalOutstandingKobo: snapshot.summary.outstandingTotalKobo,
          disbursedKobo: snapshot.summary.disbursedTotalKobo,
          collectionsKobo: snapshot.summary.collectedTotalKobo,
          par1Kobo: snapshot.par.par1AmountKobo,
          par7Kobo: snapshot.par.par7AmountKobo,
          par30Kobo: snapshot.par.par30AmountKobo
        }
      });
    }
  }

  async getPortfolio(admin: AdminPrincipal, query: PortfolioQueryDto): Promise<PortfolioReportDto> {
    const { from, to } = this.parseRange(query.from, query.to);

    const [submittedAgg, approvedCount, rejectedCount, offersAgg, disbursementAgg] = await Promise.all([
      this.prisma.loanApplication.aggregate({
        where: {
          lenderId: admin.lenderId,
          submittedAt: { gte: from, lte: to }
        },
        _count: { _all: true },
        _sum: { amountRequested: true }
      }),
      this.prisma.loanApplication.count({
        where: {
          lenderId: admin.lenderId,
          status: 'APPROVED',
          reviewedAt: { gte: from, lte: to }
        }
      }),
      this.prisma.loanApplication.count({
        where: {
          lenderId: admin.lenderId,
          status: 'REJECTED',
          reviewedAt: { gte: from, lte: to }
        }
      }),
      this.prisma.loanOffer.aggregate({
        where: {
          lenderId: admin.lenderId,
          offeredAt: { gte: from, lte: to }
        },
        _count: { _all: true },
        _sum: { principalAmount: true }
      }),
      this.prisma.disbursement.aggregate({
        where: {
          lenderId: admin.lenderId,
          status: 'SUCCEEDED',
          succeededAt: { gte: from, lte: to }
        },
        _count: { _all: true },
        _sum: { amountKobo: true }
      })
    ]);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      submittedApplicationsCount: submittedAgg._count._all,
      submittedApplicationsAmountKobo: submittedAgg._sum.amountRequested ?? 0,
      approvedApplicationsCount: approvedCount,
      rejectedApplicationsCount: rejectedCount,
      offersCount: offersAgg._count._all,
      offeredPrincipalKobo: offersAgg._sum.principalAmount ?? 0,
      disbursementsSucceededCount: disbursementAgg._count._all,
      disbursementsSucceededAmountKobo: disbursementAgg._sum.amountKobo ?? 0
    };
  }

  async getCollections(admin: AdminPrincipal, query: CollectionsQueryDto): Promise<CollectionsReportDto> {
    const { from, to } = this.parseRange(query.from, query.to);

    const aggregate = await this.prisma.repayment.aggregate({
      where: {
        loan: { lenderId: admin.lenderId },
        createdAt: { gte: from, lte: to }
      },
      _count: { _all: true },
      _sum: { amountKobo: true }
    });

    let dailyBuckets: DailyCollectionBucketDto[] = [];
    if (query.daily) {
      const rows = await this.prisma.$queryRaw<Array<{ day: Date; amount: bigint; count: bigint }>>`
        SELECT DATE_TRUNC('day', r."createdAt") AS day,
               COALESCE(SUM(r."amountKobo"), 0)::bigint AS amount,
               COUNT(*)::bigint AS count
        FROM "Repayment" r
        INNER JOIN "Loan" l ON l."id" = r."loanId"
        WHERE l."lenderId" = ${admin.lenderId}
          AND r."createdAt" >= ${from}
          AND r."createdAt" <= ${to}
        GROUP BY DATE_TRUNC('day', r."createdAt")
        ORDER BY day ASC
      `;

      dailyBuckets = rows.map((row) => ({
        date: row.day.toISOString().slice(0, 10),
        amountKobo: Number(row.amount),
        count: Number(row.count)
      }));
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalCollectedKobo: aggregate._sum.amountKobo ?? 0,
      paymentsCount: aggregate._count._all,
      dailyBuckets
    };
  }

  async getPar(admin: AdminPrincipal, query: ParQueryDto): Promise<ParReportDto> {
    const asOf = this.parseAsOf(query.asOf);
    const isHistoricalDay = this.isHistoricalDay(asOf);
    const dayStart = this.startOfUtcDay(asOf);
    const aggregate = isHistoricalDay ? await this.findDailyAggregate(admin.lenderId, dayStart) : null;

    if (aggregate) {
      const portfolioOutstandingKobo = aggregate.totalOutstandingKobo;
      return {
        asOf: asOf.toISOString(),
        portfolioOutstandingKobo,
        par1AmountKobo: aggregate.par1Kobo,
        par1Rate: this.rate(aggregate.par1Kobo, portfolioOutstandingKobo),
        par7AmountKobo: aggregate.par7Kobo,
        par7Rate: this.rate(aggregate.par7Kobo, portfolioOutstandingKobo),
        par30AmountKobo: aggregate.par30Kobo,
        par30Rate: this.rate(aggregate.par30Kobo, portfolioOutstandingKobo)
      };
    }

    const snapshot = await this.computeSnapshot(admin.lenderId, asOf);
    return snapshot.par;
  }

  private async computeSnapshot(
    lenderId: string,
    asOf: Date
  ): Promise<{ summary: SummaryReportDto; par: ParReportDto }> {
    const [totalBorrowers, loanStatusCounts, loanBalanceAgg, disbursementAgg, repaymentAgg] = await Promise.all([
      this.prisma.borrower.count({
        where: { lenderId, createdAt: { lte: asOf } }
      }),
      this.prisma.loan.groupBy({
        by: ['status'],
        where: {
          lenderId,
          createdAt: { lte: asOf }
        },
        _count: { _all: true }
      }),
      this.prisma.loanBalance.aggregate({
        where: {
          loan: {
            lenderId,
            createdAt: { lte: asOf }
          }
        },
        _sum: {
          outstandingPrincipalKobo: true,
          totalOutstandingKobo: true
        }
      }),
      this.prisma.disbursement.aggregate({
        where: {
          lenderId,
          status: 'SUCCEEDED',
          succeededAt: { lte: asOf }
        },
        _sum: { amountKobo: true }
      }),
      this.prisma.repayment.aggregate({
        where: {
          loan: { lenderId },
          createdAt: { lte: asOf }
        },
        _sum: { amountKobo: true }
      })
    ]);

    const countByStatus = new Map(loanStatusCounts.map((item) => [item.status, item._count._all]));

    const summary: SummaryReportDto = {
      asOf: asOf.toISOString(),
      totalBorrowers,
      activeLoans: countByStatus.get('ACTIVE') ?? 0,
      overdueLoans: countByStatus.get('OVERDUE') ?? 0,
      pendingDisbursementLoans: countByStatus.get('PENDING_DISBURSEMENT') ?? 0,
      outstandingPrincipalKobo: loanBalanceAgg._sum?.outstandingPrincipalKobo ?? 0,
      outstandingTotalKobo: loanBalanceAgg._sum?.totalOutstandingKobo ?? 0,
      disbursedTotalKobo: disbursementAgg._sum?.amountKobo ?? 0,
      collectedTotalKobo: repaymentAgg._sum?.amountKobo ?? 0
    };

    const asOf1 = new Date(asOf.getTime() - 1 * 24 * 60 * 60 * 1000);
    const asOf7 = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
    const asOf30 = new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [portfolioAgg, par1Agg, par7Agg, par30Agg] = await Promise.all([
      this.prisma.loanBalance.aggregate({
        where: this.buildParWhere(lenderId),
        _sum: { totalOutstandingKobo: true }
      }),
      this.prisma.loanBalance.aggregate({
        where: this.buildParWhere(lenderId, asOf1),
        _sum: { totalOutstandingKobo: true }
      }),
      this.prisma.loanBalance.aggregate({
        where: this.buildParWhere(lenderId, asOf7),
        _sum: { totalOutstandingKobo: true }
      }),
      this.prisma.loanBalance.aggregate({
        where: this.buildParWhere(lenderId, asOf30),
        _sum: { totalOutstandingKobo: true }
      })
    ]);

    const portfolioOutstandingKobo = portfolioAgg._sum?.totalOutstandingKobo ?? 0;
    const par1AmountKobo = par1Agg._sum?.totalOutstandingKobo ?? 0;
    const par7AmountKobo = par7Agg._sum?.totalOutstandingKobo ?? 0;
    const par30AmountKobo = par30Agg._sum?.totalOutstandingKobo ?? 0;

    const par: ParReportDto = {
      asOf: asOf.toISOString(),
      portfolioOutstandingKobo,
      par1AmountKobo,
      par1Rate: this.rate(par1AmountKobo, portfolioOutstandingKobo),
      par7AmountKobo,
      par7Rate: this.rate(par7AmountKobo, portfolioOutstandingKobo),
      par30AmountKobo,
      par30Rate: this.rate(par30AmountKobo, portfolioOutstandingKobo)
    };

    return { summary, par };
  }

  private parseAsOf(value?: string): Date {
    if (!value) {
      return new Date();
    }
    const asOf = new Date(value);
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid asOf date.',
        details: null
      });
    }
    return asOf;
  }

  private parseRange(fromValue: string, toValue: string): { from: Date; to: Date } {
    const from = new Date(fromValue);
    const to = new Date(toValue);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid date range.',
        details: null
      });
    }

    if (from > to) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'from must be before or equal to to.',
        details: null
      });
    }

    return { from, to };
  }

  private rate(numerator: number, denominator: number): number {
    if (!denominator) {
      return 0;
    }
    return Number(((numerator / denominator) * 100).toFixed(4));
  }

  private buildParWhere(lenderId: string, dueDateCutoff?: Date): Prisma.LoanBalanceWhereInput {
    const where: Prisma.LoanBalanceWhereInput = {
      loan: {
        lenderId,
        status: { in: ['ACTIVE', 'OVERDUE'] }
      }
    };

    if (!dueDateCutoff) {
      return where;
    }

    where.loan = {
      lenderId,
      status: { in: ['ACTIVE', 'OVERDUE'] },
      repaymentSchedule: {
        some: {
          dueDate: { lte: dueDateCutoff },
          status: { in: ['PENDING', 'LATE'] }
        }
      }
    };

    return where;
  }

  private startOfUtcDay(input: Date): Date {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
  }

  private endOfUtcDay(input: Date): Date {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 23, 59, 59, 999));
  }

  private isHistoricalDay(input: Date): boolean {
    const today = this.startOfUtcDay(new Date());
    return this.startOfUtcDay(input) < today;
  }

  private findDailyAggregate(lenderId: string, date: Date) {
    return this.prisma.dailyAggregate.findUnique({
      where: {
        lenderId_date: {
          lenderId,
          date
        }
      }
    });
  }
}
