import { BadRequestException, Injectable } from '@nestjs/common';
import { FraudSeverity, FraudSignalType, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../common/database/prisma.service';

const riskEventSchema = z.object({
  borrowerId: z.string().trim().min(1).optional(),
  loanApplicationId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(FraudSignalType),
  severity: z.nativeEnum(FraudSeverity),
  source: z.string().trim().min(1).max(64),
  meta: z.record(z.unknown()).default({})
});

export type RiskEventInput = z.infer<typeof riskEventSchema>;

const BASE_SCORE_IMPACT: Partial<Record<FraudSignalType, number>> = {
  LOGIN_FAILED: 15,
  OTP_FAILED: 20,
  DEVICE_CHANGED: 30,
  MULTIPLE_ACCOUNTS_SUSPECTED: 80,
  BANK_ACCOUNT_CHANGED: 60,
  REPAYMENT_REVERSAL: 120,
  CARD_CHARGEBACK: 140,
  PAYMENT_VELOCITY_SPIKE: 110,
  COLLECTIONS_ESCALATION: 70,
  MANUAL_REVIEW_REQUESTED: 30,
  ADMIN_OVERRIDE: 50,
  IP_GEO_ANOMALY: 60
};

const SEVERITY_MULTIPLIER: Record<FraudSeverity, number> = {
  LOW: 1,
  MEDIUM: 1.4,
  HIGH: 1.8,
  CRITICAL: 2.4
};

@Injectable()
export class RiskEventService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(tenantId: string, payload: RiskEventInput, tx?: Prisma.TransactionClient) {
    const parsed = riskEventSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid risk event payload.',
        details: parsed.error.flatten()
      });
    }
    const db = tx ?? this.prisma;
    const scoreImpact = Math.round(
      (BASE_SCORE_IMPACT[parsed.data.type] ?? 25) * SEVERITY_MULTIPLIER[parsed.data.severity]
    );

    return db.fraudSignal.create({
      data: {
        tenantId,
        borrowerId: parsed.data.borrowerId ?? null,
        loanApplicationId: parsed.data.loanApplicationId ?? null,
        type: parsed.data.type,
        severity: parsed.data.severity,
        source: parsed.data.source,
        scoreImpact,
        metadataJson: parsed.data.meta as Prisma.InputJsonValue
      }
    });
  }
}

