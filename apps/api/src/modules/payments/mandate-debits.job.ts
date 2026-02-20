import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MandatesService } from './mandates.service';

@Injectable()
export class MandateDebitsJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MandateDebitsJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly mandatesService: MandatesService
  ) {}

  onModuleInit(): void {
    const enabled = this.configService.get<string>('MANDATE_DEBIT_JOB_ENABLED') ?? 'true';
    if (enabled === 'false') {
      return;
    }

    const intervalMs = Number(this.configService.get<string>('MANDATE_DEBIT_JOB_INTERVAL_MS') ?? '300000');
    this.timer = setInterval(() => {
      void this.run().catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown mandate debit scheduling error';
        this.logger.error(`Mandate debit scheduler failed: ${message}`);
      });
    }, intervalMs);

    void this.run().catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown mandate debit scheduling error';
      this.logger.error(`Mandate debit scheduler initial run failed: ${message}`);
    });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async run(): Promise<void> {
    const result = await this.mandatesService.enqueueDueMandateDebits();
    this.logger.log(`Mandate debit scheduler scanned=${result.scanned} enqueued=${result.enqueued}`);
  }
}
