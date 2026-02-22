import { createHash } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  ReconciliationEntityType,
  ReconciliationIssueCategory,
  ReconciliationIssueSeverity,
  ReconciliationIssueStatus,
  ReconciliationRunStatus,
  ReconciliationRunType,
  TenantDisbursementStatus,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { parsePagination } from '../../common/http/pagination';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';
import type { CreateReconciliationRunDto } from './dto/create-reconciliation-run.dto';
import type { ListReconciliationIssuesQueryDto } from './dto/list-reconciliation-issues-query.dto';
import type { ListReconciliationRunsQueryDto } from './dto/list-reconciliation-runs-query.dto';
import type { UpdateReconciliationIssueDto } from './dto/update-reconciliation-issue.dto';
import type { CreateSettlementBatchDto } from './dto/create-settlement-batch.dto';
import type { ListSettlementBatchesQueryDto } from './dto/list-settlement-batches-query.dto';
import type { ListReconciliationRecordsQueryDto } from './dto/list-reconciliation-records-query.dto';
import type { ResolveReconciliationRecordDto } from './dto/resolve-reconciliation-record.dto';
import type { RunReconciliationJobDto } from './dto/run-reconciliation-job.dto';

const ReconciliationStatus = {
  MATCHED: 'MATCHED',
  MISMATCH: 'MISMATCH',
  SUSPENSE: 'SUSPENSE',
  RESOLVED: 'RESOLVED',
  WRITE_OFF: 'WRITE_OFF'
} as const;
type ReconciliationStatus = (typeof ReconciliationStatus)[keyof typeof ReconciliationStatus];

const ReconciliationResolutionType = {
  MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT',
  WRITE_OFF: 'WRITE_OFF',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DUPLICATE: 'DUPLICATE',
  REFUND: 'REFUND'
} as const;
type ReconciliationResolutionType = (typeof ReconciliationResolutionType)[keyof typeof ReconciliationResolutionType];

const SettlementBatchStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
} as const;
type SettlementBatchStatus = (typeof SettlementBatchStatus)[keyof typeof SettlementBatchStatus];

const ReconciliationJobRunStatus = {
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
} as const;
type ReconciliationJobRunStatus = (typeof ReconciliationJobRunStatus)[keyof typeof ReconciliationJobRunStatus];

type DateWindow = {
  from: Date;
  to: Date;
};

