export type GatewayInitializeChargeParams = {
  amountMinor: number;
  currency: string;
  email: string;
  reference: string;
  metadata?: Record<string, unknown>;
};

export type GatewayInitializeChargeResult = {
  authorizationUrl: string;
  accessCode?: string | null;
  reference: string;
  raw: unknown;
};

export type GatewayVerifyTransactionResult = {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  providerReference: string;
  amountMinor?: number;
  feeMinor?: number;
  customerCode?: string | null;
  raw: unknown;
};

export type GatewayCreateTransferRecipientParams = {
  accountNumber: string;
  bankCode: string;
  accountName?: string | null;
  currency?: string;
};

export type GatewayCreateTransferRecipientResult = {
  recipientCode: string;
  raw: unknown;
};

export type GatewayInitiateTransferParams = {
  amountMinor: number;
  currency: string;
  recipientCode: string;
  reference: string;
  reason?: string | null;
};

export type GatewayInitiateTransferResult = {
  transferCode?: string | null;
  reference: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  raw: unknown;
};

export type GatewayVerifyTransferResult = {
  transferCode?: string | null;
  reference: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
  raw: unknown;
};

export type GatewayChargeAuthorizationParams = {
  amountMinor: number;
  currency: string;
  email: string;
  authorizationCode: string;
  reference: string;
  metadata?: Record<string, unknown>;
};

export type GatewayChargeAuthorizationResult = {
  providerReference: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  raw: unknown;
};

export type NormalizedPaymentWebhook =
  | { type: 'PAYMENT_SUCCEEDED'; providerEventId: string | null; reference: string; raw: unknown }
  | { type: 'PAYMENT_FAILED'; providerEventId: string | null; reference: string; raw: unknown }
  | { type: 'TRANSFER_SUCCEEDED'; providerEventId: string | null; reference: string; transferCode?: string | null; raw: unknown }
  | { type: 'TRANSFER_FAILED'; providerEventId: string | null; reference: string; transferCode?: string | null; raw: unknown }
  | { type: 'IGNORED'; providerEventId: string | null; raw: unknown };

export interface PaymentGateway {
  initializeCharge(params: GatewayInitializeChargeParams): Promise<GatewayInitializeChargeResult>;
  verifyTransaction(reference: string): Promise<GatewayVerifyTransactionResult>;
  createTransferRecipient(params: GatewayCreateTransferRecipientParams): Promise<GatewayCreateTransferRecipientResult>;
  initiateTransfer(params: GatewayInitiateTransferParams): Promise<GatewayInitiateTransferResult>;
  verifyTransfer(reference: string): Promise<GatewayVerifyTransferResult>;
  chargeAuthorization(params: GatewayChargeAuthorizationParams): Promise<GatewayChargeAuthorizationResult>;
  normalizeWebhook(payload: unknown): NormalizedPaymentWebhook;
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
