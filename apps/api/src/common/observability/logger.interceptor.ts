import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs';
import type { Observable } from 'rxjs';
import { StructuredLoggerService } from './logger.service';
import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const method = req.method;
    const route = req.route?.path ? `${req.baseUrl ?? ''}${req.route.path}` : req.path ?? req.url ?? 'unknown';

    this.logger.info('request_started', {
      method,
      route
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info('request_completed', {
            method,
            route,
            statusCode: http.getResponse<{ statusCode?: number }>()?.statusCode ?? 200,
            durationMs: Date.now() - startedAt
          });
        },
        error: (error: unknown) => {
          this.logger.error('request_failed', {
            method,
            route,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : 'unknown'
          });
        }
      })
    );
  }
}

