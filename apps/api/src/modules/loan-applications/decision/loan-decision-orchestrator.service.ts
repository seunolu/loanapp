import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../common/database/prisma.service';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { assertRoleCanTransition } from '../loan-application-transition-rbac';
import { assertValidTransition } from '../loan-application-status-transition';
import { FraudEvaluatorService } from '../../fraud/fraud-evaluator.service';

type Actor = {
  type: 'ADMIN' | 'SYSTEM';
  actorId?: string | null;
  role?: string | null;
};

type DecisionOutcome = 'APPROVE' | 'MANUAL_REVIEW' | 'DECLINE';

export function computeDecisionFromInputs(input: {
  riskScore: number | null;
  manualReviewMin: number;
  approveThreshold: number;
  exposure: Prisma.Decimal;
  maxExposure: Prisma.Decimal;
  holdCodes: string[];
  hardBlockFlags: string[];
}): { decision: DecisionOutcome; reasonCodes: string[] } {
  const reasonCodes: string[] = [];
  const hardBlocks = new Set(input.hardBlockFlags ?? []);
  const hasHardBlock = input.holdCodes.some((code) => hardBlocks.has(code));
  if (hasHardBlock) reasonCodes.push('HARD_BLOCK_FLAG');

  if (input.riskScore == null) {
    reasonCodes.push('MISSING_RISK_DATA');
    return { decision: 'MANUAL_REVIEW', reasonCodes };
  }
  if (hasHardBlock) {
    reasonCodes.push('FLAGGED_BY_HARD_BLOCK_POLICY');
    return { decision: 'DECLINE', reasonCodes };
  }
  if (input.riskScore < input.manualReviewMin) {
    reasonCodes.push('RISK_SCORE_BELOW_MANUAL_REVIEW_MIN');
    return { decision: 'DECLINE', reasonCodes };
  }
  if (input.exposure.gt(input.maxExposure)) {
    reasonCodes.push('EXPOSURE_LIMIT_EXCEEDED');
    return { decision: 'DECLINE', reasonCodes };
  }
  if (input.riskScore >= input.approveThreshold) {
    reasonCodes.push('RISK_SCORE_ABOVE_APPROVE_THRESHOLD');
    return { decision: 'APPROVE', reasonCodes };
  }
  reasonCodes.push('RISK_SCORE_IN_MANUAL_REVIEW_BAND');
  return { decision: 'MANUAL_REVIEW', reasonCodes };
}

