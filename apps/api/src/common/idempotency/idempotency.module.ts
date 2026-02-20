import { Module } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from './idempotency.service';
import { TenantIdempotencyService } from './tenant-idempotency.service';

@Module({
  providers: [IdempotencyService, IdempotencyInterceptor, TenantIdempotencyService],
  exports: [IdempotencyService, IdempotencyInterceptor, TenantIdempotencyService]
})
export class IdempotencyModule {}
