export type PaymentInitializeInput = {
  amountKobo: number;
  reference: string;
  metadata?: Record<string, unknown>;
};

export type PaymentInitializeResult = {
  provider: 'PAYSTACK';
  providerRef: string;
  authorizationUrl: string;
};

export interface PaymentProviderAdapter {
  initialize(input: PaymentInitializeInput): Promise<PaymentInitializeResult>;
}
