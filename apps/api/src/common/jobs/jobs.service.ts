import { BadRequestException, Injectable } from '@nestjs/common';
import { JobStatus, JobType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../pagination/cursor-pagination';
import { JobQueueService } from './job-queue.service';

type CreateJobInput = {
  type: JobType;
  key: string;
  payload?: Prisma.InputJsonValue;
  runAt?: Date;
  maxAttempts?: number;
  tenantId?: string;
  lenderId?: string | null;
  backoffMs?: number;
  requestId?: string | null;
  actor?: {
    type: string;
    id?: string | null;
    role?: string | null;
  };
};

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobQueueService: JobQueueService
  ) {}

  async createJob(input: CreateJobInput) {
    const tenantId = this.resolveTenantId(input);
    return this.jobQueueService.enqueueJob({
      type: input.type,
      tenantId,
      lenderId: input.lenderId ?? null,
      dedupeKey: input.key.trim(),
      payload: this.toObjectPayload(input.payload),
      runAt: input.runAt,
      maxAttempts: input.maxAttempts,
      backoffMs: input.backoffMs,
      requestId: input.requestId,
      actor: input.actor
    });
  }

  async claimNextJob(workerId = 'legacy-runner') {
    return this.jobQueueService.claimNextJob({ workerId });
  }

  async releaseClaim(jobId: string): Promise<void> {
    await this.prisma.job.updateMany({
      where: { id: jobId, status: JobStatus.PROCESSING },
      data: {
        status: JobStatus.PENDING,
        lockedAt: null,
        lockedBy: null
      }
    });
  }

  async markCompleted(jobId: string, workerId = 'legacy-runner'): Promise<void> {
    await this.jobQueueService.markSucceeded(jobId, workerId);
  }

  async markFailed(jobId: string, _attempts: number, _maxAttempts: number, errorMessage: string): Promise<void> {
    await this.jobQueueService.markFailed(jobId, 'legacy-runner', errorMessage);
  }

  async listJobs(input: {
    status?: JobStatus | 'DLQ';
    type?: JobType | string;
    query?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
    page?: number;
    pageSize?: number;
    tenantId?: string;
  }) {
    const pageSize = Math.max(1, Math.min(200, input.pageSize ?? input.limit ?? 50));
    const page = Math.max(1, input.page ?? 1);
    const take = pageSize;
    const skip = (page - 1) * pageSize;
    const cursor = decodeCursor(input.cursor);
    const search = input.query?.trim();
    const fromDate = input.from ? new Date(input.from) : null;
    const toDate = input.to ? new Date(input.to) : null;
    const whereAnd: Prisma.JobWhereInput[] = [];

    if (input.status) {
      whereAnd.push({ status: input.status === 'DLQ' ? JobStatus.DEAD_LETTER : input.status });
    }
    if (input.type) whereAnd.push({ type: input.type as JobType });
    if (input.tenantId) whereAnd.push({ tenantId: input.tenantId });

    if (search) {
      whereAnd.push({
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { dedupeKey: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
    if (fromDate || toDate) {
      whereAnd.push({
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {})
        }
      });
    }

    const cursorWhere = buildDescCreatedAtCursorWhere(cursor);
    if (cursorWhere) whereAnd.push(cursorWhere);

    const where = whereAnd.length ? { AND: whereAnd } : undefined;
    const [rows, total] = await Promise.all([
      this.prisma.job.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? {} : { skip })
    }),
      this.prisma.job.count({ where: cursor ? undefined : where })
    ]);

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;
    return {
      items,
      nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null,
      total,
      page,
      pageSize
    };
  }

  async retryJob(jobId: string) {
    const existing = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) return null;
    if (existing.status !== JobStatus.FAILED && existing.status !== JobStatus.DEAD_LETTER) {
      return existing;
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PENDING,
        runAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        failedAt: null,
        lastError: null,
        attempts: 0
      }
    });
  }

  async getJobById(jobId: string) {
    return this.prisma.job.findUnique({ where: { id: jobId } });
  }

  async cancelJob(jobId: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.job.findUnique({ where: { id: jobId } });
      if (!row) return;
      await tx.job.update({
        where: { id: row.id },
        data: {
          status: JobStatus.DEAD_LETTER,
          failedAt: new Date(),
          lastError: reason.slice(0, 2000),
          lockedAt: null,
          lockedBy: null
        }
      });
      await (tx as any).jobDlq.create({
        data: {
          tenantId: row.tenantId,
          jobId: row.id,
          type: row.type,
          payloadJson: row.payload as Prisma.InputJsonValue,
          attempts: row.attempts,
          lastError: reason.slice(0, 2000),
          failedAt: new Date()
        }
      });
    });
  }

  private resolveTenantId(input: CreateJobInput): string {
    if (input.tenantId?.trim()) return input.tenantId.trim();
    if (
      input.payload &&
      typeof input.payload === 'object' &&
      !Array.isArray(input.payload) &&
      'tenantId' in input.payload &&
      typeof (input.payload as { tenantId?: unknown }).tenantId === 'string'
    ) {
      return ((input.payload as { tenantId: string }).tenantId || '').trim();
    }
    const envTenant = process.env.DEFAULT_WORKER_TENANT_ID?.trim();
    if (envTenant) return envTenant;
    throw new BadRequestException('tenantId is required for job enqueue');
  }

  private toObjectPayload(payload: Prisma.InputJsonValue | undefined): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return payload as Record<string, unknown>;
  }
}
