import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaseManagementService } from './case-management.service';

@Injectable()
export class CaseManagementScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CaseManagementScheduler.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly caseService: CaseManagementService
  ) {}

  onModuleInit(): void {
    const enabled = this.configService.get<string>('CASE_OVERDUE_JOB_ENABLED') ?? 'true';
    if (enabled === 'false') {
      return;
    }
    this.intervalHandle = setInterval(() => {
      void this.run().catch((error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`case overdue scheduler failed: ${msg}`);
      });
    }, 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async run(now = new Date()): Promise<void> {
    const result = await this.caseService.processOverdueCases(now);
    this.logger.log(`case overdue scheduler scanned=${result.scanned} notified=${result.notified}`);
  }
}

