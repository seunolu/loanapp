import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentStatus, Prisma, WebhookEventStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { Env } from '../../common/config/env.schema';
import { PrismaService } from '../../common/database/prisma.service';
import { RepaymentProcessorService } from '../payments/repayment-processor.service';

type HandlePaystackWebhookInput = {
  signature?: string;
  rawBody?: Buffer;
  payload: unknown;
  requestId: string | null;
};

type HandleStatus = 'PROCESSED' | 'IGNORED' | 'REJECTED';

export type WebhookHandleResult = {
  ok: true;
  status: HandleStatus;
};

@Injectable({ scope: Scope.REQUEST })
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly auditService: AuditService,
    private readonly repaymentProcessorService: RepaymentProcessorService
  ) {}

  async handlePaystackWebhook(input: HandlePaystackWebhookInput): Promise<WebhookHandleResult> {
    const shouldBypassSignature = this.configService.get('PAYSTACK_DISABLE_SIGNATURE_VERIFY', {
      infer: true
    });
    const secret = this.configService.get('PAYSTACK_WEBHOOK_SECRET', { infer: true });
    const rawBody = input.rawBody ?? Buffer.from(JSON.stringify(input.payload ?? {}));
    const signatureValid =
      shouldBypassSignature || this.isValidPaystackSignature(input.signature, rawBody, secret);

    const payload = this.toJsonValue(input.payload);
    const eventType = this.getEventType(input.payload);

    const webhookEvent = await this.prisma.webhookEvent.create({
      data: {
        provider: PaymentProvider.PAYSTACK,
        eventType,
        signature: input.signature?.trim() || null,
        signatureValid,
        payload
      },
      select: { id: true }
    });

    if (!signatureValid) {
      await this.prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: WebhookEventStatus.REJECTED,
          processedAt: new Date()
        }
      });

      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid Paystack webhook signature.',
        details: null
      });
    }

    if (eventType !== 'charge.success' && eventType !== 'charge.failed') {
      await this.markIgnored(webhookEvent.id);
      return { ok: true, status: 'IGNORED' };
    }

    const providerRef = this.getReference(input.payload);
    if (!providerRef) {
      await this.markIgnored(webhookEvent.id);
      return { ok: true, status: 'IGNORED' };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          provider: PaymentProvider.PAYSTACK,
          providerRef
        },
        select: {
          id: true,
          borrowerId: true,
          status: true
        }
      });

      if (!payment) {
        await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: WebhookEventStatus.IGNORED,
            processedAt: new Date()
          }
        });
        return { status: 'IGNORED' as const };
      }

      const targetStatus =
        eventType === 'charge.success' ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;
      if (payment.status === targetStatus) {
        await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: WebhookEventStatus.PROCESSED,
            paymentId: payment.id,
            processedAt: new Date()
          }
        });
        return { status: 'PROCESSED' as const, changed: false, paymentId: payment.id };
      }

      if (payment.status === PaymentStatus.SUCCEEDED || payment.status === PaymentStatus.FAILED) {
        await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: WebhookEventStatus.IGNORED,
            paymentId: payment.id,
            processedAt: new Date()
          }
        });
        return { status: 'IGNORED' as const };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: targetStatus
        }
      });

      await tx.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: WebhookEventStatus.PROCESSED,
          paymentId: payment.id,
          processedAt: new Date()
        }
      });

      return {
        status: 'PROCESSED' as const,
        changed: true,
        paymentId: payment.id,
        borrowerId: payment.borrowerId,
        targetStatus
      };
    });

    if (result.status === 'PROCESSED' && result.changed) {
      await this.auditService.write({
        event: 'PAYMENT_WEBHOOK_PROCESSED',
        actorType: 'SYSTEM',
        actorId: null,
        metadata: {
          entityType: 'PAYMENT',
          entityId: result.paymentId,
          provider: 'PAYSTACK',
          eventType,
          status: result.targetStatus,
          borrowerId: result.borrowerId
        }
      });
    }

    if (eventType === 'charge.success' && result.status === 'PROCESSED' && 'paymentId' in result) {
      await this.repaymentProcessorService.applyPayment(result.paymentId);
    }

    return { ok: true, status: result.status };
  }

  private isValidPaystackSignature(
    providedSignature: string | undefined,
    rawBody: Buffer,
    secret: string
  ): boolean {
    if (!providedSignature || !providedSignature.trim()) {
      return false;
    }

    const normalized = providedSignature.trim().toLowerCase();
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    if (normalized.length !== expected.length) {
      return false;
    }

    try {
      return timingSafeEqual(Buffer.from(normalized, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  private toJsonValue(payload: unknown): Prisma.InputJsonValue {
    if (payload === null || payload === undefined) {
      return {};
    }

    return payload as Prisma.InputJsonValue;
  }

  private getEventType(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const raw = (payload as { event?: unknown }).event;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }

  private getReference(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const data = (payload as { data?: unknown }).data;
    if (!data || typeof data !== 'object') {
      return null;
    }

    const reference = (data as { reference?: unknown }).reference;
    return typeof reference === 'string' && reference.trim() ? reference.trim() : null;
  }

  private async markIgnored(webhookEventId: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        status: WebhookEventStatus.IGNORED,
        processedAt: new Date()
      }
    });
  }
}
