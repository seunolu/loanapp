import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PaymentDirection,
  PaymentIntentStatus,
  PaymentProvider,
  PayoutIntentStatus,
  Prisma,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType,
  TenantLoanApplicationStatus
} from '@prisma/client';
import { PAYMENT_GATEWAY, type PaymentGateway } from '../../payments/gateway';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { FinancialInvariantsService } from '../../common/finance/financial-invariants.service';
import { buildIdempotencyKey } from '../../common/idempotency/idempotency';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { parsePagination } from '../../common/http/pagination';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';
import { RedisLockService } from '../../common/locks/redis-lock.service';
import { PromMetricsService } from '../../common/observability/prom-metrics.service';
import type { InitInboundPaymentDto } from './dto/init-inbound-payment.dto';
import type { InitOutboundPaymentDto } from './dto/init-outbound-payment.dto';
import type { ListPaymentIntentsQueryDto } from './dto/list-payment-intents-query.dto';

type VerifyActor = { actorType: 'SYSTEM' | 'ADMIN' | 'BORROWER'; actorId?: string | null; actorRole?: string | null };

@Injectable()
export class PaymentIntentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly auditService: AuditService,
    private readonly tenantLedgerService: TenantLedgerService,
    private readonly financialInvariantsService: FinancialInvariantsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly redisLockService: RedisLockService,
    private readonly promMetricsService: PromMetricsService
  ) {}

  async initializeBorrowerRepayment(
    borrower: BorrowerPrincipal,
    input: { loanId: string; amount: number },
    idempotencyKeyOverride?: string | null
  ) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: input.loanId, tenantId: borrower.tenantId, phone: borrower.phone }
    });
    if (!loan) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Loan not found.', details: null });
    const payableStatuses = new Set<TenantLoanApplicationStatus>([
      TenantLoanApplicationStatus.DISBURSED,
      TenantLoanApplicationStatus.OVERDUE
    ]);
    if (!payableStatuses.has(loan.status)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Loan is not payable.', details: { status: loan.status } });
    }

    const amountMinor = Math.round(input.amount * 100);
    const idempotencyKey =
      idempotencyKeyOverride?.trim() ||
      buildIdempotencyKey({ scope: 'repay_init', tenantId: borrower.tenantId, loanId: loan.id, amountMinor });

    const existing = await this.prisma.paymentIntent.findFirst({
      where: { tenantId: borrower.tenantId, idempotencyKey },
      select: {
        id: true,
        tenantId: true,
        direction: true,
        provider: true,
        status: true,
        currency: true,
        amountMinor: true,
        feeMinor: true,
        netMinor: true,
        loanId: true,
        disbursementId: true,
        providerReference: true,
        createdAt: true,
        updatedAt: true,
        providerRawInit: true
      }
    });
    if (existing) {
      const authUrl =
        typeof (existing.providerRawInit as { data?: { authorization_url?: string } } | null)?.data?.authorization_url ===
        'string'
          ? (existing.providerRawInit as { data: { authorization_url: string } }).data.authorization_url
          : null;
      return { ...this.toIntent(existing), authorizationUrl: authUrl, accessCode: null };
    }

    const reference = `repay_${loan.id}_${Date.now()}`;
    const gatewayInit = await this.gateway.initializeCharge({
      amountMinor,
      currency: loan.currency,
      email: `${borrower.phone}@borrower.loanapp.local`,
      reference,
      metadata: { tenantId: borrower.tenantId, borrowerId: borrower.borrowerId, loanId: loan.id }
    });

    const intent = await this.prisma.paymentIntent.create({
      data: {
        tenantId: borrower.tenantId,
        direction: PaymentDirection.INBOUND,
        reference,
        provider: PaymentProvider.PAYSTACK,
        status: PaymentIntentStatus.PENDING,
        currency: loan.currency,
        amountMinor,
        borrowerId: borrower.borrowerId,
        loanId: loan.id,
        providerReference: gatewayInit.reference,
        providerRawInit: gatewayInit.raw as Prisma.InputJsonValue,
        idempotencyKey,
        createdByBorrowerId: borrower.borrowerId
      }
    });

    return { ...this.toIntent(intent), authorizationUrl: gatewayInit.authorizationUrl, accessCode: gatewayInit.accessCode ?? null };
  }

  async verifyBorrowerRepayment(borrower: BorrowerPrincipal, reference: string) {
    const intent = await this.prisma.paymentIntent.findFirst({
      where: { tenantId: borrower.tenantId, borrowerId: borrower.borrowerId, providerReference: reference }
    });
    if (!intent) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment intent not found.', details: null });
    return this.verifyPaymentIntent(intent, { actorType: 'BORROWER', actorId: borrower.borrowerId });
  }

  async createTransferRecipient(principal: TenantAdminPrincipal, input: { borrowerId: string; bankCode: string; accountNumber: string; accountName?: string | null }) {
    const recipient = await this.gateway.createTransferRecipient({
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
      accountName: input.accountName ?? null
    });
    return this.prisma.borrowerPayoutProfile.upsert({
      where: {
        tenantId_borrowerId_provider: { tenantId: principal.tenantId, borrowerId: input.borrowerId, provider: PaymentProvider.PAYSTACK }
      },
      update: {
        recipientCode: recipient.recipientCode,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName ?? null,
        metadata: recipient.raw as Prisma.InputJsonValue
      },
      create: {
        tenantId: principal.tenantId,
        borrowerId: input.borrowerId,
        provider: PaymentProvider.PAYSTACK,
        recipientCode: recipient.recipientCode,
        bankCode: input.bankCode,
        accountNumber: input.accountNumber,
        accountName: input.accountName ?? null,
        metadata: recipient.raw as Prisma.InputJsonValue
      }
    });
  }

  async initiateAdminDisbursement(principal: TenantAdminPrincipal, input: { loanId: string; amount?: number }) {
    this.assertCanDisburse(principal.role);
    const loan = await this.prisma.tenantLoanApplication.findFirst({ where: { tenantId: principal.tenantId, id: input.loanId } });
    if (!loan) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Loan not found.', details: null });

    const profile = await this.prisma.borrowerPayoutProfile.findUnique({
      where: {
        tenantId_borrowerId_provider: { tenantId: principal.tenantId, borrowerId: loan.phone, provider: PaymentProvider.PAYSTACK }
      }
    });
    if (!profile) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Recipient not configured.', details: null });

    const amountMinor = Math.round((input.amount ?? Number(loan.approvedAmount ?? loan.requestedAmount)) * 100);
    const reference = `payout_${loan.id}_${Date.now()}`;
    const initiated = await this.gateway.initiateTransfer({
      amountMinor,
      currency: loan.currency,
      recipientCode: profile.recipientCode,
      reference,
      reason: `Loan disbursement ${loan.id}`
    });

    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        tenantId: principal.tenantId,
        reference,
        direction: PaymentDirection.OUTBOUND,
        provider: PaymentProvider.PAYSTACK,
        status: initiated.status === 'FAILED' ? PaymentIntentStatus.FAILED : PaymentIntentStatus.PENDING,
        currency: loan.currency,
        amountMinor,
        loanId: loan.id,
        providerReference: initiated.reference,
        providerIntentId: initiated.transferCode ?? null,
        providerRawInit: initiated.raw as Prisma.InputJsonValue,
        idempotencyKey: `outbound:${buildIdempotencyKey({ scope: 'payout_init', tenantId: principal.tenantId, loanId: loan.id, amountMinor })}`,
        createdByAdminId: principal.adminId
      }
    });

    return this.prisma.payoutIntent.create({
      data: {
        tenantId: principal.tenantId,
        borrowerId: loan.phone,
        loanId: loan.id,
        amountMinor,
        currency: loan.currency,
        status: initiated.status === 'FAILED' ? PayoutIntentStatus.FAILED : PayoutIntentStatus.PROCESSING,
        provider: PaymentProvider.PAYSTACK,
        paymentIntentId: paymentIntent.id,
        providerTransferCode: initiated.transferCode ?? null,
        providerReference: initiated.reference,
        recipientCode: profile.recipientCode,
        metadata: initiated.raw as Prisma.InputJsonValue,
        idempotencyKey: buildIdempotencyKey({ scope: 'payout_init', tenantId: principal.tenantId, loanId: loan.id, amountMinor }),
        createdByAdminId: principal.adminId,
        recipientProfileId: profile.id
      }
    });
  }

  async verifyAdminDisbursement(principal: TenantAdminPrincipal, reference: string) {
    this.assertCanDisburse(principal.role);
    const payout = await this.prisma.payoutIntent.findFirst({ where: { tenantId: principal.tenantId, providerReference: reference } });
    if (!payout) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payout intent not found.', details: null });
    return this.verifyPayoutIntent(payout, { actorType: 'ADMIN', actorId: principal.adminId, actorRole: principal.role });
  }

  async createInboundCollectionIntent(principal: TenantAdminPrincipal, input: InitInboundPaymentDto) {
    if (!input.loanId) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'loanId is required.', details: null });
    }
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: input.loanId, tenantId: principal.tenantId }
    });
    if (!loan) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Loan not found.', details: null });
    }

    const payableStatuses = new Set<TenantLoanApplicationStatus>([
      TenantLoanApplicationStatus.DISBURSED,
      TenantLoanApplicationStatus.OVERDUE
    ]);
    if (!payableStatuses.has(loan.status)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan is not payable.',
        details: { status: loan.status }
      });
    }

    const amountMinor = input.amountMinor;
    const reference = `repay_${loan.id}_${Date.now()}`;
    const gatewayInit = await this.gateway.initializeCharge({
      amountMinor,
      currency: input.currency ?? loan.currency,
      email: `${loan.phone}@borrower.loanapp.local`,
      reference,
      metadata: { tenantId: principal.tenantId, borrowerId: loan.phone, loanId: loan.id }
    });

    const intent = await this.prisma.paymentIntent.create({
      data: {
        tenantId: principal.tenantId,
        reference,
        direction: PaymentDirection.INBOUND,
        provider: PaymentProvider.PAYSTACK,
        status: PaymentIntentStatus.PENDING,
        currency: input.currency ?? loan.currency,
        amountMinor,
        borrowerId: loan.phone,
        loanId: loan.id,
        providerReference: gatewayInit.reference,
        providerRawInit: gatewayInit.raw as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey,
        createdByAdminId: principal.adminId
      }
    });

    return { ...this.toIntent(intent), authorizationUrl: gatewayInit.authorizationUrl, accessCode: gatewayInit.accessCode ?? null };
  }

  async createOutboundPayoutIntent(principal: TenantAdminPrincipal, input: InitOutboundPaymentDto) {
    return this.initiateAdminDisbursement(principal, { loanId: input.disbursementId, amount: input.amountMinor / 100 });
  }

  async verifyIntent(principal: TenantAdminPrincipal, intentId: string) {
    const intent = await this.prisma.paymentIntent.findFirst({ where: { id: intentId, tenantId: principal.tenantId } });
    if (!intent) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment intent not found.', details: null });
    return this.verifyPaymentIntent(intent, { actorType: 'ADMIN', actorId: principal.adminId, actorRole: principal.role });
  }

  async verifyByReference(reference: string, actor: VerifyActor) {
    const intent = await this.prisma.paymentIntent.findFirst({ where: { providerReference: reference } });
    if (!intent) return null;
    return this.verifyPaymentIntent(intent, actor);
  }

  async verifyPayoutByReference(reference: string, actor: VerifyActor) {
    const payout = await this.prisma.payoutIntent.findFirst({ where: { providerReference: reference } });
    if (!payout) return null;
    return this.verifyPayoutIntent(payout, actor);
  }

  async handlePaystackWebhook(payload: unknown, signature: string | undefined, rawBody: string) {
    if (!this.gateway.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Invalid webhook signature.', details: null });
    }

    const normalized = this.gateway.normalizeWebhook(payload);
    if (normalized.type === 'IGNORED') return { ok: true, ignored: true };

    if (normalized.type.startsWith('PAYMENT_')) {
      const intent = await this.prisma.paymentIntent.findFirst({ where: { providerReference: normalized.reference } });
      if (!intent) return { ok: true, ignored: true };
      await this.verifyPaymentIntent(intent, { actorType: 'SYSTEM', actorId: null, actorRole: 'SYSTEM' });
      return { ok: true };
    }

    const payout = await this.prisma.payoutIntent.findFirst({ where: { providerReference: normalized.reference } });
    if (!payout) return { ok: true, ignored: true };
    await this.verifyPayoutIntent(payout, { actorType: 'SYSTEM', actorId: null, actorRole: 'SYSTEM' });
    return { ok: true };
  }

  async listIntents(principal: TenantAdminPrincipal, query: ListPaymentIntentsQueryDto) {
    const pagination = parsePagination(query);
    const rows = await this.prisma.paymentIntent.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(query.direction ? { direction: query.direction } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.loanId ? { loanId: query.loanId } : {}),
        ...(query.borrowerId ? { borrowerId: query.borrowerId } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });
    return rows.map((row) => this.toIntent(row));
  }

  async getIntent(principal: TenantAdminPrincipal, intentId: string) {
    const row = await this.prisma.paymentIntent.findFirst({
      where: { id: intentId, tenantId: principal.tenantId },
      include: { histories: { orderBy: { createdAt: 'desc' } }, events: { orderBy: { receivedAt: 'desc' }, take: 50 } }
    });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payment intent not found.', details: null });
    return { ...this.toIntent(row), histories: row.histories, events: row.events };
  }

  async listPayoutIntents(principal: TenantAdminPrincipal) {
    return this.prisma.payoutIntent.findMany({ where: { tenantId: principal.tenantId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async getPayoutIntent(principal: TenantAdminPrincipal, id: string) {
    const payout = await this.prisma.payoutIntent.findFirst({ where: { tenantId: principal.tenantId, id }, include: { paymentIntent: true } });
    if (!payout) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Payout intent not found.', details: null });
    return payout;
  }

  async reconcileStaleIntents(olderThanMinutes = 10, limit = 50) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const paymentIntents = await this.prisma.paymentIntent.findMany({ where: { status: PaymentIntentStatus.PENDING, updatedAt: { lte: cutoff }, providerReference: { not: null } }, take: limit });
    const payouts = await this.prisma.payoutIntent.findMany({ where: { status: { in: [PayoutIntentStatus.PENDING, PayoutIntentStatus.PROCESSING] }, updatedAt: { lte: cutoff }, providerReference: { not: null } }, take: limit });
    for (const intent of paymentIntents) await this.verifyPaymentIntent(intent, { actorType: 'SYSTEM', actorId: null, actorRole: 'SYSTEM' });
    for (const payout of payouts) await this.verifyPayoutIntent(payout, { actorType: 'SYSTEM', actorId: null, actorRole: 'SYSTEM' });
    return { checkedInbound: paymentIntents.length, checkedPayout: payouts.length };
  }

  private async verifyPaymentIntent(
    intent: {
      id: string;
      tenantId: string;
      providerReference: string | null;
      status: PaymentIntentStatus;
      direction: PaymentDirection;
      loanId: string | null;
    },
    actor: VerifyActor
  ) {
    const lock = await this.redisLockService.acquireLock(`lock:payment-intent:${intent.id}`, 30_000);
    if (!lock) {
      return this.prisma.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    }
    try {
      const first = await this.idempotencyService.record(`payment_intent_verify:${intent.id}`, 24 * 60 * 60);
      if (!first) {
        return this.prisma.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
      }
    if (!intent.providerReference) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Missing provider reference.', details: null });
    if (intent.status === PaymentIntentStatus.SUCCEEDED) return this.prisma.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    const verified = await this.gateway.verifyTransaction(intent.providerReference);
    if (verified.status === 'SUCCEEDED') {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.paymentIntent.update({
          where: { id: intent.id },
          data: {
            status: PaymentIntentStatus.SUCCEEDED,
            amountMinor: verified.amountMinor ?? undefined,
            feeMinor: verified.feeMinor ?? 0,
            netMinor: (verified.amountMinor ?? intent.status === PaymentIntentStatus.SUCCEEDED ? 0 : 0) || undefined,
            providerRawVerify: verified.raw as Prisma.InputJsonValue
          }
        });
        if (updated.loanId) {
          const amount = new Prisma.Decimal((verified.amountMinor ?? updated.amountMinor) - (verified.feeMinor ?? 0)).div(100).toDecimalPlaces(2);
          await this.tenantLedgerService.postEntry(
            {
              tenantId: updated.tenantId,
              occurredAt: new Date(),
              type: TenantLedgerEntryType.REPAYMENT,
              idempotencyKey: `payment-intent:${updated.id}:success`,
              referenceType: 'LoanApplication',
              referenceId: updated.loanId,
              currency: updated.currency,
              createdBy: actor.actorId ?? undefined,
              actorRole: actor.actorRole as any,
              memo: `Repayment verified ${updated.providerReference ?? updated.id}`,
              lines: [
                { accountCode: TenantLedgerAccountCode.BANK_CLEARING, direction: TenantLedgerDirection.DEBIT, amount },
                { accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE, direction: TenantLedgerDirection.CREDIT, amount }
              ]
            },
            tx
          );
        }
        await tx.paymentIntentHistory.create({
          data: { tenantId: updated.tenantId, intentId: updated.id, fromStatus: intent.status, toStatus: PaymentIntentStatus.SUCCEEDED, reason: 'Provider verify success', actorType: actor.actorType, actorId: actor.actorId ?? null }
        });
      });
      this.promMetricsService.incrementPaymentSuccess(intent.tenantId, intent.direction);
    } else if (verified.status === 'FAILED') {
      await this.prisma.paymentIntent.update({ where: { id: intent.id }, data: { status: PaymentIntentStatus.FAILED } });
      this.promMetricsService.incrementPaymentFailed(intent.tenantId, intent.direction);
    }
    const finalIntent = await this.prisma.paymentIntent.findUniqueOrThrow({ where: { id: intent.id } });
    if (finalIntent.status === PaymentIntentStatus.SUCCEEDED && finalIntent.loanId) {
      await this.financialInvariantsService.assertLoanInvariants(finalIntent.loanId);
    }
    return finalIntent;
    } finally {
      await lock.release();
    }
  }

  private async verifyPayoutIntent(
    payout: { id: string; tenantId: string; providerReference: string | null; status: PayoutIntentStatus; paymentIntentId: string | null; loanId: string; amountMinor: number; currency: string },
    actor: VerifyActor
  ) {
    const lock = await this.redisLockService.acquireLock(`lock:payout-intent:${payout.id}`, 30_000);
    if (!lock) {
      return this.prisma.payoutIntent.findUniqueOrThrow({ where: { id: payout.id } });
    }
    try {
      const first = await this.idempotencyService.record(`payout_intent_verify:${payout.id}`, 24 * 60 * 60);
      if (!first) {
        return this.prisma.payoutIntent.findUniqueOrThrow({ where: { id: payout.id } });
      }
    if (!payout.providerReference) throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Missing provider reference.', details: null });
    if (payout.status === PayoutIntentStatus.SUCCEEDED) return this.prisma.payoutIntent.findUniqueOrThrow({ where: { id: payout.id } });

    const verified = await this.gateway.verifyTransfer(payout.providerReference);
    if (verified.status === 'SUCCEEDED') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payoutIntent.update({
          where: { id: payout.id },
          data: { status: PayoutIntentStatus.SUCCEEDED, providerTransferCode: verified.transferCode ?? undefined, verifiedAt: new Date(), lastError: null }
        });
        if (payout.paymentIntentId) {
          await tx.paymentIntent.update({ where: { id: payout.paymentIntentId }, data: { status: PaymentIntentStatus.SUCCEEDED } });
        }
        const loan = await tx.tenantLoanApplication.findFirst({ where: { id: payout.loanId, tenantId: payout.tenantId } });
        if (!loan) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Loan not found.', details: null });
        const amount = new Prisma.Decimal(payout.amountMinor).div(100).toDecimalPlaces(2);
        await this.tenantLedgerService.postEntry(
          {
            tenantId: payout.tenantId,
            occurredAt: new Date(),
            type: TenantLedgerEntryType.DISBURSEMENT,
            idempotencyKey: `payout:${payout.id}:success`,
            referenceType: 'LoanApplication',
            referenceId: payout.loanId,
            currency: payout.currency,
            createdBy: actor.actorId ?? undefined,
            actorRole: actor.actorRole as any,
            memo: `Disbursement verified ${payout.id}`,
            lines: [
              { accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE, direction: TenantLedgerDirection.DEBIT, amount },
              { accountCode: TenantLedgerAccountCode.BANK_CLEARING, direction: TenantLedgerDirection.CREDIT, amount }
            ]
          },
          tx
        );
        await tx.tenantLoanApplication.update({
          where: { id: loan.id },
          data: { status: TenantLoanApplicationStatus.DISBURSED, disbursedAmount: amount, disbursedAt: new Date() }
        });
      });
      this.promMetricsService.incrementPaymentSuccess(payout.tenantId, PaymentDirection.OUTBOUND);
    } else if (verified.status === 'FAILED') {
      await this.prisma.payoutIntent.update({ where: { id: payout.id }, data: { status: PayoutIntentStatus.FAILED, lastError: 'Provider transfer failed' } });
      if (payout.paymentIntentId) {
        await this.prisma.paymentIntent.update({ where: { id: payout.paymentIntentId }, data: { status: PaymentIntentStatus.FAILED } });
      }
      this.promMetricsService.incrementPaymentFailed(payout.tenantId, PaymentDirection.OUTBOUND);
    } else {
      await this.prisma.payoutIntent.update({ where: { id: payout.id }, data: { status: PayoutIntentStatus.PROCESSING } });
    }
    const finalPayout = await this.prisma.payoutIntent.findUniqueOrThrow({ where: { id: payout.id } });
    if (finalPayout.status === PayoutIntentStatus.SUCCEEDED) {
      await this.financialInvariantsService.assertLoanInvariants(finalPayout.loanId);
    }
    return finalPayout;
    } finally {
      await lock.release();
    }
  }

  private assertCanDisburse(role: string) {
    if (!(role === 'OPS' || role === 'SUPER_ADMIN' || role === 'SYSTEM')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Role cannot perform disbursement action.', details: null });
    }
  }

  private toIntent(row: { id: string; tenantId: string; direction: PaymentDirection; provider: PaymentProvider; status: PaymentIntentStatus; currency: string; amountMinor: number; feeMinor: number | null; netMinor: number | null; loanId: string | null; disbursementId: string | null; providerReference: string | null; reference?: string | null; createdAt: Date; updatedAt: Date }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      direction: row.direction,
      provider: row.provider,
      status: row.status,
      currency: row.currency,
      amountMinor: row.amountMinor,
      feeMinor: row.feeMinor,
      netMinor: row.netMinor,
      loanId: row.loanId,
      disbursementId: row.disbursementId,
      reference: row.reference ?? null,
      providerReference: row.providerReference,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
