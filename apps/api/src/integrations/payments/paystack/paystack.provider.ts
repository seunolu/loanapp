import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_GATEWAY, PaymentGateway } from '../../../payments/gateway';
import type {
  CreateTransferInput,
  CreateTransferResult,
  InitPaymentInput,
  InitPaymentResult,
  PaymentsProvider,
  VerifiedWebhook,
  VerifyResult
} from '../../contracts/payments.provider';
import type { RequestWithId } from '../../../common/types/request-with-id';

@Injectable()
export class IntegrationsPaystackProvider implements PaymentsProvider {
  name: 'paystack' = 'paystack';

  constructor(@Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway) {}

  initPayment(input: InitPaymentInput): Promise<InitPaymentResult> {
    return this.gateway.initializeCharge(input);
  }

  verifyTransaction(reference: string): Promise<VerifyResult> {
    return this.gateway.verifyTransaction(reference);
  }

  createTransfer(input: CreateTransferInput): Promise<CreateTransferResult> {
    return this.gateway.initiateTransfer(input);
  }

  verifyTransfer(reference: string): Promise<CreateTransferResult> {
    return this.gateway.verifyTransfer(reference);
  }

  verifyWebhook(req: RequestWithId): VerifiedWebhook {
    const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body ?? {});
    const signature = req.headers['x-paystack-signature'];
    const signatureText = Array.isArray(signature) ? signature[0] : signature;
    if (!this.gateway.verifyWebhookSignature(rawBody, signatureText)) {
      throw new Error('Invalid paystack signature');
    }

    const normalized = this.gateway.normalizeWebhook(req.body);
    if (normalized.type === 'IGNORED') {
      return {
        provider: 'paystack',
        eventType: 'IGNORED',
        providerEventId: normalized.providerEventId,
        reference: null,
        payload: normalized.raw
      };
    }

    return {
      provider: 'paystack',
      eventType: normalized.type,
      providerEventId: normalized.providerEventId,
      reference: normalized.reference,
      transferCode: 'transferCode' in normalized ? (normalized.transferCode ?? null) : null,
      payload: normalized.raw
    };
  }
}
