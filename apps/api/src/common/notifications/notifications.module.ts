import { Global, Module } from '@nestjs/common';
import { NotificationOutboxWorker } from './notification-outbox.worker';
import { NotificationsEventPublisher } from './notifications-events.publisher';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  providers: [NotificationsService, NotificationsEventPublisher, NotificationOutboxWorker],
  exports: [NotificationsService, NotificationsEventPublisher]
})
export class NotificationsModule {}
