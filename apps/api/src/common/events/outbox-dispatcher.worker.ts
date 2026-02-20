import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PromMetricsService } from '../observability/prom-metrics.service';
import { RedisService } from '../redis/redis.service';
import type { Env } from '../config/env.schema';

@Injectable()
export class OutboxDispatcherWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<Env, true>,
    private readonly promMetrics: PromMetricsService
  ) {}

  onModuleInit(): void {
    this.running = true;
    this.tick();
    this.logger.log(
      `Outbox dispatcher started stream=${this.streamName()} pollMs=${this.pollMs()} batch=${this.batchSize()}`
    );
  }

  onModuleDestroy(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private tick(): void {
    this.timer = setTimeout(async () => {
      if (!this.running) return;
      try {
        await this.dispatchOnce();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown outbox dispatch error';
        this.logger.error(`Outbox dispatch tick failed: ${message}`);
      } finally {
        if (this.running) this.tick();
      }
    }, this.pollMs());
  }

  private streamName(): string {
    return this.configService.get('OUTBOX_STREAM', { infer: true });
  }

  private pollMs(): number {
    return this.configService.get('OUTBOX_POLL_MS', { infer: true });
  }

  private batchSize(): number {
    return this.configService.get('OUTBOX_BATCH_SIZE', { infer: true });
  }

  private maxAttempts(): number {
    return this.configService.get('OUTBOX_MAX_ATTEMPTS', { infer: true });
  }

  private async dispatchOnce(): Promise<void> {
    const batchSize = this.batchSize();
    const maxAttempts = this.maxAttempts();
    const claimedRows = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "OutboxEvent"
        WHERE "publishedAt" IS NULL
          AND "publishAttempts" < ${maxAttempts}
        ORDER BY "createdAt" ASC
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `;
      if (!claim.length) return [];
      const ids = claim.map((item) => item.id);
      return (tx as any).outboxEvent.findMany({
        where: { id: { in: ids } },
        orderBy: { createdAt: 'asc' }
      }) as Promise<Array<any>>;
    });

    if (!claimedRows.length) return;

    const redis = this.redisService.getClient();
    for (const row of claimedRows) {
      const eventType = row.eventType as string;
      try {
        await redis.xadd(
          this.streamName(),
          '*',
          'eventId',
          row.id,
          'eventType',
          row.eventType,
          'eventVersion',
          '1',
          'tenantId',
          row.tenantId,
          'aggregateType',
          row.aggregateType,
          'aggregateId',
          row.aggregateId,
          'occurredAt',
          new Date(row.createdAt).toISOString(),
          'payload',
          JSON.stringify(row.payload ?? {}),
          'traceId',
          row.traceId ?? '',
          'correlationId',
          row.correlationId ?? '',
          'causationId',
          row.causationId ?? ''
        );

        await (this.prisma as any).outboxEvent.update({
          where: { id: row.id },
          data: {
            publishedAt: new Date(),
            publishAttempts: { increment: 1 },
            lastPublishError: null
          }
        });
        this.promMetrics.incrementOutboxPublished(eventType);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown outbox publish error';
        await (this.prisma as any).outboxEvent.update({
          where: { id: row.id },
          data: {
            publishAttempts: { increment: 1 },
            lastPublishError: message.slice(0, 1000)
          }
        });
        this.promMetrics.incrementOutboxPublishFailed(eventType);
        this.logger.warn(`Outbox publish failed id=${row.id} eventType=${eventType} error=${message}`);
      }
    }
  }
}

