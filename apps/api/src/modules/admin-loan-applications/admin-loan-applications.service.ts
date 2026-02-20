import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  FraudSeverity,
  JobType,
  LoanRepaymentChannel,
  LoanRepaymentScheduleItemStatus,
  Prisma,
  TenantDisbursementActorType,
  TenantDisbursementMethod,
  TenantDisbursementStatus,
  RepaymentFrequency,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType,
  TenantLoanApplicationStatus,
  TenantAdminRole
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { assertLoanCanClose, assertLoanNonNegative, assertNoDuplicateDisbursement } from '../../common/finance/invariants';
import { FinancialInvariantsService } from '../../common/finance/financial-invariants.service';
import { LoanBalanceService } from '../../common/ledger/loan-balance.service';
import { LedgerLockService } from '../../common/ledger/ledger-lock.service';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';
import { TenantScopedPrismaService } from '../../common/tenant/tenant-scoped-prisma.service';
import { assertTenantMatch } from '../../common/tenant/assert-tenant-match';
import { TenantIdempotencyService } from '../../common/idempotency/tenant-idempotency.service';
import { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import { LoanDecisionOrchestratorService } from '../loan-applications/decision/loan-decision-orchestrator.service';
import { assertRoleCanTransition } from '../loan-applications/loan-application-transition-rbac';
import { assertValidTransition } from '../loan-applications/loan-application-status-transition';
import type { AdminListLoanApplicationsQueryDto } from './dto/admin-list-loan-applications-query.dto';
import type { AdminListLoanApplicationsResponseDto } from './dto/admin-list-loan-applications-response.dto';
import type { AdminLoanApplicationDetailsDto } from './dto/admin-loan-application-details.dto';
import type { AdminUpdateLoanApplicationStatusDto } from './dto/admin-update-loan-application-status.dto';
import type { TransitionLoanApplicationDto } from '../loan-applications/dto/transition-loan-application.dto';
import type { DisburseLoanApplicationDto } from './dto/disburse-loan-application.dto';
import type { DisburseLoanNowDto } from './dto/disburse-loan-now.dto';
import type { RepayLoanApplicationDto } from './dto/repay-loan-application.dto';
import type { GenerateRepaymentScheduleDto } from './dto/generate-repayment-schedule.dto';
import type { AccrueInterestDto } from './dto/accrue-interest.dto';
import type { GenerateLoanScheduleDto } from './dto/generate-loan-schedule.dto';
import type { CreateLoanRepaymentDto } from './dto/create-loan-repayment.dto';
import type { RetryDisbursementDto } from './dto/retry-disbursement.dto';
import type { ReverseDisbursementDto } from './dto/reverse-disbursement.dto';
import { generateSchedule } from '../../loan/repayment/amortization';
import { RepaymentService } from '../../loan/repayment/repayment.service';
import { DelinquencyService } from '../collections/delinquency.service';
import type { PauseInterestDto } from './dto/pause-interest.dto';
import type { SetInterestOverrideDto } from './dto/set-interest-override.dto';
import type { RemoveInterestOverrideDto } from './dto/remove-interest-override.dto';
import { LoanInterestControlService } from './loan-interest-control.service';
import type { CreateLedgerAdjustmentDto } from './dto/create-ledger-adjustment.dto';
import { RiskService, enforceRiskGate } from '../../risk/risk.service';
import { FraudEvaluatorService } from '../fraud/fraud-evaluator.service';
import { HoldEnforcementService } from '../fraud/hold-enforcement.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flag.service';
import { NotificationsEventPublisher } from '../../common/notifications/notifications-events.publisher';
import { JobQueueService } from '../../common/jobs/job-queue.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { parsePagination } from '../../common/http/pagination';
import { TreasuryService } from '../../treasury/treasury.service';
import { SuspiciousActivityService } from '../compliance/suspicious-activity.service';
import { OutboxService } from '../../common/events/outbox.service';
import { buildEvent } from '../../common/events/domain-events';
import { IdentityService } from '../identity/identity.service';

@Injectable()
export class AdminLoanApplicationsService {
  private readonly logger = new Logger(AdminLoanApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: TenantLedgerService,
    private readonly auditService: AuditService,
    private readonly tenantScopedPrisma: TenantScopedPrismaService,
    private readonly loanApplicationsService: LoanApplicationsService,
    private readonly loanBalanceService: LoanBalanceService,
    private readonly ledgerLockService: LedgerLockService,
    private readonly tenantIdempotencyService: TenantIdempotencyService,
    private readonly repaymentService: RepaymentService,
    private readonly delinquencyEngineService: DelinquencyService,
    private readonly interestControlService: LoanInterestControlService,
    private readonly riskService: RiskService,
    private readonly fraudEvaluator: FraudEvaluatorService,
    private readonly holdEnforcementService: HoldEnforcementService,
    private readonly metricsService: MetricsService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly notificationsPublisher: NotificationsEventPublisher,
    private readonly jobQueueService: JobQueueService,
    private readonly requestContextService: RequestContextService,
    private readonly financialInvariantsService: FinancialInvariantsService,
    private readonly treasuryService: TreasuryService,
    private readonly suspiciousActivityService: SuspiciousActivityService,
    private readonly identityService: IdentityService = {
      getLoanIdentitySummary: async () => null,
      approveManualReview: async () => null
    } as unknown as IdentityService,
    private readonly outboxService: OutboxService = {
      writeOutboxEvent: async () => undefined
    } as unknown as OutboxService,
    private readonly decisionOrchestrator: LoanDecisionOrchestratorService = {
      decideAndTransition: async () => {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Decision orchestrator is unavailable.',
          details: null
        });
      }
    } as unknown as LoanDecisionOrchestratorService
  ) {}

  async list(
    principal: TenantAdminPrincipal,
    query: AdminListLoanApplicationsQueryDto
  ): Promise<AdminListLoanApplicationsResponseDto> {
    const pagination = parsePagination(query);
    const readModelEnabled = (process.env.READ_MODEL_ENABLED ?? 'true') !== 'false';
    if (readModelEnabled) {
      const readRows = await (this.prisma as any).loanApplicationReadModel.findMany({
        where: {
          tenantId: principal.tenantId,
          ...(query.status ? { status: query.status } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: pagination.take,
        skip: pagination.skip,
        ...(pagination.cursor ? { cursor: pagination.cursor } : {})
      });
      if (readRows.length > 0) {
        return {
          items: readRows.map((row: any) => ({
            id: row.id,
            tenantId: row.tenantId,
            status: row.status,
            delinquencyStatus: 'CURRENT',
            daysPastDue: 0,
            overdueAmountCents: '0',
            fullName: row.borrowerName ?? '',
            phone: '',
            amount: row.amount ?? 0,
            tenorMonths: row.tenorMonths ?? 0,
            createdAt: row.createdAt.toISOString()
          }))
        };
      }
    }

    const rows = await this.tenantScopedPrisma.findManyTenantLoanApplications({
      where: query.queue === 'OVERDUE'
        ? { delinquencyStatus: 'OVERDUE' }
        : query.status
          ? { status: query.status }
          : undefined,
      orderBy:
        query.queue === 'OVERDUE'
          ? [{ daysPastDue: 'desc' }, { createdAt: 'desc' }]
          : { createdAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });

    if (query.queue === 'OVERDUE') {
      const now = new Date();
      for (const row of rows) {
        await this.delinquencyEngineService.recalcLoanDelinquency(row.id, principal.tenantId, now);
      }
    }

    return {
      items: rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        status: row.status,
        delinquencyStatus: row.delinquencyStatus,
        daysPastDue: row.daysPastDue,
        overdueAmountCents: row.overdueAmountCents.toString(),
        fullName: row.fullName,
        phone: row.phone,
        amount: row.amount,
        tenorMonths: row.tenorMonths,
        createdAt: row.createdAt.toISOString()
      }))
    };
  }

  async findOne(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    const row = await this.loanApplicationsService.findOne(id);
    assertTenantMatch(row.tenantId, principal.tenantId);
    // TENANT_SCOPED_QUERY
    const scheduleItems = await this.prisma.loanRepaymentScheduleItem.findMany({
      where: { tenantId: row.tenantId, loanApplicationId: row.id },
      orderBy: { installmentNumber: 'asc' }
    });
    const repayments = await this.prisma.loanRepayment.findMany({
      where: { tenantId: row.tenantId, loanApplicationId: row.id },
      orderBy: { postedAt: 'desc' }
    });
    const collectionActivities = await this.prisma.collectionActivity.findMany({
      where: { tenantId: row.tenantId, loanId: row.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const interestAccrualAudits = await this.prisma.interestAccrualAudit.findMany({
      where: { tenantId: row.tenantId, loanApplicationId: row.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    const decisionEvents = await this.prisma.loanDecisionEvent.findMany({
      where: { tenantId: row.tenantId, loanApplicationId: row.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const fraudSignals = await this.prisma.fraudSignal.findMany({
      where: { tenantId: row.tenantId, loanApplicationId: row.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    const fraudAlerts = await this.prisma.fraudAlert.findMany({
      where: { tenantId: row.tenantId, loanApplicationId: row.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'DATA_ACCESS.READ',
      entity: 'LoanApplication',
      entityId: row.id,
      metadata: {
        endpoint: 'admin/loan-applications/:id',
        resourceType: 'LoanApplication',
        resourceId: row.id
      }
    });

    return {
      id: row.id,
      tenantId: row.tenantId,
      status: row.status,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email ?? null,
      dob: row.dob ?? null,
      address: row.address ?? null,
      amount: row.amount,
      tenorMonths: row.tenorMonths,
      purpose: row.purpose ?? null,
      employmentStatus: row.employmentStatus ?? null,
      incomeBand: row.incomeBand ?? null,
      requestedAmount: row.requestedAmount,
      approvedAmount: row.approvedAmount ?? null,
      disbursedAmount: row.disbursedAmount ?? null,
      outstandingPrincipal: row.outstandingPrincipal,
      outstandingInterest: row.outstandingInterest,
      outstandingFees: row.outstandingFees,
      totalOutstanding: row.totalOutstanding,
      delinquencyStatus: row.delinquencyStatus,
      daysPastDue: row.daysPastDue,
      overdueAmountCents: row.overdueAmountCents,
      lastDelinquencyCalcAt: row.lastDelinquencyCalcAt ?? null,
      annualInterestRate: row.annualInterestRate ?? null,
      interestAccrualPaused: row.interestAccrualPaused,
      interestPausedAt: row.interestPausedAt ?? null,
      interestPausedById: row.interestPausedById ?? null,
      interestPauseReason: row.interestPauseReason ?? null,
      interestOverrideRate: row.interestOverrideRate ?? null,
      interestOverrideSetAt: row.interestOverrideSetAt ?? null,
      interestOverrideSetById: row.interestOverrideSetById ?? null,
      lastAccruedAt: row.lastAccruedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      histories: (row.histories ?? []).map((history) => ({
        id: history.id,
        tenantId: history.tenantId,
        loanApplicationId: history.loanApplicationId,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        note: history.note ?? null,
        changedByUserId: history.changedByUserId ?? null,
        changedAt: history.changedAt
      })),
      disbursement: row.disbursement
        ? {
            id: row.disbursement.id,
            amount: row.disbursement.amount.toString(),
            currency: row.disbursement.currency,
            method: row.disbursement.method,
            status: row.disbursement.status,
            provider: row.disbursement.provider ?? null,
            providerReference: row.disbursement.providerReference ?? null,
            reference: row.disbursement.reference ?? null,
            disbursedAt: row.disbursement.disbursedAt ?? null,
            processedAt: row.disbursement.processedAt ?? null,
            failureReason: row.disbursement.failureReason ?? null,
            idempotencyKey: row.disbursement.idempotencyKey
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
      schedule: scheduleItems.map((item) => ({
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
      collectionActivities: collectionActivities.map((activity) => ({
        id: activity.id,
        actionType: activity.actionType,
        note: activity.note ?? null,
        performedBy: activity.performedBy,
        createdAt: activity.createdAt.toISOString()
      })),
      interestAccrualAudits: interestAccrualAudits.map((audit) => ({
        id: audit.id,
        action: audit.action,
        previousRate: audit.previousRate?.toString() ?? null,
        newRate: audit.newRate?.toString() ?? null,
        reason: audit.reason ?? null,
        performedById: audit.performedById,
        createdAt: audit.createdAt.toISOString()
      })),
      decisionEvents: decisionEvents.map((event) => ({
        id: event.id,
        decision: event.decision as 'APPROVE' | 'MANUAL_REVIEW' | 'DECLINE',
        reasonCodes: event.reasonCodes,
        actorType: event.actorType as 'SYSTEM' | 'ADMIN',
        actorId: event.actorId ?? null,
        actorRole: event.actorRole ?? null,
        createdAt: event.createdAt.toISOString(),
        inputsJson: event.inputsJson,
        recommendedLimit: event.recommendedLimit?.toString() ?? null,
        recommendedTenorDays: event.recommendedTenorDays ?? null
      })),
      fraudSignals: fraudSignals.map((signal: any) => ({
        id: signal.id,
        signalType: signal.type,
        severity: signal.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        metadataJson: signal.metadataJson,
        createdAt: signal.createdAt.toISOString()
      })),
      fraudAlerts: fraudAlerts.map((alert: any) => ({
        id: alert.id,
        status: alert.status,
        severity: alert.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        autoGenerated: alert.autoGenerated,
        resolutionNotes: alert.resolutionNotes ?? null,
        resolvedAt: alert.resolvedAt ? alert.resolvedAt.toISOString() : null,
        createdAt: alert.createdAt.toISOString()
      })),
      identityVerification: await this.identityService.getLoanIdentitySummary(principal, row.id),
      ledgerEntries: (row.ledgerEntries ?? []).map((entry) => ({
        id: entry.id,
        type: entry.type,
        occurredAt: entry.occurredAt,
        idempotencyKey: entry.idempotencyKey,
        memo: entry.memo ?? null,
        lines: (entry.lines ?? []).map((line) => ({
          id: line.id,
          accountCode: line.accountCode,
          direction: line.direction,
          amount: line.amount
        }))
      }))
    };
  }

  async updateStatus(
    principal: TenantAdminPrincipal,
    id: string,
    body: AdminUpdateLoanApplicationStatusDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    try {
      await this.loanApplicationsService.transitionStatus(
        principal.tenantId,
        id,
        body.status as TenantLoanApplicationStatus,
        principal.role,
        body.reason,
        principal.adminId
      );
    } catch (error) {
      if (error instanceof BadRequestException && String((error as any).message).includes('Invalid status transition')) {
        await this.suspiciousActivityService.flag({
          tenantId: principal.tenantId,
          entityType: 'TENANT_LOAN_APPLICATION',
          entityId: id,
          reason: 'Loan status jump attempted',
          severity: 'HIGH'
        });
      }
      throw error;
    }
    await this.enqueueOnApprovedTransition(
      principal.tenantId,
      id,
      body.status as TenantLoanApplicationStatus,
      principal.adminId,
      principal.role
    );
    return this.findOne(principal, id);
  }

  async transition(
    principal: TenantAdminPrincipal,
    id: string,
    input: TransitionLoanApplicationDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    try {
      await this.loanApplicationsService.transitionStatus(
        principal.tenantId,
        id,
        input.toStatus as TenantLoanApplicationStatus,
        principal.role,
        input.note,
        principal.adminId
      );
    } catch (error) {
      if (error instanceof BadRequestException && String((error as any).message).includes('Invalid status transition')) {
        await this.suspiciousActivityService.flag({
          tenantId: principal.tenantId,
          entityType: 'TENANT_LOAN_APPLICATION',
          entityId: id,
          reason: 'Loan status jump attempted',
          severity: 'HIGH'
        });
      }
      throw error;
    }
    await this.enqueueOnApprovedTransition(
      principal.tenantId,
      id,
      input.toStatus as TenantLoanApplicationStatus,
      principal.adminId,
      principal.role
    );
    return this.findOne(principal, id);
  }

  private async enqueueOnApprovedTransition(
    tenantId: string,
    loanApplicationId: string,
    nextStatus: TenantLoanApplicationStatus,
    actorId: string,
    actorRole: string
  ): Promise<void> {
    if (nextStatus !== TenantLoanApplicationStatus.APPROVED) {
      return;
    }

    const day = new Date().toISOString().slice(0, 10);
    const requestId = this.requestContextService.get().requestId;
    try {
      await this.jobQueueService.enqueueJob({
        type: JobType.LEDGER_RECONCILE,
        tenantId,
        dedupeKey: `ledgerReconcile:${tenantId}:${day}`,
        requestId,
        actor: {
          type: 'TENANT_ADMIN',
          id: actorId,
          role: actorRole
        },
        payload: {
          tenantId,
          date: `${day}T00:00:00.000Z`,
          reason: 'LOAN_APPROVED'
        }
      });

      await this.jobQueueService.enqueueJob({
        type: JobType.SEND_NOTIFICATION,
        tenantId,
        dedupeKey: `notify:${loanApplicationId}:approved`,
        requestId,
        actor: {
          type: 'TENANT_ADMIN',
          id: actorId,
          role: actorRole
        },
        payload: {
          tenantId,
          loanApplicationId,
          event: 'LOAN_APPROVED'
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown enqueue error';
      this.logger.error(`Failed to enqueue APPROVED transition jobs loanId=${loanApplicationId}: ${message}`);
    }
  }

  async disburse(
    principal: TenantAdminPrincipal,
    id: string,
    input: DisburseLoanApplicationDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    return this.disburseNow(principal, id, {
      method: input.method === 'CASH' ? 'MANUAL' : input.method,
      idempotencyKey: input.idempotencyKey,
      note: input.reference
    });
  }

  private assertOpsOrSuperAdmin(principal: TenantAdminPrincipal): void {
    if (!(principal.role === 'OPS' || principal.role === 'SUPER_ADMIN' || principal.role === 'SYSTEM')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only OPS or SUPER_ADMIN can perform disbursement operations.',
        details: null
      });
    }
  }

  private async writeDisbursementHistory(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      loanId: string;
      disbursementId: string;
      fromStatus: TenantDisbursementStatus | null;
      toStatus: TenantDisbursementStatus;
      note?: string | null;
      actorId?: string | null;
      actorType?: TenantDisbursementActorType;
    }
  ): Promise<void> {
    await tx.tenantDisbursementStatusHistory.create({
      data: {
        tenantId: input.tenantId,
        loanId: input.loanId,
        disbursementId: input.disbursementId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        note: input.note?.trim() || null,
        actorType: input.actorType ?? TenantDisbursementActorType.ADMIN,
        actorId: input.actorId?.trim() || null
      }
    });
  }

  async markReadyForDisbursement(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    if (!(principal.role === 'CREDIT_OFFICER' || principal.role === 'SUPER_ADMIN')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only CREDIT_OFFICER or SUPER_ADMIN can mark ready for disbursement.',
        details: null
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenantLoanApplication.findFirst({
        where: { id, tenantId: principal.tenantId }
      });
      if (!row) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { id }
        });
      }
      assertTenantMatch(row.tenantId, principal.tenantId);
      if (row.status !== TenantLoanApplicationStatus.APPROVED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Only APPROVED loans can be marked ready for disbursement.',
          details: { status: row.status }
        });
      }

      assertValidTransition(row.status, TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT);
      assertRoleCanTransition({
        role: principal.role,
        from: row.status,
        to: TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT
      });
      const snapshot = await this.riskService.getRiskSnapshot(principal.tenantId, row.id, tx);
      const activeHolds = await this.riskService.listActiveHolds(principal.tenantId, row.id, tx);
      enforceRiskGate({
        toStatus: TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
        assessment: snapshot.assessment,
        activeHoldTypes: activeHolds.map((item: { type: string }) => item.type as any),
        overrideEnabled: snapshot.overrideEnabled
      });

      await tx.tenantLoanApplication.update({
        where: { id: row.id },
        data: { status: TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT }
      });
      const history = await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: row.id,
          fromStatus: row.status,
          toStatus: TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
          note: 'Marked ready for disbursement.',
          changedByUserId: principal.adminId
        }
      });
      const adminAudience = await tx.tenantAdminUser.findMany({
        where: {
          tenantId: principal.tenantId,
          role: { in: [TenantAdminRole.CREDIT_OFFICER, TenantAdminRole.OPS, TenantAdminRole.SUPER_ADMIN] }
        },
        select: { id: true }
      });
      await this.notificationsPublisher.publishLoanStatusChanged({
        tenantId: principal.tenantId,
        loanApplicationId: row.id,
        fromStatus: row.status,
        toStatus: TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
        historyId: history.id,
        borrowerAudienceUserId: row.phone || null,
        adminAudienceUserIds: adminAudience.map((item) => item.id),
        tx
      });

      const amount = row.approvedAmount ?? row.requestedAmount;
      const idempotencyKey = `loan:${row.id}:disburse:v1`;
      const existing = await tx.tenantDisbursement.findFirst({
        where: { tenantId: principal.tenantId, loanApplicationId: row.id }
      });
      if (!existing) {
        const created = await tx.tenantDisbursement.create({
          data: {
            tenantId: principal.tenantId,
            loanApplicationId: row.id,
            idempotencyKey,
            amount,
            currency: row.currency,
            method: TenantDisbursementMethod.BANK_TRANSFER,
            status: TenantDisbursementStatus.PENDING,
            initiatedByAdminId: principal.adminId,
            initiatedBySystem: false
          }
        });
        await this.writeDisbursementHistory(tx, {
          tenantId: principal.tenantId,
          loanId: row.id,
          disbursementId: created.id,
          fromStatus: null,
          toStatus: TenantDisbursementStatus.PENDING,
          note: 'Disbursement record created.',
          actorId: principal.adminId
        });
      }
    });

    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'DISBURSEMENT.INITIATE',
      entity: 'TENANT_DISBURSEMENT',
      entityId: id
    });

    return this.findOne(principal, id);
  }

  private shouldFailProvider(forceFail?: boolean): boolean {
    if (forceFail) {
      return true;
    }
    return process.env.MOCK_DISBURSEMENT_PROVIDER_FAIL === 'true';
  }

  private mockProviderReference(disbursementId: string): string {
    return `mock_${disbursementId}_${Date.now()}`;
  }

  async disburseNow(
    principal: TenantAdminPrincipal,
    id: string,
    input: DisburseLoanNowDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    const startedAt = Date.now();
    if (principal.role === 'SYSTEM') {
      const autoDisburseEnabled = await this.featureFlagService.isEnabled(principal.tenantId, 'AUTO_DISBURSE');
      if (!autoDisburseEnabled) {
        throw new ConflictException({
          code: 'STATE_CONFLICT',
          message: 'AUTO_DISBURSE feature flag is disabled for this tenant.',
          details: null
        });
      }
    }
    this.assertOpsOrSuperAdmin(principal);
    const requestedKey = input.idempotencyKey?.trim() || `loan:${id}:disburse:v1`;

    const result = await this.tenantIdempotencyService.withIdempotency<{
      disbursementId: string;
      finalStatus: TenantDisbursementStatus;
    }>({
      tenantId: principal.tenantId,
      scope: 'DISBURSEMENT',
      key: requestedKey,
      requestHash: `${id}:${input.method ?? 'BANK_TRANSFER'}:${input.note ?? ''}:${Boolean(input.forceFail)}`,
      fn: async (tx) => {
      await this.ledgerLockService.lockLoanApplication(principal.tenantId, id, tx);
      const row = await tx.tenantLoanApplication.findFirst({
        where: { id, tenantId: principal.tenantId }
      });
      if (!row) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { id }
        });
      }
      if (row.status !== TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan must be READY_FOR_DISBURSEMENT before disbursing.',
          details: { status: row.status }
        });
      }
      await this.holdEnforcementService.assertBorrowerNotRestricted({
        tenantId: principal.tenantId,
        borrowerId: row.phone,
        role: principal.role
      });
      const snapshot = await this.riskService.getRiskSnapshot(principal.tenantId, row.id, tx);
      const activeHolds = await this.riskService.listActiveHolds(principal.tenantId, row.id, tx);
      enforceRiskGate({
        toStatus: TenantLoanApplicationStatus.DISBURSED,
        assessment: snapshot.assessment,
        activeHoldTypes: activeHolds.map((item: { type: string }) => item.type as any),
        overrideEnabled: snapshot.overrideEnabled
      });
      const hasCriticalAlert = await this.fraudEvaluator.hasOpenAlertAtOrAbove(
        principal.tenantId,
        row.id,
        FraudSeverity.CRITICAL
      );
      if (hasCriticalAlert) {
        throw new ConflictException({
          code: 'STATE_CONFLICT',
          message: 'Disbursement blocked by open CRITICAL fraud alert.',
          details: null
        });
      }

      const amount = row.approvedAmount ?? row.requestedAmount;
      const method = (input.method ?? 'BANK_TRANSFER') as TenantDisbursementMethod;
      const duplicate = await tx.tenantDisbursement.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId: principal.tenantId,
            idempotencyKey: requestedKey
          }
        }
      });
      if (duplicate && duplicate.loanApplicationId !== row.id) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'idempotencyKey already used for another disbursement.',
          details: null
        });
      }
      if (
        duplicate &&
        duplicate.loanApplicationId === row.id &&
        duplicate.status === TenantDisbursementStatus.SUCCESS
      ) {
        if (input.method && duplicate.method !== method) {
          throw new ConflictException({
            code: 'CONFLICT',
            message: 'idempotencyKey already finalized with a different method.',
            details: null
          });
        }
        return { disbursementId: duplicate.id, finalStatus: TenantDisbursementStatus.SUCCESS };
      }

      const disbursement =
        duplicate ??
        (await tx.tenantDisbursement.upsert({
          where: { loanApplicationId: row.id },
          create: {
            tenantId: principal.tenantId,
            loanApplicationId: row.id,
            idempotencyKey: requestedKey,
            amount,
            currency: row.currency,
            method,
            status: TenantDisbursementStatus.PENDING,
            initiatedByAdminId: principal.adminId,
            initiatedBySystem: false
          },
          update: {
            idempotencyKey: requestedKey,
            method
          }
        }));

      const fromStatus = disbursement.status;
      await tx.tenantDisbursement.update({
        where: { id: disbursement.id },
        data: {
          status: TenantDisbursementStatus.PROCESSING,
          failureReason: null
        }
      });
      await this.writeDisbursementHistory(tx, {
        tenantId: principal.tenantId,
        loanId: row.id,
        disbursementId: disbursement.id,
        fromStatus,
        toStatus: TenantDisbursementStatus.PROCESSING,
        note: input.note ?? 'Disbursement moved to processing.',
        actorId: principal.adminId
      });

      if (this.shouldFailProvider(input.forceFail)) {
        await tx.tenantDisbursement.update({
          where: { id: disbursement.id },
          data: {
            status: TenantDisbursementStatus.FAILED,
            failureReason: 'Mock provider failure',
            processedAt: new Date()
          }
        });
        await this.writeDisbursementHistory(tx, {
          tenantId: principal.tenantId,
          loanId: row.id,
          disbursementId: disbursement.id,
          fromStatus: TenantDisbursementStatus.PROCESSING,
          toStatus: TenantDisbursementStatus.FAILED,
          note: 'Provider reported failure.',
          actorId: principal.adminId
        });
        return { disbursementId: disbursement.id, finalStatus: TenantDisbursementStatus.FAILED };
      }

      const now = new Date();
      const providerReference = this.mockProviderReference(disbursement.id);
      await this.ledgerService.postEntry(
        {
          tenantId: principal.tenantId,
          occurredAt: now,
          type: TenantLedgerEntryType.DISBURSEMENT,
          idempotencyKey: disbursement.idempotencyKey,
          referenceType: 'LoanApplication',
          referenceId: row.id,
          currency: row.currency,
          createdBy: principal.adminId,
          actorRole: principal.role as any,
          memo: `Loan disbursement ${row.id}`,
          lines: [
            {
              accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
              direction: TenantLedgerDirection.DEBIT,
              amount
            },
            {
              accountCode:
                method === TenantDisbursementMethod.MANUAL || method === TenantDisbursementMethod.CASH
                  ? TenantLedgerAccountCode.CASH_ON_HAND
                  : TenantLedgerAccountCode.BANK_CLEARING,
              direction: TenantLedgerDirection.CREDIT,
              amount
            }
          ]
        },
        tx
      );

      await this.treasuryService.deployToLoan({
        tenantId: principal.tenantId,
        loanApplicationId: row.id,
        amount,
        currency: row.currency,
        idempotencyKey: disbursement.id,
        actor: {
          actorId: principal.adminId,
          actorRole: principal.role
        },
        tx
      });

      await tx.tenantDisbursement.update({
        where: { id: disbursement.id },
        data: {
          method,
          status: TenantDisbursementStatus.SUCCESS,
          provider: method === TenantDisbursementMethod.MANUAL ? 'MANUAL' : 'MOCK_PROVIDER',
          providerReference,
          processedAt: now,
          disbursedAt: now,
          failureReason: null
        }
      });
      await this.writeDisbursementHistory(tx, {
        tenantId: principal.tenantId,
        loanId: row.id,
        disbursementId: disbursement.id,
        fromStatus: TenantDisbursementStatus.PROCESSING,
        toStatus: TenantDisbursementStatus.SUCCESS,
        note: input.note ?? 'Disbursement succeeded.',
        actorId: principal.adminId
      });

      assertValidTransition(row.status, TenantLoanApplicationStatus.DISBURSED);
      assertRoleCanTransition({
        role: principal.role,
        from: row.status,
        to: TenantLoanApplicationStatus.DISBURSED
      });
      await tx.tenantLoanApplication.update({
        where: { id: row.id },
        data: {
          status: TenantLoanApplicationStatus.DISBURSED,
          disbursedAmount: amount,
          disbursedAt: now
        }
      });
      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: row.id,
          fromStatus: row.status,
          toStatus: TenantLoanApplicationStatus.DISBURSED,
          note: `Disbursed ${amount.toString()} ${row.currency}`,
          changedByUserId: principal.adminId
        }
      });
      await this.auditService.logTransition({
        tx,
        tenantId: principal.tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: principal.adminId,
        actorRole: principal.role,
        entityType: 'LOAN_APPLICATION',
        entityId: row.id,
        from: row.status,
        to: TenantLoanApplicationStatus.DISBURSED,
        metadata: {
          disbursementId: disbursement.id,
          amount: amount.toString(),
          currency: row.currency
        }
      });

      const successfulDisbursementCount = await tx.tenantDisbursement.count({
        where: {
          tenantId: principal.tenantId,
          loanApplicationId: row.id,
          status: TenantDisbursementStatus.SUCCESS
        }
      });
      assertNoDuplicateDisbursement(successfulDisbursementCount);
      assertLoanNonNegative({
        outstandingPrincipal: row.outstandingPrincipal,
        outstandingInterest: row.outstandingInterest,
        outstandingFees: row.outstandingFees,
        outstandingTotal: row.outstandingTotal
      });
      assertLoanCanClose({
        status: TenantLoanApplicationStatus.DISBURSED,
        outstandingTotal: row.outstandingTotal
      });
      await this.auditService.log({
        tx,
        tenantId: principal.tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: principal.adminId,
        actorRole: principal.role,
        action:
          disbursement.status === TenantDisbursementStatus.FAILED
            ? 'DISBURSEMENT.FAILED'
            : 'DISBURSEMENT.COMPLETE',
        entity: 'TENANT_DISBURSEMENT',
        entityId: disbursement.id
      });
      if (disbursement.status === TenantDisbursementStatus.SUCCESS) {
        await this.outboxService.writeOutboxEvent(
          tx,
          buildEvent({
            eventType: 'disbursement.completed',
            tenantId: principal.tenantId,
            aggregateType: 'LoanApplication',
            aggregateId: row.id,
            payload: {
              disbursementId: disbursement.id,
              amount: amount.toString(),
              channel: disbursement.method
            },
            traceId: this.requestContextService.get().requestId ?? undefined,
            correlationId: this.requestContextService.get().requestId ?? undefined
          })
        );
      }
      const adminAudience = await tx.tenantAdminUser.findMany({
        where: {
          tenantId: principal.tenantId,
          role: { in: [TenantAdminRole.CREDIT_OFFICER, TenantAdminRole.OPS, TenantAdminRole.SUPER_ADMIN] }
        },
        select: { id: true }
      });
      await this.notificationsPublisher.publishDisbursed({
        tenantId: principal.tenantId,
        disbursementId: disbursement.id,
        loanApplicationId: row.id,
        borrowerAudienceUserId: row.phone || null,
        adminAudienceUserIds: adminAudience.map((item) => item.id),
        amount: amount.toString(),
        currency: row.currency,
        tx
      });
      await this.fraudEvaluator.incrementBehaviorSnapshot({
        tenantId: principal.tenantId,
        borrowerId: row.phone,
        updates: {
          totalDisbursedAmount: amount
        },
        tx
      });
      return { disbursementId: disbursement.id, finalStatus: TenantDisbursementStatus.SUCCESS };
    }});

    if (result.finalStatus === TenantDisbursementStatus.SUCCESS) {
      this.metricsService.increment('disbursement_executed_total', principal.tenantId);
      await this.financialInvariantsService.assertLoanInvariants(id);
    } else if (result.finalStatus === TenantDisbursementStatus.FAILED) {
      const failedAttempts = await this.prisma.tenantDisbursement.count({
        where: {
          tenantId: principal.tenantId,
          loanApplicationId: id,
          status: TenantDisbursementStatus.FAILED
        }
      });
      if (failedAttempts >= 3) {
        await this.suspiciousActivityService.flag({
          tenantId: principal.tenantId,
          entityType: 'TENANT_DISBURSEMENT',
          entityId: result.disbursementId,
          reason: 'Multiple failed disburse attempts',
          severity: 'HIGH'
        });
      }
    }
    this.metricsService.observeLatency(
      'disbursement_execution_latency_ms',
      principal.tenantId,
      Date.now() - startedAt
    );
    return this.findOne(principal, id);
  }

  async retryDisbursement(
    principal: TenantAdminPrincipal,
    disbursementId: string,
    input: RetryDisbursementDto
  ) {
    this.assertOpsOrSuperAdmin(principal);
    const existing = await this.prisma.tenantDisbursement.findFirst({
      where: { id: disbursementId, tenantId: principal.tenantId },
      select: { id: true, status: true, loanApplicationId: true }
    });
    if (!existing) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Disbursement not found.',
        details: { disbursementId }
      });
    }
    if (existing.status !== TenantDisbursementStatus.FAILED) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Only FAILED disbursements can be retried.',
        details: { status: existing.status }
      });
    }
    await this.disburseNow(principal, existing.loanApplicationId, {
      note: input.note,
      forceFail: input.forceFail
    });
    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'DISBURSEMENT.INITIATE',
      entity: 'TENANT_DISBURSEMENT',
      entityId: disbursementId
    });
    return this.getDisbursement(principal, disbursementId);
  }

  async reverseDisbursement(
    principal: TenantAdminPrincipal,
    disbursementId: string,
    input: ReverseDisbursementDto
  ) {
    this.assertOpsOrSuperAdmin(principal);
    await this.prisma.$transaction(async (tx) => {
      const disbursement = await tx.tenantDisbursement.findFirst({
        where: { id: disbursementId, tenantId: principal.tenantId }
      });
      if (!disbursement) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Disbursement not found.',
          details: { disbursementId }
        });
      }
      if (disbursement.status !== TenantDisbursementStatus.SUCCESS) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Only SUCCESS disbursements can be reversed.',
          details: { status: disbursement.status }
        });
      }

      const now = new Date();
      await this.ledgerService.postEntry(
        {
          tenantId: principal.tenantId,
          occurredAt: now,
          type: TenantLedgerEntryType.ADJUSTMENT,
          idempotencyKey: `reverse:${disbursement.id}`,
          referenceType: 'LoanApplication',
          referenceId: disbursement.loanApplicationId,
          currency: disbursement.currency,
          createdBy: principal.adminId,
          actorRole: principal.role as any,
          memo: `Disbursement reversal ${disbursement.id}`,
          lines: [
            {
              accountCode:
                disbursement.method === TenantDisbursementMethod.MANUAL ||
                disbursement.method === TenantDisbursementMethod.CASH
                  ? TenantLedgerAccountCode.CASH_ON_HAND
                  : TenantLedgerAccountCode.BANK_CLEARING,
              direction: TenantLedgerDirection.DEBIT,
              amount: disbursement.amount
            },
            {
              accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
              direction: TenantLedgerDirection.CREDIT,
              amount: disbursement.amount
            }
          ]
        },
        tx
      );

      await tx.tenantDisbursement.update({
        where: { id: disbursement.id },
        data: {
          status: TenantDisbursementStatus.REVERSED,
          failureReason: input.reason,
          processedAt: now
        }
      });
      await this.writeDisbursementHistory(tx, {
        tenantId: principal.tenantId,
        loanId: disbursement.loanApplicationId,
        disbursementId: disbursement.id,
        fromStatus: disbursement.status,
        toStatus: TenantDisbursementStatus.REVERSED,
        note: input.reason,
        actorId: principal.adminId
      });
    });
    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'DISBURSEMENT_REVERSED',
      entity: 'TENANT_DISBURSEMENT',
      entityId: disbursementId
    });
    return this.getDisbursement(principal, disbursementId);
  }

  async listDisbursements(
    principal: TenantAdminPrincipal,
    input: { status?: TenantDisbursementStatus; limit?: number; cursor?: string }
  ) {
    const rows = await this.prisma.tenantDisbursement.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(input.status ? { status: input.status } : {})
      },
      take: input.limit ?? 20,
      ...(input.cursor
        ? {
            skip: 1,
            cursor: { id: input.cursor }
          }
        : {}),
      orderBy: { createdAt: 'desc' }
    });
    return rows.map((row) => ({
      id: row.id,
      loanApplicationId: row.loanApplicationId,
      amount: row.amount.toString(),
      currency: row.currency,
      method: row.method,
      status: row.status,
      provider: row.provider ?? null,
      providerReference: row.providerReference ?? null,
      failureReason: row.failureReason ?? null,
      processedAt: row.processedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async getDisbursement(principal: TenantAdminPrincipal, id: string) {
    const row = await this.prisma.tenantDisbursement.findFirst({
      where: { id, tenantId: principal.tenantId }
    });
    if (!row) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Disbursement not found.',
        details: { id }
      });
    }
    const history = await this.prisma.tenantDisbursementStatusHistory.findMany({
      where: { tenantId: principal.tenantId, disbursementId: row.id },
      orderBy: { createdAt: 'desc' }
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      loanApplicationId: row.loanApplicationId,
      amount: row.amount.toString(),
      currency: row.currency,
      method: row.method,
      status: row.status,
      provider: row.provider ?? null,
      providerReference: row.providerReference ?? null,
      idempotencyKey: row.idempotencyKey,
      initiatedByAdminId: row.initiatedByAdminId ?? null,
      initiatedBySystem: row.initiatedBySystem,
      processedAt: row.processedAt?.toISOString() ?? null,
      failureReason: row.failureReason ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      history: history.map((item) => ({
        id: item.id,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        note: item.note ?? null,
        actorType: item.actorType,
        actorId: item.actorId ?? null,
        createdAt: item.createdAt.toISOString()
      }))
    };
  }

  async accrueInterest(
    principal: TenantAdminPrincipal,
    id: string,
    input: AccrueInterestDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    const accrualEnabled = await this.featureFlagService.isEnabled(principal.tenantId, 'INTEREST_ACCRUAL');
    if (!accrualEnabled) {
      throw new ConflictException({
        code: 'STATE_CONFLICT',
        message: 'INTEREST_ACCRUAL feature flag is disabled for this tenant.',
        details: null
      });
    }

    if (!(principal.role === 'OPS' || principal.role === 'SUPER_ADMIN' || principal.role === 'RISK_MANAGER')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role cannot accrue interest.',
        details: null
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenantLoanApplication.findFirst({
        where: { id, tenantId: principal.tenantId }
      });
      if (!row) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { id }
        });
      }
      if (row.status !== TenantLoanApplicationStatus.DISBURSED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Interest accrual requires DISBURSED status.',
          details: { status: row.status }
        });
      }
      if (row.interestAccrualPaused) {
        return;
      }
      if (!row.annualInterestRate || row.annualInterestRate.lte(0)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'annualInterestRate must be set before accrual.',
          details: null
        });
      }

      const throughDate = new Date(`${input.throughDate}T00:00:00.000Z`);
      const balances = await this.loanBalanceService.getBalances(principal.tenantId, row.id, tx);
      if (balances.principalOutstanding.lte(0)) {
        return;
      }

      const startDate = row.lastAccruedAt ? new Date(row.lastAccruedAt) : new Date(row.updatedAt);
      const startDay = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
      const days = Math.floor((throughDate.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
      if (days <= 0) {
        return;
      }

      const effectiveRate = row.interestOverrideRate ?? row.annualInterestRate;
      const dailyRate = effectiveRate.dividedBy(36500);
      const accrued = balances.principalOutstanding.times(dailyRate).times(days).toDecimalPlaces(2);
      if (accrued.lte(0)) {
        return;
      }

      await this.ledgerService.postEntry(
        {
          tenantId: principal.tenantId,
          occurredAt: throughDate,
          type: TenantLedgerEntryType.ACCRUAL,
          idempotencyKey: `accrual:${row.id}:${input.throughDate}`,
          referenceType: 'LoanApplication',
          referenceId: row.id,
          currency: row.currency,
          createdBy: principal.adminId,
          actorRole: principal.role as any,
          memo: `Interest accrual through ${input.throughDate}`,
          lines: [
            {
              accountCode: TenantLedgerAccountCode.INTEREST_RECEIVABLE,
              direction: TenantLedgerDirection.DEBIT,
              amount: accrued
            },
            {
              accountCode: TenantLedgerAccountCode.INTEREST_INCOME,
              direction: TenantLedgerDirection.CREDIT,
              amount: accrued
            }
          ]
        },
        tx
      );

      await tx.tenantLoanApplication.update({
        where: { id: row.id },
        data: { lastAccruedAt: throughDate }
      });
    });

    return this.findOne(principal, id);
  }

  async pauseInterest(
    principal: TenantAdminPrincipal,
    id: string,
    input: PauseInterestDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    await this.interestControlService.pauseInterest(id, input.reason, principal);
    return this.findOne(principal, id);
  }

  async resumeInterest(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    await this.interestControlService.resumeInterest(id, principal);
    return this.findOne(principal, id);
  }

  async setInterestOverride(
    principal: TenantAdminPrincipal,
    id: string,
    input: SetInterestOverrideDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    await this.interestControlService.setInterestOverride(id, input.rate, principal, input.reason);
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id, tenantId: principal.tenantId },
      select: { status: true }
    });
    if (loan && ['DISBURSED', 'OVERDUE'].includes(loan.status)) {
      await this.suspiciousActivityService.flag({
        tenantId: principal.tenantId,
        entityType: 'TENANT_LOAN_APPLICATION',
        entityId: id,
        reason: 'Manual interest override after disbursement',
        severity: 'HIGH'
      });
    }
    return this.findOne(principal, id);
  }

  async removeInterestOverride(
    principal: TenantAdminPrincipal,
    id: string,
    input: RemoveInterestOverrideDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    await this.interestControlService.removeInterestOverride(id, principal, input.reason);
    return this.findOne(principal, id);
  }

  async listInterestAudit(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<
    Array<{
      id: string;
      action: string;
      previousRate: string | null;
      newRate: string | null;
      reason: string | null;
      performedById: string;
      createdAt: string;
    }>
  > {
    const audits = await this.interestControlService.listAudit(id, principal);
    return audits.map((audit) => ({
      id: audit.id,
      action: audit.action,
      previousRate: audit.previousRate?.toString() ?? null,
      newRate: audit.newRate?.toString() ?? null,
      reason: audit.reason ?? null,
      performedById: audit.performedById,
      createdAt: audit.createdAt.toISOString()
    }));
  }

  async createLedgerAdjustment(
    principal: TenantAdminPrincipal,
    input: CreateLedgerAdjustmentDto
  ): Promise<{ journalId: string; reused: boolean }> {
    this.assertOpsOrSuperAdmin(principal);

    const result = await this.prisma.$transaction(async (tx) => {
      const journal = await this.ledgerService.createJournal(
        {
          tenantId: principal.tenantId,
          referenceType: 'ADJUSTMENT',
          referenceId: input.loanApplicationId ?? `tenant:${principal.tenantId}`,
          idempotencyKey: input.idempotencyKey,
          createdBy: principal.adminId,
          actorRole: principal.role as any,
          memo: input.memo,
          entries: input.lines.map((line) => ({
            accountCode: line.accountCode as any,
            direction: line.direction as any,
            amount: line.amount,
            currency: 'NGN'
          }))
        },
        tx
      );
      return journal;
    });

    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'LEDGER_ADJUSTMENT_CREATED',
      entity: 'TENANT_LEDGER_ENTRY',
      entityId: result.id,
      metadata: {
        idempotencyKey: input.idempotencyKey,
        loanApplicationId: input.loanApplicationId ?? null
      }
    });

    return { journalId: result.id, reused: result.reused };
  }

  async repay(
    principal: TenantAdminPrincipal,
    id: string,
    input: RepayLoanApplicationDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    await this.repaymentService.postRepayment({
      tenantId: principal.tenantId,
      loanApplicationId: id,
      amount: input.amount,
      postedAt: input.paidAt ? new Date(input.paidAt) : undefined,
      channel: input.method as LoanRepaymentChannel,
      reference: input.reference,
      idempotencyKey: input.idempotencyKey,
      actor: {
        adminId: principal.adminId,
        role: principal.role
      }
    });
    await this.delinquencyEngineService.recalcLoanDelinquency(id, principal.tenantId, new Date());

    return this.findOne(principal, id);
  }

  async generateSchedule(
    principal: TenantAdminPrincipal,
    id: string,
    input: GenerateRepaymentScheduleDto
  ): Promise<AdminLoanApplicationDetailsDto> {
    // Backward-compatible route payload wrapper.
    return this.generateScheduleV2(principal, id, {
      interestMethod: input.annualInterestRate > 0 ? 'REDUCING_BALANCE' : 'FLAT'
    });
  }

  async generateScheduleV2(
    principal: TenantAdminPrincipal,
    id: string,
    input: GenerateLoanScheduleDto,
    force = false
  ): Promise<AdminLoanApplicationDetailsDto> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenantLoanApplication.findFirst({
        where: { id, tenantId: principal.tenantId }
      });
      if (!row) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { id }
        });
      }
      if (row.status !== TenantLoanApplicationStatus.DISBURSED || !row.disbursedAt) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Schedule can only be generated for DISBURSED loans.',
          details: { status: row.status, disbursedAt: row.disbursedAt }
        });
      }
      const existingCount = await tx.loanRepaymentScheduleItem.count({
        where: { tenantId: principal.tenantId, loanApplicationId: row.id }
      });
      if (!force && existingCount > 0) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Repayment schedule already exists. Pass force=true to regenerate.',
          details: null
        });
      }

      const principalAmount = row.disbursedAmount ?? row.approvedAmount ?? row.requestedAmount;
      const schedule = generateSchedule({
        principal: principalAmount,
        annualInterestRateBps: row.annualInterestRateBps ?? 0,
        startDate: row.disbursedAt,
        repaymentFrequency: row.repaymentFrequency ?? RepaymentFrequency.MONTHLY,
        termInDays: row.termInDays > 0 ? row.termInDays : Math.max(30, row.tenorMonths * 30),
        interestMethod: input.interestMethod ?? 'REDUCING_BALANCE',
        feesTotal: 0
      });

      await tx.loanRepaymentScheduleItem.deleteMany({
        where: { tenantId: principal.tenantId, loanApplicationId: row.id }
      });

      for (const item of schedule) {
        await tx.loanRepaymentScheduleItem.create({
          data: {
            tenantId: principal.tenantId,
            loanApplicationId: row.id,
            installmentNumber: item.installmentNumber,
            dueDate: item.dueDate,
            currency: row.currency,
            principalDue: item.principalDue,
            interestDue: item.interestDue,
            feesDue: item.feesDue,
            totalDue: item.totalDue,
            principalPaid: new Prisma.Decimal(0),
            interestPaid: new Prisma.Decimal(0),
            feesPaid: new Prisma.Decimal(0),
            totalPaid: new Prisma.Decimal(0),
            status: LoanRepaymentScheduleItemStatus.PENDING
          }
        });
      }

      const firstDueDate = schedule[0]?.dueDate ?? null;
      const outstandingPrincipal = schedule.reduce((sum, item) => sum.plus(item.principalDue), new Prisma.Decimal(0));
      const outstandingInterest = schedule.reduce((sum, item) => sum.plus(item.interestDue), new Prisma.Decimal(0));
      const outstandingFees = schedule.reduce((sum, item) => sum.plus(item.feesDue), new Prisma.Decimal(0));
      const outstandingTotal = outstandingPrincipal.plus(outstandingInterest).plus(outstandingFees);

      await tx.tenantLoanApplication.update({
        where: { id: row.id },
        data: {
          principal: principalAmount,
          outstandingPrincipal,
          outstandingInterest,
          outstandingFees,
          outstandingTotal,
          nextDueDate: firstDueDate
        }
      });
    });

    return this.findOne(principal, id);
  }

  async listSchedule(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<
    Array<{
      id: string;
      installmentNumber: number;
      dueDate: string;
      totalDue: string;
      totalPaid: string;
      status: LoanRepaymentScheduleItemStatus;
      isOverdue: boolean;
      overdueSince: string | null;
      remainingAmountCents: string;
    }>
  > {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { id }
      });
    }

    const items = await this.prisma.loanRepaymentScheduleItem.findMany({
      where: { tenantId: principal.tenantId, loanApplicationId: id },
      orderBy: { installmentNumber: 'asc' }
    });
    return items.map((item) => ({
      id: item.id,
      installmentNumber: item.installmentNumber,
      dueDate: item.dueDate.toISOString(),
      totalDue: item.totalDue.toString(),
      totalPaid: item.totalPaid.toString(),
      status: item.status,
      isOverdue: item.isOverdue,
      overdueSince: item.overdueSince ? item.overdueSince.toISOString() : null,
      remainingAmountCents: item.totalDue.minus(item.totalPaid).mul(100).toDecimalPlaces(0).toString()
    }));
  }

  async postRepaymentV2(
    principal: TenantAdminPrincipal,
    id: string,
    input: CreateLoanRepaymentDto
  ): Promise<{
    repayment: {
      amount: string;
      postedAt: string;
      channel: LoanRepaymentChannel;
      reference: string | null;
    };
    outstanding: {
      principal: string;
      interest: string;
      fees: string;
      total: string;
      nextDueDate: string | null;
    };
    schedule: Awaited<ReturnType<AdminLoanApplicationsService['listSchedule']>>;
  }> {
    const posted = await this.repaymentService.postRepayment({
      tenantId: principal.tenantId,
      loanApplicationId: id,
      amount: input.amount,
      postedAt: input.postedAt ? new Date(input.postedAt) : undefined,
      channel: input.channel as LoanRepaymentChannel | undefined,
      reference: input.reference,
      idempotencyKey: input.idempotencyKey,
      actor: {
        adminId: principal.adminId,
        role: principal.role
      }
    });
    await this.delinquencyEngineService.recalcLoanDelinquency(id, principal.tenantId, new Date());

    const repayment = await this.prisma.loanRepayment.findFirstOrThrow({
      where: { id: posted.repaymentId, tenantId: principal.tenantId }
    });

    const schedule = await this.listSchedule(principal, id);
    return {
      repayment: {
        amount: repayment.amount.toString(),
        postedAt: repayment.postedAt.toISOString(),
        channel: repayment.channel,
        reference: repayment.reference
      },
      outstanding: {
        principal: posted.outstandingPrincipal,
        interest: posted.outstandingInterest,
        fees: posted.outstandingFees,
        total: posted.outstandingTotal,
        nextDueDate: posted.nextDueDate
      },
      schedule
    };
  }

  async listRepayments(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<
    Array<{
      id: string;
      amount: string;
      currency: string;
      postedAt: string;
      channel: LoanRepaymentChannel;
      reference: string | null;
    }>
  > {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { id }
      });
    }

    const rows = await this.prisma.loanRepayment.findMany({
      where: { tenantId: principal.tenantId, loanApplicationId: id },
      orderBy: { postedAt: 'desc' }
    });
    return rows.map((row) => ({
      id: row.id,
      amount: row.amount.toString(),
      currency: row.currency,
      postedAt: row.postedAt.toISOString(),
      channel: row.channel,
      reference: row.reference
    }));
  }

  async recalcDelinquency(
    principal: TenantAdminPrincipal,
    id: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    if (!['SUPER_ADMIN', 'OPS', 'COLLECTIONS'].includes(principal.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role cannot trigger delinquency recalculation.',
        details: null
      });
    }

    await this.delinquencyEngineService.recalcLoanDelinquency(
      id,
      principal.tenantId,
      new Date()
    );
    return this.findOne(principal, id);
  }

  async getRisk(
    principal: TenantAdminPrincipal,
    loanApplicationId: string
  ): Promise<{
    assessment: {
      score: number;
      decision: 'APPROVE' | 'REVIEW' | 'DECLINE';
      reasons: Array<{ code: string; message: string; data?: Record<string, unknown> }>;
      createdByAdminId: string | null;
      createdAt: string | null;
      overrideEnabled: boolean;
    };
    activeHolds: Array<{
      id: string;
      type: string;
      note: string | null;
      isActive: boolean;
      createdAt: string;
      createdByAdminId: string;
      resolvedAt: string | null;
      resolvedByAdminId: string | null;
      resolutionNote: string | null;
    }>;
    history: Array<{
      id: string;
      score: number;
      decision: 'APPROVE' | 'REVIEW' | 'DECLINE';
      reasons: Array<{ code: string; message: string; data?: Record<string, unknown> }>;
      createdAt: string;
      createdByAdminId: string | null;
    }>;
  }> {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanApplicationId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanApplicationId }
      });
    }

    const snapshot = await this.riskService.getRiskSnapshot(principal.tenantId, loanApplicationId);
    const activeHolds = await this.riskService.listActiveHolds(principal.tenantId, loanApplicationId);
    const history = await this.riskService.listRiskHistory(principal.tenantId, loanApplicationId, 20);

    return {
      assessment: {
        score: snapshot.assessment.score,
        decision: snapshot.assessment.decision,
        reasons: snapshot.assessment.reasons,
        createdByAdminId: snapshot.createdByAdminId,
        createdAt: snapshot.createdAt ? snapshot.createdAt.toISOString() : null,
        overrideEnabled: snapshot.overrideEnabled
      },
      activeHolds: activeHolds.map((item: any) => ({
        id: item.id,
        type: item.type,
        note: item.note ?? null,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        createdByAdminId: item.createdByAdminId,
        resolvedAt: item.resolvedAt ? item.resolvedAt.toISOString() : null,
        resolvedByAdminId: item.resolvedByAdminId ?? null,
        resolutionNote: item.resolutionNote ?? null
      })),
      history: history.map((item: any) => ({
        id: item.id,
        score: item.score,
        decision: item.decision,
        reasons: Array.isArray(item.reasons) ? item.reasons : [],
        createdAt: item.createdAt.toISOString(),
        createdByAdminId: item.createdByAdminId ?? null
      }))
    };
  }

  async runRiskEvaluation(principal: TenantAdminPrincipal, loanApplicationId: string) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanApplicationId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanApplicationId }
      });
    }
    return this.riskService.runManualEvaluation({
      tenantId: principal.tenantId,
      role: principal.role,
      loanApplicationId,
      adminId: principal.adminId
    });
  }

  async runFraudCheck(
    principal: TenantAdminPrincipal,
    loanApplicationId: string
  ): Promise<{
    blocked: boolean;
    signals: Array<{ type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }>;
  }> {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanApplicationId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanApplicationId }
      });
    }

    const result = await this.prisma.$transaction((tx) =>
      this.fraudEvaluator.evaluateApplication(loanApplicationId, {
        tenantId: principal.tenantId,
        tx
      })
    );

    return {
      blocked: result.blocked,
      signals: result.signals.map((signal) => ({
        type: signal.type,
        severity: signal.severity
      }))
    };
  }

  async listRiskEvaluations(principal: TenantAdminPrincipal, loanApplicationId: string) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanApplicationId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan application not found.',
        details: { loanApplicationId }
      });
    }
    const items = await this.riskService.listEvaluations(principal.tenantId, loanApplicationId);
    return {
      items: items.map((item: any) => ({
        id: item.id,
        trigger: item.trigger,
        score: item.score,
        decision: item.decision,
        reasonsJson: item.reasonsJson,
        inputSnapshotJson: item.inputSnapshotJson,
        createdAt: item.createdAt.toISOString(),
        createdBy: item.createdBy ?? null
      }))
    };
  }

  async addHold(
    principal: TenantAdminPrincipal,
    loanApplicationId: string,
    input: { type: 'FRAUD_SUSPECTED' | 'KYC_MISSING' | 'DOCUMENTS_MISSING' | 'POLICY_VIOLATION' | 'MANUAL_REVIEW' | 'COLLECTIONS_REVIEW' | 'SYSTEM_VELOCITY'; note?: string }
  ) {
    await this.riskService.addHold(
      principal.tenantId,
      loanApplicationId,
      input.type,
      input.note,
      principal.adminId
    );
    return this.getRisk(principal, loanApplicationId);
  }

  async resolveHold(
    principal: TenantAdminPrincipal,
    holdId: string,
    input: { resolutionNote?: string }
  ) {
    const resolved = await this.riskService.resolveHold(
      principal.tenantId,
      holdId,
      input.resolutionNote,
      principal.adminId
    );
    return this.getRisk(principal, resolved.loanApplicationId);
  }

  async overrideRisk(
    principal: TenantAdminPrincipal,
    loanApplicationId: string,
    input: { note: string }
  ) {
    await this.riskService.overrideToPass(principal.tenantId, loanApplicationId, input.note, {
      adminId: principal.adminId,
      role: principal.role
    });
    return this.getRisk(principal, loanApplicationId);
  }

  async decide(
    principal: TenantAdminPrincipal,
    loanApplicationId: string
  ): Promise<{
    decision: 'APPROVE' | 'MANUAL_REVIEW' | 'DECLINE';
    transitionedTo: TenantLoanApplicationStatus;
    eventId: string;
    reasonCodes: string[];
  }> {
    return this.decisionOrchestrator.decideAndTransition({
      tenantId: principal.tenantId,
      loanApplicationId,
      actor: {
        type: 'ADMIN',
        actorId: principal.adminId,
        role: principal.role
      }
    });
  }

  async approveIdentityManualReview(
    principal: TenantAdminPrincipal,
    loanApplicationId: string
  ): Promise<AdminLoanApplicationDetailsDto> {
    await this.identityService.approveManualReview(principal, loanApplicationId);
    return this.findOne(principal, loanApplicationId);
  }
}
