import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { CollectionsActionType, CollectionsCaseStatus, Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { assertRoleCanTransition } from '../loan-applications/loan-application-transition-rbac';
import { assertValidTransition } from '../loan-applications/loan-application-status-transition';
import { CollectionsScanService } from '../collections/collections-scan.service';
import { DelinquencyService } from '../collections/delinquency.service';
import { PenaltyService } from '../collections/penalty.service';
import { determineCollectionsStage } from '../collections/arrears-utils';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';
import { parsePagination } from '../../common/http/pagination';
import type { AddCollectionsCaseActionDto } from './dto/add-collections-case-action.dto';
import type { AssignCollectionsCaseDto } from './dto/assign-collections-case.dto';
import type { CloseCollectionsCaseDto } from './dto/close-collections-case.dto';
import type { CreateCollectionActivityDto } from './dto/create-collection-activity.dto';
import type { ListCollectionsCasesQueryDto } from './dto/list-collections-cases-query.dto';
import type { ListCollectionsQueueQueryDto } from './dto/list-collections-queue-query.dto';
import type { PauseLoanPenaltyDto } from './dto/pause-loan-penalty.dto';
import type { RunCollectionsScanDto } from './dto/run-collections-scan.dto';
import type { SetPromiseToPayDto } from './dto/set-promise-to-pay.dto';
import type { WaiveLoanPenaltyDto } from './dto/waive-loan-penalty.dto';
import type { WriteOffCollectionsCaseDto } from './dto/write-off-collections-case.dto';
import { requireTenantId } from '../../common/tenancy/tenant-guard';
import { buildIdempotencyKey } from '../../common/idempotency/idempotency';

@Injectable()
export class AdminCollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delinquencyService: DelinquencyService,
    private readonly penaltyService: PenaltyService,
    private readonly collectionsScanService: CollectionsScanService,
    private readonly auditService: AuditService,
    private readonly ledgerService: TenantLedgerService
  ) {}

  private assertRole(
    role: TenantAdminPrincipal['role'],
    required: Array<'CREDIT_OFFICER' | 'OPS' | 'COLLECTIONS' | 'RISK_MANAGER' | 'SUPER_ADMIN'>
  ): void {
    if (!required.includes(role as any)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role ${role} cannot perform this operation.`,
        details: null
      });
    }
  }

  private assertCollectionsRole(role: TenantAdminPrincipal['role']): void {
    this.assertRole(role, ['COLLECTIONS', 'SUPER_ADMIN']);
  }

  private assertCaseActionRole(role: TenantAdminPrincipal['role']): void {
    this.assertRole(role, ['CREDIT_OFFICER', 'OPS', 'COLLECTIONS', 'RISK_MANAGER', 'SUPER_ADMIN']);
  }

  private getTenantId(principal: TenantAdminPrincipal): string {
    return requireTenantId(principal.tenantId);
  }

  private async appendCaseAction(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      caseId: string;
      actorAdminUserId?: string | null;
      type: CollectionsActionType;
      note: string;
      metadata?: Prisma.InputJsonValue;
    }
  ): Promise<void> {
    await tx.collectionsAction.create({
      data: {
        tenantId: input.tenantId,
        caseId: input.caseId,
        actorAdminUserId: input.actorAdminUserId ?? null,
        type: input.type,
        note: input.note,
        metadata: input.metadata ?? undefined
      }
    });
  }

  async runCollectionsScan(principal: TenantAdminPrincipal, input: RunCollectionsScanDto) {
    this.assertRole(principal.role, ['SUPER_ADMIN']);
    const now = input.now ? new Date(input.now) : new Date();
    const result = await this.collectionsScanService.runForTenant(principal.tenantId, now);
    await this.auditService.recordEvent({
      actorType: 'ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      tenantId: principal.tenantId,
      action: 'COLLECTION_RESULT',
      entityType: 'CollectionAttempt',
      entityId: `${principal.tenantId}:${now.toISOString()}`,
      metadata: result as unknown as Record<string, unknown>,
      idempotencyKey: buildIdempotencyKey({
        scope: 'collection_scan',
        tenantId: principal.tenantId,
        at: now.toISOString().slice(0, 13)
      })
    });
    return result;
  }

  async listCases(principal: TenantAdminPrincipal, query: ListCollectionsCasesQueryDto) {
    this.assertCaseActionRole(principal.role);
    const tenantId = this.getTenantId(principal);
    const pagination = parsePagination(query);
    const rows = await this.prisma.collectionsCase.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.stage ? { stage: query.stage } : {}),
        ...(query.assignedTo ? { assignedToAdminUserId: query.assignedTo } : {})
      },
      include: {
        loanAccount: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            status: true
          }
        }
      },
      orderBy: [{ currentDpd: 'desc' }, { updatedAt: 'desc' }],
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        loanAccountId: row.loanAccountId,
        borrowerId: row.borrowerId,
        borrowerName: row.loanAccount.fullName,
        borrowerPhone: row.loanAccount.phone,
        status: row.status,
        stage: row.stage,
        currentDpd: row.currentDpd,
        currentOutstanding: row.currentOutstanding.toString(),
        assignedToAdminUserId: row.assignedToAdminUserId,
        lastContactAt: row.lastContactAt?.toISOString() ?? null,
        nextActionAt: row.nextActionAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString()
      }))
    };
  }

  async getCase(principal: TenantAdminPrincipal, caseId: string) {
    this.assertCaseActionRole(principal.role);
    const tenantId = this.getTenantId(principal);
    const row = await this.prisma.collectionsCase.findFirst({
      where: { id: caseId, tenantId },
      include: {
        actions: { orderBy: { createdAt: 'desc' }, take: 200 },
        loanAccount: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            status: true,
            outstandingPrincipal: true,
            outstandingInterest: true,
            outstandingFees: true,
            outstandingTotal: true,
            daysPastDue: true
          }
        }
      }
    });
    if (!row) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Collections case not found.',
        details: { caseId }
      });
    }
    return {
      ...row,
      currentOutstanding: row.currentOutstanding.toString(),
      outstandingAtOpen: row.outstandingAtOpen.toString(),
      loanAccount: {
        ...row.loanAccount,
        outstandingPrincipal: row.loanAccount.outstandingPrincipal.toString(),
        outstandingInterest: row.loanAccount.outstandingInterest.toString(),
        outstandingFees: row.loanAccount.outstandingFees.toString(),
        outstandingTotal: row.loanAccount.outstandingTotal.toString()
      }
    };
  }

  async assignCase(principal: TenantAdminPrincipal, caseId: string, input: AssignCollectionsCaseDto) {
    this.assertRole(principal.role, ['OPS', 'COLLECTIONS', 'SUPER_ADMIN']);
    return this.prisma.$transaction(async (tx) => {
      const caseRow = await tx.collectionsCase.findFirst({
        where: { id: caseId, tenantId: principal.tenantId }
      });
      if (!caseRow) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Collections case not found.',
          details: { caseId }
        });
      }

      const updated = await tx.collectionsCase.update({
        where: { id: caseRow.id },
        data: {
          assignedToAdminUserId: input.adminUserId,
          status:
            caseRow.status === CollectionsCaseStatus.OPEN
              ? CollectionsCaseStatus.IN_PROGRESS
              : caseRow.status
        }
      });

      await this.appendCaseAction(tx, {
        tenantId: principal.tenantId,
        caseId: updated.id,
        actorAdminUserId: principal.adminId,
        type: CollectionsActionType.NOTE,
        note: `Case assigned to ${input.adminUserId}`
      });
      return updated;
    });
  }

  async addCaseAction(principal: TenantAdminPrincipal, caseId: string, input: AddCollectionsCaseActionDto) {
    this.assertCaseActionRole(principal.role);
    return this.prisma.$transaction(async (tx) => {
      const caseRow = await tx.collectionsCase.findFirst({
        where: { id: caseId, tenantId: principal.tenantId }
      });
      if (!caseRow) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Collections case not found.',
          details: { caseId }
        });
      }
      await this.appendCaseAction(tx, {
        tenantId: principal.tenantId,
        caseId: caseRow.id,
        actorAdminUserId: principal.adminId,
        type: input.type as CollectionsActionType,
        note: input.note,
        metadata: input.metadata as Prisma.InputJsonValue | undefined
      });

      const shouldTouchContact = ['CALL', 'SMS', 'WHATSAPP', 'EMAIL', 'VISIT'].includes(input.type);
      if (shouldTouchContact) {
        await tx.collectionsCase.update({
          where: { id: caseRow.id },
          data: { lastContactAt: new Date() }
        });
      }
      return { ok: true };
    });
  }

  async setPromiseToPay(principal: TenantAdminPrincipal, caseId: string, input: SetPromiseToPayDto) {
    this.assertRole(principal.role, ['CREDIT_OFFICER', 'OPS', 'COLLECTIONS', 'SUPER_ADMIN']);
    const promiseToPayAt = new Date(input.promiseToPayAt);
    return this.prisma.$transaction(async (tx) => {
      const caseRow = await tx.collectionsCase.findFirst({
        where: { id: caseId, tenantId: principal.tenantId }
      });
      if (!caseRow) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Collections case not found.',
          details: { caseId }
        });
      }

      const updated = await tx.collectionsCase.update({
        where: { id: caseRow.id },
        data: {
          status: CollectionsCaseStatus.PROMISE_TO_PAY,
          promiseToPayAt,
          nextActionAt: promiseToPayAt
        }
      });
      await this.appendCaseAction(tx, {
        tenantId: principal.tenantId,
        caseId: updated.id,
        actorAdminUserId: principal.adminId,
        type: CollectionsActionType.PTP_SET,
        note: input.note ?? `Promise to pay set for ${promiseToPayAt.toISOString()}`,
        metadata: { promiseToPayAt: promiseToPayAt.toISOString() }
      });
      return updated;
    });
  }

  async closeCase(principal: TenantAdminPrincipal, caseId: string, input: CloseCollectionsCaseDto) {
    this.assertRole(principal.role, ['COLLECTIONS', 'OPS', 'SUPER_ADMIN']);
    return this.prisma.$transaction(async (tx) => {
      const caseRow = await tx.collectionsCase.findFirst({
        where: { id: caseId, tenantId: principal.tenantId }
      });
      if (!caseRow) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Collections case not found.',
          details: { caseId }
        });
      }
      const updated = await tx.collectionsCase.update({
        where: { id: caseRow.id },
        data: {
          status: CollectionsCaseStatus.CLOSED,
          resolvedAt: new Date(),
          resolutionNote: input.resolutionNote
        }
      });
      await this.appendCaseAction(tx, {
        tenantId: principal.tenantId,
        caseId: updated.id,
        actorAdminUserId: principal.adminId,
        type: CollectionsActionType.NOTE,
        note: `Case closed: ${input.resolutionNote}`
      });
      return updated;
    });
  }

  async writeOffCase(principal: TenantAdminPrincipal, caseId: string, input: WriteOffCollectionsCaseDto) {
    this.assertRole(principal.role, ['COLLECTIONS', 'RISK_MANAGER', 'SUPER_ADMIN']);
    return this.prisma.$transaction(async (tx) => {
      const caseRow = await tx.collectionsCase.findFirst({
        where: { id: caseId, tenantId: principal.tenantId },
        include: { loanAccount: true }
      });
      if (!caseRow) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Collections case not found.',
          details: { caseId }
        });
      }

      const loan = caseRow.loanAccount;
      assertValidTransition(loan.status, TenantLoanApplicationStatus.WRITTEN_OFF);
      assertRoleCanTransition({
        role: principal.role,
        from: loan.status,
        to: TenantLoanApplicationStatus.WRITTEN_OFF
      });

      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          status: TenantLoanApplicationStatus.WRITTEN_OFF,
          writtenOffAt: new Date()
        }
      });
      const principalToWriteOff = Prisma.Decimal.max(new Prisma.Decimal(0), loan.outstandingPrincipal);
      const interestToWriteOff = Prisma.Decimal.max(new Prisma.Decimal(0), loan.outstandingInterest);
      if (principalToWriteOff.gt(0) || interestToWriteOff.gt(0)) {
        const lines: Array<{
          accountCode: any;
          direction: any;
          amount: Prisma.Decimal;
        }> = [];
        if (principalToWriteOff.gt(0)) {
          lines.push({
            accountCode: 'WRITE_OFF_EXPENSE',
            direction: 'DEBIT',
            amount: principalToWriteOff
          });
          lines.push({
            accountCode: 'LOAN_PRINCIPAL_RECEIVABLE',
            direction: 'CREDIT',
            amount: principalToWriteOff
          });
        }
        if (interestToWriteOff.gt(0)) {
          lines.push({
            accountCode: 'WRITE_OFF_EXPENSE',
            direction: 'DEBIT',
            amount: interestToWriteOff
          });
          lines.push({
            accountCode: 'INTEREST_RECEIVABLE',
            direction: 'CREDIT',
            amount: interestToWriteOff
          });
        }
        await this.ledgerService.postEntry(
          {
            tenantId: principal.tenantId,
            occurredAt: new Date(),
            type: 'WRITE_OFF',
            idempotencyKey: `writeoff:${loan.id}`,
            referenceType: 'LoanApplication',
            referenceId: loan.id,
            memo: input.note,
            createdBy: principal.adminId,
            actorRole: principal.role as any,
            lines
          } as any,
          tx
        );
      }
      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loan.id,
          fromStatus: loan.status,
          toStatus: TenantLoanApplicationStatus.WRITTEN_OFF,
          note: input.note,
          changedByUserId: principal.adminId
        }
      });
      const updated = await tx.collectionsCase.update({
        where: { id: caseRow.id },
        data: {
          status: CollectionsCaseStatus.WRITTEN_OFF,
          resolvedAt: new Date(),
          resolutionNote: input.note
        }
      });
      await this.appendCaseAction(tx, {
        tenantId: principal.tenantId,
        caseId: updated.id,
        actorAdminUserId: principal.adminId,
        type: CollectionsActionType.WRITE_OFF,
        note: input.note
      });
      return updated;
    });
  }

  async pauseLoanPenalty(principal: TenantAdminPrincipal, loanId: string, input: PauseLoanPenaltyDto) {
    this.assertRole(principal.role, ['OPS', 'RISK_MANAGER', 'SUPER_ADMIN']);
    await this.penaltyService.setPenaltyPaused(loanId, principal.tenantId, input.isPaused);
    const caseRow = await this.prisma.collectionsCase.findFirst({
      where: {
        tenantId: principal.tenantId,
        loanAccountId: loanId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'PROMISE_TO_PAY', 'BROKEN_PTP'] }
      }
    });
    if (caseRow) {
      await this.prisma.collectionsAction.create({
        data: {
          tenantId: principal.tenantId,
          caseId: caseRow.id,
          actorAdminUserId: principal.adminId,
          type: CollectionsActionType.NOTE,
          note: input.note,
          metadata: { isPaused: input.isPaused }
        }
      });
    }
    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'PENALTY_PAUSE_UPDATED',
      entity: 'LOAN_ACCOUNT',
      entityId: loanId,
      metadata: { isPaused: input.isPaused, note: input.note }
    });
    return { ok: true };
  }

  async waiveLoanPenalty(principal: TenantAdminPrincipal, loanId: string, input: WaiveLoanPenaltyDto) {
    this.assertRole(principal.role, ['RISK_MANAGER', 'SUPER_ADMIN']);
    await this.penaltyService.waivePenalty(loanId, principal.tenantId, input.amount);
    const caseRow = await this.prisma.collectionsCase.findFirst({
      where: {
        tenantId: principal.tenantId,
        loanAccountId: loanId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'PROMISE_TO_PAY', 'BROKEN_PTP'] }
      }
    });
    if (caseRow) {
      await this.prisma.collectionsAction.create({
        data: {
          tenantId: principal.tenantId,
          caseId: caseRow.id,
          actorAdminUserId: principal.adminId,
          type: CollectionsActionType.WAIVER,
          note: input.note,
          metadata: { amount: input.amount }
        }
      });
    }
    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'PENALTY_WAIVED',
      entity: 'LOAN_ACCOUNT',
      entityId: loanId,
      metadata: { amount: input.amount, note: input.note }
    });
    return { ok: true };
  }

  // Backward-compatible endpoints
  async listQueue(principal: TenantAdminPrincipal, query: ListCollectionsQueueQueryDto) {
    this.assertCollectionsRole(principal.role);
    const tenantId = this.getTenantId(principal);
    const pagination = parsePagination(query);
    const rows = await this.prisma.tenantLoanApplication.findMany({
      where: {
        tenantId,
        daysPastDue: { gt: 0 },
        ...(query.bucket ? { delinquencyBucket: query.bucket } : {})
      },
      orderBy: [{ daysPastDue: 'desc' }, { createdAt: 'desc' }],
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        borrowerName: row.fullName,
        dpd: row.daysPastDue,
        bucket: row.delinquencyBucket ?? 'CURRENT',
        status: row.status,
        outstandingBalance: row.outstandingTotal.toString(),
        totalPenaltyAccrued: row.totalPenaltyAccrued.toString()
      }))
    };
  }

  async addActivity(principal: TenantAdminPrincipal, loanId: string, input: CreateCollectionActivityDto) {
    this.assertCollectionsRole(principal.role);
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: loanId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan not found.',
        details: { loanId }
      });
    }

    const created = await this.prisma.collectionActivity.create({
      data: {
        tenantId: principal.tenantId,
        loanId,
        actionType: input.actionType,
        note: input.note?.trim() || null,
        performedBy: principal.adminId
      }
    });
    await this.auditService.recordEvent({
      actorType: 'ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      tenantId: principal.tenantId,
      action: 'COLLECTION_ATTEMPTED',
      entityType: 'CollectionAttempt',
      entityId: created.id,
      metadata: {
        loanId,
        actionType: created.actionType,
        note: created.note
      },
      idempotencyKey: buildIdempotencyKey({
        scope: 'collection_attempt',
        tenantId: principal.tenantId,
        loanId,
        activityId: created.id
      })
    });
    return {
      id: created.id,
      actionType: created.actionType,
      note: created.note,
      performedBy: created.performedBy,
      createdAt: created.createdAt.toISOString()
    };
  }

  async writeOff(principal: TenantAdminPrincipal, loanId: string) {
    this.assertCollectionsRole(principal.role);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const loan = await tx.tenantLoanApplication.findFirst({
        where: { id: loanId, tenantId: principal.tenantId }
      });
      if (!loan) {
        throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Loan not found.', details: { loanId } });
      }
      const writeOffEligibleStatuses: TenantLoanApplicationStatus[] = [
        TenantLoanApplicationStatus.DISBURSED,
        TenantLoanApplicationStatus.OVERDUE,
        TenantLoanApplicationStatus.DEFAULTED
      ];
      if (!writeOffEligibleStatuses.includes(loan.status)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan is not in a writable status for write-off.',
          details: { status: loan.status }
        });
      }

      assertValidTransition(loan.status, TenantLoanApplicationStatus.WRITTEN_OFF);
      assertRoleCanTransition({
        role: principal.role,
        from: loan.status,
        to: TenantLoanApplicationStatus.WRITTEN_OFF
      });

      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          status: TenantLoanApplicationStatus.WRITTEN_OFF,
          writtenOffAt: now
        }
      });

      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loan.id,
          fromStatus: loan.status,
          toStatus: TenantLoanApplicationStatus.WRITTEN_OFF,
          note: 'Loan written off by collections.',
          changedByUserId: principal.adminId
        }
      });
    });

    return { ok: true };
  }

  async settle(principal: TenantAdminPrincipal, loanId: string) {
    this.assertCollectionsRole(principal.role);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const loan = await tx.tenantLoanApplication.findFirst({
        where: { id: loanId, tenantId: principal.tenantId }
      });
      if (!loan) {
        throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Loan not found.', details: { loanId } });
      }

      assertValidTransition(loan.status, TenantLoanApplicationStatus.SETTLED);
      assertRoleCanTransition({
        role: principal.role,
        from: loan.status,
        to: TenantLoanApplicationStatus.SETTLED
      });

      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: {
          status: TenantLoanApplicationStatus.SETTLED,
          settledAt: now,
          outstandingPrincipal: 0,
          outstandingInterest: 0,
          outstandingFees: 0,
          outstandingTotal: 0,
          daysPastDue: 0,
          delinquencyBucket: 'CURRENT',
          delinquencyStatus: 'CURRENT',
          overdueAmountCents: 0n
        }
      });

      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: principal.tenantId,
          loanApplicationId: loan.id,
          fromStatus: loan.status,
          toStatus: TenantLoanApplicationStatus.SETTLED,
          note: 'Loan settled by collections.',
          changedByUserId: principal.adminId
        }
      });

      await this.delinquencyService.updateLoanDelinquency(loan.id, principal.tenantId, now, tx);
    });
    return { ok: true };
  }
}
