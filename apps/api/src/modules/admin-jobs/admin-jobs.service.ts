import { ForbiddenException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import type { Job } from '@prisma/client';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { JobsService } from '../../common/jobs/jobs.service';
import type { JobItemDto } from './dto/job-item.dto';
import type { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import type { ListJobsResponseDto } from './dto/list-jobs-response.dto';

@Injectable({ scope: Scope.REQUEST })
export class AdminJobsService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaService
  ) {}

  async listJobs(principal: TenantAdminPrincipal, query: ListJobsQueryDto): Promise<ListJobsResponseDto> {
    const requestedTenantId = query.tenantId;
    if (requestedTenantId && requestedTenantId !== principal.tenantId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant job access is not allowed.',
        details: null
      });
    }

    const { items, nextCursor, total, page, pageSize } = await this.jobsService.listJobs({
      status: query.status as any,
      type: query.type as any,
      query: query.q ?? query.query,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.take ?? 20,
      page: query.page,
      pageSize: query.pageSize,
      tenantId: principal.tenantId
    });

    return {
      items: items.map((item) => this.toDto(item)),
      nextCursor,
      total,
      page,
      pageSize
    };
  }

  async getJobById(principal: TenantAdminPrincipal, id: string): Promise<JobItemDto> {
    const row = await this.prisma.job.findFirst({
      where: {
        id,
        tenantId: principal.tenantId
      }
    });

    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
        details: null
      });
    }

    return this.toDto(row);
  }

  async retryJob(principal: TenantAdminPrincipal, id: string): Promise<JobItemDto> {
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
    const retried = await this.jobsService.retryJob(id);
    if (!retried) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Job not found.',
        details: null
      });
    }
    return this.toDto(retried);
  }

  async cancelJob(principal: TenantAdminPrincipal, id: string, reason?: string): Promise<void> {
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
    await this.jobsService.cancelJob(id, reason?.trim() || 'Cancelled by admin');
  }

  private toDto(item: Job): JobItemDto {
    return {
      id: item.id,
      type: item.type,
      status: item.status,
      tenantId: item.tenantId,
      lenderId: item.lenderId,
      dedupeKey: item.dedupeKey,
      payload: (item.payload && typeof item.payload === 'object' ? item.payload : {}) as Record<string, unknown>,
      attempts: item.attempts,
      maxAttempts: item.maxAttempts,
      runAt: item.runAt.toISOString(),
      lockedAt: item.lockedAt ? item.lockedAt.toISOString() : null,
      lockedBy: item.lockedBy,
      lastError: item.lastError,
      succeededAt: item.succeededAt ? item.succeededAt.toISOString() : null,
      failedAt: item.failedAt ? item.failedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    };
  }
}
