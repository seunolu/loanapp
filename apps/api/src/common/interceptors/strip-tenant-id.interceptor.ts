import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';

const STRIP_KEYS = new Set([
  'tenantId',
  'riskScoreRaw',
  'internalDecisionReason',
  'rawDecisionRules',
  'lenderInternalConfig'
]);

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => scrub(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (STRIP_KEYS.has(key)) {
        continue;
      }
      out[key] = scrub(item);
    }
    return out;
  }
  return value;
}

@Injectable()
export class StripTenantIdInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => scrub(data)));
  }
}

export const __test__ = {
  scrub
};

