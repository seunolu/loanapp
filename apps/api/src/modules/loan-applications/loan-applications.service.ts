import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TenantAdminRole, TenantLoanApplicationStatus, TenantRepaymentScheduleStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { AuditLoggerService } from '../../common/audit/audit-logger.service';
import { PrismaService } from '../../common/database/prisma.service';
import { LoanBalanceService } from '../../common/ledger/loan-balance.service';
import { LedgerService } from '../ledger/ledger.service';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { TenantScopedPrismaService } from '../../common/tenant/tenant-scoped-prisma.service';
import { assertTenantMatch } from '../../common/tenant/assert-tenant-match';
import { ensureTenantMatch, requireTenantId } from '../../common/tenancy/tenant-guard';
import { withTenant } from '../../common/tenancy/tenant-prisma';
import { assertValidTransition } from './loan-application-status-transition';
import { assertRoleCanTransition } from './loan-application-transition-rbac';
import type { CreateTenantLoanApplicationDto } from './dto/create-tenant-loan-application.dto';
import type { ListTenantLoanApplicationsResponseDto } from './dto/list-tenant-loan-applications-response.dto';
import type { TenantLoanApplicationDetailsDto } from './dto/tenant-loan-application-details.dto';
import type { TenantLoanApplicationSummaryDto } from './dto/tenant-loan-application-summary.dto';
import { RiskService, enforceRiskGate } from '../../risk/risk.service';
import { FraudEvaluatorService } from '../fraud/fraud-evaluator.service';
import { HoldEnforcementService } from '../fraud/hold-enforcement.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { PromMetricsService } from '../../common/observability/prom-metrics.service';
import { NotificationsEventPublisher } from '../../common/notifications/notifications-events.publisher';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { buildIdempotencyKey } from '../../common/idempotency/idempotency';
import { TreasuryService } from '../../treasury/treasury.service';
import { buildEvent } from '../../common/events/domain-events';
import { OutboxService } from '../../common/events/outbox.service';

export function isApprovalBlockedByFraudAlert(input: {
  role: TenantAdminRole;
  hasBlockingFraudAlert: boolean;
}): boolean {
  return input.hasBlockingFraudAlert && input.role !== 'SUPER_ADMIN';
}

@Injectable()
export class LoanApplicationsService {
  private readonly logger = new Logger(LoanApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
    private readonly tenantScopedPrisma: TenantScopedPrismaService,
    private readonly auditService: AuditService,
    private readonly auditLogger: AuditLoggerService,
    private readonly loanBalanceService: LoanBalanceService,
    private readonly ledgerService: LedgerService,
    private readonly riskService: RiskService,
    private readonly fraudEvaluator: FraudEvaluatorService,
    private readonly holdEnforcementService: HoldEnforcementService,
    private readonly metricsService: MetricsService,
    private readonly notificationsPublisher: NotificationsEventPublisher,
    private readonly requestContextService: RequestContextService,
    private readonly treasuryService: TreasuryService,
    private readonly outboxService: OutboxService = {
      writeOutboxEvent: async () => undefined
    } as unknown as OutboxService,
    private readonly promMetricsService: PromMetricsService = {
      incrementLoanTransition: () => undefined
    } as unknown as PromMetricsService
  ) {}

