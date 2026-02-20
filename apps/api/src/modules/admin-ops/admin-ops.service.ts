import { ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';
import { JobStatus, type Job } from '@prisma/client';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

export type OpsJobStatus = 'waiting' | 'active' | 'completed' | 'failed';

type ListOpsJobsInput = {
  queue?: string;
  status?: OpsJobStatus;
  limit?: number;
  search?: string;
};

type RetryThrottle = {
  atMs: number;
};

const RETRY_WINDOW_MS = 60_000;
const retryThrottleMap = new Map<string, RetryThrottle>();

export function canManageOps(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'SYSTEM';
}

@Injectable({ scope: Scope.REQUEST })
export class AdminOpsService {
  private readonly logger = new Logger(AdminOpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly requestContextService: RequestContextService
  ) {}

  async listJobs(principal: TenantAdminPrincipal, input: ListOpsJobsInput) {
    this.assertRole(principal.role);

    const where = this.buildWhere(principal.tenantId, input.status, input.search);
    const take = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const rows = await this.prisma.job.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take
    });

    this.logOps('listJobs', principal, input.queue ?? 'main');
    await this.auditService.log({
      action: 'JOB_LIST_VIEWED',
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      entity: 'JOB',
      metadata: {
        queue: input.queue ?? 'main',
        status: input.status ?? null,
        limit: take
      }
    });

    return {
      items: rows.map((row) => this.toItem(row)),
      nextCursor: null
    };
  }

  async getJobById(principal: TenantAdminPrincipal, id: string, queue = 'main') {
    this.assertRole(principal.role);

    const row = await this.prisma.job.findFirst({
      where: { id, tenantId: principal.tenantId }
    });
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
        details: null
      });
    }

    this.logOps('getJobById', principal, queue, id);

    return this.toDetail(row, queue);
  }

  async retryJob(principal: TenantAdminPrincipal, id: string, queue = 'main') {
    this.assertRole(principal.role);
    this.assertRetryThrottle(id);

    const job = await this.prisma.job.findFirst({
      where: { id, tenantId: principal.tenantId }
    });
    if (!job) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
        details: null
      });
    }

    if (job.status !== JobStatus.FAILED && job.status !== JobStatus.DEAD_LETTER) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only failed jobs can be retried.',
        details: { status: job.status }
      });
    }

    const updated = await this.prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.PENDING,
        attempts: 0,
        runAt: new Date(),
        lastError: null,
        failedAt: null,
        lockedAt: null,
        lockedBy: null
      }
    });

    const requestId = this.requestContextService.get().requestId;
    await this.auditService.log({
      action: 'JOB_RETRY_REQUESTED',
      tenantId: principal.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: principal.adminId,
      actorRole: principal.role,
      entity: 'JOB',
      entityId: job.id,
      metadata: {
        jobId: job.id,
        jobName: job.type,
        queue,
        tenantId: principal.tenantId,
        requestId,
        actorId: principal.adminId,
        actorRole: principal.role
      }
    });

    this.logOps('retryJob', principal, queue, id);

    return this.toItem(updated);
  }

  async dlqSummary(principal: TenantAdminPrincipal, queue = 'main', limit = 50) {
    this.assertRole(principal.role);

    const take = Math.min(Math.max(limit, 1), 100);
    const failedRows = await this.prisma.job.findMany({
      where: {
        tenantId: principal.tenantId,
        status: { in: [JobStatus.FAILED, JobStatus.DEAD_LETTER] }
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take
    });

    const grouped = await this.prisma.job.groupBy({
      by: ['type'],
      where: {
        tenantId: principal.tenantId,
        status: { in: [JobStatus.FAILED, JobStatus.DEAD_LETTER] }
      },
      _count: { _all: true }
    });

    this.logOps('dlqSummary', principal, queue);

    return {
      items: failedRows.map((row) => this.toItem(row)),
      groups: grouped.map((item) => ({
        name: item.type,
        count: item._count._all
      }))
    };
  }

  private assertRole(role: string): void {
    if (!canManageOps(role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not authorized for operations control.',
        details: null
      });
    }
  }

  private assertRetryThrottle(jobId: string): void {
    const now = Date.now();
    const previous = retryThrottleMap.get(jobId);
    if (previous && now - previous.atMs < RETRY_WINDOW_MS) {
      throw new HttpException(
        {
          code: 'TOO_MANY_REQUESTS',
          message: 'Retry is rate-limited. Try again in a minute.',
          details: { jobId }
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    retryThrottleMap.set(jobId, { atMs: now });
  }

  private buildWhere(tenantId: string, status?: OpsJobStatus, search?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status === 'waiting') where.status = JobStatus.PENDING;
    if (status === 'active') where.status = JobStatus.PROCESSING;
    if (status === 'completed') where.status = JobStatus.SUCCEEDED;
    if (status === 'failed') where.status = { in: [JobStatus.FAILED, JobStatus.DEAD_LETTER] };
    if (search?.trim()) {
      where.id = { contains: search.trim(), mode: 'insensitive' };
    }
    return where;
  }

  private toItem(row: Job) {
    const payload = this.asPayload(row.payload);
    return {
      id: row.id,
      name: row.type,
      status: this.toOpsStatus(row.status),
      attemptsMade: row.attempts,
      attemptsMax: row.maxAttempts,
      timestamp: row.runAt.toISOString(),
      finishedOn: row.succeededAt?.toISOString() ?? row.failedAt?.toISOString() ?? null,
      failedReason: row.lastError ?? null,
      requestId: this.readString(payload, 'requestId'),
      tenantId: row.tenantId
    };
  }

  private toDetail(row: Job, queue: string) {
    const payload = this.asPayload(row.payload);
    return {
      id: row.id,
      name: row.type,
      queue,
      data: payload,
      opts: {
        runAt: row.runAt.toISOString(),
        maxAttempts: row.maxAttempts,
        backoffMs: row.backoffMs
      },
      status: this.toOpsStatus(row.status),
      logsMeta: {
        requestId: this.readString(payload, 'requestId'),
        tenantId: row.tenantId,
        lockedBy: row.lockedBy,
        lockedAt: row.lockedAt?.toISOString() ?? null
      },
      stacktrace: row.lastError ? [row.lastError] : [],
      timestamps: {
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        runAt: row.runAt.toISOString(),
        succeededAt: row.succeededAt?.toISOString() ?? null,
        failedAt: row.failedAt?.toISOString() ?? null
      }
    };
  }

  private toOpsStatus(status: JobStatus): OpsJobStatus {
    if (status === JobStatus.PENDING) return 'waiting';
    if (status === JobStatus.PROCESSING) return 'active';
    if (status === JobStatus.SUCCEEDED) return 'completed';
    return 'failed';
  }

  private asPayload(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private readString(obj: Record<string, unknown>, key: string): string | null {
    const value = obj[key];
    return typeof value === 'string' ? value : null;
  }

  private logOps(action: string, principal: TenantAdminPrincipal, queue: string, jobId?: string): void {
    const requestId = this.requestContextService.get().requestId ?? 'unknown';
    this.logger.log(
      `admin.ops.${action} requestId=${requestId} adminId=${principal.adminId} route=/api/v1/admin/ops queue=${queue}${jobId ? ` jobId=${jobId}` : ''}`
    );
  }
}
