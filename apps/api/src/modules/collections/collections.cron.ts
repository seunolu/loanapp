import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectionsScanService } from './collections-scan.service';

@Injectable()
export class CollectionsCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollectionsCronService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly collectionsScanService: CollectionsScanService
  ) {}

  onModuleInit(): void {
    const enabled = this.configService.get<string>('DELINQUENCY_JOB_ENABLED') ?? 'true';
    if (enabled === 'false') {
      return;
    }
    this.intervalHandle = setInterval(() => {
      void this.runHourly().catch((error) => {
        const msg = error instanceof Error ? error.message : 'unknown';
        this.logger.error(`Collections hourly job failed: ${msg}`);
      });
    }, 60 * 60 * 1000);
    void this.runHourly().catch((error) => {
      const msg = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`Collections initial hourly job failed: ${msg}`);
    });
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async runHourly(now = new Date()): Promise<void> {
    const result = await this.collectionsScanService.runAllTenants(now);
    this.logger.log(
      `Collections hourly run scanned=${result.scanned} opened=${result.opened} resolved=${result.resolved}`
    );
  }
}