@Injectable()
export class LoanDecisionOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly fraudEvaluator: FraudEvaluatorService = {
      evaluateApplication: async () => ({ blocked: false, severity: [], signals: [] })
    } as unknown as FraudEvaluatorService
  ) {}

  private assertCanRun(actor: Actor): void {
    if (actor.type === 'SYSTEM') return;
    if (!actor.role || !['CREDIT_OFFICER', 'SUPER_ADMIN', 'RISK_MANAGER'].includes(actor.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role ${actor.role ?? 'UNKNOWN'} cannot run decision orchestrator.`,
        details: null
      });
    }
  }

  private getTransitionTarget(
    currentStatus: TenantLoanApplicationStatus,
    decision: DecisionOutcome
  ): TenantLoanApplicationStatus {
    if (currentStatus === TenantLoanApplicationStatus.SUBMITTED) {
      if (decision === 'DECLINE') {
        return TenantLoanApplicationStatus.REJECTED;
      }
      return TenantLoanApplicationStatus.UNDER_REVIEW;
    }

    if (decision === 'APPROVE') return TenantLoanApplicationStatus.APPROVED;
    if (decision === 'DECLINE') return TenantLoanApplicationStatus.REJECTED;
    return TenantLoanApplicationStatus.UNDER_REVIEW;
  }

  async decideAndTransition(params: {
    tenantId: string;
    loanApplicationId: string;
    actor: Actor;
  }): Promise<{
    decision: DecisionOutcome;
    transitionedTo: TenantLoanApplicationStatus;
    eventId: string;
    reasonCodes: string[];
  }> {
    this.assertCanRun(params.actor);

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.tenantLoanApplication.findFirst({
        where: { id: params.loanApplicationId, tenantId: params.tenantId }
      });
      if (!loan) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Loan application not found.',
          details: { loanApplicationId: params.loanApplicationId }
        });
      }

      const latestEvent = await tx.loanDecisionEvent.findFirst({
        where: { tenantId: params.tenantId, loanApplicationId: loan.id },
        orderBy: { createdAt: 'desc' }
      });

      const activePolicy =
        (await tx.loanDecisionPolicy.findFirst({
          where: { tenantId: params.tenantId, isActive: true, productId: null },
          orderBy: { updatedAt: 'desc' }
        })) ??
        (await tx.loanDecisionPolicy.create({
          data: {
            tenantId: params.tenantId,
            productId: null,
            approveThreshold: 700,
            manualReviewMin: 550,
            maxExposure: new Prisma.Decimal(1000000),
            hardBlockFlags: ['FRAUD_SUSPECTED', 'KYC_MISSING'],
            allowUnderReviewReeval: false,
            isActive: true
          }
        }));

      if (
        loan.status !== TenantLoanApplicationStatus.SUBMITTED &&
        (!activePolicy.allowUnderReviewReeval || loan.status !== TenantLoanApplicationStatus.UNDER_REVIEW)
      ) {
        if (!latestEvent) {
          throw new BadRequestException({
            code: 'BAD_REQUEST',
            message: `Decision cannot run from status ${loan.status}.`,
            details: null
          });
        }
        return {
          decision: latestEvent.decision as DecisionOutcome,
          transitionedTo: loan.status,
          eventId: latestEvent.id,
          reasonCodes: latestEvent.reasonCodes
        };
      }

      if (
        loan.status === TenantLoanApplicationStatus.UNDER_REVIEW &&
        !activePolicy.allowUnderReviewReeval &&
        latestEvent
      ) {
        return {
          decision: latestEvent.decision as DecisionOutcome,
          transitionedTo: loan.status,
          eventId: latestEvent.id,
          reasonCodes: latestEvent.reasonCodes
        };
      }

      const latestRisk = await tx.riskEvaluation.findFirst({
        where: { tenantId: params.tenantId, loanApplicationId: loan.id },
        orderBy: { createdAt: 'desc' }
      });
      const fraudResult = await this.fraudEvaluator.evaluateApplication(loan.id, {
        tenantId: params.tenantId,
        tx
      });
      const activeHolds = await tx.loanApplicationHold.findMany({
        where: { tenantId: params.tenantId, loanApplicationId: loan.id, isActive: true },
        select: { type: true }
      });

      const exposureAgg = await tx.tenantLoanApplication.aggregate({
        where: {
          tenantId: params.tenantId,
          phone: loan.phone,
          id: { not: loan.id },
          status: {
            in: [
              TenantLoanApplicationStatus.APPROVED,
              TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
              TenantLoanApplicationStatus.DISBURSED,
              TenantLoanApplicationStatus.OVERDUE,
              TenantLoanApplicationStatus.WRITTEN_OFF
            ]
          }
        },
        _sum: { outstandingPrincipal: true }
      });
      const exposure = exposureAgg._sum.outstandingPrincipal ?? new Prisma.Decimal(0);
      const riskScore = latestRisk?.score ?? null;
      const holdCodes = activeHolds.map((item) => item.type);
      let { decision, reasonCodes } = computeDecisionFromInputs({
        riskScore,
        manualReviewMin: activePolicy.manualReviewMin,
        approveThreshold: activePolicy.approveThreshold,
        exposure,
        maxExposure: activePolicy.maxExposure,
        holdCodes,
        hardBlockFlags: activePolicy.hardBlockFlags
      });
      if (fraudResult.blocked) {
        decision = 'DECLINE';
        reasonCodes = ['FRAUD_BLOCK', ...fraudResult.signals.map((signal) => signal.signalType)];
      }

      if (params.actor.type === 'SYSTEM' && decision === 'APPROVE') {
        const autoApprovalEnabled = await this.featureFlagService.isEnabled(params.tenantId, 'AUTO_APPROVAL');
        if (!autoApprovalEnabled) {
          decision = 'MANUAL_REVIEW';
          reasonCodes = [...reasonCodes, 'AUTO_APPROVAL_DISABLED'];
        }
      }

      const transitionedTo = this.getTransitionTarget(loan.status, decision);
      assertValidTransition(loan.status, transitionedTo);
      if (params.actor.type === 'ADMIN' && params.actor.role) {
        assertRoleCanTransition({
          role: params.actor.role as any,
          from: loan.status,
          to: transitionedTo
        });
      }

      const event = await tx.loanDecisionEvent.create({
        data: {
          tenantId: params.tenantId,
          loanApplicationId: loan.id,
          actorType: params.actor.type,
          actorId: params.actor.actorId ?? null,
          actorRole: params.actor.role ?? null,
          decision,
          reasonCodes,
          inputsJson: {
            risk: latestRisk
              ? {
                  score: latestRisk.score,
                  decision: latestRisk.decision,
                  trigger: latestRisk.trigger,
                  createdAt: latestRisk.createdAt.toISOString()
                }
              : null,
            policy: {
              id: activePolicy.id,
              approveThreshold: activePolicy.approveThreshold,
              manualReviewMin: activePolicy.manualReviewMin,
              maxExposure: activePolicy.maxExposure.toString(),
              hardBlockFlags: activePolicy.hardBlockFlags
            },
            fraud: {
              blocked: fraudResult.blocked,
              signals: fraudResult.signals.map((signal) => ({
                type: signal.signalType,
                severity: signal.severity,
                metadata: signal.metadata
              }))
            },
            exposure: {
              activePrincipalOutstanding: exposure.toString()
            },
            flags: holdCodes,
            appSnapshotMinimal: {
              id: loan.id,
              status: loan.status,
              amount: loan.amount,
              tenorMonths: loan.tenorMonths
            }
          } as Prisma.InputJsonValue,
          recommendedLimit:
            decision === 'APPROVE'
              ? new Prisma.Decimal(Math.min(loan.amount, Number(activePolicy.maxExposure.toString())))
              : null,
          recommendedTenorDays: Math.max(30, loan.tenorMonths * 30)
        }
      });

      await tx.tenantLoanApplication.update({
        where: { id: loan.id },
        data: { status: transitionedTo }
      });
      await tx.loanApplicationStatusHistory.create({
        data: {
          tenantId: params.tenantId,
          loanApplicationId: loan.id,
          fromStatus: loan.status,
          toStatus: transitionedTo,
          note: `Decision ${decision}: ${reasonCodes.join(', ')}`,
          changedByUserId: params.actor.actorId ?? null
        }
      });

      return { decision, transitionedTo, eventId: event.id, reasonCodes };
    });
  }
}
