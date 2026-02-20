import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentAdmin } from '../../common/auth/current-admin.decorator';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../../common/pagination/cursor-pagination';
import { PrismaService } from '../../common/database/prisma.service';
import { AdminAuthGuard } from '../admin-auth/guards/admin-auth.guard';
import type { Response } from 'express';

type ListAuditQuery = {
  entityType?: string;
  entityId?: string;
  resourceType?: string;
  resourceId?: string;
  tenantId?: string;
  action?: string;
  actorId?: string;
  severity?: string;
  from?: string;
  to?: string;
  limit?: string;
  cursor?: string;
};

@ApiTags('Admin Audit')
@ApiBearerAuth('bearer')
@Controller('admin/audit')
@UseGuards(AdminAuthGuard)
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List audit trail events with cursor pagination' })
  async list(@CurrentAdmin() admin: AdminPrincipal, @Query() query: ListAuditQuery) {
    const take = Math.max(1, Math.min(200, Number(query.limit ?? 50) || 50));
    const cursor = decodeCursor(query.cursor);
    const whereAnd: Array<Record<string, unknown>> = [];

    if (query.entityType?.trim()) whereAnd.push({ entityType: query.entityType.trim() });
    if (query.entityId?.trim()) whereAnd.push({ entityId: query.entityId.trim() });
    if (query.resourceType?.trim()) whereAnd.push({ resourceType: query.resourceType.trim() });
    if (query.resourceId?.trim()) whereAnd.push({ resourceId: query.resourceId.trim() });
    if (query.action?.trim()) whereAnd.push({ action: query.action.trim() });
    if (query.actorId?.trim()) whereAnd.push({ actorId: query.actorId.trim() });
    if (query.severity?.trim()) whereAnd.push({ severity: query.severity.trim().toUpperCase() });
    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : null;
      const to = query.to ? new Date(query.to) : null;
      whereAnd.push({
        createdAt: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {})
        }
      });
    }

    const hasCrossTenantRole = ['SUPER_ADMIN', 'PLATFORM_SUPER_ADMIN', 'SYSTEM'].includes(admin.role);
    if (query.tenantId?.trim()) {
      if (!hasCrossTenantRole && query.tenantId.trim() !== (admin.tenantId ?? admin.lenderId)) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Cross-tenant access is not allowed.',
          details: null
        });
      }
      whereAnd.push({ tenantId: query.tenantId.trim() });
    } else if (!hasCrossTenantRole) {
      const scopedTenant = admin.tenantId ?? admin.lenderId;
      if (!scopedTenant) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Tenant scope is required.',
          details: null
        });
      }
      whereAnd.push({ tenantId: scopedTenant });
    }

    const cursorWhere = buildDescCreatedAtCursorWhere(cursor);
    const where = whereAnd.length ? { AND: whereAnd } : {};
    const whereWithCursor = cursorWhere ? { AND: [where, cursorWhere] } : where;

    const rows = await (this.prisma as any).auditEvent.findMany({
      where: whereWithCursor,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1
    });

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;

    return {
      items: items.map((row: any) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        action: row.action,
        actorType: row.actorType,
        actorRole: row.actorRole,
        actorId: row.actorId,
        severity: row.severity,
        tenantId: row.tenantId,
        resourceType: row.resourceType ?? row.entityType,
        resourceId: row.resourceId ?? row.entityId,
        entityType: row.entityType,
        entityId: row.entityId,
        metadataJson: row.metadataJson,
        diffJson: row.diffJson ?? null,
        hash: row.hash,
        prevHash: row.prevHash,
        chainId: row.chainId,
        sequence: row.sequence
      })),
      nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null
    };
  }

  @Get('events')
  @ApiOperation({ summary: 'List audit events (compliance endpoint)' })
  async listEvents(@CurrentAdmin() admin: AdminPrincipal, @Query() query: ListAuditQuery) {
    return this.list(admin, query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit events as NDJSON' })
  async exportEvents(
    @CurrentAdmin() admin: AdminPrincipal,
    @Query() query: ListAuditQuery,
    @Res() res: Response
  ) {
    if (!query.from || !query.to) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'from and to are required for export.',
        details: null
      });
    }

    const isSuperAdmin = admin.role === 'SUPER_ADMIN';
    const scopedTenant = admin.tenantId ?? admin.lenderId;
    const tenantId = query.tenantId?.trim() ?? null;
    if (tenantId && !isSuperAdmin && tenantId !== scopedTenant) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant export is not allowed.',
        details: null
      });
    }

    const effectiveTenant = tenantId ?? (isSuperAdmin ? null : scopedTenant);
    const where = {
      ...(effectiveTenant ? { tenantId: effectiveTenant } : {}),
      createdAt: {
        gte: new Date(query.from),
        lte: new Date(query.to)
      }
    };

    const rows = await (this.prisma as any).auditEvent.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 20_000
    });

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit_events_${Date.now()}.ndjson"`);
    for (const row of rows) {
      res.write(`${JSON.stringify(row)}\n`);
    }
    res.end();
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Get full audit event details by id' })
  async getById(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string) {
    const event = await (this.prisma as any).auditEvent.findUnique({
      where: { id }
    });
    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Audit event not found.',
        details: null
      });
    }

    const hasCrossTenantRole = ['SUPER_ADMIN', 'PLATFORM_SUPER_ADMIN', 'SYSTEM'].includes(admin.role);
    const scopedTenant = admin.tenantId ?? admin.lenderId;
    if (!hasCrossTenantRole && event.tenantId !== scopedTenant) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Audit event not found.',
        details: null
      });
    }

    return {
      id: event.id,
      createdAt: event.createdAt.toISOString(),
      chainId: event.chainId,
      sequence: event.sequence,
      hash: event.hash,
      prevHash: event.prevHash,
      requestId: event.requestId,
      actorType: event.actorType,
      actorId: event.actorId,
      actorRole: event.actorRole,
      severity: event.severity,
      tenantId: event.tenantId,
      lenderId: event.lenderId,
      action: event.action,
      resourceType: event.resourceType ?? event.entityType,
      resourceId: event.resourceId ?? event.entityId,
      entityType: event.entityType,
      entityId: event.entityId,
      beforeJson: event.beforeJson,
      afterJson: event.afterJson,
      diffJson: event.diffJson ?? null,
      metadataJson: event.metadataJson,
      idempotencyKey: event.idempotencyKey
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit event by id (legacy alias)' })
  async getEventById(@CurrentAdmin() admin: AdminPrincipal, @Param('id') id: string) {
    return this.getById(admin, id);
  }
}
