import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestContextService } from '../request-context/request-context.service';
import type { RequestWithId } from '../types/request-with-id';

type WriteAuditInput = {
  event: string;
  action?: string;
  lenderId?: string | null;
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
};

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContextService: RequestContextService,
    @Inject(REQUEST) private readonly request: RequestWithId
  ) {}

  async write(input: WriteAuditInput): Promise<void> {
    const context = this.requestContextService.get();
    const metadataRecord =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : null;
    const user = this.request.user as { lenderId?: string } | undefined;
    const headerLenderId = this.request.header('x-lender-id');
    const resolvedLenderId =
      input.lenderId ??
      user?.lenderId ??
      (typeof headerLenderId === 'string' && headerLenderId.trim().length > 0 ? headerLenderId.trim() : null);
    const metadata: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
      input.metadata === null || input.metadata === undefined
        ? Prisma.JsonNull
        : (input.metadata as Prisma.InputJsonValue);

    try {
      await this.prisma.auditLog.create({
        data: {
          event: input.event,
          action: input.action ?? input.event,
          lenderId: resolvedLenderId,
          requestId: input.requestId ?? context.requestId,
          ip: input.ip ?? context.ip,
          userAgent: input.userAgent ?? context.userAgent,
          actorType: input.actorType ?? null,
          actorId: input.actorId ?? null,
          entityType: input.entityType ?? (metadataRecord?.entityType as string | undefined) ?? null,
          entityId: input.entityId ?? (metadataRecord?.entityId as string | undefined) ?? null,
          metadata
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown audit error';
      this.logger.error(
        `Audit write failed requestId=${input.requestId ?? context.requestId ?? 'unknown'} event=${input.event} message=${message}`
      );
    }
  }
}
