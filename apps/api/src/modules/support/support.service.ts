import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InterestAccrualAction,
  Prisma,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';
import type {
  ApproveSupportActionDto,
  CreateSupportActionDto,
  CreateSupportCaseDto,
  CreateSupportNoteDto,
  ListSupportCasesQueryDto,
  RejectSupportActionDto
} from './dto/support.dto';

type SupportRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type SupportActionType =
  | 'PAUSE_INTEREST'
  | 'RESUME_INTEREST'
  | 'APPLY_WAIVER'
  | 'APPLY_FEE'
  | 'RESCHEDULE_PLAN'
  | 'LEDGER_REVERSAL'
  | 'NOTE';

type SupportActionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED' | 'CANCELED';

export function requiresFourEyes(risk: SupportRiskLevel): boolean {
  return risk === 'HIGH' || risk === 'CRITICAL';
}

export function canApproveAction(role: TenantAdminPrincipal['role']): boolean {
  return role === 'RISK_MANAGER' || role === 'SUPER_ADMIN' || role === 'OPS';
}

export function canExecuteAction(role: TenantAdminPrincipal['role']): boolean {
  return role === 'OPS' || role === 'SUPER_ADMIN';
}

export function canApproveFourEyes(role: TenantAdminPrincipal['role']): boolean {
  return role === 'RISK_MANAGER' || role === 'SUPER_ADMIN';
}

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tenantLedgerService: TenantLedgerService
  ) {}

  async createCase(principal: TenantAdminPrincipal, input: CreateSupportCaseDto) {
    this.assertBaseRole(principal.role);
    return (this.prisma as any).supportCase.create({
      data: {
        tenantId: principal.tenantId,
        title: input.title,
        status: 'OPEN',
        loanId: input.loanId ?? null,
        borrowerId: input.borrowerId ?? null,
        createdById: principal.adminId
      }
    });
  }

  async listCases(principal: TenantAdminPrincipal, query: ListSupportCasesQueryDto) {
    this.assertBaseRole(principal.role);
    return (this.prisma as any).supportCase.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.loanId ? { loanId: query.loanId } : {}),
        ...(query.borrowerId ? { borrowerId: query.borrowerId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getCase(principal: TenantAdminPrincipal, caseId: string) {
    this.assertBaseRole(principal.role);
    const row = await (this.prisma as any).supportCase.findFirst({
      where: { id: caseId, tenantId: principal.tenantId },
      include: { actions: { orderBy: { createdAt: 'desc' } }, notes: { orderBy: { createdAt: 'desc' } } }
    });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Support case not found.', details: null });
    }
    return row;
  }

  async addNote(principal: TenantAdminPrincipal, caseId: string, input: CreateSupportNoteDto) {
    this.assertBaseRole(principal.role);
    const supportCase = await this.getCase(principal, caseId);
    return (this.prisma as any).supportNote.create({
      data: {
        caseId: supportCase.id,
        tenantId: principal.tenantId,
        createdById: principal.adminId,
        body: input.body,
        evidenceUrl: input.evidenceUrl ?? null
      }
    });
  }

  async createAction(principal: TenantAdminPrincipal, caseId: string, input: CreateSupportActionDto) {
    this.assertBaseRole(principal.role);
    const supportCase = await this.getCase(principal, caseId);
    const risk = await this.computeRisk(principal.tenantId, supportCase.loanId ?? null, input.type, input.payload);
    const action = await (this.prisma as any).supportAction.create({
      data: {
        caseId: supportCase.id,
        tenantId: principal.tenantId,
        type: input.type,
        risk,
        status: 'PENDING_APPROVAL',
        payloadJson: input.payload as Prisma.InputJsonValue,
        reason: input.reason,
        requestedById: principal.adminId
      }
    });

    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'SUPPORT_ACTION_CREATED',
      entity: 'SUPPORT_ACTION',
      entityId: action.id,
      metadata: { type: action.type, risk: action.risk }
    });
    return action;
  }

  async approveAction(principal: TenantAdminPrincipal, actionId: string, input: ApproveSupportActionDto) {
    const action = await this.getAction(principal.tenantId, actionId);
    if (!canApproveAction(principal.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Role cannot approve support action.', details: null });
    }
    if (action.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Action is not pending approval.', details: null });
    }
    if (requiresFourEyes(action.risk) && action.requestedById === principal.adminId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Requester cannot approve HIGH/CRITICAL action.', details: null });
    }
    if (requiresFourEyes(action.risk) && !canApproveFourEyes(principal.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'HIGH/CRITICAL actions require RISK_MANAGER or SUPER_ADMIN approval.',
        details: null
      });
    }
    const updated = await (this.prisma as any).supportAction.update({
      where: { id: action.id },
      data: {
        status: 'APPROVED',
        approvedById: principal.adminId,
        decidedAt: new Date(),
        decisionNote: input.decisionNote ?? null
      }
    });
    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'SUPPORT_ACTION_APPROVED',
      entity: 'SUPPORT_ACTION',
      entityId: action.id,
      metadata: {
        caseId: action.caseId,
        risk: action.risk,
        type: action.type,
        decisionNote: input.decisionNote ?? null
      }
    });
    return updated;
  }

  async rejectAction(principal: TenantAdminPrincipal, actionId: string, input: RejectSupportActionDto) {
    const action = await this.getAction(principal.tenantId, actionId);
    if (!canApproveAction(principal.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Role cannot reject support action.', details: null });
    }
    if (action.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Action is not pending approval.', details: null });
    }
    const updated = await (this.prisma as any).supportAction.update({
      where: { id: action.id },
      data: {
        status: 'REJECTED',
        rejectedById: principal.adminId,
        decidedAt: new Date(),
        decisionNote: input.decisionNote
      }
    });
    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'SUPPORT_ACTION_REJECTED',
      entity: 'SUPPORT_ACTION',
      entityId: action.id,
      metadata: {
        caseId: action.caseId,
        risk: action.risk,
        type: action.type,
        decisionNote: input.decisionNote
      }
    });
    return updated;
  }

  async executeAction(principal: TenantAdminPrincipal, actionId: string) {
    if (!canExecuteAction(principal.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Role cannot execute support action.', details: null });
    }
    const action = await this.getAction(principal.tenantId, actionId);
    if (action.status !== 'APPROVED') {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Action must be approved before execution.', details: null });
    }
    if (requiresFourEyes(action.risk) && action.approvedById === principal.adminId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Approver cannot execute HIGH/CRITICAL action.', details: null });
    }

    try {
      await this.executeDomainEffect(principal, action);
      const updated = await (this.prisma as any).supportAction.update({
        where: { id: action.id },
        data: { status: 'EXECUTED', executedById: principal.adminId, executedAt: new Date() }
      });
      await this.auditService.log({
        tenantId: principal.tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: principal.adminId,
        actorRole: principal.role,
        action: 'SUPPORT_ACTION_EXECUTED',
        entity: 'SUPPORT_ACTION',
        entityId: action.id,
        metadata: {
          caseId: action.caseId,
          risk: action.risk,
          type: action.type
        }
      });
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed';
      await (this.prisma as any).supportAction.update({
        where: { id: action.id },
        data: { status: 'FAILED', failedAt: new Date(), failureReason: message }
      });
      throw error;
    }
  }

  async closeCase(principal: TenantAdminPrincipal, caseId: string) {
    this.assertBaseRole(principal.role);
    const supportCase = await this.getCase(principal, caseId);
    const updated = await (this.prisma as any).supportCase.update({
      where: { id: supportCase.id },
      data: { status: 'CLOSED' }
    });
    await this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      action: 'SUPPORT_CASE_CLOSED',
      entity: 'SUPPORT_CASE',
      entityId: supportCase.id,
      metadata: { loanId: supportCase.loanId ?? null, borrowerId: supportCase.borrowerId ?? null }
    });
    return updated;
  }

  private async executeDomainEffect(
    principal: TenantAdminPrincipal,
    action: {
      id: string;
      caseId: string;
      type: SupportActionType;
      payloadJson: Record<string, unknown>;
      tenantId: string;
      risk: SupportRiskLevel;
      requestedById: string;
      approvedById: string | null;
      status: SupportActionStatus;
    }
  ): Promise<void> {
    const payload = (action.payloadJson ?? {}) as Record<string, unknown>;
    const supportCase = await (this.prisma as any).supportCase.findFirst({
      where: { id: action.caseId, tenantId: principal.tenantId }
    });
    if (!supportCase) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Support case not found.', details: null });
    }

    if (action.type === 'PAUSE_INTEREST') {
      await this.setInterestPaused(principal.tenantId, supportCase.loanId, true, String(payload.reason ?? 'Support pause'), principal.adminId);
      return;
    }
    if (action.type === 'RESUME_INTEREST') {
      await this.setInterestPaused(principal.tenantId, supportCase.loanId, false, null, principal.adminId);
      return;
    }
    if (action.type === 'APPLY_FEE') {
      const amount = Number(payload.amount ?? 0);
      await this.postFeeOrWaiver(principal, supportCase.loanId, amount, 'FEE');
      return;
    }
    if (action.type === 'APPLY_WAIVER') {
      const amount = Number(payload.amount ?? 0);
      await this.postFeeOrWaiver(principal, supportCase.loanId, amount, 'WAIVER');
      return;
    }
    if (action.type === 'RESCHEDULE_PLAN') {
      await this.reschedulePlan(principal, supportCase.loanId, payload);
      return;
    }
    if (action.type === 'LEDGER_REVERSAL') {
      const entryId = String(payload.entryId ?? '');
      if (!entryId) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'entryId is required.', details: null });
      await this.tenantLedgerService.reverseEntry({
        tenantId: principal.tenantId,
        entryId,
        reason: 'Support action ledger reversal',
        createdBy: principal.adminId,
        actorRole: principal.role as any
      });
      return;
    }
  }

  private async setInterestPaused(
    tenantId: string,
    loanId: string | null,
    paused: boolean,
    reason: string | null,
    adminId: string
  ): Promise<void> {
    if (!loanId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'loanId is required for interest action.', details: null });
    }
    await this.prisma.tenantLoanApplication.updateMany({
      where: { id: loanId, tenantId },
      data: {
        interestAccrualPaused: paused,
        interestPausedAt: paused ? new Date() : null,
        interestPausedById: paused ? adminId : null,
        interestPauseReason: paused ? reason : null
      }
    });
    await this.prisma.interestAccrualAudit.create({
      data: {
        tenantId,
        loanApplicationId: loanId,
        action: paused ? InterestAccrualAction.PAUSED : InterestAccrualAction.RESUMED,
        previousRate: null,
        newRate: null,
        reason: reason,
        performedById: adminId
      }
    });
  }

  private async postFeeOrWaiver(
    principal: TenantAdminPrincipal,
    loanId: string | null,
    amount: number,
    mode: 'FEE' | 'WAIVER'
  ): Promise<void> {
    if (!loanId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'loanId is required for fee/waiver.', details: null });
    }
    if (!(amount > 0)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'amount must be positive.', details: null });
    }
    const value = new Prisma.Decimal(amount).toDecimalPlaces(2);
    if (mode === 'FEE') {
      await this.tenantLedgerService.postEntry({
        tenantId: principal.tenantId,
        occurredAt: new Date(),
        type: TenantLedgerEntryType.ADJUSTMENT,
        idempotencyKey: `support:fee:${loanId}:${amount}:${Date.now()}`,
        referenceType: 'LoanApplication',
        referenceId: loanId,
        memo: 'Support applied fee',
        currency: 'NGN',
        createdBy: principal.adminId,
        actorRole: principal.role as any,
        lines: [
          { accountCode: TenantLedgerAccountCode.FEES_RECEIVABLE, direction: TenantLedgerDirection.DEBIT, amount: value },
          { accountCode: TenantLedgerAccountCode.FEE_INCOME, direction: TenantLedgerDirection.CREDIT, amount: value }
        ]
      });
      return;
    }
    await this.tenantLedgerService.postEntry({
      tenantId: principal.tenantId,
      occurredAt: new Date(),
      type: TenantLedgerEntryType.ADJUSTMENT,
      idempotencyKey: `support:waiver:${loanId}:${amount}:${Date.now()}`,
      referenceType: 'LoanApplication',
      referenceId: loanId,
      memo: 'Support applied waiver',
      currency: 'NGN',
      createdBy: principal.adminId,
      actorRole: principal.role as any,
      lines: [
        { accountCode: TenantLedgerAccountCode.WRITE_OFF_EXPENSE, direction: TenantLedgerDirection.DEBIT, amount: value },
        { accountCode: TenantLedgerAccountCode.FEES_RECEIVABLE, direction: TenantLedgerDirection.CREDIT, amount: value }
      ]
    });
  }

  private async reschedulePlan(
    principal: TenantAdminPrincipal,
    loanId: string | null,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!loanId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'loanId is required for reschedule.', details: null });
    }
    const shifts = Array.isArray(payload.shifts) ? payload.shifts : [];
    await this.prisma.$transaction(async (tx) => {
      const currentVersion = await (tx as any).repaymentScheduleVersion.aggregate({
        where: { tenantId: principal.tenantId, loanApplicationId: loanId },
        _max: { version: true }
      });
      const nextVersion = Number(currentVersion?._max?.version ?? 0) + 1;
      await (tx as any).repaymentScheduleVersion.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loanId,
          version: nextVersion,
          effectiveFrom: new Date(),
          jsonPlan: payload as Prisma.InputJsonValue,
          createdById: principal.adminId
        }
      });

      for (const item of shifts as Array<{ installmentNumber?: number; dueDate?: string }>) {
        if (!item?.installmentNumber || !item?.dueDate) continue;
        await tx.loanRepaymentScheduleItem.updateMany({
          where: {
            tenantId: principal.tenantId,
            loanApplicationId: loanId,
            installmentNumber: item.installmentNumber,
            status: { in: ['PENDING', 'PARTIAL'] }
          },
          data: { dueDate: new Date(item.dueDate) }
        });
      }
    });
  }

  private assertBaseRole(role: TenantAdminPrincipal['role']): void {
    if (!(role === 'OPS' || role === 'SUPER_ADMIN' || role === 'RISK_MANAGER' || role === 'CREDIT_OFFICER')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Role cannot access support console.', details: null });
    }
  }

  private async getAction(tenantId: string, actionId: string) {
    const action = await (this.prisma as any).supportAction.findFirst({
      where: { id: actionId, tenantId }
    });
    if (!action) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Support action not found.', details: null });
    }
    return action as {
      id: string;
      caseId: string;
      tenantId: string;
      type: SupportActionType;
      risk: SupportRiskLevel;
      status: SupportActionStatus;
      payloadJson: Record<string, unknown>;
      requestedById: string;
      approvedById: string | null;
    };
  }

  private async computeRisk(
    tenantId: string,
    loanId: string | null,
    type: SupportActionType,
    payload: Record<string, unknown>
  ): Promise<SupportRiskLevel> {
    if (type === 'LEDGER_REVERSAL') return 'CRITICAL';
    if (type === 'RESCHEDULE_PLAN') return 'HIGH';
    if (type === 'NOTE') return 'LOW';
    if (type === 'PAUSE_INTEREST') {
      const days = Number(payload.days ?? 0);
      return days > 7 ? 'HIGH' : 'MEDIUM';
    }
    if (!loanId) return 'MEDIUM';
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId },
      select: { outstandingTotal: true }
    });
    const outstanding = Number(loan?.outstandingTotal ?? 0);
    const amount = Number(payload.amount ?? 0);
    if (type === 'APPLY_WAIVER') {
      return outstanding > 0 && amount >= outstanding * 0.1 ? 'HIGH' : 'MEDIUM';
    }
    if (type === 'APPLY_FEE') {
      return outstanding > 0 && amount >= outstanding * 0.05 ? 'MEDIUM' : 'LOW';
    }
    if (type === 'RESUME_INTEREST') return 'LOW';
    return 'MEDIUM';
  }
}
