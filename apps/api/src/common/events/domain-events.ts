import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export type DomainEvent<TPayload> = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
  traceId?: string;
  correlationId?: string;
  causationId?: string;
};

const baseDomainEventSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  eventVersion: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  tenantId: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  payload: z.unknown(),
  traceId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  causationId: z.string().min(1).optional()
});

const loanApplicationSubmittedPayload = z.object({
  loanApplicationId: z.string().min(1),
  status: z.string().min(1),
  amount: z.union([z.string(), z.number()]).optional(),
  tenorMonths: z.number().int().positive().optional()
});

const loanApplicationStatusTransitionedPayload = z.object({
  from: z.string().nullable(),
  to: z.string().min(1),
  actorRole: z.string().min(1),
  actorId: z.string().min(1).optional()
});

const disbursementCompletedPayload = z.object({
  disbursementId: z.string().min(1),
  amount: z.union([z.string(), z.number()]),
  channel: z.string().min(1)
});

const repaymentPostedPayload = z.object({
  repaymentId: z.string().min(1),
  amount: z.union([z.string(), z.number()]),
  method: z.string().min(1)
});

const collectionsEscalatedPayload = z.object({
  caseId: z.string().min(1),
  reason: z.string().min(1),
  stage: z.string().min(1)
});

const eventSchemas = {
  'loan_application.submitted': baseDomainEventSchema.extend({
    eventType: z.literal('loan_application.submitted'),
    eventVersion: z.literal(1),
    payload: loanApplicationSubmittedPayload
  }),
  'loan_application.status_transitioned': baseDomainEventSchema.extend({
    eventType: z.literal('loan_application.status_transitioned'),
    eventVersion: z.literal(1),
    payload: loanApplicationStatusTransitionedPayload
  }),
  'disbursement.completed': baseDomainEventSchema.extend({
    eventType: z.literal('disbursement.completed'),
    eventVersion: z.literal(1),
    payload: disbursementCompletedPayload
  }),
  'repayment.posted': baseDomainEventSchema.extend({
    eventType: z.literal('repayment.posted'),
    eventVersion: z.literal(1),
    payload: repaymentPostedPayload
  }),
  'collections.escalated': baseDomainEventSchema.extend({
    eventType: z.literal('collections.escalated'),
    eventVersion: z.literal(1),
    payload: collectionsEscalatedPayload
  })
} as const;

type SupportedEventType = keyof typeof eventSchemas;

export function buildEvent<TPayload>(input: {
  eventType: SupportedEventType;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
  traceId?: string;
  correlationId?: string;
  causationId?: string;
  eventId?: string;
  occurredAt?: string;
}): DomainEvent<TPayload> {
  return {
    eventId: input.eventId ?? randomUUID(),
    eventType: input.eventType,
    eventVersion: 1,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    tenantId: input.tenantId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: input.payload,
    traceId: input.traceId,
    correlationId: input.correlationId,
    causationId: input.causationId
  };
}

export function assertEventShape(event: DomainEvent<unknown>): DomainEvent<unknown> {
  const schema = (eventSchemas as Record<string, z.ZodTypeAny>)[event.eventType] ?? baseDomainEventSchema;
  return schema.parse(event) as DomainEvent<unknown>;
}

