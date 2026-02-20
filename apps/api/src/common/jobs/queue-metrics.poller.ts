import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobQueueService } from './job-queue.service';

@Injectable()
export class QueueMetricsPoller implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobQueueService: JobQueueService
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(this.configService.get('QUEUE_METRICS_INTERVAL_MS') ?? 10_000);
    if (!Number.isFinite(intervalMs) || intervalMs < 1_000) {
      return;
    }
    this.timer = setInterval(() => {
      void this.jobQueueService.observeQueueDepth();
    }, intervalMs);
    void this.jobQueueService.observeQueueDepth();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

