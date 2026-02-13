import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { PermissionsGuard } from '../../common/rbac/permissions.guard';
import { RequirePermissions } from '../../common/rbac/require-permissions.decorator';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { ListAuditLogsResponseDto } from './dto/list-audit-logs-response.dto';

@ApiTags('AdminAuditLogs')
@ApiBearerAuth('bearer')
@Controller('admin/audit-logs')
@UseGuards(AdminAuthGuard, RolesGuard, PermissionsGuard)
export class AdminAuditLogsController {
  constructor(private readonly service: AdminAuditLogsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'OPS', 'FINANCE', 'VIEWER')
  @ApiOperation({ summary: 'Explore audit logs with filters and cursor pagination' })
  @ApiOkResponse({
    type: ListAuditLogsResponseDto,
    example: {
      items: [
        {
          id: 'cmllog001',
          action: 'LOAN_APPLICATION_APPROVED',
          actorType: 'ADMIN',
          actorId: 'cmladmin001',
          entityType: 'LOAN_APPLICATION',
          entityId: 'cmlxapp001',
          requestId: '1d8f9a43-8fef-4ec9-9db0-111111111111',
          metadata: { totalRepayable: 1675000 },
          createdAt: '2026-02-12T12:00:00.000Z'
        }
      ],
      nextCursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTEyVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImNtbGxvZzAwMSJ9'
    }
  })
  async list(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: ListAuditLogsQueryDto
  ): Promise<ListAuditLogsResponseDto> {
    return this.service.list(admin, query);
  }

  @Get('export.csv')
  @RequirePermissions('AUDIT_EXPORT')
  @ApiOperation({ summary: 'Export audit logs as CSV (tenant-scoped, capped)' })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: ListAuditLogsQueryDto,
    @Res() res: Response
  ): Promise<void> {
    const rows = await this.service.exportRows(admin, query);
    const filename = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);

    res.write(
      [
        'id',
        'createdAt',
        'action',
        'actorType',
        'actorId',
        'entityType',
        'entityId',
        'requestId',
        'metadata'
      ].join(',') + '\n'
    );

    for (const row of rows) {
      const values = [
        row.id,
        row.createdAt.toISOString(),
        row.action ?? row.event,
        row.actorType ?? '',
        row.actorId ?? '',
        row.entityType ?? '',
        row.entityId ?? '',
        row.requestId ?? '',
        row.metadata ? JSON.stringify(row.metadata) : ''
      ];
      res.write(values.map((value) => this.csvEscape(String(value))).join(',') + '\n');
    }
    res.end();
  }

  private csvEscape(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
