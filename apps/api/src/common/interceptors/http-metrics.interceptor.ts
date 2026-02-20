import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs';
import type { Observable } from 'rxjs';
import { PromMetricsService } from '../observability/prom-metrics.service';
import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly promMetrics: PromMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<{ statusCode?: number }>();
    const method = req?.method ?? 'UNKNOWN';
    const route = req?.route?.path ? `${req.baseUrl ?? ''}${req.route.path}` : (req?.path ?? req?.url ?? 'unknown');
    const tenantId = (req?.user as { tenantId?: string } | undefined)?.tenantId ?? 'public';

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = Number(res?.statusCode ?? 200);
          this.promMetrics.observeHttpRequest(method, route, statusCode, Date.now() - start, tenantId);
        },
        error: (err: unknown) => {
          const statusCode =
            typeof (err as { status?: unknown })?.status === 'number'
              ? Number((err as { status?: number }).status)
              : Number(res?.statusCode ?? 500);
          this.promMetrics.observeHttpRequest(method, route, statusCode, Date.now() - start, tenantId);
        }
      })
    );
  }
}
