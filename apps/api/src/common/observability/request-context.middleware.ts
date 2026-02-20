import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from '../types/request-with-id';
import { RequestContextStore } from '../request-context/request-context.store';

@Injectable()
export class ObservabilityRequestContextMiddleware implements NestMiddleware {
  constructor(private readonly store: RequestContextStore) {}

  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const requestId = req.requestId?.trim() || req.header('x-request-id')?.trim() || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const user = req.user as { tenantId?: string; adminId?: string; borrowerId?: string; role?: string } | undefined;
    this.store.run(
      {
        requestId,
        tenantId: user?.tenantId ?? null,
        userId: user?.adminId ?? user?.borrowerId ?? null,
        actorType: user ? (user.adminId ? 'TENANT_ADMIN' : 'BORROWER') : null,
        actorRole: user?.role ?? null,
        ip: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null
      },
      next
    );
  }
}

