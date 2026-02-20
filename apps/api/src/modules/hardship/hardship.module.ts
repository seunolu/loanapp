import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { NotificationsModule } from '../../common/notifications/notifications.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { AdminHardshipController } from './admin-hardship.controller';
import { BorrowerHardshipController } from './borrower-hardship.controller';
import { HardshipService } from './hardship.service';

@Module({
  imports: [AuthModule, AdminAuthModule, AuditModule, NotificationsModule],
  controllers: [BorrowerHardshipController, AdminHardshipController],
  providers: [HardshipService],
  exports: [HardshipService]
})
export class HardshipModule {}

