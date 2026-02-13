import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';

export const IDEMPOTENCY_ENABLED = 'idempotency_enabled';
export const IDEMPOTENCY_SCOPE = 'idempotency_scope';

export function Idempotent(scope?: string): MethodDecorator {
  return applyDecorators(
    SetMetadata(IDEMPOTENCY_ENABLED, true),
    SetMetadata(IDEMPOTENCY_SCOPE, scope ?? null),
    UseInterceptors(IdempotencyInterceptor)
  );
}
