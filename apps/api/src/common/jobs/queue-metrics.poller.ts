import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { JobQueueService } from './job-queue.service';

@Injectable()
export class QueueMetricsPoller implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Optional() @Inject(ConfigService) private readonly configService: ConfigService<Env, true> | undefined,
    @Optional() @Inject(JobQueueService) private readonly jobQueueService: JobQueueService | undefined
  ) {}

  onModuleInit(): void {
    const jobQueueService = this.jobQueueService;
    if (!jobQueueService) {
      return;
    }
    const intervalMs = Number(this.configService?.get('QUEUE_METRICS_INTERVAL_MS') ?? 10_000);
    if (!Number.isFinite(intervalMs) || intervalMs < 1_000) {
      return;
    }
    this.timer = setInterval(() => {
      void jobQueueService.observeQueueDepth();
    }, intervalMs);
    void jobQueueService.observeQueueDepth();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

