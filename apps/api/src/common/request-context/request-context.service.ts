import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { RequestWithId } from '../types/request-with-id';

export type RequestContext = {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
  tenantId: string | null;
  actorType: 'TENANT_ADMIN' | 'BORROWER' | 'SYSTEM' | null;
  actorId: string | null;
  actorRole: string | null;
};

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  constructor(@Inject(REQUEST) private readonly request: RequestWithId) {}

  get(): RequestContext {
    if (this.request.logContext) {
      return {
        requestId: this.request.logContext.requestId,
        ip: this.request.ip ?? null,
        userAgent: this.request.header('user-agent') ?? null,
        tenantId: this.request.logContext.tenantId,
        actorType: this.request.logContext.actorType,
        actorId: this.request.logContext.actorId,
        actorRole:
          ((this.request.user as { role?: string } | undefined)?.role ?? null)
      };
    }
    const user = this.request.user as
      | { tenantId?: string; adminId?: string; borrowerId?: string; role?: string }
      | undefined;
    const actorType = user?.adminId
      ? 'TENANT_ADMIN'
      : user?.borrowerId
        ? 'BORROWER'
        : user
          ? 'SYSTEM'
          : null;
    const actorId = user?.adminId ?? user?.borrowerId ?? null;
    return {
      requestId: this.request.requestId ?? null,
      ip: this.request.ip ?? null,
      userAgent: this.request.header('user-agent') ?? null,
      tenantId: user?.tenantId ?? null,
      actorType,
      actorId,
      actorRole: user?.role ?? null
    };
  }
}
