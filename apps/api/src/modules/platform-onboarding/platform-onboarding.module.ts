import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { PlatformOnboardingController } from './platform-onboarding.controller';
import { PlatformOnboardingService } from './platform-onboarding.service';

@Module({
  imports: [AdminAuthModule, AuditModule, IdempotencyModule],
  controllers: [PlatformOnboardingController],
  providers: [PlatformOnboardingService]
})
export class PlatformOnboardingModule {}

