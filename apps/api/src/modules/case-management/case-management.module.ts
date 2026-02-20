import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { NotificationsModule } from '../../common/notifications/notifications.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { BorrowerCaseManagementController } from './borrower-case-management.controller';
import { CaseManagementController } from './case-management.controller';
import { CaseManagementScheduler } from './case-management.scheduler';
import { CaseManagementService } from './case-management.service';

@Module({
  imports: [AdminAuthModule, AuthModule, AuditModule, NotificationsModule],
  controllers: [CaseManagementController, BorrowerCaseManagementController],
  providers: [CaseManagementService, CaseManagementScheduler],
  exports: [CaseManagementService]
})
export class CaseManagementModule {}