  async create(input: CreateTenantLoanApplicationDto): Promise<TenantLoanApplicationSummaryDto> {
    const tenantId = requireTenantId(await this.tenantContextService.requireResolvedTenantId());
    await this.holdEnforcementService.assertBorrowerNotRestricted({
      tenantId,
      borrowerId: input.phone.trim()
    });
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenantLoanApplication.create({
        data: {
          tenantId,
          status: TenantLoanApplicationStatus.SUBMITTED,
          requestedAmount: new Prisma.Decimal(input.amount),
          fullName: input.fullName.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          dob: input.dob ? new Date(input.dob) : null,
          address: input.address?.trim() || null,
          amount: input.amount,
          tenorMonths: input.tenorMonths,
          purpose: input.purpose?.trim() || null,
          employmentStatus: input.employmentStatus?.trim() || null,
          incomeBand: input.incomeBand?.trim() || null
        }
      });

      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: row.tenantId,
          loanApplicationId: row.id,
          fromStatus: null,
          toStatus: row.status,
          note: 'Application submitted',
          changedByUserId: null
        }
      });

      await this.auditService.log({
        tx,
        tenantId: row.tenantId,
        actorType: 'BORROWER',
        action: 'LOAN_APPLICATION_SUBMITTED',
        entity: 'TENANT_LOAN_APPLICATION',
        entityId: row.id,
        metadata: {
          amount: row.amount,
          tenorMonths: row.tenorMonths
        }
      });
      await this.fraudEvaluator.incrementBehaviorSnapshot({
        tenantId: row.tenantId,
        borrowerId: row.phone,
        updates: {
          totalApplications: 1,
          lastApplicationAt: row.createdAt
        },
        tx
      });

      await this.outboxService.writeOutboxEvent(
        tx,
        buildEvent({
          eventType: 'loan_application.submitted',
          tenantId: row.tenantId,
          aggregateType: 'LoanApplication',
          aggregateId: row.id,
          payload: {
            loanApplicationId: row.id,
            status: row.status,
            amount: row.requestedAmount.toString(),
            tenorMonths: row.tenorMonths,
            borrowerName: row.fullName
          },
          traceId: this.requestContextService.get().requestId ?? undefined,
          correlationId: this.requestContextService.get().requestId ?? undefined
        })
      );

      return row;
    });
    this.metricsService.increment('loan_application_submitted_total', tenantId);
    await this.auditLogger.log({
      event: 'LOAN_APPLY',
      tenantId,
      actorType: 'BORROWER',
      actorId: input.phone.trim(),
      metadata: { loanApplicationId: created.id, amount: created.amount, tenorMonths: created.tenorMonths }
    });

    return {
      id: created.id,
      status: created.status,
      createdAt: created.createdAt.toISOString()
    };
  }

  async findOne(id: string): Promise<TenantLoanApplicationDetailsDto> {
    const tenantId = requireTenantId(await this.tenantContextService.requireResolvedTenantId());
    const tp = withTenant(this.prisma, tenantId);
    const application = await this.tenantScopedPrisma.findTenantLoanApplicationById(id);
    ensureTenantMatch(application.tenantId, tenantId);
    // TENANT_SCOPED_QUERY
    const disbursement = await tp.findUniqueTenantScoped({
      model: 'TenantDisbursement',
      args: { where: { loanApplicationId: application.id } }
    });
    const repayments = await this.prisma.loanRepayment.findMany({
      where: {
        loanApplicationId: application.id,
        tenantId: application.tenantId
      },
      orderBy: { postedAt: 'desc' }
    });
    const schedule = await this.prisma.loanRepaymentScheduleItem.findMany({
      where: {
        loanApplicationId: application.id,
        tenantId: application.tenantId
      },
      orderBy: { installmentNumber: 'asc' }
    });
    const histories = await this.prisma.loanApplicationStatusHistory.findMany({
      where: {
        loanApplicationId: application.id,
        tenantId: application.tenantId
      },
      orderBy: { changedAt: 'desc' }
    });
    const ledgerEntries = await this.prisma.tenantLedgerEntry.findMany({
      where: {
        tenantId: application.tenantId,
        referenceType: 'LoanApplication',
        referenceId: application.id
      },
      orderBy: { occurredAt: 'desc' },
      take: 20,
      include: {
        lines: {
          include: {
            account: { select: { code: true } }
          }
        }
      }
    });
    const balances = await this.loanBalanceService.getBalances(application.tenantId, application.id);

    return {
      id: application.id,
      tenantId: application.tenantId,
      status: application.status,
      fullName: application.fullName,
      phone: application.phone,
      email: application.email ?? undefined,
      dob: application.dob?.toISOString().slice(0, 10),
      address: application.address ?? undefined,
      amount: application.amount,
      tenorMonths: application.tenorMonths,
      purpose: application.purpose ?? undefined,
      employmentStatus: application.employmentStatus ?? undefined,
      incomeBand: application.incomeBand ?? undefined,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      requestedAmount: application.requestedAmount.toString(),
      approvedAmount: application.approvedAmount?.toString() ?? null,
      disbursedAmount: application.disbursedAmount?.toString() ?? null,
      outstandingPrincipal: balances.principalOutstanding.toString(),
      outstandingInterest: balances.interestOutstanding.toString(),
      outstandingFees: balances.feesOutstanding.toString(),
      totalOutstanding: balances.totalOutstanding.toString(),
      delinquencyStatus: application.delinquencyStatus,
      daysPastDue: application.daysPastDue,
      overdueAmountCents: application.overdueAmountCents.toString(),
      lastDelinquencyCalcAt: application.lastDelinquencyCalcAt?.toISOString() ?? null,
      annualInterestRate: application.annualInterestRate?.toString() ?? null,
      interestAccrualPaused: application.interestAccrualPaused,
      interestPausedAt: application.interestPausedAt?.toISOString() ?? null,
      interestPausedById: application.interestPausedById ?? null,
      interestPauseReason: application.interestPauseReason ?? null,
      interestOverrideRate: application.interestOverrideRate?.toString() ?? null,
      interestOverrideSetAt: application.interestOverrideSetAt?.toISOString() ?? null,
      interestOverrideSetById: application.interestOverrideSetById ?? null,
      lastAccruedAt: application.lastAccruedAt?.toISOString() ?? null,
      histories: histories.map((history) => ({
        id: history.id,
        tenantId: history.tenantId,
        loanApplicationId: history.loanApplicationId,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        note: history.note,
        changedByUserId: history.changedByUserId,
        changedAt: history.changedAt.toISOString()
      })),
      disbursement: disbursement
        ? {
            id: disbursement.id,
            amount: disbursement.amount.toString(),
            currency: disbursement.currency,
            method: disbursement.method,
            status: disbursement.status,
            provider: disbursement.provider ?? null,
            providerReference: disbursement.providerReference ?? null,
            reference: disbursement.reference ?? null,
            disbursedAt: disbursement.disbursedAt ? disbursement.disbursedAt.toISOString() : null,
            processedAt: disbursement.processedAt ? disbursement.processedAt.toISOString() : null,
            failureReason: disbursement.failureReason ?? null,
            idempotencyKey: disbursement.idempotencyKey
          }
        : null,
      repayments: repayments.map((repayment) => ({
        id: repayment.id,
        amount: repayment.amount.toString(),
        currency: repayment.currency,
        method: repayment.channel,
        reference: repayment.reference ?? null,
        paidAt: repayment.postedAt.toISOString()
      })),
      schedule: schedule.map((item) => ({
        id: item.id,
        installmentNo: item.installmentNumber,
        dueDate: item.dueDate.toISOString(),
        principalDue: item.principalDue.toString(),
        interestDue: item.interestDue.toString(),
        feesDue: item.feesDue.toString(),
        totalDue: item.totalDue.toString(),
        status: item.status,
        paidAt: item.paidAt ? item.paidAt.toISOString() : null,
        isOverdue: item.isOverdue,
        overdueSince: item.overdueSince ? item.overdueSince.toISOString() : null,
        remainingAmountCents: item.totalDue.minus(item.totalPaid).mul(100).toDecimalPlaces(0).toString()
      })),
      ledgerEntries: ledgerEntries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        occurredAt: entry.occurredAt.toISOString(),
        idempotencyKey: entry.idempotencyKey,
        memo: entry.memo,
        lines: entry.lines.map((line) => ({
          id: line.id,
          accountCode: line.account.code,
          direction: line.direction,
          amount: line.amount.toString()
        }))
      })),
      interestAccrualAudits: []
    };
  }

  async list(): Promise<ListTenantLoanApplicationsResponseDto> {
    const tenantId = requireTenantId(await this.tenantContextService.requireResolvedTenantId());
    const tp = withTenant(this.prisma, tenantId);
    const rows = await tp.findManyTenantScoped({
      model: 'TenantLoanApplication',
      args: {
      orderBy: { createdAt: 'desc' },
      take: 50
      }
    });

    return {
      items: rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  async transitionStatus(
    tenantId: string,
    loanApplicationId: string,
    toStatus: TenantLoanApplicationStatus,
    role: TenantAdminRole,
    note?: string,
    changedByUserId?: string
  ): Promise<TenantLoanApplicationDetailsDto> {
    const startedAt = Date.now();
    const context = this.requestContextService.get();
    this.logger.log({
      requestId: context.requestId,
      tenantId,
      userId: changedByUserId ?? context.actorId,
      action: 'LOAN_TRANSITION_REQUESTED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: loanApplicationId,
      metadata: { toStatus, role }
    });
    let transitionFrom: TenantLoanApplicationStatus | null = null;
    if (!role) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Admin role is required to transition loan application status.',
        details: null
      });
    }

    try {
      await this.prisma.$transaction(async (tx) => {
      const loanApplication = await tx.tenantLoanApplication.findFirst({
        where: {
          id: loanApplicationId,
          tenantId
        }
      });

      if (!loanApplication) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan application not found.',
          details: { id: loanApplicationId }
        });
      }
      assertTenantMatch(loanApplication.tenantId, tenantId);

      assertValidTransition(loanApplication.status, toStatus);
      transitionFrom = loanApplication.status;

      let riskSnapshot = await this.riskService.getRiskSnapshot(tenantId, loanApplication.id, tx);
      let effectiveAssessment = riskSnapshot.assessment;
      let overrideEnabled = riskSnapshot.overrideEnabled;

      if (
        loanApplication.status === TenantLoanApplicationStatus.SUBMITTED &&
        toStatus === TenantLoanApplicationStatus.UNDER_REVIEW
      ) {
        const auto = await this.riskService.evaluateAndPersist({
          tenantId,
          loanApplicationId: loanApplication.id,
          trigger: 'AUTO_ON_SUBMISSION',
          createdBy: changedByUserId?.trim() || null,
          tx
        });
        effectiveAssessment = auto.assessment;
        riskSnapshot = await this.riskService.getRiskSnapshot(tenantId, loanApplication.id, tx);
        overrideEnabled = riskSnapshot.overrideEnabled;
      } else if (!overrideEnabled) {
        const reevaluated = await this.riskService.evaluateAndPersist({
          tenantId,
          loanApplicationId: loanApplication.id,
          trigger: 'SYSTEM_REEVAL',
          createdBy: changedByUserId?.trim() || null,
          tx
        });
        effectiveAssessment = reevaluated.assessment;
      }
      const activeHolds = await this.riskService.listActiveHolds(tenantId, loanApplication.id, tx);
      enforceRiskGate({
        toStatus,
        assessment: effectiveAssessment,
        activeHoldTypes: activeHolds.map((item: { type: string }) => item.type as any),
        overrideEnabled
      });
      if (toStatus === TenantLoanApplicationStatus.APPROVED) {
        await this.holdEnforcementService.assertBorrowerNotRestricted({
          tenantId,
          borrowerId: loanApplication.phone,
          role
        });
        const hasBlockingFraudAlert = await this.fraudEvaluator.hasOpenAlertAtOrAbove(
          tenantId,
          loanApplication.id,
          'HIGH'
        );
        if (isApprovalBlockedByFraudAlert({ role, hasBlockingFraudAlert })) {
          throw new ForbiddenException({
            code: 'FORBIDDEN',
            message: 'Approval blocked by open HIGH/CRITICAL fraud alert.',
            details: null
          });
        }
      }

      if (toStatus === TenantLoanApplicationStatus.REPAID) {
        const balances = await this.loanBalanceService.getBalances(tenantId, loanApplication.id, tx);
        if (!balances.totalOutstanding.eq(0)) {
          throw new BadRequestException({
            code: 'BAD_REQUEST',
            message: 'Loan cannot be marked REPAID while outstanding balance exists.',
            details: {
              outstandingPrincipal: balances.principalOutstanding.toString(),
              outstandingInterest: balances.interestOutstanding.toString(),
              outstandingFees: balances.feesOutstanding.toString()
            }
          });
        }
      }
      assertRoleCanTransition({
        role,
        from: loanApplication.status,
        to: toStatus
      });

      await tx.tenantLoanApplication.update({
        where: { id: loanApplication.id },
        data: { status: toStatus }
      });

      const transitionNote =
        loanApplication.status === TenantLoanApplicationStatus.SUBMITTED &&
        toStatus === TenantLoanApplicationStatus.UNDER_REVIEW &&
        effectiveAssessment.decision === 'DECLINE'
          ? `${note?.trim() ? `${note.trim()} | ` : ''}Risk evaluation suggests DECLINE; kept UNDER_REVIEW for manual decision.`
          : note?.trim() || null;

      const history = await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId,
          loanApplicationId: loanApplication.id,
          fromStatus: loanApplication.status,
          toStatus,
          note: transitionNote,
          changedByUserId: changedByUserId?.trim() || null
        }
      });
      const adminAudienceRoles =
        toStatus === TenantLoanApplicationStatus.APPROVED
          ? [TenantAdminRole.OPS, TenantAdminRole.SUPER_ADMIN]
          : toStatus === TenantLoanApplicationStatus.UNDER_REVIEW
            ? [TenantAdminRole.CREDIT_OFFICER, TenantAdminRole.SUPER_ADMIN]
            : [TenantAdminRole.CREDIT_OFFICER, TenantAdminRole.OPS, TenantAdminRole.SUPER_ADMIN];
      const adminAudience = await tx.tenantAdminUser.findMany({
        where: {
          tenantId,
          role: { in: adminAudienceRoles }
        },
        select: { id: true }
      });
      await this.notificationsPublisher.publishLoanStatusChanged({
        tenantId,
        loanApplicationId: loanApplication.id,
        fromStatus: loanApplication.status,
        toStatus,
        historyId: history.id,
        borrowerAudienceUserId: loanApplication.phone || null,
        adminAudienceUserIds: adminAudience.map((item) => item.id),
        tx
      });

      await this.auditService.logTransition({
        tx,
        tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: changedByUserId?.trim() || null,
        actorRole: role,
        entityType: 'TENANT_LOAN_APPLICATION',
        entityId: loanApplication.id,
        from: loanApplication.status,
        to: toStatus,
        metadata: {
          note: transitionNote
        }
      });
      await this.outboxService.writeOutboxEvent(
        tx,
        buildEvent({
          eventType: 'loan_application.status_transitioned',
          tenantId,
          aggregateType: 'LoanApplication',
          aggregateId: loanApplication.id,
          payload: {
            from: loanApplication.status,
            to: toStatus,
            actorRole: role,
            actorId: changedByUserId?.trim() || undefined
          },
          traceId: context.requestId ?? undefined,
          correlationId: context.requestId ?? undefined
        })
      );
      if (toStatus === TenantLoanApplicationStatus.APPROVED) {
        await this.fraudEvaluator.incrementBehaviorSnapshot({
          tenantId,
          borrowerId: loanApplication.phone,
          updates: { totalApproved: 1 },
          tx
        });
      }
      if (toStatus === TenantLoanApplicationStatus.REJECTED) {
        await this.fraudEvaluator.incrementBehaviorSnapshot({
          tenantId,
          borrowerId: loanApplication.phone,
          updates: { totalRejected: 1 },
          tx
        });
      }
      if (toStatus === TenantLoanApplicationStatus.DEFAULTED) {
        await this.fraudEvaluator.incrementBehaviorSnapshot({
          tenantId,
          borrowerId: loanApplication.phone,
          updates: { defaultCount: 1 },
          tx
        });
      }
      if (
        toStatus === TenantLoanApplicationStatus.DEFAULTED ||
        toStatus === TenantLoanApplicationStatus.WRITTEN_OFF
      ) {
        await this.treasuryService.applyWriteOff({
          tenantId,
          loanApplicationId: loanApplication.id,
          amount: loanApplication.outstandingPrincipal,
          currency: loanApplication.currency,
          idempotencyKey: `${loanApplication.id}:${toStatus}`,
          actor: {
            actorId: changedByUserId?.trim() || null,
            actorRole: role
          },
          tx
        });
      }
      });
    } catch (error) {
      this.metricsService.increment('transition_failed_total', tenantId);
      throw error;
    } finally {
      this.metricsService.observeLatency('transition_execution_latency_ms', tenantId, Date.now() - startedAt);
    }
    this.metricsService.increment('loan_transition_total', tenantId);

    if (toStatus === TenantLoanApplicationStatus.APPROVED) {
      this.metricsService.increment('loan_application_approved_total', tenantId);
    }
    if (transitionFrom) {
      this.promMetricsService.incrementLoanTransition(transitionFrom, toStatus);
    }
    if (transitionFrom) {
      await this.auditService.recordEvent({
        requestId: context.requestId,
        actorType: 'TENANT_ADMIN',
        actorId: changedByUserId ?? context.actorId,
        actorRole: role,
        tenantId,
        action: 'LOAN_APP_TRANSITION',
        entityType: 'LoanApplication',
        entityId: loanApplicationId,
        before: { status: transitionFrom },
        after: { status: toStatus },
        metadata: { reason: note ?? null },
        idempotencyKey: buildIdempotencyKey({
          scope: 'loan_transition',
          tenantId,
          entityId: loanApplicationId,
          from: transitionFrom,
          to: toStatus
        })
      });
      await this.auditLogger.log({
        event: 'LOAN_DECISION',
        tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: changedByUserId ?? context.actorId,
        metadata: { loanApplicationId, fromStatus: transitionFrom, toStatus }
      });
    }
    this.logger.log({
      requestId: context.requestId,
      tenantId,
      userId: changedByUserId ?? context.actorId,
      action: 'LOAN_TRANSITION_COMPLETED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: loanApplicationId,
      metadata: { fromStatus: transitionFrom, toStatus, durationMs: Date.now() - startedAt }
    });

    return this.findOne(loanApplicationId);
  }

  async setStatusDirectSystemOnly(input: {
    tenantId: string;
    loanApplicationId: string;
    toStatus: TenantLoanApplicationStatus;
    actorRole: string;
    actorId?: string;
    note?: string;
  }): Promise<void> {
    if (input.actorRole !== 'SYSTEM') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Silent status mutation is forbidden. Use transitionStatus.',
        details: { actorRole: input.actorRole }
      });
    }

    let transitionedFrom: TenantLoanApplicationStatus | null = null;
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenantLoanApplication.findFirst({
        where: { id: input.loanApplicationId, tenantId: input.tenantId }
      });
      if (!row) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan application not found.',
          details: { id: input.loanApplicationId }
        });
      }
      transitionedFrom = row.status;
      await tx.tenantLoanApplication.update({
        where: { id: row.id },
        data: { status: input.toStatus }
      });
      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: input.tenantId,
          loanApplicationId: row.id,
          fromStatus: row.status,
          toStatus: input.toStatus,
          note: input.note?.trim() || 'SYSTEM direct status mutation',
          changedByUserId: input.actorId?.trim() || null
        }
      });
      await this.auditService.logTransition({
        tx,
        tenantId: input.tenantId,
        actorType: 'SYSTEM',
        actorId: input.actorId?.trim() || null,
        actorRole: input.actorRole,
        entityType: 'TENANT_LOAN_APPLICATION',
        entityId: row.id,
        from: row.status,
        to: input.toStatus,
        metadata: {
          directMutation: true
        }
      });
    });
    if (transitionedFrom) {
      this.promMetricsService.incrementLoanTransition(transitionedFrom, input.toStatus);
    }
  }

  async refreshScheduleOverdueFlags(tenantId: string, loanApplicationId: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.tenantRepaymentSchedule.updateMany({
      where: {
        tenantId,
        loanApplicationId,
        status: TenantRepaymentScheduleStatus.DUE,
        dueDate: { lt: new Date() }
      },
      data: { status: TenantRepaymentScheduleStatus.OVERDUE }
    });
  }

  async disburseLoan(id: string, principalMinor: number): Promise<TenantLoanApplicationDetailsDto> {
    const tenantId = requireTenantId(await this.tenantContextService.requireResolvedTenantId());
    const startedAt = Date.now();
    if (!Number.isInteger(principalMinor) || principalMinor <= 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'principalMinor must be a positive integer.',
        details: null
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const loan = await tx.tenantLoanApplication.findFirst({
        where: { id, tenantId }
      });
      if (!loan) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan application not found.',
          details: { id }
        });
      }
      assertTenantMatch(loan.tenantId, tenantId);
      if (loan.status !== TenantLoanApplicationStatus.APPROVED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan must be APPROVED before disbursement.',
          details: { status: loan.status }
        });
      }
      await this.holdEnforcementService.assertBorrowerNotRestricted({
        tenantId,
        borrowerId: loan.phone
      });

      await this.ledgerService.ensureCoreAccounts(tenantId, tx);

      const accounts = await tx.ledgerAccount.findMany({
        where: {
          tenantId,
          code: { in: ['CASH', 'LOAN_PRINCIPAL_RECEIVABLE'] }
        },
        select: { id: true, code: true }
      });
      const cash = accounts.find((item) => item.code === 'CASH');
      const receivable = accounts.find((item) => item.code === 'LOAN_PRINCIPAL_RECEIVABLE');
      if (!cash || !receivable) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Core ledger accounts are missing.',
          details: null
        });
      }

      await this.ledgerService.createJournalEntry(
        {
          tenantId,
          referenceType: 'TenantLoanApplication',
          referenceId: loan.id,
          description: `Loan disbursement ${loan.id}`,
          lines: [
            { accountId: receivable.id, debitMinor: principalMinor, creditMinor: 0 },
            { accountId: cash.id, debitMinor: 0, creditMinor: principalMinor }
          ]
        },
        tx
      );

      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          status: TenantLoanApplicationStatus.DISBURSED,
          disbursedAmount: new Prisma.Decimal(principalMinor)
        }
      });

      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId,
          loanApplicationId: loan.id,
          fromStatus: loan.status,
          toStatus: TenantLoanApplicationStatus.DISBURSED,
          note: `Disbursed principal ${principalMinor}`,
          changedByUserId: null
        }
      });
      await this.fraudEvaluator.incrementBehaviorSnapshot({
        tenantId,
        borrowerId: loan.phone,
        updates: {
          totalDisbursedAmount: new Prisma.Decimal(principalMinor)
        },
        tx
      });
      await this.auditService.log({
        tx,
        tenantId,
        actorType: 'SYSTEM',
        action: 'DISBURSEMENT_EXECUTED',
        entity: 'TENANT_LOAN_APPLICATION',
        entityId: loan.id,
        metadata: {
          principalMinor,
          fromStatus: loan.status,
          toStatus: TenantLoanApplicationStatus.DISBURSED
        }
      });
      await this.outboxService.writeOutboxEvent(
        tx,
        buildEvent({
          eventType: 'disbursement.completed',
          tenantId,
          aggregateType: 'LoanApplication',
          aggregateId: loan.id,
          payload: {
            disbursementId: loan.id,
            amount: principalMinor,
            channel: 'SYSTEM'
          },
          traceId: this.requestContextService.get().requestId ?? undefined,
          correlationId: this.requestContextService.get().requestId ?? undefined
        })
      );
    });
    this.metricsService.increment('disbursement_executed_total', tenantId);
    this.metricsService.observeLatency('disbursement_execution_latency_ms', tenantId, Date.now() - startedAt);

    return this.findOne(id);
  }
}
