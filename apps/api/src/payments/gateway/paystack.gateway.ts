import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../common/config/env.schema';
import type {
  GatewayCreateTransferRecipientParams,
  GatewayCreateTransferRecipientResult,
  GatewayInitializeChargeParams,
  GatewayInitializeChargeResult,
  GatewayInitiateTransferParams,
  GatewayInitiateTransferResult,
  GatewayChargeAuthorizationParams,
  GatewayChargeAuthorizationResult,
  GatewayVerifyTransactionResult,
  GatewayVerifyTransferResult,
  NormalizedPaymentWebhook,
  PaymentGateway
} from './payment-gateway.interface';

type PaystackApiResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

@Injectable()
export class PaystackGateway implements PaymentGateway {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async initializeCharge(params: GatewayInitializeChargeParams): Promise<GatewayInitializeChargeResult> {
    const response = await this.request<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: params.amountMinor,
        currency: params.currency,
        email: params.email,
        reference: params.reference,
        metadata: params.metadata ?? {}
      })
    });

    return {
      authorizationUrl: response.data.authorization_url,
      accessCode: response.data.access_code,
      reference: response.data.reference,
      raw: response
    };
  }

  async verifyTransaction(reference: string): Promise<GatewayVerifyTransactionResult> {
    const response = await this.request<{
      status: string;
      amount?: number;
      fees?: number;
      reference: string;
      customer?: { customer_code?: string };
    }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });

    return {
      status: this.mapTransactionStatus(response.data.status),
      providerReference: response.data.reference,
      amountMinor: typeof response.data.amount === 'number' ? response.data.amount : undefined,
      feeMinor: typeof response.data.fees === 'number' ? response.data.fees : undefined,
      customerCode: response.data.customer?.customer_code ?? null,
      raw: response
    };
  }

  async createTransferRecipient(
    params: GatewayCreateTransferRecipientParams
  ): Promise<GatewayCreateTransferRecipientResult> {
    const response = await this.request<{ recipient_code: string }>('/transferrecipient', {
      method: 'POST',
      body: JSON.stringify({
        type: 'nuban',
        name: params.accountName ?? `${params.accountNumber}`,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: params.currency ?? 'NGN'
      })
    });

    return {
      recipientCode: response.data.recipient_code,
      raw: response
    };
  }

  async initiateTransfer(params: GatewayInitiateTransferParams): Promise<GatewayInitiateTransferResult> {
    const response = await this.request<{
      transfer_code?: string;
      reference: string;
      status: string;
    }>('/transfer', {
      method: 'POST',
      body: JSON.stringify({
        source: 'balance',
        amount: params.amountMinor,
        recipient: params.recipientCode,
        reason: params.reason ?? 'Loan disbursement',
        currency: params.currency,
        reference: params.reference
      })
    });

    return {
      transferCode: response.data.transfer_code ?? null,
      reference: response.data.reference,
      status: this.mapTransferStatus(response.data.status),
      raw: response
    };
  }

  async verifyTransfer(reference: string): Promise<GatewayVerifyTransferResult> {
    const response = await this.request<{
      transfer_code?: string;
      reference: string;
      status: string;
    }>(`/transfer/verify/${encodeURIComponent(reference)}`, {
      method: 'GET'
    });

    return {
      transferCode: response.data.transfer_code ?? null,
      reference: response.data.reference,
      status: this.mapTransferStatus(response.data.status),
      raw: response
    };
  }

  async chargeAuthorization(
    params: GatewayChargeAuthorizationParams
  ): Promise<GatewayChargeAuthorizationResult> {
    const response = await this.request<{
      status?: string;
      reference?: string;
    }>('/transaction/charge_authorization', {
      method: 'POST',
      body: JSON.stringify({
        amount: params.amountMinor,
        currency: params.currency,
        email: params.email,
        authorization_code: params.authorizationCode,
        reference: params.reference,
        metadata: params.metadata ?? {}
      })
    });

    return {
      providerReference: response.data.reference ?? params.reference,
      status: this.mapTransactionStatus(response.data.status ?? ''),
      raw: response
    };
  }

  normalizeWebhook(payload: unknown): NormalizedPaymentWebhook {
    const raw = payload ?? {};
    if (!payload || typeof payload !== 'object') {
      return { type: 'IGNORED', providerEventId: null, raw };
    }

    const eventName = (payload as { event?: unknown }).event;
    const data = (payload as { data?: unknown }).data;
    const providerEventId =
      data && typeof data === 'object' && typeof (data as { id?: unknown }).id !== 'undefined'
        ? String((data as { id: string | number }).id)
        : null;
    const reference =
      data && typeof data === 'object' && typeof (data as { reference?: unknown }).reference === 'string'
        ? (data as { reference: string }).reference
        : null;
    const transferCode =
      data && typeof data === 'object' && typeof (data as { transfer_code?: unknown }).transfer_code === 'string'
        ? (data as { transfer_code: string }).transfer_code
        : null;

    if (eventName === 'charge.success' && reference) {
      return { type: 'PAYMENT_SUCCEEDED', providerEventId, reference, raw };
    }
    if ((eventName === 'charge.failed' || eventName === 'charge.abandoned') && reference) {
      return { type: 'PAYMENT_FAILED', providerEventId, reference, raw };
    }
    if (eventName === 'transfer.success' && reference) {
      return { type: 'TRANSFER_SUCCEEDED', providerEventId, reference, transferCode, raw };
    }
    if (eventName === 'transfer.failed' && reference) {
      return { type: 'TRANSFER_FAILED', providerEventId, reference, transferCode, raw };
    }
    return { type: 'IGNORED', providerEventId, raw };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secret =
      this.configService.get('PAYSTACK_WEBHOOK_SECRET', { infer: true }) ||
      this.configService.get('PAYSTACK_SECRET_KEY', { infer: true });
    if (!signature?.trim() || !secret) {
      return false;
    }

    const provided = signature.trim().toLowerCase();
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    if (provided.length !== expected.length) {
      return false;
    }

    try {
      return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  private mapTransactionStatus(status: string): GatewayVerifyTransactionResult['status'] {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'success') return 'SUCCEEDED';
    if (normalized === 'failed' || normalized === 'abandoned' || normalized === 'reversed') return 'FAILED';
    return 'PENDING';
  }

  private mapTransferStatus(status: string): GatewayVerifyTransferResult['status'] {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'success' || normalized === 'successful') return 'SUCCEEDED';
    if (normalized === 'failed' || normalized === 'reversed') return 'FAILED';
    if (normalized === 'otp' || normalized === 'pending' || normalized === 'processing') return 'PROCESSING';
    return 'PENDING';
  }

  private async request<T>(path: string, init: RequestInit): Promise<PaystackApiResponse<T>> {
    const response = await fetch(`${this.getBaseUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.configService.get('PAYSTACK_SECRET_KEY', { infer: true })}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {})
      }
    });

    const payload = (await response.json().catch(() => null)) as PaystackApiResponse<T> | null;
    if (!response.ok || !payload?.status) {
      const message = payload?.message ?? `Paystack request failed with ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  private getBaseUrl(): string {
    return this.configService.get('PAYSTACK_BASE_URL', { infer: true });
  }
}
