import { Injectable } from '@nestjs/common';
import { JobStatus, JobType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../pagination/cursor-pagination';

type CreateJobInput = {
  type: JobType;
  key: string;
  payload?: Prisma.InputJsonValue;
  runAt?: Date;
  maxAttempts?: number;
};

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(input: CreateJobInput) {
    const key = input.key.trim();
    const runAt = input.runAt ?? new Date();

    return this.prisma.job.upsert({
      where: {
        type_key: {
          type: input.type,
          key
        }
      },
      create: {
        type: input.type,
        key,
        payload: input.payload ?? Prisma.JsonNull,
        runAt,
        maxAttempts: input.maxAttempts ?? 5
      },
      update: {
        payload: input.payload ?? Prisma.JsonNull,
        runAt,
        maxAttempts: input.maxAttempts ?? 5,
        status: JobStatus.PENDING,
        deadAt: null,
        lastError: null
      }
    });
  }

  async claimNextJob() {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const job = await tx.job.findFirst({
        where: {
          status: JobStatus.PENDING,
          runAt: { lte: now }
        },
        orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }]
      });

      if (!job) {
        return null;
      }

      return tx.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.PROCESSING,
          lockedAt: now,
          deadAt: null
        }
      });
    });
  }

  async releaseClaim(jobId: string): Promise<void> {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PENDING,
        lockedAt: null
      }
    });
  }

  async markCompleted(jobId: string): Promise<void> {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        lockedAt: null,
        lastError: null
      }
    });
  }

  async markFailed(jobId: string, attempts: number, maxAttempts: number, errorMessage: string): Promise<void> {
    const nextAttempts = attempts + 1;
    const exhausted = nextAttempts >= maxAttempts;
    const backoffSec = Math.min(300, Math.max(5, 2 ** nextAttempts));
    const nextRun = new Date(Date.now() + backoffSec * 1000);

    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        attempts: nextAttempts,
        status: exhausted ? JobStatus.DEAD : JobStatus.PENDING,
        lockedAt: null,
        runAt: exhausted ? undefined : nextRun,
        deadAt: exhausted ? new Date() : null,
        lastError: errorMessage
      }
    });
  }

  async listJobs(input: {
    status?: JobStatus;
    query?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }) {
    const take = input.limit ?? 50;
    const cursor = decodeCursor(input.cursor);
    const search = input.query?.trim();
    const fromDate = input.from ? new Date(input.from) : null;
    const toDate = input.to ? new Date(input.to) : null;
    const whereAnd: Prisma.JobWhereInput[] = [];
    if (input.status) {
      whereAnd.push({ status: input.status });
    }
    if (search) {
      whereAnd.push({
        OR: [{ id: { contains: search, mode: 'insensitive' } }, { key: { contains: search, mode: 'insensitive' } }]
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
    if (cursorWhere) {
      whereAnd.push(cursorWhere);
    }
    const rows = await this.prisma.job.findMany({
      where: whereAnd.length ? { AND: whereAnd } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1
    });

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;
    return { items, nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null };
  }

  async retryJob(jobId: string) {
    const existing = await this.prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!existing) {
      return null;
    }

    if (existing.status !== JobStatus.FAILED && existing.status !== JobStatus.DEAD) {
      return existing;
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.PENDING,
        runAt: new Date(),
        lockedAt: null,
        deadAt: null,
        lastError: null,
        attempts: 0
      }
    });
  }
}
