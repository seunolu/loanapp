import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { RequestWithId } from '../types/request-with-id';

export type RequestContext = {
  requestId: string | null;
  ip: string | null;
  userAgent: string | null;
};

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  constructor(@Inject(REQUEST) private readonly request: RequestWithId) {}

  get(): RequestContext {
    return {
      requestId: this.request.requestId ?? null,
      ip: this.request.ip ?? null,
      userAgent: this.request.header('user-agent') ?? null
    };
  }
}

