import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../common/config/env.schema';
import type {
  InitCollectionInput,
  InitCollectionResult,
  InitPayoutInput,
  InitPayoutResult,
  PaymentsProvider,
  VerifyCollectionResult,
  VerifyPayoutResult
} from './payments.types';

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

@Injectable()
export class PaystackProvider implements PaymentsProvider {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly configService: ConfigService<Env, true>) {}

  async initCollection(input: InitCollectionInput): Promise<InitCollectionResult> {
    const response = await this.request<{
      authorization_url: string;
      reference: string;
    }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: input.currency,
        email: input.email ?? 'no-email@loanapp.local',
        reference: input.reference,
        metadata: input.metadata ?? {}
      })
    });

    return {
      authorizationUrl: response.data.authorization_url,
      reference: response.data.reference,
      raw: response
    };
  }

  async verifyCollection(reference: string): Promise<VerifyCollectionResult> {
    const response = await this.request<{
      id: number;
      status: string;
      amount: number;
      fees?: number;
    }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });

    return {
      status: this.mapVerifyStatus(response.data.status),
      amountMinor: Number(response.data.amount ?? 0),
      feeMinor: response.data.fees ? Number(response.data.fees) : undefined,
      providerIntentId: response.data.id ? String(response.data.id) : undefined,
      raw: response
    };
  }

  async initPayout(input: InitPayoutInput): Promise<InitPayoutResult> {
    const response = await this.request<{
      id: number;
      transfer_code: string;
      reference: string;
    }>('/transfer', {
      method: 'POST',
      body: JSON.stringify({
        source: 'balance',
        amount: input.amountMinor,
        currency: input.currency,
        reason: input.reason ?? 'Loan disbursement',
        recipient: input.recipientCode,
        reference: input.reference
      })
    });

    return {
      providerReference: response.data.reference ?? input.reference,
      providerIntentId: response.data.id ? String(response.data.id) : undefined,
      raw: response
    };
  }

  async verifyPayout(reference: string): Promise<VerifyPayoutResult> {
    const response = await this.request<{
      id: number;
      status: string;
      reference: string;
    }>(`/transfer/verify/${encodeURIComponent(reference)}`, { method: 'GET' });

    return {
      status: this.mapVerifyStatus(response.data.status),
      providerIntentId: response.data.id ? String(response.data.id) : undefined,
      raw: response
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature?.trim()) {
      return false;
    }
    const secret =
      this.configService.get('PAYSTACK_WEBHOOK_SECRET', { infer: true }) ||
      this.configService.get('PAYSTACK_SECRET_KEY', { infer: true });
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    const provided = signature.trim().toLowerCase();
    if (provided.length !== expected.length) {
      return false;
    }

    try {
      return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  private mapVerifyStatus(status: string): 'SUCCEEDED' | 'FAILED' | 'PENDING' {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'success' || normalized === 'successful') {
      return 'SUCCEEDED';
    }
    if (normalized === 'failed' || normalized === 'reversed' || normalized === 'abandoned' || normalized === 'cancelled') {
      return 'FAILED';
    }
    return 'PENDING';
  }

  private async request<T>(path: string, init: RequestInit): Promise<PaystackResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.configService.get('PAYSTACK_SECRET_KEY', { infer: true })}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    });

    const payload = (await response.json().catch(() => null)) as PaystackResponse<T> | null;
    if (!response.ok || !payload?.status) {
      const message = payload?.message ?? `Paystack request failed with ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }
}

