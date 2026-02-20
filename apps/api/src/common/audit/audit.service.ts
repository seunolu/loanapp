import { Inject, Injectable, InternalServerErrorException, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { PromMetricsService } from '../observability/prom-metrics.service';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../request-context/request-context.service';
import type { RequestWithId } from '../types/request-with-id';
import { computeAuditHash, computeDiff, redactSensitive } from './audit-hash.util';

type AuditActorTypeValue = 'ADMIN' | 'BORROWER' | 'SYSTEM' | 'TENANT_ADMIN';
type AuditSeverityValue = 'INFO' | 'WARNING' | 'CRITICAL';

export type LogEventInput = {
  tenantId: string;
  actorType: AuditActorTypeValue;
  actorId?: string | null;
  actorRole?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  severity?: AuditSeverityValue;
  metadata?: unknown;
  before?: unknown;
  after?: unknown;
  diff?: unknown;
  tx?: Prisma.TransactionClient;
};

export type AuditEventInput = {
  requestId?: string | null;
  actorType: 'ADMIN' | 'BORROWER' | 'SYSTEM' | 'TENANT_ADMIN';
  actorId?: string | null;
  actorRole?: string | null;
  tenantId?: string | null;
  lenderId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  idempotencyKey?: string | null;
  tx?: Prisma.TransactionClient;
};

type WriteAuditInput = {
  event: string;
  action?: string;
  tenantId?: string | null;
  lenderId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  entity?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
  status?: 'SUCCESS' | 'FAIL';
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  error?: unknown;
  tx?: Prisma.TransactionClient;
};

type LogAuditInput = {
  tenantId?: string | null;
  actorType: 'TENANT_ADMIN' | 'BORROWER' | 'SYSTEM' | 'ADMIN';
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: unknown;
  status?: 'SUCCESS' | 'FAIL';
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  error?: unknown;
  severity?: AuditSeverityValue;
  tx?: Prisma.TransactionClient;
};

function dayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${date.getUTCDate()}`.padStart(2, '0');
  return `${y}${m}${d}`;
}

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
    private readonly promMetrics: PromMetricsService,
    @Inject(REQUEST) private readonly request: RequestWithId
  ) {}

  async logEvent(input: LogEventInput): Promise<void> {
    const started = Date.now();
    const context = this.requestContextService.get();
    const tenantId = input.tenantId?.trim() || context.tenantId || 'GLOBAL';
    const now = new Date();
    const chainId = `tenant:${tenantId}:${dayKey(now)}`;
    const severity = input.severity ?? 'INFO';
    const sanitizedBefore = redactSensitive(input.before);
    const sanitizedAfter = redactSensitive(input.after);
    const sanitizedDiff = redactSensitive(input.diff ?? computeDiff(sanitizedBefore, sanitizedAfter));
    const sanitizedMetadata = redactSensitive(input.metadata);

    const requestId = input.requestId ?? context.requestId ?? this.request.requestId ?? null;
    const ip = input.ip ?? context.ip ?? this.request.ip ?? null;
    const userAgent = input.userAgent ?? context.userAgent ?? this.request.header('user-agent') ?? null;

    const actorType = input.actorType;
    const actorId = input.actorId ?? context.actorId ?? null;
    const actorRole = input.actorRole ?? context.actorRole ?? null;

    const action = input.action;
    const resourceType = input.resourceType;
    const resourceId = input.resourceId ?? null;

    const db = input.tx ?? this.prisma;
    const run = async (tx: Prisma.TransactionClient): Promise<void> => {
      const current = await (tx as any).auditChainState.upsert({
        where: { tenantId },
        create: {
          tenantId,
          chainId,
          lastHash: null,
          lastSequence: 0,
          rotatedAt: now
        },
        update: {}
      });

      const rotated = current.chainId !== chainId;
      const nextSequence = rotated ? 1 : Number(current.lastSequence ?? 0) + 1;
      const prevHash = rotated ? null : (current.lastHash ?? null);
      const hash = computeAuditHash({
        tenantId,
        actorType,
        actorId,
        actorRole,
        requestId,
        ip,
        userAgent,
        action,
        resourceType,
        resourceId,
        severity,
        metadata: sanitizedMetadata,
        before: sanitizedBefore,
        after: sanitizedAfter,
        diff: sanitizedDiff,
        prevHash,
        sequence: nextSequence,
        signatureVersion: 1
      });

      await (tx as any).auditEvent.create({
        data: {
          tenantId: tenantId === 'GLOBAL' ? null : tenantId,
          actorType,
          actorId,
          actorRole,
          requestId,
          ipAddress: ip,
          userAgent,
          action,
          resourceType,
          resourceId,
          entityType: resourceType,
          entityId: resourceId ?? 'N/A',
          severity,
          metadataJson: sanitizedMetadata == null ? Prisma.JsonNull : (sanitizedMetadata as Prisma.InputJsonValue),
          beforeJson: sanitizedBefore == null ? Prisma.JsonNull : (sanitizedBefore as Prisma.InputJsonValue),
          afterJson: sanitizedAfter == null ? Prisma.JsonNull : (sanitizedAfter as Prisma.InputJsonValue),
          diffJson: sanitizedDiff == null ? Prisma.JsonNull : (sanitizedDiff as Prisma.InputJsonValue),
          chainId,
          sequence: nextSequence,
          prevHash,
          hash,
          signatureVersion: 1
        }
      });

      await (tx as any).auditChainState.update({
        where: { tenantId },
        data: {
          chainId,
          lastHash: hash,
          lastSequence: nextSequence,
          ...(rotated ? { rotatedAt: now } : {})
        }
      });

      if (rotated) {
        this.promMetrics.incrementAuditChainRotation(tenantId);
      }
    };

    try {
      if (input.tx) {
        await run(input.tx);
      } else {
        await this.prisma.$transaction(async (tx) => {
          await run(tx as Prisma.TransactionClient);
        });
      }
      this.promMetrics.incrementAuditEvent(tenantId, action, severity);
      this.promMetrics.observeAuditWriteDuration(Date.now() - started);
    } catch (error) {
      this.promMetrics.incrementAuditFailure(tenantId, action);
      const message = error instanceof Error ? error.message : 'Unknown audit event write error';
      this.logger.error(`audit logEvent failed action=${action} severity=${severity} requestId=${requestId ?? 'unknown'} message=${message}`);
      if (severity === 'CRITICAL') {
        throw new InternalServerErrorException({
          code: 'AUDIT_CRITICAL_WRITE_FAILED',
          message: 'Critical audit write failed.',
          details: null
        });
      }
    }
  }

  async recordEvent(input: AuditEventInput): Promise<void> {
    const actorType: AuditActorTypeValue = input.actorType === 'TENANT_ADMIN' ? 'ADMIN' : input.actorType;
    await this.logEvent({
      tenantId: input.tenantId ?? this.requestContextService.get().tenantId ?? 'GLOBAL',
      actorType,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      requestId: input.requestId ?? null,
      action: input.action,
      resourceType: input.entityType,
      resourceId: input.entityId,
      metadata: input.metadata,
      before: input.before,
      after: input.after,
      severity: 'INFO',
      tx: input.tx
    });
  }

  async log(input: LogAuditInput): Promise<void> {
    await this.write({
      event: input.action,
      action: input.action,
      tenantId: input.tenantId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      entity: input.entity,
      entityType: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      status: input.status ?? 'SUCCESS',
      summary: input.summary ?? null,
      before: input.before,
      after: input.after,
      error: input.error,
      tx: input.tx
    });

    if (input.entityId) {
      const actorType: AuditActorTypeValue = input.actorType === 'TENANT_ADMIN' ? 'ADMIN' : input.actorType;
      await this.logEvent({
        tenantId: input.tenantId ?? this.requestContextService.get().tenantId ?? 'GLOBAL',
        actorType,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        resourceType: input.entity,
        resourceId: input.entityId,
        metadata: input.metadata,
        before: input.before,
        after: input.after,
      severity: input.severity ?? 'INFO',
        tx: input.tx
      });
    }
  }

  async logAction(input: LogAuditInput): Promise<void> {
    await this.log(input);
  }

  async write(input: WriteAuditInput): Promise<void> {
    const context = this.requestContextService.get();
    const user = this.request.user as { lenderId?: string; tenantId?: string } | undefined;
    const headerLenderId = this.request.header('x-lender-id');
    const resolvedTenantId = input.tenantId ?? user?.tenantId ?? null;
    const resolvedLenderId =
      input.lenderId ??
      user?.lenderId ??
      (typeof headerLenderId === 'string' && headerLenderId.trim().length > 0 ? headerLenderId.trim() : null);
    const metadata = redactSensitive(input.metadata);
    const before = redactSensitive(input.before);
    const after = redactSensitive(input.after);
    const errorValue = redactSensitive(input.error);

    const db = input.tx ?? this.prisma;
    try {
      await db.auditLog.create({
        data: {
          event: input.event,
          action: input.action ?? input.event,
          tenantId: resolvedTenantId,
          lenderId: resolvedLenderId,
          requestId: input.requestId ?? context.requestId,
          ip: input.ip ?? context.ip,
          userAgent: input.userAgent ?? context.userAgent,
          actorType: input.actorType ?? context.actorType ?? null,
          actorId: input.actorId ?? context.actorId ?? null,
          actorRole: input.actorRole ?? context.actorRole ?? null,
          entity: input.entity ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          status: input.status ?? 'SUCCESS',
          summary: input.summary ?? null,
          before: before == null ? Prisma.JsonNull : (before as Prisma.InputJsonValue),
          after: after == null ? Prisma.JsonNull : (after as Prisma.InputJsonValue),
          error: errorValue == null ? Prisma.JsonNull : (errorValue as Prisma.InputJsonValue),
          metadata: metadata == null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue)
        } as any
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown audit log write error';
      this.logger.error(`audit write failed requestId=${input.requestId ?? context.requestId ?? 'unknown'} event=${input.event} message=${message}`);
    }
  }

  async logTransition(input: {
    tenantId?: string | null;
    actorType?: 'TENANT_ADMIN' | 'BORROWER' | 'SYSTEM' | 'ADMIN';
    actorId?: string | null;
    actorRole?: string | null;
    entityType: string;
    entityId?: string | null;
    from: string | null;
    to: string;
    metadata?: unknown;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    await this.log({
      action: `${input.entityType.toUpperCase()}.TRANSITION`,
      tenantId: input.tenantId ?? null,
      actorType: input.actorType ?? 'SYSTEM',
      actorId: input.actorId ?? null,
      actorRole: input.actorRole ?? null,
      entity: input.entityType,
      entityId: input.entityId ?? null,
      before: { status: input.from },
      after: { status: input.to },
      metadata: input.metadata,
      severity: 'INFO',
      tx: input.tx
    });
  }
}
