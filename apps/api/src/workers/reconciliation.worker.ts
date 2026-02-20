import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { ReconciliationService } from '../modules/reconciliation/reconciliation.service';

@Injectable()
export class ReconciliationWorker {
  private readonly logger = new Logger(ReconciliationWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliationService: ReconciliationService
  ) {}

  async runAt0200Utc(now = new Date()): Promise<void> {
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0));
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      const principal = {
        adminId: 'SYSTEM',
        tenantId: tenant.id,
        email: 'system@local',
        role: 'SYSTEM'
      } as const;
      await this.reconciliationService.run(principal as any, {
        type: 'PAYMENT',
        from: from.toISOString(),
        to: to.toISOString()
      });
      await this.reconciliationService.run(principal as any, {
        type: 'DISBURSEMENT',
        from: from.toISOString(),
        to: to.toISOString()
      });
    }
    this.logger.log(`Reconciliation worker completed tenants=${tenants.length} window=${from.toISOString()}..${to.toISOString()}`);
  }
}

