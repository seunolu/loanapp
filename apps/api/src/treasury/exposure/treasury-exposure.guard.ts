import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';

type ExposureRuleConfig = {
  initialCapital?: number;
  maxDeployedAmount?: number;
  maxUtilizationPct?: number;
  maxRiskBandPct?: Record<string, number>;
};

@Injectable()
export class TreasuryExposureGuard {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanDeploy(input: {
    tenantId: string;
    poolId: string;
    amount: Prisma.Decimal;
    riskBand?: string | null;
    rulesJson?: unknown;
    tx?: Prisma.TransactionClient;
  }): Promise<void> {
    const db = input.tx ?? this.prisma;
    const aggregates = await db.capitalAllocation.aggregate({
      where: { tenantId: input.tenantId, poolId: input.poolId },
      _sum: {
        deployedAmount: true,
        releasedAmount: true,
        writtenOffAmount: true
      }
    });

    const deployed = aggregates._sum.deployedAmount ?? new Prisma.Decimal(0);
    const released = aggregates._sum.releasedAmount ?? new Prisma.Decimal(0);
    const writtenOff = aggregates._sum.writtenOffAmount ?? new Prisma.Decimal(0);
    const deployedOutstanding = Prisma.Decimal.max(new Prisma.Decimal(0), deployed.minus(released).minus(writtenOff));

    const rules = this.parseRules(input.rulesJson);
    const available = this.resolveAvailable(rules, deployedOutstanding, writtenOff);
    if (available.lt(input.amount)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Capital pool has insufficient available balance for deployment.',
        details: {
          poolId: input.poolId,
          requestedAmount: input.amount.toString(),
          available: available.toString()
        }
      });
    }

    if (rules.maxDeployedAmount != null) {
      const max = new Prisma.Decimal(rules.maxDeployedAmount);
      if (deployedOutstanding.plus(input.amount).gt(max)) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Capital pool max deployed amount would be exceeded.',
          details: {
            poolId: input.poolId,
            maxDeployedAmount: max.toString()
          }
        });
      }
    }

    if (rules.maxUtilizationPct != null && rules.initialCapital != null && rules.initialCapital > 0) {
      const base = new Prisma.Decimal(rules.initialCapital);
      const utilization = deployedOutstanding.plus(input.amount).div(base).toNumber();
      if (utilization > rules.maxUtilizationPct) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Capital pool utilization cap would be exceeded.',
          details: {
            poolId: input.poolId,
            maxUtilizationPct: rules.maxUtilizationPct
          }
        });
      }
    }

    if (input.riskBand && rules.maxRiskBandPct?.[input.riskBand] != null && rules.initialCapital != null) {
      // Risk-band concentration enforcement is only active when caller provides a supported borrower risk-band signal.
      const allowed = rules.maxRiskBandPct[input.riskBand];
      if (allowed < 0 || allowed > 1) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Invalid risk-band concentration cap configuration.',
          details: { poolId: input.poolId, riskBand: input.riskBand }
        });
      }
    }
  }

  private parseRules(input: unknown): ExposureRuleConfig {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }
    return input as ExposureRuleConfig;
  }

  private resolveAvailable(
    rules: ExposureRuleConfig,
    deployedOutstanding: Prisma.Decimal,
    writtenOff: Prisma.Decimal
  ): Prisma.Decimal {
    if (rules.initialCapital != null) {
      const initial = new Prisma.Decimal(rules.initialCapital);
      return Prisma.Decimal.max(new Prisma.Decimal(0), initial.minus(deployedOutstanding).minus(writtenOff));
    }
    if (rules.maxDeployedAmount != null) {
      return Prisma.Decimal.max(new Prisma.Decimal(0), new Prisma.Decimal(rules.maxDeployedAmount).minus(deployedOutstanding));
    }
    return new Prisma.Decimal('999999999999');
  }
}
