import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuditLogsService } from './admin-audit-logs.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminAuditLogsController],
  providers: [AdminAuditLogsService]
})
export class AdminAuditLogsModule {}

