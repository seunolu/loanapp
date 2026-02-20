import { Injectable } from '@nestjs/common';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { ConsoleSmsProvider } from './providers/console-sms.provider';

@Injectable()
export class IntegrationsNotificationsService {
  constructor(
    private readonly smsProvider: ConsoleSmsProvider,
    private readonly emailProvider: ConsoleEmailProvider
  ) {}

  async sendRepaymentReceipt(
    tenantId: string,
    borrowerContact: { phone?: string | null; email?: string | null },
    amountMinor: number,
    reference: string
  ): Promise<void> {
    const body = `Repayment received. Amount: ${(amountMinor / 100).toFixed(2)} NGN. Ref: ${reference}.`;
    if (borrowerContact.phone) {
      await this.smsProvider.sendSms({ to: borrowerContact.phone, message: body });
    }
    if (borrowerContact.email) {
      await this.emailProvider.sendEmail({
        to: borrowerContact.email,
        subject: 'Repayment Receipt',
        html: `<p>${body}</p><p>Tenant: ${tenantId}</p>`
      });
    }
  }

  async sendDisbursementNotice(
    tenantId: string,
    borrowerContact: { phone?: string | null; email?: string | null },
    amountMinor: number,
    reference: string
  ): Promise<void> {
    const body = `Disbursement successful. Amount: ${(amountMinor / 100).toFixed(2)} NGN. Ref: ${reference}.`;
    if (borrowerContact.phone) {
      await this.smsProvider.sendSms({ to: borrowerContact.phone, message: body });
    }
    if (borrowerContact.email) {
      await this.emailProvider.sendEmail({
        to: borrowerContact.email,
        subject: 'Disbursement Notice',
        html: `<p>${body}</p><p>Tenant: ${tenantId}</p>`
      });
    }
  }

  async sendPaymentFailed(
    tenantId: string,
    borrowerContact: { phone?: string | null; email?: string | null },
    reference: string
  ): Promise<void> {
    const body = `Payment failed. Ref: ${reference}. Please retry or contact support.`;
    if (borrowerContact.phone) {
      await this.smsProvider.sendSms({ to: borrowerContact.phone, message: body });
    }
    if (borrowerContact.email) {
      await this.emailProvider.sendEmail({
        to: borrowerContact.email,
        subject: 'Payment Failed',
        html: `<p>${body}</p><p>Tenant: ${tenantId}</p>`
      });
    }
  }
}

