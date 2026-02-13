import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from '../types/request-with-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incomingId = req.header('x-request-id');
    const requestId = typeof incomingId === 'string' && incomingId.trim() ? incomingId : randomUUID();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
