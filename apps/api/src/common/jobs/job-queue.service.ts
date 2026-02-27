import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, JobStatus, JobType, Prisma } from '@prisma/client';
import type { Env } from '../config/env.schema';
import { PrismaService } from '../database/prisma.service';
import { PromMetricsService } from '../observability/prom-metrics.service';

type EnqueueJobParams = {
  type: JobType;
  tenantId: string;
  lenderId?: string | null;
  dedupeKey?: string | null;
  payload: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
  backoffMs?: number;
  requestId?: string | null;
  actor?: {
    type: string;
    id?: string | null;
    role?: string | null;
  };
};

type ClaimNextJobParams = {
  workerId: string;
  types?: JobType[];
  limit?: number;
};

export function calculateBackoffMs(input: {
  attempts: number;
  baseMs?: number;
  capMs?: number;
  jitterRatio?: number;
  random?: () => number;
}): number {
  const baseMs = Math.max(100, input.baseMs ?? 2000);
  const capMs = Math.max(baseMs, input.capMs ?? 600_000);
  const jitterRatio = Math.min(0.9, Math.max(0, input.jitterRatio ?? 0.2));
  const rnd = input.random ?? Math.random;
  const core = Math.min(capMs, baseMs * 2 ** Math.max(0, input.attempts - 1));
  const jitter = core * jitterRatio * rnd();
  return Math.floor(Math.min(capMs, core + jitter));
}

