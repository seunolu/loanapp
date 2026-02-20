import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminObservabilityService } from './admin-observability.service';

@ApiTags('Admin Observability')
@ApiBearerAuth('bearer')
@Controller('admin')
@UseGuards(TenantAdminAuthGuard)
export class AdminObservabilityController {
  constructor(private readonly adminObservabilityService: AdminObservabilityService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Tenant metrics counters and latency aggregates' })
  @ApiOkResponse()
  metrics(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    return this.adminObservabilityService.getTenantMetrics(admin);
  }

  @Get('system-status')
  @ApiOperation({ summary: 'Tenant system status overview with operational checks' })
  @ApiOkResponse()
  systemStatus(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    return this.adminObservabilityService.getSystemStatus(admin);
  }

  @Get('system/integrity')
  @ApiOperation({ summary: 'Latest tenant financial integrity snapshot' })
  @ApiOkResponse()
  integrity(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    return this.adminObservabilityService.getIntegrityStatus(admin);
  }
}
