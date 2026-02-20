import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { TenantDisbursementStatus, TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type InvariantFailure = {
  code: string;
  message: string;
  loanId?: string;
  tenantId?: string;
  details?: Record<string, unknown>;
};

type InvariantScanSummary = {
  tenantId?: string;
  totalLoansChecked: number;
  failuresCount: number;
  failures: InvariantFailure[];
};

@Injectable()
export class FinancialInvariantsService {
  private readonly logger = new Logger(FinancialInvariantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async assertLoanInvariants(loanId: string): Promise<void> {
    const result = await this.scanLoanInvariants(loanId);
    if (result.length > 0) {
      const first = result[0];
      throw new InternalServerErrorException({
        code: first.code,
        message: first.message,
        details: first.details ?? null
      });
    }
  }

  async assertSystemInvariants(): Promise<void> {
    const summary = await this.scanSystemInvariants();
    if (summary.failuresCount > 0) {
      throw new InternalServerErrorException({
        code: 'FINANCIAL_INVARIANT_FAILED',
        message: 'System financial integrity checks failed.',
        details: {
          failuresCount: summary.failuresCount,
          sample: summary.failures.slice(0, 5)
        }
      });
    }
  }

  async scanSystemInvariants(tenantId?: string): Promise<InvariantScanSummary> {
    const loans = await this.prisma.tenantLoanApplication.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: {
          in: [TenantLoanApplicationStatus.DISBURSED, TenantLoanApplicationStatus.OVERDUE]
        }
      },
      select: { id: true, tenantId: true }
    });

    const failures: InvariantFailure[] = [];
    for (const loan of loans) {
      const loanFailures = await this.scanLoanInvariants(loan.id);
      failures.push(...loanFailures);
    }

    const orphanLedgerEntries = await this.prisma.tenantLedgerEntry.count({
      where: {
        ...(tenantId ? { tenantId } : {}),
        lines: { none: {} }
      }
    });
    if (orphanLedgerEntries > 0) {
      failures.push({
        code: 'LEDGER_ORPHAN_ENTRY',
        message: 'Ledger contains orphan entries with no lines.',
        tenantId,
        details: { orphanLedgerEntries }
      });
      if (tenantId) {
        await this.flagSuspicious(tenantId, {
          entityType: 'SYSTEM_INTEGRITY',
          entityId: 'ledger',
          reason: 'Ledger imbalance detected',
          severity: 'HIGH'
        });
      }
    }

    return {
      tenantId,
      totalLoansChecked: loans.length,
      failuresCount: failures.length,
      failures
    };
  }

  private async scanLoanInvariants(loanId: string): Promise<InvariantFailure[]> {
    const loan = await this.prisma.tenantLoanApplication.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        tenantId: true,
        approvedAmount: true,
        requestedAmount: true,
        outstandingPrincipal: true,
        outstandingInterest: true,
        outstandingFees: true,
        outstandingTotal: true
      }
    });
    if (!loan) {
      return [
        {
          code: 'LOAN_NOT_FOUND',
          message: 'Loan not found during invariant check.',
          loanId
        }
      ];
    }

    const failures: InvariantFailure[] = [];
    const moneyFields = [
      ['outstandingPrincipal', loan.outstandingPrincipal],
      ['outstandingInterest', loan.outstandingInterest],
      ['outstandingFees', loan.outstandingFees],
      ['outstandingTotal', loan.outstandingTotal]
    ] as const;
    for (const [field, value] of moneyFields) {
      if (value.lt(0)) {
        failures.push({
          code: 'LOAN_NEGATIVE_BALANCE',
          message: 'Loan balances cannot be negative.',
          tenantId: loan.tenantId,
          loanId: loan.id,
          details: { field, value: value.toString() }
        });
        await this.flagSuspicious(loan.tenantId, {
          entityType: 'TENANT_LOAN_APPLICATION',
          entityId: loan.id,
          reason: 'Ledger imbalance detected',
          severity: 'HIGH'
        });
      }
    }

    const scheduleAgg = await this.prisma.loanRepaymentScheduleItem.aggregate({
      where: { tenantId: loan.tenantId, loanApplicationId: loan.id },
      _sum: { totalDue: true }
    });
    const repaymentAgg = await this.prisma.loanRepayment.aggregate({
      where: { tenantId: loan.tenantId, loanApplicationId: loan.id },
      _sum: { amount: true }
    });
    const scheduledDue = scheduleAgg._sum.totalDue;
    const totalRepaid = repaymentAgg._sum.amount;
    if (scheduledDue && totalRepaid && totalRepaid.gt(scheduledDue)) {
      failures.push({
        code: 'LOAN_OVERPAYMENT',
        message: 'Total repayments exceed scheduled total due.',
        tenantId: loan.tenantId,
        loanId: loan.id,
        details: {
          totalRepaid: totalRepaid.toString(),
          scheduledDue: scheduledDue.toString()
        }
      });
      await this.flagSuspicious(loan.tenantId, {
        entityType: 'TENANT_LOAN_APPLICATION',
        entityId: loan.id,
        reason: 'Repayment mismatch > threshold',
        severity: 'HIGH'
      });
    }

    const successfulDisbursements = await this.prisma.tenantDisbursement.findMany({
      where: {
        tenantId: loan.tenantId,
        loanApplicationId: loan.id,
        status: TenantDisbursementStatus.SUCCESS
      },
      select: { id: true, amount: true }
    });
    const approvedCeiling = loan.approvedAmount ?? loan.requestedAmount;
    for (const disbursement of successfulDisbursements) {
      if (disbursement.amount.gt(approvedCeiling)) {
        failures.push({
          code: 'OVER_DISBURSEMENT',
          message: 'Disbursement amount exceeds approved amount.',
          tenantId: loan.tenantId,
          loanId: loan.id,
          details: {
            disbursementId: disbursement.id,
            disbursementAmount: disbursement.amount.toString(),
            approvedAmount: approvedCeiling.toString()
          }
        });
        await this.flagSuspicious(loan.tenantId, {
          entityType: 'TENANT_DISBURSEMENT',
          entityId: disbursement.id,
          reason: 'Disbursement exceeds approved amount',
          severity: 'HIGH'
        });
      }
    }

    for (const failure of failures) {
      this.logger.error({
        event: 'financial_invariant_failed',
        code: failure.code,
        message: failure.message,
        tenantId: failure.tenantId,
        loanId: failure.loanId,
        details: failure.details ?? null
      });
    }

    return failures;
  }

  private async flagSuspicious(
    tenantId: string,
    input: { entityType: string; entityId: string; reason: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }
  ): Promise<void> {
    const duplicate = await (this.prisma as any).suspiciousActivity.findFirst({
      where: {
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        severity: input.severity,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      },
      select: { id: true }
    });
    if (duplicate) return;
    await (this.prisma as any).suspiciousActivity.create({
      data: {
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        severity: input.severity
      }
    });
  }
}
