import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { ForensicReportService } from './forensic-report.service';

@ApiTags('Compliance')
@ApiBearerAuth('bearer')
@Controller('admin/loan-applications')
@UseGuards(TenantAdminAuthGuard)
export class ForensicReportController {
  constructor(private readonly forensicReportService: ForensicReportService) {}

  @Get(':id/forensic-report')
  @ApiOperation({ summary: 'Regulator forensic report for a loan application' })
  getReport(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('id') id: string
  ) {
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'RISK_MANAGER') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only SUPER_ADMIN or RISK_MANAGER can access forensic reports.',
        details: null
      });
    }
    return this.forensicReportService.getLoanForensicReport(admin, id);
  }
}