type IssueInput = {
  runId: string;
  tenantId: string;
  category: ReconciliationIssueCategory;
  severity: ReconciliationIssueSeverity;
  entityType: ReconciliationEntityType;
  entityId: string;
  providerRef?: string | null;
  expected?: Prisma.InputJsonValue;
  actual?: Prisma.InputJsonValue;
};

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashExpected(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toMinor(value: Prisma.Decimal | number | string): number {
  const decimal = new Prisma.Decimal(value);
  return Number(decimal.mul(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toString());
}

export function classifyAmountMismatchSeverity(expectedMinor: number, actualMinor: number): ReconciliationIssueSeverity {
  const delta = Math.abs(expectedMinor - actualMinor);
  if (delta <= 1) {
    return ReconciliationIssueSeverity.LOW;
  }
  return ReconciliationIssueSeverity.HIGH;
}

export function canUpdateIssueStatus(
  role: TenantAdminPrincipal['role'],
  status: UpdateReconciliationIssueDto['status']
): boolean {
  if (status === 'ESCALATED') return true;
  if (status === 'ACKNOWLEDGED') {
    return role === 'CREDIT_OFFICER' || role === 'OPS' || role === 'SUPER_ADMIN';
  }
  return role === 'OPS' || role === 'SUPER_ADMIN';
}

export function canTransitionReconciliationStatus(from: ReconciliationStatus, to: ReconciliationStatus): boolean {
  if (from === ReconciliationStatus.MISMATCH && (to === ReconciliationStatus.RESOLVED || to === ReconciliationStatus.WRITE_OFF)) {
    return true;
  }
  if (from === ReconciliationStatus.SUSPENSE && (to === ReconciliationStatus.RESOLVED || to === ReconciliationStatus.WRITE_OFF)) {
    return true;
  }
  return false;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly tenantLedgerService: TenantLedgerService
  ) {}

  private normalizeDateOnly(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  private assertCanWriteOff(role: TenantAdminPrincipal['role']): void {
    if (role === 'SUPER_ADMIN') return;
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Role ${role} cannot WRITE_OFF reconciliation records.`,
      details: null
    });
  }

  private assertCanCloseBatch(role: TenantAdminPrincipal['role']): void {
    if (role === 'SUPER_ADMIN') return;
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Role ${role} cannot close settlement batches.`,
      details: null
    });
  }

  async run(principal: TenantAdminPrincipal, input: CreateReconciliationRunDto) {
    const window = this.resolveWindow(input);
    const run = await this.prisma.reconciliationRun.create({
      data: {
        tenantId: principal.tenantId,
        type: input.type as ReconciliationRunType,
        status: ReconciliationRunStatus.RUNNING,
        triggeredByAdminId: principal.adminId,
        metadata: {
          from: window.from.toISOString(),
          to: window.to.toISOString(),
          options: input
        }
      }
    });

    try {
      const summary =
        input.type === 'PAYMENT'
          ? await this.runPaymentReconciliation(principal.tenantId, run.id, window)
          : input.type === 'DISBURSEMENT'
            ? await this.runDisbursementReconciliation(principal.tenantId, run.id, window)
            : await this.runSettlementSummary(principal.tenantId, run.id, window);

      await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: ReconciliationRunStatus.COMPLETED,
          finishedAt: new Date(),
          metadata: {
            ...(run.metadata as Record<string, unknown>),
            ...summary
          }
        }
      });

      this.logger.log(
        `reconciliation completed tenant=${principal.tenantId} run=${run.id} type=${input.type} scanned=${summary.scanned} created=${summary.issuesCreated}`
      );
      return {
        runId: run.id,
        ...summary
      };
    } catch (error) {
      await this.prisma.reconciliationRun.update({
        where: { id: run.id },
        data: {
          status: ReconciliationRunStatus.FAILED,
          finishedAt: new Date(),
          metadata: {
            ...(run.metadata as Record<string, unknown>),
            error: error instanceof Error ? error.message : 'unknown'
          }
        }
      });
      throw error;
    }
  }

  async listRuns(principal: TenantAdminPrincipal, query: ListReconciliationRunsQueryDto) {
    const pagination = parsePagination(query);
    return this.prisma.reconciliationRun.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(query.type ? { type: query.type as ReconciliationRunType } : {}),
        ...(query.status ? { status: query.status as ReconciliationRunStatus } : {})
      },
      orderBy: { startedAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });
  }

  async getRun(principal: TenantAdminPrincipal, runId: string) {
    return this.prisma.reconciliationRun.findFirstOrThrow({
      where: { id: runId, tenantId: principal.tenantId },
      include: {
        issues: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async listIssues(principal: TenantAdminPrincipal, query: ListReconciliationIssuesQueryDto) {
    const pagination = parsePagination(query);
    return this.prisma.reconciliationIssue.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(query.status ? { status: query.status as ReconciliationIssueStatus } : {}),
        ...(query.severity ? { severity: query.severity as ReconciliationIssueSeverity } : {}),
        ...(query.category ? { category: query.category as ReconciliationIssueCategory } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });
  }

  async updateIssue(principal: TenantAdminPrincipal, issueId: string, input: UpdateReconciliationIssueDto) {
    if (!canUpdateIssueStatus(principal.role, input.status)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role ${principal.role} cannot set issue status to ${input.status}.`,
        details: null
      });
    }

    const updateData: Prisma.ReconciliationIssueUpdateInput = {
      status: input.status as ReconciliationIssueStatus,
      resolutionNote: input.note?.trim() || null
    };
    if (input.status === 'ACKNOWLEDGED') {
      updateData.acknowledgedByAdminId = principal.adminId;
    }
    if (input.status === 'RESOLVED') {
      updateData.resolvedByAdminId = principal.adminId;
    }

    const existing = await this.prisma.reconciliationIssue.findFirst({
      where: { id: issueId, tenantId: principal.tenantId },
      select: { id: true }
    });
    if (!existing) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Issue not found for tenant.',
        details: null
      });
    }

    const issue = await this.prisma.reconciliationIssue.update({
      where: { id: existing.id },
      data: updateData
    });

    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'RECONCILIATION_ISSUE_UPDATED',
      entity: 'RECONCILIATION_ISSUE',
      entityId: issue.id,
      metadata: {
        status: input.status,
        note: input.note ?? null
      }
    });

    return issue;
  }

  async createSettlementBatch(principal: TenantAdminPrincipal, input: CreateSettlementBatchDto) {
    const prisma = this.prisma as any;
    const settlementDate = this.normalizeDateOnly(new Date(input.settlementDate));
    return prisma.settlementBatch.upsert({
      where: {
        tenantId_provider_settlementDate: {
          tenantId: principal.tenantId,
          provider: input.provider.trim().toUpperCase(),
          settlementDate
        }
      },
      update: {
        currency: input.currency.toUpperCase()
      },
      create: {
        tenantId: principal.tenantId,
        provider: input.provider.trim().toUpperCase(),
        settlementDate,
        currency: input.currency.toUpperCase(),
        status: SettlementBatchStatus.OPEN
      }
    });
  }

  async closeSettlementBatch(principal: TenantAdminPrincipal, id: string) {
    const prisma = this.prisma as any;
    this.assertCanCloseBatch(principal.role);
    const existing = await prisma.settlementBatch.findFirst({
      where: { id, tenantId: principal.tenantId }
    });
    if (!existing) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Settlement batch not found for tenant.',
        details: null
      });
    }
    if (existing.status === SettlementBatchStatus.CLOSED) {
      return existing;
    }
    const closed = await prisma.settlementBatch.update({
      where: { id: existing.id },
      data: {
        status: SettlementBatchStatus.CLOSED,
        closedAt: new Date(),
        closedByAdminId: principal.adminId
      }
    });
    void this.auditService.log({
      tenantId: principal.tenantId,
      actorType: 'ADMIN',
      actorId: principal.adminId,
      action: 'SETTLEMENT_BATCH_CLOSED',
      entity: 'SETTLEMENT_BATCH',
      entityId: closed.id
    });
    return closed;
  }

  async listSettlementBatches(principal: TenantAdminPrincipal, query: ListSettlementBatchesQueryDto) {
    const prisma = this.prisma as any;
    const pagination = parsePagination(query);
    return prisma.settlementBatch.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(query.status ? { status: query.status } : {})
      },
      orderBy: { settlementDate: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });
  }

  async getSettlementBatch(principal: TenantAdminPrincipal, id: string) {
    const prisma = this.prisma as any;
    const batch = await prisma.settlementBatch.findFirstOrThrow({
      where: { id, tenantId: principal.tenantId },
      include: { records: true }
    });
    const summary = batch.records.reduce(
      (acc: { matched: number; mismatch: number; suspense: number; resolved: number; writeOff: number }, row: { status: ReconciliationStatus }) => {
        if (row.status === ReconciliationStatus.MATCHED) acc.matched += 1;
        if (row.status === ReconciliationStatus.MISMATCH) acc.mismatch += 1;
        if (row.status === ReconciliationStatus.SUSPENSE) acc.suspense += 1;
        if (row.status === ReconciliationStatus.RESOLVED) acc.resolved += 1;
        if (row.status === ReconciliationStatus.WRITE_OFF) acc.writeOff += 1;
        return acc;
      },
      { matched: 0, mismatch: 0, suspense: 0, resolved: 0, writeOff: 0 }
    );
    return { ...batch, summary };
  }

  async listRecords(principal: TenantAdminPrincipal, query: ListReconciliationRecordsQueryDto) {
    const prisma = this.prisma as any;
    const pagination = parsePagination(query);
    return prisma.reconciliationRecord.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.batchId ? { settlementBatchId: query.batchId } : {}),
        ...(query.provider ? { provider: query.provider.toUpperCase() } : {}),
        ...((query.dateFrom || query.dateTo)
          ? {
              createdAt: {
                ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
                ...(query.dateTo ? { lte: new Date(query.dateTo) } : {})
              }
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      include: {
        settlementBatch: {
          select: { id: true, provider: true, settlementDate: true, status: true }
        }
      },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });
  }

  async getRecord(principal: TenantAdminPrincipal, id: string) {
    const prisma = this.prisma as any;
    return prisma.reconciliationRecord.findFirstOrThrow({
      where: { id, tenantId: principal.tenantId },
      include: {
        histories: { orderBy: { createdAt: 'desc' } },
        settlementBatch: true
      }
    });
  }

  async resolveRecord(principal: TenantAdminPrincipal, id: string, input: ResolveReconciliationRecordDto) {
    const prisma = this.prisma as any;
    return prisma.$transaction(async (tx: any) => {
      const record = await tx.reconciliationRecord.findFirst({
        where: { id, tenantId: principal.tenantId },
        include: { settlementBatch: true }
      });
      if (!record) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Reconciliation record not found for tenant.',
          details: null
        });
      }
      if (record.settlementBatch?.status === SettlementBatchStatus.CLOSED) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Cannot resolve reconciliation in a CLOSED settlement batch.',
          details: { batchId: record.settlementBatch.id }
        });
      }
      if (record.status === ReconciliationStatus.RESOLVED || record.status === ReconciliationStatus.WRITE_OFF) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Record already in terminal status.',
          details: { status: record.status }
        });
      }

      const requested = input.resolutionType;
      let toStatus: ReconciliationStatus = ReconciliationStatus.RESOLVED;
      if (requested === ReconciliationResolutionType.WRITE_OFF) {
        this.assertCanWriteOff(principal.role);
        toStatus = ReconciliationStatus.WRITE_OFF;
      }

      if (!canTransitionReconciliationStatus(record.status, toStatus)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: `Invalid transition ${record.status} -> ${toStatus}.`,
          details: null
        });
      }

      if (requested === ReconciliationResolutionType.MANUAL_ADJUSTMENT && input.adjustment?.lines?.length) {
        await this.tenantLedgerService.createJournal(
          {
            tenantId: principal.tenantId,
            referenceType: 'RECONCILIATION_ADJUSTMENT',
            referenceId: record.id,
            idempotencyKey: `recon-adjust:${record.id}`,
            memo: input.note ?? 'Manual reconciliation adjustment',
            createdBy: principal.adminId,
            actorRole: principal.role as any,
            entries: input.adjustment.lines.map((line) => ({
              accountCode: line.accountCode as any,
              direction: line.direction as any,
              amount: line.amount,
              currency: record.currency
            }))
          },
          tx
        );
      }

      if (requested === ReconciliationResolutionType.WRITE_OFF) {
        await this.tenantLedgerService.postEntry(
          {
            tenantId: principal.tenantId,
            occurredAt: new Date(),
            type: TenantLedgerEntryType.WRITE_OFF,
            idempotencyKey: `recon-writeoff:${record.id}`,
            referenceType: 'ReconciliationRecord',
            referenceId: record.id,
            memo: input.note ?? 'Reconciliation write-off',
            currency: record.currency,
            createdBy: principal.adminId,
            actorRole: principal.role as any,
            lines: [
              {
                accountCode: TenantLedgerAccountCode.WRITE_OFF_EXPENSE,
                direction: TenantLedgerDirection.DEBIT,
                amount: new Prisma.Decimal(record.amountMinor.toString()).div(100)
              },
              {
                accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
                direction: TenantLedgerDirection.CREDIT,
                amount: new Prisma.Decimal(record.amountMinor.toString()).div(100)
              }
            ]
          },
          tx
        );
      }

      const updated = await tx.reconciliationRecord.update({
        where: { id: record.id },
        data: {
          status: toStatus,
          resolvedAt: new Date(),
          resolvedByAdminId: principal.adminId,
          resolutionType: requested,
          resolutionNote: input.note?.trim() || null
        }
      });
      await tx.reconciliationResolutionHistory.create({
        data: {
          reconciliationId: record.id,
          fromStatus: record.status,
          toStatus,
          resolutionType: requested,
          note: input.note?.trim() || null,
          actedByAdminId: principal.adminId
        }
      });
      void this.auditService.log({
        tenantId: principal.tenantId,
        actorType: 'ADMIN',
        actorId: principal.adminId,
        action: 'RECONCILIATION_RESOLVED',
        entity: 'RECONCILIATION_RECORD',
        entityId: record.id,
        metadata: {
          fromStatus: record.status,
          toStatus,
          resolutionType: requested,
          note: input.note ?? null
        }
      });
      return updated;
    });
  }

  private resolveWindow(input: CreateReconciliationRunDto): DateWindow {
    if (input.from && input.to) {
      return { from: new Date(input.from), to: new Date(input.to) };
    }
    const days = input.days ?? 7;
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  private resolveJobWindow(input: RunReconciliationJobDto): DateWindow {
    return {
      from: new Date(input.dateFrom),
      to: new Date(input.dateTo)
    };
  }

  private async ensureOpenBatch(
    tenantId: string,
    provider: string,
    settlementDate: Date,
    currency: string,
    tx: any
  ) {
    return tx.settlementBatch.upsert({
      where: {
        tenantId_provider_settlementDate: {
          tenantId,
          provider,
          settlementDate
        }
      },
      update: {},
      create: {
        tenantId,
        provider,
        settlementDate,
        currency,
        status: SettlementBatchStatus.OPEN
      }
    });
  }

  private async upsertRecord(
    tx: any,
    input: {
      tenantId: string;
      runId?: string;
      provider: string;
      referenceType: string;
      referenceId: string;
      providerRef?: string | null;
      amountMinor: bigint;
      currency: string;
      status: ReconciliationStatus;
      mismatchReason?: string | null;
      settlementBatchId?: string | null;
      suspenseLedgerEntryId?: string | null;
      metadata?: Prisma.InputJsonValue;
    }
  ): Promise<{ created: boolean; id: string; status: ReconciliationStatus }> {
    const existing = await tx.reconciliationRecord.findUnique({
      where: {
        tenantId_provider_referenceType_referenceId: {
          tenantId: input.tenantId,
          provider: input.provider,
          referenceType: input.referenceType,
          referenceId: input.referenceId
        }
      }
    });

    if (existing) {
      const updated = await tx.reconciliationRecord.update({
        where: { id: existing.id },
        data: {
          runId: input.runId ?? existing.runId,
          providerRef: input.providerRef ?? existing.providerRef,
          amountMinor: input.amountMinor,
          currency: input.currency,
          status: input.status,
          mismatchReason: input.mismatchReason ?? null,
          suspenseLedgerEntryId: input.suspenseLedgerEntryId ?? existing.suspenseLedgerEntryId,
          settlementBatchId: input.settlementBatchId ?? existing.settlementBatchId,
          metadata: input.metadata ?? existing.metadata
        }
      });
      if (existing.status !== updated.status) {
        await tx.reconciliationResolutionHistory.create({
          data: {
            reconciliationId: existing.id,
            fromStatus: existing.status,
            toStatus: updated.status,
            note: `Auto update: ${existing.status} -> ${updated.status}`
          }
        });
      }
      return { created: false, id: updated.id, status: updated.status };
    }

    const created = await tx.reconciliationRecord.create({
      data: {
        tenantId: input.tenantId,
        runId: input.runId ?? null,
        provider: input.provider,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        providerRef: input.providerRef ?? null,
        amountMinor: input.amountMinor,
        currency: input.currency,
        status: input.status,
        mismatchReason: input.mismatchReason ?? null,
        settlementBatchId: input.settlementBatchId ?? null,
        suspenseLedgerEntryId: input.suspenseLedgerEntryId ?? null,
        metadata: input.metadata ?? undefined
      }
    });
    return { created: true, id: created.id, status: created.status };
  }

  async runJob(principal: TenantAdminPrincipal, input: RunReconciliationJobDto) {
    const prisma = this.prisma as any;
    const provider = input.provider.trim().toUpperCase();
    const window = this.resolveJobWindow(input);
    const existingSuccess = await prisma.reconciliationJobRun.findUnique({
      where: {
        tenantId_provider_dateFrom_dateTo: {
          tenantId: principal.tenantId,
          provider,
          dateFrom: window.from,
          dateTo: window.to
        }
      }
    });
    if (existingSuccess && existingSuccess.status === ReconciliationJobRunStatus.SUCCESS) {
      return {
        id: existingSuccess.id,
        skipped: true,
        reason: 'already_successful'
      };
    }

    const run = existingSuccess
      ? await prisma.reconciliationJobRun.update({
          where: { id: existingSuccess.id },
          data: {
            status: ReconciliationJobRunStatus.RUNNING,
            startedAt: new Date(),
            finishedAt: null,
            errorMessage: null,
            attemptCount: { increment: 1 },
            matchedCount: 0,
            mismatchCount: 0,
            suspenseCount: 0,
            createdCount: 0
          }
        })
      : await prisma.reconciliationJobRun.create({
          data: {
            tenantId: principal.tenantId,
            provider,
            dateFrom: window.from,
            dateTo: window.to,
            status: ReconciliationJobRunStatus.RUNNING
          }
        });

    try {
      const summary = await prisma.$transaction(async (tx: any) => {
        let matchedCount = 0;
        let mismatchCount = 0;
        let suspenseCount = 0;
        let createdCount = 0;

        const payments = await tx.paymentIntent.findMany({
          where: {
            tenantId: principal.tenantId,
            provider: 'PAYSTACK',
            direction: 'INBOUND',
            status: 'SUCCEEDED',
            updatedAt: { gte: window.from, lte: window.to }
          }
        });

        for (const payment of payments) {
          const settlementDate = this.normalizeDateOnly(payment.updatedAt);
          const batch = await this.ensureOpenBatch(
            principal.tenantId,
            provider,
            settlementDate,
            payment.currency,
            tx
          );
          if (batch.status === SettlementBatchStatus.CLOSED) {
            continue;
          }

          const repayment = payment.providerReference
            ? await tx.loanRepayment.findFirst({
                where: {
                  tenantId: principal.tenantId,
                  reference: payment.providerReference
                }
              })
            : null;

          if (!repayment) {
            const suspenseLedger = await this.tenantLedgerService.postEntry(
              {
                tenantId: principal.tenantId,
                occurredAt: payment.updatedAt,
                type: TenantLedgerEntryType.ADJUSTMENT,
                idempotencyKey: `recon-suspense:${payment.id}`,
                referenceType: 'PaymentIntent',
                referenceId: payment.id,
                memo: 'Provider payment without internal repayment match',
                currency: payment.currency,
                createdBy: principal.adminId,
                actorRole: principal.role as any,
                lines: [
                  {
                    accountCode: TenantLedgerAccountCode.BANK_CLEARING,
                    direction: TenantLedgerDirection.DEBIT,
                    amount: new Prisma.Decimal(payment.amountMinor).div(100)
                  },
                  {
                    accountCode: TenantLedgerAccountCode.SUSPENSE,
                    direction: TenantLedgerDirection.CREDIT,
                    amount: new Prisma.Decimal(payment.amountMinor).div(100)
                  }
                ]
              },
              tx
            );
            const result = await this.upsertRecord(tx, {
              tenantId: principal.tenantId,
              provider,
              runId: undefined,
              referenceType: 'PAYMENT',
              referenceId: payment.id,
              providerRef: payment.providerReference,
              amountMinor: BigInt(payment.amountMinor),
              currency: payment.currency,
              status: ReconciliationStatus.SUSPENSE,
              mismatchReason: 'No matching repayment found',
              settlementBatchId: batch.id,
              suspenseLedgerEntryId: suspenseLedger.id
            });
            if (result.created) createdCount += 1;
            suspenseCount += 1;
            continue;
          }

          const repaymentMinor = BigInt(toMinor(repayment.amount));
          const status =
            repaymentMinor === BigInt(payment.amountMinor)
              ? ReconciliationStatus.MATCHED
              : ReconciliationStatus.MISMATCH;
          const result = await this.upsertRecord(tx, {
            tenantId: principal.tenantId,
            provider,
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            providerRef: payment.providerReference,
            amountMinor: BigInt(payment.amountMinor),
            currency: payment.currency,
            status,
            mismatchReason:
              status === ReconciliationStatus.MISMATCH
                ? `Amount mismatch payment=${payment.amountMinor} repayment=${repaymentMinor.toString()}`
                : null,
            settlementBatchId: batch.id
          });
          if (result.created) createdCount += 1;
          if (status === ReconciliationStatus.MATCHED) matchedCount += 1;
          if (status === ReconciliationStatus.MISMATCH) mismatchCount += 1;
        }

        const disbursements = await tx.tenantDisbursement.findMany({
          where: {
            tenantId: principal.tenantId,
            updatedAt: { gte: window.from, lte: window.to }
          }
        });
        for (const disbursement of disbursements) {
          const settlementDate = this.normalizeDateOnly(disbursement.updatedAt);
          const batch = await this.ensureOpenBatch(
            principal.tenantId,
            provider,
            settlementDate,
            disbursement.currency,
            tx
          );
          if (batch.status === SettlementBatchStatus.CLOSED) {
            continue;
          }
          const payout = await tx.paymentIntent.findFirst({
            where: {
              tenantId: principal.tenantId,
              provider: 'PAYSTACK',
              direction: 'OUTBOUND',
              disbursementId: disbursement.id
            },
            orderBy: { updatedAt: 'desc' }
          });
          const status =
            payout &&
            payout.status === 'SUCCEEDED' &&
            disbursement.status === TenantDisbursementStatus.SUCCESS &&
            payout.amountMinor === toMinor(disbursement.amount)
              ? ReconciliationStatus.MATCHED
              : ReconciliationStatus.MISMATCH;
          const result = await this.upsertRecord(tx, {
            tenantId: principal.tenantId,
            provider,
            referenceType: 'DISBURSEMENT',
            referenceId: disbursement.id,
            providerRef: disbursement.providerReference,
            amountMinor: BigInt(toMinor(disbursement.amount)),
            currency: disbursement.currency,
            status,
            mismatchReason:
              status === ReconciliationStatus.MISMATCH
                ? 'Disbursement/provider status or amount mismatch'
                : null,
            settlementBatchId: batch.id
          });
          if (result.created) createdCount += 1;
          if (status === ReconciliationStatus.MATCHED) matchedCount += 1;
          if (status === ReconciliationStatus.MISMATCH) mismatchCount += 1;
        }

        return { matchedCount, mismatchCount, suspenseCount, createdCount };
      });

      const updated = await prisma.reconciliationJobRun.update({
        where: { id: run.id },
        data: {
          status: ReconciliationJobRunStatus.SUCCESS,
          finishedAt: new Date(),
          matchedCount: summary.matchedCount,
          mismatchCount: summary.mismatchCount,
          suspenseCount: summary.suspenseCount,
          createdCount: summary.createdCount
        }
      });

      void this.auditService.log({
        tenantId: principal.tenantId,
        actorType: 'ADMIN',
        actorId: principal.adminId,
        action: 'RECONCILIATION_JOB_SUCCESS',
        entity: 'RECONCILIATION_JOB_RUN',
        entityId: run.id,
        metadata: {
          provider,
          dateFrom: window.from.toISOString(),
          dateTo: window.to.toISOString(),
          ...summary
        }
      });
      return updated;
    } catch (error) {
      await prisma.reconciliationJobRun.update({
        where: { id: run.id },
        data: {
          status: ReconciliationJobRunStatus.FAILED,
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'unknown_error'
        }
      });
      throw error;
    }
  }

  async listJobRuns(principal: TenantAdminPrincipal, query: { limit?: unknown; skip?: unknown; cursor?: unknown } = {}) {
    const prisma = this.prisma as any;
    const pagination = parsePagination(query);
    return prisma.reconciliationJobRun.findMany({
      where: { tenantId: principal.tenantId },
      orderBy: { startedAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });
  }

  async getJobRun(principal: TenantAdminPrincipal, id: string) {
    const prisma = this.prisma as any;
    return prisma.reconciliationJobRun.findFirstOrThrow({
      where: { id, tenantId: principal.tenantId }
    });
  }

  private async runPaymentReconciliation(tenantId: string, runId: string, window: DateWindow) {
    const payments = await this.prisma.paymentIntent.findMany({
      where: {
        tenantId,
        direction: 'INBOUND',
        status: 'SUCCEEDED',
        updatedAt: { gte: window.from, lte: window.to }
      }
    });

    let issuesCreated = 0;
    let issuesResolved = 0;
    for (const payment of payments) {
      const expectedAmountMinor = payment.amountMinor;
      const ledgerEntries = await this.prisma.tenantLedgerEntry.findMany({
        where: {
          tenantId,
          type: 'REPAYMENT',
          referenceType: 'PaymentIntent',
          referenceId: payment.id
        },
        include: { lines: true }
      });

      if (ledgerEntries.length === 0) {
        const created = await this.upsertIssue({
          runId,
          tenantId,
          category: ReconciliationIssueCategory.MISSING_LEDGER,
          severity: ReconciliationIssueSeverity.CRITICAL,
          entityType: ReconciliationEntityType.PAYMENT,
          entityId: payment.id,
          providerRef: payment.providerReference,
          expected: { ledgerEntries: 1, amountMinor: expectedAmountMinor },
          actual: { ledgerEntries: 0 }
        });
        if (created) issuesCreated += 1;
        if (payment.loanId) {
          const healed = await this.tryAutoHealMissingRepaymentLedger(tenantId, payment);
          if (healed) {
            await this.resolveIssueByFingerprint(
              {
                runId,
                tenantId,
                category: ReconciliationIssueCategory.MISSING_LEDGER,
                severity: ReconciliationIssueSeverity.CRITICAL,
                entityType: ReconciliationEntityType.PAYMENT,
                entityId: payment.id,
                providerRef: payment.providerReference,
                expected: { ledgerEntries: 1, amountMinor: expectedAmountMinor },
                actual: { ledgerEntries: 0 }
              },
              'Auto-healed'
            );
            issuesResolved += 1;
            void this.auditService.log({
              tenantId,
              actorType: 'SYSTEM',
              actorId: null,
              action: 'RECONCILIATION_AUTO_HEALED',
              entity: 'PAYMENT',
              entityId: payment.id,
              metadata: {
                reason: 'Provider success but ledger missing',
                amountMinor: payment.amountMinor
              }
            });
          }
        }
      } else if (ledgerEntries.length > 1) {
        const created = await this.upsertIssue({
          runId,
          tenantId,
          category: ReconciliationIssueCategory.DUPLICATE_LEDGER,
          severity: ReconciliationIssueSeverity.MEDIUM,
          entityType: ReconciliationEntityType.PAYMENT,
          entityId: payment.id,
          providerRef: payment.providerReference,
          expected: { ledgerEntries: 1 },
          actual: { ledgerEntries: ledgerEntries.length }
        });
        if (created) issuesCreated += 1;
      } else {
        const debitMinor = ledgerEntries[0].lines
          .filter((line) => line.direction === 'DEBIT')
          .reduce((sum, line) => sum + toMinor(line.amount), 0);
        if (debitMinor !== expectedAmountMinor) {
          const severity = classifyAmountMismatchSeverity(expectedAmountMinor, debitMinor);
          const created = await this.upsertIssue({
            runId,
            tenantId,
            category: ReconciliationIssueCategory.AMOUNT_MISMATCH,
            severity,
            entityType: ReconciliationEntityType.PAYMENT,
            entityId: payment.id,
            providerRef: payment.providerReference,
            expected: { amountMinor: expectedAmountMinor },
            actual: { ledgerDebitMinor: debitMinor }
          });
          if (created) issuesCreated += 1;
        }
      }

      const repayments = await this.prisma.loanRepayment.findMany({
        where: {
          tenantId,
          reference: payment.providerReference ?? undefined
        }
      });
      if (payment.providerReference && repayments.length === 0) {
        const created = await this.upsertIssue({
          runId,
          tenantId,
          category: ReconciliationIssueCategory.STATUS_MISMATCH,
          severity: ReconciliationIssueSeverity.MEDIUM,
          entityType: ReconciliationEntityType.PAYMENT,
          entityId: payment.id,
          providerRef: payment.providerReference,
          expected: { repaymentAllocation: 'exists' },
          actual: { repaymentAllocation: 'missing' }
        });
        if (created) issuesCreated += 1;
      } else if (repayments.length > 0) {
        const allocatedMinor = repayments.reduce((sum, repayment) => sum + toMinor(repayment.amount), 0);
        if (allocatedMinor !== expectedAmountMinor) {
          const created = await this.upsertIssue({
            runId,
            tenantId,
            category: ReconciliationIssueCategory.AMOUNT_MISMATCH,
            severity: ReconciliationIssueSeverity.MEDIUM,
            entityType: ReconciliationEntityType.PAYMENT,
            entityId: payment.id,
            providerRef: payment.providerReference,
            expected: { amountMinor: expectedAmountMinor },
            actual: { repaymentAllocatedMinor: allocatedMinor }
          });
          if (created) issuesCreated += 1;
        }
      }
    }

    const orphanLedger = await this.prisma.tenantLedgerEntry.findMany({
      where: {
        tenantId,
        type: 'REPAYMENT',
        referenceType: 'PaymentIntent',
        occurredAt: { gte: window.from, lte: window.to }
      }
    });
    for (const entry of orphanLedger) {
      const exists = await this.prisma.paymentIntent.findUnique({
        where: { id: entry.referenceId },
        select: { id: true }
      });
      if (!exists) {
        const created = await this.upsertIssue({
          runId,
          tenantId,
          category: ReconciliationIssueCategory.UNKNOWN_REFERENCE,
          severity: ReconciliationIssueSeverity.HIGH,
          entityType: ReconciliationEntityType.PAYMENT,
          entityId: entry.referenceId,
          providerRef: null,
          expected: { paymentIntent: 'exists' },
          actual: { paymentIntent: 'missing', ledgerEntryId: entry.id }
        });
        if (created) issuesCreated += 1;
      }
    }

    return {
      scanned: payments.length,
      issuesCreated,
      issuesResolved,
      totals: { payments: payments.length }
    };
  }

  private async runDisbursementReconciliation(tenantId: string, runId: string, window: DateWindow) {
    const disbursements = await this.prisma.tenantDisbursement.findMany({
      where: {
        tenantId,
        updatedAt: { gte: window.from, lte: window.to }
      }
    });

    let issuesCreated = 0;
    for (const disbursement of disbursements) {
      const ledgerEntries = await this.prisma.tenantLedgerEntry.findMany({
        where: {
          tenantId,
          idempotencyKey: disbursement.idempotencyKey
        }
      });
      if (disbursement.status === TenantDisbursementStatus.SUCCESS && ledgerEntries.length === 0) {
        const created = await this.upsertIssue({
          runId,
          tenantId,
          category: ReconciliationIssueCategory.MISSING_LEDGER,
          severity: ReconciliationIssueSeverity.CRITICAL,
          entityType: ReconciliationEntityType.DISBURSEMENT,
          entityId: disbursement.id,
          providerRef: disbursement.providerReference,
          expected: { ledgerEntries: 1 },
          actual: { ledgerEntries: 0 }
        });
        if (created) issuesCreated += 1;
      }
      if (ledgerEntries.length > 1) {
        const created = await this.upsertIssue({
          runId,
          tenantId,
          category: ReconciliationIssueCategory.DUPLICATE_LEDGER,
          severity: ReconciliationIssueSeverity.MEDIUM,
          entityType: ReconciliationEntityType.DISBURSEMENT,
          entityId: disbursement.id,
          providerRef: disbursement.providerReference,
          expected: { ledgerEntries: 1 },
          actual: { ledgerEntries: ledgerEntries.length }
        });
        if (created) issuesCreated += 1;
      }

      const payoutIntent = await this.prisma.paymentIntent.findFirst({
        where: {
          tenantId,
          direction: 'OUTBOUND',
          disbursementId: disbursement.id
        },
        orderBy: { updatedAt: 'desc' }
      });

      if (payoutIntent) {
        const providerSuccessful = payoutIntent.status === 'SUCCEEDED';
        if (disbursement.status === TenantDisbursementStatus.SUCCESS && !providerSuccessful) {
          const created = await this.upsertIssue({
            runId,
            tenantId,
            category: ReconciliationIssueCategory.STATUS_MISMATCH,
            severity: ReconciliationIssueSeverity.HIGH,
            entityType: ReconciliationEntityType.DISBURSEMENT,
            entityId: disbursement.id,
            providerRef: payoutIntent.providerReference,
            expected: { providerStatus: 'SUCCEEDED' },
            actual: { providerStatus: payoutIntent.status, internalStatus: disbursement.status }
          });
          if (created) issuesCreated += 1;
        }
        if (
          (disbursement.status === TenantDisbursementStatus.FAILED || disbursement.status === TenantDisbursementStatus.PENDING) &&
          providerSuccessful
        ) {
          const created = await this.upsertIssue({
            runId,
            tenantId,
            category: ReconciliationIssueCategory.STATUS_MISMATCH,
            severity: ReconciliationIssueSeverity.HIGH,
            entityType: ReconciliationEntityType.DISBURSEMENT,
            entityId: disbursement.id,
            providerRef: payoutIntent.providerReference,
            expected: { internalStatus: disbursement.status },
            actual: { providerStatus: payoutIntent.status }
          });
          if (created) issuesCreated += 1;
        }

        const providerAmountMinor = payoutIntent.amountMinor;
        const internalAmountMinor = toMinor(disbursement.amount);
        if (providerAmountMinor !== internalAmountMinor) {
          const severity = classifyAmountMismatchSeverity(internalAmountMinor, providerAmountMinor);
          const created = await this.upsertIssue({
            runId,
            tenantId,
            category: ReconciliationIssueCategory.AMOUNT_MISMATCH,
            severity,
            entityType: ReconciliationEntityType.DISBURSEMENT,
            entityId: disbursement.id,
            providerRef: payoutIntent.providerReference,
            expected: { amountMinor: internalAmountMinor },
            actual: { providerAmountMinor }
          });
          if (created) issuesCreated += 1;
        }
      }
    }

    return {
      scanned: disbursements.length,
      issuesCreated,
      issuesResolved: 0,
      totals: { disbursements: disbursements.length }
    };
  }

  private async runSettlementSummary(tenantId: string, runId: string, window: DateWindow) {
    const providerTxns = await this.prisma.paymentIntent.findMany({
      where: {
        tenantId,
        direction: 'INBOUND',
        status: 'SUCCEEDED',
        updatedAt: { gte: window.from, lte: window.to }
      }
    });
    const providerGrossMinor = providerTxns.reduce((sum, item) => sum + item.amountMinor, 0);
    const providerFeeMinor = providerTxns.reduce((sum, item) => sum + (item.feeMinor ?? 0), 0);
    const providerNetMinor = providerGrossMinor - providerFeeMinor;

    const ledgerEntries = await this.prisma.tenantLedgerEntry.findMany({
      where: {
        tenantId,
        type: 'REPAYMENT',
        referenceType: 'PaymentIntent',
        occurredAt: { gte: window.from, lte: window.to }
      },
      include: { lines: true }
    });
    const internalGrossMinor = ledgerEntries.reduce((sum, entry) => {
      const debitMinor = entry.lines
        .filter((line) => line.direction === 'DEBIT')
        .reduce((inner, line) => inner + toMinor(line.amount), 0);
      return sum + debitMinor;
    }, 0);

    const diff = Math.abs(providerGrossMinor - internalGrossMinor);
    const diffRatio = providerGrossMinor > 0 ? (diff / providerGrossMinor) * 100 : 0;
    let issuesCreated = 0;
    if (diff > 1000 || diffRatio > 0.5) {
      const created = await this.upsertIssue({
        runId,
        tenantId,
        category: ReconciliationIssueCategory.FEE_MISMATCH,
        severity: ReconciliationIssueSeverity.HIGH,
        entityType: ReconciliationEntityType.PAYMENT,
        entityId: `SETTLEMENT:${window.from.toISOString()}:${window.to.toISOString()}`,
        providerRef: null,
        expected: {
          providerGrossMinor,
          providerFeeMinor,
          providerNetMinor,
          providerCount: providerTxns.length
        },
        actual: {
          internalGrossMinor,
          internalCount: ledgerEntries.length,
          differenceMinor: diff,
          differencePercent: diffRatio
        }
      });
      if (created) issuesCreated += 1;
    }

    return {
      scanned: providerTxns.length,
      issuesCreated,
      issuesResolved: 0,
      totals: {
        grossMinor: providerGrossMinor,
        feeMinor: providerFeeMinor,
        netMinor: providerNetMinor,
        count: providerTxns.length,
        internalGrossMinor
      }
    };
  }

  async upsertIssue(input: IssueInput): Promise<boolean> {
    const providerRef = input.providerRef?.trim() || '';
    const expected = (input.expected ?? {});
    const expectedHash = hashExpected(input.expected ?? {});
    const existing = await this.prisma.reconciliationIssue.findUnique({
      where: {
        tenantId_category_entityType_entityId_providerRef_expectedHash: {
          tenantId: input.tenantId,
          category: input.category,
          entityType: input.entityType,
          entityId: input.entityId,
          providerRef,
          expectedHash
        }
      }
    });

    if (existing) {
      await this.prisma.reconciliationIssue.update({
        where: { id: existing.id },
        data: {
          runId: input.runId,
          severity: input.severity,
          status: ReconciliationIssueStatus.OPEN,
          expected,
          actual: (input.actual ?? {}),
          providerRef
        }
      });
      return false;
    }

    await this.prisma.reconciliationIssue.create({
      data: {
        runId: input.runId,
        tenantId: input.tenantId,
        category: input.category,
        severity: input.severity,
        entityType: input.entityType,
        entityId: input.entityId,
        providerRef,
        expected,
        actual: (input.actual ?? {}),
        expectedHash,
        status: ReconciliationIssueStatus.OPEN
      }
    });
    return true;
  }

  private async resolveIssueByFingerprint(input: IssueInput, resolutionNote: string): Promise<void> {
    const providerRef = input.providerRef?.trim() || '';
    const expectedHash = hashExpected(input.expected ?? {});
    await this.prisma.reconciliationIssue.updateMany({
      where: {
        tenantId: input.tenantId,
        category: input.category,
        entityType: input.entityType,
        entityId: input.entityId,
        providerRef,
        expectedHash
      },
      data: {
        status: ReconciliationIssueStatus.RESOLVED,
        resolutionNote
      }
    });
  }

  private async tryAutoHealMissingRepaymentLedger(
    tenantId: string,
    payment: { id: string; loanId: string | null; amountMinor: number; currency: string; providerReference: string | null }
  ): Promise<boolean> {
    if (!payment.loanId) {
      return false;
    }
    try {
      await this.tenantLedgerService.postEntry({
        tenantId,
        occurredAt: new Date(),
        type: TenantLedgerEntryType.REPAYMENT,
        idempotencyKey: `recon:autoheal:repayment:${payment.id}`,
        referenceType: 'PaymentIntent',
        referenceId: payment.id,
        currency: payment.currency,
        memo: `Auto-healed repayment ledger for ${payment.providerReference ?? payment.id}`,
        lines: [
          {
            accountCode: TenantLedgerAccountCode.BANK_CLEARING,
            direction: TenantLedgerDirection.DEBIT,
            amount: new Prisma.Decimal(payment.amountMinor).div(100).toDecimalPlaces(2)
          },
          {
            accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
            direction: TenantLedgerDirection.CREDIT,
            amount: new Prisma.Decimal(payment.amountMinor).div(100).toDecimalPlaces(2)
          }
        ]
      });
      return true;
    } catch {
      return false;
    }
  }
}
