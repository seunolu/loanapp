import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LoanRepaymentChannel,
  LoanRepaymentScheduleItemStatus,
  Prisma,
  TenantAdminRole,
  TenantLedgerAccountCode,
  TenantLedgerDirection,
  TenantLedgerEntryType,
  TenantLoanApplicationStatus
} from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { assertLoanCanClose, assertLoanNonNegative } from '../../common/finance/invariants';
import { FinancialInvariantsService } from '../../common/finance/financial-invariants.service';
import { AuditService } from '../../common/audit/audit.service';
import { TenantIdempotencyService } from '../../common/idempotency/tenant-idempotency.service';
import { LedgerLockService } from '../../common/ledger/ledger-lock.service';
import { TenantLedgerService } from '../../common/ledger/tenant-ledger.service';
import { MetricsService } from '../../common/observability/metrics.service';
import { NotificationsEventPublisher } from '../../common/notifications/notifications-events.publisher';
import { FraudEvaluatorService } from '../../modules/fraud/fraud-evaluator.service';
import { assertRoleCanTransition } from '../../modules/loan-applications/loan-application-transition-rbac';
import { assertValidTransition } from '../../modules/loan-applications/loan-application-status-transition';
import { ensureTenantMatch, requireTenantId } from '../../common/tenancy/tenant-guard';
import { withTenant } from '../../common/tenancy/tenant-prisma';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { buildIdempotencyKey } from '../../common/idempotency/idempotency';
import { TreasuryService } from '../../treasury/treasury.service';
import { OutboxService } from '../../common/events/outbox.service';
import { buildEvent } from '../../common/events/domain-events';

type RepaymentActor = {
  adminId?: string;
  role: TenantAdminRole;
};

export type PostRepaymentInput = {
  tenantId: string;
  loanApplicationId: string;
  amount: Prisma.Decimal | number | string;
  postedAt?: Date;
  channel?: LoanRepaymentChannel;
  reference?: string;
  idempotencyKey?: string;
  actor: RepaymentActor;
};

type AllocationItem = {
  itemId: string;
  installmentNumber: number;
  principalPaid: Prisma.Decimal;
  interestPaid: Prisma.Decimal;
  feesPaid: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
};

export type AllocationScheduleItem = {
  id: string;
  installmentNumber: number;
  dueDate: Date;
  principalDue: Prisma.Decimal;
  interestDue: Prisma.Decimal;
  feesDue: Prisma.Decimal;
  principalPaid: Prisma.Decimal;
  interestPaid: Prisma.Decimal;
  feesPaid: Prisma.Decimal;
  totalDue: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
};

export type AllocationScheduleItemUpdate = {
  id: string;
  principalPaid: Prisma.Decimal;
  interestPaid: Prisma.Decimal;
  feesPaid: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
  status: LoanRepaymentScheduleItemStatus;
  paidAt: Date | null;
};

type RepaymentResult = {
  repaymentId: string;
  outstandingPrincipal: string;
  outstandingInterest: string;
  outstandingFees: string;
  outstandingTotal: string;
  nextDueDate: string | null;
  status: TenantLoanApplicationStatus;
};

const EPSILON = new Prisma.Decimal('0.01');

