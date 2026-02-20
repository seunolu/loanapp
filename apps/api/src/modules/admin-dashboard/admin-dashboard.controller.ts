import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { dashboardRecentActivityQuerySchema } from './dto/dashboard-activity.dto';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('Admin Dashboard')
@ApiBearerAuth('bearer')
@Controller('admin/dashboard')
@UseGuards(TenantAdminAuthGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get tenant-scoped executive dashboard metrics' })
  @ApiOkResponse()
  metrics(@CurrentTenantAdmin() principal: TenantAdminPrincipal) {
    return this.adminDashboardService.getMetrics(principal);
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent tenant-scoped operational activity feed' })
  @ApiOkResponse()
  recentActivity(
    @CurrentTenantAdmin() principal: TenantAdminPrincipal,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = dashboardRecentActivityQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid recent activity query.',
        details: parsed.error.flatten()
      });
    }
    return this.adminDashboardService.getRecentActivity(principal, parsed.data);
  }
}
