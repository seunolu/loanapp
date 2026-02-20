import { Injectable } from '@nestjs/common';
import { FraudLevel, FraudSeverity, FraudSignalType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

const TYPE_WEIGHT: Record<FraudSignalType, number> = {
  MULTIPLE_APPLICATIONS_SHORT_WINDOW: 40,
  DEVICE_MISMATCH: 60,
  HIGH_RISK_SCORE: 70,
  REPAYMENT_PATTERN_ANOMALY: 90,
  GEO_MISMATCH: 50,
  MANUAL_FLAG: 120,
  LOGIN_FAILED: 15,
  OTP_FAILED: 20,
  DEVICE_CHANGED: 35,
  MULTIPLE_ACCOUNTS_SUSPECTED: 100,
  BANK_ACCOUNT_CHANGED: 80,
  REPAYMENT_REVERSAL: 130,
  CARD_CHARGEBACK: 160,
  PAYMENT_VELOCITY_SPIKE: 120,
  COLLECTIONS_ESCALATION: 70,
  MANUAL_REVIEW_REQUESTED: 35,
  ADMIN_OVERRIDE: 55,
  IP_GEO_ANOMALY: 65
};

const SEVERITY_MULTIPLIER: Record<FraudSeverity, number> = {
  LOW: 1,
  MEDIUM: 1.4,
  HIGH: 1.8,
  CRITICAL: 2.3
};

function toFraudLevel(score: number): FraudLevel {
  if (score >= 700) return FraudLevel.SEVERE;
  if (score >= 500) return FraudLevel.HIGH;
  if (score >= 300) return FraudLevel.MEDIUM;
  if (score >= 150) return FraudLevel.LOW;
  return FraudLevel.NONE;
}

function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 1000) return 1000;
  return Math.round(score);
}

function recencyMultiplier(createdAt: Date, now: Date): number {
  const ageMs = now.getTime() - createdAt.getTime();
  if (ageMs <= 24 * 60 * 60 * 1000) return 1.5;
  if (ageMs <= 14 * 24 * 60 * 60 * 1000) return 1;
  return 0.6;
}

@Injectable()
export class FraudScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateBorrower(tenantId: string, borrowerId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const now = new Date();
    const window30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const events = await db.fraudSignal.findMany({
      where: {
        tenantId,
        borrowerId,
        createdAt: { gte: window30d }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    let score = 0;
    for (const event of events) {
      const base = TYPE_WEIGHT[event.type] ?? 20;
      score += base * SEVERITY_MULTIPLIER[event.severity] * recencyMultiplier(event.createdAt, now);
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const failedLogins1h = events.filter(
      (item) => item.type === FraudSignalType.LOGIN_FAILED && item.createdAt >= oneHourAgo
    ).length;
    const paymentAttempts24h = events.filter(
      (item) =>
        (item.type === FraudSignalType.PAYMENT_VELOCITY_SPIKE ||
          item.type === FraudSignalType.REPAYMENT_REVERSAL ||
          item.type === FraudSignalType.CARD_CHARGEBACK) &&
        item.createdAt >= oneDayAgo
    ).length;
    const bankChanges7d = events.filter(
      (item) => item.type === FraudSignalType.BANK_ACCOUNT_CHANGED && item.createdAt >= sevenDaysAgo
    ).length;
    const deviceChanges14d = events.filter(
      (item) =>
        (item.type === FraudSignalType.DEVICE_CHANGED || item.type === FraudSignalType.DEVICE_MISMATCH) &&
        item.createdAt >= fourteenDaysAgo
    ).length;

    const flags = new Set<string>();
    if (failedLogins1h >= 5) {
      score += 90;
      flags.add('FAILED_LOGIN_SPIKE');
    }
    if (paymentAttempts24h >= 4) {
      score += 130;
      flags.add('PAYMENT_VELOCITY_SPIKE');
    }
    if (bankChanges7d >= 2) {
      score += 120;
      flags.add('BANK_ACCOUNT_CHANGED_REPEAT');
    }
    if (deviceChanges14d >= 3) {
      score += 90;
      flags.add('DEVICE_CHANGE_SPIKE');
    }

    const finalScore = clampScore(score);
    const fraudLevel = toFraudLevel(finalScore);

    const aggregate = await db.fraudSignalAggregate.upsert({
      where: {
        tenantId_borrowerId: {
          tenantId,
          borrowerId
        }
      },
      create: {
        tenantId,
        borrowerId,
        riskScore: finalScore,
        fraudLevel,
        flags: [...flags],
        lastEvaluatedAt: now
      },
      update: {
        riskScore: finalScore,
        fraudLevel,
        flags: [...flags],
        lastEvaluatedAt: now
      }
    });

    return {
      aggregate,
      counters: {
        failedLogins1h,
        paymentAttempts24h,
        bankChanges7d,
        deviceChanges14d
      }
    };
  }

  static toFraudLevel(score: number): FraudLevel {
    return toFraudLevel(score);
  }
}

