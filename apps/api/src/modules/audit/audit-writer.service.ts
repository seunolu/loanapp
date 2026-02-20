import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';

export type ComplianceAuditWriteInput = {
  tenantId: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  tx?: Prisma.TransactionClient;
};

const REDACT_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'refreshToken', 'accessToken'];

function redact(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => redact(item));
  }
  if (input && typeof input === 'object') {
    const source = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        out[key] = '[REDACTED]';
        continue;
      }
      out[key] = redact(value);
    }
    return out;
  }
  return input;
}

@Injectable()
export class AuditWriterService {
  private readonly logger = new Logger(AuditWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService
  ) {}

  async recordEvent(input: ComplianceAuditWriteInput): Promise<void> {
    const context = this.requestContext.get();
    const db = (input.tx ?? this.prisma) as any;

    try {
      await db.auditEvent.create({
        data: {
          tenantId: input.tenantId,
          requestId: input.requestId ?? context.requestId ?? null,
          ipAddress: input.ipAddress ?? context.ip ?? null,
          userAgent: input.userAgent ?? context.userAgent ?? null,
          actorType: 'TENANT_ADMIN',
          actorId: input.actorUserId ?? context.actorId ?? null,
          actorRole: input.actorRole ?? context.actorRole ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadataJson:
            input.metadata == null ? Prisma.JsonNull : (redact(input.metadata) as Prisma.InputJsonValue)
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Audit write failed action=${input.action} entity=${input.entityType}:${input.entityId} message=${message}`);
    }
  }
}