@Injectable()
export class JobQueueService {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly queueName = 'main';
  private lastDepthObservedAt = 0;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    @Optional() @Inject(PromMetricsService) private readonly promMetricsService?: PromMetricsService
  ) {}

  async enqueueJob(params: EnqueueJobParams): Promise<Job> {
    await this.assertTenantExists(params.tenantId);

    if (params.dedupeKey) {
      const existing = await this.prisma.job.findUnique({
        where: { dedupeKey: params.dedupeKey }
      });
      if (existing) {
        return existing;
      }
    }

    try {
      const created = await this.prisma.job.create({
        data: {
          type: params.type,
          tenantId: params.tenantId,
          lenderId: params.lenderId ?? null,
          dedupeKey: params.dedupeKey ?? null,
          payload: this.buildPayload(params) as Prisma.InputJsonValue,
          runAt: params.runAt ?? new Date(),
          maxAttempts: params.maxAttempts ?? this.configService.get('JOB_MAX_ATTEMPTS', { infer: true }),
          backoffMs: params.backoffMs ?? this.configService.get('JOB_BACKOFF_MS', { infer: true })
        }
      });
      this.promMetricsService?.incrementJobsEnqueued(this.queueName, params.type);
      await this.observeQueueDepthIfDue();
      return created;
    } catch (error) {
      if (params.dedupeKey && this.isUniqueViolation(error)) {
        const existing = await this.prisma.job.findUnique({
          where: { dedupeKey: params.dedupeKey }
        });
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async claimNextJob(params: ClaimNextJobParams): Promise<Job | null> {
    const workerId = params.workerId.trim();
    if (!workerId) {
      throw new BadRequestException('workerId is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const types = params.types ?? [];
      const typeFilter =
        types.length > 0
          ? Prisma.sql`AND "type" IN (${Prisma.join(types.map((type) => Prisma.sql`CAST(${type} AS "JobType")`))})`
          : Prisma.empty;

      const rows = await tx.$queryRaw<Job[]>`
        SELECT *
        FROM "Job"
        WHERE "status" = CAST(${JobStatus.PENDING} AS "JobStatus")
          AND "runAt" <= NOW()
          ${typeFilter}
        ORDER BY "runAt" ASC, "createdAt" ASC
        LIMIT ${params.limit ?? 1}
        FOR UPDATE SKIP LOCKED
      `;

      const job = rows[0];
      if (!job) {
        return null;
      }

      const now = new Date();
      const updated = await tx.job.updateMany({
        where: {
          id: job.id,
          status: JobStatus.PENDING
        },
        data: {
          status: JobStatus.PROCESSING,
          lockedAt: now,
          lockedBy: workerId
        }
      });

      if (updated.count !== 1) {
        return null;
      }
      const claimed = await tx.job.findUnique({
        where: { id: job.id }
      });
      return claimed;
    });
  }

  async markSucceeded(jobId: string, workerId: string): Promise<void> {
    const updated = await this.prisma.job.updateMany({
      where: {
        id: jobId,
        status: JobStatus.PROCESSING,
        lockedBy: workerId
      },
      data: {
        status: JobStatus.SUCCEEDED,
        succeededAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null
      }
    });

    if (updated.count !== 1) {
      this.logger.warn(`markSucceeded skipped for job=${jobId} worker=${workerId}`);
      return;
    }
    await this.observeQueueDepthIfDue();
  }

  async markFailed(jobId: string, workerId: string, errorMessage: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Job[]>`
        SELECT *
        FROM "Job"
        WHERE "id" = ${jobId}
          AND "status" = ${JobStatus.PROCESSING}
          AND "lockedBy" = ${workerId}
        LIMIT 1
        FOR UPDATE
      `;
      const job = rows[0];
      if (!job) {
        this.logger.warn(`markFailed skipped for job=${jobId} worker=${workerId}`);
        return;
      }

      const nextAttempts = job.attempts + 1;
      const exhausted = nextAttempts >= job.maxAttempts;
      const retryBackoff = calculateBackoffMs({
        attempts: nextAttempts,
        baseMs: job.backoffMs,
        capMs: 600_000,
        jitterRatio: 0.2
      });
      this.promMetricsService?.incrementJobsFailed(this.queueName, job.type);

      if (exhausted) {
        const dlqEnabled = this.configService.get('JOB_DLQ_ENABLED', { infer: true });
        await tx.job.update({
          where: { id: job.id },
          data: {
            attempts: nextAttempts,
            status: JobStatus.DEAD_LETTER,
            lastError: errorMessage.slice(0, 2000),
            failedAt: new Date(),
            lockedAt: null,
            lockedBy: null
          }
        });
        if (dlqEnabled) {
          await (tx as any).jobDlq.create({
            data: {
              tenantId: job.tenantId,
              jobId: job.id,
              type: job.type,
              payloadJson: job.payload as Prisma.InputJsonValue,
              attempts: nextAttempts,
              lastError: errorMessage.slice(0, 2000),
              failedAt: new Date()
            }
          });
        }
        await tx.auditLog.create({
          data: {
            event: 'JOB_DEAD_LETTER',
            action: 'JOB_DEAD_LETTER',
            tenantId: job.tenantId,
            requestId: this.getPayloadString(job.payload, 'requestId'),
            actorType: 'SYSTEM',
            actorId: null,
            actorRole: null,
            entity: 'JOB',
            entityType: 'JOB',
            entityId: job.id,
            status: 'FAIL',
            summary: 'Queue job exhausted retries',
            metadata: {
              type: job.type,
              attempts: nextAttempts,
              maxAttempts: job.maxAttempts,
              correlationId: this.getPayloadString(job.payload, 'correlationId'),
              dlqEnabled
            } as Prisma.InputJsonValue
          } as any
        });
        this.logger.error(
          `job_dead_letter jobId=${job.id} tenantId=${job.tenantId} type=${job.type} attempts=${nextAttempts} correlationId=${this.getPayloadString(job.payload, 'correlationId') ?? 'unknown'} error=${errorMessage.slice(0, 200)}`
        );
        return;
      }

      await tx.job.update({
        where: { id: job.id },
        data: {
          attempts: nextAttempts,
          status: JobStatus.PENDING,
          runAt: new Date(Date.now() + retryBackoff),
          lastError: errorMessage.slice(0, 2000),
          lockedAt: null,
          lockedBy: null
        }
      });
    });
    await this.observeQueueDepthIfDue();
  }

  async observeQueueDepth(): Promise<void> {
    if (!this.promMetricsService) {
      return;
    }
    const now = new Date();
    const [pending, processing, failed, delayed] = await Promise.all([
      this.prisma.job.count({ where: { status: JobStatus.PENDING, runAt: { lte: now } } }),
      this.prisma.job.count({ where: { status: JobStatus.PROCESSING } }),
      this.prisma.job.count({ where: { status: { in: [JobStatus.FAILED, JobStatus.DEAD_LETTER] } } }),
      this.prisma.job.count({ where: { status: JobStatus.PENDING, runAt: { gt: now } } })
    ]);
    this.promMetricsService.setQueueDepth({ pending, processing, failed, delayed });
  }

  private async observeQueueDepthIfDue(): Promise<void> {
    const now = Date.now();
    if (now - this.lastDepthObservedAt < 10_000) {
      return;
    }
    this.lastDepthObservedAt = now;
    await this.observeQueueDepth();
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const normalized = tenantId.trim();
    if (!normalized) {
      throw new BadRequestException('tenantId is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: normalized },
      select: { id: true }
    });
    if (!tenant) {
      throw new BadRequestException('Invalid tenantId');
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private buildPayload(params: EnqueueJobParams): Record<string, unknown> {
    return {
      ...params.payload,
      requestId: params.requestId ?? null,
      correlationId: params.requestId ?? params.dedupeKey ?? null,
      tenantId: params.tenantId,
      actor: params.actor ?? null
    };
  }

  private getPayloadString(payload: unknown, key: string): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    const value = (payload as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }
}
