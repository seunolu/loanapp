import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export type RequestContextSnapshot = {
  requestId: string | null;
  tenantId: string | null;
  userId: string | null;
  actorType: 'TENANT_ADMIN' | 'BORROWER' | 'SYSTEM' | null;
  actorRole: string | null;
  ip: string | null;
  userAgent: string | null;
};

@Injectable()
export class RequestContextStore {
  private readonly als = new AsyncLocalStorage<RequestContextSnapshot>();

  run<T>(context: RequestContextSnapshot, fn: () => T): T {
    return this.als.run(context, fn);
  }

  enter(context: RequestContextSnapshot): void {
    this.als.enterWith(context);
  }

  get(): RequestContextSnapshot | null {
    return this.als.getStore() ?? null;
  }

  getTenantId(): string | null {
    return this.get()?.tenantId ?? null;
  }
}
