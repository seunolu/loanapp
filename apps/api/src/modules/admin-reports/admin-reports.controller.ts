import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminReportsService } from './admin-reports.service';
import { CollectionsQueryDto, ParQueryDto, PortfolioQueryDto, SummaryQueryDto } from './dto/admin-reports-query.dto';
import { CollectionsReportDto, ParReportDto, PortfolioReportDto, SummaryReportDto } from './dto/admin-reports-response.dto';

@ApiTags('AdminReports')
@ApiBearerAuth('bearer')
@Controller('admin/reports')
@UseGuards(AdminAuthGuard, PermissionsGuard)
export class AdminReportsController {
  constructor(private readonly service: AdminReportsService) {}

  @Get('summary')
  @RequirePermissions('REPORTS_VIEW')
  @ApiOperation({ summary: 'Tenant KPI summary report' })
  @ApiOkResponse({ type: SummaryReportDto })
  async summary(@CurrentAdmin() admin: AdminPrincipal, @Query() query: SummaryQueryDto): Promise<SummaryReportDto> {
    return this.service.getSummary(admin, query);
  }

  @Get('portfolio')
  @RequirePermissions('REPORTS_VIEW')
  @ApiOperation({ summary: 'Portfolio flow report for required date range' })
  @ApiOkResponse({ type: PortfolioReportDto })
  async portfolio(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: PortfolioQueryDto
  ): Promise<PortfolioReportDto> {
    return this.service.getPortfolio(admin, query);
  }

  @Get('collections')
  @RequirePermissions('REPORTS_VIEW')
  @ApiOperation({ summary: 'Collections report for required date range' })
  @ApiOkResponse({ type: CollectionsReportDto })
  async collections(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: CollectionsQueryDto
  ): Promise<CollectionsReportDto> {
    return this.service.getCollections(admin, query);
  }

  @Get('par')
  @RequirePermissions('REPORTS_VIEW')
  @ApiOperation({ summary: 'Portfolio-at-risk report (PAR1/PAR7/PAR30)' })
  @ApiOkResponse({ type: ParReportDto })
  async par(@CurrentAdmin() admin: AdminPrincipal, @Query() query: ParQueryDto): Promise<ParReportDto> {
    return this.service.getPar(admin, query);
  }
}
