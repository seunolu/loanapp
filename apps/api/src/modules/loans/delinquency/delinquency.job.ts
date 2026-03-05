import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantLoanApplicationStatus } from '@prisma/client';
import type { Env } from '../../../common/config/env.schema';
import { PrismaService } from '../../../common/database/prisma.service';
import { FeatureFlagService } from '../../../common/feature-flags/feature-flag.service';
import { DelinquencyEngineService } from './delinquency-engine.service';

@Injectable()
export class DelinquencyJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DelinquencyJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(ConfigService) private readonly configService: ConfigService<Env, true> | undefined,
    private readonly delinquencyEngine: DelinquencyEngineService,
    private readonly featureFlagService: FeatureFlagService
  ) {}

  onModuleInit(): void {
    const enabled = this.configService?.get<string>('DELINQUENCY_JOB_ENABLED') ?? 'true';
    if (enabled === 'false') {
      this.logger.log('Delinquency job disabled by DELINQUENCY_JOB_ENABLED=false');
      return;
    }

    const cron = this.configService?.get<string>('DELINQUENCY_JOB_CRON') ?? '*/5 * * * *';
    const intervalMs = this.cronToIntervalMs(cron);
    this.logger.log(`Delinquency job started with interval ${intervalMs}ms (cron=${cron})`);

    this.timer = setInterval(() => {
      void this.runOnce().catch((error) => {
        const message = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`Delinquency job run failed: ${message}`);
      });
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<void> {
    const now = new Date();
    let processed = 0;
    let errors = 0;

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true }
    });

    for (const tenant of tenants) {
      const enabled = await this.featureFlagService.isEnabled(tenant.id, 'COLLECTIONS_AUTOMATION');
      if (!enabled) {
        continue;
      }
      const candidates = await this.prisma.tenantLoanApplication.findMany({
        where: {
          tenantId: tenant.id,
          status: {
            in: [TenantLoanApplicationStatus.DISBURSED, TenantLoanApplicationStatus.OVERDUE]
          },
          OR: [
            { nextDueDate: { lt: now } },
            {
              scheduleItems: {
                some: {
                  dueDate: { lt: now },
                  OR: [
                    { isOverdue: true },
                    { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }
                  ]
                }
              }
            }
          ]
        },
        select: { id: true },
        take: 100
      });

      for (const loan of candidates) {
        try {
          await this.delinquencyEngine.recalcLoanDelinquency(loan.id, tenant.id, now, 'SYSTEM', null);
          processed += 1;
        } catch (error) {
          errors += 1;
          const message = error instanceof Error ? error.message : 'unknown';
          this.logger.error(`Delinquency recalc failed tenant=${tenant.id} loan=${loan.id}: ${message}`);
        }
      }
    }

    this.logger.log(`Delinquency job completed processed=${processed} errors=${errors}`);
  }

  private cronToIntervalMs(cron: string): number {
    const trimmed = cron.trim();
    const m = trimmed.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (!m) {
      return 5 * 60 * 1000;
    }
    const minutes = Number(m[1]);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return 5 * 60 * 1000;
    }
    return minutes * 60 * 1000;
  }
}
