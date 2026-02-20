import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../redis/redis.module';
import { AdminConfirmationGuard } from './admin-confirmation.guard';
import { AdminConfirmationService } from './admin-confirmation.service';

@Global()
@Module({
  imports: [RedisModule, AuditModule],
  providers: [AdminConfirmationService, AdminConfirmationGuard],
  exports: [AdminConfirmationService, AdminConfirmationGuard]
})
export class AdminConfirmationModule {}

