import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { FraudRulesService } from './fraud-rules.service';
import { FraudScoringService } from './fraud-scoring.service';

@Injectable()
export class FraudWorkerProcessor {
  private readonly logger = new Logger(FraudWorkerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fraudScoringService: FraudScoringService,
    private readonly fraudRulesService: FraudRulesService
  ) {}

  async runScan(): Promise<{ borrowers: number; holdsCreated: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.fraudSignal.findMany({
      where: { createdAt: { gte: since }, borrowerId: { not: null } },
      select: { tenantId: true, borrowerId: true }
    });

    const unique = new Map<string, { tenantId: string; borrowerId: string }>();
    for (const item of recent) {
      const borrowerId = item.borrowerId?.trim();
      if (!borrowerId) continue;
      unique.set(`${item.tenantId}:${borrowerId}`, { tenantId: item.tenantId, borrowerId });
    }

    let holdsCreated = 0;
    for (const target of unique.values()) {
      const { aggregate, counters } = await this.fraudScoringService.evaluateBorrower(
        target.tenantId,
        target.borrowerId
      );
      const hold = await this.fraudRulesService.applyAutoHoldRules({
        tenantId: target.tenantId,
        borrowerId: target.borrowerId,
        aggregate: { fraudLevel: aggregate.fraudLevel, flags: aggregate.flags },
        counters
      });
      if (hold) holdsCreated += 1;
    }

    this.logger.log(
      `Fraud scan evaluated borrowers=${unique.size} holdsCreated=${holdsCreated}`
    );
    return { borrowers: unique.size, holdsCreated };
  }
}

