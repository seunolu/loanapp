import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationOutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationOutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Optional() @Inject(ConfigService) private readonly configService: ConfigService<Env, true> | undefined,
    private readonly notificationsService: NotificationsService
  ) {}

  onModuleInit(): void {
    const enabledRaw =
      this.configService?.get('ENABLE_OUTBOX_WORKER', { infer: true }) ?? process.env.ENABLE_OUTBOX_WORKER;
    const enabled =
      typeof enabledRaw === 'boolean'
        ? enabledRaw
        : typeof enabledRaw === 'string'
          ? enabledRaw.toLowerCase() !== 'false'
          : false;
    const nodeEnv = this.configService?.get('NODE_ENV', { infer: true }) ?? process.env.NODE_ENV;
    if (!enabled && nodeEnv !== 'development') {
      return;
    }

    const intervalMsRaw =
      this.configService?.get('OUTBOX_WORKER_INTERVAL_MS', { infer: true }) ?? process.env.OUTBOX_WORKER_INTERVAL_MS;
    const intervalMsParsed =
      typeof intervalMsRaw === 'number' ? intervalMsRaw : Number.parseInt(String(intervalMsRaw ?? ''), 10);
    const intervalMs = Number.isFinite(intervalMsParsed) && intervalMsParsed > 0 ? intervalMsParsed : 5000;
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.timer.unref();
    this.logger.log(`Notification outbox worker started intervalMs=${intervalMs}`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    try {
      const result = await this.notificationsService.processOutboxBatch(50);
      if (result.processed || result.failed) {
        this.logger.log(`Notification outbox processed=${result.processed} failed=${result.failed}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown outbox worker error';
      this.logger.error(`Notification outbox tick failed: ${message}`);
    }
  }
}
