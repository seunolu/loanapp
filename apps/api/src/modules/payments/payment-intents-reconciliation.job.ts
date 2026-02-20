import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentIntentsService } from './payment-intents.service';

@Injectable()
export class PaymentIntentsReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentIntentsReconciliationJob.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentIntentsService: PaymentIntentsService
  ) {}

  onModuleInit(): void {
    const enabled = this.configService.get<string>('PAYMENTS_RECONCILIATION_JOB_ENABLED') ?? 'true';
    if (enabled === 'false') {
      return;
    }

    const intervalMs = Number(
      this.configService.get<string>('PAYMENTS_RECONCILIATION_JOB_INTERVAL_MS') ?? '300000'
    );
    this.timer = setInterval(() => {
      void this.reconcile().catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown reconciliation error';
        this.logger.error(`Payments reconciliation run failed: ${message}`);
      });
    }, intervalMs);

    void this.reconcile().catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown reconciliation error';
      this.logger.error(`Payments reconciliation initial run failed: ${message}`);
    });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async reconcile(): Promise<void> {
    const staleMinutes = Number(
      this.configService.get<string>('PAYMENTS_RECONCILIATION_STALE_MINUTES') ?? '15'
    );
    const batchSize = Number(this.configService.get<string>('PAYMENTS_RECONCILIATION_BATCH_SIZE') ?? '50');
    const result = await this.paymentIntentsService.reconcileStaleIntents(staleMinutes, batchSize);
    this.logger.log(
      `Payments reconciliation checked inbound=${result.checkedInbound} payout=${result.checkedPayout} staleMinutes=${staleMinutes}`
    );
  }
}

