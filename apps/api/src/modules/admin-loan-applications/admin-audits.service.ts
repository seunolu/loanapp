import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/database/prisma.service';
import { assertTenantMatch } from '../../common/tenant/assert-tenant-match';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import type { ListAdminAuditsQueryDto } from './dto/list-admin-audits-query.dto';

const ALLOWED_ROLES = new Set(['CREDIT_OFFICER', 'RISK_MANAGER', 'OPS', 'SUPER_ADMIN']);
const OPS_ACTION_PREFIXES = ['DISBURSEMENT', 'REPAYMENT', 'COLLECTION', 'LEDGER', 'JOB', 'PAYMENT'];

export function sanitizeCsvCell(value: string): string {
  if (!value) return '';
  const trimmed = value.trimStart();
  if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
    return `'${value}`;
  }
  return value;
}

@Injectable()
export class AdminAuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(admin: TenantAdminPrincipal, query: ListAdminAuditsQueryDto) {
    this.assertRole(admin);
    const where = await this.buildWhere(admin, query);
    const orderBy = this.buildOrderBy(query.sort);
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      // TENANT_SCOPED_QUERY
      this.prisma.auditLog.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      items: items.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        actorType: row.actorType,
        actorId: row.actorId,
        action: row.action ?? row.event,
        entityType: row.entityType ?? row.entity,
        entityId: row.entityId,
        status: (row as any).status ?? 'SUCCESS',
        requestId: row.requestId,
        ip: row.ip,
        userAgent: row.userAgent,
        summary: ((row as any).summary ?? null) as string | null
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize))
    };
  }

  async getById(admin: TenantAdminPrincipal, id: string) {
    this.assertRole(admin);
    const row = await this.prisma.auditLog.findFirst({
      where: { id, tenantId: admin.tenantId }
    });
    if (!row) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Audit log not found.',
        details: { id }
      });
    }
    assertTenantMatch(row.tenantId, admin.tenantId);
    const allowed = await this.canAccessAuditRow(admin, row);
    if (!allowed) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Audit log not found.',
        details: { id }
      });
    }

    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      actorType: row.actorType,
      actorId: row.actorId,
      actorRole: row.actorRole,
      action: row.action ?? row.event,
      entityType: row.entityType ?? row.entity,
      entityId: row.entityId,
      status: (row as any).status ?? 'SUCCESS',
      requestId: row.requestId,
      ip: row.ip,
      userAgent: row.userAgent,
      summary: ((row as any).summary ?? null) as string | null,
      metadata: row.metadata,
      before: (row as any).before ?? null,
      after: (row as any).after ?? null,
      error: (row as any).error ?? null
    };
  }

  async streamCsv(
    admin: TenantAdminPrincipal,
    query: ListAdminAuditsQueryDto,
    writer: (chunk: string) => void
  ): Promise<{ rows: number }> {
    this.assertRole(admin);
    const pageSize = Math.min(query.pageSize, 500);
    const orderBy = this.buildOrderBy(query.sort);
    const where = await this.buildWhere(admin, query);

    let offset = 0;
    let totalRows = 0;
    writer('createdAt,actorType,actorId,action,entityType,entityId,status,requestId\n');

    while (true) {
      const rows = await this.prisma.auditLog.findMany({
        where,
        orderBy,
        skip: offset,
        take: pageSize
      });
      if (!rows.length) break;

      for (const row of rows) {
        assertTenantMatch(row.tenantId, admin.tenantId);
        if (totalRows >= 10000) {
          break;
        }
        const values = [
          row.createdAt.toISOString(),
          row.actorType ?? '',
          row.actorId ?? '',
          row.action ?? row.event,
          row.entityType ?? row.entity ?? '',
          row.entityId ?? '',
          ((row as any).status ?? 'SUCCESS') as string,
          row.requestId ?? ''
        ];
        writer(values.map((value) => this.escapeCsv(sanitizeCsvCell(String(value)))).join(',') + '\n');
        totalRows += 1;
      }

      if (rows.length < pageSize || totalRows >= 10000) break;
      offset += rows.length;
    }

    await this.auditService.log({
      tenantId: admin.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: admin.adminId,
      actorRole: admin.role,
      action: 'AUDIT_EXPORT',
      entity: 'AUDIT_LOG',
      status: 'SUCCESS',
      metadata: {
        filterSummary: {
          from: query.from ?? null,
          to: query.to ?? null,
          actorType: query.actorType ?? null,
          actorId: query.actorId ?? null,
          action: query.action ?? null,
          entityType: query.entityType ?? null,
          entityId: query.entityId ?? null,
          status: query.status ?? null,
          q: query.q ?? null
        },
        rows: totalRows
      }
    });

    return { rows: totalRows };
  }

  private assertRole(admin: TenantAdminPrincipal): void {
    if (!ALLOWED_ROLES.has(admin.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role cannot access tenant audit explorer.',
        details: null
      });
    }
  }

  private async buildWhere(admin: TenantAdminPrincipal, query: ListAdminAuditsQueryDto): Promise<Prisma.AuditLogWhereInput> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: admin.tenantId
    };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {})
      };
    }
    if (query.actorType) where.actorType = query.actorType;
    if (query.actorId) where.actorId = query.actorId.trim();
    if (query.entityType) where.entityType = query.entityType.trim();
    if (query.entityId) where.entityId = query.entityId.trim();
    if (query.status) (where as any).status = query.status;
    if (query.action) where.action = { contains: query.action.trim(), mode: 'insensitive' };
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } }
      ];
    }

    const roleScopedWhere = await this.buildRoleScopeWhere(admin);
    if (roleScopedWhere) {
      return {
        AND: [where, roleScopedWhere]
      };
    }

    return where;
  }

  private buildOrderBy(sort: ListAdminAuditsQueryDto['sort']): Prisma.AuditLogOrderByWithRelationInput {
    if (sort === 'action') return { action: 'asc' };
    if (sort === '-action') return { action: 'desc' };
    if (sort === 'createdAt') return { createdAt: 'asc' };
    return { createdAt: 'desc' };
  }

  private escapeCsv(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async canAccessAuditRow(admin: TenantAdminPrincipal, row: {
    action: string | null;
    actorId: string | null;
    entityType: string | null;
    entityId: string | null;
  }): Promise<boolean> {
    if (admin.role === 'SUPER_ADMIN' || admin.role === 'RISK_MANAGER') return true;

    if (admin.role === 'OPS') {
      const action = (row.action ?? '').toUpperCase();
      return OPS_ACTION_PREFIXES.some((prefix) => action.startsWith(prefix));
    }

    if (admin.role === 'CREDIT_OFFICER') {
      if (row.actorId === admin.adminId) return true;
      if (!row.entityType || !row.entityId) return false;
      if (!['TENANT_LOAN_APPLICATION', 'LoanApplication'].includes(row.entityType)) return false;
      const touched = await this.prisma.tenantLoanApplicationEvent.findFirst({
        where: {
          adminId: admin.adminId,
          loanApplicationId: row.entityId,
          loanApplication: { tenantId: admin.tenantId }
        },
        select: { id: true }
      });
      return Boolean(touched);
    }

    return row.actorId === admin.adminId;
  }

  private async buildRoleScopeWhere(admin: TenantAdminPrincipal): Promise<Prisma.AuditLogWhereInput | null> {
    if (admin.role === 'SUPER_ADMIN' || admin.role === 'RISK_MANAGER') {
      return null;
    }

    if (admin.role === 'OPS') {
      return {
        OR: OPS_ACTION_PREFIXES.map((prefix) => ({
          action: { startsWith: prefix, mode: 'insensitive' }
        }))
      };
    }

    if (admin.role === 'CREDIT_OFFICER') {
      const touchedRows = await this.prisma.tenantLoanApplicationEvent.findMany({
        where: {
          adminId: admin.adminId,
          loanApplication: { tenantId: admin.tenantId }
        },
        select: { loanApplicationId: true },
        take: 2000
      });
      const loanIds = [...new Set(touchedRows.map((item) => item.loanApplicationId))];

      return {
        OR: [
          { actorId: admin.adminId },
          {
            AND: [
              { entityType: { in: ['TENANT_LOAN_APPLICATION', 'LoanApplication'] } },
              loanIds.length > 0 ? { entityId: { in: loanIds } } : { entityId: '__none__' }
            ]
          }
        ]
      };
    }

    return {
      actorId: admin.adminId
    };
  }
}
