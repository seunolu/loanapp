import { ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestContextStore } from '../request-context/request-context.store';
import { prismaTenantMiddleware } from './prisma-tenant.middleware';

const IMMUTABLE_LEDGER_MODELS = new Set(['TenantLedgerEntry', 'TenantLedgerLine', 'JournalEntry', 'JournalLine', 'AuditEvent']);

export function assertImmutableLedgerMutation(model: string | undefined, action: string): void {
  if (!model) return;
  if (!IMMUTABLE_LEDGER_MODELS.has(model)) return;
  if (action !== 'update' && action !== 'updateMany' && action !== 'delete' && action !== 'deleteMany') return;
  throw new ForbiddenException({
    code: 'FORBIDDEN',
    message: `${model} is immutable and append-only.`,
    details: { model, action }
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private middlewaresRegistered = false;

  constructor(private readonly requestContextStore: RequestContextStore) {
    super();
  }

  async onModuleInit(): Promise<void> {
    if (!this.middlewaresRegistered) {
      this.$use(prismaTenantMiddleware(this, this.requestContextStore));
      this.middlewaresRegistered = true;
    }

    this.$use(async (params, next) => {
      assertImmutableLedgerMutation(params.model, params.action);

      if (params.model === 'PaymentIntent' && params.action === 'update') {
        const nextStatus = (params.args?.data?.status as string | undefined) ?? null;
        if (nextStatus === 'PENDING') {
          const id = params.args?.where?.id as string | undefined;
          if (id) {
            const rows = await this.$queryRaw<Array<{ status: string }>>`SELECT "status"::text as "status" FROM "PaymentIntent" WHERE "id" = ${id} LIMIT 1`;
            const current = rows[0]?.status ?? null;
            if (current === 'SUCCEEDED') {
              throw new ForbiddenException({
                code: 'FORBIDDEN',
                message: 'PaymentIntent cannot move from SUCCEEDED to PENDING.',
                details: { id, from: current, to: nextStatus }
              });
            }
          }
        }
      }

      if (params.model === 'PayoutIntent' && params.action === 'update') {
        const nextStatus = (params.args?.data?.status as string | undefined) ?? null;
        if (nextStatus === 'PROCESSING') {
          const id = params.args?.where?.id as string | undefined;
          if (id) {
            const rows = await this.$queryRaw<Array<{ status: string }>>`SELECT "status"::text as "status" FROM "PayoutIntent" WHERE "id" = ${id} LIMIT 1`;
            const current = rows[0]?.status ?? null;
            if (current === 'SUCCEEDED') {
              throw new ForbiddenException({
                code: 'FORBIDDEN',
                message: 'PayoutIntent cannot move from SUCCEEDED to PROCESSING.',
                details: { id, from: current, to: nextStatus }
              });
            }
          }
        }
      }

      const startedAt = Date.now();
      try {
        return await next(params);
      } finally {
        const durationMs = Date.now() - startedAt;
        if (durationMs > 500) {
          const args = (params.args ?? {}) as Record<string, unknown>;
          const where = (args.where ?? {}) as Record<string, unknown>;
          const data = (args.data ?? {}) as Record<string, unknown>;
          const tenantId =
            (typeof where.tenantId === 'string' && where.tenantId) ||
            (typeof where.lenderId === 'string' && where.lenderId) ||
            (typeof data.tenantId === 'string' && data.tenantId) ||
            (typeof data.lenderId === 'string' && data.lenderId) ||
            null;
          const requestId = (typeof data.requestId === 'string' && data.requestId) || null;

          this.logger.warn(
            JSON.stringify({
              event: 'prisma_slow_query',
              durationMs,
              model: params.model ?? 'raw',
              action: params.action,
              tenantId,
              requestId
            })
          );
        }
      }
    });
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
