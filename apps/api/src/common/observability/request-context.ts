import type { Request } from 'express';

type LoggerLike = {
  child?: (bindings: Record<string, unknown>) => LoggerLike;
};

export function getRequestIdFrom(req: Pick<Request, 'header'> & { requestId?: string }): string {
  const headerId = req.header('x-request-id');
  if (typeof headerId === 'string' && headerId.trim().length > 0) {
    return headerId.trim();
  }
  if (typeof req.requestId === 'string' && req.requestId.trim().length > 0) {
    return req.requestId.trim();
  }
  return 'unknown';
}

export function withRequestId<T extends LoggerLike>(logger: T, requestId: string): T {
  if (typeof logger.child === 'function') {
    return logger.child({ requestId }) as T;
  }
  return logger;
}

