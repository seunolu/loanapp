import { Module } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitPolicyService } from './rate-limit.policy';

@Module({
  providers: [RateLimitPolicyService, RateLimitGuard],
  exports: [RateLimitPolicyService, RateLimitGuard]
})
export class RateLimitModule {}

