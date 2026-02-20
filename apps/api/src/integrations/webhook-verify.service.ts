import { createHash } from 'node:crypto';
import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../common/config/env.schema';
import { RedisService } from '../common/redis/redis.service';
import type { RequestWithId } from '../common/types/request-with-id';
import { PAYMENT_GATEWAY, type PaymentGateway } from '../payments/gateway';
import { Inject } from '@nestjs/common';

@Injectable()
export class WebhookVerifyService {
  private readonly logger = new Logger(WebhookVerifyService.name);

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly redisService: RedisService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway
  ) {}

  async verifyPaystackOrThrow(req: RequestWithId): Promise<void> {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    const signatureHeader = req.headers['x-paystack-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const requestId = req.requestId ?? 'unknown';

    if (!this.gateway.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn(`webhook_rejected reason=invalid_signature requestId=${requestId}`);
      throw new UnauthorizedException({
        error: {
          code: 'WEBHOOK_SIGNATURE_INVALID',
          message: 'Invalid webhook signature.',
          details: null
        }
      });
    }

    const payload = req.body as Record<string, unknown> | null | undefined;
    const skewSeconds = Number(this.configService.get('WEBHOOK_ALLOWED_SKEW_SECONDS', { infer: true }) ?? 300);
    const timestamp = this.extractTimestamp(payload);
    if (!timestamp) {
      this.logger.warn(`webhook_rejected reason=missing_timestamp requestId=${requestId}`);
      throw new UnauthorizedException({
        error: {
          code: 'WEBHOOK_TIMESTAMP_INVALID',
          message: 'Webhook timestamp missing.',
          details: null
        }
      });
    }
    const nowMs = Date.now();
    const ageSeconds = Math.abs(nowMs - timestamp.getTime()) / 1000;
    if (ageSeconds > skewSeconds) {
      this.logger.warn(`webhook_rejected reason=stale_timestamp requestId=${requestId} ageSeconds=${Math.floor(ageSeconds)}`);
      throw new UnauthorizedException({
        error: {
          code: 'WEBHOOK_TIMESTAMP_STALE',
          message: 'Webhook timestamp is outside allowed skew window.',
          details: { ageSeconds: Math.floor(ageSeconds) }
        }
      });
    }

    const eventId = this.extractEventId(payload, rawBody);
    const replayTtl = Number(this.configService.get('WEBHOOK_REPLAY_TTL_SECONDS', { infer: true }) ?? 604800);
    const key = `webhook:paystack:event:${eventId}`;
    const accepted = await this.redisService.setIfNotExists(key, '1', replayTtl);
    if (!accepted) {
      this.logger.warn(`webhook_rejected reason=replay requestId=${requestId} eventId=${eventId}`);
      throw new ConflictException({
        error: {
          code: 'WEBHOOK_REPLAY',
          message: 'Duplicate webhook event rejected.',
          details: { eventId }
        }
      });
    }
  }

  private extractTimestamp(payload: Record<string, unknown> | null | undefined): Date | null {
    const rootCandidates = [payload?.created_at, payload?.createdAt, payload?.timestamp];
    for (const value of rootCandidates) {
      const parsed = this.parseTimestamp(value);
      if (parsed) return parsed;
    }

    const data = payload?.data as Record<string, unknown> | undefined;
    const nestedCandidates = [data?.created_at, data?.createdAt, data?.paid_at, data?.transaction_date];
    for (const value of nestedCandidates) {
      const parsed = this.parseTimestamp(value);
      if (parsed) return parsed;
    }
    return null;
  }

  private parseTimestamp(value: unknown): Date | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const ms = value > 1_000_000_000_000 ? value : value * 1000;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string' && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return this.parseTimestamp(numeric);
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private extractEventId(payload: Record<string, unknown> | null | undefined, rawBody: string): string {
    const event = payload?.event;
    const data = payload?.data as Record<string, unknown> | undefined;
    const idCandidate = data?.id ?? payload?.id;
    if (typeof idCandidate === 'string' && idCandidate.trim()) {
      return idCandidate.trim();
    }
    if (typeof idCandidate === 'number' && Number.isFinite(idCandidate)) {
      return String(idCandidate);
    }
    return createHash('sha256').update(`${String(event ?? 'unknown')}:${rawBody}`).digest('hex');
  }
}

