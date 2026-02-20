import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentDirection, PaymentIntentStatus, PaymentProvider } from '@prisma/client';
import type { TenantAdminPrincipal } from '../common/auth/tenant-admin-principal';
import { PrismaService } from '../common/database/prisma.service';
import { PaymentIntentsService } from '../modules/payments/payment-intents.service';

type ListTransactionsInput = {
  status?: PaymentIntentStatus;
  direction?: PaymentDirection;
  limit?: number;
};

@Injectable()
export class IntegrationsPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentIntentsService: PaymentIntentsService
  ) {}

  async initRepayment(
    principal: TenantAdminPrincipal,
    input: { loanId: string; amountKobo: number }
  ) {
    return this.paymentIntentsService.createInboundCollectionIntent(principal, {
      loanId: input.loanId,
      amountMinor: input.amountKobo,
      currency: 'NGN',
      idempotencyKey: `admin:repayment:${principal.tenantId}:${input.loanId}:${input.amountKobo}`
    });
  }

  async initDisbursement(
    principal: TenantAdminPrincipal,
    input: {
      loanId: string;
      amountKobo: number;
      bankAccount: string;
      bankCode: string;
      beneficiaryName?: string;
    }
  ) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { tenantId: principal.tenantId, id: input.loanId },
      select: { id: true, phone: true }
    });
    if (!loan) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan not found.',
        details: null
      });
    }

    await this.paymentIntentsService.createTransferRecipient(principal, {
      borrowerId: loan.phone,
      bankCode: input.bankCode,
      accountNumber: input.bankAccount,
      accountName: input.beneficiaryName
    });

    return this.paymentIntentsService.initiateAdminDisbursement(principal, {
      loanId: input.loanId,
      amount: input.amountKobo / 100
    });
  }

  async listTransactions(principal: TenantAdminPrincipal, input: ListTransactionsInput) {
    return this.prisma.paymentIntent.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.direction ? { direction: input.direction } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(input.limit ?? 50, 1), 200)
    });
  }

  async listWebhooks(principal: TenantAdminPrincipal, input: { provider?: PaymentProvider; limit?: number }) {
    return this.prisma.webhookEvent.findMany({
      where: {
        ...(input.provider ? { provider: input.provider } : {}),
        OR: [{ tenantId: principal.tenantId }, { tenantId: null }]
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(input.limit ?? 50, 1), 200)
    });
  }
}

