import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainEvent, assertEventShape } from './domain-events';

@Injectable()
export class OutboxService {
  async writeOutboxEvent(
    prismaTx: Prisma.TransactionClient,
    event: DomainEvent<unknown>
  ): Promise<void> {
    const validated = assertEventShape(event);
    await (prismaTx as any).outboxEvent.create({
      data: {
        id: validated.eventId,
        tenantId: validated.tenantId,
        aggregateType: validated.aggregateType,
        aggregateId: validated.aggregateId,
        eventType: validated.eventType,
        payload: validated.payload as Prisma.InputJsonValue,
        traceId: validated.traceId ?? null,
        correlationId: validated.correlationId ?? null,
        causationId: validated.causationId ?? null,
        createdAt: new Date(validated.occurredAt)
      }
    });
  }
}

