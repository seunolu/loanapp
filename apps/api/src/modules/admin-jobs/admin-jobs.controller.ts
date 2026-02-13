import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminJobsService } from './admin-jobs.service';
import { AdminHealthResponseDto } from './dto/admin-health-response.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import { ListJobsResponseDto } from './dto/list-jobs-response.dto';
import { RetryJobResponseDto } from './dto/retry-job-response.dto';

@ApiTags('AdminJobs')
@ApiBearerAuth('bearer')
@Controller('admin')
@UseGuards(AdminAuthGuard, RolesGuard, PermissionsGuard)
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Get('jobs')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'List jobs with optional status filter' })
  @ApiOkResponse({
    type: ListJobsResponseDto,
    example: {
      items: [
        {
          id: 'cmljob001',
          type: 'OVERDUE_SCAN',
          key: 'overdue_scan:2026-02-12',
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 5,
          runAt: '2026-02-12T12:00:00.000Z',
          lockedAt: null,
          deadAt: null,
          lastError: null,
          createdAt: '2026-02-12T12:00:00.000Z'
        }
      ],
      nextCursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTEyVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImNtbGpvYjAwMSJ9'
    }
  })
  async listJobs(@Query() query: ListJobsQueryDto): Promise<ListJobsResponseDto> {
    return this.adminJobsService.listJobs(query);
  }

  @Post('jobs/:id/retry')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('JOBS_RETRY')
  @ApiOperation({ summary: 'Retry a FAILED/DEAD job immediately' })
  @ApiOkResponse({ type: RetryJobResponseDto })
  async retryJob(
    @CurrentAdmin() admin: AdminPrincipal,
    @Param('id') id: string
  ): Promise<RetryJobResponseDto> {
    return this.adminJobsService.retryJob(admin, id);
  }

  @Get('health')
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'Admin health check for DB and Redis' })
  @ApiOkResponse({ type: AdminHealthResponseDto })
  async health(): Promise<AdminHealthResponseDto> {
    return this.adminJobsService.getAdminHealth();
  }
}
