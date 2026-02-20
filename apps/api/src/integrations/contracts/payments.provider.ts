import type { Request } from 'express';

export type PaymentProviderName = 'paystack' | 'flutterwave';

export type InitPaymentInput = {
  amountMinor: number;
  currency: string;
  email: string;
  reference: string;
  metadata?: Record<string, unknown>;
};

export type InitPaymentResult = {
  authorizationUrl: string;
  accessCode?: string | null;
  reference: string;
  raw: unknown;
};

export type VerifyResult = {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  providerReference: string;
  amountMinor?: number;
  feeMinor?: number;
  raw: unknown;
};

export type CreateTransferInput = {
  amountMinor: number;
  currency: string;
  recipientCode: string;
  reference: string;
  reason?: string | null;
};

export type CreateTransferResult = {
  transferCode?: string | null;
  reference: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  raw: unknown;
};

export type VerifiedWebhook = {
  provider: PaymentProviderName;
  eventType: string;
  providerEventId: string | null;
  reference: string | null;
  transferCode?: string | null;
  payload: unknown;
};

export interface PaymentsProvider {
  name: PaymentProviderName;
  initPayment(input: InitPaymentInput): Promise<InitPaymentResult>;
  verifyTransaction(reference: string): Promise<VerifyResult>;
  createTransfer(input: CreateTransferInput): Promise<CreateTransferResult>;
  verifyTransfer(reference: string): Promise<CreateTransferResult>;
  verifyWebhook(req: Request): VerifiedWebhook;
}

