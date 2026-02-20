import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminJobsService } from './admin-jobs.service';
import { JobItemDto } from './dto/job-item.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import { ListJobsResponseDto } from './dto/list-jobs-response.dto';
import { CancelJobDto } from './dto/cancel-job.dto';

@ApiTags('AdminJobs')
@ApiBearerAuth('bearer')
@Controller('admin/jobs')
@UseGuards(TenantAdminAuthGuard)
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs (tenant scoped)' })
  @ApiOkResponse({ type: ListJobsResponseDto })
  async listJobs(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: ListJobsQueryDto
  ): Promise<ListJobsResponseDto> {
    return this.adminJobsService.listJobs(principal, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details (tenant scoped)' })
  @ApiOkResponse({ type: JobItemDto })
  async getJobById(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<JobItemDto> {
    return this.adminJobsService.getJobById(principal, id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry job (tenant scoped)' })
  async retryJob(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string
  ): Promise<JobItemDto> {
    return this.adminJobsService.retryJob(principal, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel job to DLQ (tenant scoped)' })
  async cancelJob(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Body() body: CancelJobDto
  ): Promise<{ ok: true }> {
    await this.adminJobsService.cancelJob(principal, id, body.reason);
    return { ok: true };
  }
}
