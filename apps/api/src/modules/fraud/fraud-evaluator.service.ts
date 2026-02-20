import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FraudAlertStatus,
  FraudSeverity,
  FraudSignalType,
  NotificationAudienceType,
  NotificationDeliveryChannel,
  Prisma,
  TenantAdminRole
} from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import { NotificationsService } from '../../common/notifications/notifications.service';
import { assertTenantMatch } from '../../common/tenant/assert-tenant-match';

type FraudDbClient = Prisma.TransactionClient | PrismaService;

const SEVERITY_RANK: Record<FraudSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

function highestSeverity(input: FraudSeverity[]): FraudSeverity {
  if (!input.length) {
    return 'LOW';
  }
  return input.reduce((max, current) => (SEVERITY_RANK[current] > SEVERITY_RANK[max] ? current : max), 'LOW');
}

function toBorrowerIdFromLoan(loan: { phone: string }): string {
  return loan.phone.trim();
}

@Injectable()
export class FraudEvaluatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  private db(tx?: FraudDbClient): FraudDbClient {
    return tx ?? this.prisma;
  }

  async evaluateApplication(
    applicationId: string,
    context: { tenantId: string; tx?: FraudDbClient }
  ): Promise<{
    blocked: boolean;
    severity: string[];
    signals: Array<{
      id?: string;
      type: FraudSignalType;
      signalType: string;
      severity: FraudSeverity;
      scoreImpact: number;
      metadata: Record<string, unknown>;
    }>;
  }> {
    const db = this.db(context.tx);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const loan = await db.tenantLoanApplication.findFirst({
      where: { id: applicationId, tenantId: context.tenantId }
    });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found for fraud evaluation.',
        details: { applicationId }
      });
    }
    assertTenantMatch(loan.tenantId, context.tenantId);
    const borrowerId = toBorrowerIdFromLoan(loan);

    const triggeredSignals: Array<{
      type: FraudSignalType;
      severity: FraudSeverity;
      scoreImpact: number;
      metadata: Record<string, unknown>;
    }> = [];

    const blacklistMatch = await db.borrowerBlacklist.findFirst({
      where: {
        tenantId: context.tenantId,
        OR: [
          { identifierType: 'PHONE', identifierValue: loan.phone },
          ...(loan.deviceId ? [{ identifierType: 'DEVICE_ID', identifierValue: loan.deviceId }] : [])
        ]
      }
    });
    if (blacklistMatch) {
      triggeredSignals.push({
        type: 'MANUAL_FLAG',
        severity: 'CRITICAL',
        scoreImpact: 300,
        metadata: {
          source: 'BORROWER_BLACKLIST',
          identifierType: blacklistMatch.identifierType,
          identifierValue: blacklistMatch.identifierValue,
          reason: blacklistMatch.reason
        }
      });
    }

    const submissionsLast24h = await db.tenantLoanApplication.count({
      where: {
        tenantId: context.tenantId,
        phone: loan.phone,
        createdAt: { gte: dayAgo }
      }
    });
    if (submissionsLast24h > 2) {
      triggeredSignals.push({
        type: 'MULTIPLE_APPLICATIONS_SHORT_WINDOW',
        severity: 'MEDIUM',
        scoreImpact: 40,
        metadata: { submissionsLast24h }
      });
    }

    const normalizedRiskScore =
      loan.lastRiskScore == null
        ? null
        : loan.lastRiskScore > 100
          ? Number((loan.lastRiskScore / 10).toFixed(1))
          : loan.lastRiskScore;
    if (normalizedRiskScore != null && normalizedRiskScore > 75) {
      triggeredSignals.push({
        type: 'HIGH_RISK_SCORE',
        severity: 'HIGH',
        scoreImpact: 80,
        metadata: {
          rawScore: loan.lastRiskScore,
          normalizedScore: normalizedRiskScore,
          threshold: 75
        }
      });
    }

    const snapshot = await db.borrowerBehaviorSnapshot.findUnique({
      where: {
        tenantId_borrowerId: {
          tenantId: context.tenantId,
          borrowerId
        }
      }
    });
    if ((snapshot?.defaultCount ?? 0) >= 2) {
      triggeredSignals.push({
        type: 'REPAYMENT_PATTERN_ANOMALY',
        severity: 'HIGH',
        scoreImpact: 90,
        metadata: { defaultCount: snapshot?.defaultCount ?? 0 }
      });
    }

    if (loan.deviceId) {
      const deviceReuse = await db.tenantLoanApplication.findMany({
        where: {
          tenantId: context.tenantId,
          deviceId: loan.deviceId,
          createdAt: { gte: weekAgo }
        },
        select: { phone: true }
      });
      const uniqueBorrowers = new Set(deviceReuse.map((item) => item.phone.trim()));
      if (uniqueBorrowers.size > 1) {
        triggeredSignals.push({
          type: 'DEVICE_MISMATCH',
          severity: 'MEDIUM',
          scoreImpact: 50,
          metadata: {
            deviceId: loan.deviceId,
            distinctBorrowers7d: uniqueBorrowers.size
          }
        });
      }
    }

    const activeExposure = await db.tenantLoanApplication.aggregate({
      where: {
        tenantId: context.tenantId,
        phone: loan.phone,
        id: { not: loan.id },
        status: { in: ['APPROVED', 'READY_FOR_DISBURSEMENT', 'DISBURSED', 'OVERDUE', 'WRITTEN_OFF'] }
      },
      _sum: { outstandingPrincipal: true }
    });
    const requestedPlusExposure = (activeExposure._sum.outstandingPrincipal ?? new Prisma.Decimal(0)).plus(
      loan.requestedAmount
    );
    const activePolicy = await db.loanDecisionPolicy.findFirst({
      where: { tenantId: context.tenantId, isActive: true, productId: null },
      orderBy: { updatedAt: 'desc' }
    });
    if (activePolicy && requestedPlusExposure.gt(activePolicy.maxExposure)) {
      triggeredSignals.push({
        type: 'HIGH_RISK_SCORE',
        severity: 'HIGH',
        scoreImpact: 60,
        metadata: {
          rule: 'EXPOSURE_GT_POLICY_MAX',
          maxExposure: activePolicy.maxExposure.toString(),
          requestedPlusExposure: requestedPlusExposure.toString()
        }
      });
    }

    if (!triggeredSignals.length) {
      return { blocked: false, severity: [], signals: [] };
    }

    const createdSignals = await Promise.all(
      triggeredSignals.map((signal) =>
        db.fraudSignal.create({
          data: {
            tenantId: context.tenantId,
            borrowerId,
            loanApplicationId: loan.id,
            type: signal.type,
            severity: signal.severity,
            scoreImpact: signal.scoreImpact,
            metadataJson: signal.metadata as Prisma.InputJsonValue
          }
        })
      )
    );

    const severities = createdSignals.map((item: any) => item.severity as FraudSeverity);
    const maxSeverity = highestSeverity(severities);
    const shouldAlert = SEVERITY_RANK[maxSeverity] >= SEVERITY_RANK.HIGH;
    if (shouldAlert) {
      await this.ensureAlertForSignals({
        db,
        tenantId: context.tenantId,
        loanApplicationId: loan.id,
        borrowerId,
        severity: maxSeverity,
        signalIds: createdSignals.map((item: any) => item.id as string)
      });
    }

    const blocked = severities.some((level) => level === 'CRITICAL');
    return {
      blocked,
      severity: severities,
      signals: createdSignals.map((signal: any) => ({
        id: signal.id,
        type: signal.type,
        signalType: signal.type,
        severity: signal.severity,
        scoreImpact: signal.scoreImpact,
        metadata: (signal.metadataJson as Record<string, unknown>) ?? {}
      }))
    };
  }

  private async ensureAlertForSignals(input: {
    db: FraudDbClient;
    tenantId: string;
    loanApplicationId: string;
    borrowerId: string;
    severity: FraudSeverity;
    signalIds: string[];
  }): Promise<void> {
    const existing = await input.db.fraudAlert.findFirst({
      where: {
        tenantId: input.tenantId,
        loanApplicationId: input.loanApplicationId,
        status: { in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] }
      }
    });

    const alert =
      existing ??
      (await input.db.fraudAlert.create({
        data: {
          tenantId: input.tenantId,
          borrowerId: input.borrowerId,
          loanApplicationId: input.loanApplicationId,
          severity: input.severity,
          status: 'OPEN',
          autoGenerated: true
        }
      }));

    if (existing && SEVERITY_RANK[input.severity] > SEVERITY_RANK[existing.severity]) {
      await input.db.fraudAlert.update({
        where: { id: existing.id },
        data: { severity: input.severity, status: FraudAlertStatus.OPEN }
      });
    }

    for (const signalId of input.signalIds) {
      await input.db.fraudAlertSignal.upsert({
        where: {
          fraudAlertId_fraudSignalId: {
            fraudAlertId: alert.id,
            fraudSignalId: signalId
          }
        },
        create: {
          tenantId: input.tenantId,
          fraudAlertId: alert.id,
          fraudSignalId: signalId
        },
        update: {}
      });
    }

    if (!existing) {
      const creditOfficers = await input.db.tenantAdminUser.findMany({
        where: {
          tenantId: input.tenantId,
          role: { in: [TenantAdminRole.CREDIT_OFFICER, TenantAdminRole.SUPER_ADMIN] }
        },
        select: { id: true }
      });
      for (const admin of creditOfficers) {
        await this.notificationsService.createNotification(
          {
            tenantId: input.tenantId,
            audienceType: NotificationAudienceType.ADMIN,
            audienceUserId: admin.id,
            channel: NotificationDeliveryChannel.IN_APP,
            templateKey: 'FRAUD_ALERT_CREATED',
            title: 'Fraud Alert Created',
            body: `Fraud alert opened for loan ${input.loanApplicationId}.`,
            dataJson: {
              loanApplicationId: input.loanApplicationId,
              severity: input.severity,
              alertId: alert.id
            },
            idempotencyKey: `fraud-alert:${alert.id}:admin:${admin.id}`
          },
          input.db as Prisma.TransactionClient
        );
      }
    }
  }

  async createManualFlag(input: {
    tenantId: string;
    loanApplicationId: string;
    adminId: string;
    note?: string;
    severity?: FraudSeverity;
    tx?: FraudDbClient;
  }): Promise<{ signalId: string; alertId: string | null }> {
    const db = this.db(input.tx);
    const loan = await db.tenantLoanApplication.findFirst({
      where: { id: input.loanApplicationId, tenantId: input.tenantId }
    });
    if (!loan) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Loan application not found for manual fraud flag.',
        details: { loanApplicationId: input.loanApplicationId }
      });
    }
    const severity = input.severity ?? 'HIGH';
    const signal = await db.fraudSignal.create({
      data: {
        tenantId: input.tenantId,
        borrowerId: toBorrowerIdFromLoan(loan),
        loanApplicationId: loan.id,
        type: FraudSignalType.MANUAL_FLAG,
        severity,
        scoreImpact: 100,
        metadataJson: {
          note: input.note?.trim() || null,
          flaggedByAdminId: input.adminId
        }
      }
    });

    let alertId: string | null = null;
    if (SEVERITY_RANK[severity] >= SEVERITY_RANK.HIGH) {
      await this.ensureAlertForSignals({
        db,
        tenantId: input.tenantId,
        loanApplicationId: loan.id,
        borrowerId: toBorrowerIdFromLoan(loan),
        severity,
        signalIds: [signal.id]
      });
      const alert = await db.fraudAlert.findFirst({
        where: {
          tenantId: input.tenantId,
          loanApplicationId: loan.id,
          status: { in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });
      alertId = alert?.id ?? null;
    }

    return { signalId: signal.id, alertId };
  }

  async listAlerts(input: {
    tenantId: string;
    status?: FraudAlertStatus;
    severity?: FraudSeverity;
    onlyOpen?: boolean;
  }) {
    return this.prisma.fraudAlert.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.onlyOpen ? { status: { in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] } } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.severity ? { severity: input.severity } : {})
      },
      orderBy: [{ createdAt: 'desc' }]
    });
  }

  async getAlert(tenantId: string, alertId: string) {
    const alert = await this.prisma.fraudAlert.findFirst({
      where: { id: alertId, tenantId },
      include: {
        signals: {
          include: { fraudSignal: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!alert) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Fraud alert not found.',
        details: { alertId }
      });
    }
    return alert;
  }

  async updateAlertStatus(input: {
    tenantId: string;
    alertId: string;
    status: FraudAlertStatus;
    actorAdminId: string;
    resolutionNotes?: string;
  }) {
    const alert = await this.prisma.fraudAlert.findFirst({
      where: { id: input.alertId, tenantId: input.tenantId }
    });
    if (!alert) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Fraud alert not found.',
        details: { alertId: input.alertId }
      });
    }

    const isResolutionState = input.status === 'RESOLVED' || input.status === 'FALSE_POSITIVE';
    return this.prisma.fraudAlert.update({
      where: { id: input.alertId },
      data: {
        status: input.status,
        resolvedBy: isResolutionState ? input.actorAdminId : null,
        resolvedAt: isResolutionState ? new Date() : null,
        resolutionNotes: input.resolutionNotes?.trim() || null
      }
    });
  }

  async hasOpenAlertAtOrAbove(tenantId: string, loanApplicationId: string, severity: FraudSeverity): Promise<boolean> {
    const rows = await this.prisma.fraudAlert.findMany({
      where: {
        tenantId,
        loanApplicationId,
        status: { in: ['OPEN', 'INVESTIGATING', 'ESCALATED'] }
      },
      select: { severity: true },
      take: 20
    });
    return rows.some((row: any) => SEVERITY_RANK[row.severity as FraudSeverity] >= SEVERITY_RANK[severity]);
  }

  async incrementBehaviorSnapshot(input: {
    tenantId: string;
    borrowerId: string;
    updates: {
      totalApplications?: number;
      totalApproved?: number;
      totalRejected?: number;
      totalDisbursedAmount?: Prisma.Decimal | number | string;
      totalRepaidAmount?: Prisma.Decimal | number | string;
      defaultCount?: number;
      lastApplicationAt?: Date | null;
      lastRepaymentAt?: Date | null;
    };
    tx?: FraudDbClient;
  }): Promise<void> {
    const borrowerId = input.borrowerId?.trim();
    if (!borrowerId) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'borrowerId is required for behavior snapshot update.',
        details: null
      });
    }
    const db = this.db(input.tx);
    const existing = await db.borrowerBehaviorSnapshot.findUnique({
      where: {
        tenantId_borrowerId: {
          tenantId: input.tenantId,
          borrowerId
        }
      }
    });
    if (!existing) {
      await db.borrowerBehaviorSnapshot.create({
        data: {
          tenantId: input.tenantId,
          borrowerId,
          totalApplications: Math.max(0, input.updates.totalApplications ?? 0),
          totalApproved: Math.max(0, input.updates.totalApproved ?? 0),
          totalRejected: Math.max(0, input.updates.totalRejected ?? 0),
          totalDisbursedAmount: new Prisma.Decimal(input.updates.totalDisbursedAmount ?? 0),
          totalRepaidAmount: new Prisma.Decimal(input.updates.totalRepaidAmount ?? 0),
          defaultCount: Math.max(0, input.updates.defaultCount ?? 0),
          lastApplicationAt: input.updates.lastApplicationAt ?? null,
          lastRepaymentAt: input.updates.lastRepaymentAt ?? null
        }
      });
      return;
    }
    await db.borrowerBehaviorSnapshot.update({
      where: {
        tenantId_borrowerId: {
          tenantId: input.tenantId,
          borrowerId
        }
      },
      data: {
        totalApplications: { increment: Math.max(0, input.updates.totalApplications ?? 0) },
        totalApproved: { increment: Math.max(0, input.updates.totalApproved ?? 0) },
        totalRejected: { increment: Math.max(0, input.updates.totalRejected ?? 0) },
        totalDisbursedAmount: new Prisma.Decimal(existing.totalDisbursedAmount).plus(
          new Prisma.Decimal(input.updates.totalDisbursedAmount ?? 0)
        ),
        totalRepaidAmount: new Prisma.Decimal(existing.totalRepaidAmount).plus(
          new Prisma.Decimal(input.updates.totalRepaidAmount ?? 0)
        ),
        defaultCount: { increment: Math.max(0, input.updates.defaultCount ?? 0) },
        ...(input.updates.lastApplicationAt !== undefined
          ? { lastApplicationAt: input.updates.lastApplicationAt }
          : {}),
        ...(input.updates.lastRepaymentAt !== undefined ? { lastRepaymentAt: input.updates.lastRepaymentAt } : {})
      }
    });
  }
}
