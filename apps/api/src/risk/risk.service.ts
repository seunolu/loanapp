import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TenantLoanApplicationStatus } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../common/database/prisma.service';
import { ensureTenantMatch, requireTenantId } from '../common/tenancy/tenant-guard';
import { withTenant } from '../common/tenancy/tenant-prisma';
import { RequestContextService } from '../common/request-context/request-context.service';
import { MetricsService } from '../common/observability/metrics.service';
import {
  defaultRiskPolicyConfig,
  type RiskPolicyConfig,
  riskPolicyConfigSchema
} from './risk-policy.schema';

const ACTIVE_LOAN_STATUSES: TenantLoanApplicationStatus[] = [
  TenantLoanApplicationStatus.APPROVED,
  TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
  TenantLoanApplicationStatus.DISBURSED,
  TenantLoanApplicationStatus.OVERDUE,
  TenantLoanApplicationStatus.WRITTEN_OFF
];

const SENSITIVE_RISK_GATES: TenantLoanApplicationStatus[] = [
  TenantLoanApplicationStatus.UNDER_REVIEW,
  TenantLoanApplicationStatus.APPROVED,
  TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
  TenantLoanApplicationStatus.DISBURSED
];

export type RiskDecision = 'APPROVE' | 'REVIEW' | 'DECLINE';
export type RiskEngineTrigger = 'AUTO_ON_SUBMISSION' | 'MANUAL_ADMIN' | 'SYSTEM_REEVAL';
export type RiskHoldType =
  | 'FRAUD_SUSPECTED'
  | 'KYC_MISSING'
  | 'DOCUMENTS_MISSING'
  | 'POLICY_VIOLATION'
  | 'MANUAL_REVIEW'
  | 'COLLECTIONS_REVIEW'
  | 'SYSTEM_VELOCITY';

export type RiskReason = {
  code: string;
  message: string;
  data?: Record<string, unknown>;
};

export type LoanRiskAssessmentResult = {
  score: number;
  decision: RiskDecision;
  reasons: RiskReason[];
};

export type EvaluationSnapshot = {
  borrower: {
    employmentStatus: string | null;
    incomeBand: string | null;
    kycLevel: string | null;
    hasActiveDefault: boolean;
  };
  application: {
    requestedAmount: number;
    tenorDays: number;
  };
  repaymentStats: {
    onTimeRate: number;
    defaultsCount: number;
  };
  derived: {
    hasActiveDefault: boolean;
  };
  deviceRisk: {
    isEmulator: boolean | null;
  };
};

type RiskDbClient = Prisma.TransactionClient | PrismaService;

function clampScore(value: number): number {
  return Math.max(0, Math.min(1000, Math.round(value)));
}

function hasOverrideReason(reasons: RiskReason[]): boolean {
  return reasons.some((reason) => reason.code === 'OVERRIDE');
}

function getPathValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function isRuleMatch(value: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return value === expected;
    case 'ne':
      return value !== expected;
    case 'in':
      return Array.isArray(expected) ? expected.includes(value) : false;
    case 'nin':
      return Array.isArray(expected) ? !expected.includes(value) : true;
    case 'gt':
      return Number(value) > Number(expected);
    case 'gte':
      return Number(value) >= Number(expected);
    case 'lt':
      return Number(value) < Number(expected);
    case 'lte':
      return Number(value) <= Number(expected);
    case 'exists':
      return expected ? value != null : value == null;
    default:
      return false;
  }
}

