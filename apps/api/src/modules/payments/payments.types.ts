export type ProviderVerifyStatus = 'SUCCEEDED' | 'FAILED' | 'PENDING';

export type InitCollectionInput = {
  amountMinor: number;
  currency: string;
  email?: string;
  reference: string;
  metadata?: Record<string, unknown>;
};

export type InitCollectionResult = {
  authorizationUrl: string;
  reference: string;
  raw: unknown;
};

export type VerifyCollectionResult = {
  status: ProviderVerifyStatus;
  amountMinor: number;
  feeMinor?: number;
  providerIntentId?: string;
  raw: unknown;
};

export type InitPayoutInput = {
  amountMinor: number;
  currency: string;
  reference: string;
  recipientCode: string;
  reason?: string;
};

export type InitPayoutResult = {
  providerReference: string;
  providerIntentId?: string;
  raw: unknown;
};

export type VerifyPayoutResult = {
  status: ProviderVerifyStatus;
  providerIntentId?: string;
  raw: unknown;
};

export interface PaymentsProvider {
  initCollection(input: InitCollectionInput): Promise<InitCollectionResult>;
  verifyCollection(reference: string): Promise<VerifyCollectionResult>;
  initPayout(input: InitPayoutInput): Promise<InitPayoutResult>;
  verifyPayout(reference: string): Promise<VerifyPayoutResult>;
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
}

