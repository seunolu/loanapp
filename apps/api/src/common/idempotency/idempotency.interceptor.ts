import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { catchError, from, map, mergeMap, of, throwError, type Observable } from 'rxjs';
import type { RequestWithId } from '../types/request-with-id';
import { IDEMPOTENCY_SCOPE } from './idempotency.decorator';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<RequestWithId>();
    const res = httpContext.getResponse<Response>();

    const keyHeader = req.header('idempotency-key');
    if (!keyHeader || !keyHeader.trim()) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required for this endpoint.',
        details: null
      });
    }

    const key = keyHeader.trim();
    const scope = this.reflector.get<string | null>(IDEMPOTENCY_SCOPE, context.getHandler()) ?? null;
    if (scope && !key.startsWith(`${scope}:`)) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_INVALID_SCOPE',
        message: `Idempotency-Key must start with "${scope}:" for this endpoint.`,
        details: {
          requiredPrefix: `${scope}:`
        }
      });
    }

    const method = req.method;
    const path = scope ? `${scope}:${req.path}` : req.path;
    const body = req.body;

    return from(this.idempotencyService.evaluateRequest({ key, method, path, body })).pipe(
      mergeMap((decision) => {
        if (decision.kind === 'replay') {
          res.status(decision.statusCode);
          res.setHeader('X-Idempotency-Replayed', 'true');
          return of(decision.responseBody);
        }

        const recordId = decision.recordId;
        return next.handle().pipe(
          mergeMap((data) =>
            from(this.idempotencyService.markCompleted(recordId, res.statusCode, data)).pipe(map(() => data))
          ),
          catchError((error) =>
            from(this.idempotencyService.clearPending(recordId)).pipe(
              mergeMap(() => throwError(() => error))
            )
          )
        );
      })
    );
  }
}
