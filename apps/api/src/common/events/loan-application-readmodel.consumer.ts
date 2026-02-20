import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StreamConsumerRunner, type StreamMessage } from './stream-consumer';
import type { Env } from '../config/env.schema';

@Injectable()
export class LoanApplicationReadModelConsumer implements OnModuleInit, OnModuleDestroy {
  private runner: StreamConsumerRunner | null = null;
  private readonly logger = new Logger(LoanApplicationReadModelConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService<Env, true>
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled = this.configService.get('EVENT_STREAM_CONSUMERS_ENABLED', { infer: true });
    if (!enabled) {
      this.logger.warn('event stream consumers are disabled by configuration');
      return;
    }
    this.runner = new StreamConsumerRunner(
      this.prisma,
      this.redisService,
      {
        consumerName: 'readmodel-loanapps',
        stream: this.configService.get('OUTBOX_STREAM', { infer: true }),
        group: 'readmodels',
        blockMs: 2000,
        count: 20
      },
      (message) => this.handleMessage(message)
    );
    await this.runner.start();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.runner) {
      await this.runner.stop();
      this.runner = null;
    }
  }

  private async handleMessage(message: StreamMessage): Promise<void> {
    const eventId = message.values.eventId;
    const eventType = message.values.eventType;
    const tenantId = message.values.tenantId;
    const aggregateId = message.values.aggregateId;
    const payloadRaw = message.values.payload;

    if (!eventId || !eventType || !tenantId || !aggregateId) {
      return;
    }

    const already = await (this.prisma as any).processedEvent.findUnique({
      where: {
        eventId_consumerName: {
          eventId,
          consumerName: 'readmodel-loanapps'
        }
      }
    });
    if (already) {
      return;
    }

    const payload = this.safeParsePayload(payloadRaw);
    await this.prisma.$transaction(async (tx) => {
      if (eventType === 'loan_application.submitted') {
        await (tx as any).loanApplicationReadModel.upsert({
          where: { id: aggregateId },
          create: {
            id: aggregateId,
            tenantId,
            status: String((payload as any).status ?? 'SUBMITTED'),
            createdAt: new Date(),
            updatedAt: new Date(),
            borrowerName: typeof (payload as any).borrowerName === 'string' ? (payload as any).borrowerName : null,
            amountRequested: this.decimalOrNull((payload as any).amount),
            amount: this.intOrNull((payload as any).amountMinor ?? (payload as any).amount),
            tenorMonths: this.intOrNull((payload as any).tenorMonths),
            productCode: typeof (payload as any).productCode === 'string' ? (payload as any).productCode : null,
            riskBand: typeof (payload as any).riskBand === 'string' ? (payload as any).riskBand : null
          },
          update: {
            status: String((payload as any).status ?? 'SUBMITTED'),
            updatedAt: new Date()
          }
        });
      } else if (eventType === 'loan_application.status_transitioned') {
        await (tx as any).loanApplicationReadModel.upsert({
          where: { id: aggregateId },
          create: {
            id: aggregateId,
            tenantId,
            status: String((payload as any).to ?? 'UNKNOWN'),
            createdAt: new Date(),
            updatedAt: new Date()
          },
          update: {
            status: String((payload as any).to ?? 'UNKNOWN'),
            updatedAt: new Date()
          }
        });
      } else if (eventType === 'disbursement.completed' || eventType === 'repayment.posted') {
        await (tx as any).loanApplicationReadModel.updateMany({
          where: { id: aggregateId, tenantId },
          data: { updatedAt: new Date() }
        });
      }

      await (tx as any).processedEvent.create({
        data: {
          eventId,
          consumerName: 'readmodel-loanapps'
        }
      });
    });
  }

  private safeParsePayload(payloadRaw?: string): Record<string, unknown> {
    if (!payloadRaw) return {};
    try {
      const parsed = JSON.parse(payloadRaw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  private decimalOrNull(value: unknown): Prisma.Decimal | null {
    if (value == null) return null;
    try {
      return new Prisma.Decimal(value as string | number);
    } catch {
      return null;
    }
  }

  private intOrNull(value: unknown): number | null {
    if (value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }
}
