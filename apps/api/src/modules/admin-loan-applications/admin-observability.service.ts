import { ForbiddenException, Injectable } from '@nestjs/common';
import { IdempotencyStatus, TenantDisbursementStatus, TenantLedgerDirection, TenantLoanApplicationStatus } from '@prisma/client';
import { MetricsService } from '../../common/observability/metrics.service';
import { PrismaService } from '../../common/database/prisma.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';

@Injectable()
export class AdminObservabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService
  ) {}

  async getTenantMetrics(admin: TenantAdminPrincipal) {
    this.assertSuperAdmin(admin);
    return this.metricsService.getTenantMetrics(admin.tenantId);
  }

  async getSystemStatus(admin: TenantAdminPrincipal) {
    this.assertSuperAdmin(admin);

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [
      dbUp,
      pendingDisbursements,
      stuckTransitions,
      pausedInterest,
      ledgerEntries,
      criticalAuditEvents,
      failedIdempotencyKeys,
      activeLoanAccounts,
      overdueAccounts,
      disbursedAmountAgg,
      repaymentsAmountAgg
    ] =
      await Promise.all([
        this.prisma.isHealthy(),
        this.prisma.tenantDisbursement.count({
          where: {
            tenantId: admin.tenantId,
            status: { in: [TenantDisbursementStatus.PENDING, TenantDisbursementStatus.PROCESSING] }
          }
        }),
        this.prisma.idempotencyKey.count({
          where: { tenantId: admin.tenantId, status: 'PENDING', updatedAt: { lt: tenMinutesAgo } }
        }),
        this.prisma.tenantLoanApplication.count({
          where: { tenantId: admin.tenantId, interestAccrualPaused: true }
        }),
        this.prisma.tenantLedgerEntry.findMany({
          where: { tenantId: admin.tenantId },
          select: {
            lines: { select: { direction: true, amount: true } }
          }
        }),
        this.prisma.auditLog.findMany({
          where: {
            tenantId: admin.tenantId,
            OR: [{ action: { contains: 'FAILED' } }, { event: { contains: 'FAILED' } }]
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }),
        this.prisma.idempotencyKey.count({
          where: { tenantId: admin.tenantId, status: IdempotencyStatus.FAILED }
        }),
        this.prisma.tenantLoanApplication.count({
          where: {
            tenantId: admin.tenantId,
            status: {
              in: [
                TenantLoanApplicationStatus.APPROVED,
                TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
                TenantLoanApplicationStatus.DISBURSED,
                TenantLoanApplicationStatus.OVERDUE
              ]
            }
          }
        }),
        this.prisma.tenantLoanApplication.count({
          where: {
            tenantId: admin.tenantId,
            OR: [
              { status: TenantLoanApplicationStatus.OVERDUE },
              { delinquencyStatus: 'OVERDUE' }
            ]
          }
        }),
        this.prisma.tenantDisbursement.aggregate({
          where: { tenantId: admin.tenantId, status: TenantDisbursementStatus.SUCCESS },
          _sum: { amount: true }
        }),
        this.prisma.loanRepayment.aggregate({
          where: { tenantId: admin.tenantId },
          _sum: { amount: true }
        })
      ]);
    let ledgerImbalanceCount = 0;
    for (const entry of ledgerEntries) {
      let debit = 0;
      let credit = 0;
      for (const line of entry.lines) {
        const value = Number(line.amount.toString());
        if (line.direction === TenantLedgerDirection.DEBIT) debit += value;
        if (line.direction === TenantLedgerDirection.CREDIT) credit += value;
      }
      if (Math.abs(debit - credit) > 0.0001) ledgerImbalanceCount += 1;
    }

    return {
      status: dbUp && ledgerImbalanceCount === 0 ? 'green' : dbUp ? 'yellow' : 'red',
      health: {
        database: dbUp ? 'up' : 'down',
        pendingDisbursements,
        stuckTransitions,
        pausedInterest,
        ledgerImbalanceCount
      },
      criticalAuditEvents: criticalAuditEvents.map((event) => ({
        id: event.id,
        createdAt: event.createdAt.toISOString(),
        action: event.action ?? event.event,
        entityType: event.entityType ?? event.entity ?? null,
        entityId: event.entityId ?? null
      })),
      failedIdempotencyKeys,
      activeLoanAccounts,
      overdueAccounts,
      totalDisbursedAmount: disbursedAmountAgg._sum.amount?.toString() ?? '0',
      totalRepaymentsAmount: repaymentsAmountAgg._sum.amount?.toString() ?? '0'
    };
  }

  async getIntegrityStatus(admin: TenantAdminPrincipal) {
    this.assertSuperAdmin(admin);
    const snapshot = await this.prisma.systemIntegritySnapshot.findFirst({
      where: { tenantId: admin.tenantId },
      orderBy: { checkedAt: 'desc' }
    });

    if (!snapshot) {
      return {
        status: 'UNKNOWN',
        failuresCount: 0,
        checkedAt: null,
        totalLoansChecked: 0
      };
    }

    return {
      status: snapshot.status,
      failuresCount: snapshot.failuresCount,
      checkedAt: snapshot.checkedAt.toISOString(),
      totalLoansChecked: snapshot.totalLoansChecked
    };
  }

  private assertSuperAdmin(admin: TenantAdminPrincipal): void {
    if (admin.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only SUPER_ADMIN can access operational observability endpoints.',
        details: null
      });
    }
  }
}
