import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { parsePagination } from '../../common/http/pagination';

export type CreateSuspiciousActivityInput = {
  tenantId: string;
  entityType: string;
  entityId: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved?: boolean;
  resolvedBy?: string | null;
  tx?: Prisma.TransactionClient;
};

@Injectable()
export class SuspiciousActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async flag(input: CreateSuspiciousActivityInput): Promise<void> {
    const db = (input.tx ?? this.prisma) as any;
    const recentDuplicate = await db.suspiciousActivity.findFirst({
      where: {
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        severity: input.severity,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000)
        }
      },
      select: { id: true }
    });
    if (recentDuplicate) {
      return;
    }

    await db.suspiciousActivity.create({
      data: {
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        reason: input.reason,
        severity: input.severity,
        resolved: input.resolved ?? false,
        resolvedBy: input.resolvedBy ?? null
      }
    });
  }

  async list(
    tenantId: string,
    query: { severity?: string; resolved?: string; limit?: number; skip?: number; cursor?: string }
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      entityType: string;
      entityId: string;
      reason: string;
      severity: string;
      createdAt: string;
      resolved: boolean;
      resolvedBy: string | null;
    }>
  > {
    const pagination = parsePagination(query);
    const rows = await (this.prisma as any).suspiciousActivity.findMany({
      where: {
        tenantId,
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.resolved != null
          ? {
              resolved:
                query.resolved === 'true'
                  ? true
                  : query.resolved === 'false'
                    ? false
                    : undefined
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });

    return rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenantId,
      entityType: row.entityType,
      entityId: row.entityId,
      reason: row.reason,
      severity: row.severity,
      createdAt: row.createdAt.toISOString(),
      resolved: row.resolved,
      resolvedBy: row.resolvedBy ?? null
    }));
  }

  async listPaged(
    tenantId: string,
    query: { severity?: string; resolved?: string; page?: number; pageSize?: number }
  ): Promise<{
    items: Array<{
      id: string;
      tenantId: string;
      entityType: string;
      entityId: string;
      reason: string;
      severity: string;
      createdAt: string;
      resolved: boolean;
      resolvedBy: string | null;
    }>;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(10, Math.min(100, query.pageSize ?? 25));
    const skip = (page - 1) * pageSize;
    const where = {
      tenantId,
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.resolved != null
        ? {
            resolved:
              query.resolved === 'true'
                ? true
                : query.resolved === 'false'
                  ? false
                  : undefined
          }
        : {})
    };

    const [rows, total] = await Promise.all([
      (this.prisma as any).suspiciousActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      (this.prisma as any).suspiciousActivity.count({ where })
    ]);

    return {
      items: rows.map((row: any) => ({
        id: row.id,
        tenantId: row.tenantId,
        entityType: row.entityType,
        entityId: row.entityId,
        reason: row.reason,
        severity: row.severity,
        createdAt: row.createdAt.toISOString(),
        resolved: row.resolved,
        resolvedBy: row.resolvedBy ?? null
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }
}
