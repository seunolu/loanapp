import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';

type ForensicEvent = {
  kind: string;
  at: string;
  id: string;
};

@Injectable()
export class ForensicReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getLoanForensicReport(admin: TenantAdminPrincipal, loanApplicationId: string) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanApplicationId, tenantId: admin.tenantId }
    });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found.',
        details: { loanApplicationId }
      });
    }

    const [statusHistory, disbursements, repayments, ledgerEntries, auditTrail, riskEvents, treasuryAllocations] =
      await Promise.all([
        this.prisma.loanApplicationStatusHistory.findMany({
          where: { tenantId: admin.tenantId, loanApplicationId },
          orderBy: { changedAt: 'asc' }
        }),
        this.prisma.tenantDisbursement.findMany({
          where: { tenantId: admin.tenantId, loanApplicationId },
          orderBy: { createdAt: 'asc' }
        }),
        this.prisma.loanRepayment.findMany({
          where: { tenantId: admin.tenantId, loanApplicationId },
          orderBy: { postedAt: 'asc' }
        }),
        this.prisma.tenantLedgerEntry.findMany({
          where: { tenantId: admin.tenantId, referenceId: loanApplicationId },
          include: {
            lines: {
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { occurredAt: 'asc' }
        }),
        this.prisma.auditEvent.findMany({
          where: {
            tenantId: admin.tenantId,
            entityId: loanApplicationId
          },
          orderBy: { createdAt: 'asc' }
        }),
        this.prisma.fraudSignal.findMany({
          where: { tenantId: admin.tenantId, loanApplicationId },
          orderBy: { createdAt: 'asc' }
        }),
        this.prisma.capitalAllocation.findMany({
          where: { tenantId: admin.tenantId, loanApplicationId },
          orderBy: { createdAt: 'asc' }
        })
      ]);

    const timeline: ForensicEvent[] = [];
    for (const row of statusHistory) timeline.push({ kind: 'STATUS_HISTORY', at: row.changedAt.toISOString(), id: row.id });
    for (const row of disbursements) timeline.push({ kind: 'DISBURSEMENT', at: row.createdAt.toISOString(), id: row.id });
    for (const row of repayments) timeline.push({ kind: 'REPAYMENT', at: row.postedAt.toISOString(), id: row.id });
    for (const row of ledgerEntries) timeline.push({ kind: 'LEDGER_ENTRY', at: row.occurredAt.toISOString(), id: row.id });
    for (const row of auditTrail) timeline.push({ kind: 'AUDIT_EVENT', at: row.createdAt.toISOString(), id: row.id });
    for (const row of riskEvents) timeline.push({ kind: 'RISK_EVENT', at: row.createdAt.toISOString(), id: row.id });
    for (const row of treasuryAllocations) timeline.push({ kind: 'TREASURY_ALLOCATION', at: row.createdAt.toISOString(), id: row.id });

    timeline.sort((a, b) => a.at.localeCompare(b.at));

    return {
      loan,
      statusHistory,
      disbursements,
      repayments,
      ledgerEntries,
      auditTrail,
      riskEvents,
      treasuryAllocations,
      timeline
    };
  }
}