function dec(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function money(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function isPaid(totalPaid: Prisma.Decimal, totalDue: Prisma.Decimal): boolean {
  return totalPaid.gte(totalDue.minus(EPSILON));
}

function normalizeStatus(dueDate: Date, totalPaid: Prisma.Decimal, totalDue: Prisma.Decimal, today: Date) {
  if (isPaid(totalPaid, totalDue)) {
    return LoanRepaymentScheduleItemStatus.PAID;
  }
  if (dueDate < today) {
    return LoanRepaymentScheduleItemStatus.OVERDUE;
  }
  return totalPaid.gt(0) ? LoanRepaymentScheduleItemStatus.PARTIAL : LoanRepaymentScheduleItemStatus.PENDING;
}

export function allocateRepaymentToSchedule(
  amount: Prisma.Decimal,
  items: AllocationScheduleItem[],
  paidAt: Date,
  today: Date
): {
  allocations: AllocationItem[];
  updates: AllocationScheduleItemUpdate[];
  amountLeft: Prisma.Decimal;
  totalPrincipalPaid: Prisma.Decimal;
  totalInterestPaid: Prisma.Decimal;
  totalFeesPaid: Prisma.Decimal;
} {
  const overdueItems = items.filter((item) => item.dueDate < today && !isPaid(item.totalPaid, item.totalDue));
  const regularItems = items.filter((item) => !(item.dueDate < today && !isPaid(item.totalPaid, item.totalDue)));
  const orderedItems = [...overdueItems, ...regularItems];

  let amountLeft = amount;
  const allocations: AllocationItem[] = [];
  const updates: AllocationScheduleItemUpdate[] = [];
  let totalPrincipalPaid = new Prisma.Decimal(0);
  let totalInterestPaid = new Prisma.Decimal(0);
  let totalFeesPaid = new Prisma.Decimal(0);

  for (const item of orderedItems) {
    if (amountLeft.lte(0)) {
      break;
    }
    const remainingFees = money(Prisma.Decimal.max(new Prisma.Decimal(0), item.feesDue.minus(item.feesPaid)));
    const remainingInterest = money(Prisma.Decimal.max(new Prisma.Decimal(0), item.interestDue.minus(item.interestPaid)));
    const remainingPrincipal = money(
      Prisma.Decimal.max(new Prisma.Decimal(0), item.principalDue.minus(item.principalPaid))
    );

    const feesPaid = money(Prisma.Decimal.min(remainingFees, amountLeft));
    amountLeft = money(amountLeft.minus(feesPaid));
    const interestPaid = money(Prisma.Decimal.min(remainingInterest, amountLeft));
    amountLeft = money(amountLeft.minus(interestPaid));
    const principalPaid = money(Prisma.Decimal.min(remainingPrincipal, amountLeft));
    amountLeft = money(amountLeft.minus(principalPaid));

    const itemPaid = money(feesPaid.plus(interestPaid).plus(principalPaid));
    if (itemPaid.lte(0)) {
      continue;
    }

    totalFeesPaid = money(totalFeesPaid.plus(feesPaid));
    totalInterestPaid = money(totalInterestPaid.plus(interestPaid));
    totalPrincipalPaid = money(totalPrincipalPaid.plus(principalPaid));

    const nextFeesPaid = money(item.feesPaid.plus(feesPaid));
    const nextInterestPaid = money(item.interestPaid.plus(interestPaid));
    const nextPrincipalPaid = money(item.principalPaid.plus(principalPaid));
    const nextTotalPaid = money(item.totalPaid.plus(itemPaid));
    const status = normalizeStatus(item.dueDate, nextTotalPaid, item.totalDue, today);

    updates.push({
      id: item.id,
      principalPaid: nextPrincipalPaid,
      interestPaid: nextInterestPaid,
      feesPaid: nextFeesPaid,
      totalPaid: nextTotalPaid,
      status,
      paidAt: status === LoanRepaymentScheduleItemStatus.PAID ? paidAt : null
    });

    allocations.push({
      itemId: item.id,
      installmentNumber: item.installmentNumber,
      principalPaid,
      interestPaid,
      feesPaid,
      totalPaid: itemPaid
    });
  }

  return {
    allocations,
    updates,
    amountLeft,
    totalPrincipalPaid,
    totalInterestPaid,
    totalFeesPaid
  };
}

@Injectable()
export class RepaymentService {
  private readonly logger = new Logger(RepaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: TenantLedgerService,
    private readonly auditService: AuditService,
    private readonly tenantIdempotencyService: TenantIdempotencyService,
    private readonly ledgerLockService: LedgerLockService,
    private readonly metricsService: MetricsService,
    private readonly notificationsPublisher: NotificationsEventPublisher,
    private readonly fraudEvaluator: FraudEvaluatorService,
    private readonly requestContextService: RequestContextService,
    private readonly financialInvariantsService: FinancialInvariantsService,
    private readonly treasuryService: TreasuryService,
    private readonly outboxService: OutboxService = {
      writeOutboxEvent: async () => undefined
    } as unknown as OutboxService
  ) {}

  async postRepayment(input: PostRepaymentInput): Promise<RepaymentResult> {
    const startedAt = Date.now();
    const tenantId = requireTenantId(input.tenantId);
    const context = this.requestContextService.get();
    this.logger.log({
      requestId: context.requestId,
      tenantId,
      userId: input.actor.adminId ?? context.actorId,
      action: 'REPAYMENT_PROCESSING_STARTED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: input.loanApplicationId,
      metadata: { amount: String(input.amount), channel: input.channel ?? 'MANUAL' }
    });
    const amount = money(dec(input.amount));
    if (amount.lte(0)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'amount must be greater than zero.',
        details: null
      });
    }

    const postedAt = input.postedAt ?? new Date();
    const channel = input.channel ?? LoanRepaymentChannel.MANUAL;
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      `repayment:auto:${input.loanApplicationId}:${postedAt.toISOString()}:${amount.toString()}:${channel}`;

    const result = await this.tenantIdempotencyService.withIdempotency<RepaymentResult>({
      tenantId,
      scope: 'REPAYMENT',
      key: idempotencyKey,
      requestHash: `${input.loanApplicationId}:${amount.toString()}:${postedAt.toISOString()}:${channel}:${input.reference ?? ''}`,
      fn: async (tx) => {
      await this.ledgerLockService.lockLoanApplication(tenantId, input.loanApplicationId, tx);
      const tp = withTenant(tx as unknown as Record<string, unknown>, tenantId);
      const loan = await tp.findUniqueTenantScoped({
        model: 'TenantLoanApplication',
        args: { where: { id: input.loanApplicationId } }
      });
      if (!loan) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Loan application not found.',
          details: { id: input.loanApplicationId }
        });
      }
      ensureTenantMatch(loan.tenantId, tenantId);
      if (
        loan.status !== TenantLoanApplicationStatus.DISBURSED &&
        loan.status !== TenantLoanApplicationStatus.OVERDUE
      ) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Repayments are only allowed for DISBURSED/OVERDUE loans.',
          details: { status: loan.status }
        });
      }

      const today = new Date();
      await tx.loanRepaymentScheduleItem.updateMany({
        where: {
          tenantId,
          loanApplicationId: loan.id,
          status: { not: LoanRepaymentScheduleItemStatus.PAID },
          dueDate: { lt: today }
        },
        data: { status: LoanRepaymentScheduleItemStatus.OVERDUE }
      });

      const pendingItems = await tx.loanRepaymentScheduleItem.findMany({
        where: {
          tenantId,
          loanApplicationId: loan.id,
          status: { not: LoanRepaymentScheduleItemStatus.PAID }
        },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }]
      });
      if (!pendingItems.length) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'No schedule items available for repayment.',
          details: null
        });
      }

      const allocationResult = allocateRepaymentToSchedule(amount, pendingItems, postedAt, today);
      const { allocations, updates, amountLeft, totalFeesPaid, totalInterestPaid, totalPrincipalPaid } = allocationResult;

      for (const update of updates) {
        await tx.loanRepaymentScheduleItem.update({
          where: { id: update.id },
          data: {
            feesPaid: update.feesPaid,
            interestPaid: update.interestPaid,
            principalPaid: update.principalPaid,
            totalPaid: update.totalPaid,
            status: update.status,
            paidAt: update.paidAt
          }
        });
      }

      const actualPosted = money(amount.minus(amountLeft));
      if (actualPosted.lte(0)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Repayment amount could not be allocated to any installment.',
          details: null
        });
      }

      const existingRepayment = await tx.loanRepayment.findUnique({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey
          }
        }
      });
      if (existingRepayment) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'Repayment with this idempotencyKey already processed.',
          details: { repaymentId: existingRepayment.id }
        });
      }

      const repayment = await tx.loanRepayment.create({
        data: {
          tenantId,
          loanApplicationId: loan.id,
          idempotencyKey,
          amount: actualPosted,
          currency: loan.currency,
          postedAt,
          reference: input.reference?.trim() || null,
          channel,
          createdByAdminId: input.actor.adminId?.trim() || null,
          allocationJson: {
            allocations: allocations.map((item) => ({
              itemId: item.itemId,
              installmentNumber: item.installmentNumber,
              principalPaid: item.principalPaid.toString(),
              interestPaid: item.interestPaid.toString(),
              feesPaid: item.feesPaid.toString(),
              totalPaid: item.totalPaid.toString()
            }))
          }
        }
      });

      const ledgerLines: Array<{
        accountCode: TenantLedgerAccountCode;
        direction: TenantLedgerDirection;
        amount: Prisma.Decimal;
      }> = [
        {
          accountCode:
            channel === LoanRepaymentChannel.CASH
              ? TenantLedgerAccountCode.CASH_ON_HAND
              : TenantLedgerAccountCode.BANK_CLEARING,
          direction: TenantLedgerDirection.DEBIT,
          amount: actualPosted
        }
      ];
      if (totalFeesPaid.gt(0)) {
        ledgerLines.push({
          accountCode: TenantLedgerAccountCode.FEES_RECEIVABLE,
          direction: TenantLedgerDirection.CREDIT,
          amount: totalFeesPaid
        });
      }
      if (totalInterestPaid.gt(0)) {
        ledgerLines.push({
          accountCode: TenantLedgerAccountCode.INTEREST_RECEIVABLE,
          direction: TenantLedgerDirection.CREDIT,
          amount: totalInterestPaid
        });
      }
      if (totalPrincipalPaid.gt(0)) {
        ledgerLines.push({
          accountCode: TenantLedgerAccountCode.LOAN_PRINCIPAL_RECEIVABLE,
          direction: TenantLedgerDirection.CREDIT,
          amount: totalPrincipalPaid
        });
      }
      if (amountLeft.gt(0)) {
        ledgerLines.push({
          accountCode: TenantLedgerAccountCode.SUSPENSE,
          direction: TenantLedgerDirection.CREDIT,
          amount: amountLeft
        });
      }

      await this.ledgerService.postEntry(
        {
          tenantId,
          occurredAt: postedAt,
          type: TenantLedgerEntryType.REPAYMENT,
          idempotencyKey: `repayment:${repayment.id}`,
          referenceType: 'LoanApplication',
          referenceId: loan.id,
          currency: loan.currency,
          createdBy: input.actor.adminId,
          actorRole: input.actor.role,
          memo: `Repayment posted ${repayment.id}`,
          lines: ledgerLines
        },
        tx
      );

      await this.treasuryService.applyPrincipalRepayment({
        tenantId,
        loanApplicationId: loan.id,
        principalAmount: totalPrincipalPaid,
        currency: loan.currency,
        idempotencyKey: repayment.id,
        actor: {
          actorId: input.actor.adminId ?? null,
          actorRole: input.actor.role
        },
        tx
      });

      const allItems = await tx.loanRepaymentScheduleItem.findMany({
        where: { tenantId, loanApplicationId: loan.id },
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }]
      });
      const outstandingPrincipal = money(
        allItems.reduce(
          (sum, item) => sum.plus(Prisma.Decimal.max(new Prisma.Decimal(0), item.principalDue.minus(item.principalPaid))),
          new Prisma.Decimal(0)
        )
      );
      const outstandingInterest = money(
        allItems.reduce(
          (sum, item) => sum.plus(Prisma.Decimal.max(new Prisma.Decimal(0), item.interestDue.minus(item.interestPaid))),
          new Prisma.Decimal(0)
        )
      );
      const outstandingFees = money(
        allItems.reduce(
          (sum, item) => sum.plus(Prisma.Decimal.max(new Prisma.Decimal(0), item.feesDue.minus(item.feesPaid))),
          new Prisma.Decimal(0)
        )
      );
      const outstandingTotal = money(outstandingPrincipal.plus(outstandingInterest).plus(outstandingFees));
      const nextDue = allItems.find((item) => item.status !== LoanRepaymentScheduleItemStatus.PAID)?.dueDate ?? null;

      const hasOverdue = allItems.some((item) => item.status === LoanRepaymentScheduleItemStatus.OVERDUE);
      if (hasOverdue) {
        const overdueHistoryExists = await tx.loanApplicationStatusHistory.findFirst({
          where: {
            tenantId,
            loanApplicationId: loan.id,
            fromStatus: TenantLoanApplicationStatus.DISBURSED,
            toStatus: TenantLoanApplicationStatus.DISBURSED,
            note: { startsWith: 'Loan has overdue installments' }
          }
        });
        if (!overdueHistoryExists) {
          await tx.loanApplicationStatusHistory.create({
            data: {
              tenantId,
              loanApplicationId: loan.id,
              fromStatus: TenantLoanApplicationStatus.DISBURSED,
              toStatus: TenantLoanApplicationStatus.DISBURSED,
              note: 'Loan has overdue installments.',
              changedByUserId: input.actor.adminId?.trim() || null
            }
          });
        }
      }

      const nextStatus = outstandingTotal.lte(EPSILON)
        ? TenantLoanApplicationStatus.REPAID
        : loan.status === TenantLoanApplicationStatus.OVERDUE
          ? TenantLoanApplicationStatus.OVERDUE
          : TenantLoanApplicationStatus.DISBURSED;
      const nextData: Prisma.TenantLoanApplicationUpdateInput = {
        outstandingPrincipal,
        outstandingInterest,
        outstandingFees,
        outstandingTotal,
        nextDueDate: nextDue,
        fullyRepaidAt: nextStatus === TenantLoanApplicationStatus.REPAID ? postedAt : null
      };

      if (nextStatus === TenantLoanApplicationStatus.REPAID) {
        assertValidTransition(loan.status, TenantLoanApplicationStatus.REPAID);
        assertRoleCanTransition({
          role: input.actor.role,
          from: loan.status,
          to: TenantLoanApplicationStatus.REPAID
        });
        nextData.status = TenantLoanApplicationStatus.REPAID;
      }

      assertLoanNonNegative({
        outstandingPrincipal,
        outstandingInterest,
        outstandingFees,
        outstandingTotal
      });
      assertLoanCanClose({
        status: nextStatus,
        outstandingTotal
      });

      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: nextData
      });

      if (nextStatus === TenantLoanApplicationStatus.REPAID) {
        await tx.loanApplicationStatusHistory.create({
          data: {
            tenantId,
            loanApplicationId: loan.id,
            fromStatus: loan.status,
            toStatus: TenantLoanApplicationStatus.REPAID,
            note: 'Loan fully repaid by repayment posting.',
            changedByUserId: input.actor.adminId?.trim() || null
          }
        });
      }

      await this.auditService.log({
        tx,
        tenantId,
        actorType: 'TENANT_ADMIN',
        actorId: input.actor.adminId?.trim() || null,
        actorRole: input.actor.role,
        action: 'REPAYMENT_APPLIED',
        entity: 'TENANT_LOAN_APPLICATION',
        entityId: loan.id,
        metadata: {
          repaymentId: repayment.id,
          postedAmount: actualPosted.toString(),
          principalPaid: totalPrincipalPaid.toString(),
          interestPaid: totalInterestPaid.toString(),
          feesPaid: totalFeesPaid.toString(),
          nextStatus
        }
      });

      const adminAudience = await tx.tenantAdminUser.findMany({
        where: {
          tenantId,
          role: { in: [TenantAdminRole.OPS, TenantAdminRole.COLLECTIONS, TenantAdminRole.SUPER_ADMIN] }
        },
        select: { id: true }
      });
      await this.notificationsPublisher.publishRepaymentPosted({
        tenantId,
        repaymentId: repayment.id,
        loanApplicationId: loan.id,
        borrowerAudienceUserId: loan.phone || null,
        adminAudienceUserIds: adminAudience.map((item) => item.id),
        amount: actualPosted.toString(),
        currency: loan.currency,
        tx
      });
      await this.fraudEvaluator.incrementBehaviorSnapshot({
        tenantId,
        borrowerId: loan.phone,
        updates: {
          totalRepaidAmount: actualPosted,
          lastRepaymentAt: postedAt
        },
        tx
      });

      await this.outboxService.writeOutboxEvent(
        tx,
        buildEvent({
          eventType: 'repayment.posted',
          tenantId,
          aggregateType: 'LoanApplication',
          aggregateId: loan.id,
          payload: {
            repaymentId: repayment.id,
            amount: actualPosted.toString(),
            method: channel
          },
          traceId: context.requestId ?? undefined,
          correlationId: context.requestId ?? undefined
        })
      );

      return {
        repaymentId: repayment.id,
        outstandingPrincipal: outstandingPrincipal.toString(),
        outstandingInterest: outstandingInterest.toString(),
        outstandingFees: outstandingFees.toString(),
        outstandingTotal: outstandingTotal.toString(),
        nextDueDate: nextDue ? nextDue.toISOString() : null,
        status: nextStatus
      };
    }});
    this.metricsService.increment('repayment_applied_total', tenantId);
    this.metricsService.observeLatency('repayment_application_latency_ms', tenantId, Date.now() - startedAt);
    this.logger.log({
      requestId: context.requestId,
      tenantId,
      userId: input.actor.adminId ?? context.actorId,
      action: 'REPAYMENT_PROCESSING_COMPLETED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: input.loanApplicationId,
      metadata: { durationMs: Date.now() - startedAt, repaymentId: result.repaymentId, status: result.status }
    });
    await this.auditService.recordEvent({
      requestId: context.requestId,
      actorType: 'TENANT_ADMIN',
      actorId: input.actor.adminId ?? context.actorId,
      actorRole: input.actor.role,
      tenantId,
      action: 'REPAYMENT.POST',
      entityType: 'Repayment',
      entityId: result.repaymentId,
      metadata: {
        channel: channel,
        amount: String(input.amount),
        loanApplicationId: input.loanApplicationId,
        outstandingTotal: result.outstandingTotal
      },
      idempotencyKey: buildIdempotencyKey({
        scope: 'repayment_post',
        tenantId,
        repaymentProvider: channel,
        providerRef: input.reference ?? result.repaymentId
      })
    });
    await this.financialInvariantsService.assertLoanInvariants(input.loanApplicationId);
    return result;
  }
}
