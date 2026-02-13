import { ConflictException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { JobsService } from '../../common/jobs/jobs.service';
import { RedisService } from '../../common/redis/redis.service';
import type { AdminHealthResponseDto } from './dto/admin-health-response.dto';
import type { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import type { ListJobsResponseDto } from './dto/list-jobs-response.dto';
import type { RetryJobResponseDto } from './dto/retry-job-response.dto';

@Injectable({ scope: Scope.REQUEST })
export class AdminJobsService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService
  ) {}

  async listJobs(query: ListJobsQueryDto): Promise<ListJobsResponseDto> {
    const { items, nextCursor } = await this.jobsService.listJobs({
      status: query.status,
      query: query.query,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        key: item.key,
        status: item.status,
        attempts: item.attempts,
        maxAttempts: item.maxAttempts,
        runAt: item.runAt.toISOString(),
        lockedAt: item.lockedAt ? item.lockedAt.toISOString() : null,
        deadAt: item.deadAt ? item.deadAt.toISOString() : null,
        lastError: item.lastError,
        createdAt: item.createdAt.toISOString()
      })),
      nextCursor
    };
  }

  async retryJob(admin: AdminPrincipal, jobId: string): Promise<RetryJobResponseDto> {
    const existing = await this.prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
        details: null
      });
    }

    if (existing.status !== JobStatus.FAILED && existing.status !== JobStatus.DEAD) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Only FAILED or DEAD jobs can be retried.',
        details: {
          status: existing.status
        }
      });
    }

    const updated = await this.jobsService.retryJob(jobId);
    if (!updated) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
        details: null
      });
    }

    await this.auditService.write({
      event: 'JOB_RETRIED',
      actorType: 'ADMIN',
      actorId: admin.adminId,
      metadata: {
        entityType: 'JOB',
        entityId: updated.id,
        beforeStatus: existing.status,
        afterStatus: updated.status
      }
    });

    return {
      id: updated.id,
      status: updated.status
    };
  }

  async getAdminHealth(): Promise<AdminHealthResponseDto> {
    let databaseUp = false;
    let redisUp = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseUp = true;
    } catch {
      databaseUp = false;
    }

    try {
      const pong = await this.redisService.ping();
      redisUp = pong === 'PONG';
    } catch {
      redisUp = false;
    }

    return {
      status: databaseUp && redisUp ? 'ok' : 'degraded',
      database: {
        status: databaseUp ? 'up' : 'down'
      },
      redis: {
        status: redisUp ? 'up' : 'down'
      }
    };
  }
}
