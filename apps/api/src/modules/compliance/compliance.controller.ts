import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { SuspiciousActivityService } from './suspicious-activity.service';

function canViewSuspicious(role: TenantAdminPrincipal['role']): boolean {
  return role === 'SUPER_ADMIN' || role === 'RISK_MANAGER' || role === 'OPS' || role === 'SYSTEM';
}

@ApiTags('Compliance')
@ApiBearerAuth('bearer')
@Controller('admin/suspicious-activity')
@UseGuards(TenantAdminAuthGuard)
export class ComplianceController {
  constructor(private readonly suspiciousActivityService: SuspiciousActivityService) {}

  @Get()
  @ApiOperation({ summary: 'List suspicious activity flags for tenant' })
  list(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query('severity') severity?: string,
    @Query('resolved') resolved?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('cursor') cursor?: string
  ) {
    if (!canViewSuspicious(admin.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role cannot access suspicious activity feed.',
        details: null
      });
    }
    return this.suspiciousActivityService.list(admin.tenantId, {
      severity,
      resolved,
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
      cursor
    });
  }

  @Get('paged')
  @ApiOperation({ summary: 'List suspicious activity flags for tenant with pagination' })
  listPaged(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query('severity') severity?: string,
    @Query('resolved') resolved?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    if (!canViewSuspicious(admin.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role cannot access suspicious activity feed.',
        details: null
      });
    }
    return this.suspiciousActivityService.listPaged(admin.tenantId, {
      severity,
      resolved,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined
    });
  }
}