export function computeRiskFromInput(input: {
  snapshot: EvaluationSnapshot;
  config: RiskPolicyConfig;
  policyMeta: { name: string; version: number };
}): LoanRiskAssessmentResult {
  const { snapshot, config, policyMeta } = input;
  let score = 500;
  const contributions: Array<{ key: string; delta: number; description: string }> = [];
  const hardDeclines: Array<{ code: string; message: string }> = [];
  const softFlags: Array<{ code: string; message: string }> = [];

  const employmentFactor = snapshot.borrower.employmentStatus === 'EMPLOYED' ? 1 : 0;
  const employmentDelta = Math.round(employmentFactor * config.weights.employmentStatusWeight * 5);
  score += employmentDelta;
  contributions.push({
    key: 'employmentStatus',
    delta: employmentDelta,
    description: 'Employment status contribution'
  });

  const incomeFactor =
    snapshot.borrower.incomeBand === 'HIGH'
      ? 1
      : snapshot.borrower.incomeBand === 'MEDIUM'
        ? 0.5
        : snapshot.borrower.incomeBand === 'LOW'
          ? -0.5
          : 0;
  const incomeDelta = Math.round(incomeFactor * config.weights.incomeBandWeight * 5);
  score += incomeDelta;
  contributions.push({ key: 'incomeBand', delta: incomeDelta, description: 'Income band contribution' });

  const repaymentFactor = Math.max(0, Math.min(1, snapshot.repaymentStats.onTimeRate));
  const repaymentDelta = Math.round((repaymentFactor - 0.5) * 2 * config.weights.repaymentHistoryWeight * 5);
  score += repaymentDelta;
  contributions.push({
    key: 'repaymentHistory',
    delta: repaymentDelta,
    description: 'Historical repayment punctuality contribution'
  });

  const kycFactor =
    snapshot.borrower.kycLevel === 'FULL' ? 1 : snapshot.borrower.kycLevel === 'PARTIAL' ? 0.2 : -0.8;
  const kycDelta = Math.round(kycFactor * config.weights.kycLevelWeight * 5);
  score += kycDelta;
  contributions.push({ key: 'kycLevel', delta: kycDelta, description: 'KYC quality contribution' });

  if (snapshot.deviceRisk.isEmulator === true) {
    const deviceDelta = -Math.round((config.weights.deviceTrustWeight ?? 10) * 5);
    score += deviceDelta;
    contributions.push({ key: 'deviceTrust', delta: deviceDelta, description: 'Emulator/device risk penalty' });
    softFlags.push({ code: 'DEVICE_EMULATOR', message: 'Application appears to come from an emulator.' });
  }

  for (const rule of config.rules.hardDeclines) {
    const actual = getPathValue(snapshot, rule.field);
    if (isRuleMatch(actual, rule.operator, rule.value)) {
      hardDeclines.push({ code: rule.code, message: rule.message });
    }
  }

  for (const rule of config.rules.softFlags) {
    const actual = getPathValue(snapshot, rule.field);
    if (isRuleMatch(actual, rule.operator, rule.value)) {
      softFlags.push({ code: rule.code, message: rule.message });
      if (typeof rule.delta === 'number') {
        score += rule.delta;
        contributions.push({
          key: `soft:${rule.code}`,
          delta: rule.delta,
          description: rule.message
        });
      }
    }
  }

  const normalizedScore = clampScore(score);
  const finalDecision: RiskDecision = hardDeclines.length
    ? 'DECLINE'
    : normalizedScore >= config.thresholds.approveMinScore
      ? 'APPROVE'
      : normalizedScore >= config.thresholds.reviewMinScore
        ? 'REVIEW'
        : 'DECLINE';

  const finalScore = hardDeclines.length ? Math.min(400, normalizedScore) : normalizedScore;

  return {
    score: finalScore,
    decision: finalDecision,
    reasons: [
      {
        code: 'POLICY',
        message: `Policy ${policyMeta.name} v${policyMeta.version}`,
        data: {
          contributions,
          triggeredHardDeclines: hardDeclines,
          softFlags,
          final: { score: finalScore, decision: finalDecision }
        }
      }
    ]
  };
}

