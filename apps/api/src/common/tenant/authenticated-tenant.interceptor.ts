import { CallHandler, ExecutionContext, Injectable, NestInterceptor, UnauthorizedException } from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { RequestWithId } from '../types/request-with-id';

type AuthUser = {
  tenantId?: string | null;
  lenderId?: string | null;
  borrowerId?: string;
  sessionId?: string;
};

@Injectable()
export class AuthenticatedTenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    const user = req.user as AuthUser | undefined;
    if (!user) {
      return next.handle();
    }

    const carriesTenantScopedIdentity = Boolean(
      user.borrowerId ||
        user.sessionId ||
        (typeof user.lenderId === 'string' && user.lenderId.trim().length > 0) ||
        (typeof user.tenantId === 'string' && user.tenantId.trim().length > 0)
    );

    if (!carriesTenantScopedIdentity) {
      return next.handle();
    }

    const tenantId = (user.tenantId ?? user.lenderId ?? '').trim();
    if (!tenantId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authenticated tenant context is required.',
        details: null
      });
    }
    return next.handle();
  }
}

