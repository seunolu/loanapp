import { Injectable, Logger } from '@nestjs/common';
import { CollectionsActionType, CollectionsCaseStatus, LoanRepaymentScheduleItemStatus, Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { FeatureFlagService } from '../../common/feature-flags/feature-flag.service';
import { assertTenantMatch } from '../../common/tenant/assert-tenant-match';
import { calculateDpd, determineCollectionsStage, sumOutstanding } from './arrears-utils';
import { DelinquencyService } from './delinquency.service';
import { PenaltyService } from './penalty.service';
import { OutboxService } from '../../common/events/outbox.service';
import { buildEvent } from '../../common/events/domain-events';

@Injectable()
export class CollectionsScanService {
  private readonly logger = new Logger(CollectionsScanService.name);
  private readonly stageOrder: Record<string, number> = { SOFT: 1, FIELD: 2, LEGAL: 3 };

  constructor(
    private readonly prisma: PrismaService,
    private readonly delinquencyService: DelinquencyService,
    private readonly penaltyService: PenaltyService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly outboxService: OutboxService
  ) {}

  async runForTenant(tenantId: string, now = new Date()): Promise<{ scanned: number; opened: number; resolved: number }> {
    const enabled = await this.featureFlagService.isEnabled(tenantId, 'COLLECTIONS_AUTOMATION');
    if (!enabled) {
      return { scanned: 0, opened: 0, resolved: 0 };
    }

    const loans = await this.prisma.tenantLoanApplication.findMany({
      where: {
        tenantId,
        status: {
          in: [
            TenantLoanApplicationStatus.DISBURSED,
            TenantLoanApplicationStatus.OVERDUE
          ]
        }
      },
      select: {
        id: true,
        tenantId: true,
        status: true,
        daysPastDue: true,
        outstandingTotal: true,
        createdAt: true
      },
      take: 1000
    });

    let opened = 0;
    let resolved = 0;
    for (const loan of loans) {
      assertTenantMatch(loan.tenantId, tenantId);
      const result = await this.prisma.$transaction(async (tx) => {
        await this.delinquencyService.updateLoanDelinquency(loan.id, tenantId, now, tx);
        await this.penaltyService.accrueDailyPenalty(loan.id, tenantId, now, tx);

        const scheduleItems = await tx.loanRepaymentScheduleItem.findMany({
          where: { tenantId, loanApplicationId: loan.id },
          orderBy: { dueDate: 'asc' },
          select: {
            dueDate: true,
            totalDue: true,
            totalPaid: true,
            status: true
          }
        });
        const earliestUnpaid = scheduleItems.find(
          (item) =>
            item.dueDate.getTime() < now.getTime() &&
            item.status !== LoanRepaymentScheduleItemStatus.PAID &&
            item.totalDue.gt(item.totalPaid)
        );
        const dpd = calculateDpd(now, earliestUnpaid?.dueDate ?? null);
        const outstanding = sumOutstanding(scheduleItems);
        const stage = determineCollectionsStage(dpd);

        const existingCase = await tx.collectionsCase.findFirst({
          where: {
            tenantId,
            loanAccountId: loan.id,
            status: {
              in: [
                CollectionsCaseStatus.OPEN,
                CollectionsCaseStatus.IN_PROGRESS,
                CollectionsCaseStatus.PROMISE_TO_PAY,
                CollectionsCaseStatus.BROKEN_PTP
              ]
            }
          }
        });

        if (dpd > 0 && outstanding.gt(0)) {
          if (!existingCase) {
            const created = await tx.collectionsCase.create({
              data: {
                tenantId,
                loanAccountId: loan.id,
                borrowerId: (await tx.tenantLoanApplication.findUniqueOrThrow({
                  where: { id: loan.id },
                  select: { phone: true }
                })).phone,
                status: CollectionsCaseStatus.OPEN,
                stage,
                dpdAtOpen: dpd,
                currentDpd: dpd,
                outstandingAtOpen: outstanding,
                currentOutstanding: outstanding,
                openedAt: now,
                nextActionAt: now
              }
            });
            await tx.collectionsAction.create({
              data: {
                tenantId,
                caseId: created.id,
                type: CollectionsActionType.NOTE,
                note: 'SYSTEM: Collections case opened by arrears scan.',
                metadata: { dpd, outstanding: outstanding.toString() }
              }
            });
            return { opened: 1, resolved: 0 };
          }

          await tx.collectionsCase.update({
            where: { id: existingCase.id },
            data: {
              currentDpd: dpd,
              currentOutstanding: outstanding,
              stage,
              status:
                existingCase.status === CollectionsCaseStatus.OPEN
                  ? CollectionsCaseStatus.IN_PROGRESS
                  : existingCase.status
            }
          });

          const previousStage = String(existingCase.stage);
          const nextStage = String(stage);
          if ((this.stageOrder[nextStage] ?? 0) > (this.stageOrder[previousStage] ?? 0)) {
            await this.outboxService.writeOutboxEvent(
              tx,
              buildEvent({
                eventType: 'collections.escalated',
                tenantId,
                aggregateType: 'CollectionCase',
                aggregateId: existingCase.id,
                payload: {
                  caseId: existingCase.id,
                  reason: `Collections stage escalated from ${previousStage} to ${nextStage}`,
                  stage: nextStage
                }
              })
            );
          }

          if (
            existingCase.promiseToPayAt &&
            existingCase.promiseToPayAt.getTime() < now.getTime() &&
            existingCase.status === CollectionsCaseStatus.PROMISE_TO_PAY
          ) {
            await tx.collectionsCase.update({
              where: { id: existingCase.id },
              data: { status: CollectionsCaseStatus.BROKEN_PTP }
            });
            await tx.collectionsAction.create({
              data: {
                tenantId,
                caseId: existingCase.id,
                type: CollectionsActionType.PTP_BROKEN,
                note: 'SYSTEM: Promise to pay date has elapsed with outstanding balance.'
              }
            });
          }

          return { opened: 0, resolved: 0 };
        }

        if (existingCase) {
          await tx.collectionsCase.update({
            where: { id: existingCase.id },
            data: {
              status: CollectionsCaseStatus.RESOLVED,
              currentDpd: 0,
              currentOutstanding: outstanding,
              resolvedAt: now,
              resolutionNote: 'SYSTEM: Auto-resolved by arrears scan (caught up).'
            }
          });
          await tx.collectionsAction.create({
            data: {
              tenantId,
              caseId: existingCase.id,
              type: CollectionsActionType.NOTE,
              note: 'SYSTEM: Case resolved automatically after arrears cleared.'
            }
          });
          return { opened: 0, resolved: 1 };
        }

        return { opened: 0, resolved: 0 };
      });

      opened += result.opened;
      resolved += result.resolved;
    }

    this.logger.log(`collections scan tenant=${tenantId} scanned=${loans.length} opened=${opened} resolved=${resolved}`);
    return { scanned: loans.length, opened, resolved };
  }

  async runAllTenants(now = new Date()): Promise<{ scanned: number; opened: number; resolved: number }> {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    let scanned = 0;
    let opened = 0;
    let resolved = 0;
    for (const tenant of tenants) {
      const result = await this.runForTenant(tenant.id, now);
      scanned += result.scanned;
      opened += result.opened;
      resolved += result.resolved;
    }
    return { scanned, opened, resolved };
  }
}
