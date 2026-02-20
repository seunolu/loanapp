import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { getRequestIdFrom } from '../observability/request-context';
import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = getRequestIdFrom(req);
    const requestId = incoming !== 'unknown' ? incoming : randomUUID();

    req.id = requestId;
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    next();
  }
}
