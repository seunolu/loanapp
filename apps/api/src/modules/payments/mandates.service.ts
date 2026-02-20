import { createHash } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JobType, MandateStatus, PaymentDirection, PaymentIntentStatus, PaymentProvider, Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import type { BorrowerPrincipal } from '../../common/auth/borrower-principal';
import type { TenantAdminPrincipal } from '../../common/auth/tenant-admin-principal';
import { PrismaService } from '../../common/database/prisma.service';
import { buildIdempotencyKey } from '../../common/idempotency/idempotency';
import { parsePagination } from '../../common/http/pagination';
import { JobQueueService } from '../../common/jobs/job-queue.service';
import { PAYMENT_GATEWAY, type PaymentGateway } from '../../payments/gateway';
import { Inject } from '@nestjs/common';
import { PromMetricsService } from '../../common/observability/prom-metrics.service';
import type { ListMandatesQueryDto, SetupMandateDto } from './dto/mandates.dto';

const ADMIN_MUTATION_ROLES = new Set(['OPS', 'SUPER_ADMIN']);

@Injectable()
export class MandatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly jobQueueService: JobQueueService,
    private readonly promMetricsService: PromMetricsService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway
  ) {}

  async setupBorrowerMandate(
    borrower: BorrowerPrincipal,
    input: SetupMandateDto,
    idempotencyKeyHeader?: string | null
  ) {
    const loan = await this.prisma.tenantLoanApplication.findFirst({
      where: { id: input.loanId, tenantId: borrower.tenantId, phone: borrower.phone },
      select: { id: true, tenantId: true, currency: true, status: true }
    });
    if (!loan) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Loan not found.', details: null });
    }
    if (!(loan.status === 'DISBURSED' || loan.status === 'OVERDUE' || loan.status === 'APPROVED' || loan.status === 'READY_FOR_DISBURSEMENT')) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Loan is not eligible for auto-debit setup.',
        details: { status: loan.status }
      });
    }

    const idempotencyKey =
      idempotencyKeyHeader?.trim() ||
      buildIdempotencyKey({
        scope: 'mandate_setup',
        tenantId: borrower.tenantId,
        loanId: loan.id,
        borrowerId: borrower.borrowerId
      });

    const existingIntent = await this.prisma.paymentIntent.findFirst({
      where: { tenantId: borrower.tenantId, idempotencyKey },
      select: { id: true, providerReference: true, providerRawInit: true, reference: true }
    });
    if (existingIntent) {
      const authorizationUrl = this.extractAuthorizationUrl(existingIntent.providerRawInit);
      return {
        mandateId: null,
        paymentIntentId: existingIntent.id,
        reference: existingIntent.reference ?? existingIntent.providerReference,
        authorizationUrl
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const mandate = await tx.mandate.create({
        data: {
          tenantId: borrower.tenantId,
          borrowerId: borrower.borrowerId,
          loanId: loan.id,
          provider: PaymentProvider.PAYSTACK,
          status: MandateStatus.PENDING,
          maxAmount: input.maxAmount == null ? null : new Prisma.Decimal(input.maxAmount).toDecimalPlaces(2),
          frequency: input.frequency ?? 'MONTHLY'
        }
      });

      const reference = `mdt_setup_${mandate.id}_${Date.now()}`;
      const gatewayInit = await this.gateway.initializeCharge({
        amountMinor: 10_000,
        currency: loan.currency,
        email: `${borrower.phone}@borrower.loanapp.local`,
        reference,
        metadata: {
          tenantId: borrower.tenantId,
          borrowerId: borrower.borrowerId,
          loanId: loan.id,
          purpose: 'MANDATE_SETUP',
          mandateId: mandate.id
        }
      });

      const intent = await tx.paymentIntent.create({
        data: {
          tenantId: borrower.tenantId,
          reference,
          direction: PaymentDirection.INBOUND,
          provider: PaymentProvider.PAYSTACK,
          status: PaymentIntentStatus.CREATED,
          currency: loan.currency,
          amountMinor: 10_000,
          borrowerId: borrower.borrowerId,
          loanId: loan.id,
          providerReference: gatewayInit.reference,
          providerRawInit: gatewayInit.raw as Prisma.InputJsonValue,
          idempotencyKey,
          createdByBorrowerId: borrower.borrowerId,
          mandateId: mandate.id
        }
      });

      await this.auditService.log({
        tenantId: borrower.tenantId,
        actorType: 'BORROWER',
        actorId: borrower.borrowerId,
        action: 'MANDATE.SETUP_INITIATED',
        entity: 'Mandate',
        entityId: mandate.id,
        metadata: { loanId: loan.id, paymentIntentId: intent.id, providerReference: gatewayInit.reference },
        tx
      });

      return { mandate, intent, gatewayInit };
    });

    return {
      mandateId: created.mandate.id,
      paymentIntentId: created.intent.id,
      reference: created.intent.reference ?? created.intent.providerReference,
      authorizationUrl: created.gatewayInit.authorizationUrl
    };
  }

  async listBorrowerMandates(borrower: BorrowerPrincipal) {
    const rows = await this.prisma.mandate.findMany({
      where: { tenantId: borrower.tenantId, borrowerId: borrower.borrowerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { debits: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    return rows.map((row) => ({
      id: row.id,
      loanId: row.loanId,
      provider: row.provider,
      status: row.status,
      maxAmount: row.maxAmount?.toString() ?? null,
      frequency: row.frequency,
      nextDebitAt: row.nextDebitAt?.toISOString() ?? null,
      lastDebit: row.debits[0]
        ? {
            id: row.debits[0].id,
            status: row.debits[0].status,
            amount: row.debits[0].amount.toString(),
            attemptedAt: row.debits[0].attemptedAt?.toISOString() ?? null,
            succeededAt: row.debits[0].succeededAt?.toISOString() ?? null,
            failureReason: row.debits[0].failureReason ?? null
          }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async listAdminMandates(admin: TenantAdminPrincipal, query: ListMandatesQueryDto) {
    const pagination = parsePagination(query);
    const rows = await this.prisma.mandate.findMany({
      where: {
        tenantId: admin.tenantId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.borrowerId ? { borrowerId: query.borrowerId } : {}),
        ...(query.loanId ? { loanId: query.loanId } : {})
      },
      include: { debits: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
      take: pagination.take,
      skip: pagination.skip,
      cursor: pagination.cursor
    });

    return rows.map((row) => ({
      id: row.id,
      borrowerId: row.borrowerId,
      loanId: row.loanId,
      provider: row.provider,
      status: row.status,
      maxAmount: row.maxAmount?.toString() ?? null,
      nextDebitAt: row.nextDebitAt?.toISOString() ?? null,
      frequency: row.frequency,
      lastDebit: row.debits[0]
        ? {
            id: row.debits[0].id,
            status: row.debits[0].status,
            amount: row.debits[0].amount.toString(),
            scheduledAt: row.debits[0].scheduledAt.toISOString(),
            attemptedAt: row.debits[0].attemptedAt?.toISOString() ?? null,
            succeededAt: row.debits[0].succeededAt?.toISOString() ?? null,
            failureReason: row.debits[0].failureReason ?? null
          }
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }

  async getAdminMandate(admin: TenantAdminPrincipal, mandateId: string) {
    const row = await this.prisma.mandate.findFirst({
      where: { id: mandateId, tenantId: admin.tenantId },
      include: {
        debits: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    if (!row) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Mandate not found.', details: null });
    }
    return {
      id: row.id,
      borrowerId: row.borrowerId,
      loanId: row.loanId,
      provider: row.provider,
      status: row.status,
      maxAmount: row.maxAmount?.toString() ?? null,
      nextDebitAt: row.nextDebitAt?.toISOString() ?? null,
      frequency: row.frequency,
      authorizationCodePresent: Boolean(row.authorizationCode),
      customerCodePresent: Boolean(row.customerCode),
      debits: row.debits.map((debit) => ({
        id: debit.id,
        status: debit.status,
        amount: debit.amount.toString(),
        currency: debit.currency,
        scheduledAt: debit.scheduledAt.toISOString(),
        attemptedAt: debit.attemptedAt?.toISOString() ?? null,
        succeededAt: debit.succeededAt?.toISOString() ?? null,
        failureReason: debit.failureReason ?? null,
        attemptCount: debit.attemptCount,
        maxAttempts: debit.maxAttempts
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async pauseMandate(admin: TenantAdminPrincipal, mandateId: string, reason?: string) {
    this.assertAdminMutateRole(admin.role);
    return this.transitionMandateStatus(admin, mandateId, MandateStatus.PAUSED, reason ?? 'Paused by admin');
  }

  async resumeMandate(admin: TenantAdminPrincipal, mandateId: string, reason?: string) {
    this.assertAdminMutateRole(admin.role);
    const mandate = await this.prisma.mandate.findFirst({
      where: { id: mandateId, tenantId: admin.tenantId },
      select: { id: true, loanId: true, frequency: true, status: true }
    });
    if (!mandate) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Mandate not found.', details: null });
    }
    if (mandate.status === MandateStatus.CANCELLED) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Cancelled mandate cannot be resumed.', details: null });
    }
    await this.prisma.mandate.update({
      where: { id: mandate.id },
      data: {
        status: MandateStatus.ACTIVE,
        nextDebitAt: this.computeNextDebitAt(new Date(), mandate.frequency ?? 'MONTHLY')
      }
    });
    await this.auditService.log({
      tenantId: admin.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: admin.adminId,
      actorRole: admin.role,
      action: 'MANDATE.RESUMED',
      entity: 'Mandate',
      entityId: mandate.id,
      metadata: { reason: reason ?? 'Resumed by admin' }
    });
    return this.prisma.mandate.findUniqueOrThrow({ where: { id: mandate.id } });
  }

  async cancelMandate(admin: TenantAdminPrincipal, mandateId: string, reason?: string) {
    this.assertAdminMutateRole(admin.role);
    return this.transitionMandateStatus(admin, mandateId, MandateStatus.CANCELLED, reason ?? 'Cancelled by admin');
  }

  async activateMandateFromWebhook(
    tenantId: string,
    mandateId: string,
    authorizationCode: string,
    customerCode: string,
    providerMandateRef?: string | null
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const mandate = await tx.mandate.findFirst({
        where: { id: mandateId, tenantId }
      });
      if (!mandate || mandate.status === MandateStatus.ACTIVE || mandate.status === MandateStatus.CANCELLED) {
        return;
      }
      const signatureHash = createHash('sha256')
        .update(`${authorizationCode}:${customerCode}:${tenantId}`)
        .digest('hex');
      await tx.mandate.update({
        where: { id: mandate.id },
        data: {
          status: MandateStatus.ACTIVE,
          authorizationCode,
          customerCode,
          signatureHash,
          providerMandateRef: providerMandateRef ?? null,
          startAt: mandate.startAt ?? new Date(),
          nextDebitAt: mandate.nextDebitAt ?? this.computeNextDebitAt(new Date(), mandate.frequency ?? 'MONTHLY')
        }
      });
      await this.auditService.log({
        tenantId,
        actorType: 'SYSTEM',
        action: 'MANDATE.ACTIVATED',
        entity: 'Mandate',
        entityId: mandate.id,
        metadata: { provider: mandate.provider, providerMandateRef: providerMandateRef ?? null },
        tx
      });
    });
  }

  async syncDebitStatusFromPaymentIntent(intentId: string): Promise<void> {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
      select: {
        id: true,
        status: true,
        tenantId: true,
        mandateId: true,
        loanId: true,
        amountMinor: true
      }
    });
    if (!intent?.mandateId) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const debit = await tx.mandateDebit.findFirst({
        where: { paymentIntentId: intent.id }
      });
      if (!debit) {
        return;
      }
      if (intent.status === PaymentIntentStatus.SUCCEEDED) {
        await tx.mandateDebit.update({
          where: { id: debit.id },
          data: {
            status: PaymentIntentStatus.SUCCEEDED,
            attemptedAt: debit.attemptedAt ?? new Date(),
            succeededAt: debit.succeededAt ?? new Date(),
            failureReason: null
          }
        });
        const mandate = await tx.mandate.findUnique({ where: { id: intent.mandateId! } });
        if (mandate) {
          await tx.mandate.update({
            where: { id: mandate.id },
            data: {
              lastDebitAt: new Date(),
              lastDebitStatus: PaymentIntentStatus.SUCCEEDED,
              nextDebitAt: this.computeNextDebitAt(new Date(), mandate.frequency ?? 'MONTHLY')
            }
          });
        }
        this.promMetricsService.incrementMandateDebit(intent.tenantId, PaymentIntentStatus.SUCCEEDED);
      } else if (intent.status === PaymentIntentStatus.FAILED) {
        const nextAttemptCount = debit.attemptCount + 1;
        const exhausted = nextAttemptCount >= debit.maxAttempts;
        await tx.mandateDebit.update({
          where: { id: debit.id },
          data: {
            status: PaymentIntentStatus.FAILED,
            attemptCount: nextAttemptCount,
            attemptedAt: new Date(),
            failureReason: debit.failureReason ?? 'Provider charge failed',
            nextAttemptAt: exhausted ? null : new Date(Date.now() + this.computeBackoffMs(nextAttemptCount))
          }
        });

        await tx.mandate.update({
          where: { id: intent.mandateId! },
          data: {
            lastDebitAt: new Date(),
            lastDebitStatus: PaymentIntentStatus.FAILED,
            ...(exhausted ? { status: MandateStatus.FAILED } : {})
          }
        });
        this.promMetricsService.incrementMandateDebit(intent.tenantId, PaymentIntentStatus.FAILED);
      }
    });
  }

  async enqueueDueMandateDebits(): Promise<{ scanned: number; enqueued: number }> {
    const now = new Date();
    const due = await this.prisma.mandate.findMany({
      where: {
        status: MandateStatus.ACTIVE,
        nextDebitAt: { lte: now },
        authorizationCode: { not: null }
      },
      select: { id: true, tenantId: true }
    });

    for (const mandate of due) {
      await this.jobQueueService.enqueueJob({
        type: JobType.MANDATE_DEBIT,
        tenantId: mandate.tenantId,
        dedupeKey: `mandate_debit:${mandate.id}:${now.toISOString().slice(0, 16)}`,
        payload: { mandateId: mandate.id },
        runAt: now,
        maxAttempts: 5,
        backoffMs: 60_000,
        actor: { type: 'SYSTEM', id: null, role: 'SYSTEM' }
      });
    }

    return { scanned: due.length, enqueued: due.length };
  }

  async processMandateDebitJob(mandateId: string): Promise<void> {
    const mandate = await this.prisma.mandate.findUnique({
      where: { id: mandateId }
    });
    if (!mandate) {
      return;
    }
    if (mandate.status !== MandateStatus.ACTIVE || !mandate.authorizationCode) {
      return;
    }

    const loan = mandate.loanId
      ? await this.prisma.tenantLoanApplication.findFirst({
          where: { id: mandate.loanId, tenantId: mandate.tenantId },
          select: { id: true, currency: true, outstandingTotal: true, phone: true, status: true }
        })
      : null;

    if (!loan || !(loan.status === 'DISBURSED' || loan.status === 'OVERDUE')) {
      return;
    }

    const outstanding = new Prisma.Decimal(loan.outstandingTotal ?? 0);
    if (outstanding.lte(0)) {
      return;
    }
    const amount = mandate.maxAmount ? Prisma.Decimal.min(outstanding, mandate.maxAmount) : outstanding;
    const amountMinor = Math.max(1, Number(amount.mul(100).toDecimalPlaces(0)));
    const reference = `mdt_debit_${mandate.id}_${Date.now()}`;

    await this.prisma.$transaction(async (tx) => {
      const debit = await tx.mandateDebit.create({
        data: {
          tenantId: mandate.tenantId,
          mandateId: mandate.id,
          status: PaymentIntentStatus.PENDING,
          amount: amount.toDecimalPlaces(2),
          currency: loan.currency,
          scheduledAt: mandate.nextDebitAt ?? new Date(),
          attemptedAt: new Date()
        }
      });

      const intent = await tx.paymentIntent.create({
        data: {
          tenantId: mandate.tenantId,
          reference,
          direction: PaymentDirection.INBOUND,
          provider: PaymentProvider.PAYSTACK,
          status: PaymentIntentStatus.PENDING,
          currency: loan.currency,
          amountMinor,
          borrowerId: mandate.borrowerId,
          loanId: loan.id,
          idempotencyKey: buildIdempotencyKey({
            scope: 'mandate_debit',
            tenantId: mandate.tenantId,
            mandateId: mandate.id,
            debitId: debit.id
          }),
          mandateId: mandate.id
        }
      });
      await tx.mandateDebit.update({
        where: { id: debit.id },
        data: { paymentIntentId: intent.id }
      });

      const charge = await this.gateway.chargeAuthorization({
        amountMinor,
        currency: loan.currency,
        email: `${loan.phone}@borrower.loanapp.local`,
        authorizationCode: mandate.authorizationCode!,
        reference,
        metadata: { tenantId: mandate.tenantId, loanId: loan.id, mandateId: mandate.id, mandateDebitId: debit.id, purpose: 'MANDATE_DEBIT' }
      });

      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          providerReference: charge.providerReference,
          providerRawInit: charge.raw as Prisma.InputJsonValue,
          status: charge.status === 'FAILED' ? PaymentIntentStatus.FAILED : PaymentIntentStatus.PENDING
        }
      });

      if (charge.status !== 'FAILED') {
        await tx.mandate.update({
          where: { id: mandate.id },
          data: {
            lastDebitAt: new Date(),
            lastDebitStatus: PaymentIntentStatus.PENDING,
            nextDebitAt: new Date(Date.now() + 10 * 60_000)
          }
        });
        this.promMetricsService.incrementMandateDebit(mandate.tenantId, PaymentIntentStatus.PENDING);
      }

      if (charge.status === 'FAILED') {
        const failedAttempts = await tx.mandateDebit.count({
          where: { tenantId: mandate.tenantId, mandateId: mandate.id, status: PaymentIntentStatus.FAILED }
        });
        const nextFailed = failedAttempts + 1;
        const maxAttempts = debit.maxAttempts;
        await tx.mandateDebit.update({
          where: { id: debit.id },
          data: {
            status: PaymentIntentStatus.FAILED,
            attemptedAt: new Date(),
            failureReason: 'Provider charge authorization failed',
            attemptCount: { increment: 1 },
            nextAttemptAt: nextFailed >= maxAttempts ? null : new Date(Date.now() + this.computeBackoffMs(nextFailed))
          }
        });
        await tx.mandate.update({
          where: { id: mandate.id },
          data: {
            lastDebitAt: new Date(),
            lastDebitStatus: PaymentIntentStatus.FAILED,
            nextDebitAt: nextFailed >= maxAttempts ? null : new Date(Date.now() + this.computeBackoffMs(nextFailed)),
            ...(nextFailed >= maxAttempts ? { status: MandateStatus.FAILED } : {})
          }
        });
        this.promMetricsService.incrementMandateDebit(mandate.tenantId, PaymentIntentStatus.FAILED);
      }
    });
  }

  private assertAdminMutateRole(role: string): void {
    if (!ADMIN_MUTATION_ROLES.has(role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Role cannot manage mandates.',
        details: { role }
      });
    }
  }

  private async transitionMandateStatus(
    admin: TenantAdminPrincipal,
    mandateId: string,
    status: MandateStatus,
    reason: string
  ) {
    const mandate = await this.prisma.mandate.findFirst({
      where: { id: mandateId, tenantId: admin.tenantId }
    });
    if (!mandate) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Mandate not found.', details: null });
    }
    const next = await this.prisma.mandate.update({
      where: { id: mandate.id },
      data: {
        status,
        ...(status === MandateStatus.CANCELLED ? { nextDebitAt: null } : {})
      }
    });
    await this.auditService.log({
      tenantId: admin.tenantId,
      actorType: 'TENANT_ADMIN',
      actorId: admin.adminId,
      actorRole: admin.role,
      action: `MANDATE.${status}`,
      entity: 'Mandate',
      entityId: mandate.id,
      metadata: { reason }
    });
    return next;
  }

  private computeBackoffMs(attempt: number): number {
    const base = 60_000;
    const cap = 15 * 60_000;
    const val = base * 2 ** Math.max(0, attempt - 1);
    return Math.min(cap, val);
  }

  private computeNextDebitAt(from: Date, frequency: string): Date {
    const next = new Date(from);
    if (frequency === 'DAILY') {
      next.setUTCDate(next.getUTCDate() + 1);
      return next;
    }
    if (frequency === 'WEEKLY') {
      next.setUTCDate(next.getUTCDate() + 7);
      return next;
    }
    next.setUTCMonth(next.getUTCMonth() + 1);
    return next;
  }

  private extractAuthorizationUrl(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = (raw as { data?: { authorization_url?: string } }).data;
    return typeof data?.authorization_url === 'string' ? data.authorization_url : null;
  }
}
