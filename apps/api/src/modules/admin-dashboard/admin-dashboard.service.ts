import { Injectable } from '@nestjs/common';
import { TenantDisbursementStatus, TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import type { DashboardActivityItemDto, DashboardActivityType, DashboardRecentActivityQueryDto } from './dto/dashboard-activity.dto';
import type { DashboardMetricsDto } from './dto/dashboard-metrics.dto';

const FUNDED_OR_CLOSED_STATUSES: TenantLoanApplicationStatus[] = [
  TenantLoanApplicationStatus.DISBURSED,
  TenantLoanApplicationStatus.OVERDUE,
  TenantLoanApplicationStatus.REPAID,
  TenantLoanApplicationStatus.DEFAULTED,
  TenantLoanApplicationStatus.SETTLED,
  TenantLoanApplicationStatus.WRITTEN_OFF
];

const ACTIVE_PORTFOLIO_STATUSES: TenantLoanApplicationStatus[] = [
  TenantLoanApplicationStatus.DISBURSED,
  TenantLoanApplicationStatus.OVERDUE
];

export function computePar30Rate(par30Outstanding: number, portfolioOutstanding: number): number {
  if (portfolioOutstanding <= 0) return 0;
  const raw = par30Outstanding / portfolioOutstanding;
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(1, Number(raw.toFixed(6)));
}

export function computeDefaultRate(defaultedLoans: number, reachedDisbursedOrActiveLoans: number): number {
  if (reachedDisbursedOrActiveLoans <= 0) return 0;
  const raw = defaultedLoans / reachedDisbursedOrActiveLoans;
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.min(1, Number(raw.toFixed(6)));
}

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

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(principal: TenantAdminPrincipal): Promise<DashboardMetricsDto> {
    const tenantId = principal.tenantId;

    const [
      disbursedAmountAgg,
      fallbackPrincipalAgg,
      activeLoans,
      portfolioOutstandingAgg,
      par30OutstandingAgg,
      totalInterestEarnedAgg,
      defaultedLoans,
      denominatorLoans
    ] = await Promise.all([
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: FUNDED_OR_CLOSED_STATUSES },
          disbursedAmount: { not: null }
        },
        _sum: { disbursedAmount: true }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: FUNDED_OR_CLOSED_STATUSES },
          disbursedAmount: null
        },
        _sum: { principal: true }
      }),
      this.prisma.tenantLoanApplication.count({
        where: {
          tenantId,
          status: { in: ACTIVE_PORTFOLIO_STATUSES }
        }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: ACTIVE_PORTFOLIO_STATUSES }
        },
        _sum: { outstandingTotal: true }
      }),
      this.prisma.tenantLoanApplication.aggregate({
        where: {
          tenantId,
          status: { in: ACTIVE_PORTFOLIO_STATUSES },
          daysPastDue: { gte: 30 }
        },
        _sum: { outstandingTotal: true }
      }),
      this.prisma.loanRepaymentScheduleItem.aggregate({
        where: { tenantId },
        _sum: { interestPaid: true }
      }),
      this.prisma.tenantLoanApplication.count({
        where: {
          tenantId,
          status: TenantLoanApplicationStatus.DEFAULTED
        }
      }),
      this.prisma.tenantLoanApplication.count({
        where: {
          tenantId,
          status: { in: FUNDED_OR_CLOSED_STATUSES }
        }
      })
    ]);

    const totalLoanVolume =
      toNumber(disbursedAmountAgg._sum.disbursedAmount) + toNumber(fallbackPrincipalAgg._sum.principal);
    const portfolioOutstanding = toNumber(portfolioOutstandingAgg._sum.outstandingTotal);
    const par30Outstanding = toNumber(par30OutstandingAgg._sum.outstandingTotal);
    const totalInterestEarned = toNumber(totalInterestEarnedAgg._sum.interestPaid);

    return {
      totals: {
        totalLoanVolume,
        activeLoans,
        portfolioOutstanding,
        par30: computePar30Rate(par30Outstanding, portfolioOutstanding),
        totalInterestEarned,
        defaultRate: computeDefaultRate(defaultedLoans, denominatorLoans)
      },
      snapshots: {
        asOf: new Date().toISOString()
      }
    };
  }

  async getRecentActivity(
    principal: TenantAdminPrincipal,
    query: DashboardRecentActivityQueryDto
  ): Promise<DashboardActivityItemDto[]> {
    const tenantId = principal.tenantId;
    const take = query.limit;

    const [statusHistory, disbursements, repayments] = await Promise.all([
      this.prisma.loanApplicationStatusHistory.findMany({
        where: {
          tenantId,
          toStatus: {
            in: [
              TenantLoanApplicationStatus.SUBMITTED,
              TenantLoanApplicationStatus.APPROVED,
              TenantLoanApplicationStatus.DEFAULTED
            ]
          }
        },
        select: {
          id: true,
          loanApplicationId: true,
          toStatus: true,
          changedAt: true
        },
        orderBy: { changedAt: 'desc' },
        take
      }),
      this.prisma.tenantDisbursement.findMany({
        where: {
          tenantId,
          status: TenantDisbursementStatus.SUCCESS
        },
        select: {
          id: true,
          loanApplicationId: true,
          amount: true,
          disbursedAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take
      }),
      this.prisma.loanRepayment.findMany({
        where: { tenantId },
        select: {
          id: true,
          loanApplicationId: true,
          amount: true,
          postedAt: true,
          createdAt: true
        },
        orderBy: { postedAt: 'desc' },
        take
      })
    ]);

    const statusActivities: DashboardActivityItemDto[] = statusHistory
      .map((row) => {
        if (row.toStatus === TenantLoanApplicationStatus.SUBMITTED) {
          return this.makeActivity({
            sourceId: row.id,
            type: 'LOAN_SUBMITTED',
            title: 'Loan submitted',
            createdAt: row.changedAt,
            loanApplicationId: row.loanApplicationId
          });
        }
        if (row.toStatus === TenantLoanApplicationStatus.APPROVED) {
          return this.makeActivity({
            sourceId: row.id,
            type: 'LOAN_APPROVED',
            title: 'Loan approved',
            createdAt: row.changedAt,
            loanApplicationId: row.loanApplicationId
          });
        }
        if (row.toStatus === TenantLoanApplicationStatus.DEFAULTED) {
          return this.makeActivity({
            sourceId: row.id,
            type: 'LOAN_DEFAULTED',
            title: 'Loan defaulted',
            createdAt: row.changedAt,
            loanApplicationId: row.loanApplicationId
          });
        }
        return null;
      })
      .filter((item): item is DashboardActivityItemDto => item !== null);

    const disbursementActivities: DashboardActivityItemDto[] = disbursements.map((row) =>
      this.makeActivity({
        sourceId: row.id,
        type: 'LOAN_DISBURSED',
        title: 'Loan disbursed',
        createdAt: row.disbursedAt ?? row.createdAt,
        loanApplicationId: row.loanApplicationId,
        amount: toNumber(row.amount)
      })
    );

    const repaymentActivities: DashboardActivityItemDto[] = repayments.map((row) =>
      this.makeActivity({
        sourceId: row.id,
        type: 'REPAYMENT_RECEIVED',
        title: 'Repayment received',
        createdAt: row.postedAt ?? row.createdAt,
        loanApplicationId: row.loanApplicationId,
        amount: toNumber(row.amount)
      })
    );

    return [...statusActivities, ...disbursementActivities, ...repaymentActivities]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, take);
  }

  private makeActivity(input: {
    sourceId: string;
    type: DashboardActivityType;
    title: string;
    createdAt: Date;
    loanApplicationId?: string;
    amount?: number;
  }): DashboardActivityItemDto {
    return {
      id: `${input.type}:${input.sourceId}`,
      type: input.type,
      title: input.title,
      createdAt: input.createdAt.toISOString(),
      loanApplicationId: input.loanApplicationId,
      amount: input.amount
    };
  }
}
