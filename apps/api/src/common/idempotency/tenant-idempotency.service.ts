import { Injectable } from '@nestjs/common';
import { IdempotencyStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { IdempotencyConflictError } from '../errors/domain-errors';
import { MetricsService } from '../observability/metrics.service';

type IdempotencyScope = 'DISBURSEMENT' | 'REPAYMENT' | 'COLLECTIONS';

@Injectable()
export class TenantIdempotencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService
  ) {}

  async withIdempotency<T>(input: {
    tenantId: string;
    scope: IdempotencyScope;
    key: string;
    requestHash?: string | null;
    fn: (tx: Prisma.TransactionClient) => Promise<T>;
  }): Promise<T> {
    const key = input.key.trim();
    if (!key) {
      this.metricsService.increment('idempotency_conflict_total', input.tenantId);
      throw new IdempotencyConflictError('Idempotency key is required.');
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        tenantId_scope_key: {
          tenantId: input.tenantId,
          scope: input.scope,
          key
        }
      }
    });

    if (existing?.status === IdempotencyStatus.COMPLETED && existing.response != null) {
      return existing.response as T;
    }
    if (existing?.status === IdempotencyStatus.PENDING) {
      this.metricsService.increment('idempotency_conflict_total', input.tenantId);
      throw new IdempotencyConflictError('A request with this idempotency key is already in progress.', {
        key,
        scope: input.scope
      });
    }

    const lock = await this.prisma.idempotencyKey.upsert({
      where: {
        tenantId_scope_key: {
          tenantId: input.tenantId,
          scope: input.scope,
          key
        }
      },
      update: {
        status: IdempotencyStatus.PENDING,
        requestHash: input.requestHash ?? undefined
      },
      create: {
        key,
        tenantId: input.tenantId,
        scope: input.scope,
        requestMethod: 'INTERNAL',
        requestPath: input.scope,
        requestHash: input.requestHash ?? `${input.scope}:${key}`,
        status: IdempotencyStatus.PENDING
      }
    });

    try {
      const result = await this.prisma.$transaction(async (tx) => input.fn(tx));
      await this.prisma.idempotencyKey.update({
        where: { id: lock.id },
        data: {
          status: IdempotencyStatus.COMPLETED,
          response: (result as Prisma.InputJsonValue) ?? Prisma.JsonNull
        }
      });
      return result;
    } catch (error) {
      await this.prisma.idempotencyKey.update({
        where: { id: lock.id },
        data: { status: IdempotencyStatus.FAILED }
      });
      throw error;
    }
  }
}
