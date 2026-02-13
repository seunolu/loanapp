import { Injectable } from '@nestjs/common';
import type {
  PaymentInitializeInput,
  PaymentInitializeResult,
  PaymentProviderAdapter
} from './payment-provider.interface';

@Injectable()
export class PaystackStubProvider implements PaymentProviderAdapter {
  async initialize(input: PaymentInitializeInput): Promise<PaymentInitializeResult> {
    const providerRef = `pstk_stub_${input.reference.toLowerCase()}`;
    return {
      provider: 'PAYSTACK',
      providerRef,
      authorizationUrl: `https://paystack.stub.local/authorize/${encodeURIComponent(providerRef)}`
    };
  }
}
