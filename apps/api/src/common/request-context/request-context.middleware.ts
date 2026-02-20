import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from '../types/request-with-id';
import { RequestContextStore } from './request-context.store';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly store: RequestContextStore) {}

  use(req: RequestWithId, _res: Response, next: NextFunction): void {
    this.store.run(
      {
        requestId: req.requestId ?? null,
        tenantId: null,
        userId: null,
        actorType: null,
        actorRole: null,
        ip: req.ip ?? null,
        userAgent: req.header('user-agent') ?? null
      },
      next
    );
  }
}
