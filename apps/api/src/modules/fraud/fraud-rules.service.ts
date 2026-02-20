import { BadRequestException, Injectable } from '@nestjs/common';
import { FraudLevel, HoldStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class FraudRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async applyAutoHoldRules(input: {
    tenantId: string;
    borrowerId: string;
    aggregate: {
      fraudLevel: FraudLevel;
      flags: string[];
    };
    counters?: { bankChanges7d?: number };
  }, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const flags = new Set(input.aggregate.flags);
    const bankChanges7d = input.counters?.bankChanges7d ?? 0;
    const shouldHold =
      input.aggregate.fraudLevel === FraudLevel.SEVERE ||
      (input.aggregate.fraudLevel === FraudLevel.HIGH && flags.has('PAYMENT_VELOCITY_SPIKE')) ||
      (input.aggregate.fraudLevel === FraudLevel.MEDIUM && bankChanges7d >= 2);

    if (!shouldHold) {
      return null;
    }

    return this.createHold({
      tenantId: input.tenantId,
      borrowerId: input.borrowerId,
      reason: `Auto hold triggered by fraud level ${input.aggregate.fraudLevel}`,
      createdBySystem: true
    }, db);
  }

  async createHold(
    input: {
      tenantId: string;
      borrowerId: string;
      reason: string;
      createdByAdminId?: string | null;
      createdBySystem?: boolean;
    },
    dbClient?: Prisma.TransactionClient
  ) {
    const db = dbClient ?? this.prisma;
    const active = await db.borrowerHold.findFirst({
      where: {
        tenantId: input.tenantId,
        borrowerId: input.borrowerId,
        status: HoldStatus.ACTIVE
      }
    });
    if (active) {
      return active;
    }

    return db.borrowerHold.create({
      data: {
        tenantId: input.tenantId,
        borrowerId: input.borrowerId,
        reason: input.reason.trim(),
        createdByAdminId: input.createdByAdminId ?? null,
        createdBySystem: input.createdBySystem ?? false,
        status: HoldStatus.ACTIVE
      }
    });
  }

  async releaseHold(input: {
    tenantId: string;
    borrowerId: string;
    adminId: string;
    reason: string;
  }) {
    const active = await this.prisma.borrowerHold.findFirst({
      where: {
        tenantId: input.tenantId,
        borrowerId: input.borrowerId,
        status: HoldStatus.ACTIVE
      },
      orderBy: { createdAt: 'desc' }
    });
    if (!active) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'No active hold found for borrower.',
        details: { borrowerId: input.borrowerId }
      });
    }
    return this.prisma.borrowerHold.update({
      where: { id: active.id },
      data: {
        status: HoldStatus.RELEASED,
        releasedAt: new Date(),
        releaseReason: input.reason.trim(),
        createdByAdminId: active.createdByAdminId ?? input.adminId
      }
    });
  }
}

