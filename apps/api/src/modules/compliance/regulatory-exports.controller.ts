import { Controller, ForbiddenException, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { RegulatoryExportsService } from './regulatory-exports.service';

type FormatQuery = {
  format?: 'csv' | 'json';
  from?: string;
  to?: string;
};

@ApiTags('Compliance')
@ApiBearerAuth('bearer')
@Controller('admin/reports')
@UseGuards(TenantAdminAuthGuard)
export class RegulatoryExportsController {
  constructor(private readonly exportsService: RegulatoryExportsService) {}

  @Get('loan-book/export')
  @ApiOperation({ summary: 'Regulatory loan book export (tenant-scoped)' })
  @ApiProduces('text/csv', 'application/json')
  @Header('Cache-Control', 'no-store')
  async exportLoanBook(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: FormatQuery,
    @Res() res: Response
  ): Promise<void> {
    this.assertSuperAdmin(admin);
    const format = query.format === 'json' ? 'json' : 'csv';
    await this.exportsService.streamLoanBook(res, admin.tenantId, format, query);
    res.end();
  }

  @Get('delinquency/export')
  @ApiOperation({ summary: 'Regulatory delinquency export (tenant-scoped)' })
  @ApiProduces('text/csv', 'application/json')
  @Header('Cache-Control', 'no-store')
  async exportDelinquency(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: FormatQuery,
    @Res() res: Response
  ): Promise<void> {
    this.assertSuperAdmin(admin);
    const format = query.format === 'json' ? 'json' : 'csv';
    await this.exportsService.streamDelinquency(res, admin.tenantId, format, query);
    res.end();
  }

  @Get('ledger/export')
  @ApiOperation({ summary: 'Regulatory ledger export (tenant-scoped)' })
  @ApiProduces('text/csv', 'application/json')
  @Header('Cache-Control', 'no-store')
  async exportLedger(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: FormatQuery,
    @Res() res: Response
  ): Promise<void> {
    this.assertSuperAdmin(admin);
    const format = query.format === 'json' ? 'json' : 'csv';
    await this.exportsService.streamLedger(res, admin.tenantId, format, query);
    res.end();
  }

  private assertSuperAdmin(admin: TenantAdminPrincipal): void {
    if (admin.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only SUPER_ADMIN can export regulatory reports.',
        details: null
      });
    }
  }
}

