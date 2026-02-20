import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { FinancialInvariantsService } from '../../common/finance/financial-invariants.service';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { RedisLockService } from '../../common/locks/redis-lock.service';
import { ReconciliationService } from './reconciliation.service';

@Injectable()
export class ReconciliationJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationJobService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly reconciliationService: ReconciliationService,
    private readonly financialInvariantsService: FinancialInvariantsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly redisLockService: RedisLockService
  ) {}

  onModuleInit(): void {
    const enabled = this.configService.get<string>('RECONCILIATION_JOB_ENABLED') ?? 'true';
    if (enabled === 'false') {
      return;
    }
    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextRun(): void {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0));
    if (now >= next) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    const waitMs = Math.max(next.getTime() - now.getTime(), 1000);
    this.timer = setTimeout(() => {
      void this.runNightly().catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`Reconciliation nightly run failed: ${message}`);
      }).finally(() => {
        this.scheduleNextRun();
      });
    }, waitMs);
    this.logger.log(`Next reconciliation run scheduled at ${next.toISOString()}`);
  }

  async runNightly(now = new Date()): Promise<void> {
    const lock = await this.redisLockService.acquireLock('lock:reconciliation:nightly', 10 * 60_000);
    if (!lock) {
      this.logger.log('Skipping nightly reconciliation; lock is already held.');
      return;
    }
    try {
    const dateTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const dateFrom = new Date(dateTo.getTime() - 24 * 60 * 60 * 1000);
    const oncePerDay = await this.idempotencyService.record(
      `reconciliation_nightly:${dateTo.toISOString().slice(0, 10)}`,
      24 * 60 * 60
    );
    if (!oncePerDay) {
      this.logger.log('Skipping nightly reconciliation; already executed for this UTC day.');
      return;
    }
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      await this.reconciliationService.runJob(
        {
          adminId: 'SYSTEM',
          tenantId: tenant.id,
          email: 'system@local',
          role: 'SYSTEM'
        },
        {
          provider: 'PAYSTACK',
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString()
        }
      );
      await this.financialInvariantsService.scanSystemInvariants(tenant.id);
    }
    this.logger.log(
      `Reconciliation nightly run completed for ${tenants.length} tenant(s), window=${dateFrom.toISOString()}..${dateTo.toISOString()}`
    );
    } finally {
      await lock.release();
    }
  }
}
