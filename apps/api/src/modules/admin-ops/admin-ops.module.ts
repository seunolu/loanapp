import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { RequestContextModule } from '../../common/request-context/request-context.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminOpsController } from './admin-ops.controller';
import { AdminOpsService } from './admin-ops.service';

@Module({
  imports: [AdminAuthModule, AuditModule, RequestContextModule],
  controllers: [AdminOpsController],
  providers: [AdminOpsService]
})
export class AdminOpsModule {}

