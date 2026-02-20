import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JobType, PaymentEventType, PaymentProvider, Prisma, WebhookEventStatus } from '@prisma/client';
import { PrismaService } from '../common/database/prisma.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { JobQueueService } from '../common/jobs/job-queue.service';
import { RedisLockService } from '../common/locks/redis-lock.service';
import type { RequestWithId } from '../common/types/request-with-id';
import { PAYMENT_GATEWAY, PaymentGateway } from '../payments/gateway';
import { PaymentIntentsService } from '../modules/payments/payment-intents.service';
import { MandatesService } from '../modules/payments/mandates.service';
import { IntegrationsNotificationsService } from './notifications/notifications.service';
import { WebhookVerifyService } from './webhook-verify.service';

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobQueueService: JobQueueService,
    private readonly paymentIntentsService: PaymentIntentsService,
    private readonly mandatesService: MandatesService,
    private readonly notificationsService: IntegrationsNotificationsService,
    private readonly webhookVerifyService: WebhookVerifyService,
    private readonly idempotencyService: IdempotencyService,
    private readonly redisLockService: RedisLockService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway
  ) {}

  async receivePaystackWebhook(req: RequestWithId): Promise<{ ok: true; status: 'RECEIVED' | 'IGNORED' }> {
    await this.webhookVerifyService.verifyPaystackOrThrow(req);
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    const signatureHeader = req.headers['x-paystack-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const signatureValid = this.gateway.verifyWebhookSignature(rawBody, signature);
    const normalized = this.gateway.normalizeWebhook(req.body);
    const providerEventId = normalized.providerEventId ?? null;
    const reference = 'reference' in normalized ? normalized.reference ?? null : null;

    if (providerEventId) {
      const existing = await this.prisma.webhookEvent.findFirst({
        where: { provider: PaymentProvider.PAYSTACK, providerEventId },
        select: { id: true, status: true }
      });
      if (existing) {
        return { ok: true, status: existing.status === WebhookEventStatus.RECEIVED ? 'RECEIVED' : 'IGNORED' };
      }
    }

    const saved = await this.prisma.webhookEvent.create({
      data: {
        provider: PaymentProvider.PAYSTACK,
        eventType: normalized.type,
        providerEventId,
        reference,
        signature: signature ?? null,
        signatureValid,
        payload: (normalized.raw ?? req.body ?? {}) as Prisma.InputJsonValue,
        status: signatureValid ? WebhookEventStatus.RECEIVED : WebhookEventStatus.REJECTED,
        processedAt: signatureValid ? null : new Date(),
        processingError: signatureValid ? null : 'Invalid signature'
      },
      select: { id: true }
    });

    if (!signatureValid || normalized.type === 'IGNORED' || !reference) {
      if (normalized.type === 'IGNORED') {
        await this.prisma.webhookEvent.update({
          where: { id: saved.id },
          data: { status: WebhookEventStatus.IGNORED, processedAt: new Date() }
        });
      }
      return { ok: true, status: 'IGNORED' };
    }

    const tenantId = await this.resolveTenantByReference(reference);
    if (!tenantId) {
      await this.prisma.webhookEvent.update({
        where: { id: saved.id },
        data: { status: WebhookEventStatus.IGNORED, processedAt: new Date(), processingError: 'Unknown reference' }
      });
      return { ok: true, status: 'IGNORED' };
    }

    const dedupeKey = `paystack_webhook:${providerEventId ?? createHash('sha256').update(`${normalized.type}:${reference}`).digest('hex')}`;
    await this.jobQueueService.enqueueJob({
      type: JobType.PROCESS_WEBHOOK_EVENT,
      tenantId,
      dedupeKey,
      payload: { webhookEventId: saved.id, provider: 'PAYSTACK' },
      requestId: req.requestId ?? null,
      actor: { type: 'SYSTEM', id: null, role: 'SYSTEM' }
    });

    return { ok: true, status: 'RECEIVED' };
  }

  async processWebhookEvent(webhookEventId: string): Promise<void> {
    const lock = await this.redisLockService.acquireLock(`lock:webhook:${webhookEventId}`, 30_000);
    if (!lock) {
      return;
    }
    try {
      const isFirst = await this.idempotencyService.record(`webhook_process:${webhookEventId}`, 24 * 60 * 60);
      if (!isFirst) {
        return;
      }

    const event = await this.prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
    if (!event) {
      return;
    }
    if (event.status === WebhookEventStatus.PROCESSED || event.status === WebhookEventStatus.IGNORED) {
      return;
    }
    if (!event.signatureValid) {
      return;
    }

    const normalized = this.gateway.normalizeWebhook(event.payload);
    if (normalized.type === 'IGNORED') {
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: WebhookEventStatus.IGNORED, processedAt: new Date() }
      });
      return;
    }

    const reference = 'reference' in normalized ? normalized.reference : null;
    if (!reference) {
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { status: WebhookEventStatus.IGNORED, processedAt: new Date(), processingError: 'Missing reference' }
      });
      return;
    }

    try {
      if (normalized.type === 'PAYMENT_SUCCEEDED' || normalized.type === 'PAYMENT_FAILED') {
        const intent = await this.paymentIntentsService.verifyByReference(reference, {
          actorType: 'SYSTEM',
          actorId: null,
          actorRole: 'SYSTEM'
        });
        if (!intent) {
          await this.markIgnored(event.id, 'Intent not found');
          return;
        }

        await this.recordWebhookPaymentEvent(intent.id, intent.tenantId, null, normalized, event.payload);
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            tenantId: intent.tenantId,
            processedAt: new Date(),
            status: WebhookEventStatus.PROCESSED,
            processingError: null
          }
        });

        if (normalized.type === 'PAYMENT_SUCCEEDED') {
          await this.tryActivateMandateFromSetupWebhook(intent.tenantId, event.payload);
        }
        await this.mandatesService.syncDebitStatusFromPaymentIntent(intent.id);

        if (intent.status === 'SUCCEEDED') {
          await this.notificationsService.sendRepaymentReceipt(
            intent.tenantId,
            { phone: intent.borrowerId ?? null, email: null },
            intent.amountMinor,
            intent.providerReference ?? intent.id
          );
        } else if (intent.status === 'FAILED') {
          await this.notificationsService.sendPaymentFailed(
            intent.tenantId,
            { phone: intent.borrowerId ?? null, email: null },
            intent.providerReference ?? intent.id
          );
        }
        return;
      }

      const payout = await this.paymentIntentsService.verifyPayoutByReference(reference, {
        actorType: 'SYSTEM',
        actorId: null,
        actorRole: 'SYSTEM'
      });
      if (!payout) {
        await this.markIgnored(event.id, 'Payout not found');
        return;
      }

      const payoutWithIntent = await this.prisma.payoutIntent.findUnique({
        where: { id: payout.id },
        select: { paymentIntentId: true }
      });
      if (!payoutWithIntent?.paymentIntentId) {
        await this.markIgnored(event.id, 'Payout intent missing payment intent');
        return;
      }

      await this.recordWebhookPaymentEvent(
        payoutWithIntent.paymentIntentId,
        payout.tenantId,
        payout.id,
        normalized,
        event.payload
      );
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          tenantId: payout.tenantId,
          processedAt: new Date(),
          status: WebhookEventStatus.PROCESSED,
          processingError: null
        }
      });

      if (payout.status === 'SUCCEEDED') {
        await this.notificationsService.sendDisbursementNotice(
          payout.tenantId,
          { phone: payout.borrowerId, email: null },
          payout.amountMinor,
          payout.providerReference ?? payout.id
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      this.logger.error(`Webhook processing failed event=${event.id} reason=${message}`);
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          status: WebhookEventStatus.REJECTED,
          processedAt: new Date(),
          processingError: message
        }
      });
      throw error;
    }
    } finally {
      await lock.release();
    }
  }

  private async resolveTenantByReference(reference: string): Promise<string | null> {
    const paymentIntent = await this.prisma.paymentIntent.findFirst({
      where: { providerReference: reference },
      select: { tenantId: true }
    });
    if (paymentIntent?.tenantId) return paymentIntent.tenantId;
    const payout = await this.prisma.payoutIntent.findFirst({
      where: { providerReference: reference },
      select: { tenantId: true }
    });
    return payout?.tenantId ?? null;
  }

  private async markIgnored(webhookEventId: string, reason: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookEventStatus.IGNORED,
        processedAt: new Date(),
        processingError: reason
      }
    });
  }

  private async recordWebhookPaymentEvent(
    intentId: string,
    tenantId: string,
    payoutId: string | null,
    normalized: ReturnType<PaymentGateway['normalizeWebhook']>,
    rawPayload: unknown
  ): Promise<void> {
    try {
      await this.prisma.paymentEvent.create({
        data: {
          tenantId,
          intentId,
          payoutId,
          type: PaymentEventType.WEBHOOK,
          normalizedType: normalized.type,
          providerEventId: normalized.providerEventId ?? null,
          provider: PaymentProvider.PAYSTACK,
          raw: (rawPayload ?? {}) as Prisma.InputJsonValue,
          processedAt: new Date()
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private async tryActivateMandateFromSetupWebhook(tenantId: string, payload: unknown): Promise<void> {
    const data = this.asObject(this.asObject(payload).data);
    const metadata = this.asObject(data.metadata);
    const purpose = typeof metadata.purpose === 'string' ? metadata.purpose : null;
    if (purpose !== 'MANDATE_SETUP') {
      return;
    }
    const mandateId = typeof metadata.mandateId === 'string' ? metadata.mandateId : null;
    const authorization = this.asObject(data.authorization);
    const customer = this.asObject(data.customer);
    const authorizationCode =
      typeof authorization.authorization_code === 'string' ? authorization.authorization_code : null;
    const customerCode = typeof customer.customer_code === 'string' ? customer.customer_code : null;
    const providerMandateRef =
      typeof authorization.signature === 'string'
        ? authorization.signature
        : typeof authorization.reusable === 'boolean'
          ? `${authorizationCode ?? 'auth'}:${authorization.reusable ? 'reusable' : 'single'}`
          : null;

    if (!mandateId || !authorizationCode || !customerCode) {
      return;
    }

    await this.mandatesService.activateMandateFromWebhook(
      tenantId,
      mandateId,
      authorizationCode,
      customerCode,
      providerMandateRef
    );
  }

  private asObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }
}
