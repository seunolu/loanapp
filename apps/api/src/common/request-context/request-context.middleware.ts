import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { Env } from '../config/env.schema';
import { extractClientIp } from '../http/ip';
import type { RequestWithId } from '../types/request-with-id';
import { RequestContextStore } from './request-context.store';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly store: RequestContextStore,
    private readonly configService: ConfigService<Env, true>
  ) {}

  use(req: RequestWithId, _res: Response, next: NextFunction): void {
    const trustProxy = this.configService.get('TRUST_PROXY', { infer: true });
    this.store.run(
      {
        requestId: req.requestId ?? null,
        tenantId: null,
        userId: null,
        actorType: null,
        actorRole: null,
        ip: extractClientIp(req, trustProxy),
        userAgent: req.header('user-agent') ?? null
      },
      next
    );
  }
}
