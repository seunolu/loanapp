import { Module } from '@nestjs/common';
import { NotificationsModule as CommonNotificationsModule } from '../../common/notifications/notifications.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { AdminNotificationsController } from './admin-notifications.controller';
import { BorrowerNotificationsController } from './borrower-notifications.controller';

@Module({
  imports: [CommonNotificationsModule, AdminAuthModule, AuthModule],
  controllers: [AdminNotificationsController, BorrowerNotificationsController]
})
export class NotificationsApiModule {}

