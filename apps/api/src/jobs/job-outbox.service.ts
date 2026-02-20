import { Injectable } from '@nestjs/common';
import { JobStatus, JobType, Prisma } from '@prisma/client';
import { JobsService } from '../common/jobs/jobs.service';
import { PrismaService } from '../common/database/prisma.service';

@Injectable()
export class JobOutboxService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaService
  ) {}

  async enqueue(params: {
    tenantId: string;
    type: JobType;
    idempotencyKey: string;
    payloadJson: Record<string, unknown>;
    runAt?: Date;
    maxAttempts?: number;
    backoffMs?: number;
  }) {
    return this.jobsService.createJob({
      tenantId: params.tenantId,
      type: params.type,
      key: `${params.tenantId}:${params.type}:${params.idempotencyKey}`,
      payload: params.payloadJson as Prisma.InputJsonValue,
      runAt: params.runAt,
      maxAttempts: params.maxAttempts,
      backoffMs: params.backoffMs
    });
  }

  async getById(tenantId: string, id: string) {
    return this.prisma.job.findFirst({ where: { id, tenantId } });
  }

  async retry(id: string) {
    return this.jobsService.retryJob(id);
  }

  async moveToDlq(id: string, reason: string) {
    await this.jobsService.cancelJob(id, reason);
    await this.prisma.job.updateMany({
      where: { id },
      data: { status: JobStatus.DEAD_LETTER }
    });
  }
}

