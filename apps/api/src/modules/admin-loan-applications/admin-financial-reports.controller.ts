import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminFinancialReportsService } from './admin-financial-reports.service';

@ApiTags('Admin Financial Reports')
@ApiBearerAuth('bearer')
@Controller('admin/reports')
@UseGuards(TenantAdminAuthGuard)
export class AdminFinancialReportsController {
  constructor(private readonly reportsService: AdminFinancialReportsService) {}

  @Get('portfolio-summary')
  @ApiOperation({ summary: 'Portfolio summary from tenant loan balances' })
  @ApiOkResponse()
  getPortfolioSummary(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    return this.reportsService.getPortfolioSummary(admin);
  }

  @Get('loan/:loanId/ledger')
  @ApiOperation({ summary: 'Tenant loan sub-ledger with running balances' })
  @ApiOkResponse()
  getLoanLedger(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Param('loanId') loanId: string
  ) {
    return this.reportsService.getLoanLedger(admin, loanId);
  }

  @Get('aging')
  @ApiOperation({ summary: 'Aging buckets based on daysPastDue and outstanding balances' })
  @ApiOkResponse()
  getAging(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    return this.reportsService.getAging(admin);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue components from tenant ledger lines' })
  @ApiOkResponse()
  getRevenue(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.reportsService.getRevenue(admin, from, to);
  }

  @Get('reconcile')
  @ApiOperation({ summary: 'Compare denormalized loan outstanding fields against ledger balances' })
  @ApiOkResponse()
  reconcile(@CurrentTenantAdmin() admin: TenantAdminPrincipal) {
    return this.reportsService.reconcile(admin);
  }
}

