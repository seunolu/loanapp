import { BadRequestException, ForbiddenException, Injectable, Scope } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminPrincipal } from '../../common/auth/admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { buildDescCreatedAtCursorWhere, decodeCursor, encodeCursor } from '../../common/pagination/cursor-pagination';
import type { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import type { ListAuditLogsResponseDto } from './dto/list-audit-logs-response.dto';

type AuditLogRow = {
  id: string;
  action: string | null;
  event: string;
  actorType: string | null;
  actorId: string | null;
  entityType: string | null;
  entityId: string | null;
  requestId: string | null;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
};

@Injectable({ scope: Scope.REQUEST })
export class AdminAuditLogsService {
  private static readonly EXPORT_MAX_ROWS = 50_000;
  private static readonly EXPORT_MAX_DAYS = 31;

  constructor(private readonly prisma: PrismaService) {}

  async list(admin: AdminPrincipal, query: ListAuditLogsQueryDto): Promise<ListAuditLogsResponseDto> {
    const take = query.limit ?? 50;
    const cursor = decodeCursor(query.cursor);
    const includeDetails = query.include === 'details';
    const where = this.buildWhere(admin, query, false);
    const cursorWhere = buildDescCreatedAtCursorWhere(cursor);
    const whereWithCursor = cursorWhere ? { AND: [where, cursorWhere] } : where;

    const rows = await this.prisma.auditLog.findMany({
      where: whereWithCursor,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1
    });

    const items = rows.slice(0, take);
    const next = rows.length > take ? rows[take] : null;

    return {
      items: items.map((row) => this.toListItem(row as AuditLogRow, includeDetails)),
      nextCursor: next ? encodeCursor({ id: next.id, createdAt: next.createdAt }) : null
    };
  }

  async exportRows(admin: AdminPrincipal, query: ListAuditLogsQueryDto): Promise<AuditLogRow[]> {
    const where = this.buildWhere(admin, query, true);
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AdminAuditLogsService.EXPORT_MAX_ROWS + 1
    });

    if (rows.length > AdminAuditLogsService.EXPORT_MAX_ROWS) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Export exceeds max rows (${AdminAuditLogsService.EXPORT_MAX_ROWS}). Narrow filters and retry.`,
        details: null
      });
    }
    return rows as AuditLogRow[];
  }

  private buildWhere(admin: AdminPrincipal, query: ListAuditLogsQueryDto, forExport: boolean): Prisma.AuditLogWhereInput {
    const whereAnd: Prisma.AuditLogWhereInput[] = [];
    const effectiveLenderId = this.resolveLenderScope(admin, query.lenderId);
    whereAnd.push({ lenderId: effectiveLenderId });

    if (query.action) whereAnd.push({ action: query.action.trim() });
    if (query.actorType) whereAnd.push({ actorType: query.actorType.trim() });
    if (query.actorId) whereAnd.push({ actorId: query.actorId.trim() });
    if (query.entityType) whereAnd.push({ entityType: query.entityType.trim() });
    if (query.entityId) whereAnd.push({ entityId: query.entityId.trim() });

    const search = query.query?.trim();
    if (search) {
      whereAnd.push({
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { actorId: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
          { requestId: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const { fromDate, toDate } = this.resolveDateRange(query, forExport);
    if (fromDate || toDate) {
      whereAnd.push({
        createdAt: {
          ...(fromDate ? { gte: fromDate } : {}),
          ...(toDate ? { lte: toDate } : {})
        }
      });
    }

    return whereAnd.length ? { AND: whereAnd } : {};
  }

  private resolveDateRange(query: ListAuditLogsQueryDto, forExport: boolean): { fromDate: Date | null; toDate: Date | null } {
    const fromDate = query.from ? new Date(query.from) : null;
    const toDate = query.to ? new Date(query.to) : null;

    if (!forExport) {
      return { fromDate, toDate };
    }

    const now = new Date();
    const fallbackFrom = new Date(now.getTime() - AdminAuditLogsService.EXPORT_MAX_DAYS * 24 * 60 * 60 * 1000);
    const resolvedFrom = fromDate ?? fallbackFrom;
    const resolvedTo = toDate ?? now;
    const days = (resolvedTo.getTime() - resolvedFrom.getTime()) / (24 * 60 * 60 * 1000);
    if (days < 0 || days > AdminAuditLogsService.EXPORT_MAX_DAYS) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Export date range must be <= ${AdminAuditLogsService.EXPORT_MAX_DAYS} days.`,
        details: null
      });
    }
    return { fromDate: resolvedFrom, toDate: resolvedTo };
  }

  private resolveLenderScope(admin: AdminPrincipal, lenderId?: string): string {
    if (!admin.lenderId && !lenderId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'lenderId is required for platform admin scope.',
        details: null
      });
    }
    if (admin.lenderId && lenderId && lenderId !== admin.lenderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Cross-tenant access is not allowed.',
        details: null
      });
    }
    return admin.lenderId || lenderId!;
  }

  private toListItem(row: AuditLogRow, includeDetails: boolean) {
    const metadata = this.normalizeMetadata(row.metadata, includeDetails);
    return {
      id: row.id,
      action: row.action ?? row.event,
      actorType: row.actorType,
      actorId: row.actorId,
      entityType: row.entityType,
      entityId: row.entityId,
      requestId: row.requestId,
      metadata,
      createdAt: row.createdAt.toISOString()
    };
  }

  private normalizeMetadata(metadata: Prisma.JsonValue | null, includeDetails: boolean): Record<string, unknown> | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    const obj = { ...(metadata as Record<string, unknown>) };
    if (!includeDetails) {
      delete obj.before;
      delete obj.after;
    }
    return obj;
  }
}

