import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminOpsService, type OpsJobStatus } from './admin-ops.service';

@ApiTags('AdminOps')
@ApiBearerAuth('bearer')
@Controller('admin/ops')
@UseGuards(TenantAdminAuthGuard)
export class AdminOpsController {
  constructor(private readonly adminOpsService: AdminOpsService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List operational jobs' })
  async listJobs(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query('queue') queue?: string,
    @Query('status') status?: OpsJobStatus,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.adminOpsService.listJobs(principal, {
      queue,
      status,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      search
    });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get operational job detail' })
  async getJobById(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Query('queue') queue?: string
  ) {
    return this.adminOpsService.getJobById(principal, id, queue);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry failed operational job once (rate-limited)' })
  async retryJob(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Param('id') id: string,
    @Query('queue') queue?: string
  ) {
    return this.adminOpsService.retryJob(principal, id, queue);
  }

  @Get('dlq')
  @ApiOperation({ summary: 'DLQ summary and grouped counts by job name' })
  async dlqSummary(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query('queue') queue?: string,
    @Query('limit') limit?: string
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 50;
    return this.adminOpsService.dlqSummary(principal, queue, Number.isFinite(parsedLimit) ? parsedLimit : 50);
  }
}

