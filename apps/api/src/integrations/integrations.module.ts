import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { JobQueueModule } from '../common/jobs/job-queue.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsNotificationsService } from './notifications/notifications.service';
import { ConsoleEmailProvider } from './notifications/providers/console-email.provider';
import { ConsoleSmsProvider } from './notifications/providers/console-sms.provider';
import { IntegrationsPaystackProvider } from './payments/paystack';
import { IntegrationsPaymentsService } from './payments.service';
import { WebhookProcessorService } from './webhook-processor.service';

@Module({
  imports: [PaymentsModule, JobQueueModule, IdempotencyModule],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsPaymentsService,
    WebhookProcessorService,
    IntegrationsPaystackProvider,
    ConsoleSmsProvider,
    ConsoleEmailProvider,
    IntegrationsNotificationsService
  ],
  exports: [WebhookProcessorService]
})
export class IntegrationsModule {}
