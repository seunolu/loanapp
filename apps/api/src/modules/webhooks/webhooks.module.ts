import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { PaymentsModule } from '../payments/payments.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [AuditModule, PaymentsModule, IntegrationsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService]
})
export class WebhooksModule {}
