import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { getRequestIdFrom } from '../observability/request-context';
import { RequestContextStore } from '../request-context/request-context.store';
import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class RequestLogContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContextStore: RequestContextStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    if (req) {
      const user = req.user as { tenantId?: string; adminId?: string; borrowerId?: string } | undefined;
      const actorType = user?.adminId ? 'TENANT_ADMIN' : user?.borrowerId ? 'BORROWER' : user ? 'SYSTEM' : null;
      const actorId = user?.adminId ?? user?.borrowerId ?? null;
      const actorRole = (req.user as { role?: string } | undefined)?.role ?? null;
      req.logContext = {
        requestId: getRequestIdFrom(req),
        tenantId: user?.tenantId ?? null,
        actorType,
        actorId
      };
      this.requestContextStore.enter({
        requestId: req.logContext.requestId,
        tenantId: req.logContext.tenantId,
        userId: actorId,
        actorType,
        actorRole,
        ip: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null
      });
    }
    return next.handle();
  }
}