export function enforceRiskGate(input: {
  toStatus: TenantLoanApplicationStatus;
  assessment: LoanRiskAssessmentResult;
  activeHoldTypes: RiskHoldType[];
  overrideEnabled: boolean;
}): void {
  if (!SENSITIVE_RISK_GATES.includes(input.toStatus)) {
    return;
  }
  if (input.overrideEnabled) {
    return;
  }

  if (input.assessment.decision === 'DECLINE') {
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Risk blocked: ${input.assessment.reasons.map((item) => item.code).join(', ') || 'DECLINE'}.`,
      details: { reasons: input.assessment.reasons }
    });
  }

  if (input.assessment.decision === 'REVIEW' && input.toStatus !== TenantLoanApplicationStatus.UNDER_REVIEW) {
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: 'Risk decision REVIEW allows only transition to UNDER_REVIEW until override.',
      details: { toStatus: input.toStatus, reasons: input.assessment.reasons }
    });
  }

  const holdBlockedStatuses = new Set<TenantLoanApplicationStatus>([
    TenantLoanApplicationStatus.APPROVED,
    TenantLoanApplicationStatus.READY_FOR_DISBURSEMENT,
    TenantLoanApplicationStatus.DISBURSED
  ]);
  if (input.activeHoldTypes.length > 0 && holdBlockedStatuses.has(input.toStatus)) {
    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message: `Active holds block transition: ${input.activeHoldTypes.join(', ')}`,
      details: { activeHoldTypes: input.activeHoldTypes }
    });
  }
}

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly requestContextService: RequestContextService,
    private readonly metricsService: MetricsService
  ) {}

  private db(tx?: RiskDbClient) {
    return (tx ?? this.prisma) as any;
  }

  private assertCanRun(role: string): void {
    if (!['CREDIT_OFFICER', 'RISK_MANAGER', 'SUPER_ADMIN'].includes(role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role ${role} cannot run risk evaluation.`,
        details: null
      });
    }
  }

  private assertCanManagePolicies(role: string): void {
    if (!['RISK_MANAGER', 'SUPER_ADMIN'].includes(role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role ${role} cannot manage risk policies.`,
        details: null
      });
    }
  }

  private async ensureActivePolicy(tenantId: string, tx?: RiskDbClient) {
    const normalizedTenantId = requireTenantId(tenantId);
    const db = this.db(tx);
    let policy = await db.riskPolicy.findFirst({
      where: { tenantId: normalizedTenantId, isActive: true },
      orderBy: [{ createdAt: 'desc' }]
    });
    if (!policy) {
      policy = await db.riskPolicy.create({
        data: {
          tenantId: normalizedTenantId,
          name: 'default',
          version: 1,
          isActive: true,
          configJson: defaultRiskPolicyConfig
        }
      });
    }
    const parsed = riskPolicyConfigSchema.safeParse(policy.configJson);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Active risk policy config is invalid.',
        details: parsed.error.flatten()
      });
    }
    return { policy, config: parsed.data };
  }

  private async buildSnapshot(tenantId: string, loanApplicationId: string, tx?: RiskDbClient): Promise<{
    loan: any;
    snapshot: EvaluationSnapshot;
  }> {
    const normalizedTenantId = requireTenantId(tenantId);
    const db = this.db(tx);
    const tp = withTenant(db as unknown as Record<string, unknown>, normalizedTenantId);
    const loan = await tp.findUniqueTenantScoped({ model: 'TenantLoanApplication', args: { where: { id: loanApplicationId } } });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found for risk evaluation.',
        details: { loanApplicationId }
      });
    }
    ensureTenantMatch(loan.tenantId, normalizedTenantId);

    const hasActiveDefault = (await db.tenantLoanApplication.count({
      where: {
        tenantId: normalizedTenantId,
        phone: loan.phone,
        id: { not: loan.id },
        status: { in: [TenantLoanApplicationStatus.DEFAULTED, TenantLoanApplicationStatus.WRITTEN_OFF] }
      }
    })) > 0;

    const activeLoans = await db.tenantLoanApplication.count({
      where: {
        tenantId: normalizedTenantId,
        phone: loan.phone,
        id: { not: loan.id },
        status: { in: ACTIVE_LOAN_STATUSES }
      }
    });

    const scheduleRows = await db.loanRepaymentScheduleItem.findMany({
      where: { tenantId: normalizedTenantId, loanApplicationId: loan.id },
      select: { dueDate: true, paidAt: true, status: true }
    });

    const pastDue = scheduleRows.filter((row: any) => row.dueDate < new Date());
    const onTime = pastDue.filter(
      (row: any) => row.paidAt && row.paidAt <= row.dueDate && row.status === 'PAID'
    ).length;
    const onTimeRate = pastDue.length > 0 ? onTime / pastDue.length : 1;

    const defaultsCount = await db.tenantLoanApplication.count({
      where: {
        tenantId: normalizedTenantId,
        phone: loan.phone,
        status: TenantLoanApplicationStatus.DEFAULTED
      }
    });

    const snapshot: EvaluationSnapshot = {
      borrower: {
        employmentStatus: loan.employmentStatus ?? null,
        incomeBand: loan.incomeBand ?? null,
        kycLevel:
          loan.email && loan.address && loan.dob
            ? 'FULL'
            : loan.email || loan.address
              ? 'PARTIAL'
              : 'NONE',
        hasActiveDefault
      },
      application: {
        requestedAmount: Number(loan.amount ?? 0),
        tenorDays: Math.max(0, Number(loan.termInDays || loan.tenorMonths * 30 || 0))
      },
      repaymentStats: { onTimeRate, defaultsCount },
      derived: { hasActiveDefault: hasActiveDefault || activeLoans > 1 },
      deviceRisk: {
        isEmulator:
          typeof loan.deviceId === 'string'
            ? loan.deviceId.toLowerCase().includes('emulator')
            : null
      }
    };

    return { loan, snapshot };
  }

  async evaluateAndPersist(input: {
    tenantId: string;
    loanApplicationId: string;
    trigger: RiskEngineTrigger;
    createdBy?: string | null;
    tx?: RiskDbClient;
  }): Promise<{ evaluationId: string; assessment: LoanRiskAssessmentResult }> {
    const startedAt = Date.now();
    const context = this.requestContextService.get();
    const db = this.db(input.tx);
    const { policy, config } = await this.ensureActivePolicy(input.tenantId, input.tx);
    const { loan, snapshot } = await this.buildSnapshot(input.tenantId, input.loanApplicationId, input.tx);

    const assessment = computeRiskFromInput({
      snapshot,
      config,
      policyMeta: { name: policy.name, version: policy.version }
    });

    const evaluation = await db.riskEvaluation.create({
      data: {
        tenantId: input.tenantId,
        loanApplicationId: loan.id,
        borrowerId: loan.phone,
        policyId: policy.id,
        trigger: input.trigger,
        score: assessment.score,
        decision: assessment.decision,
        reasonsJson: assessment.reasons,
        inputSnapshotJson: snapshot,
        createdBy: input.createdBy ?? null
      }
    });

    await db.tenantLoanApplication.update({
      where: { id: loan.id },
      data: {
        lastRiskScore: assessment.score,
        lastRiskDecision: assessment.decision,
        lastRiskEvaluatedAt: evaluation.createdAt,
        lastRiskEvaluationId: evaluation.id
      }
    });

    await db.loanApplicationRiskAssessment.upsert({
      where: { loanApplicationId: loan.id },
      update: {
        tenantId: input.tenantId,
        score: Math.max(0, Math.min(100, Math.round(assessment.score / 10))),
        decision: assessment.decision,
        reasons: assessment.reasons as Prisma.InputJsonValue,
        createdByAdminId: input.createdBy ?? null
      },
      create: {
        tenantId: input.tenantId,
        loanApplicationId: loan.id,
        score: Math.max(0, Math.min(100, Math.round(assessment.score / 10))),
        decision: assessment.decision,
        reasons: assessment.reasons as Prisma.InputJsonValue,
        createdByAdminId: input.createdBy ?? null
      }
    });
    await db.loanApplicationRiskAssessmentHistory.create({
      data: {
        tenantId: input.tenantId,
        loanApplicationId: loan.id,
        score: Math.max(0, Math.min(100, Math.round(assessment.score / 10))),
        decision: assessment.decision,
        reasons: assessment.reasons as Prisma.InputJsonValue,
        createdByAdminId: input.createdBy ?? null
      }
    });
    this.metricsService.increment('risk_evaluation_total', input.tenantId);
    this.metricsService.observeLatency('risk_evaluation_latency_ms', input.tenantId, Date.now() - startedAt);
    this.logger.log({
      requestId: context.requestId,
      tenantId: input.tenantId,
      userId: context.actorId,
      action: 'RISK_EVALUATION_COMPLETED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: loan.id,
      metadata: {
        evaluationId: evaluation.id,
        trigger: input.trigger,
        score: assessment.score,
        decision: assessment.decision,
        durationMs: Date.now() - startedAt
      }
    });

    return { evaluationId: evaluation.id, assessment };
  }

  async listPolicies(tenantId: string) {
    const normalizedTenantId = requireTenantId(tenantId);
    await this.ensureActivePolicy(normalizedTenantId);
    return (this.prisma as any).riskPolicy.findMany({
      where: { tenantId: normalizedTenantId },
      orderBy: [{ name: 'asc' }, { version: 'desc' }]
    });
  }

  async createPolicy(input: {
    tenantId: string;
    role: string;
    name: string;
    configJson: unknown;
    createdBy?: string | null;
  }) {
    this.assertCanManagePolicies(input.role);
    const parsed = riskPolicyConfigSchema.safeParse(input.configJson);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid risk policy config.',
        details: parsed.error.flatten()
      });
    }
    const latest = await (this.prisma as any).riskPolicy.findFirst({
      where: { tenantId: input.tenantId, name: input.name },
      orderBy: { version: 'desc' },
      select: { version: true }
    });
    return (this.prisma as any).riskPolicy.create({
      data: {
        tenantId: input.tenantId,
        name: input.name,
        version: (latest?.version ?? 0) + 1,
        isActive: false,
        createdBy: input.createdBy ?? null,
        configJson: parsed.data
      }
    });
  }

  async activatePolicy(input: { tenantId: string; role: string; policyId: string; activatedBy?: string | null }) {
    this.assertCanManagePolicies(input.role);
    const policy = await (this.prisma as any).riskPolicy.findFirst({
      where: { id: input.policyId, tenantId: input.tenantId }
    });
    if (!policy) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Risk policy not found.',
        details: { policyId: input.policyId }
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await (tx as any).riskPolicy.updateMany({
        where: { tenantId: input.tenantId, name: policy.name, isActive: true },
        data: { isActive: false }
      });
      await (tx as any).riskPolicy.update({
        where: { id: policy.id },
        data: { isActive: true }
      });
    });
    return { ok: true };
  }

  async runManualEvaluation(input: {
    tenantId: string;
    role: string;
    loanApplicationId: string;
    adminId?: string | null;
  }) {
    this.assertCanRun(input.role);
    return this.prisma.$transaction((tx) =>
      this.evaluateAndPersist({
        tenantId: input.tenantId,
        loanApplicationId: input.loanApplicationId,
        trigger: 'MANUAL_ADMIN',
        createdBy: input.adminId ?? null,
        tx
      })
    );
  }

  async listEvaluations(tenantId: string, loanApplicationId: string) {
    return (this.prisma as any).riskEvaluation.findMany({
      where: { tenantId, loanApplicationId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async assessLoanApplication(
    tenantId: string,
    loanApplicationId: string,
    context: { tx?: RiskDbClient } = {}
  ): Promise<LoanRiskAssessmentResult> {
    const { policy, config } = await this.ensureActivePolicy(tenantId, context.tx);
    const { snapshot } = await this.buildSnapshot(tenantId, loanApplicationId, context.tx);
    return computeRiskFromInput({
      snapshot,
      config,
      policyMeta: { name: policy.name, version: policy.version }
    });
  }

  async persistAssessment(
    tenantId: string,
    loanApplicationId: string,
    assessment: LoanRiskAssessmentResult,
    createdByAdminId?: string | null,
    txInput?: RiskDbClient
  ): Promise<void> {
    const tx = txInput ?? this.prisma;
    const db = this.db(tx);
    const payload = {
      tenantId,
      loanApplicationId,
      score: Math.max(0, Math.min(100, Math.round(assessment.score / 10))),
      decision: assessment.decision,
      reasons: assessment.reasons as Prisma.InputJsonValue,
      createdByAdminId: createdByAdminId ?? null
    };

    await db.loanApplicationRiskAssessment.upsert({
      where: { loanApplicationId },
      update: payload,
      create: payload
    });
    await db.loanApplicationRiskAssessmentHistory.create({ data: payload });
  }

  async getRiskSnapshot(
    tenantId: string,
    loanApplicationId: string,
    txInput?: RiskDbClient
  ): Promise<{
    assessment: LoanRiskAssessmentResult;
    createdByAdminId: string | null;
    createdAt: Date | null;
    overrideEnabled: boolean;
  }> {
    const db = this.db(txInput);
    const latestEval = await db.riskEvaluation.findFirst({
      where: { tenantId, loanApplicationId },
      orderBy: { createdAt: 'desc' }
    });
    if (latestEval) {
      const reasons = Array.isArray(latestEval.reasonsJson)
        ? (latestEval.reasonsJson as RiskReason[])
        : [];
      return {
        assessment: {
          score: latestEval.score,
          decision: latestEval.decision as RiskDecision,
          reasons
        },
        createdByAdminId: latestEval.createdBy ?? null,
        createdAt: latestEval.createdAt ?? null,
        overrideEnabled: Boolean(
          latestEval.createdBy && latestEval.decision === 'APPROVE' && hasOverrideReason(reasons)
        )
      };
    }

    return {
      assessment: { score: 500, decision: 'REVIEW', reasons: [{ code: 'BASELINE', message: 'No evaluation found.' }] },
      createdByAdminId: null,
      createdAt: null,
      overrideEnabled: false
    };
  }

  async listActiveHolds(tenantId: string, loanApplicationId: string, txInput?: RiskDbClient) {
    const db = this.db(txInput);
    return db.loanApplicationHold.findMany({
      where: {
        tenantId,
        loanApplicationId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async listRiskHistory(tenantId: string, loanApplicationId: string, limit = 20) {
    const evals = await (this.prisma as any).riskEvaluation.findMany({
      where: { tenantId, loanApplicationId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return evals.map((item: any) => ({
      id: item.id,
      score: item.score,
      decision: item.decision,
      reasons: Array.isArray(item.reasonsJson) ? item.reasonsJson : [],
      createdAt: item.createdAt,
      createdByAdminId: item.createdBy ?? null
    }));
  }

  async addHold(
    tenantId: string,
    loanApplicationId: string,
    type: RiskHoldType,
    note: string | undefined,
    adminId: string,
    txInput?: RiskDbClient
  ) {
    const db = this.db(txInput);
    const loan = await db.tenantLoanApplication.findFirst({
      where: { id: loanApplicationId, tenantId },
      select: { id: true }
    });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found for hold.',
        details: { loanApplicationId }
      });
    }
    const hold = await db.loanApplicationHold.create({
      data: {
        tenantId,
        loanApplicationId,
        type,
        note: note?.trim() || null,
        createdByAdminId: adminId,
        isActive: true
      }
    });
    void this.auditService.log({
      tenantId,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'RISK_HOLD_ADDED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: loanApplicationId,
      metadata: { holdId: hold.id, type, note: note?.trim() || null }
    });
    return hold;
  }

  async resolveHold(
    tenantId: string,
    holdId: string,
    resolutionNote: string | undefined,
    adminId: string,
    txInput?: RiskDbClient
  ) {
    const db = this.db(txInput);
    const hold = await db.loanApplicationHold.findFirst({
      where: { id: holdId, tenantId }
    });
    if (!hold) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Risk hold not found.',
        details: { holdId }
      });
    }
    if (!hold.isActive) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Risk hold is already resolved.',
        details: { holdId }
      });
    }
    const resolved = await db.loanApplicationHold.update({
      where: { id: hold.id },
      data: {
        isActive: false,
        resolvedAt: new Date(),
        resolvedByAdminId: adminId,
        resolutionNote: resolutionNote?.trim() || null
      }
    });
    void this.auditService.log({
      tenantId,
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'RISK_HOLD_RESOLVED',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: hold.loanApplicationId,
      metadata: { holdId, resolutionNote: resolutionNote?.trim() || null }
    });
    return resolved;
  }

  async overrideToPass(
    tenantId: string,
    loanApplicationId: string,
    note: string,
    admin: { adminId: string; role: string }
  ) {
    if (!(admin.role === 'SUPER_ADMIN' || admin.role === 'RISK_MANAGER')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role ${admin.role} cannot override risk decision.`,
        details: null
      });
    }
    const { policy } = await this.ensureActivePolicy(tenantId);
    const { loan, snapshot } = await this.buildSnapshot(tenantId, loanApplicationId);
    const reasons: RiskReason[] = [{ code: 'OVERRIDE', message: note.trim() || 'Manual override to APPROVE.' }];
    const evaluation = await (this.prisma as any).riskEvaluation.create({
      data: {
        tenantId,
        loanApplicationId: loan.id,
        borrowerId: loan.phone,
        policyId: policy.id,
        trigger: 'MANUAL_ADMIN',
        score: 1000,
        decision: 'APPROVE',
        reasonsJson: reasons,
        inputSnapshotJson: snapshot,
        createdBy: admin.adminId
      }
    });
    await (this.prisma as any).tenantLoanApplication.update({
      where: { id: loan.id },
      data: {
        lastRiskScore: 1000,
        lastRiskDecision: 'APPROVE',
        lastRiskEvaluatedAt: evaluation.createdAt,
        lastRiskEvaluationId: evaluation.id
      }
    });

    void this.auditService.log({
      tenantId,
      actorType: 'ADMIN',
      actorId: admin.adminId,
      action: 'RISK_OVERRIDE',
      entity: 'TENANT_LOAN_APPLICATION',
      entityId: loanApplicationId,
      metadata: { note: note.trim() || null }
    });
    await this.auditService.recordEvent({
      requestId: this.requestContextService.get().requestId,
      actorType: 'ADMIN',
      actorId: admin.adminId,
      actorRole: admin.role,
      tenantId,
      action: 'ADMIN_OVERRIDE',
      entityType: 'LoanApplication',
      entityId: loanApplicationId,
      metadata: { reason: note.trim() || null, overrideType: 'RISK_DECISION' }
    });
  }
}
