import { Controller, Get, Header, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentTenantAdmin } from '../../common/auth/current-tenant-admin.decorator';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { TenantAdminAuthGuard } from '../admin-auth/guards/tenant-admin-auth.guard';
import { AdminAuditsService } from './admin-audits.service';
import { ListAdminAuditsQueryDto } from './dto/list-admin-audits-query.dto';

@ApiTags('Admin Audits')
@ApiBearerAuth('bearer')
@Controller('admin/audits')
@UseGuards(TenantAdminAuthGuard)
export class AdminAuditsController {
  constructor(private readonly service: AdminAuditsService) {}

  @Get()
  @ApiOperation({ summary: 'List tenant audit logs with filters and pagination' })
  @ApiOkResponse()
  list(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Query() query: ListAdminAuditsQueryDto) {
    return this.service.list(admin, query);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export tenant audit logs as CSV' })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @CurrentTenantAdmin() admin: TenantAdminPrincipal,
    @Query() query: ListAdminAuditsQueryDto,
    @Res() res: Response
  ) {
    const filename = `audit_export_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await this.service.streamCsv(admin, query, (chunk) => res.write(chunk));
    res.end();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant audit log details' })
  @ApiOkResponse()
  findOne(@CurrentTenantAdmin() admin: TenantAdminPrincipal, @Param('id') id: string) {
    return this.service.getById(admin, id);
  }
}
