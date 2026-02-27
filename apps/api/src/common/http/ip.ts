import type { Request } from 'express';

function firstForwardedFor(value: string): string | null {
  const first = value.split(',')[0]?.trim();
  if (!first) {
    return null;
  }
  return first;
}

export function extractClientIp(req: Pick<Request, 'ip' | 'socket' | 'header'>, trustProxy: boolean): string | null {
  if (trustProxy) {
    const forwarded = req.header('x-forwarded-for');
    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
      return firstForwardedFor(forwarded);
    }
  }

  const remote = req.socket?.remoteAddress;
  if (typeof remote === 'string' && remote.trim().length > 0) {
    return remote.trim();
  }

  if (typeof req.ip === 'string' && req.ip.trim().length > 0) {
    return req.ip.trim();
  }

  return null;
}

